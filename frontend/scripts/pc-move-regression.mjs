import { movePcMon } from '../src/core/pc.js';

const MON_SIZE_PC = 58;
const SPECIES_OFFSET = 0x1C;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const species = (buf, box, slot) => {
  const off = (((box - 1) * 30) + (slot - 1)) * MON_SIZE_PC + SPECIES_OFFSET;
  return buf[off] | (buf[off + 1] << 8);
};
const put = (buf, box, slot, id) => {
  const base = (((box - 1) * 30) + (slot - 1)) * MON_SIZE_PC;
  buf.fill(id & 0xFF, base, base + MON_SIZE_PC); // tag every byte so we can check the whole record moved
  buf[base + SPECIES_OFFSET] = id & 0xFF;
  buf[base + SPECIES_OFFSET + 1] = 0;
};

const stream = new Uint8Array(2 * 30 * MON_SIZE_PC);
put(stream, 1, 1, 25);
put(stream, 2, 5, 150);
const context = {
  pcBuffer: stream, presetBuffer: null, sourceBuffer: stream,
  fallbackBoxStarts: {}, fallbackSlotOffsets: {}, absoluteEdits: new Map(), absoluteTouchedSectors: new Set(),
};

// Move into an empty slot in another box.
let res = movePcMon(context, { from_box: 1, from_slot: 1, to_box: 2, to_slot: 1 });
assert(!res.swapped && species(stream, 2, 1) === 25, 'move should place mon in target');
assert(stream.slice(0, MON_SIZE_PC).every((b) => b === 0), 'move should clear the source slot');
const base21 = 30 * MON_SIZE_PC;
assert(stream[base21] === 25 && stream[base21 + MON_SIZE_PC - 1] === 25, 'move should copy the full record');

// Swap with an occupied slot.
res = movePcMon(context, { from_box: 2, from_slot: 1, to_box: 2, to_slot: 5 });
assert(res.swapped && species(stream, 2, 5) === 25 && species(stream, 2, 1) === 150, 'occupied target should swap');

let noSwap = false;
try { movePcMon(context, { from_box: 2, from_slot: 1, to_box: 2, to_slot: 5, allow_swap: false }); } catch (e) { noSwap = e.message === 'Target slot is occupied'; }
assert(noSwap && species(stream, 2, 1) === 150, 'allow_swap:false should refuse an occupied target and change nothing');

let rejected = false;
try { movePcMon(context, { from_box: 1, from_slot: 1, to_box: 1, to_slot: 2 }); } catch (e) { rejected = e.message === 'Pokemon not found in PC'; }
assert(rejected, 'moving an empty slot should be rejected');
console.log('PC move regression checks passed.');
