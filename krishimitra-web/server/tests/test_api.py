"""API and model tests. Run from server/:  python -m pytest -q"""
from __future__ import annotations

import io

import numpy as np
import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app.main import app
from app.services import llm, mandi, planner, yield_model

client = TestClient(app)

BASE = dict(district="Mysuru", acres=3, budget=120000, source="borewell", hp=3, hours=6, depthFt=280, irrigation="drip", experience="none", season="rabi")
CASES = [
    BASE,
    dict(BASE, district="Mandya", acres=5, budget=250000, source="canal", experience="some", season="kharif"),
    dict(BASE, district="Koppal", acres=8, budget=90000, source="rainfed", season="kharif"),
    dict(BASE, district="Udupi", acres=2, budget=80000, source="canal", season="kharif"),
    dict(BASE, district="Belagavi", acres=1, budget=30000, hp=2, hours=4, irrigation="flood", experience="pro", season="summer"),
]


@pytest.fixture(autouse=True)
def offline_mandi(monkeypatch):
    """Tests never depend on the network: the live feed falls back to the bundled snapshot."""
    def boom(*a, **k):
        raise ConnectionError("offline in tests")
    monkeypatch.setattr(mandi, "_fetch_all", boom)
    mandi._cache.clear()


def test_health():
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json()["models"]["disease"]["classes"] == 38


@pytest.mark.parametrize("inp", CASES)
def test_plan_respects_every_rule(inp):
    r = client.post("/api/plan", json=inp)
    assert r.status_code == 200
    res = r.json()
    if res.get("empty"):
        assert res["rejected"], "an empty plan must explain every rejection"
        return
    ex = planner.EXPERIENCE[inp["experience"]]
    for o in res["options"]:
        used = sum(c["acres"] for c in o["crops"])
        assert abs(used + o["fallow"] - inp["acres"]) < 1e-6
        assert o["invest"] <= inp["budget"] + 1
        assert all(round(c["acres"] / 0.25, 6).is_integer() for c in o["crops"])
        assert len(o["crops"]) <= ex["maxCrops"]
        if inp["acres"] >= 2:
            assert all(c["share"] <= 0.6 + 1e-9 for c in o["crops"])
        assert o["p10"] <= o["p50"] <= o["p90"]
        for c in o["crops"]:
            assert inp["season"] in c["crop"]["seasons"]
            assert c["crop"]["difficulty"] <= ex["maxDiff"]
            assert c["price"]["expected"] > 0 and c["yieldQtl"] > 0
    cv = [o["cvar"] for o in res["options"]]
    assert cv == sorted(cv, reverse=True), "options go from safest to most ambitious"


def test_plan_is_deterministic():
    a = client.post("/api/plan", json=BASE).json()
    b = client.post("/api/plan", json=BASE).json()
    assert a["options"][0]["mean"] == b["options"][0]["mean"]


def test_plan_rejects_bad_input():
    assert client.post("/api/plan", json=dict(BASE, acres=-1)).status_code == 422
    assert client.post("/api/plan", json=dict(BASE, district="Atlantis")).status_code == 400


def test_never_recommends_a_losing_crop():
    res = client.post("/api/plan", json=dict(BASE, district="Koppal", acres=8, budget=90000, source="rainfed", season="rabi")).json()
    for o in res.get("options", []):
        for c in o["crops"]:
            per_acre = next(p for p in res["perAcre"] if p["id"] == c["crop"]["id"])
            assert per_acre["mean"] > 0


def test_yield_model_predicts_sensible_values():
    p = yield_model.predict("Mysuru", ["ragi", "maize", "paddy"], "kharif")
    assert set(p) == {"ragi", "maize", "paddy"}
    assert 2 < p["ragi"]["qtl_per_acre"] < 20 and 5 < p["maize"]["qtl_per_acre"] < 45 and 8 < p["paddy"]["qtl_per_acre"] < 40


def test_disease_rejects_non_leaf_image():
    buf = io.BytesIO(); Image.new("RGB", (300, 300), (40, 40, 200)).save(buf, "PNG")
    r = client.post("/api/disease", files={"image": ("blue.png", buf.getvalue(), "image/png")}, data={"crop": "tomato"})
    assert r.status_code == 200
    assert r.json()["status"] == "not_leaf"


def test_disease_runs_the_cnn_on_a_leafy_image():
    rng = np.random.default_rng(0)
    arr = np.clip(rng.normal([60, 140, 50], 25, (224, 224, 3)), 0, 255).astype("uint8")
    buf = io.BytesIO(); Image.fromarray(arr).save(buf, "PNG")
    j = client.post("/api/disease", files={"image": ("leaf.png", buf.getvalue(), "image/png")}).json()
    assert j["status"] in ("ok", "uncertain") and len(j["top"]) == 3
    assert abs(sum(t["rawProbability"] for t in j["top"])) <= 1.0001


def test_disease_bad_file():
    assert client.post("/api/disease", files={"image": ("x.png", b"not an image", "image/png")}).status_code == 422


def test_mandi_falls_back_to_snapshot():
    j = client.get("/api/mandi/live").json()
    assert j["source"] == "snapshot" and j["rows"] and "error" in j


def test_chat_needs_configuration(monkeypatch):
    monkeypatch.setattr(llm.settings, "llm_base_url", "")
    assert client.post("/api/chat", json={"messages": [{"role": "user", "content": "hi"}]}).status_code == 503


def test_chat_streams_from_openai_compatible_endpoint(monkeypatch):
    class FakeResp:
        status_code = 200
        def __enter__(self): return self
        def __exit__(self, *a): return False
        def iter_lines(self, decode_unicode=True):
            yield 'data: {"choices":[{"delta":{"content":"Sow "}}]}'
            yield ''
            yield 'data: {"choices":[{"delta":{"content":"ragi in June."}}]}'
            yield 'data: [DONE]'
    seen = {}
    def fake_post(url, json, headers, stream, timeout):
        seen.update(url=url, body=json)
        return FakeResp()
    monkeypatch.setattr(llm.settings, "llm_base_url", "http://fake/v1")
    monkeypatch.setattr(llm.settings, "llm_model", "test-model")
    monkeypatch.setattr(llm.requests, "post", fake_post)
    r = client.post("/api/chat", json={"messages": [{"role": "user", "content": "When do I sow ragi?"}], "context": {"crops": ["ragi"]}})
    assert r.status_code == 200 and r.text == "Sow ragi in June."
    assert seen["url"] == "http://fake/v1/chat/completions"
    assert "Ragi" in seen["body"]["messages"][0]["content"], "crop facts are injected into the system prompt"


def test_price_forecast_is_well_formed():
    from app.services import forecast
    if not forecast.status()["trained"]:
        pytest.skip("price model not trained (run ml/fetch_price_history.py and ml/train_price.py)")
    r = client.get("/api/forecast/tomato")
    assert r.status_code == 200
    f = r.json()
    assert len(f["forecast"]) == 9 and len(f["history"]) == 36
    for x in f["forecast"]:
        assert 0 < x["lo"] <= x["mid"] <= x["hi"]
        assert 0.2 * f["lastPrice"] < x["mid"] < 5 * f["lastPrice"]   # no runaway forecasts
    m = client.get("/api/forecast").json()["metrics"]
    assert set(m["backtest_overall"]) >= {"model", "no_change", "seasonal_naive"}
    assert 0 < m["band_coverage_10_90"] <= 100


def test_plan_uses_forecast_prices_when_trained():
    from app.services import forecast
    if not forecast.status()["trained"]:
        pytest.skip("price model not trained")
    p = client.post("/api/plan", json={"district": "Mandya", "acres": 3, "budget": 150000, "source": "borewell",
                                        "hp": 5, "experience": "some", "season": "rabi"}).json()
    sources = set()

    def walk(o):
        if isinstance(o, dict):
            if "expected" in o and "source" in o:
                sources.add(o["source"])
            for v in o.values():
                walk(v)
        elif isinstance(o, list):
            for v in o:
                walk(v)
    walk(p)
    assert "forecast" in sources
