// The latest plan summary, shared with the assistant so it can answer about the user's own farm.
let ctx = {}
export const setPlanContext = (c) => { ctx = c || {} }
export const getPlanContext = () => ctx

export function summarisePlan(inp, season, opt) {
  return {
    plan: {
      district: inp.district, acres: inp.acres, season, source: inp.source, experience: inp.experience, budget: inp.budget,
      crops: opt.crops.map(c => ({ id: c.crop.id, name: c.crop.name, acres: c.acres, yield: +(c.yieldQtl / c.acres).toFixed(1), price: Math.round(c.price.expected), priceSource: c.price.label })),
    },
  }
}
