"""
KrushiMitra — Crop Optimization Module
======================================
Recommends optimal crop allocation for a farmer's land based on:
  - water availability, soil, weather, season
  - yield and price models (when trained)
  - multi-objective NSGA-II optimization
  - Monte Carlo risk simulation

The module is designed for Karnataka, India initially,
but the architecture supports adding other states.
"""
