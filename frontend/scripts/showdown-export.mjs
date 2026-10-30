// Usage: node scripts/showdown-export.mjs <save file> > sets.txt
// Prints Showdown sets for the Party and every PC box, using the browser's local-mode readers.
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { collectAllPokemon } from '../src/services/allPokemon.js';
import { buildRoster, rosterShowdown } from '../src/services/rosterExport.js';
import { loadFile, getBuffer } from '../src/core/saveSession.js';
import { getParty } from '../src/core/party.js';
import { getPcBox, loadPcContext } from '../src/core/pc.js';
import { getSpeciesMap, getSpeciesFormMetaMap, getItemsList, getMovesList } from '../src/core/catalog.js';

const savePath = process.argv[2];
if (!savePath) {
    console.error('Usage: node scripts/showdown-export.mjs <save file>');
    process.exit(1);
}

// The catalog fetches /data/*.txt as in the browser; serve those from public/.
const publicDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public');
globalThis.fetch = async (url) => new Response(await fs.readFile(path.join(publicDir, String(url).replace(/^\//, ''))));

const bytes = await fs.readFile(savePath);
await loadFile({ name: path.basename(savePath), arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.length) });
const buffer = getBuffer();
const [speciesMap, speciesMeta, items, moves] = await Promise.all([getSpeciesMap(), getSpeciesFormMetaMap(), getItemsList(), getMovesList()]);
const context = loadPcContext(buffer);
const rows = await collectAllPokemon({
    getParty: async () => getParty(buffer, speciesMap, speciesMeta),
    loadPc: async () => {},
    getPcBox: async (box) => getPcBox(context, box, speciesMap, speciesMeta),
});
const roster = buildRoster(rows, rows.map((row) => row.rosterKey),
    new Map(items.map((item) => [item.id, item.name])), new Map(moves.map((move) => [move.id, move.name])));
process.stdout.write(rosterShowdown(roster));
console.error(`${roster.pokemon.length} Pokémon exported`);
