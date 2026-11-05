import React from 'react';
import { Shield, Undo2 } from 'lucide-react';
import { PROTECTION_RULES } from '../services/protection.js';

export default function ReleaseProtections({ enabled, onChange, undoCount, onUndo }) {
    return (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <details className="rounded-xl border border-slate-700 bg-slate-800/70 px-3 py-2 text-sm text-slate-200">
                <summary className="flex cursor-pointer items-center gap-2 font-semibold"><Shield size={14} /> Release protections</summary>
                <p className="mt-2 text-xs text-slate-400">Starred Pokémon are always protected. Checked rules also block release.</p>
                <div className="mt-2 grid gap-1 sm:grid-cols-2">
                    {PROTECTION_RULES.map(({ key, label }) => (
                        <label key={key} className="flex items-center gap-2">
                            <input type="checkbox" className="accent-blue-500" checked={enabled[key] !== false}
                                onChange={(event) => onChange({ ...enabled, [key]: event.target.checked })} /> {label}
                        </label>
                    ))}
                </div>
            </details>
            {undoCount > 0 && (
                <button type="button" onClick={onUndo}
                    className="flex items-center gap-2 rounded-xl border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-sm font-semibold text-amber-200 hover:bg-amber-500/20">
                    <Undo2 size={14} /> Undo last release ({undoCount})
                </button>
            )}
        </div>
    );
}
