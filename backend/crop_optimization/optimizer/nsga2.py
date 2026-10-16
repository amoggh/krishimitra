"""
optimizer/nsga2.py — Multi-objective land allocation using NSGA-II.

Implements NSGA-II from scratch using only numpy (no pymoo dependency).
This avoids library version compatibility issues and is more transparent
for understanding how the algorithm works.

HOW IT WORKS (plain English):
------------------------------
We want to answer: "How many acres should each crop get?"

This is a multi-objective problem — we want to:
  Objective 1: Maximize risk-adjusted net profit (we minimize the negative)
  Objective 2: Minimize profit variance (lower = more stable income)

NSGA-II approach:
  1. Create a population of N random land allocations (each is a vector
     of acres per crop, one element per candidate crop).
  2. Each generation:
     a. Evaluate both objectives for every allocation.
     b. Check constraints — reject infeasible solutions by penalising them.
     c. Rank solutions using non-dominated sorting (Pareto fronts).
     d. Within each front, prefer solutions with more "breathing room"
        around them (crowding distance) to maintain diversity.
     e. Keep the best half; breed a new half via tournament selection,
        simulated binary crossover, and polynomial mutation.
  3. After N_GENERATIONS, pick the solution on the Pareto front with the
     best risk-adjusted profit.

Constraints enforced:
  - Total area <= farmer's total land
  - Each crop area >= 0
  - Total cost <= farmer's budget
  - Total water requirement <= available seasonal water
  - No single crop > MAX_SINGLE_CROP_FRACTION of total land

Decision variables:
  x[i] = acres allocated to crop i  (continuous, >= 0)
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Optional

import numpy as np

from crop_optimization.config import (
    MAX_SINGLE_CROP_FRACTION,
    MIN_CROP_AREA_ACRES,
    NSGA2_N_GENERATIONS,
    NSGA2_POPULATION_SIZE,
    NSGA2_SEED,
)
from crop_optimization.schemas import CropAllocation, RiskResult
from crop_optimization.utils import acres_to_hectares

logger = logging.getLogger(__name__)


@dataclass
class CropCandidate:
    """All information the optimizer needs for one crop."""

    crop: str
    water_requirement_mm: float   # seasonal water need (mm over 1 acre)
    cost_per_acre_inr: float      # cultivation cost per acre
    risk_result: Optional[RiskResult]  # None when risk model unavailable


# ---------------------------------------------------------------------------
# Fallback: equal split when no risk data is available
# ---------------------------------------------------------------------------

def _equal_allocation_fallback(
    crops: list[CropCandidate],
    total_acres: float,
    budget_inr: float,
) -> list[CropAllocation]:
    """
    Equal-area allocation used when risk data is unavailable.

    Iteratively removes the most expensive crop until the budget fits.
    """
    logger.info("Using equal-allocation fallback (risk data not available).")
    if not crops:
        return []

    eligible = list(crops)
    for _ in range(len(crops) + 1):
        if not eligible:
            break
        per_crop = total_acres / len(eligible)
        total_cost = sum(c.cost_per_acre_inr * per_crop for c in eligible)
        if total_cost <= budget_inr:
            break
        most_expensive = max(eligible, key=lambda c: c.cost_per_acre_inr)
        logger.debug("Removing '%s' from fallback (too expensive).", most_expensive.crop)
        eligible.remove(most_expensive)

    if not eligible:
        logger.warning("All crops removed during fallback budget check.")
        return []

    per_crop = total_acres / len(eligible)
    per_crop = max(per_crop, MIN_CROP_AREA_ACRES)

    return [
        CropAllocation(
            crop=c.crop,
            area_acres=round(per_crop, 3),
            area_hectares=round(acres_to_hectares(per_crop), 4),
            percentage_of_total=round(per_crop / total_acres * 100, 1),
        )
        for c in eligible
    ]


# ---------------------------------------------------------------------------
# NSGA-II core — implemented with numpy only
# ---------------------------------------------------------------------------

def _evaluate(
    population: np.ndarray,
    crops: list[CropCandidate],
    total_acres: float,
    budget_inr: float,
    available_water_mm: float,
) -> tuple[np.ndarray, np.ndarray]:
    """
    Evaluate all individuals in the population.

    Parameters
    ----------
    population : shape (pop_size, n_crops)
        Each row is one candidate allocation (acres per crop).

    Returns
    -------
    objectives : shape (pop_size, 2)
        Column 0: -risk_adjusted_profit  (minimise)
        Column 1:  profit_variance        (minimise)
    violations : shape (pop_size,)
        Sum of constraint violations (0 = feasible).
    """
    n = len(population)
    n_crops = len(crops)

    objectives = np.zeros((n, 2))
    violations = np.zeros(n)

    # Pre-extract crop attributes for vectorised ops
    costs    = np.array([c.cost_per_acre_inr      for c in crops])  # ₹/acre
    water    = np.array([c.water_requirement_mm    for c in crops])  # mm/acre
    rap      = np.array([
        c.risk_result.risk_adjusted_profit_inr or 0.0
        if c.risk_result and c.risk_result.available else 0.0
        for c in crops
    ])
    variance = np.array([
        c.risk_result.profit_variance_inr or 0.0
        if c.risk_result and c.risk_result.available else 0.0
        for c in crops
    ])

    for i, alloc in enumerate(population):
        total_area  = alloc.sum()
        total_cost  = (costs  * alloc).sum()
        # Water: each crop's requirement (mm) applies only to its allocated area.
        # Both water_requirement_mm and available_water_mm are in mm, so
        # we compare the weighted average requirement against available.
        # weighted_water_req = sum(req_i * area_i) / total_area
        # This must be <= available_water_mm (the per-area seasonal budget)
        if total_area > 0:
            weighted_water_req = (water * alloc).sum() / total_area
        else:
            weighted_water_req = 0.0
        max_frac    = alloc.max() / total_acres if total_acres > 0 else 1.0

        # Objectives (weighted by fraction of land each crop gets)
        weights = alloc / total_acres if total_acres > 0 else np.ones(n_crops) / n_crops
        objectives[i, 0] = -(rap      * weights).sum()   # -profit (minimise)
        objectives[i, 1] =  (variance * weights).sum()   # variance (minimise)

        # Constraint violations (amount by which constraint is exceeded)
        v = 0.0
        v += max(0.0, total_area  - total_acres)                # must not exceed land
        v += max(0.0, 0.9 * total_acres - total_area)           # must use at least 90%
        if (costs > 0).any():
            v += max(0.0, total_cost  - budget_inr)             # budget (only if verified costs exist)
        v += max(0.0, weighted_water_req - available_water_mm)  # water (weighted avg)
        v += max(0.0, max_frac    - MAX_SINGLE_CROP_FRACTION)   # diversification
        violations[i] = v

    return objectives, violations


def _fast_non_dominated_sort(objectives: np.ndarray) -> list[list[int]]:
    """
    NSGA-II fast non-dominated sorting.

    Returns a list of Pareto fronts, each front is a list of individual indices.
    Front 0 is the best (non-dominated) set.

    An individual A dominates B if:
      - A is no worse than B on all objectives, AND
      - A is strictly better on at least one objective.
    """
    n = len(objectives)
    domination_count = np.zeros(n, dtype=int)   # how many dominate this individual
    dominated_by_me  = [[] for _ in range(n)]   # who I dominate

    for i in range(n):
        for j in range(i + 1, n):
            # Compare i and j
            diff = objectives[i] - objectives[j]
            i_dom_j = (diff <= 0).all() and (diff < 0).any()
            j_dom_i = (-diff <= 0).all() and (-diff < 0).any()
            if i_dom_j:
                dominated_by_me[i].append(j)
                domination_count[j] += 1
            elif j_dom_i:
                dominated_by_me[j].append(i)
                domination_count[i] += 1

    fronts: list[list[int]] = []
    current_front = [i for i in range(n) if domination_count[i] == 0]

    while current_front:
        fronts.append(current_front)
        next_front = []
        for i in current_front:
            for j in dominated_by_me[i]:
                domination_count[j] -= 1
                if domination_count[j] == 0:
                    next_front.append(j)
        current_front = next_front

    return fronts


def _crowding_distance(objectives: np.ndarray, front: list[int]) -> np.ndarray:
    """
    Compute crowding distance for individuals in a Pareto front.

    Higher crowding distance = more isolated = preferred (maintains diversity).
    """
    n = len(front)
    if n <= 2:
        return np.full(n, np.inf)

    distances = np.zeros(n)
    n_obj = objectives.shape[1]

    for m in range(n_obj):
        order = np.argsort(objectives[front, m])
        distances[order[0]]  = np.inf
        distances[order[-1]] = np.inf
        obj_range = objectives[front[order[-1]], m] - objectives[front[order[0]], m]
        if obj_range == 0:
            continue
        for k in range(1, n - 1):
            distances[order[k]] += (
                objectives[front[order[k + 1]], m]
                - objectives[front[order[k - 1]], m]
            ) / obj_range

    return distances


def _tournament_select(
    fronts: list[list[int]],
    crowd_dist: np.ndarray,
    front_rank: np.ndarray,
    rng: np.random.Generator,
) -> int:
    """Binary tournament selection: pick the better of two random individuals."""
    n_total = len(front_rank)
    a, b = rng.integers(0, n_total, size=2)

    # Lower rank (earlier front) wins; ties broken by crowding distance
    if front_rank[a] < front_rank[b]:
        return int(a)
    if front_rank[b] < front_rank[a]:
        return int(b)
    # Same front — prefer more crowded distance (more isolated)
    return int(a) if crowd_dist[a] >= crowd_dist[b] else int(b)


def _sbx_crossover(
    parent1: np.ndarray,
    parent2: np.ndarray,
    rng: np.random.Generator,
    eta: float = 15.0,
) -> tuple[np.ndarray, np.ndarray]:
    """
    Simulated Binary Crossover (SBX).

    Produces children that stay close to the parents while exploring the
    space between them. eta controls how close children are to parents
    (higher eta = closer).
    """
    child1, child2 = parent1.copy(), parent2.copy()
    n = len(parent1)

    for i in range(n):
        if rng.random() < 0.5:
            continue
        if abs(parent1[i] - parent2[i]) < 1e-10:
            continue

        y1 = min(parent1[i], parent2[i])
        y2 = max(parent1[i], parent2[i])

        u = rng.random()
        beta = 1.0 + (2.0 * y1 / (y2 - y1)) if y2 > y1 else 1.0
        alpha = 2.0 - beta ** (-(eta + 1.0))
        if u <= 1.0 / alpha:
            beta_q = (u * alpha) ** (1.0 / (eta + 1.0))
        else:
            beta_q = (1.0 / (2.0 - u * alpha)) ** (1.0 / (eta + 1.0))

        child1[i] = 0.5 * ((y1 + y2) - beta_q * (y2 - y1))
        child2[i] = 0.5 * ((y1 + y2) + beta_q * (y2 - y1))

    return child1, child2


def _polynomial_mutation(
    individual: np.ndarray,
    xl: np.ndarray,
    xu: np.ndarray,
    rng: np.random.Generator,
    eta: float = 20.0,
) -> np.ndarray:
    """
    Polynomial mutation.

    Randomly nudges gene values, staying within [xl, xu].
    eta controls mutation strength (higher = smaller mutations).
    """
    child = individual.copy()
    for i in range(len(child)):
        if rng.random() > 1.0 / len(child):
            continue
        delta1 = (child[i] - xl[i]) / (xu[i] - xl[i] + 1e-10)
        delta2 = (xu[i] - child[i]) / (xu[i] - xl[i] + 1e-10)
        u = rng.random()
        if u < 0.5:
            val = 2.0 * u + (1.0 - 2.0 * u) * (1.0 - delta1) ** (eta + 1.0)
            delta_q = val ** (1.0 / (eta + 1.0)) - 1.0
        else:
            val = 2.0 * (1.0 - u) + 2.0 * (u - 0.5) * (1.0 - delta2) ** (eta + 1.0)
            delta_q = 1.0 - val ** (1.0 / (eta + 1.0))
        child[i] = np.clip(child[i] + delta_q * (xu[i] - xl[i]), xl[i], xu[i])
    return child


# ---------------------------------------------------------------------------
# Main optimizer
# ---------------------------------------------------------------------------

def optimize_allocation(
    crops: list[CropCandidate],
    total_acres: float,
    budget_inr: float,
    available_water_mm: float,
) -> list[CropAllocation]:
    """
    Run NSGA-II to find the optimal land allocation.

    Falls back to equal allocation if:
    - No crops provided
    - No risk data available (models not yet trained)

    Parameters
    ----------
    crops : list[CropCandidate]
        Compatible crops with cost, water, and risk data.
    total_acres : float
        Total farm area available.
    budget_inr : float
        Farmer's total investment budget.
    available_water_mm : float
        Estimated seasonal water available (mm over the farm area).

    Returns
    -------
    list[CropAllocation]
        One entry per allocated crop, sorted by area (descending).
    """
    if not crops:
        logger.warning("No crop candidates provided to optimizer.")
        return []

    # 1 feasible crop: allocate it directly
    if len(crops) == 1:
        c = crops[0]
        allocated = total_acres
        logger.info("Single feasible crop (%s): allocating 100%% of available land.", c.crop)
        return [
            CropAllocation(
                crop=c.crop,
                area_acres=round(allocated, 2),
                area_hectares=round(acres_to_hectares(allocated), 4),
                percentage_of_total=100.0,
            )
        ]

    # 2 feasible crops: allocate optimal split (respecting diversification limit)
    if len(crops) == 2:
        c1, c2 = crops[0], crops[1]
        r1 = c1.risk_result.risk_adjusted_profit_inr if (c1.risk_result and c1.risk_result.available) else 0.0
        r2 = c2.risk_result.risk_adjusted_profit_inr if (c2.risk_result and c2.risk_result.available) else 0.0
        
        # Primary crop gets MAX_SINGLE_CROP_FRACTION (default 60%), secondary gets remaining (40%)
        if r1 >= r2:
            a1 = round(total_acres * MAX_SINGLE_CROP_FRACTION, 2)
            a2 = round(total_acres - a1, 2)
            first, second, a_first, a_second = c1, c2, a1, a2
        else:
            a2 = round(total_acres * MAX_SINGLE_CROP_FRACTION, 2)
            a1 = round(total_acres - a2, 2)
            first, second, a_first, a_second = c2, c1, a2, a1

        logger.info("Two feasible crops: allocating %.2f ac to %s, %.2f ac to %s.", a_first, first.crop, a_second, second.crop)
        return [
            CropAllocation(crop=first.crop, area_acres=a_first, area_hectares=round(acres_to_hectares(a_first), 4), percentage_of_total=round(a_first / total_acres * 100, 1)),
            CropAllocation(crop=second.crop, area_acres=a_second, area_hectares=round(acres_to_hectares(a_second), 4), percentage_of_total=round(a_second / total_acres * 100, 1)),
        ]

    # Check if risk data is available — NSGA-II needs objective values
    has_risk = any(
        c.risk_result is not None and c.risk_result.available
        for c in crops
    )
    if not has_risk:
        logger.info("No risk data available. Using equal-allocation fallback.")
        return _equal_allocation_fallback(crops, total_acres, budget_inr)

    n_crops = len(crops)
    pop_size = NSGA2_POPULATION_SIZE
    n_gen    = NSGA2_N_GENERATIONS
    rng      = np.random.default_rng(NSGA2_SEED)

    # Decision variable bounds
    # xl = 0: optimizer decides if a crop gets land at all
    # xu = MAX_SINGLE_CROP_FRACTION × total: no single crop dominates
    xl = np.zeros(n_crops)
    xu = np.full(n_crops, total_acres * MAX_SINGLE_CROP_FRACTION)

    logger.info(
        "NSGA-II starting: %d crops, pop=%d, generations=%d",
        n_crops, pop_size, n_gen,
    )

    # ---- Initialise population ----
    # Dirichlet ensures each individual sums to total_acres from the start,
    # giving the optimizer a feasible starting region.
    raw = rng.dirichlet(np.ones(n_crops), size=pop_size)
    population = raw * total_acres
    population = np.clip(population, xl, xu)

    for generation in range(n_gen):
        # ---- Evaluate ----
        obj, viol = _evaluate(
            population, crops, total_acres, budget_inr, available_water_mm
        )

        # Penalise infeasible solutions by pushing them to worse objectives
        # (constraint-dominance: feasible always beats infeasible)
        penalty = viol[:, None] * 1e9
        penalised_obj = obj + penalty

        # ---- Non-dominated sort ----
        fronts = _fast_non_dominated_sort(penalised_obj)

        # Assign rank and crowding distance
        front_rank  = np.zeros(pop_size, dtype=int)
        crowd_dist  = np.zeros(pop_size)
        for rank, front in enumerate(fronts):
            for idx in front:
                front_rank[idx] = rank
            if len(front) > 1:
                cd = _crowding_distance(penalised_obj, front)
                for k, idx in enumerate(front):
                    crowd_dist[idx] = cd[k]

        # ---- Selection + variation ----
        offspring = np.empty_like(population)
        for k in range(0, pop_size, 2):
            p1 = _tournament_select(fronts, crowd_dist, front_rank, rng)
            p2 = _tournament_select(fronts, crowd_dist, front_rank, rng)
            c1, c2 = _sbx_crossover(population[p1], population[p2], rng)
            c1 = _polynomial_mutation(c1, xl, xu, rng)
            c2 = _polynomial_mutation(c2, xl, xu, rng)
            offspring[k]     = np.clip(c1, xl, xu)
            offspring[k + 1] = np.clip(c2, xl, xu) if k + 1 < pop_size else c2

        # ---- Merge parent + offspring, keep best pop_size ----
        combined = np.vstack([population, offspring])
        obj_c, viol_c = _evaluate(
            combined, crops, total_acres, budget_inr, available_water_mm
        )
        penalised_c = obj_c + viol_c[:, None] * 1e9
        fronts_c    = _fast_non_dominated_sort(penalised_c)

        # Select top pop_size individuals
        selected: list[int] = []
        for front in fronts_c:
            if len(selected) + len(front) <= pop_size:
                selected.extend(front)
            else:
                # Partial front: fill by crowding distance
                needed = pop_size - len(selected)
                cd = _crowding_distance(penalised_c, front)
                order = np.argsort(-cd)  # descending crowding
                selected.extend([front[i] for i in order[:needed]])
                break

        population = combined[selected]

    # ---- Extract best solution ----
    final_obj, final_viol = _evaluate(
        population, crops, total_acres, budget_inr, available_water_mm
    )

    # Among feasible solutions, pick the one with best risk-adjusted profit
    feasible_mask = final_viol < 1e-6
    if feasible_mask.any():
        candidates_idx = np.where(feasible_mask)[0]
        best_in_feasible = candidates_idx[np.argmin(final_obj[candidates_idx, 0])]
        best_alloc = population[best_in_feasible]
        logger.info(
            "NSGA-II found %d feasible solutions. Best profit obj = %.2f",
            feasible_mask.sum(), final_obj[best_in_feasible, 0],
        )
    else:
        # No fully feasible solution — pick least-violated
        logger.warning(
            "NSGA-II: no fully feasible solution found. "
            "Using least-violated solution."
        )
        best_alloc = population[np.argmin(final_viol)]

    # ---- Build output ----
    allocations: list[CropAllocation] = []
    for i, area in enumerate(best_alloc):
        if area < MIN_CROP_AREA_ACRES:
            continue
        allocations.append(
            CropAllocation(
                crop=crops[i].crop,
                area_acres=round(float(area), 3),
                area_hectares=round(acres_to_hectares(float(area)), 4),
                percentage_of_total=round(float(area) / total_acres * 100, 1),
            )
        )

    # If NSGA-II returned 0 allocations or crops, trigger fallback allocator
    if not allocations and crops:
        logger.info("NSGA-II found 0 above-threshold allocations; activating fallback allocator.")
        allocations = _equal_allocation_fallback(crops, total_acres, budget_inr)

    # Secondary guarantee: split between top 2 crops if still empty
    if not allocations and crops:
        c1 = crops[0]
        c2 = crops[1] if len(crops) > 1 else crops[0]
        if c1.crop == c2.crop or len(crops) == 1:
            allocations = [
                CropAllocation(
                    crop=c1.crop,
                    area_acres=round(float(total_acres), 2),
                    area_hectares=round(acres_to_hectares(float(total_acres)), 4),
                    percentage_of_total=100.0,
                )
            ]
        else:
            a1 = round(float(total_acres) * 0.60, 2)
            a2 = round(float(total_acres) - a1, 2)
            allocations = [
                CropAllocation(crop=c1.crop, area_acres=a1, area_hectares=round(acres_to_hectares(a1), 4), percentage_of_total=60.0),
                CropAllocation(crop=c2.crop, area_acres=a2, area_hectares=round(acres_to_hectares(a2), 4), percentage_of_total=40.0),
            ]

    # Encourage diversification: if only 1 crop got allocated but multiple candidates exist
    if len(allocations) == 1 and len(crops) > 1 and total_acres >= 1.0:
        other_candidate = next((c for c in crops if c.crop != allocations[0].crop), None)
        if other_candidate:
            a1 = round(float(total_acres) * 0.60, 2)
            a2 = round(float(total_acres) - a1, 2)
            allocations = [
                CropAllocation(crop=allocations[0].crop, area_acres=a1, area_hectares=round(acres_to_hectares(a1), 4), percentage_of_total=60.0),
                CropAllocation(crop=other_candidate.crop, area_acres=a2, area_hectares=round(acres_to_hectares(a2), 4), percentage_of_total=40.0),
            ]

    # Scale allocations so total farm land is 100% utilized while respecting MAX_SINGLE_CROP_FRACTION
    if allocations:
        tot = sum(a.area_acres for a in allocations)
        if tot > 0:
            scale = total_acres / tot
            scaled_areas = [a.area_acres * scale for a in allocations]
            max_allowed = total_acres * MAX_SINGLE_CROP_FRACTION

            # If the primary crop exceeds max single crop fraction, cap it and redistribute remainder
            if max(scaled_areas) > max_allowed and len(scaled_areas) > 1:
                order = sorted(range(len(scaled_areas)), key=lambda k: scaled_areas[k], reverse=True)
                primary_idx = order[0]
                scaled_areas[primary_idx] = max_allowed
                rem = total_acres - max_allowed
                other_sum = sum(scaled_areas[j] for j in order[1:])
                if other_sum > 0:
                    for j in order[1:]:
                        scaled_areas[j] = scaled_areas[j] / other_sum * rem

            allocations = [
                CropAllocation(
                    crop=allocations[k].crop,
                    area_acres=round(float(scaled_areas[k]), 2),
                    area_hectares=round(acres_to_hectares(float(scaled_areas[k])), 4),
                    percentage_of_total=round(float(scaled_areas[k]) / total_acres * 100, 1),
                )
                for k in range(len(allocations))
            ]

            # Reconcile any tiny rounding delta onto the primary crop
            current_tot = sum(a.area_acres for a in allocations)
            diff = round(total_acres - current_tot, 2)
            if abs(diff) > 0.001:
                allocations[0].area_acres = round(allocations[0].area_acres + diff, 2)
                allocations[0].area_hectares = round(acres_to_hectares(allocations[0].area_acres), 4)
                allocations[0].percentage_of_total = round(allocations[0].area_acres / total_acres * 100, 1)

    # Sort largest to smallest
    allocations.sort(key=lambda a: a.area_acres, reverse=True)

    logger.info("NSGA-II complete. %d crops allocated, total=%.2f acres.", len(allocations), sum(a.area_acres for a in allocations))
    return allocations

