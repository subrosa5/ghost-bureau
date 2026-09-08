"use client";

import type { FinalReport } from "@/lib/report";

export function ReportView({ report }: { report: FinalReport }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-emerald-800 bg-emerald-950/30 p-4">
          <p className="text-2xl font-semibold text-emerald-300">{report.resettledCount}</p>
          <p className="text-xs text-emerald-500">расселено</p>
        </div>
        <div className="rounded-lg border border-red-800 bg-red-950/30 p-4">
          <p className="text-2xl font-semibold text-red-300">{report.unresettledCount}</p>
          <p className="text-xs text-red-500">без места</p>
        </div>
      </div>

      <div>
        <h4 className="mb-2 text-sm font-semibold text-neutral-300">Самые проблемные заявки</h4>
        {report.mostProblematic.length === 0 ? (
          <p className="text-sm text-neutral-500">Все расселены — проблемных заявок нет.</p>
        ) : (
          <ul className="space-y-1.5">
            {report.mostProblematic.map(({ ghost, reason }) => (
              <li key={ghost.id} className="rounded border border-neutral-800 bg-neutral-900/30 px-3 py-2 text-xs">
                <span className="font-medium text-neutral-200">{ghost.name}</span>
                <span className="text-neutral-500"> — {reason}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h4 className="mb-2 text-sm font-semibold text-neutral-300">Перегруженные места</h4>
        {report.overloadedPlaces.length === 0 ? (
          <p className="text-sm text-neutral-500">Переполнений нет.</p>
        ) : (
          <ul className="space-y-1.5">
            {report.overloadedPlaces.map(({ place, occupancy }) => (
              <li key={place.id} className="rounded border border-red-800 bg-red-950/30 px-3 py-2 text-xs text-red-300">
                {place.name}: {occupancy}/{place.capacity} — превышена вместимость
                {" "}
                (это возможно, только если оператор вручную превысил лимит)
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
