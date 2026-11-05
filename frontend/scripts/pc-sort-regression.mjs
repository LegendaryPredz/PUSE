import { sortPcBox } from '../src/services/pcSort.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

// Fake client: slots 1-10 writable, slot 4 holds a Pokemon that must not take part (not writable).
const mon = (species_id, level, iv) => ({ species_id, level, ivs: { HP: iv, Atk: iv, Def: iv, SpA: iv, SpD: iv, Spe: iv } });
const slots = new Map([[2, mon(25, 5, 10)], [3, mon(1, 9, 31)], [6, mon(150, 70, 0)], [9, mon(25, 5, 31)]]);
let moves = 0;
const client = {
  getPcBox: async () => [...slots].map(([slot, m]) => ({ ...m, slot })),
  getPcWritableSlots: async () => ({ writable_slots: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] }),
  movePc: async ({ from_slot, to_slot }) => {
    moves += 1;
    const a = slots.get(from_slot);
    const b = slots.get(to_slot);
    slots.delete(from_slot);
    slots.set(to_slot, a);
    if (b) slots.set(from_slot, b);
  },
};

await sortPcBox(client, 1, 'species');
const order = [...slots].sort(([x], [y]) => x - y).map(([slot, m]) => [slot, m.species_id, m.ivs.HP]);
assert(JSON.stringify(order) === JSON.stringify([[1, 1, 31], [2, 25, 31], [3, 25, 10], [4, 150, 0]]),
  `species sort should pack to the front, best IVs first within a species: ${JSON.stringify(order)}`);

const before = moves;
await sortPcBox(client, 1, 'species');
assert(moves === before, 'sorting an already sorted box should make no moves');

await sortPcBox(client, 1, 'level');
assert(slots.get(1).species_id === 150, 'level sort should put the highest level first');
console.log('PC sort regression checks passed.');
