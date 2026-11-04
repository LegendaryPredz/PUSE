import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ArrowRightLeft, CheckSquare, ChevronLeft, ChevronRight, Package, Trash2, X } from 'lucide-react';
import { POKEMON_ICON_FALLBACK_URL } from '../core/iconResolver.js';

import { PROFILE, isRadicalRed } from '../core/profile.js';
const BOX_SLOTS = 30;

function getBoxLabel(boxId) {
    return Number(boxId) === 26 ? 'Preset' : `Box ${boxId}`;
}

const PCGrid = ({ client, boxId, onBoxChange, onEditPokemon, onAddPokemon, onReleasePokemon, onMovePokemon }) => {
    const VISIBLE_BOX_SEQUENCE = useMemo(() => isRadicalRed() ? Array.from({length: PROFILE.storage.pc.box_count}, (_, i) => i + 1) : [...Array.from({length:24}, (_, i) => i + 1),26], []);
    const [pokemon, setPokemon] = useState([]);
    const [writableSlots, setWritableSlots] = useState(new Set());
    const [loading, setLoading] = useState(false);
    const [pcLoaded, setPcLoaded] = useState(false);
    // Picked-up Pokemon ({ box, slot, pokemon }); survives box changes so they can be dropped into any box.
    const [selection, setSelection] = useState([]);
    const moving = selection.length > 0;
    const isSelected = (slot) => selection.some((s) => s.box === Number(boxId) && s.slot === slot);
    const toggleSelected = (slot, pk) => setSelection((prev) => (
        prev.some((s) => s.box === Number(boxId) && s.slot === slot)
            ? prev.filter((s) => !(s.box === Number(boxId) && s.slot === slot))
            : [...prev, { box: Number(boxId), slot, pokemon: pk }]
    ));
    const fetchBox = useCallback(async (id) => {
        setLoading(true);
        try {
            if (!pcLoaded) {
                await client.loadPc();
                setPcLoaded(true);
            }

            const [data, writable] = await Promise.all([
                client.getPcBox(id),
                client.getPcWritableSlots(id),
            ]);
            setPokemon(data);
            setWritableSlots(new Set((writable?.writable_slots || []).map((slot) => Number(slot))));
        } catch (err) {
            console.error("Box loading error", err);
            setWritableSlots(new Set());
        } finally {
            setLoading(false);
        }
    }, [client, pcLoaded]);

    useEffect(() => {
        fetchBox(boxId);
    }, [boxId, fetchBox]);

    useEffect(() => {
        setPcLoaded(false);
    }, [client, VISIBLE_BOX_SEQUENCE]);

    useEffect(() => {
        if (!VISIBLE_BOX_SEQUENCE.includes(Number(boxId))) {
            onBoxChange(1);
        }
    }, [boxId, onBoxChange, VISIBLE_BOX_SEQUENCE]);

    const handlePrevBox = () => {
        const idx = VISIBLE_BOX_SEQUENCE.indexOf(Number(boxId));
        const curr = idx >= 0 ? idx : 0;
        const prev = (curr - 1 + VISIBLE_BOX_SEQUENCE.length) % VISIBLE_BOX_SEQUENCE.length;
        onBoxChange(VISIBLE_BOX_SEQUENCE[prev]);
    };

    const handleNextBox = () => {
        const idx = VISIBLE_BOX_SEQUENCE.indexOf(Number(boxId));
        const curr = idx >= 0 ? idx : 0;
        const next = (curr + 1) % VISIBLE_BOX_SEQUENCE.length;
        onBoxChange(VISIBLE_BOX_SEQUENCE[next]);
    };

    const dropSelection = (slot) => {
        const sources = selection.map(({ box, slot: s }) => ({ box, slot: s }));
        setSelection([]);
        if (sources.length === 1) {
            onMovePokemon?.({ from_box: sources[0].box, from_slot: sources[0].slot, to_box: Number(boxId), to_slot: slot });
            return;
        }
        // Fill this box from the clicked slot, then overflow into the following boxes (never into Preset).
        const startIdx = VISIBLE_BOX_SEQUENCE.indexOf(Number(boxId));
        const overflow = Number(boxId) === 26 ? [] : VISIBLE_BOX_SEQUENCE.slice(startIdx + 1).filter((b) => b !== 26);
        onMovePokemon?.({
            sources,
            destinations: [{ box: Number(boxId), startSlot: slot }, ...overflow.map((box) => ({ box, startSlot: 1 }))],
        });
    };

    const normalizedSlots = Array.from({ length: BOX_SLOTS }, (_, idx) => {
        const slot = idx + 1;
        return {
            slot,
            pokemon: null,
        };
    });

    pokemon.forEach((pk) => {
        const rawSlot = Number(pk.slot);
        const normalizedSlot = Number.isFinite(rawSlot)
            ? (rawSlot >= 1 && rawSlot <= BOX_SLOTS ? rawSlot : (rawSlot >= 0 && rawSlot < BOX_SLOTS ? rawSlot + 1 : null))
            : null;
        if (!normalizedSlot) return;
        normalizedSlots[normalizedSlot - 1] = {
            slot: normalizedSlot,
            pokemon: pk,
        };
    });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between bg-slate-800/50 p-4 rounded-3xl border border-white/5 shadow-inner">
                <button
                    onClick={handlePrevBox}
                    className="p-3 bg-slate-700/50 hover:bg-blue-600 hover:text-white rounded-2xl transition-all active:scale-90 shadow-lg"
                >
                    <ChevronLeft size={24} />
                </button>

                <div className="text-center">
                    <h2 className="text-xl font-black text-blue-400 uppercase tracking-tighter">
                        {getBoxLabel(boxId)}
                    </h2>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                        {pokemon.length} / {BOX_SLOTS} Pokemon
                    </p>
                    {onMovePokemon && pokemon.some((pk) => writableSlots.has(Number(pk.slot))) && (
                        <button
                            type="button"
                            onClick={() => setSelection((prev) => [
                                ...prev,
                                ...pokemon
                                    .filter((pk) => writableSlots.has(Number(pk.slot)) && !prev.some((s) => s.box === Number(boxId) && s.slot === Number(pk.slot)))
                                    .map((pk) => ({ box: Number(boxId), slot: Number(pk.slot), pokemon: pk })),
                            ])}
                            className="mt-2 inline-flex items-center gap-1 rounded-lg bg-slate-700/50 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-300 hover:bg-amber-500/80 hover:text-white"
                        >
                            <CheckSquare size={12} /> Select all to move
                        </button>
                    )}
                </div>

                <button
                    onClick={handleNextBox}
                    className="p-3 bg-slate-700/50 hover:bg-blue-600 hover:text-white rounded-2xl transition-all active:scale-90 shadow-lg"
                >
                    <ChevronRight size={24} />
                </button>
            </div>

            {moving && (
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                    <span>
                        {selection.length === 1 ? (
                            <>Moving <b>{selection[0].pokemon.nickname || 'Pokemon'}</b> from {getBoxLabel(selection[0].box)} slot {selection[0].slot}. Pick a slot in any box (occupied slots swap), or select more with ⇄.</>
                        ) : (
                            <><b>{selection.length}</b> Pokemon selected. Click a slot in any box: they fill its free slots from there and overflow into the next boxes.</>
                        )}
                    </span>
                    <button
                        type="button"
                        onClick={() => setSelection([])}
                        className="flex items-center gap-1 rounded-lg bg-slate-900/60 px-2 py-1 text-xs font-bold hover:bg-slate-800"
                    >
                        <X size={13} /> Cancel
                    </button>
                </div>
            )}

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                {loading ? (
                    <div className="col-span-full py-20 text-center text-slate-500 animate-pulse">
                        Syncing box...
                    </div>
                ) : (
                    normalizedSlots.map(({ slot, pokemon: pk }) => {
                        const writable = writableSlots.has(slot);
                        const isMoveSource = isSelected(slot);
                        return (
                        <div
                            key={slot}
                            onClick={() => {
                                if (moving) {
                                    if (!writable) return;
                                    if (isMoveSource) {
                                        toggleSelected(slot, pk);
                                    } else {
                                        dropSelection(slot);
                                    }
                                    return;
                                }
                                if (!pk) {
                                    if (!writable) {
                                        return;
                                    }
                                    onAddPokemon?.({ box: boxId, slot });
                                    return;
                                }
                                onEditPokemon(pk);
                            }}
                            className={`group p-2.5 sm:p-3 rounded-2xl border transition-all ${
                                isMoveSource
                                    ? 'bg-amber-500/10 border-amber-400/60 cursor-pointer'
                                    : moving && writable
                                    ? `${pk ? 'bg-[#1e293b]' : 'bg-slate-900/40 border-dashed'} border-white/10 hover:border-amber-400/60 cursor-pointer`
                                    : pk
                                    ? 'bg-[#1e293b] border-white/5 hover:border-blue-500/50 cursor-pointer'
                                    : writable
                                        ? 'bg-slate-900/40 border-dashed border-white/10 hover:border-emerald-400/40 cursor-pointer'
                                        : 'bg-slate-900/30 border-dashed border-white/5 opacity-60 cursor-not-allowed'
                            }`}
                        >
                            <div className="relative w-full aspect-square bg-slate-800/50 rounded-xl flex items-center justify-center mb-2 overflow-hidden">
                                {pk ? (
                                    <>
                                        <img
                                            src={client.getPokemonIconUrl(pk.species_id)}
                                            alt={pk.nickname}
                                            className="w-14 h-14 object-contain pixelated group-hover:scale-110 transition-transform"
                                            onError={(e) => {
                                                if (e.currentTarget.src !== POKEMON_ICON_FALLBACK_URL) {
                                                    e.currentTarget.src = POKEMON_ICON_FALLBACK_URL;
                                                }
                                            }}
                                        />
                                        {writable && onMovePokemon && (
                                            <button
                                                type="button"
                                                title={`${isMoveSource ? 'Unselect' : 'Move'} ${pk.nickname || 'Pokemon'}`}
                                                aria-label={`${isMoveSource ? 'Unselect' : 'Move'} ${pk.nickname || 'Pokemon'}`}
                                                aria-pressed={isMoveSource}
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    toggleSelected(slot, pk);
                                                }}
                                                className={`absolute left-1 top-1 rounded-lg p-1.5 transition-all focus:opacity-100 ${
                                                    isMoveSource
                                                        ? 'bg-amber-500/90 text-white opacity-100'
                                                        : 'bg-slate-950/80 text-slate-400 opacity-0 hover:bg-amber-500/90 hover:text-white group-hover:opacity-100'
                                                }`}
                                            >
                                                <ArrowRightLeft size={13} />
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            title={`Release ${pk.nickname || 'Pokemon'}`}
                                            aria-label={`Release ${pk.nickname || 'Pokemon'}`}
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                onReleasePokemon?.({ box: boxId, slot, pokemon: pk });
                                            }}
                                            className="absolute right-1 top-1 rounded-lg bg-slate-950/80 p-1.5 text-slate-400 opacity-0 transition-all hover:bg-rose-500/90 hover:text-white group-hover:opacity-100"
                                        >
                                            <Trash2 size={13} />
                                        </button>
                                    </>
                                ) : (
                                    <span className={`text-[10px] font-mono ${writable ? 'text-slate-500 group-hover:text-emerald-300' : 'text-slate-600'}`}>
                                        {writable ? '+ ADD' : 'LOCKED'}
                                    </span>
                                )}
                            </div>
                            <div className="text-center min-h-10">
                                <p className={`text-xs font-bold truncate ${pk ? 'text-slate-100' : 'text-slate-500'}`}>
                                    {pk ? pk.nickname : 'Empty Slot'}
                                </p>
                                <p className="text-[10px] text-slate-500 font-mono uppercase">
                                    Slot {slot}{!pk && !writable ? ' (N/A)' : ''}
                                </p>
                            </div>
                        </div>
                    )})
                )}
            </div>

                {!loading && pokemon.length === 0 && (
                    <div className="col-span-full py-20 text-center bg-slate-800/20 rounded-[2rem] border border-dashed border-white/10">
                        <Package className="mx-auto text-slate-700 mb-2" size={48} />
                        <p className="text-slate-500 italic">This box is empty</p>
                    </div>
                )}
        </div>
    );
};

export default PCGrid;
