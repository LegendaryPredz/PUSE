import { releasePcMon, restorePcMon } from '../src/core/pc.js';

const MON_SIZE_PC = 58;
const SPECIES_OFFSET = 0x1C;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const stream = new Uint8Array(30 * MON_SIZE_PC);
stream.fill(7, 0, MON_SIZE_PC); // tag every byte so we can check the whole record comes back
stream[SPECIES_OFFSET] = 25;
stream[SPECIES_OFFSET + 1] = 0;
stream.fill(0, 0x20, 0x24);
stream[0x20] = 1; // EXP within the valid range, so the record counts as a valid Pokemon
const original = stream.slice(0, MON_SIZE_PC);
const context = {
  pcBuffer: stream, presetBuffer: null, sourceBuffer: stream,
  fallbackBoxStarts: {}, fallbackSlotOffsets: {}, absoluteEdits: new Map(), absoluteTouchedSectors: new Set(),
};

const { raw } = releasePcMon(context, { box: 1, slot: 1 });
assert(stream.slice(0, MON_SIZE_PC).every((b) => b === 0), 'release should clear the slot');
assert(typeof raw === 'string' && raw.length === MON_SIZE_PC * 2, 'release should return the record as hex');

restorePcMon(context, { box: 1, slot: 1, raw });
assert(stream.slice(0, MON_SIZE_PC).every((b, i) => b === original[i]), 'restore should bring back the exact record');

const throwsWith = (fn, message) => { try { fn(); } catch (e) { return e.message === message; } return false; };
assert(throwsWith(() => restorePcMon(context, { box: 1, slot: 1, raw }), 'Target slot is occupied'), 'restore must not overwrite an occupied slot');
assert(throwsWith(() => restorePcMon(context, { box: 1, slot: 2, raw: 'zz' }), 'Invalid Pokemon record'), 'restore should reject malformed records');
assert(throwsWith(() => restorePcMon(context, { box: 1, slot: 2, raw: '00'.repeat(MON_SIZE_PC) }), 'Invalid Pokemon record'), 'restore should reject empty records');
console.log('PC restore regression checks passed.');
