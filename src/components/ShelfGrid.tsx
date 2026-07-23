"use client";

import { useMemo, useState } from "react";
import type { VinylRecord } from "@/lib/types";

type SortKey = "added" | "artist" | "value";

export default function ShelfGrid({
  records,
  onSelect,
}: {
  records: VinylRecord[];
  onSelect: (record: VinylRecord) => void;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("added");

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = records.filter(
      (r) => !q || r.title.toLowerCase().includes(q) || r.artist.toLowerCase().includes(q)
    );
    const sorted = [...filtered];
    if (sort === "artist") sorted.sort((a, b) => a.artist.localeCompare(b.artist));
    else if (sort === "value") sorted.sort((a, b) => (b.lowest_price ?? 0) - (a.lowest_price ?? 0));
    else sorted.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    return sorted;
  }, [records, query, sort]);

  return (
    <section>
      <div className="flex gap-2.5 mb-4.5">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your shelf..."
          className="flex-1 text-sm px-3.5 py-2.5 rounded-[10px] border-[1.5px] border-teal-deep/25 bg-cream-soft focus:outline-2 focus:outline-teal focus:outline-offset-1"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="text-sm px-2.5 rounded-[10px] border-[1.5px] border-teal-deep/25 bg-cream-soft font-mono text-xs text-teal-deep"
        >
          <option value="added">Newest</option>
          <option value="artist">Artist</option>
          <option value="value">Value</option>
        </select>
      </div>

      {records.length === 0 ? (
        <div className="text-center py-16 px-5 font-mono text-ink/50 text-sm">
          Nothing on the shelf yet — add your first record.
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 px-5 font-mono text-ink/50 text-sm">
          No matches for &ldquo;{query}&rdquo;.
        </div>
      ) : (
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))" }}>
          {items.map((r) => (
            <button
              key={r.id}
              onClick={() => onSelect(r)}
              className="text-left bg-cream-soft rounded-xl overflow-hidden shadow-[0_3px_10px_rgba(36,28,21,0.08)] border border-ink/[0.06] transition-transform hover:-translate-y-[3px]"
            >
              <div
                className="aspect-square w-full bg-teal bg-cover bg-center flex items-center justify-center"
                style={r.photo_url ? { backgroundImage: `url(${r.photo_url})` } : undefined}
              >
                {!r.photo_url && (
                  <span className="font-display text-2xl text-white/60">
                    {(r.title[0] || "?").toUpperCase()}
                  </span>
                )}
              </div>
              <div className="px-3 pt-2.5 pb-3">
                <div className="font-display font-semibold text-[0.88rem] leading-tight">{r.title}</div>
                <div className="font-mono text-[0.68rem] text-teal-deep mt-[3px]">{r.artist}</div>
                {r.lowest_price != null && (
                  <div className="inline-block mt-1.5 font-mono text-[0.66rem] bg-rust text-cream-soft px-[7px] py-[2px] rounded-full">
                    ${r.lowest_price.toFixed(2)}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
