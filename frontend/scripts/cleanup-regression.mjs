import { selectExtras } from '../src/services/cleanup.js';
import { favoritesToJson, parseFavorites } from '../src/services/protection.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const ivs = (v) => ({ HP: v, Atk: v, Def: v, SpA: v, SpD: v, Spe: v });
const row = (key, species_id, iv, extra = {}) => ({ rosterKey: key, species_id, source: 'pc', level: 10, ivs: ivs(iv), ...extra });
const rows = [
  row('a', 25, 10), row('b', 25, 30), row('c', 25, 20), row('d', 25, 5),
  row('e', 1, 31),
  row('f', 4, 1), row('g', 4, 2, { source: 'party' }),
];
const none = () => false;
const sorted = (keys) => [...keys].sort();

assert(JSON.stringify(sorted(selectExtras(rows, 1, none))) === JSON.stringify(['a', 'c', 'd', 'f']),
  'keep 1 should leave the best Pikachu, the lone Bulbasaur and the party Charmander');
assert(JSON.stringify(sorted(selectExtras(rows, 2, none))) === JSON.stringify(['a', 'd']), 'keep 2 should drop the two worst Pikachu only');
assert(selectExtras(rows, 9, none).length === 0, 'keeping more than owned selects nothing');
assert(!selectExtras(rows, 1, none).includes('g'), 'party Pokemon are never selected');

// A protected copy stays and uses up a keep slot, so the best unprotected one becomes an extra too.
assert(JSON.stringify(sorted(selectExtras(rows, 1, (r) => r.rosterKey === 'd'))) === JSON.stringify(['a', 'b', 'c', 'f']),
  'a protected copy counts toward the keep limit');
assert(JSON.stringify(sorted(selectExtras(rows, 2, (r) => r.rosterKey === 'd'))) === JSON.stringify(['a', 'c']),
  'protected copies still leave room for the best of the rest');

const pids = parseFavorites(favoritesToJson(new Set([1, 4294967295, 7])));
assert(JSON.stringify(pids) === '[1,4294967295,7]', 'favorites round-trip through the file format');
for (const bad of ['not json', '{}', JSON.stringify({ format: 'puse-favorites-v1', pids: ['x'] }), JSON.stringify({ format: 'other', pids: [] })]) {
  let rejected = false;
  try { parseFavorites(bad); } catch (e) { rejected = e.message === 'Not a PUSE favorites file'; }
  assert(rejected, `parseFavorites should reject ${bad}`);
}
console.log('Cleanup regression checks passed.');
