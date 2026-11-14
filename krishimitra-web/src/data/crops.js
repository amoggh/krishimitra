// Crop knowledge base. The data lives in shared/crops.json so the Python API and the UI read the same file.
// Yields in quintals/acre at full water supply (fallback when the yield model has no data), prices INR/quintal, costs INR/acre.
import data from '../../shared/crops.json'

export const CROPS = data

export const CROP_BY_ID = Object.fromEntries(CROPS.map(c => [c.id, c]))

// Maps dataset crop labels to our ids, used to show "grown widely in your district" evidence.
export const DATASET_NAME_TO_ID = {
  'Finger Millet': 'ragi', Maize: 'maize', Groundnut: 'groundnut', Pulses: ['tur', 'chickpea', 'greengram'],
  Sorghum: 'jowar', Rice: 'paddy', Cotton: 'cotton', Onion: 'onion', Sugarcane: 'sugarcane',
}
