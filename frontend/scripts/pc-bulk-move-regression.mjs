import { bulkMovePc } from '../src/services/pcBulkMove.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

// Fake client over a { box: { slot: name } } map; box 3 slot 2 holds a record the box list can't see.
function fakeClient(boxes, hidden = {}) {
  return {
    async getPcBox(box) { return Object.keys(boxes[box] || {}).map((slot) => ({ slot: Number(slot) })); },
    async getPcWritableSlots(box) { return { writable_slots: Array.from({ length: 30 }, (_, i) => i + 1) }; },
    async movePc({ from_box, from_slot, to_box, to_slot, allow_swap }) {
      if (boxes[to_box]?.[to_slot] || hidden[to_box]?.[to_slot]) {
        if (allow_swap === false) throw new Error('Target slot is occupied');
      }
      const mon = boxes[from_box][from_slot];
      delete boxes[from_box][from_slot];
      (boxes[to_box] ||= {})[to_slot] = mon;
    },
  };
}

const full = (prefix) => Object.fromEntries(Array.from({ length: 30 }, (_, i) => [i + 1, `${prefix}${i + 1}`]));

// Box 2 has 28 of 30 taken; moving 5 from box 1 should fill 2 there and overflow 3 into box 3.
const box2 = full('b'); delete box2[10]; delete box2[30];
const boxes = { 1: { 1: 'a', 2: 'b', 3: 'c', 4: 'd', 5: 'e' }, 2: box2, 3: {}, 4: {} };
const client = fakeClient(boxes, { 3: { 2: true } });
const sources = [1, 2, 3, 4, 5].map((slot) => ({ box: 1, slot }));
const res = await bulkMovePc(client, sources, [{ box: 2, startSlot: 1 }, { box: 3, startSlot: 1 }, { box: 4, startSlot: 1 }]);
assert(res.moved === 5 && res.remaining === 0, `expected all 5 moved, got ${JSON.stringify(res)}`);
assert(boxes[2][10] === 'a' && boxes[2][30] === 'b', 'free slots in the target box fill first, in order');
assert(boxes[3][1] === 'c' && boxes[3][3] === 'd' && boxes[3][4] === 'e', 'overflow goes to the next box and skips hidden-occupied slots');
assert(Object.keys(boxes[1]).length === 0, 'sources should be emptied');

// Start slot is respected, and mons already in the target box stay put.
const boxes2 = { 1: { 5: 'x' }, 2: { 1: 'y' } };
const res2 = await bulkMovePc(fakeClient(boxes2), [{ box: 1, slot: 5 }, { box: 2, slot: 1 }], [{ box: 2, startSlot: 20 }]);
assert(res2.moved === 1 && boxes2[2][20] === 'x' && boxes2[2][1] === 'y', 'start slot respected; in-box mon not moved');

// Not enough room reports the leftovers.
const boxes3 = { 1: { 1: 'p', 2: 'q' }, 2: (() => { const b = full('z'); delete b[30]; return b; })() };
const res3 = await bulkMovePc(fakeClient(boxes3), [{ box: 1, slot: 1 }, { box: 1, slot: 2 }], [{ box: 2, startSlot: 1 }]);
assert(res3.moved === 1 && res3.remaining === 1 && boxes3[1][2] === 'q', 'overflow beyond the last box is reported, not lost');

console.log('PC bulk move regression checks passed.');
