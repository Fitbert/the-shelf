"use client";

import { useState } from "react";
import TurntablePlayer from "./turntable/TurntablePlayer";
import ShelfGrid from "./ShelfGrid";
import DetailSheet from "./DetailSheet";
import AddRecordSheet from "./AddRecordSheet";
import { signOut } from "@/lib/actions";
import type { VinylRecord } from "@/lib/types";

type Tab = "player" | "shelf";

export default function AppShell({ initialRecords }: { initialRecords: VinylRecord[] }) {
  const [records, setRecords] = useState(initialRecords);
  const [tab, setTab] = useState<Tab>("player");
  const [nowPlaying, setNowPlaying] = useState<VinylRecord | null>(null);
  const [detailRecord, setDetailRecord] = useState<VinylRecord | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  function play(record: VinylRecord) {
    setNowPlaying(record);
    setTab("player");
  }

  function handleAdded(record: VinylRecord) {
    setRecords((prev) => [record, ...prev]);
  }

  function handleDeleted(id: string) {
    setRecords((prev) => prev.filter((r) => r.id !== id));
    setNowPlaying((prev) => (prev?.id === id ? null : prev));
  }

  function handleUpdated(record: VinylRecord) {
    setRecords((prev) => prev.map((r) => (r.id === record.id ? record : r)));
    setNowPlaying((prev) => (prev?.id === record.id ? record : prev));
    setDetailRecord((prev) => (prev?.id === record.id ? record : prev));
  }

  return (
    <div className="max-w-[920px] mx-auto pb-24">
      <header className="flex items-baseline justify-between px-5 pt-7 pb-4.5">
        <div>
          <div className="font-display italic font-bold text-[1.7rem] text-teal-deep tracking-[-0.01em]">
            The Shelf
          </div>
          <div className="font-mono text-[0.68rem] tracking-[0.08em] uppercase text-rust/75">
            your records, spinning
          </div>
        </div>
        <form action={signOut}>
          <button
            type="submit"
            className="font-mono text-[0.65rem] uppercase tracking-[0.05em] text-ink/40 hover:text-ink/70"
          >
            Sign out
          </button>
        </form>
      </header>

      <nav className="flex gap-1.5 px-5 pb-5">
        <TabButton active={tab === "player"} onClick={() => setTab("player")}>
          Turntable
        </TabButton>
        <TabButton active={tab === "shelf"} onClick={() => setTab("shelf")}>
          The Shelf
        </TabButton>
      </nav>

      <main className="px-5">
        {tab === "player" ? (
          <TurntablePlayer record={nowPlaying} />
        ) : (
          <ShelfGrid records={records} onSelect={setDetailRecord} />
        )}
      </main>

      <button
        onClick={() => setAddOpen(true)}
        title="Add a record"
        className="fixed bottom-6 right-6 w-[58px] h-[58px] rounded-full bg-rust text-cream-soft text-2xl flex items-center justify-center shadow-[0_6px_18px_rgba(176,63,38,0.45)] active:scale-[0.94] transition-transform z-10"
      >
        +
      </button>

      <DetailSheet
        record={detailRecord}
        onClose={() => setDetailRecord(null)}
        onPlay={play}
        onDeleted={handleDeleted}
        onUpdated={handleUpdated}
      />

      <AddRecordSheet open={addOpen} onClose={() => setAddOpen(false)} onAdded={handleAdded} />
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`font-display font-semibold text-[0.95rem] px-1 py-2 border-b-2 transition-all ${
        active ? "text-teal-deep border-orange opacity-100" : "text-ink border-transparent opacity-40"
      }`}
    >
      {children}
    </button>
  );
}
