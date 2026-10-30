import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildRoster, rosterMarkdown, rosterShowdown } from '../src/services/rosterExport.js';

const base = {
    species_id: 25, species_label: 'Pikachu', nickname: 'Sparky', level: 42,
    nature_id: 13, nature: 'Jolly', is_shiny: true, gender: 'Male',
    effective_ability_id: 9, ability_name_current: 'Static', current_ability_index: 0,
    item_id: 1, ivs: { HP: 31, Atk: 30, Def: 29, SpA: 28, SpD: 27, Spd: 26 },
    evs: { HP: 0, Atk: 252, Def: 0, SpA: 0, SpD: 4, Spd: 252 },
    moves: [33, 0, 85], move_pp: [35, 0, 15], move_pp_ups: [0, 0, 3], move_pp_max: [35, 0, 24],
};
const rows = [
    { ...base, source: 'party', rosterKey: 'party:0', partyIndex: 0 },
    { ...base, nature: undefined, source: 'pc', rosterKey: 'pc:1:1', box: 1, slot: 1, nickname: 'Pipe|Mouse' },
    { ...base, nature_id: 0, nature: undefined, source: 'pc', rosterKey: 'pc:26:30', box: 26, slot: 30, nickname: 'Preset' },
    { ...base, source: 'pc', rosterKey: 'pc:1:2', box: 1, slot: 2, nickname: 'Not selected' },
    { ...base, source: 'pc', rosterKey: 'pc:1:31', box: 1, slot: 31 },
    { ...base, source: 'party', rosterKey: 'party:1', partyIndex: 1, species_id: 0 },
];
const selected = ['pc:1:1', 'pc:26:30', 'pc:1:31'];
const itemNames = new Map([[1, 'Master Ball']]);
const moveNames = new Map([[33, 'Tackle'], [85, 'Thunderbolt']]);
const roster = buildRoster(rows, selected, itemNames, moveNames);
assert.equal(roster.format, 'puse.roster');
assert.equal(roster.version, 1);
assert.equal(roster.pokemon.length, 3);
assert.deepEqual(roster.pokemon.map((mon) => mon.location), [
    { source: 'party', index: 0 }, { source: 'pc', box: 1, slot: 1 }, { source: 'pc', box: 26, slot: 30 },
]);
assert.equal(roster.pokemon[0].ivs.Spe, 26);
assert.equal(roster.pokemon[0].moves.length, 2);
assert.equal(roster.pokemon[0].moves[1].pp_max, 24);
assert.equal(roster.pokemon[0].held_item.name, 'Master Ball');
assert.deepEqual(roster.pokemon.map((mon) => mon.nature), [
    { id: 13, name: 'Jolly' }, { id: 13, name: 'Jolly' }, { id: 0, name: 'Hardy' },
]);
const markdown = rosterMarkdown(roster);
assert.match(markdown, /Pipe\\\|Mouse/);
assert.match(markdown, /Preset · 30/);
assert.match(markdown, /\| Box 1 · 1 \|[^\n]*\| Jolly \|/);
assert.match(markdown, /\| Preset · 30 \|[^\n]*\| Hardy \|/);
assert.equal((markdown.match(/\| Party 1 \|/g) || []).length, 1);
assert.equal(buildRoster(rows, [], itemNames, moveNames).pokemon.length, 1);
assert.deepEqual(rows[0].ivs, base.ivs, 'export mutated source row');

const showdown = rosterShowdown(roster);
assert.equal(showdown.split('\n\n')[0], [
    'Pikachu (M) @ Master Ball', 'Ability: Static', 'Level: 42', 'Shiny: Yes',
    'EVs: 252 Atk / 4 SpD / 252 Spe', 'Jolly Nature', 'IVs: 30 Atk / 29 Def / 28 SpA / 27 SpD / 26 Spe',
    '- Tackle', '- Thunderbolt',
].join('\n'));
assert.equal(showdown.split('\n\n').length, 3);
const perfect = { HP: 31, Atk: 31, Def: 31, SpA: 31, SpD: 31, Spe: 31 };
const renamed = rosterShowdown({ pokemon: [
    { ...roster.pokemon[0], species: { id: 1022, name: 'Raichu (Alolan)' }, gender: 'Unknown', shiny: false,
        held_item: { id: 9, name: 'Heavy Boots' }, ability: { name: 'Neutralize Gas' }, ivs: perfect,
        evs: { HP: 0, Atk: 0, Def: 0, SpA: 0, SpD: 0, Spe: 0 },
        moves: [{ name: 'Hidden Power' }, { name: 'HiHorsepower' }, { name: 'Leech Fang' }] },
    { ...roster.pokemon[0], species: { id: 29, name: 'Nidoran?' }, held_item: { id: 0, name: 'None' } },
] });
assert.equal(renamed.split('\n\n')[0], [
    'Raichu-Alola @ Heavy-Duty Boots', 'Ability: Neutralizing Gas', 'Level: 42', 'Jolly Nature',
    '- Hidden Power Dark', '- High Horsepower', '- Leech Fang',
].join('\n'));
assert.match(renamed.split('\n\n')[1], /^Nidoran-F \(M\)\n/);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'puse-roster-'));
const fixture = path.join(tmp, 'fixture.json');
fs.writeFileSync(fixture, JSON.stringify({
    rows, selected, items: Object.fromEntries(itemNames), moves: Object.fromEntries(moveNames),
}));
const python = spawnSync('python3', ['-c', `import json,sys
from modules.roster_export import build_roster,roster_markdown
p=json.load(open(sys.argv[1],encoding='utf-8'))
item_names={int(k):v for k,v in p['items'].items()}
move_names={int(k):v for k,v in p['moves'].items()}
r=build_roster(p['rows'],p['selected'],item_names,move_names)
json.dump({'roster':r,'markdown':roster_markdown(r)},sys.stdout,ensure_ascii=False)`, fixture], {
    cwd: '../backend', encoding: 'utf8', timeout: 10000,
});
fs.rmSync(tmp, { recursive: true, force: true });
assert.equal(python.status, 0, python.stderr);
const canonical = JSON.parse(python.stdout);
assert.deepEqual(roster, canonical.roster);
assert.equal(markdown, canonical.markdown);
console.log('[PASS] Focused roster JSON and Markdown match canonical Python; selection and source rows are safe');
