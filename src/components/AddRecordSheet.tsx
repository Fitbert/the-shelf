"use client";

import { useEffect, useRef, useState } from "react";
import Sheet from "./Sheet";
import BarcodeScanner from "./BarcodeScanner";
import { addRecord, addRecords, addTracks } from "@/lib/actions";
import { uploadPhoto } from "@/lib/storage-client";
import type {
  DiscogsCollectionItem,
  DiscogsReleaseDetail,
  DiscogsSearchResult,
  VinylRecord,
} from "@/lib/types";

type Mode = "search" | "scan" | "manual" | "import";

const MODE_LABELS: Record<Mode, string> = {
  search: "Discogs search",
  scan: "Scan barcode",
  manual: "Enter manually",
  import: "Import collection",
};

export default function AddRecordSheet({
  open,
  onClose,
  onAdded,
  onAddedMany,
  existingRecords,
}: {
  open: boolean;
  onClose: () => void;
  onAdded: (record: VinylRecord) => void;
  onAddedMany: (records: VinylRecord[]) => void;
  existingRecords: VinylRecord[];
}) {
  const [mode, setMode] = useState<Mode>("search");
  const [wasOpen, setWasOpen] = useState(open);

  // Reset to the default mode each time the sheet opens — adjust during
  // render rather than in an effect, per https://react.dev/learn/you-might-not-need-an-effect
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setMode("search");
  }

  if (!open) return null;

  return (
    <Sheet open={open} onClose={onClose}>
      <h2 className="font-display text-xl mb-1">Add a record</h2>
      <p className="font-mono text-[0.7rem] text-ink/50 mb-4.5">
        search, scan, enter it by hand, or import your whole collection
      </p>

      <div className="flex gap-1.5 mb-4.5 flex-wrap">
        {(["search", "scan", "manual", "import"] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`font-display font-semibold text-sm rounded-full px-3.5 py-2 transition-colors ${
              mode === m ? "bg-teal-deep text-cream-soft" : "bg-cream-soft text-ink/60"
            }`}
          >
            {MODE_LABELS[m]}
          </button>
        ))}
      </div>

      {mode === "search" && <DiscogsFlow key="search" mode="search" onAdded={onAdded} onClose={onClose} />}
      {mode === "scan" && <DiscogsFlow key="scan" mode="scan" onAdded={onAdded} onClose={onClose} />}
      {mode === "manual" && <ManualEntry onAdded={onAdded} onClose={onClose} />}
      {mode === "import" && (
        <ImportCollection onAddedMany={onAddedMany} onClose={onClose} existingRecords={existingRecords} />
      )}
    </Sheet>
  );
}

function DiscogsFlow({
  mode,
  onAdded,
  onClose,
}: {
  mode: "search" | "scan";
  onAdded: (record: VinylRecord) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [rawResults, setResults] = useState<DiscogsSearchResult[]>([]);
  const results = mode === "search" && !query.trim() ? [] : rawResults;
  const [searching, setSearching] = useState(false);
  const [scanning, setScanning] = useState(mode === "scan");
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<DiscogsReleaseDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (mode !== "search") return;
    const q = query.trim();
    if (!q) return;
    const timer = setTimeout(async () => {
      setSearching(true);
      setError(null);
      try {
        const res = await fetch(`/api/discogs/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Search failed");
        setResults(data.results);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Search failed");
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [query, mode]);

  async function handleBarcode(code: string) {
    setScanning(false);
    setSearching(true);
    setError(null);
    try {
      const res = await fetch(`/api/discogs/barcode?upc=${encodeURIComponent(code)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lookup failed");
      setResults(data.results);
      if (data.results.length === 0) setError(`No Discogs match for barcode ${code}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lookup failed");
    } finally {
      setSearching(false);
    }
  }

  async function selectResult(result: DiscogsSearchResult) {
    setLoadingDetail(true);
    setError(null);
    try {
      const res = await fetch(`/api/discogs/release/${result.id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't load that pressing");
      setSelected(data.release);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load that pressing");
    } finally {
      setLoadingDetail(false);
    }
  }

  async function confirmAdd() {
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      const record = await addRecord({
        title: selected.title,
        artist: selected.artist,
        catalog_number: selected.catalogNumber,
        pressing_country: selected.country,
        pressing_year: selected.year ? Number(selected.year) : null,
        discogs_release_id: String(selected.id),
        lowest_price: selected.lowestPrice,
        have_count: selected.haveCount,
        want_count: selected.wantCount,
        community_rating: selected.rating,
        community_rating_count: selected.ratingCount,
        photo_url: selected.thumb,
      });
      if (selected.tracklist.length > 0) {
        await addTracks(
          record.id,
          selected.tracklist.map((t) => ({ title: t.title, duration_seconds: t.durationSeconds }))
        );
      }
      onAdded(record);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save that record");
    } finally {
      setSaving(false);
    }
  }

  if (selected) {
    return (
      <div>
        <div className="flex gap-3.5 mb-4">
          <div
            className="w-20 h-20 rounded-lg bg-teal bg-cover bg-center shrink-0"
            style={selected.thumb ? { backgroundImage: `url(${selected.thumb})` } : undefined}
          />
          <div>
            <div className="font-display font-semibold">{selected.title}</div>
            <div className="font-mono text-xs text-teal-deep mt-0.5">{selected.artist}</div>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap mb-4">
          {selected.label && (
            <span className="font-mono text-[0.68rem] bg-cream-soft border border-teal-deep/20 px-2.5 py-[5px] rounded-full">
              {selected.label}
            </span>
          )}
          {selected.catalogNumber && (
            <span className="font-mono text-[0.68rem] bg-cream-soft border border-teal-deep/20 px-2.5 py-[5px] rounded-full">
              Cat# {selected.catalogNumber}
            </span>
          )}
          {selected.country && (
            <span className="font-mono text-[0.68rem] bg-cream-soft border border-teal-deep/20 px-2.5 py-[5px] rounded-full">
              {selected.country}
              {selected.year ? ` · ${selected.year}` : ""}
            </span>
          )}
          {selected.haveCount != null && (
            <span className="font-mono text-[0.68rem] bg-cream-soft border border-teal-deep/20 px-2.5 py-[5px] rounded-full">
              {selected.haveCount} have / {selected.wantCount ?? 0} want
            </span>
          )}
          {selected.rating != null && (
            <span className="font-mono text-[0.68rem] bg-cream-soft border border-teal-deep/20 px-2.5 py-[5px] rounded-full">
              ★ {selected.rating.toFixed(1)}
            </span>
          )}
          {selected.lowestPrice != null && (
            <span className="font-mono text-[0.68rem] bg-rust text-cream-soft px-2.5 py-[5px] rounded-full">
              ${selected.lowestPrice.toFixed(2)} lowest
            </span>
          )}
          {selected.tracklist.length > 0 && (
            <span className="font-mono text-[0.68rem] bg-cream-soft border border-teal-deep/20 px-2.5 py-[5px] rounded-full">
              {selected.tracklist.length} tracks
            </span>
          )}
        </div>
        {error && <p className="font-mono text-xs text-rust mb-3">{error}</p>}
        <div className="flex gap-2.5">
          <button
            onClick={() => setSelected(null)}
            className="flex-1 rounded-full border-[1.5px] border-teal-deep text-teal-deep font-semibold text-sm py-2.5"
          >
            Back
          </button>
          <button
            onClick={confirmAdd}
            disabled={saving}
            className="flex-1 rounded-full bg-orange text-ink font-semibold text-sm py-2.5 shadow-[0_4px_12px_rgba(242,163,75,0.4)] disabled:opacity-40"
          >
            {saving ? "Adding…" : "Add to shelf"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {mode === "scan" ? (
        scanning ? (
          <BarcodeScanner onDetected={handleBarcode} onClose={() => setScanning(false)} />
        ) : (
          <button
            onClick={() => {
              setScanning(true);
              setResults([]);
              setError(null);
            }}
            className="w-full rounded-full bg-orange text-ink font-semibold text-sm py-3 mb-3"
          >
            Open camera
          </button>
        )
      ) : (
        <div className="mb-3.5">
          <label className="block font-mono text-[0.68rem] uppercase tracking-[0.05em] text-teal-deep mb-1.5">
            Search Discogs
          </label>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Try “Kind of Blue” or “Rumours”"
            className="w-full px-3 py-2.5 rounded-lg border-[1.5px] border-teal-deep/25 bg-cream-soft text-sm focus:outline-2 focus:outline-teal focus:outline-offset-1"
          />
        </div>
      )}

      {loadingDetail && <p className="font-mono text-xs text-ink/50">Loading pressing details…</p>}
      {searching && <p className="font-mono text-xs text-ink/50">Searching…</p>}
      {error && <p className="font-mono text-xs text-rust mb-2">{error}</p>}

      {results.length > 0 && (
        <div className="space-y-1.5">
          {results.map((r) => (
            <button
              key={r.id}
              onClick={() => selectResult(r)}
              className="w-full text-left bg-cream-soft rounded-lg px-2.5 py-2 flex gap-2.5 items-center hover:bg-cream transition-colors"
            >
              {r.thumb && (
                <div
                  className="w-10 h-10 rounded bg-teal bg-cover bg-center shrink-0"
                  style={{ backgroundImage: `url(${r.thumb})` }}
                />
              )}
              <div className="min-w-0">
                <div className="font-display text-sm truncate">{r.title}</div>
                <div className="font-mono text-[0.68rem] text-teal-deep truncate">
                  {[r.label[0], r.catno, r.country, r.year].filter(Boolean).join(" · ")}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ManualEntry({
  onAdded,
  onClose,
}: {
  onAdded: (record: VinylRecord) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [catalogNumber, setCatalogNumber] = useState("");
  const [price, setPrice] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function save() {
    if (!title.trim() || !artist.trim()) {
      setError("Add at least a title and artist.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      let photoUrl: string | null = null;
      if (photoFile) photoUrl = await uploadPhoto(photoFile);

      const parsedPrice = price.trim() ? Number(price.replace(/[^0-9.]/g, "")) : null;

      const record = await addRecord({
        title: title.trim(),
        artist: artist.trim(),
        catalog_number: catalogNumber.trim() || null,
        lowest_price: Number.isFinite(parsedPrice) ? parsedPrice : null,
        photo_url: photoUrl,
      });
      onAdded(record);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save that record");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <button
        onClick={() => fileRef.current?.click()}
        className="w-full border-[1.5px] border-dashed border-teal-deep/35 rounded-[10px] p-4 text-center font-mono text-xs text-teal-deep mb-3.5 relative overflow-hidden"
      >
        📸 Tap to add a photo of the sleeve
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handlePhoto}
          className="hidden"
        />
        {photoPreview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoPreview} alt="" className="max-h-[110px] rounded-md mt-1.5 mx-auto" />
        )}
      </button>

      <div className="space-y-3.5">
        <Field label="Title">
          <input
            className={inputClass}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Album title"
          />
        </Field>
        <Field label="Artist">
          <input
            className={inputClass}
            value={artist}
            onChange={(e) => setArtist(e.target.value)}
            placeholder="Artist name"
          />
        </Field>
        <Field label="Catalog number">
          <input
            className={inputClass}
            value={catalogNumber}
            onChange={(e) => setCatalogNumber(e.target.value)}
            placeholder="e.g. CL 8163"
          />
        </Field>
        <Field label="Your price estimate">
          <input
            className={inputClass}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="e.g. 28"
          />
        </Field>
      </div>

      {error && <p className="font-mono text-xs text-rust mt-3">{error}</p>}

      <div className="flex gap-2.5 mt-4.5">
        <button
          onClick={onClose}
          className="flex-1 rounded-full border-[1.5px] border-teal-deep text-teal-deep font-semibold text-sm py-2.5"
        >
          Cancel
        </button>
        <button
          onClick={save}
          disabled={saving}
          className="flex-1 rounded-full bg-orange text-ink font-semibold text-sm py-2.5 shadow-[0_4px_12px_rgba(242,163,75,0.4)] disabled:opacity-40"
        >
          {saving ? "Adding…" : "Add to shelf"}
        </button>
      </div>
    </div>
  );
}

function ImportCollection({
  onAddedMany,
  onClose,
  existingRecords,
}: {
  onAddedMany: (records: VinylRecord[]) => void;
  onClose: () => void;
  existingRecords: VinylRecord[];
}) {
  const [username, setUsername] = useState("");
  const [items, setItems] = useState<DiscogsCollectionItem[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [page, setPage] = useState(0);
  const [pages, setPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const existingReleaseIds = new Set(
    existingRecords.map((r) => r.discogs_release_id).filter((id): id is string => Boolean(id))
  );

  async function fetchPage(nextPage: number) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/discogs/collection?username=${encodeURIComponent(username)}&page=${nextPage}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't load that collection");
      const newItems = data.items as DiscogsCollectionItem[];
      setItems((prev) => (nextPage === 1 ? newItems : [...prev, ...newItems]));
      setPage(data.page);
      setPages(data.pages);
      setTotalItems(data.totalItems);
      // Default-select items you don't already own.
      setSelected((prev) => {
        const next = new Set(prev);
        for (const item of newItems) {
          if (!existingReleaseIds.has(String(item.releaseId))) next.add(item.releaseId);
        }
        return next;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load that collection");
    } finally {
      setLoading(false);
    }
  }

  function toggle(releaseId: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(releaseId)) next.delete(releaseId);
      else next.add(releaseId);
      return next;
    });
  }

  async function importSelected() {
    const toImport = items.filter((item) => selected.has(item.releaseId));
    if (toImport.length === 0) return;
    setImporting(true);
    setError(null);
    try {
      const records = await addRecords(
        toImport.map((item) => ({
          title: item.title,
          artist: item.artist,
          catalog_number: item.catalogNumber,
          pressing_year: item.year ? Number(item.year) : null,
          discogs_release_id: String(item.releaseId),
          photo_url: item.thumb,
        }))
      );
      onAddedMany(records);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't import those records");
    } finally {
      setImporting(false);
    }
  }

  const selectedCount = selected.size;

  return (
    <div>
      <p className="font-mono text-[0.7rem] text-ink/50 mb-3">
        Pulls records from a public Discogs collection. Pricing and ratings aren&rsquo;t included in bulk
        imports — add those later from a record&rsquo;s detail sheet if you want them.
      </p>
      <div className="flex gap-2 mb-3.5">
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Discogs username"
          className={`${inputClass} flex-1`}
        />
        <button
          onClick={() => fetchPage(1)}
          disabled={!username.trim() || loading}
          className="shrink-0 rounded-lg bg-teal-deep text-cream-soft font-semibold text-sm px-4 disabled:opacity-40"
        >
          Fetch
        </button>
      </div>

      {loading && items.length === 0 && <p className="font-mono text-xs text-ink/50">Loading collection…</p>}
      {error && <p className="font-mono text-xs text-rust mb-2">{error}</p>}

      {items.length > 0 && (
        <>
          <div className="font-mono text-[0.68rem] text-ink/50 mb-2">
            {totalItems} in collection · {selectedCount} selected
          </div>
          <div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1">
            {items.map((item) => {
              const owned = existingReleaseIds.has(String(item.releaseId));
              return (
                <label
                  key={item.releaseId}
                  className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 ${
                    owned ? "opacity-45" : "bg-cream-soft"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(item.releaseId)}
                    onChange={() => toggle(item.releaseId)}
                    className="accent-teal-deep shrink-0"
                  />
                  {item.thumb && (
                    <div
                      className="w-9 h-9 rounded bg-teal bg-cover bg-center shrink-0"
                      style={{ backgroundImage: `url(${item.thumb})` }}
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="font-display text-sm truncate">{item.title}</div>
                    <div className="font-mono text-[0.65rem] text-teal-deep truncate">
                      {item.artist}
                      {item.year ? ` · ${item.year}` : ""}
                    </div>
                  </div>
                  {owned && <span className="font-mono text-[0.6rem] text-ink/50 shrink-0">on shelf</span>}
                </label>
              );
            })}
          </div>

          {page < pages && (
            <button
              onClick={() => fetchPage(page + 1)}
              disabled={loading}
              className="w-full mt-2.5 rounded-full border-[1.5px] border-teal-deep text-teal-deep font-semibold text-xs py-2 disabled:opacity-40"
            >
              {loading ? "Loading…" : `Load more (${items.length}/${totalItems})`}
            </button>
          )}

          <div className="flex gap-2.5 mt-4.5">
            <button
              onClick={onClose}
              className="flex-1 rounded-full border-[1.5px] border-teal-deep text-teal-deep font-semibold text-sm py-2.5"
            >
              Cancel
            </button>
            <button
              onClick={importSelected}
              disabled={importing || selectedCount === 0}
              className="flex-1 rounded-full bg-orange text-ink font-semibold text-sm py-2.5 shadow-[0_4px_12px_rgba(242,163,75,0.4)] disabled:opacity-40"
            >
              {importing ? "Importing…" : `Import selected (${selectedCount})`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

const inputClass =
  "w-full px-3 py-2.5 rounded-lg border-[1.5px] border-teal-deep/25 bg-cream-soft text-sm focus:outline-2 focus:outline-teal focus:outline-offset-1";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block font-mono text-[0.68rem] uppercase tracking-[0.05em] text-teal-deep mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}
