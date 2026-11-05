import { dexIdForSpeciesId } from '../core/pokedexCatalog.js';

const range = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

// National dex numbers (Unbound goes up to #809). Forms resolve to their base dex number.
const LEGENDARY = new Set([144, 145, 146, 150, 243, 244, 245, 249, 250, ...range(377, 384), ...range(480, 488),
    ...range(638, 646), 716, 717, 718, 772, 773, ...range(785, 792), 800]);
const MYTHICAL = new Set([151, 251, 385, 386, ...range(489, 494), 647, 648, 649, 719, 720, 721, 801, 802, 807, 808, 809]);
const ULTRA_BEAST = new Set([...range(793, 799), ...range(803, 806)]);
// Whole lines, so the baby and middle stages are protected too.
const PSEUDO = new Set([...range(147, 149), ...range(246, 248), ...range(371, 376), ...range(443, 445),
    ...range(633, 635), ...range(704, 706), ...range(782, 784)]);

const EV_TRAINED_TOTAL = 252;
const sum = (obj) => Object.values(obj || {}).reduce((total, v) => total + (Number(v) || 0), 0);
const inSet = (set) => (pk) => set.has(dexIdForSpeciesId(pk.species_id));

export const PROTECTION_RULES = [
    { key: 'shiny', label: 'Shiny', test: (pk) => Boolean(pk.is_shiny) },
    { key: 'perfectIvs', label: 'Perfect IVs (all 31)', test: (pk) => Object.values(pk.ivs || {}).length === 6 && Object.values(pk.ivs).every((v) => Number(v) === 31) },
    { key: 'evTrained', label: `EV trained (${EV_TRAINED_TOTAL}+ total)`, test: (pk) => sum(pk.evs) >= EV_TRAINED_TOTAL },
    { key: 'legendary', label: 'Legendary', test: inSet(LEGENDARY) },
    { key: 'mythical', label: 'Mythical', test: inSet(MYTHICAL) },
    { key: 'ultraBeast', label: 'Ultra Beast', test: inSet(ULTRA_BEAST) },
    { key: 'pseudo', label: 'Pseudo-legendary line', test: inSet(PSEUDO) },
];

// Favorites are keyed by PID, so editing a Pokemon's PID (nature/gender/shiny) drops its favorite.
// Favorites always protect; rule protections apply unless switched off in `enabled`.
export function protectionReasons(pk, favorites, enabled) {
    const reasons = favorites.has(pk.pid) ? ['Favorite'] : [];
    for (const rule of PROTECTION_RULES) {
        if (enabled[rule.key] !== false && rule.test(pk)) reasons.push(rule.label);
    }
    return reasons;
}

export function loadStored(key, fallback) {
    try {
        return JSON.parse(window.localStorage.getItem(key)) ?? fallback;
    } catch {
        return fallback;
    }
}

export function saveStored(key, value) {
    try {
        window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
        // Storage can be blocked; the setting just won't persist.
    }
}

const FAVORITES_FORMAT = 'puse-favorites-v1';

export const favoritesToJson = (favorites) => JSON.stringify({ format: FAVORITES_FORMAT, pids: [...favorites] }, null, 2);

export function parseFavorites(text) {
    let data = null;
    try {
        data = JSON.parse(text);
    } catch {
        // falls through to the format error below
    }
    if (data?.format !== FAVORITES_FORMAT || !Array.isArray(data.pids) || !data.pids.every(Number.isInteger)) {
        throw new Error('Not a PUSE favorites file');
    }
    return data.pids;
}
