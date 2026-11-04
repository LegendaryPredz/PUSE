// Moves many PC Pokemon into free slots, box by box.
// sources: [{ box, slot }] in the order they should be placed.
// destinations: [{ box, startSlot }] in fill order (first box from the clicked slot, overflow boxes from 1).
// Pokemon already sitting in the box being filled stay where they are.
export async function bulkMovePc(client, sources, destinations) {
    let queue = sources.map((s) => ({ box: Number(s.box), slot: Number(s.slot) }));
    let moved = 0;
    let lastError = null;

    for (const { box, startSlot = 1 } of destinations) {
        queue = queue.filter((s) => s.box !== Number(box));
        if (!queue.length) break;

        const [mons, writable] = await Promise.all([client.getPcBox(box), client.getPcWritableSlots(box)]);
        const occupied = new Set((mons || []).map((m) => Number(m.slot)));
        const free = (writable?.writable_slots || [])
            .map(Number)
            .filter((slot) => slot >= startSlot && !occupied.has(slot))
            .sort((a, b) => a - b);

        for (const slot of free) {
            if (!queue.length) break;
            const src = queue[0];
            try {
                await client.movePc({ from_box: src.box, from_slot: src.slot, to_box: Number(box), to_slot: slot, allow_swap: false });
                queue.shift();
                moved += 1;
            } catch (err) {
                // Slot looked free but isn't (e.g. an unrecognised record); try the next one.
                lastError = err;
            }
        }
    }

    return { moved, remaining: queue.length, lastError };
}
