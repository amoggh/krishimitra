# KrishiMitra: Complete Build Guide

How this app was built, how every part works, where each number comes from, and how to run, change and present it.

KrishiMitra is a web app for people with no farming background, such as someone who has been laid off and is moving to agriculture. It covers Karnataka. You describe your land in one sentence and it tells you what to grow, how to split the field, what it will cost and what could go wrong. It also teaches farming basics, helps identify crop diseases and explains market prices.

**Contents**

1. [Quick start](#1-quick-start)
2. [Why it was rebuilt](#2-why-it-was-rebuilt)
3. [Technology choices](#3-technology-choices)
4. [Project structure](#4-project-structure)
5. [Data: what is real and what is curated](#5-data-what-is-real-and-what-is-curated)
6. [The planning engine](#6-the-planning-engine)
7. [Design system](#7-design-system)
8. [Motion and animation](#8-motion-and-animation)
9. [Screen by screen](#9-screen-by-screen)
10. [Data scripts](#10-data-scripts)
11. [How to change things](#11-how-to-change-things)
12. [Build history and problems solved](#12-build-history-and-problems-solved)
13. [Known limitations](#13-known-limitations)
14. [Presenting it: honest talking points](#14-presenting-it-honest-talking-points)

---

## 1. Quick start

You need Node.js. It was built on Node 24. Python with pandas is only needed if you regenerate the data files.

```bash
cd D:\KrishiMitra_project\krishimitra-web
```

```bash
npm install
```

```bash
npm run dev
```

Open the address Vite prints. It tries port 5173 and moves to the next free port if that one is busy.

For a production build, which goes into `dist/`:

```bash
npm run build
```

```bash
npm run preview
```

There is no backend, database or login. Everything runs in the browser. An internet connection is needed for the Google Fonts, for embedded YouTube videos and video thumbnails. The rest works offline once loaded.

---

## 2. Why it was rebuilt

The original project in `D:\KrishiMitra_project\krishimitra` has an Expo mobile app, a FastAPI backend, a Keras disease model and a Python crop optimisation pipeline. 

What was carried over from the original:

| From the original | Where it went |
|---|---|
| Pipeline order: water budget, compatibility, yield and price, risk, optimiser | `src/engine/index.js` |
| Pump flow per HP, irrigation efficiencies, deep borewell penalty, 70% effective rainfall | Same values, top of `src/engine/index.js` |
| 60% single-crop cap and 0.25 acre minimum plot | Same values |
| Crop water requirements and pH ranges from `crop_filter.py` | `src/data/crops.js` |
| Karnataka soil and mandi dataset | Processed into JSON by `scripts/build_districts.py` |
| AGMARKNET price extract | Processed into JSON by `scripts/build_mandi.py` |

What was deliberately left out:

- The FastAPI server, so nothing can fail on stage because a server is down.
- The Keras disease model, because TensorFlow was not available on the Python 3.14 install here. The Doctor tab uses a different method, described in [section 9](#doctor).
- The trained yield and price models. The engine uses a curated crop table instead.
- NSGA-II. It was replaced with a simpler search that gives the same kind of output, a set of best trade-offs between profit and risk.

---

## 3. Technology choices

| Choice | Reason |
|---|---|
| React 18 | Fast to build interactive screens |
| Vite 5 | Quick dev server and simple Web Worker support |
| Plain JavaScript | Speed of writing during a hackathon |
| Hand-written CSS, no Tailwind or UI kit | The look had to be distinctive, and kits make everything resemble everything else |
| Canvas and SVG, no animation or chart library | Full control, and only two runtime dependencies (`react`, `react-dom`) |
| Web Worker for the planner | The maths takes seconds and would otherwise freeze the animation |
| `localStorage` for progress and notes | No accounts needed |

Production bundle size: about 378 kB of JavaScript (118 kB gzipped), 33 kB of CSS and a 30 kB worker.

---

## 4. Project structure

```
krishimitra-web/
├── index.html                 Page shell and Google Fonts
├── package.json               React and Vite only
├── vite.config.js
├── BUILD_GUIDE.md             This file
├── scripts/
│   ├── build_districts.py     Dataset to per-district soil profiles
│   ├── build_mandi.py         AGMARKNET CSV to src/data/mandi.json
│   └── districts.json         Output of build_districts.py
└── src/
    ├── main.jsx               React entry point
    ├── App.jsx                Masthead, ticker, tabs, hero, footer
    ├── styles.css             The whole design system
    ├── engine/
    │   ├── index.js           The planner
    │   └── worker.js          Runs the planner off the main thread
    ├── data/
    │   ├── crops.js           14 crops: agronomy, money, week-by-week plans
    │   ├── districts.js       Combines soil data with rainfall normals
    │   ├── districts.raw.json Soil profiles for 25 districts
    │   ├── diseases.js        16 diseases and pests, 10 symptoms
    │   ├── learn.js           8 lessons, glossary, schemes
    │   ├── market.js          Ticker rows and seasonal price shapes
    │   └── mandi.json         Summarised all-India price snapshot
    ├── ui/
    │   ├── motion.jsx         Canvas loop, tweened numbers, reveal, tab wipe
    │   ├── LivingField.jsx    The animated hero landscape
    │   ├── Plant.jsx          Procedural plant drawing
    │   └── charts.jsx         Field map, falling-grain chart, sparkline, dots
    └── views/
        ├── PlanView.jsx       Sentence form, results, playbook drawer
        ├── LearnView.jsx      Course plant, lessons, crop timeline, shelf, glossary
        ├── labs.jsx           The 8 interactive lesson models
        ├── DoctorView.jsx     Photo analysis and diagnosis
        ├── MandiView.jsx      Board, map, truck, gauges, heatmap, sack journey
        └── SupportView.jsx    Government schemes and helpline
```

About 3,000 lines of source in total.

---

## 5. Data: what is real and what is curated

This matters most if a judge asks where a number came from.

### Real data from your files

| Data | Source file | Used for |
|---|---|---|
| Soil type, pH, salinity, organic carbon, N, P, K, agro-climatic zone, common crops for 25 districts | `karnataka_production_multi_model_dataset_soil_and_mandi.csv` (10,000 rows) | Crop filter, soil fit, "widely grown in district" tag |
| Wholesale price records from `mandi prices data.csv` (AGMARKNET extract of 8,914 rows, all dated 06/09/2026). 6,376 Tamil Nadu Uzhavar Sandhai rows are excluded as retail-style | `mandi prices data.csv` | The whole Mandi tab except the seasonal section |
| 18 of the 43 Karnataka price rows | Same CSV | Scrolling ticker |

The date 06/09/2026 is shown exactly as it appears in the file, because the file does not say whether it is day-first or month-first.

### Data checked and rejected

The dataset's **rainfall column is not realistic**. Averaged and added up by month, it gives Bengaluru about 3,900 mm a year, when the real figure is around 900 mm. It is not used anywhere.

The same dataset is probably generated rather than measured, since its rainfall looks that way. Its soil and nutrient values looked plausible and are used, but treat them as approximate.

Records in the price CSV were cleaned in two steps. Uzhavar Sandhai rows (farmer-to-consumer markets) are removed first. Then any row with a modal price below 10% or above 500% of that commodity's wholesale median, or a zero minimum, is dropped. This removes entries such as a modal price of ₹1.

### Curated by hand, not from your files

These values were written from general knowledge during the build and **have not been checked against a live source**. Spot-check any you plan to quote.

| Data | Location |
|---|---|
| Annual rainfall per district | `src/data/districts.js` |
| Monthly rainfall share by zone (three patterns) | `src/data/districts.js` |
| Crop yields, costs, prices, volatility, difficulty, labour, duration, seed rates | `src/data/crops.js` |
| Good and poor soils per crop | `src/data/crops.js` |
| Week-by-week growing plans | `src/data/crops.js` |
| Disease symptoms, treatments and doses | `src/data/diseases.js` |
| Scheme details and the Kisan helpline | `src/data/learn.js` |
| Lesson content, soil speeds and water-holding figures | `src/data/learn.js`, `src/views/labs.jsx` |
| Seasonal price shapes | `src/data/market.js` |

### Clearly illustrative

These are marked on screen as illustrations or practice data: the yield curves in the Spacing and Feeding labs, nitrogen uptake in the Feeding lab, drying speed in the Drying lab, price paths in the Selling game, and the seasonal section of Mandi.

---

## 6. The planning engine

File: `src/engine/index.js`. Entry point: `plan(inp)`.

```
Sentence form
   │
   ▼
1. Water budget        How much water can the farmer supply?
   ▼
2. Crop filter         Which of the 14 crops are possible? Why not the others?
   ▼
3. Simulation          500 random seasons for each remaining crop
   ▼
4. Land-split search   Thousands of layouts, keep the best trade-offs
   ▼
5. Results             Up to 7 options, from safest to most ambitious
```

Input fields: `district`, `acres`, `budget`, `source` (`rainfed`, `borewell`, `canal`), `hp`, `hours`, `depthFt`, `irrigation` (`drip`, `sprinkler`, `flood`), `experience` (`none`, `some`, `pro`), `season` (`kharif`, `rabi`, `summer`).

### Step 1: water budget

- **Rain only:** no irrigation supply.
- **Canal:** supply treated as unlimited.
- **Borewell:**

```
litres per day = average flow for the pump size × hours per day × depth penalty
depth penalty  = 0.85 if the borewell is deeper than 300 ft, otherwise 1
season supply  = litres per day ÷ 1000 × 120 pumping days × irrigation efficiency
```

| Pump | Flow range, L/hour | | Method | Efficiency |
|---|---|---|---|---|
| 1 HP | 500 to 800 | | Flood | 55% |
| 2 HP | 1,000 to 1,600 | | Sprinkler | 80% |
| 3 HP | 1,500 to 2,400 | | Drip | 92% |
| 5 HP | 2,500 to 4,000 | | | |
| 7.5 HP | 3,750 to 6,000 | | | |
| 10 HP | 5,000 to 8,000 | | | |

The form does not ask for borewell depth. The presets carry a value, and the default is under the penalty threshold.

Useful conversion: 1 mm of water on 1 acre is 4.047 cubic metres.

**Rain available to a crop** is the normal rainfall across its growing months, times 0.70, plus moisture already in the soil at sowing. That stored moisture is 60 mm normally and 120 mm on black soils, since they hold far more. The result is capped at the crop's total water need.

The month window starts in June for kharif, October for rabi and February for summer.

### Step 2: crop filter

Each crop faces these checks in order. The first failure rejects it, and the written reason is shown to the user.

| Check | Rule | Tag shown |
|---|---|---|
| Season | Crop must be grown in the chosen season | Season |
| Skill | Difficulty must not exceed the limit for the farmer's experience | Skill |
| Soil pH | District pH within the crop's range, with 0.3 of tolerance | Soil |
| Water | Best possible water coverage must reach the crop's minimum | Water |
| Budget | A quarter acre must be affordable | Budget |
| Profit | Average profit per acre at the available water must be positive. Checked after simulation | Profit |

| Experience | Max difficulty | Max crops in plan | Yield reached vs benchmark |
|---|---|---|---|
| Never farmed | 3 | 3 | 85% |
| Farmed a little | 4 | 4 | 93% |
| Farmed for years | 5 | 5 | 100% |

Crops that pass get a soil multiplier: 1.05 on a good soil, 0.85 on a poor one, 1.0 otherwise.

### Step 3: simulation

For each crop, 500 seasons are generated with a seeded random number generator, so the same inputs always give the same answer.

- **Yield noise** is lognormal. A shared weather shock runs through all crops with a correlation of 0.55, because a bad monsoon hurts everything at once.
- **Price noise** is lognormal, using each crop's own volatility. Onion and tomato are very high, MSP crops are low.
- **Price floor:** a simulated price cannot fall below 92% of MSP or the crop's market assumption, whichever is lower. This assumes some access to procurement without lifting a crop above its market price.
- **Cost noise** is lognormal, with a spread of 8%.

Profit for one crop in one season:

```
acres × (base yield × water factor × yield noise × price - cost per acre × cost noise)
base yield = benchmark yield × soil multiplier × experience factor
```

### Water shared between crops

This is why the land split matters. All crops draw on one water supply.

```
water needed = sum of (acres × water shortfall in mm × 4.047)
supply ratio = smaller of 1 and (supply ÷ water needed)
coverage     = (rain + supply ratio × shortfall) ÷ crop water need
water factor = 1 - Ky × (1 - coverage), never below 0.10
```

`Ky` is the FAO yield-response factor, which says how badly a crop suffers from water stress. Maize has 1.25 and is sensitive. Tur has 0.7 and is tolerant.

### Step 4: land-split search

The search is not NSGA-II, so do not describe it as that.

1. Generate 600 to 1,000 random layouts, using random crop subsets with random weights.
2. Enforce the rules: no crop over 60% of the land (dropped for farms under 2 acres), plots in quarter-acre steps, and at least 2 crops for non-experts on 2 acres or more.
3. If a layout costs more than the budget, shrink it. The unused land is reported as fallow.
4. Score each layout on two goals: average profit, and the average of the worst 10% of seasons.
5. Keep only layouts that no other layout beats on both goals. This set is the **Pareto front**.
6. Improve the best 6 by shifting a quarter acre between pairs of crops.
7. Sort from safest to most ambitious and thin to 7 options.

The "Play safe to Chase profit" slider moves along these options. Beginners start about a third of the way along.

### Step 5: output

Each option includes the crops with acres, costs, water coverage and profit ranges, plus totals: investment, fallow land, 10th, 50th and 90th percentile profit, average of the worst 10%, chance of a loss, return on cost, water figures and a histogram. The result also includes an "all land in the single best crop" comparison, which powers the "Why split?" note.

---

## 7. Design system

> **Version 3 redesign (Nov 2026).** Reviewers found the first look playful and busy ("like a jaatre"). It was replaced with a calm, premium style. Where this section disagrees with the list below, this wins.
>
> - **Type:** Instrument Serif for page and section headlines only; Inter for everything else, with tabular numbers. Fraunces and the monospace labels were dropped.
> - **Colour:** warm white page (`#F6F5F0`), white cards, near-black ink, one accent (forest green `#1F5A44`). Terracotta only for losses and warnings, ochre only inside charts.
> - **Structure:** hairline borders, 14px corners, soft shadows. No paper grain, hard offset shadows or highlighter underlines.
> - **Motion:** removed the full-screen tab wipe, the scrolling price ticker, the growing-plant progress bar, the animated cartoon field in the hero, split-flap letters, the cartoon truck and sack, the flip cards and the swaying plants. Kept: short fade-ins, the plan loading checklist, chart transitions and the profit dot histogram.
> - **Hero:** headline, three real-data proof points (1.1M prices, 99% leaf model, 500 simulated seasons) and a labelled form card with segmented controls. It replaces the fill-in-the-blank sentence.
> - **Learn:** a lesson sidebar with a progress bar replaces the climbing-plant map.
> - **Navigation:** pill tabs in a translucent sticky header, with model status lights on the right.
>
> Class names were kept, so the redesign lives almost entirely in `src/styles.css`, plus `App.jsx` (hero), `PlanView.jsx` (form), `LearnView.jsx` (sidebar), `MandiView.jsx` (route, gauges, journey) and `ui/charts.jsx` / `ui/Plant.jsx` (flatter drawings).


The concept is a **printed farmer's almanac**: aged paper, ink, hairline rules, big serif numbers, and hard offset shadows like a misregistered print. It avoids the usual look of rounded cards, soft shadows and purple gradients.

| Token | Value | Use |
|---|---|---|
| `--paper` | `#EEE6D3` | Page |
| `--paper-2` | `#E5DBC3` | Inset surfaces |
| `--card` | `#F8F3E6` | Cards |
| `--ink` | `#17261B` | Text, borders |
| `--ink-2`, `--ink-3` | `#44523F`, `#7A836F` | Secondary text |
| `--leaf` | `#2E5B3A` | Primary accent, positive |
| `--leaf-2` | `#8FB27A` | Light accent |
| `--gold` | `#D99A1E` | Highlight, sun, marigold |
| `--clay` | `#B04E2C` | Warning, loss |
| `--sky` | `#5E7F8C` | Water |

| Font | Role |
|---|---|
| Fraunces | Headlines and large numbers |
| Instrument Sans | Body and interface |
| JetBrains Mono | Labels and data |

Other recurring details are a CSS paper-grain overlay, 1.5 px ink borders, Kannada crop names beside English, and chart colours that follow fixed meanings: green for gain, clay for loss, one single-hue ramp for magnitudes, and a clay-to-green scale for above or below average.

---

## 8. Motion and animation

Shared tools in `src/ui/motion.jsx`:

| Tool | What it does |
|---|---|
| `useCanvas(draw, deps)` | Handles pixel density and resizing, pauses when off-screen or the tab is hidden, and paints once so a canvas is never blank |
| `Tween` | Glides a number from its old value to its new one and always lands on the true value, even if animation is throttled |
| `Reveal`, `useSeen` | Trigger once when scrolled into view |
| `PloughWipe` | The 11-strip tab transition with the tab name |
| `GrowthBar` | Scroll progress under the masthead, with a leaf at the tip |

All motion respects the operating system's "reduce motion" setting.

### The living field (`src/ui/LivingField.jsx`)

A single canvas drawn as a moving woodcut. It redraws from the form values on each frame, so the scene responds as you type.

| Input | Effect on the scene |
|---|---|
| Acres | Number of crop rows |
| District and season | Rainfall for that season sets the clouds and rain |
| Season | Sun size and height |
| Borewell | Water pulses run down the furrows, faster with more pump hours |
| Canal | A shimmering canal appears |
| Rain only in a dry place | Paler soil |
| Mouse | Wind bends the plants, and birds scatter |
| Click on soil | Seeds fly and marigolds bloom |
| "Plan my harvest" | A wave sweeps through the crop |

Perspective comes from mapping each plant's row and depth to the screen around a vanishing point. Plants are batched into `Path2D` objects so hundreds can draw together. The horizon position is measured from the hero text, so the text and the field never collide, and clouds and rain keep clear of the headline.

Measured at about 33 frames per second in the desktop app's preview pane. A normal browser may differ.

---

## 9. Screen by screen

### Plan

- **Sentence form:** a fill-in-the-blanks paragraph, with four demo presets.
- **Thinking screen:** five steps that appear while the worker runs. It waits at least about two seconds so the steps can be read.
- **Results:**
  1. Verdict, with tweening numbers and the risk slider.
  2. Field map that reshapes when the slider moves. Hovering a crop in the list highlights its plot.
  3. Falling-grain chart: each of the 500 seasons drops into a profit band and stacks. Hover shows the count and range.
  4. Water budget.
  5. Crop cards with evidence tags.
  6. Every rejected crop, with its reason.
- **Playbook drawer:** week-by-week tasks with dates from the sowing month and tick boxes saved to the browser.

### Learn

- **Course plant:** a stem with 8 leaves, each a lesson. Finishing a lesson colours its leaf and grows the stem. Finishing all 8 adds a grain head. On phones this becomes a row of chips.
- **Each lesson:** a working model, three key numbers, what to know, rookie mistakes, a task for today and a quiz. The quiz must be answered correctly to complete the lesson.

| # | Lesson | Lab | Calculation |
|---|---|---|---|
| 1 | Read your land | Soil race | 100 mm poured on four soils. Time = 100 ÷ soak rate. Depth = 100 ÷ water held per metre |
| 2 | Know your water | Where does the water go? | Each droplet reaches the roots with probability equal to the method's efficiency. Pump maths is exact |
| 3 | Seasons and calendar | Year wheel | Real district rain normals, crops by sowing and harvest window |
| 4 | Seed and sowing | Spacing | Plants per acre = 40,470,000 ÷ (row cm × plant cm). Yield curve is illustrative |
| 5 | Feeding the crop | Feed the plant | Yield follows the scarcest nutrient. Curves are illustrative |
| 6 | Pests and disease | Scout, then decide | 20-plant W walk, compared against true field damage and a 10% threshold |
| 7 | Harvest and storage | Dry it before you bag it | Moisture decays exponentially. Mould grows if bagged above the safe level |
| 8 | Selling and money | Sell now or hold? | Kept price = price × (1 - loss)^months - storage × months |

- **Crop atlas:** drag through any of the 14 crops by week and see the plant and the job for that week.
- **Video shelf:** paste YouTube links (`watch`, `youtu.be`, `shorts`, `embed`, `live`), up to 12 saved as thumbnails, with a notebook beside the player. No specific video IDs are built in, because none could be verified, so topic buttons open a YouTube search instead.
- **Glossary:** searchable flip cards.

### Doctor

No machine-learning model is involved.

1. The photo is drawn to a 120 × 120 canvas.
2. Each pixel is sorted by hue, saturation and brightness into green, yellow, brown, dark or pale. Plain background is ignored.
3. High shares auto-tick symptoms: yellow over 16%, brown plus dark over 12%, pale over 14%.
4. Each disease for the chosen crop gets a score. With both a photo and symptoms, it is 65% symptom match and 35% colour match.
5. Up to three results are shown with severity, cause, organic and chemical treatment, and prevention.

The "match" percentage is a relative ranking, not a true probability. The screen says this is decision support and not a lab test.

The photo upload flow has not been tested end to end.

### Mandi

| Section | How it works | Data |
|---|---|---|
| Flip board | Each letter cycles through random characters before landing. Rotates through commodities until you click one | Real |
| India map | Tile map of states, one tile per state, flipping outward from Karnataka, with a ranking beside it | Real, median by state |
| Min, modal, max | A real row drawn on a scale, with an explanation | Real |
| Truck calculator | Net per quintal = modal - rate × km - ₹30 handling. Shows the break-even distance | Real prices, distance and rate set by the user |
| MSP gauges | Needle shows the all-India median against MSP | Real prices, curated MSP |
| Seasonal heatmap and hold calculator | Month index by crop. Kept price after storage and shrinkage | **Indicative** |
| Journey of a sack | Six stages at an APMC yard, with auto-advance | General guidance |

Commodities with fewer than 4 records are hidden, which currently removes Ragi and Sunflower (1 record each). Turmeric was removed because its one record looked wrong. Thin commodities such as Jowar (4 records) and Tur (9) are shown with their record counts.

### Support

Six schemes (PM-KISAN, PMFBY, KCC, Soil Health Card, e-NAM, KVK) and the Kisan Call Centre number.

---

## 10. Data scripts

Both scripts have the source CSV path written in at the top. Change `SRC` or `src` if your folders differ. Run them from the `krishimitra-web` folder.

**`scripts/build_districts.py`** writes `scripts/districts.json`. You must then copy it into place:

```bash
python scripts/build_districts.py
```

```bash
copy scripts\districts.json src\data\districts.raw.json
```

**`scripts/build_mandi.py`** writes `src/data/mandi.json` directly:

```bash
python scripts/build_mandi.py
```

To show a new day's prices, replace the source CSV and re-run it. The `WANT` table in the script controls which commodities appear. To add one, use the exact commodity name from the CSV.

---

## 11. How to change things

| To change | Edit |
|---|---|
| Add a crop | New entry in `CROPS` in `src/data/crops.js`, and in `SEASON_SHAPE` in `src/data/market.js` |
| Update a price or MSP | That crop's `price` or `msp` in `src/data/crops.js` |
| Add a district | Add it to the dataset or raw JSON, and to `ANNUAL_RAIN` in `src/data/districts.js` |
| Tune the planner | Constants at the top of `src/engine/index.js` |
| Beginner limits | `EXPERIENCE` in `src/engine/index.js` |
| Add a disease | New entry in `DISEASES` in `src/data/diseases.js` |
| Edit a lesson | `LESSONS` and `LESSON_EXTRA` in `src/data/learn.js` |
| Change a lab | `src/views/labs.jsx` |
| Change colours | The variables at the top of `src/styles.css`. Canvas drawings use their own hex values in `LivingField.jsx`, `Plant.jsx` and `charts.jsx` |
| Change demo presets | `PRESETS` in `src/views/PlanView.jsx` |

To reset all saved progress, clear this site's `localStorage`. Keys used: `km-form`, `km-season`, `km-lessons`, `km-notes`, `km-shelf`, `km-yt`, and `km-pb-<crop>`.

---

## 12. Build history and problems solved

**First pass**

1. Read the original project and its datasets.
2. Generated district soil profiles and found the rainfall column was unusable.
3. Wrote the crop table, engine, disease data, lessons and the first versions of all five tabs.

**Problems found while testing the first pass**

| Problem | Fix |
|---|---|
| Blank page | A failed shell command had skipped copying `districts.raw.json` |
| The first plan was over 50% onion with 205% return on cost | Onion's yield and price lowered and its cost raised, and non-experts now need at least 2 crops on 2 acres or more |
| Planner took about 5 seconds | Simulations cut from 700 to 500, search attempts reduced |
| The Koppal dry-land preset returned no crops in rabi | Black soils given 120 mm of stored moisture, which matches how rabi crops really grow there |

**Second pass: the UI upgrade**

Added the living field, tab wipe, Web Worker, falling-grain chart and morphing field map, rebuilt Learn around eight labs, and rebuilt Mandi on the full all-India dataset.

**Problems found while testing the second pass**

| Problem | Fix |
|---|---|
| Clouds and rain ran across the headline | Kept to the right side of the sky |
| Healthy plant in the Feeding lab looked ripe and yellow | Drawn at the pre-ripening growth stage |
| India tiles were uneven and overlapped the legend | Fixed grid with a set aspect ratio |
| Truck default was a market in Tripura | Default now picks the highest market in Karnataka or a neighbouring state, and every state's best market is included in the data |
| Chart labels collided | Evenly spaced labels with leader lines |
| A leaf at the end of the scroll bar caused sideways scrolling | Position clamped |
| Misleading "Live arrivals" wording | Changed to "snapshot" with the date |
| District shown as Ramanagara | Corrected to Bengaluru South as in the CSV |

---

## 13. Known limitations

- Prices are a single day's snapshot, not a live feed.
- Karnataka only for planning. Only 43 of the 8,914 price records are from Karnataka.
- Curated values in [section 5](#5-data-what-is-real-and-what-is-curated) are unverified.
- Doctor uses colour and symptoms, not the original trained model, and its upload flow is untested.
- The planner assumes the farmer can reach MSP procurement, and 120 pumping days.
- Crop price shocks are independent of each other, which understates a market-wide crash.
- The form has no borewell depth field.
- In the Water lab, the pump slider only stops on real pump sizes (1, 2, 3, 5, 7.5, 10 HP), so it can feel jumpy.
- Rainfall patterns use the dataset's zone labels, so a district's monthly shape is only approximate.
- A few leftovers do no harm: `SNAPSHOT_DATE` in `market.js` and `crop` fields on ticker rows are unused.
- `krishimitra-web` has no `.gitignore` yet. Add one covering `node_modules` and `dist` before committing.
- Nothing has been committed to git.

---

## 14. Presenting it: honest talking points

**A good 3-minute demo**

1. Open Plan. Change the district and water source and let the judges see the field respond. Click the soil.
2. Click the "Laid-off techie" preset, then Plan my harvest.
3. Drag the risk slider. The field reshapes and the numbers move.
4. Scroll to the falling grains, then to the rejected crops with reasons.
5. Open Learn. Run the soil race, then walk the field for pests.
6. Open Mandi. Show the flip board and India map, then drag the truck distance.

**What you can claim**

- "It simulates 500 seasons for every crop and shows you the bad year, not just the average."
- "All crops share one water budget, so the land split changes the yield."
- "It tells you exactly why each crop was rejected."
- "The Mandi data is real AGMARKNET wholesale records, with retail-style market rows removed."

**What not to claim**

- Do not say the prices are live.
- Do not say the Doctor uses a trained neural network, or that its percentages are accuracy figures.
- Do not say the search is NSGA-II.
- Do not say the crop economics come from the datasets. They are curated estimates.

**If asked "is this real?"** A fair answer: the soil profiles and market prices come from datasets, the crop economics are curated estimates, and the method is real and would improve directly with verified data.

---

## 15. Verification report

Run on 9 November 2026.

| Check | Method | Result |
|---|---|---|
| Mandi medians, ranges, record counts, state medians | Recomputed from the raw CSV by a separate script | Matches after the fixes below |
| Ticker rows | Each matched back to its CSV row | 18 of 18 correct |
| District soil profiles | Recomputed from the dataset | 25 of 25 correct |
| Planner rules | Six scenarios: acres, cost, budget, 60% cap, quarter acres, percentile order, skill and season limits | No violations |
| MSP and FRP | Compared with Cabinet decisions as reported by official and news sources | Updated to latest |
| Yields | Compared with Karnataka production files | Recalibrated |

**Errors found and fixed**

- Tamil Nadu farmer-to-consumer rows made up 72% of the file and inflated the "all-India" prices. Potato read ₹2,900 when the wholesale median was far lower.
- The outlier filter wrongly dropped 61 valid low potato prices from Uttar Pradesh and nearby states.
- MSP values were one season old. Planner values are now kharif 2026-27, gram 2027-28 and sugarcane FRP 2026-27. The gauges use the MSP in force on the snapshot date.
- Benchmark yields were about twice Karnataka averages, which inflated profits.
- The MSP floor lifted ragi and jowar above their market price assumption.
- Kisan Credit Card text still showed the old ₹3 lakh limit.
- The planner could recommend a plan that loses money on average. Those crops are now rejected with a Profit reason, and the app says when nothing pays.
- Plan's stat labels rendered as dark bars because of a CSS class clash.
- The headline listed only three crops on four-crop plans.

**Still not independently verified**

- Cost of cultivation per acre, and price volatility.
- Annual rainfall for most districts. Udupi, Bagalkote and Chitradurga were close to published figures, and a full district table could not be opened.
- Disease treatments and doses.
- The gram 2027-28 MSP rests on one news report.
