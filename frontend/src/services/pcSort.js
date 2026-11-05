import { SORTS } from './pokemonSort.js';

// Sorts one box in place by swapping through the normal move call, so it works in both runtimes.
// Pokemon pack into the first writable slots in sorted order. Returns the number of moves made.
export async function sortPcBox(client, box, sortKey) {
    const [mons, writable] = await Promise.all([client.getPcBox(box), client.getPcWritableSlots(box)]);
    const slots = (writable?.writable_slots || []).map(Number).sort((a, b) => a - b);
    const bySlot = new Map(mons.filter((m) => slots.includes(Number(m.slot))).map((m) => [Number(m.slot), m]));
    const order = [...bySlot.values()].sort(SORTS[sortKey].compare);
    let moves = 0;
    for (let i = 0; i < order.length; i += 1) {
        const target = slots[i];
        const from = [...bySlot].find(([, m]) => m === order[i])[0];
        if (from === target) continue;
        await client.movePc({ from_box: box, from_slot: from, to_box: box, to_slot: target, allow_swap: true });
        const displaced = bySlot.get(target);
        bySlot.delete(from);
        bySlot.set(target, order[i]);
        if (displaced) bySlot.set(from, displaced);
        moves += 1;
    }
    return moves;
}
