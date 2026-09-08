"use client";

import type { FinalReport } from "@/lib/report";

export function ReportView({ report }: { report: FinalReport }) {
  return (
    <div className="space-y-6">
      {/* Та же типографика тела текста, что в шапке: крупно, светлым весом,
          ключевые слова — ярче/жирнее прямо в тексте. */}
      <p className="max-w-2xl text-xl font-normal leading-snug text-neutral-400 sm:text-2xl">
        Показываем, кого удалось <span className="font-medium text-neutral-900">расселить</span>, кому не хватило
        места, и какие <span className="font-medium text-neutral-900">места перегружены</span>.
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-2xl font-semibold text-emerald-700">{report.resettledCount}</p>
          <p className="text-xs text-emerald-600">расселено</p>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-2xl font-semibold text-red-700">{report.unresettledCount}</p>
          <p className="text-xs text-red-600">без места</p>
        </div>
      </div>

      <div>
        <h4 className="mb-2 text-sm font-semibold text-neutral-700">Самые проблемные заявки</h4>
        {report.mostProblematic.length === 0 ? (
          <p className="text-sm text-neutral-500">Все расселены — проблемных заявок нет.</p>
        ) : (
          <ul className="space-y-1.5">
            {report.mostProblematic.map(({ ghost, reason }) => (
              <li key={ghost.id} className="rounded border border-border bg-neutral-50 px-3 py-2 text-xs">
                <span className="font-medium text-neutral-800">{ghost.name}</span>
                <span className="text-neutral-500"> — {reason}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h4 className="mb-2 text-sm font-semibold text-neutral-700">Перегруженные места</h4>
        {report.overloadedPlaces.length === 0 ? (
          <p className="text-sm text-neutral-500">Переполнений нет.</p>
        ) : (
          <ul className="space-y-1.5">
            {report.overloadedPlaces.map(({ place, occupancy }) => (
              <li key={place.id} className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
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
