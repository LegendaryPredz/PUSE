import { protectionReasons } from '../src/services/protection.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const ivs = (v) => ({ HP: v, Atk: v, Def: v, SpA: v, SpD: v, Spe: v });
const base = { pid: 1, species_id: 19, is_shiny: false, ivs: ivs(10), evs: { HP: 0, Atk: 0, Def: 0, SpA: 0, SpD: 0, Spe: 0 } };
const none = new Set();
const reasons = (pk, favorites = none, enabled = {}) => protectionReasons({ ...base, ...pk }, favorites, enabled);

assert(reasons({}).length === 0, 'plain Pokemon should be releasable');
assert(reasons({ is_shiny: true }).includes('Shiny'), 'shiny is protected');
assert(reasons({ ivs: ivs(31) }).some((r) => r.startsWith('Perfect')), 'all-31 IVs are protected');
assert(reasons({ ivs: { ...ivs(31), Spe: 30 } }).length === 0, 'five 31s is not perfect');
assert(reasons({ evs: { HP: 252, Atk: 0, Def: 0, SpA: 0, SpD: 0, Spe: 0 } }).some((r) => r.startsWith('EV')), 'EV trained is protected');
assert(reasons({ species_id: 150 }).includes('Legendary'), 'Mewtwo is legendary');
assert(reasons({ species_id: 151 }).includes('Mythical'), 'Mew is mythical');
assert(reasons({ species_id: 1010 }).includes('Ultra Beast'), 'forms resolve to their base dex number (Nihilego)');
assert(reasons({ species_id: 147 }).includes('Pseudo-legendary line'), 'Dratini is in a pseudo line');
assert(reasons({ pid: 5 }, new Set([5])).includes('Favorite'), 'favorites are protected');
assert(reasons({ pid: 5, species_id: 150, is_shiny: true }, none, { legendary: false, shiny: false }).length === 0, 'rule toggles switch protections off');
assert(reasons({ pid: 5 }, new Set([5]), { shiny: false, legendary: false }).includes('Favorite'), 'favorites ignore rule toggles');
console.log('Protection regression checks passed.');
