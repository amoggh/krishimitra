// District profiles (soil, pH, nutrients from the Karnataka soil dataset; rainfall normals) shared with the Python API.
import data from '../../shared/districts.json'

export const DISTRICTS = data
export const DISTRICT_NAMES = Object.keys(DISTRICTS).sort()
