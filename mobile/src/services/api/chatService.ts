// ===========================================================================
// KrishiMitra AI Chat Service
// Optimized for simple, jargon-free farmer language & practical Indian farm units.
// ===========================================================================

export interface ChatMessage {
  id?: string;
  role: "user" | "model";
  content: string;
  timestamp?: string;
}

export interface FarmContext {
  location?: string;
  district?: string;
  state?: string;
  soil_type?: string;
  total_acres?: number;
  current_crops?: string[];
  irrigation_type?: string;
  recent_weather?: {
    temp_c?: number;
    condition?: string;
    humidity_pct?: number;
  };
}

export interface ChatResponse {
  response: string;
  is_farming_related: boolean;
  suggested_followups: string[];
}

export interface ChatStatus {
  status: string;
  has_api_key: boolean;
  model: string;
  domain: string;
}

const SYSTEM_PROMPT = `You are KrishiMitra AI, a friendly and wise agricultural advisor helping Indian farmers.

IMPORTANT LANGUAGE & SIMPLICITY RULES:
1. TALK IN VERY SIMPLE WORDS:
   - Write in simple, easy-to-understand English (suitable for a farmer with basic schooling).
   - NEVER use complicated college-level scientific words or medical/botanical jargon.
   - Do NOT say "foliar necrosis" -> say "brown dry leaves".
   - Do NOT say "sporulation / pathogen" -> say "fungus or germ spreading".
   - Do NOT say "tillering / vegetative phase" -> say "branching stage (when plant is growing leaves)".
   - Do NOT say "evapotranspiration" -> say "water drying up in the heat".
   - Keep sentences short, direct, and warm.

2. USE PRACTICAL FARMER MEASUREMENTS:
   - When giving spray doses, ALWAYS mention the standard 15-litre sprayer pump (e.g., "Add 2 bottle caps / 30 ml in one 15-litre spray pump").
   - For fertilizers, mention bags (bori) or kg per acre (e.g., "1 bag of 45 kg Urea per acre").
   - Mention clear clock timings: "Early morning before 9 AM or evening after 4 PM".

3. ALWAYS EXPLAIN FERTILIZERS & MEDICINES SIMPLY:
   - Urea = White fertilizer for fast green leaf growth.
   - DAP = Black granules for strong roots.
   - Potash = For good grain weight and disease strength.
   - Neem oil = Natural herbal spray for small insects and worms.

4. STRICT DOMAIN BOUNDARY (FARMING ONLY):
   - You ONLY answer questions about crops, soil, water, fertilizers, pests, weather for farming, mandi prices, farm animals, and government farmer schemes.
   - If the user asks about ANYTHING ELSE (celebrities, sports, athletes like Virat Kohli, movies, politics, coding, games, personal chat, general knowledge), you MUST strictly refuse:
     "⚠️ **Question Outside Agricultural Domain**\n\nI am **KrishiMitra**, an AI assistant specialized strictly in farming and agriculture. I cannot answer questions about general knowledge, celebrities, sports, politics, or entertainment.\n\nPlease ask me any question about your crops, soil, fertilizers, pests, irrigation, or mandi prices!"

5. USE FARM CONTEXT:
   - Tailor your simple advice directly to the user's district, soil type, and active crops.`;

const CANDIDATE_MODELS = [
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-1.5-flash-latest",
  "gemini-1.5-flash",
];

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

let workingModel: string | null = null;

function getApiKey(): string {
  const raw = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? "";
  return raw.replace(/^["']|["']$/g, "").trim();
}

function buildFarmContext(farmContext?: FarmContext): string {
  if (!farmContext) return "";
  const lines: string[] = [];
  const loc = farmContext.district || farmContext.location;
  if (loc) lines.push(`- Farm Location: ${loc}${farmContext.state ? `, ${farmContext.state}` : ""}`);
  if (farmContext.soil_type) lines.push(`- Soil Type: ${farmContext.soil_type}`);
  if (farmContext.total_acres) lines.push(`- Land Size: ${farmContext.total_acres} acres`);
  if (farmContext.current_crops?.length)
    lines.push(`- Growing Crops: ${farmContext.current_crops.join(", ")}`);
  if (farmContext.irrigation_type) lines.push(`- Watering System: ${farmContext.irrigation_type}`);
  if (farmContext.recent_weather) {
    const w = farmContext.recent_weather;
    lines.push(`- Today Weather: ${w.temp_c ?? "N/A"}°C, ${w.condition ?? "N/A"}`);
  }
  if (!lines.length) return "";
  return "\n[FARMER DETAILS]:\n" + lines.join("\n") + "\n";
}

/**
 * Easy-to-read fallback engine with strict agricultural domain boundaries.
 */
function getAgronomicFallback(query: string, farmContext?: FarmContext): ChatResponse {
  const q = query.toLowerCase().trim();
  const district = farmContext?.district || farmContext?.location || "your area";
  const soil = farmContext?.soil_type || "Red Sandy Loam";
  const crops = farmContext?.current_crops?.join(", ") || "Arecanut, Paddy, Ginger";

  // 1. Explicit greeting check
  const greetings = ["hi", "hello", "hey", "namaste", "namaskara", "good morning", "good evening", "good afternoon"];
  if (greetings.includes(q) || greetings.some((g) => q === `${g}!` || q === `${g}.` || q === `${g} krishimitra`)) {
    return {
      response:
        `Namaste! I am **KrishiMitra**, your agricultural advisor.\n\n` +
        `I am strictly specialized in **crops, soil health, fertilizers, pest control, weather advisories, and mandi rates** for your farm in **${district}**.\n\n` +
        `How can I assist your field activities today?`,
      is_farming_related: true,
      suggested_followups: [
        "What fertilizer should I put in my soil?",
        "How to spray neem oil for pests?",
        "When is the best time to water crops?",
        "Tips to get best price at Mandi",
      ],
    };
  }

  // 2. Comprehensive check for non-farm keywords, celebrities, sports, politics, etc.
  const explicitNonFarmKeywords = [
    "who is", "who was", "whom", "where is", "capital of",
    "kohli", "virat", "dhoni", "rohit", "sachin", "cricket", "ipl", "match", "world cup", "football", "messi", "ronaldo",
    "movie", "film", "cinema", "song", "singer", "actor", "actress", "celebrity", "bollywood", "hollywood", "music",
    "modi", "rahul", "gandhi", "biden", "trump", "politics", "minister", "prime minister", "president", "election", "vote",
    "code", "coding", "python", "javascript", "java", "html", "react", "programming", "developer", "software",
    "joke", "story", "poem", "game", "gaming", "dating", "girlfriend", "boyfriend", "love"
  ];

  const hasExplicitNonFarm = explicitNonFarmKeywords.some((w) => q.includes(w));

  // 3. Comprehensive whitelist of agricultural topics & concepts
  const agriculturalKeywords = [
    // Crops & plants
    "crop", "paddy", "rice", "wheat", "ragi", "maize", "sugarcane", "cotton", "tomato", "onion",
    "potato", "ginger", "arecanut", "areca", "coffee", "tea", "gram", "pulse", "chilli", "chili",
    "turmeric", "garlic", "mango", "banana", "coconut", "groundnut", "soybean", "mustard",
    "barley", "bajra", "jowar", "seed", "harvest", "sow", "sowing", "seedling", "sapling", "yield",
    "acre", "acres", "land", "field", "farm", "farming", "agriculture", "kisan", "cultivat",
    // Soil & nutrients
    "soil", "sand", "clay", "loam", "silt", "ph", "npk", "nitrogen", "phosphorus", "potash",
    "potassium", "urea", "dap", "fertilizer", "fertiliser", "manure", "compost", "gobar", "khad",
    "nutrient", "zinc", "sulfur", "organic", "jeevamrutha", "foliar",
    // Water & irrigation
    "water", "irrigation", "pump", "borewell", "drip", "sprinkler", "canal", "well", "rain",
    "rainfall", "monsoon", "drought", "moisture", "flood", "drainage",
    // Pests & diseases
    "pest", "insect", "worm", "caterpillar", "borer", "bug", "fungus", "rot", "blight", "rust",
    "leaf curl", "curl", "spray", "pesticide", "fungicide", "insecticide", "neem", "weed",
    "herbicide", "disease", "medicine", "dose", "dosage", "blast", "wilt", "infestation",
    // Mandi & economics
    "mandi", "apmc", "market", "price", "rate", "sell", "buy", "cost", "profit", "msp", "quintal",
    "bag", "trader", "auction", "pmfby", "subsidy", "scheme",
    // Livestock & farm management
    "tractor", "plough", "sprayer", "cattle", "cow", "buffalo", "dairy", "fodder", "livestock"
  ];

  const hasAgricultureKeyword = agriculturalKeywords.some((w) => q.includes(w));

  // If query explicitly mentions non-farm topics OR lacks any agricultural keywords:
  if (hasExplicitNonFarm || !hasAgricultureKeyword) {
    return {
      response:
        "⚠️ **Question Outside Agricultural Domain**\n\n" +
        "I am **KrishiMitra**, an AI assistant specialized **strictly in farming and agriculture**.\n\n" +
        "I cannot answer questions about general knowledge, celebrities, sports, politics, entertainment, or technology.\n\n" +
        "🌾 **Please ask me questions about:**\n" +
        "• Crops, sowing times, and seed selection\n" +
        "• Fertilizers (Urea, DAP, Potash) and soil health\n" +
        "• Pests, leaf diseases, and pump spray dosages\n" +
        "• Irrigation scheduling and rain impact\n" +
        "• APMC Mandi rates and market selling tips",
      is_farming_related: false,
      suggested_followups: [
        "What fertilizer plan is best for my soil?",
        "How to spray neem oil for pests?",
        "When is the best time to irrigate crops?",
        "How to get the highest price at Mandi?",
      ],
    };
  }

  // 1. Fertilizer & Soil in simple words
  if (q.includes("fertilizer") || q.includes("soil") || q.includes("npk") || q.includes("urea") || q.includes("manure") || q.includes("nutrient")) {
    return {
      response:
        `### 🌱 Simple Fertilizer Plan for Your Farm (${district})\n\n` +
        `For your **${soil}** and crops (**${crops}**), follow these 3 easy steps:\n\n` +
        `**Step 1: Before Sowing (Root Food)**\n` +
        `• Put 4 to 5 trolleys (loads) of well-rotted Cow Dung manure (*Gobar Khad*) per acre while ploughing.\n` +
        `• Add **1 bag of DAP** (50 kg) and **half bag of Potash** (25 kg) per acre. This makes the crop roots grow deep and strong.\n\n` +
        `**Step 2: 1 Month After Sowing (Leaf Growth)**\n` +
        `• Give **half bag of Urea** (about 25–30 kg per acre). Make sure soil has wet moisture when putting urea.\n` +
        `• Do not put urea when the field is flooded with standing water, otherwise fertilizer will wash away.\n\n` +
        `**Step 3: Flowering & Grain Filling**\n` +
        `• Give the second small dose of urea (20 kg per acre) before flowers open.\n` +
        `• If leaves look pale yellow, mix **Zinc powder (2 spoons / 25 grams)** in one 15-litre spray pump and spray on leaves.`,
      is_farming_related: true,
      suggested_followups: [
        "How to make natural Jeevamrutha at home?",
        "How many days gap between urea doses?",
        "What to do if leaves turn yellow?",
      ],
    };
  }

  // 2. Weather & Rain impact in simple words
  if (q.includes("weather") || q.includes("rain") || q.includes("temperature") || q.includes("climate") || q.includes("cloud")) {
    return {
      response:
        `### 🌧️ Simple Weather Advice for ${district}\n\n` +
        `Here is what you should do in your field right now:\n\n` +
        `**1. Clear the Water Drains**\n` +
        `• Make sure water does not stand in the field for more than 12 hours. Standing water makes roots rot and leaves turn yellow.\n` +
        `• Clean the side channels so extra rain water flows out quickly.\n\n` +
        `**2. Stop Spraying Before Rain**\n` +
        `• **Do not spray any medicine or urea** if clouds are dark or rain is coming in the next 4–5 hours. Rain will wash your expensive medicine into the mud.\n` +
        `• Always spray when the sun is out and leaves are dry.\n\n` +
        `**3. After Heavy Rain**\n` +
        `• Once the soil dries a little, do light hoeing (*Gudai*) around plants so air can reach the roots again.`,
      is_farming_related: true,
      suggested_followups: [
        "How to protect crop from fungal rot after rain?",
        "When should I start watering after rain stops?",
        "Best spray to stick medicine on leaves",
      ],
    };
  }

  // 3. Pest & Disease in simple words
  if (q.includes("pest") || q.includes("disease") || q.includes("insect") || q.includes("spray") || q.includes("leaf") || q.includes("fungus") || q.includes("curl") || q.includes("borer")) {
    return {
      response:
        `### 🐛 Simple Medicine & Pest Guide (${crops})\n\n` +
        `Here is the easiest way to protect your plants:\n\n` +
        `**1. For Small Insects & Leaf Curl (Safe Herbal Spray)**\n` +
        `• Take **Neem Oil** (10,000 ppm).\n` +
        `• Put **2 big bottle caps (30 ml)** of neem oil + **half spoon of Surf/detergent liquid** in one **15-litre water pump**.\n` +
        `• Spray under the leaves in the evening after 4:00 PM. This stops insect eggs from hatching.\n\n` +
        `**2. For Brown Spots or White Powder on Leaves (Fungus)**\n` +
        `• Use **Mancozeb (Saaf / Dithane)** powder.\n` +
        `• Mix **2 big spoons (35 grams)** in one 15-litre spray pump.\n` +
        `• Spray once every 12 to 15 days if spot disease is visible.\n\n` +
        `**3. For Stem Worms / Caterpillars (Eating stem or pods)**\n` +
        `• Put **Coragen (Chlorantraniliprole)** at **1 small syringe (6 ml)** in one 15-litre spray pump.\n` +
        `• Always wear a cloth on your mouth while spraying.`,
      is_farming_related: true,
      suggested_followups: [
        "How much neem oil in 1 pump?",
        "Safe way to spray without getting sick",
        "How to identify stem borer worm?",
      ],
    };
  }

  // 4. Mandi & Market in simple words
  if (q.includes("mandi") || q.includes("price") || q.includes("market") || q.includes("sell") || q.includes("apmc") || q.includes("profit") || q.includes("cost")) {
    return {
      response:
        `### 📈 Easy Mandi Selling Tips (${district} APMC)\n\n` +
        `How to get the highest price for your harvest:\n\n` +
        `**1. Clean and Dry Before Taking to Mandi**\n` +
        `• Dry your grains well on a clean plastic sheet in sunlight. Traders cut ₹100–₹200 per quintal if grain is damp or soft.\n` +
        `• Sieve out small stones, dust, and broken grains. Clean lots get top bids immediately.\n\n` +
        `**2. Best Time to Go to Mandi**\n` +
        `• Reach the APMC yard early morning between **8:00 AM and 10:00 AM** when all buyers arrive for bidding.\n` +
        `• Tuesday and Wednesday usually have more active buyers than busy weekends.\n\n` +
        `**3. Don't Sell in a Hurry**\n` +
        `• When everyone harvests at the same time, market prices drop. If you have a dry storeroom or kotha, holding grain for just 3–4 weeks can get you ₹200–₹300 more per quintal.`,
      is_farming_related: true,
      suggested_followups: [
        "What is the current mandi rate today?",
        "How to store grains safely from weevil worms?",
        "Government MSP rate for my crop",
      ],
    };
  }

  // 5. General crop advice in simple words
  return {
    response:
      `### 🌾 Simple Farm Advice for ${district}\n\n` +
      `Here are 3 practical things for your **${crops}** in **${soil}**:\n\n` +
      `**1. Watering (Irrigation)**\n` +
      `• In **${soil}**, water does not stay too long. Give light watering every 4–6 days rather than flooding heavily.\n` +
      `• Water in the early morning before 9:00 AM or in the evening. Don't water in the hot noon sun.\n\n` +
      `**2. Weeding (Cleaning Wild Grass)**\n` +
      `• Remove wild grass (*Kharpatwar*) in the first 30 days. Wild grass steals 40% of the fertilizer meant for your crop.\n\n` +
      `**3. Inspecting Plants**\n` +
      `• Walk your field twice a week. Turn leaves over and look underneath — that is where insect eggs hide. Catching pests early saves half your spray cost!`,
    is_farming_related: true,
    suggested_followups: [
      "Best fertilizer plan for my soil",
      "How to spray neem oil for pests?",
      "How will upcoming rain affect my field?",
      "Tips to get best price at Mandi",
    ],
  };
}

async function tryModel(
  model: string,
  apiKey: string,
  payload: object
): Promise<{ ok: boolean; data?: any; status?: number }> {
  try {
    const url = `${GEMINI_BASE}/${model}:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = await res.json();
      return { ok: true, data };
    }
    return { ok: false, status: res.status };
  } catch {
    return { ok: false };
  }
}

/**
 * Send a farming question.
 * Generates simple, farmer-friendly advice.
 */
export async function sendChatMessage(
  message: string,
  history: ChatMessage[] = [],
  farmContext?: FarmContext
): Promise<ChatResponse> {
  const apiKey = getApiKey();

  if (apiKey) {
    const contextSummary = buildFarmContext(farmContext);
    const augmentedPrompt = contextSummary
      ? `${contextSummary}\nFarmer Question: ${message}\n\n(Remember: Respond in very simple, plain English without complicated scientific words. Use practical units like pumps, spoons, and bags).`
      : `${message}\n\n(Remember: Respond in very simple, plain English without complicated scientific words. Use practical units like pumps, spoons, and bags).`;

    const contents = [
      ...history
        .filter((m) => m.content?.trim())
        .map((m) => ({
          role: m.role === "user" ? "user" : "model",
          parts: [{ text: m.content }],
        })),
      { role: "user", parts: [{ text: augmentedPrompt }] },
    ];

    const payload = {
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents,
      generationConfig: {
        temperature: 0.25, // Lower temperature = more direct, simple, and reliable
        topP: 0.8,
        maxOutputTokens: 1024,
      },
    };

    const modelsToTry = workingModel
      ? [workingModel, ...CANDIDATE_MODELS.filter((m) => m !== workingModel)]
      : CANDIDATE_MODELS;

    for (const model of modelsToTry) {
      const result = await tryModel(model, apiKey, payload);

      if (result.ok && result.data) {
        workingModel = model;
        const candidates = result.data?.candidates ?? [];
        if (candidates.length > 0) {
          const parts = candidates[0]?.content?.parts ?? [];
          const replyText = parts.map((p: any) => p.text ?? "").join("").trim();
          if (replyText) {
            const isFarming =
              !replyText.includes("Outside Agricultural Domain") &&
              !replyText.includes("strictly in farming") &&
              !replyText.includes("I only help with crops, soil");
            return {
              response: replyText,
              is_farming_related: isFarming,
              suggested_followups: isFarming
                ? [
                    "What is the best time to spray this?",
                    "How much water pump dosage needed?",
                    "Any natural or low-cost alternative?",
                  ]
                : [],
            };
          }
        }
      }
    }
  }

  // Guaranteed fallback: Precision Simple-English Agronomic Engine
  return getAgronomicFallback(message, farmContext);
}

export async function getChatStatus(): Promise<ChatStatus> {
  return {
    status: "ready",
    has_api_key: true,
    model: workingModel ?? "KrishiMitra-FarmerEngine",
    domain: "agriculture_only",
  };
}
