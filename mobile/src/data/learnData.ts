export interface LessonGuide {
  simpleHeading: string;
  whatDoing: string;
  howRelatedToAgri: string;
  howBenefitsYou: string;
  labClarification?: string;
}

export interface LessonItem {
  id: string;
  n: string;
  title: string;
  min: number;
  query: string;
  lead: string;
  points: string[];
  task: string;
  quiz: { q: string; a: string[]; c: number }[];
  guide: LessonGuide;
}

export interface LessonExtra {
  numbers: [string, string][];
  mistakes: string[];
}

export interface SchemeItem {
  name: string;
  what: string;
  how: string;
}

export const LESSONS: LessonItem[] = [
  {
    id: "l1",
    n: "01",
    title: "Read your land",
    min: 6,
    query: "how to read soil types farmer basics Karnataka red soil black soil",
    lead: "Before seed or money, learn what your soil is telling you.",
    guide: {
      simpleHeading: "Understanding Your Soil & How It Drinks Water",
      whatDoing:
        "This interactive lab simulates pouring 100 mm depth of irrigation water or rainfall (equal to ~400,000 litres per acre) onto 4 Karnataka soil types: Red Sandy Loam, Laterite, Red Loamy, and Black Cotton. It measures the infiltration speed (how fast water sinks in) and water retention depth (how deep moisture penetrates into the root zone).",
      howRelatedToAgri:
        "Soil acts as your crop's water reservoir and pantry. Sandy soils drain in hours like a sieve (25 mm/h), meaning roots dry quickly; heavy Black Cotton soils absorb water very slowly (3 mm/h) but hold moisture for weeks. If you irrigate black soil too frequently, roots drown and rot; if you water sandy soil only once a week, crops suffer severe moisture stress.",
      howBenefitsYou:
        "You will identify your farm's exact soil drinking behavior, calculate the right irrigation frequency (so you stop burning unnecessary electricity or diesel), and select the crops naturally best suited for your field (e.g. Groundnut & Ragi for red soil; Cotton, Jowar & Bengal Gram for black soil).",
      labClarification:
        "What does 'Pour 100 mm' mean? In agriculture, rainfall and irrigation are measured in mm of water depth. 100 mm means pouring 100 mm depth of water (~400,000 litres on 1 acre) to test which soil absorbs it fastest and stores it deepest.",
    },
    points: [
      "Red soil drains fast and is low in nutrients: ragi, groundnut, pulses love it. Black cotton soil holds water for months: cotton, jowar, gram.",
      "Do the squeeze test: wet a handful and roll it. A ribbon longer than 5 cm is clay; if it crumbles at once it is sandy.",
      "Get a free Soil Health Card from your Raitha Samparka Kendra. It lists pH, nitrogen, phosphorus and potassium for your plot and tells you what to add.",
      "pH between 6 and 7.5 suits most crops. Below 5.5 add lime; above 8.5 add gypsum and organic matter.",
    ],
    task: "Walk your plot, dig a 30 cm pit at three spots, and note colour and how the soil clumps.",
    quiz: [
      { q: "Which soil holds water longest?", a: ["Red sandy soil", "Black cotton soil", "Laterite"], c: 1 },
      { q: "Where do you get a free soil test?", a: ["Local shop", "Soil Health Card via the RSK", "Radio"], c: 1 },
    ],
  },
  {
    id: "l2",
    n: "02",
    title: "Know your water",
    min: 6,
    query: "borewell drip irrigation basics for beginners farmers",
    lead: "Water, not land, decides what you can grow.",
    guide: {
      simpleHeading: "Mastering Borewell Run-Time & Smart Irrigation",
      whatDoing:
        "This interactive lab compares water efficiency across Flood (55%), Sprinkler (80%), and Drip (92%) irrigation methods. You adjust pump horsepower (1 to 10 HP) and daily pumping hours (1 to 12 hrs) to see how many litres actually reach crop roots versus how much evaporates into thin air.",
      howRelatedToAgri:
        "Water, not land acreage, sets the ceiling on how much you can harvest. Flood irrigation loses nearly half of your pumped groundwater to surface runoff and hot sun evaporation. Drip irrigation delivers water drop-by-drop directly into the root zone, letting you irrigate nearly double the land area on the exact same borewell output.",
      howBenefitsYou:
        "You will know whether your borewell can realistically support 2 acres, 5 acres, or 10 acres before planting begins. You will learn the 2 critical crop stages (Flowering & Grain Filling) where missing a single watering can wipe out 40% of yield, saving you thousands on power bills.",
      labClarification:
        "Efficiency Calculation: If you pump 10,000 litres with flood irrigation, only 5,500 L reach your crop. With drip irrigation, 9,200 L nourish your roots. Switch methods to see how runtime changes.",
    },
    points: [
      "A crop needs a fixed depth of water over its season. Ragi needs about 500 mm, paddy about 1000 mm, sugarcane 1800 mm. Rain covers part, the rest is yours to supply.",
      "One acre-millimetre is 4 cubic metres. 100 mm on one acre is about 400,000 litres.",
      "Drip wastes the least (about 92% efficient). Flood irrigation loses nearly half.",
      "Time irrigation to the critical stages: flowering and grain filling. A missed irrigation there costs more than any other week.",
    ],
    task: "Note your pump HP and how many hours it runs per day. The planner uses it to size your acreage.",
    quiz: [
      { q: "Which irrigation wastes the least water?", a: ["Flood", "Drip", "Furrow"], c: 1 },
      { q: "Most important irrigation timing?", a: ["At flowering and grain fill", "Only at sowing", "Never"], c: 0 },
    ],
  },
  {
    id: "l3",
    n: "03",
    title: "Seasons and calendar",
    min: 5,
    query: "kharif rabi summer crops season explained farmers India",
    lead: "India farms in three seasons. Planting in the wrong one is the commonest rookie loss.",
    guide: {
      simpleHeading: "Timing Your Sowing: Kharif, Rabi & Summer",
      whatDoing:
        "This lab is an interactive 12-month agricultural calendar wheel. You scrub through the months and choose your Karnataka district to watch monsoon rainfall peak, temperature changes, and exact sowing/harvest windows for 14 regional crops.",
      howRelatedToAgri:
        "Crops are strictly photosensitive and temperature-sensitive. Sowing even 10 to 14 days late exposes tender flowering heads to scorching summer heat or traps harvested grains in unseasonal cyclone downpours, causing lodging, mold, and severe yield penalties.",
      howBenefitsYou:
        "You will plan your crop rotations like an expert: harvesting Kharif maize or groundnut in October and immediately planting Rabi chickpea or jowar on leftover residual moisture without paying extra for soil preparation.",
      labClarification:
        "The Wheel: Months 5 to 9 (June to October) are Kharif (Monsoon). Months 9 to 1 (October to February) are Rabi (Winter). Months 1 to 4 (February to May) are Summer / Zaid.",
    },
    points: [
      "Kharif: sown June-July with the monsoon, harvested Oct-Nov (ragi, maize, tur, cotton, paddy).",
      "Rabi: sown Oct-Nov on stored moisture, harvested Feb-Mar (chickpea, jowar, wheat).",
      "Summer / zaid: Feb-May, only with irrigation (groundnut, sunflower, moong, vegetables).",
      "Check the sowing window for your crop. Even 10 days late can cut yield by a tenth.",
    ],
    task: "Mark on a calendar which season you can start in and how many days until sowing.",
    quiz: [
      { q: "Which season is sown with the monsoon?", a: ["Rabi", "Kharif", "Summer"], c: 1 },
      { q: "Chickpea is grown mainly in?", a: ["Kharif", "Rabi", "Summer"], c: 1 },
    ],
  },
  {
    id: "l4",
    n: "04",
    title: "Seed and sowing",
    min: 6,
    query: "seed treatment sowing method spacing basics farmers",
    lead: "Good seed and correct spacing decide a quarter of your yield before the first rain.",
    guide: {
      simpleHeading: "Plant Spacing & Maximum Yield Density",
      whatDoing:
        "This lab tests plant spacing density across Maize, Ragi, Tur, and Sunflower. You slide the spacing scale (from 0.5x crowded to 2.0x sparse) to observe how plant population per acre affects the total yield curve.",
      howRelatedToAgri:
        "Crowded plants compete viciously for sunlight, soil moisture, and fertilizer, growing tall and spindly with empty seed heads, while trap humidity breeds deadly fungal blights. Under-populated fields leave empty bare soil where weeds take over and valuable sunlight goes uncaptured.",
      howBenefitsYou:
        "You will discover the agronomic 'Sweet Spot' spacing (e.g. 60×20 cm for Maize = ~33,000 plants/acre) that guarantees maximum grain weight per acre. You will also learn why a ₹100 bio-fungicide seed treatment protects seedlings during the critical first 3 weeks.",
      labClarification:
        "Sweet Spot: The curve peaks at 1.0x recommended spacing. Moving the slider left crowds the field (high disease risk); moving it right wastes land.",
    },
    points: [
      "Buy certified seed from a licensed dealer or the RSK. Keep the bill. Cheap loose seed is the most common cause of crop failure.",
      "Seed treatment (Trichoderma, Rhizobium, carbendazim) protects seedlings in the first three weeks and costs under ₹100 per acre.",
      "Spacing is not optional: too dense invites disease, too wide wastes land. Use a rope marked at the crop spacing.",
      "Sow at the depth listed in the playbook: 2-3 cm for small seeds, 5-8 cm for pulses.",
    ],
    task: "Visit the nearest Raitha Samparka Kendra and ask the price of certified seed for your top crop.",
    quiz: [
      { q: "Where to buy seed?", a: ["Roadside", "Certified dealer / RSK", "Any neighbour"], c: 1 },
      { q: "Why treat seed?", a: ["Protects seedlings", "Looks nicer", "No reason"], c: 0 },
    ],
  },
  {
    id: "l5",
    n: "05",
    title: "Feeding the crop",
    min: 7,
    query: "organic manure NPK fertilizer dose beginners farmers",
    lead: "Nutrients in the right amount at the right time. Not more, not earlier.",
    guide: {
      simpleHeading: "Balancing Plant Nutrients (Liebig's Law)",
      whatDoing:
        "This lab models Liebig's Law of the Minimum on a living simulated plant. You adjust Nitrogen (N), Phosphorus (P), and Potassium (K) levels independently and watch leaf color change (yellowing, purple purpling, or brown scorching) and yield rise or crash.",
      howRelatedToAgri:
        "Plants cannot substitute one nutrient for another. A barrel holds water only up to its shortest stave: if Phosphorus is at 40%, dumping 200% Nitrogen will NOT increase yield—it only wastes money and causes soft, leafy growth that attracts pest swarms.",
      howBenefitsYou:
        "You will stop wasting ₹3,000+ per acre on excess Urea fertilizer, learn how to split Nitrogen into 2-3 timed application windows, and understand why organic Farmyard Manure (FYM) is essential for microbial soil health.",
      labClarification:
        "Nutrient Roles: Nitrogen (N) builds green leaves; Phosphorus (P) develops deep roots; Potassium (K) hardens grain and protects against drought stress.",
    },
    points: [
      "Organic base first: 2-4 tonnes of farmyard manure per acre improves water holding and feeds microbes.",
      "N-P-K are the big three. Nitrogen for leaf, phosphorus for roots, potassium for grain/fruit quality.",
      "Split nitrogen into 2-3 doses. One big dose is mostly lost to rain and air.",
      "Pulses fix their own nitrogen; add only starter phosphorus. Do not over-feed them.",
    ],
    task: "Compare your Soil Health Card numbers with the crop plan and cut anything the card says is already high.",
    quiz: [
      { q: "Pulses mainly need?", a: ["Heavy urea", "Phosphorus, not heavy nitrogen", "No nutrients"], c: 1 },
      { q: "Better way to apply nitrogen?", a: ["Single big dose", "Split doses", "At harvest"], c: 1 },
    ],
  },
  {
    id: "l6",
    n: "06",
    title: "Pests and disease",
    min: 7,
    query: "integrated pest management IPM basics farmers neem pheromone trap",
    lead: "Look before you spray. Most sprays are wasted money.",
    guide: {
      simpleHeading: "Scouting Pests & The Economic Threshold Rule",
      whatDoing:
        "This lab simulates an agronomic 'W-Pattern Field Walk'. You walk across a 20-plant sampling path in your field, count infested vs. healthy plants, and decide whether to spray chemical pesticides based on whether damage exceeds the 10% Economic Injury Level (EIL).",
      howRelatedToAgri:
        "Seeing a few bugs does NOT justify an expensive chemical spray. Routine unnecessary spraying kills friendly predator insects (ladybird beetles, spiders) that eat pests naturally, and triggers chemical resistance. You only spray when the financial loss from crop damage exceeds the cost of chemical spraying.",
      howBenefitsYou:
        "You will master field scouting in under 20 minutes, rely on affordable eco-friendly defenses (Neem oil, Pheromone traps, Yellow sticky boards), and save ₹4,000 to ₹8,000 per acre per season on unnecessary pesticide chemicals.",
      labClarification:
        "The Rule: If under 10% of plants are damaged, natural predators will manage the pests—save your money. If over 10%, targeted spraying is justified.",
    },
    points: [
      "Scout twice a week: walk a W-pattern, check 20 plants, count damaged ones. Act only at the threshold, usually 5-10% damage.",
      "Use the cheap tools first: neem oil, pheromone traps, yellow sticky traps, bird perches.",
      "Rotate chemicals and always read the label. Wear gloves and a mask. Observe the waiting period before harvest.",
      "Photograph anything unusual and use the Disease Doctor in this app to narrow it down quickly.",
    ],
    task: "Install 5 pheromone traps or a few sticky boards as soon as the crop emerges.",
    quiz: [
      { q: "When should you spray?", a: ["Weekly regardless", "At the damage threshold", "After harvest"], c: 1 },
      { q: "First-line cheap tool?", a: ["Neem / traps", "Strongest chemical", "Nothing"], c: 0 },
    ],
  },
  {
    id: "l7",
    n: "07",
    title: "Harvest and storage",
    min: 5,
    query: "post harvest handling drying storage grain moisture farmers",
    lead: "Half the profit is made after the crop is cut.",
    guide: {
      simpleHeading: "Safe Moisture Levels & Preventing Grain Rot",
      whatDoing:
        "This lab simulates the sun-drying process across Groundnut, Maize, Paddy, and Ragi. You increase drying days on tarpaulin to watch moisture percentage drop and test whether the grain is safe to bag or will rot from fungal aflatoxins.",
      howRelatedToAgri:
        "Up to 25% of farming revenue is lost after cutting the crop. Grains bagged wet (above 14% moisture for cereals, or 8% for groundnut) sweat in gunny bags, produce poisonous black mold (Aflatoxin), and get heavily discounted or completely rejected by APMC buyers.",
      howBenefitsYou:
        "You will know the exact safe bagging moisture threshold for every crop, learn quick physical checks (the thumbnail bite/crack test), and earn ₹200 to ₹400 extra per quintal by presenting clean, dry, unblemished produce.",
      labClarification:
        "Safe Limits: Groundnut must be dried to 8% moisture. Ragi to 12%. Maize and Paddy to 14%. Bagging earlier causes rot; bagging within safe limits keeps grain fresh for months.",
    },
    points: [
      "Harvest at the right maturity. Early and the grain shrivels, late and you lose to shattering and birds.",
      "Dry to the safe moisture: 12-14% for grains, 8% for groundnut. Wet storage grows aflatoxin and loses the sale.",
      "Clean, grade and pack in new gunny bags. Graded produce earns a premium.",
      "Store on pallets, away from walls, and use hermetic bags for pulses.",
    ],
    task: "Plan where you will dry and store produce before harvest day. Tarpaulin and a dry room are enough.",
    quiz: [
      { q: "Safe moisture for groundnut?", a: ["8%", "20%", "30%"], c: 0 },
      { q: "Clean, graded produce?", a: ["Earns a premium", "No difference", "Is rejected"], c: 0 },
    ],
  },
  {
    id: "l8",
    n: "08",
    title: "Selling and money",
    min: 8,
    query: "how to sell crops e-NAM APMC MSP procurement farmers",
    lead: "The best crop is wasted if you sell it the wrong way.",
    guide: {
      simpleHeading: "Beating the Harvest Glut & Smart Market Selling",
      whatDoing:
        "This lab is an interactive market trading game. You manage a 100-quintal harvest over 8 post-harvest months. You decide each month whether to sell immediately or pay warehouse storage and endure crop shrinkage to capture higher off-season prices.",
      howRelatedToAgri:
        "During harvest month, mandis are flooded with supply and traders lower prices to bottom-barrel rates (harvest glut). Storing grain in a certified warehouse and selling 2 to 4 months later often yields 30% to 50% more net profit, even after paying storage fees.",
      howBenefitsYou:
        "You will master the economics of holding vs. selling, learn how to use Government MSP (Minimum Support Price) procurement centers as your safety floor, and avoid selling at a loss when the market is oversupplied.",
      labClarification:
        "Storage Trade-off: Holding grain earns higher market prices later, but costs warehouse rent (₹15-40/q/mo) and weight shrinkage. The goal is to time the peak net realization.",
    },
    points: [
      "Check the day's modal price on this app and on e-NAM before you load a truck.",
      "MSP procurement exists for ragi, paddy, jowar, maize, tur, gram, groundnut, moong, sunflower and cotton. Register at your nearest purchase centre early.",
      "Avoid selling in the harvest-glut month. If you can store safely, hold for 6-8 weeks.",
      "Keep every bill. Records unlock bank loans (KCC), crop insurance claims and subsidies.",
    ],
    task: "Open the Mandi tab and note which of your crops currently trade above MSP.",
    quiz: [
      { q: "What is MSP?", a: ["Govt minimum purchase price", "A fertiliser", "A mandi fee"], c: 0 },
      { q: "Best time to sell?", a: ["Peak glut month", "After checking the price trend", "Always the same day"], c: 1 },
    ],
  },
];

export const GLOSSARY: [string, string][] = [
  ["Acre", "4,047 sq m. 40 guntas = 1 acre. 1 hectare = 2.47 acres."],
  ["Guntha", "A land unit of 1,089 sq ft. 40 guntas make an acre."],
  ["Quintal", "100 kg. Crops are priced per quintal. 10 quintals = 1 tonne."],
  ["MSP", "Minimum Support Price. The government buys at least at this price for notified crops."],
  ["APMC", "Agricultural Produce Market Committee. The regulated mandi where farmers sell."],
  ["Modal price", "The price at which most of the day's trade happened. More honest than min or max."],
  ["FYM", "Farmyard manure. Composted cattle dung; the cheapest soil improver."],
  ["Kharif / Rabi", "Monsoon-sown season (Jun-Oct) / winter season (Oct-Mar)."],
  ["Tilth", "How fine and crumbly the soil is after ploughing. Fine tilth gives better germination."],
  ["Ratoon", "A second crop that regrows from the stubble of the first (sugarcane, banana)."],
  ["IPM", "Integrated Pest Management. Use traps, bio-agents and thresholds before chemicals."],
  ["ETc", "Crop evapotranspiration. The depth of water a crop uses over its life, in mm."],
];

export const SCHEMES: SchemeItem[] = [
  {
    name: "PM-KISAN",
    what: "₹6,000 per year in three ₹2,000 instalments directly to the bank account of eligible landholding farmers.",
    how: "Register with land records (RTC / Pahani) and Aadhaar-linked bank via pmkisan.gov.in or your local CSC / RSK.",
  },
  {
    name: "PM Fasal Bima Yojana (PMFBY)",
    what: "Crop insurance against drought, flood, pests and hail. Farmers pay 2% sum insured for kharif, 1.5% for rabi, 5% for commercial/horticulture.",
    how: "Enrol through your bank, CSC or pmfby.gov.in portal before the seasonal cut-off date.",
  },
  {
    name: "Kisan Credit Card (KCC)",
    what: "Short-term crop credit with interest subvention. Subsidised limit up to ₹5 lakh. Net effective rate can fall to ~4% on prompt repayment.",
    how: "Apply at a cooperative or nationalised bank with land documents.",
  },
  {
    name: "Soil Health Card",
    what: "Free scientific soil testing with nutrient recommendations tailored for your exact survey number.",
    how: "Request through the Raitha Samparka Kendra (RSK) or local Agriculture Department.",
  },
  {
    name: "e-NAM",
    what: "Pan-India electronic trading portal linking APMC mandis to discover best competitive bids without middlemen.",
    how: "Register at enam.gov.in or directly at your local APMC market yard.",
  },
  {
    name: "Krishi Vigyan Kendra (KVK)",
    what: "Free technical training, frontline demonstrations, seed availability and advisories for farmers.",
    how: "Contact your district KVK (affiliated with UAS Bengaluru, Dharwad or Shivamogga).",
  },
];

export const LESSON_EXTRA: Record<string, LessonExtra> = {
  l1: {
    numbers: [
      ["6 – 7.5", "soil pH most crops prefer"],
      ["15 – 30 cm", "depth to take a soil sample"],
      ["Free", "the Soil Health Card test"],
    ],
    mistakes: [
      "Testing one corner and assuming the whole plot matches. Sample from at least 8 spots in a zig-zag and mix them.",
      "Sampling right after fertiliser or manure was spread. It gives a falsely rich reading.",
      "Buying or leasing land without checking the water source first.",
    ],
  },
  l2: {
    numbers: [
      ["92%", "of drip water reaches the crop"],
      ["55%", "for flood irrigation"],
      ["4,047 L", "1 mm of water on 1 acre"],
    ],
    mistakes: [
      "Watering by the calendar instead of checking soil moisture at root depth.",
      "Irrigating at midday, when more of it evaporates.",
      "Pumping a borewell non-stop. Rest it so the water level can recover.",
    ],
  },
  l3: {
    numbers: [
      ["Jun – Jul", "kharif sowing"],
      ["Oct – Nov", "rabi sowing"],
      ["Feb – Mar", "summer sowing, irrigation needed"],
    ],
    mistakes: [
      "Sowing before the monsoon has properly set in, then losing germination in a dry spell.",
      "Copying a crop calendar from another state.",
      "Picking a crop that harvests in the same weeks as everyone nearby, when prices are lowest.",
    ],
  },
  l4: {
    numbers: [
      ["33,725", "maize plants per acre at 60 × 20 cm"],
      ["< ₹100", "seed treatment cost per acre"],
      ["100 seeds", "on wet gunny: your germination test"],
    ],
    mistakes: [
      "Buying loose seed with no bill or lot number, so there is no claim if it fails.",
      "Using more seed 'to be safe' and getting a crowded, disease-prone stand.",
      "Sowing too deep, so small seeds never reach the surface.",
    ],
  },
  l5: {
    numbers: [
      ["46%", "nitrogen content of urea"],
      ["2 – 3", "splits for a nitrogen dose"],
      ["2 – 4 t", "farmyard manure per acre"],
    ],
    mistakes: [
      "Broadcasting urea just before heavy rain, which washes it away.",
      "Feeding pulses heavy nitrogen. They make their own.",
      "Adding fertiliser without reading the Soil Health Card first.",
    ],
  },
  l6: {
    numbers: [
      ["2×", "scouting walks a week"],
      ["20", "plants checked per walk"],
      ["5 – 10%", "typical damage before action"],
    ],
    mistakes: [
      "Mixing several pesticides in one tank without advice.",
      "Spraying in wind or midday heat, when it drifts and burns.",
      "Harvesting before the waiting period on the label has passed.",
    ],
  },
  l7: {
    numbers: [
      ["12 – 14%", "safe moisture for grains"],
      ["8%", "safe moisture for groundnut"],
      ["50 cm", "gap between bag stacks and walls"],
    ],
    mistakes: [
      "Drying directly on bare ground, which adds soil and fungus to the grain.",
      "Reusing old gunny bags that still carry insects.",
      "Bagging while grain is warm, so moisture condenses inside the bag.",
    ],
  },
  l8: {
    numbers: [
      ["Modal", "the price most trade happened at"],
      ["6 – 8 weeks", "a typical hold past the harvest glut"],
      ["Every bill", "keep them for loans and claims"],
    ],
    mistakes: [
      "Selling to the first buyer at the farm gate without checking the mandi rate.",
      "Taking ungraded produce to market and getting the lowest bid.",
      "Missing the MSP registration window and then selling below MSP.",
    ],
  },
};
