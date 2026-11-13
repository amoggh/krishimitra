"""Request-time pesticide references from crop-specific extension sources."""

from __future__ import annotations

import logging
import re
from html.parser import HTMLParser
from typing import Any

import httpx


logger = logging.getLogger(__name__)

REQUEST_TIMEOUT_SECONDS = 8.0

# These entries route a crop/disease to an authoritative source page; pesticide
# ingredients and formulations are extracted from that page at request time.
_SOURCE_PAGES: dict[tuple[str, str], dict[str, str]] = {
    ("strawberry", "leaf scorch"): {
        "source": "UC Statewide Integrated Pest Management Program (UC IPM)",
        "url": (
            "https://ipm.ucanr.edu/home-and-landscape/"
            "leaf-scorch-of-strawberries/"
        ),
        "parser": "uc_ipm",
    },
    ("tomato", "early blight"): {
        "source": "Kerala Agricultural University (KAU), Centre for Plant Protection Studies",
        "url": "https://www.celkau.in/Crops/Vegetables/tomato/earlyblight.php",
        "parser": "kau",
    },
    ("tomato", "late blight"): {
        "source": "Kerala Agricultural University (KAU), Centre for Plant Protection Studies",
        "url": "https://www.celkau.in/Crops/Vegetables/tomato/lateblight.php",
        "parser": "kau",
    },
}

_FORMULATION_PATTERN = re.compile(
    r"^(?P<ingredient>.+?)\s+"
    r"(?P<formulation>\d+(?:\s*%\s*)?"
    r"(?:\s*\+\s*\d+(?:\s*%\s*)?)*\s*"
    r"(?:WP|SC|WG|WDG|EC|SL|DF|GR|SP|CS))\b",
    re.IGNORECASE,
)


class _AgriculturalPageParser(HTMLParser):
    """Collect table rows and paragraphs without requiring a DOM package."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.rows: list[list[str]] = []
        self.paragraphs: list[dict[str, Any]] = []
        self.page_text: list[str] = []
        self._row: list[str] | None = None
        self._cell: list[str] | None = None
        self._paragraph: list[str] | None = None
        self._anchor: list[str] | None = None
        self._paragraph_anchors: list[str] = []

    def handle_starttag(
        self,
        tag: str,
        attrs: list[tuple[str, str | None]],
    ) -> None:
        if tag == "tr":
            self._row = []
        elif tag in {"td", "th"} and self._row is not None:
            self._cell = []
        elif tag == "p":
            self._paragraph = []
            self._paragraph_anchors = []
        elif tag == "a" and self._paragraph is not None:
            self._anchor = []

    def handle_endtag(self, tag: str) -> None:
        if tag in {"td", "th"} and self._cell is not None:
            cell = " ".join("".join(self._cell).split())
            if self._row is not None:
                self._row.append(cell)
            self._cell = None
        elif tag == "tr" and self._row is not None:
            self.rows.append(self._row)
            self._row = None
        elif tag == "a" and self._anchor is not None:
            anchor = " ".join("".join(self._anchor).split())
            if anchor:
                self._paragraph_anchors.append(anchor)
            self._anchor = None
        elif tag == "p" and self._paragraph is not None:
            text = " ".join("".join(self._paragraph).split())
            self.paragraphs.append(
                {"text": text, "anchors": self._paragraph_anchors}
            )
            self._paragraph = None
            self._paragraph_anchors = []

    def handle_data(self, data: str) -> None:
        self.page_text.append(data)
        if self._row is not None and self._cell is not None:
            self._cell.append(data)
        if self._paragraph is not None:
            self._paragraph.append(data)
        if self._anchor is not None:
            self._anchor.append(data)


def _normalise(value: str) -> str:
    return " ".join(re.sub(r"[_\W]+", " ", value.casefold()).split())


def _recommendation(
    active_ingredient: str,
    formulation: str | None,
    source: str,
    source_url: str,
    note: str,
) -> dict[str, Any]:
    return {
        "product_type": "Fungicide",
        "active_ingredient": active_ingredient,
        "formulation": formulation,
        "recommendation_status": "reference",
        "verification_source": source,
        "source_url": source_url,
        "note": note,
    }


def _parse_kau_page(
    parser: _AgriculturalPageParser,
    source: str,
    source_url: str,
) -> list[dict[str, Any]]:
    recommendations: list[dict[str, Any]] = []
    seen: set[tuple[str, str]] = set()

    generic_name_index = next(
        (
            index
            for row in parser.rows
            for index, cell in enumerate(row)
            if _normalise(cell) == "generic name"
        ),
        1,
    )

    for row in parser.rows:
        if len(row) <= generic_name_index:
            continue

        match = _FORMULATION_PATTERN.match(
            row[generic_name_index].strip()
        )
        if not match:
            continue

        ingredient = match.group("ingredient").strip()
        formulation = " ".join(
            match.group("formulation").split()
        )
        key = (_normalise(ingredient), formulation.casefold())
        if key in seen:
            continue
        seen.add(key)

        recommendations.append(
            _recommendation(
                active_ingredient=ingredient,
                formulation=formulation,
                source=source,
                source_url=source_url,
                note=(
                    "Listed in the cited KAU crop-and-disease chemical "
                    "control reference. No dosage is provided here; "
                    "follow the current registered product label and "
                    "local extension guidance."
                ),
            )
        )

    return recommendations


def _parse_uc_ipm_page(
    parser: _AgriculturalPageParser,
    source: str,
    source_url: str,
) -> list[dict[str, Any]]:
    for paragraph in parser.paragraphs:
        text = _normalise(paragraph["text"])
        if (
            "disease abundance also can be reduced" not in text
            or "fungicide" not in text
        ):
            continue

        anchors = paragraph["anchors"]
        if not anchors:
            continue

        return [
            _recommendation(
                active_ingredient=anchors[0],
                formulation=None,
                source=source,
                source_url=source_url,
                note=(
                    "UC IPM references this fungicide for strawberry leaf "
                    "scorch. The source does not establish an Indian product "
                    "registration or formulation. Check current Indian label "
                    "directions and local extension guidance before use."
                ),
            )
        ]

    return []


async def get_pesticide_recommendations(
    crop: str | None,
    disease: str | None,
) -> list[dict[str, Any]]:
    """Fetch and parse exact crop/disease guidance from its extension source."""
    if not crop or not disease:
        return []

    source_page = _SOURCE_PAGES.get(
        (_normalise(crop), _normalise(disease))
    )
    if source_page is None:
        return []

    try:
        async with httpx.AsyncClient(
            timeout=REQUEST_TIMEOUT_SECONDS,
            follow_redirects=True,
            headers={"Accept": "text/html"},
        ) as client:
            response = await client.get(source_page["url"])
            response.raise_for_status()

        parser = _AgriculturalPageParser()
        parser.feed(response.text)
        page_text = _normalise(" ".join(parser.page_text))
        if (
            _normalise(crop) not in page_text
            or _normalise(disease) not in page_text
        ):
            logger.warning(
                "Recommendation source did not confirm crop=%s disease=%s",
                crop,
                disease,
            )
            return []

        if source_page["parser"] == "uc_ipm":
            return _parse_uc_ipm_page(
                parser,
                source_page["source"],
                source_page["url"],
            )

        return _parse_kau_page(
            parser,
            source_page["source"],
            source_page["url"],
        )

    except (httpx.HTTPError, ValueError):
        logger.exception(
            "Unable to retrieve pesticide reference for crop=%s disease=%s",
            crop,
            disease,
        )
        raise
