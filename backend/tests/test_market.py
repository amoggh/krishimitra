from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_market_prices_default():
    response = client.get("/api/v1/market/prices?district=Mandya")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0
    # Every item should have required keys
    for item in data:
        assert "crop" in item
        assert "mandi" in item
        assert "price_inr" in item
        assert "change_pct" in item
        assert "trend_7d" in item


def test_market_prices_with_crop_filter():
    response = client.get("/api/v1/market/prices?district=Mysuru&crop=Ragi,Maize")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    crops = [d["crop"].lower() for d in data]
    assert any("ragi" in c or "finger millet" in c for c in crops)


def test_market_prices_search():
    response = client.get("/api/v1/market/prices?district=Hassan&search=Onion")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    for item in data:
        assert "onion" in item["crop"].lower() or "onion" in item["mandi"].lower()

