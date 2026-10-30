// Read-only projection; the backend implementation in modules/roster_export.py is canonical.
import { NATURES } from '../core/showdownImport.js';
import SHOWDOWN_NAMES from '../core/showdownNames.json' with { type: 'json' };

export const ROSTER_FORMAT = 'puse.roster';
export const ROSTER_VERSION = 1;
const STATS = ['HP', 'Atk', 'Def', 'SpA', 'SpD', 'Spe'];

function stats(values = {}) {
    return Object.fromEntries(STATS.map((key) => [key, Number(values?.[key] ?? (key === 'Spe' ? values?.Spd : 0) ?? 0)]));
}

export function buildRoster(rows, selectedPcKeys, itemNames = new Map(), moveNames = new Map()) {
    const selected = new Set(selectedPcKeys);
    const pokemon = [];
    for (const row of rows) {
        if (Number(row.species_id) <= 0) continue;
        let location;
        if (row.source === 'party') {
            location = { source: 'party', index: Number(row.partyIndex) };
        } else if (row.source === 'pc') {
            if (Number(row.slot) < 1 || Number(row.slot) > 30 || !selected.has(row.rosterKey)) continue;
            location = { source: 'pc', box: Number(row.box), slot: Number(row.slot) };
        } else continue;
        const speciesId = Number(row.species_id);
        const itemId = Number(row.item_id) || 0;
        const natureId = Number(row.nature_id) || 0;
        pokemon.push({
            location,
            species: { id: speciesId, name: row.species_label || row.species_name || `Species #${speciesId}` },
            nickname: row.nickname || '',
            level: Number(row.level) || 0,
            nature: { id: natureId, name: row.nature || NATURES[natureId] || 'Unknown' },
            shiny: Boolean(row.is_shiny),
            gender: row.gender || 'Unknown',
            ability: { id: Number(row.effective_ability_id) || 0, name: row.ability_name_current || row.effective_ability_name || '', slot: Number(row.current_ability_index) || 0 },
            held_item: { id: itemId, name: itemId ? (itemNames.get(itemId) || `Item #${itemId}`) : 'None' },
            ivs: stats(row.ivs),
            evs: stats(row.evs),
            moves: (row.moves || []).flatMap((id, index) => Number(id) > 0 ? [{
                id: Number(id), name: moveNames.get(Number(id)) || `Move #${id}`,
                pp: Number(row.move_pp?.[index]) || 0,
                pp_ups: Number(row.move_pp_ups?.[index]) || 0,
                pp_max: Number(row.move_pp_max?.[index]) || 0,
            }] : []),
        });
    }
    return { format: ROSTER_FORMAT, version: ROSTER_VERSION, game: 'Pokemon Unbound 2.1.1.1', pokemon };
}

function cell(value) {
    return String(value).replaceAll('|', '\\|').replaceAll('\n', ' ').replaceAll('\r', ' ');
}

function place(location) {
    if (location.source === 'party') return `Party ${location.index + 1}`;
    return `${location.box === 26 ? 'Preset' : `Box ${location.box}`} · ${location.slot}`;
}

export function rosterMarkdown(roster) {
    const lines = ['# PUSE roster', '', `Pokemon Unbound 2.1.1.1 · ${roster.pokemon.length} Pokémon`, '',
        '| Location | Pokémon | Level | Nature | Ability | Held item | Shiny |',
        '| --- | --- | ---: | --- | --- | --- | --- |'];
    for (const mon of roster.pokemon) {
        let name = mon.nickname || mon.species.name;
        if (name !== mon.species.name) name += ` (${mon.species.name})`;
        lines.push(`| ${[place(mon.location), name, mon.level, mon.nature.name, mon.ability.name, mon.held_item.name, mon.shiny ? 'Yes' : 'No'].map(cell).join(' | ')} |`);
    }
    lines.push('');
    for (const mon of roster.pokemon) {
        lines.push(`## ${mon.nickname || mon.species.name} — ${place(mon.location)}`, '',
            `Species: ${mon.species.name} (#${mon.species.id}) · Gender: ${mon.gender}`, '',
            `IVs: ${STATS.map((key) => `${key} ${mon.ivs[key]}`).join(', ')}`, '',
            `EVs: ${STATS.map((key) => `${key} ${mon.evs[key]}`).join(', ')}`, '',
            `Moves: ${mon.moves.map((move) => move.name).join(', ') || 'None'}`, '');
    }
    return `${lines.join('\n').trimEnd()}\n`;
}

// Showdown suffix per PUSE form alias; unlisted (cosmetic or unidentified) forms export as the base species.
const FORM_SUFFIX = {
    Mega: 'Mega', 'Mega X': 'Mega-X', 'Mega Y': 'Mega-Y', Primal: 'Primal', Gigantamax: 'Gmax',
    Alolan: 'Alola', Galarian: 'Galar', Hisuian: 'Hisui',
    'Therian Forme': 'Therian', 'Origin Forme': 'Origin', 'Sky Forme': 'Sky', 'Blade Forme': 'Blade',
    'Attack Forme': 'Attack', 'Defense Forme': 'Defense', 'Speed Forme': 'Speed',
    'Heat Form': 'Heat', 'Wash Form': 'Wash', 'Frost Form': 'Frost', 'Fan Form': 'Fan', 'Mow Form': 'Mow',
    'Zen Mode': 'Zen', 'Galarian Zen Mode': 'Galar-Zen', 'Galarian Standard Mode': 'Galar',
    'School Form': 'School', 'Hangry Mode': 'Hangry', 'Low Key Form': 'Low-Key', 'Noice Face': 'Noice',
    'Rapid Strike Style': 'Rapid-Strike', 'Crowned Sword': 'Crowned', 'Crowned Shield': 'Crowned',
    'Ice Rider': 'Ice', 'Shadow Rider': 'Shadow', Ash: 'Ash',
    'Eternal Flower': 'Eternal', 'Sandy Cloak': 'Sandy', 'Trash Cloak': 'Trash',
};
const FEMALE_FORMS = new Set(['Meowstic', 'Indeedee', 'Basculegion', 'Oinkologne']); // other "Female Form"s are cosmetic
const SPECIES_BY_ID = { 29: 'Nidoran-F', 32: 'Nidoran-M' }; // both are "Nidoran?" in the ROM name table
const HIDDEN_POWER_TYPES = ['Fighting', 'Flying', 'Poison', 'Ground', 'Rock', 'Bug', 'Ghost', 'Steel',
    'Fire', 'Water', 'Grass', 'Electric', 'Psychic', 'Ice', 'Dragon', 'Dark'];

function showdownSpecies(species) {
    if (SPECIES_BY_ID[species.id]) return SPECIES_BY_ID[species.id];
    const [, base, alias] = species.name.match(/^(.*) \((.+)\)$/) || [null, species.name, ''];
    const name = SHOWDOWN_NAMES.species[base] || base.replace(/^Unown \w$/, 'Unown');
    const type = alias.match(/^(\w+) Type$/)?.[1];
    const female = alias === 'Female Form' && FEMALE_FORMS.has(name) ? 'F' : '';
    const suffix = type ? (type === 'Fight' ? 'Fighting' : type) : FORM_SUFFIX[alias] || female;
    return suffix ? `${name}-${suffix}` : name;
}

function hiddenPowerType(ivs) {
    const bits = ['HP', 'Atk', 'Def', 'Spe', 'SpA', 'SpD'].reduce((sum, key, index) => sum + ((ivs[key] & 1) << index), 0);
    return HIDDEN_POWER_TYPES[Math.floor((bits * 15) / 63)];
}

function spread(values, skip) {
    return STATS.filter((key) => values[key] !== skip).map((key) => `${values[key]} ${key}`).join(' / ');
}

export function rosterShowdown(roster) {
    return roster.pokemon.map((mon) => {
        const gender = { Male: ' (M)', Female: ' (F)' }[mon.gender] || '';
        const item = mon.held_item.id ? ` @ ${SHOWDOWN_NAMES.items[mon.held_item.name] || mon.held_item.name}` : '';
        const lines = [`${showdownSpecies(mon.species)}${gender}${item}`];
        if (mon.ability.name) lines.push(`Ability: ${SHOWDOWN_NAMES.abilities[mon.ability.name] || mon.ability.name}`);
        lines.push(`Level: ${mon.level}`);
        if (mon.shiny) lines.push('Shiny: Yes');
        const evs = spread(mon.evs, 0);
        if (evs) lines.push(`EVs: ${evs}`);
        lines.push(`${mon.nature.name} Nature`);
        const ivs = spread(mon.ivs, 31);
        if (ivs) lines.push(`IVs: ${ivs}`);
        for (const move of mon.moves) {
            lines.push(`- ${move.name === 'Hidden Power' ? `Hidden Power ${hiddenPowerType(mon.ivs)}` : SHOWDOWN_NAMES.moves[move.name] || move.name}`);
        }
        return lines.join('\n');
    }).join('\n\n') + '\n';
}
