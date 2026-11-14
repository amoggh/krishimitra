// Mandi board. LIVE_ROWS are real Karnataka APMC arrivals copied from the bundled AGMARKNET extract ("mandi prices data.csv").
// Reference rows for the crops our planner recommends use indicative Karnataka modal prices (INR/quintal) with a
// 12-month seasonal shape; they are labelled INDICATIVE in the UI.
export const SNAPSHOT_DATE = '06 Sep 2026'

export const LIVE_ROWS = [
  { name: 'Groundnut', market: 'Kustagi APMC', district: 'Koppal', min: 7900, max: 7900, modal: 7900, crop: 'groundnut' },
  { name: 'Sunflower seed', market: 'Kustagi APMC', district: 'Koppal', min: 7500, max: 8100, modal: 7851, crop: 'sunflower' },
  { name: 'Bengal gram', market: 'Kustagi APMC', district: 'Koppal', min: 6300, max: 6300, modal: 6300, crop: 'chickpea' },
  { name: 'Green gram (moong)', market: 'Ramdurga APMC', district: 'Belagavi', min: 6790, max: 6920, modal: 6880, crop: 'greengram' },
  { name: 'Jowar', market: 'Ramdurga APMC', district: 'Belagavi', min: 4000, max: 4000, modal: 4000, crop: 'jowar' },
  { name: 'Maize', market: 'Ramdurga APMC', district: 'Belagavi', min: 2500, max: 2700, modal: 2600, crop: 'maize' },
  { name: 'Bajra', market: 'Kustagi APMC', district: 'Koppal', min: 2350, max: 2600, modal: 2483 },
  { name: 'Onion', market: 'Hospet APMC', district: 'Vijayanagara', min: 3000, max: 4500, modal: 3800, crop: 'onion' },
  { name: 'Tomato', market: 'Ramanagara APMC', district: 'Bengaluru South', min: 1200, max: 2000, modal: 1500, crop: 'tomato' },
  { name: 'Tomato', market: 'Hospet APMC', district: 'Vijayanagara', min: 800, max: 1000, modal: 800, crop: 'tomato' },
  { name: 'Potato', market: 'Hospet APMC', district: 'Vijayanagara', min: 1200, max: 1600, modal: 1400 },
  { name: 'Cabbage', market: 'Hospet APMC', district: 'Vijayanagara', min: 1200, max: 1400, modal: 1400 },
  { name: 'Cauliflower', market: 'Ramanagara APMC', district: 'Bengaluru South', min: 2000, max: 3000, modal: 2400 },
  { name: 'Carrot', market: 'Ramanagara APMC', district: 'Bengaluru South', min: 4000, max: 5600, modal: 5000 },
  { name: 'Beans', market: 'Ramanagara APMC', district: 'Bengaluru South', min: 4000, max: 6000, modal: 5000 },
  { name: 'Green chilli', market: 'Ramanagara APMC', district: 'Bengaluru South', min: 3000, max: 5000, modal: 4000 },
  { name: 'Ginger (green)', market: 'Ramanagara APMC', district: 'Bengaluru South', min: 5000, max: 12500, modal: 8000 },
  { name: 'Brinjal', market: 'Hospet APMC', district: 'Vijayanagara', min: 3000, max: 3000, modal: 3000 },
]

// monthly seasonal index (Jan..Dec) around the yearly mean; harvest-glut months are cheap.
export const SEASON_SHAPE = {
  ragi:      [1.02, 1.04, 1.06, 1.08, 1.10, 1.08, 1.04, 1.00, 0.96, 0.92, 0.88, 0.94],
  maize:     [0.96, 0.98, 1.00, 1.04, 1.08, 1.10, 1.08, 1.04, 0.98, 0.94, 0.92, 0.94],
  groundnut: [1.04, 1.06, 1.08, 1.06, 1.02, 0.98, 0.96, 0.96, 0.98, 0.96, 1.00, 1.02],
  tur:       [0.92, 0.92, 0.96, 1.00, 1.06, 1.10, 1.12, 1.08, 1.04, 0.98, 0.94, 0.92],
  chickpea:  [0.94, 0.92, 0.94, 0.98, 1.04, 1.08, 1.10, 1.08, 1.04, 1.00, 0.98, 0.96],
  jowar:     [0.96, 0.96, 0.98, 1.02, 1.06, 1.08, 1.08, 1.06, 1.02, 1.00, 0.96, 0.96],
  paddy:     [1.00, 1.01, 1.02, 1.03, 1.04, 1.03, 1.02, 1.00, 0.97, 0.95, 0.96, 0.98],
  cotton:    [1.02, 1.04, 1.06, 1.06, 1.04, 1.02, 1.00, 0.98, 0.96, 0.94, 0.94, 0.98],
  onion:     [0.70, 0.62, 0.72, 0.92, 1.10, 1.28, 1.40, 1.35, 1.12, 0.96, 0.88, 0.80],
  tomato:    [0.70, 0.60, 0.70, 0.90, 1.20, 1.50, 1.45, 1.25, 1.00, 0.90, 0.80, 0.75],
  sunflower: [0.98, 1.00, 1.02, 1.04, 1.04, 1.02, 1.00, 0.98, 0.98, 0.98, 1.00, 1.00],
  greengram: [0.98, 1.00, 1.02, 1.04, 1.06, 1.06, 1.04, 1.02, 0.96, 0.94, 0.94, 0.96],
  sugarcane: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  turmeric:  [1.06, 1.08, 1.10, 1.08, 1.06, 1.02, 0.98, 0.96, 0.94, 0.94, 0.96, 1.02],
}

// MSP in force when the 06/09/2026 snapshot was recorded: kharif crops KMS 2025-26, gram RMS 2026-27.
export const MSP_AT_SNAPSHOT = { paddy: 2369, jowar: 3699, ragi: 4886, maize: 2400, tur: 8000, greengram: 8768, groundnut: 7263, sunflower: 7721, cotton: 7710, chickpea: 5875 }
