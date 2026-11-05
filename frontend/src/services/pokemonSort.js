import { dexIdForSpeciesId } from '../core/pokedexCatalog.js';

export const ivTotal = (pk) => Object.values(pk.ivs || {}).reduce((total, v) => total + (Number(v) || 0), 0);
const dex = (pk) => dexIdForSpeciesId(pk.species_id) ?? 9999;

// Each compare is a stable tie-break chain; species puts the best IV spread first within a species.
export const SORTS = {
    species: { label: 'Dex number', compare: (a, b) => dex(a) - dex(b) || a.species_id - b.species_id || ivTotal(b) - ivTotal(a) },
    level: { label: 'Level (high first)', compare: (a, b) => b.level - a.level || dex(a) - dex(b) },
    ivHigh: { label: 'IV total (high first)', compare: (a, b) => ivTotal(b) - ivTotal(a) || dex(a) - dex(b) },
    ivLow: { label: 'IV total (low first)', compare: (a, b) => ivTotal(a) - ivTotal(b) || dex(a) - dex(b) },
};
