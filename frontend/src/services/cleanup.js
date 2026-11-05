import { ivTotal } from './pokemonSort.js';

// Returns the rosterKeys of PC Pokemon beyond the best `keep` copies of each species (by IV total).
// Party and protected Pokemon always stay and count toward `keep`, so they are never returned.
export function selectExtras(rows, keep, isProtected) {
    const groups = new Map();
    for (const row of rows) groups.set(row.species_id, [...(groups.get(row.species_id) || []), row]);
    const extras = [];
    for (const group of groups.values()) {
        const forced = group.filter((row) => row.source === 'party' || isProtected(row));
        const free = group.filter((row) => !forced.includes(row))
            .sort((a, b) => ivTotal(b) - ivTotal(a) || b.level - a.level);
        extras.push(...free.slice(Math.max(0, keep - forced.length)).map((row) => row.rosterKey));
    }
    return extras;
}
