"use client";

import type { Assignment, GhostRequest, Place, UnresolvedReason } from "@/lib/types";
import { CONDITION_LABELS, LIGHTING_LABELS } from "@/lib/labels";
import { evaluateManualChoice } from "@/lib/matching";

function ConditionBadges({ conditions }: { conditions: GhostRequest["specialConditions"] }) {
  if (conditions.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {conditions.map((c) => (
        <span key={c} className="rounded-full bg-neutral-800 px-2 py-0.5 text-[11px] text-neutral-300">
          {CONDITION_LABELS[c]}
        </span>
      ))}
    </div>
  );
}

export function AssignmentBoard({
  ghosts,
  places,
  assignments,
  unresolved,
  occupancy,
  manualOverrides,
  onManualChange,
  onRemoveGhost,
}: {
  ghosts: GhostRequest[];
  places: Place[];
  assignments: Assignment[];
  unresolved: UnresolvedReason[];
  occupancy: Record<string, number>;
  manualOverrides: Record<string, string>; // ghostId -> placeId
  onManualChange: (ghostId: string, placeId: string) => void;
  onRemoveGhost: (ghostId: string) => void;
}) {
  const placeById = Object.fromEntries(places.map((p) => [p.id, p]));
  const assignmentByGhost = Object.fromEntries(assignments.map((a) => [a.ghostId, a]));
  const unresolvedByGhost = Object.fromEntries(unresolved.map((u) => [u.ghostId, u.reason]));

  if (ghosts.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-neutral-700 p-8 text-center text-sm text-neutral-500">
        Заявок пока нет. Добавьте первую заявку слева или нажмите «Загрузить пример».
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {ghosts.map((ghost) => {
        const auto = assignmentByGhost[ghost.id];
        const unresolvedReason = unresolvedByGhost[ghost.id];
        const manualPlaceId = manualOverrides[ghost.id];
        const effectivePlaceId = manualPlaceId ?? auto?.placeId ?? null;
        const effectivePlace = effectivePlaceId ? placeById[effectivePlaceId] : null;

        let manualWarning: string | null = null;
        if (manualPlaceId && effectivePlace) {
          // occupancy приходит уже пересчитанной с учётом этого самого ручного
          // выбора (см. finalOccupancy в page.tsx) — то есть эта заявка сама
          // уже входит в число occupancy[effectivePlaceId]. Чтобы понять,
          // было ли место переполнено ДО неё, всегда вычитаем 1 за саму себя —
          // не только в случае совпадения с автоматическим выбором.
          const occIncludingSelf = occupancy[effectivePlaceId!] ?? 0;
          const occBeforeSelf = Math.max(0, occIncludingSelf - 1);
          manualWarning = evaluateManualChoice(ghost, effectivePlace, occBeforeSelf).warning;
        }

        return (
          <div key={ghost.id} className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-neutral-100">{ghost.name}</h4>
                  <span className="text-xs text-neutral-500">до {ghost.deadline}</span>
                </div>
                <p className="mt-0.5 text-xs text-neutral-500">
                  тревожность {ghost.anxietyLevel}/10 · любит {ghost.favoriteTemperature}°C
                </p>
                <div className="mt-1.5">
                  <ConditionBadges conditions={ghost.specialConditions} />
                </div>
              </div>
              <button
                onClick={() => onRemoveGhost(ghost.id)}
                className="shrink-0 text-xs text-neutral-500 hover:text-red-400"
                aria-label={`Удалить заявку ${ghost.name}`}
              >
                удалить
              </button>
            </div>

            <div className="mt-3 border-t border-neutral-800 pt-3">
              {effectivePlace ? (
                <div>
                  <p className="text-sm text-neutral-200">
                    → <span className="font-medium">{effectivePlace.name}</span>
                    {!manualPlaceId && auto && (
                      <span className="ml-2 text-xs text-emerald-400">score {auto.score}/100</span>
                    )}
                    {manualPlaceId && <span className="ml-2 text-xs text-amber-400">выбрано вручную</span>}
                  </p>
                  {!manualPlaceId && auto && auto.reasons.length > 0 && (
                    <ul className="mt-1 list-inside list-disc text-xs text-neutral-500">
                      {auto.reasons.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  )}
                  {manualWarning && (
                    <p className="mt-1.5 rounded border border-amber-800 bg-amber-950/40 px-2 py-1 text-xs text-amber-300">
                      ⚠ {manualWarning}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-red-400">✕ не расселён: {unresolvedReason}</p>
              )}

              <label className="mt-2 flex items-center gap-2 text-xs text-neutral-500">
                Переселить вручную:
                <select
                  className="rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-xs text-neutral-200"
                  value={manualPlaceId ?? ""}
                  onChange={(e) => onManualChange(ghost.id, e.target.value)}
                >
                  <option value="">— автоматически —</option>
                  {places.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({occupancy[p.id] ?? 0}/{p.capacity})
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function PlacesOverview({ places, occupancy }: { places: Place[]; occupancy: Record<string, number> }) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {places.map((p) => {
        const used = occupancy[p.id] ?? 0;
        const over = used > p.capacity;
        return (
          <div
            key={p.id}
            className={`rounded-lg border p-3 text-xs ${
              over ? "border-red-800 bg-red-950/30" : "border-neutral-800 bg-neutral-900/30"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-neutral-200">{p.name}</span>
              <span className={over ? "font-semibold text-red-400" : "text-neutral-400"}>
                {used}/{p.capacity}
              </span>
            </div>
            <p className="mt-1 text-neutral-500">
              {LIGHTING_LABELS[p.lighting]} · шум {p.noiseLevel}/10 · влажность {p.humidity}/10 ·{" "}
              {p.temperature}°C{p.hasHumans ? " · есть люди" : ""}
              {p.hasMirrors ? " · есть зеркала" : ""}
              {p.hasAttic ? " · есть чердак" : ""}
            </p>
          </div>
        );
      })}
    </div>
  );
}
