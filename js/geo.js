// Cascading country -> region -> city data for the wedding location picker.
// Romania (and most countries) get their real subdivisions from countriesnow.space.
// France is special-cased to the official geo.api.gouv.fr API because countriesnow's
// "states" level for France is the 18 régions, not the ~96 départements people expect.

const COUNTRIES_API = 'https://countriesnow.space/api/v0.1/countries/positions';
const STATES_API = (country) => `https://countriesnow.space/api/v0.1/countries/states/q?country=${encodeURIComponent(country)}`;
const CITIES_API = (country, state) => `https://countriesnow.space/api/v0.1/countries/state/cities/q?country=${encodeURIComponent(country)}&state=${encodeURIComponent(state)}`;
const FR_DEPARTEMENTS_API = 'https://geo.api.gouv.fr/departements?fields=nom,code';
const FR_COMMUNES_API = (code) => `https://geo.api.gouv.fr/departements/${encodeURIComponent(code)}/communes?fields=nom`;

let countriesCache = null;
const regionsCache = new Map();
const citiesCache = new Map();

function byName(a, b) {
  return a.name.localeCompare(b.name);
}

export async function getCountries() {
  if (countriesCache) return countriesCache;
  try {
    const res = await fetch(COUNTRIES_API);
    const json = await res.json();
    countriesCache = (json.data || []).map((c) => ({ name: c.name })).sort(byName);
  } catch (err) {
    console.warn('getCountries failed', err);
    countriesCache = null;
    return [];
  }
  return countriesCache;
}

export async function getRegions(country) {
  if (regionsCache.has(country)) return regionsCache.get(country);
  let regions = [];
  try {
    if (country === 'France') {
      const res = await fetch(FR_DEPARTEMENTS_API);
      const data = await res.json();
      regions = data.map((d) => ({ name: d.nom, code: d.code })).sort(byName);
    } else {
      const res = await fetch(STATES_API(country));
      const json = await res.json();
      regions = (json.data?.states || []).map((s) => ({ name: s.name })).sort(byName);
    }
  } catch (err) {
    console.warn('getRegions failed', err);
    return [];
  }
  regionsCache.set(country, regions);
  return regions;
}

export async function getCities(country, region) {
  const cacheKey = `${country}|${region.name}`;
  if (citiesCache.has(cacheKey)) return citiesCache.get(cacheKey);
  let cities = [];
  try {
    if (country === 'France') {
      const res = await fetch(FR_COMMUNES_API(region.code));
      const data = await res.json();
      cities = data.map((c) => ({ name: c.nom })).sort(byName);
    } else {
      const res = await fetch(CITIES_API(country, region.name));
      const json = await res.json();
      cities = (json.data || []).map((name) => ({ name })).sort(byName);
    }
  } catch (err) {
    console.warn('getCities failed', err);
    return [];
  }
  citiesCache.set(cacheKey, cities);
  return cities;
}
