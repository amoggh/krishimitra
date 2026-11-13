"""Dynamic pesticide price lookup from KisanShop."""

from __future__ import annotations

import logging
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import httpx
from dotenv import load_dotenv


logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Environment configuration
# ---------------------------------------------------------------------------

# Project root:
# C:\Users\AKASH\krishimitra
PROJECT_ROOT = Path(__file__).resolve().parents[3]

ENV_FILE = PROJECT_ROOT / ".env"

# Fallback in case the backend is started from another working directory.
if not ENV_FILE.exists():
    ENV_FILE = Path.cwd() / ".env"

load_dotenv(ENV_FILE)

KISANSHOP_API_KEY = os.getenv("KISANSHOP_API_KEY")


# ---------------------------------------------------------------------------
# KisanShop API configuration
# ---------------------------------------------------------------------------

KISANSHOP_API_URL = (
    "https://api.parse.bot/scraper/"
    "947e380e-cc59-4c19-be65-a147e1233553/search_products"
)

REQUEST_TIMEOUT_SECONDS = 10.0


# ---------------------------------------------------------------------------
# Text normalization
# ---------------------------------------------------------------------------

def _normalise(value: str) -> str:
    """Normalize text for reliable product matching."""

    if not value:
        return ""

    return " ".join(
        re.sub(r"[\W_]+", " ", str(value).casefold()).split()
    )


def _normalise_key(value: str) -> str:
    return re.sub(r"[^a-z0-9]", "", value.casefold())


_PRODUCT_LIST_KEYS = {
    "products",
    "results",
    "items",
    "data",
    "result",
    "output",
    "response",
    "records",
    "matches",
    "listings",
}

_PRODUCT_NAME_KEYS = {
    "name",
    "product",
    "productname",
    "producttitle",
    "title",
}

_SEARCHABLE_PRODUCT_KEYS = {
    "name",
    "product",
    "productname",
    "producttitle",
    "title",
    "brand",
    "activeingredient",
    "activeingredients",
    "composition",
    "ingredients",
    "description",
    "shortdescription",
    "details",
    "specifications",
}


def _extract_products(data: Any) -> list[dict[str, Any]]:
    """Extract product records from common API response envelopes."""

    if isinstance(data, list):
        return [item for item in data if isinstance(item, dict)]

    if not isinstance(data, dict):
        return []

    if any(_normalise_key(key) in _PRODUCT_NAME_KEYS for key in data):
        return [data]

    for key, value in data.items():
        if _normalise_key(key) in _PRODUCT_LIST_KEYS:
            products = _extract_products(value)
            if products:
                return products

    return []


def _product_field(product: dict[str, Any], *names: str) -> Any:
    wanted = {_normalise_key(name) for name in names}
    for key, value in product.items():
        if _normalise_key(key) in wanted and value is not None:
            return value
    return None


def _collect_searchable_values(value: Any) -> list[str]:
    """Collect text from recognized product fields, including nested data."""

    values: list[str] = []

    if isinstance(value, dict):
        for key, item in value.items():
            if _normalise_key(key) in _SEARCHABLE_PRODUCT_KEYS:
                if isinstance(item, (str, int, float)):
                    values.append(str(item))
                elif isinstance(item, (dict, list)):
                    values.extend(_collect_searchable_values(item))
            elif isinstance(item, dict):
                values.extend(_collect_searchable_values(item))
    elif isinstance(value, list):
        for item in value:
            if isinstance(item, (dict, list)):
                values.extend(_collect_searchable_values(item))
            elif isinstance(item, (str, int, float)):
                values.append(str(item))

    return values


# ---------------------------------------------------------------------------
# Ingredient matching
# ---------------------------------------------------------------------------

def _matches_ingredient(
    product: dict[str, Any],
    active_ingredient: str,
) -> bool:
    """
    Check whether a KisanShop product appears to contain
    the requested active ingredient.

    The check is performed against the product's available
    searchable fields.
    """

    ingredient = _normalise(active_ingredient)

    if not ingredient:
        return False

    searchable_text = _normalise(
        " ".join(_collect_searchable_values(product))
    )
    return re.search(
        rf"(?<![a-z0-9]){re.escape(ingredient)}(?![a-z0-9])",
        searchable_text,
    ) is not None


# ---------------------------------------------------------------------------
# KisanShop search
# ---------------------------------------------------------------------------

async def _search_kisanshop(
    query: str,
    api_key: str,
) -> list[dict[str, Any]]:
    """Search KisanShop through the configured API provider."""

    headers = {
        "X-API-Key": api_key,
        "Accept": "application/json",
    }

    params = {
        "query": query,
        "category": "Crop Protection",
    }

    async with httpx.AsyncClient(
        timeout=REQUEST_TIMEOUT_SECONDS,
        follow_redirects=True,
        headers=headers,
        trust_env=False,
    ) as client:

        response = await client.get(
            KISANSHOP_API_URL,
            params=params,
        )

        response.raise_for_status()

        try:
            data = response.json()
        except ValueError as exc:
            logger.warning(
                "KisanShop returned invalid JSON for query=%s "
                "(%s, content_type=%s)",
                query,
                type(exc).__name__,
                response.headers.get("content-type", "unknown"),
            )
            return []

    products = _extract_products(data)
    if not products:
        response_keys = (
            sorted(str(key) for key in data.keys())
            if isinstance(data, dict)
            else type(data).__name__
        )
        logger.warning(
            "KisanShop response contained no recognizable products "
            "for query=%s (response_keys=%s)",
            query,
            response_keys,
        )

    return products


# ---------------------------------------------------------------------------
# Product conversion
# ---------------------------------------------------------------------------

def _convert_product(
    product: dict[str, Any],
    active_ingredient: str,
    state: str,
) -> dict[str, Any] | None:
    """
    Convert a KisanShop product into the KrishiMitra
    pesticide-price response format.
    """

    product_name = _product_field(
        product,
        "name",
        "product",
        "product_name",
        "productName",
        "product_title",
        "title",
    )

    if not product_name:
        return None

    price = _product_field(
        product,
        "price",
        "selling_price",
        "sale_price",
    )

    # Ignore products where KisanShop does not provide
    # a usable online price.
    if price is None:
        return None

    return {
        "product": product_name,
        "active_ingredient": active_ingredient,
        "price": price,
        "mrp": _product_field(product, "mrp", "maximum_retail_price"),
        "currency": "INR",
        "pack_size": _product_field(
            product,
            "pack_size",
            "packSize",
            "size",
        ),
        "pack_sizes": _product_field(
            product,
            "pack_sizes",
            "packSizes",
        ) or [],
        "seller": "KisanShop",
        "state": state,
        "district": None,
        "source": "KisanShop",
        "source_url": _product_field(
            product,
            "url",
            "product_url",
            "source_url",
            "link",
        ),
        "inventory": _product_field(product, "inventory", "stock"),
        "checked_at": datetime.now(
            timezone.utc
        ).isoformat(),
    }


# ---------------------------------------------------------------------------
# Main price lookup
# ---------------------------------------------------------------------------

async def get_prices(
    active_ingredients: list[str],
    state: str = "Karnataka",
    district: str | None = None,
) -> list[dict[str, Any]]:
    """
    Fetch live pesticide product prices from KisanShop.

    IMPORTANT:
    The recommendation module decides which active ingredients
    are appropriate for the detected disease.

    This module does NOT decide which pesticide should be used.

    It only searches KisanShop for commercial products that
    appear to contain the recommended active ingredient.

    KisanShop provides an online reference price. It does not
    necessarily provide a district-specific dealer price.
    Therefore, district is retained in the function signature
    for compatibility but the returned district is None.
    """

    # ---------------------------------------------------------------
    # Check API key
    # ---------------------------------------------------------------

    api_key = KISANSHOP_API_KEY or os.getenv("KISANSHOP_API_KEY")

    if not api_key:
        logger.warning(
            "KISANSHOP_API_KEY is not configured. "
            "Live pesticide prices are unavailable."
        )
        return []

    # ---------------------------------------------------------------
    # Validate ingredients
    # ---------------------------------------------------------------

    if not active_ingredients:
        logger.info(
            "No active ingredients supplied for pesticide price lookup."
        )
        return []

    results: list[dict[str, Any]] = []

    # Prevent duplicate products.
    seen: set[tuple[str, str]] = set()

    # ---------------------------------------------------------------
    # Search each recommended active ingredient
    # ---------------------------------------------------------------

    for ingredient in active_ingredients:

        if not ingredient or not ingredient.strip():
            continue

        ingredient = ingredient.strip()

        try:

            products = await _search_kisanshop(
                query=_normalise(ingredient),
                api_key=api_key,
            )

        except httpx.HTTPStatusError as exc:

            logger.error(
                "KisanShop API returned HTTP error for ingredient=%s: "
                "status=%s",
                ingredient,
                exc.response.status_code,
            )

            continue

        except httpx.RequestError as exc:

            logger.error(
                "KisanShop network request failed for ingredient=%s "
                "(%s)",
                ingredient,
                type(exc).__name__,
            )

            continue

        except Exception:

            logger.exception(
                "Unexpected KisanShop price lookup error "
                "for ingredient=%s",
                ingredient,
            )

            continue

        # -----------------------------------------------------------
        # Verify each returned product
        # -----------------------------------------------------------

        for product in products:

            if not isinstance(product, dict):
                continue

            # Do not trust search results blindly.
            # Verify that the recommended active ingredient
            # actually appears in the returned product data.
            if not _matches_ingredient(
                product,
                ingredient,
            ):
                continue

            converted = _convert_product(
                product=product,
                active_ingredient=ingredient,
                state=state,
            )

            if not converted:
                continue

            product_name = converted["product"]

            pack_size = converted.get("pack_size") or ""

            key = (
                _normalise(product_name),
                _normalise(str(pack_size)),
            )

            if key in seen:
                continue

            seen.add(key)

            results.append(converted)

    # ---------------------------------------------------------------
    # Return results
    # ---------------------------------------------------------------

    logger.info(
        "KisanShop price lookup completed: ingredients=%s, "
        "results=%d, state=%s, district=%s",
        active_ingredients,
        len(results),
        state,
        district,
    )

    return results[:3]


# ---------------------------------------------------------------------------
# Optional compatibility helper
# ---------------------------------------------------------------------------

async def get_price_reference_for_chemicals(
    active_ingredients: list[str],
    state: str = "Karnataka",
    district: str | None = None,
) -> list[dict[str, Any]]:
    """
    Compatibility wrapper for callers that use the older
    get_price_reference_for_chemicals() function name.
    """

    return await get_prices(
        active_ingredients=active_ingredients,
        state=state,
        district=district,
    )