"use client";

import { useMemo, useState } from "react";
import { GhostForm } from "@/components/GhostForm";
import { AssignmentBoard, PlacesOverview } from "@/components/AssignmentBoard";
import { ReportView } from "@/components/ReportView";
import { WorklogView } from "@/components/WorklogView";
import { allocate } from "@/lib/matching";
import { buildReport } from "@/lib/report";
import { seedGhosts, seedPlaces } from "@/lib/seed";
import type { GhostRequest } from "@/lib/types";

type Tab = "requests" | "report" | "worklog";

export default function Home() {
  const [ghosts, setGhosts] = useState<GhostRequest[]>(seedGhosts);
  const [manualOverrides, setManualOverrides] = useState<Record<string, string>>({});
  const [tab, setTab] = useState<Tab>("requests");
  const places = seedPlaces;

  const { assignments, unresolved } = useMemo(() => allocate(ghosts, places), [ghosts, places]);

  // финальные назначения = автоматические, поверх которых наложены ручные
  // переопределения оператора — используются и для occupancy, и для отчёта.
  const finalAssignments = useMemo(() => {
    return assignments.map((a) =>
      manualOverrides[a.ghostId]
        ? { ...a, placeId: manualOverrides[a.ghostId], manual: true }
        : a
    );
  }, [assignments, manualOverrides]);

  const finalOccupancy = useMemo(() => {
    const occ: Record<string, number> = Object.fromEntries(places.map((p) => [p.id, 0]));
    for (const a of finalAssignments) {
      if (a.placeId) occ[a.placeId] = (occ[a.placeId] ?? 0) + 1;
    }
    return occ;
  }, [finalAssignments, places]);

  const report = useMemo(
    () => buildReport(ghosts, places, finalAssignments, unresolved),
    [ghosts, places, finalAssignments, unresolved]
  );

  function handleAdd(ghost: GhostRequest) {
    setGhosts((prev) => [...prev, ghost]);
  }

  function handleRemove(ghostId: string) {
    setGhosts((prev) => prev.filter((g) => g.id !== ghostId));
    setManualOverrides((prev) => {
      const next = { ...prev };
      delete next[ghostId];
      return next;
    });
  }

  function handleManualChange(ghostId: string, placeId: string) {
    setManualOverrides((prev) => {
      const next = { ...prev };
      if (placeId) next[ghostId] = placeId;
      else delete next[ghostId];
      return next;
    });
  }

  function handleClearAll() {
    setGhosts([]);
    setManualOverrides({});
  }

  function handleLoadDemo() {
    setGhosts(seedGhosts);
    setManualOverrides({});
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "requests", label: "Заявки" },
    { id: "report", label: "Отчёт" },
    { id: "worklog", label: "AI Worklog" },
  ];

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="border-b border-neutral-800 px-6 py-5">
        <h1 className="text-xl font-semibold">👻 Бюро переселения привидений</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Подбираем привидениям новые места обитания — с объяснением решений и учётом конфликтов.
        </p>
      </header>

      <nav className="flex gap-1 border-b border-neutral-800 px-6">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-3 text-sm font-medium transition ${
              tab === t.id
                ? "border-b-2 border-violet-500 text-violet-300"
                : "text-neutral-500 hover:text-neutral-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main className="mx-auto max-w-5xl px-6 py-6">
        {tab === "requests" && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
            <div className="space-y-4">
              <GhostForm onAdd={handleAdd} />
              <div className="flex gap-2">
                <button
                  onClick={handleClearAll}
                  className="flex-1 rounded border border-neutral-700 px-3 py-1.5 text-xs text-neutral-400 hover:border-red-700 hover:text-red-400"
                >
                  Очистить все заявки
                </button>
                <button
                  onClick={handleLoadDemo}
                  className="flex-1 rounded border border-neutral-700 px-3 py-1.5 text-xs text-neutral-400 hover:border-violet-700 hover:text-violet-300"
                >
                  Загрузить пример
                </button>
              </div>
              <div>
                <h3 className="mb-2 text-sm font-semibold text-neutral-300">Места переселения</h3>
                <PlacesOverview places={places} occupancy={finalOccupancy} />
              </div>
            </div>

            <AssignmentBoard
              ghosts={ghosts}
              places={places}
              assignments={assignments}
              unresolved={unresolved}
              occupancy={finalOccupancy}
              manualOverrides={manualOverrides}
              onManualChange={handleManualChange}
              onRemoveGhost={handleRemove}
            />
          </div>
        )}

        {tab === "report" && <ReportView report={report} />}
        {tab === "worklog" && <WorklogView />}
      </main>
    </div>
  );
}
