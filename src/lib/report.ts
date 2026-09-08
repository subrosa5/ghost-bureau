// report.ts — итоговый отчёт по текущему состоянию расселения.
import type { Assignment, GhostRequest, Place, UnresolvedReason } from "./types";

export interface FinalReport {
  resettledCount: number;
  unresettledCount: number;
  mostProblematic: { ghost: GhostRequest; reason: string }[];
  overloadedPlaces: { place: Place; occupancy: number }[];
  occupancyByPlace: Record<string, number>;
}

export function buildReport(
  ghosts: GhostRequest[],
  places: Place[],
  assignments: Assignment[],
  unresolved: UnresolvedReason[]
): FinalReport {
  const occupancyByPlace: Record<string, number> = Object.fromEntries(places.map((p) => [p.id, 0]));
  for (const a of assignments) {
    if (a.placeId) occupancyByPlace[a.placeId] = (occupancyByPlace[a.placeId] ?? 0) + 1;
  }

  const overloadedPlaces = places
    .filter((p) => (occupancyByPlace[p.id] ?? 0) > p.capacity)
    .map((p) => ({ place: p, occupancy: occupancyByPlace[p.id] ?? 0 }));

  const ghostById = Object.fromEntries(ghosts.map((g) => [g.id, g]));
  const mostProblematic = unresolved
    .map((u) => ({ ghost: ghostById[u.ghostId], reason: u.reason }))
    .filter((x): x is { ghost: GhostRequest; reason: string } => Boolean(x.ghost));

  return {
    resettledCount: assignments.filter((a) => a.placeId).length,
    unresettledCount: unresolved.length,
    mostProblematic,
    overloadedPlaces,
    occupancyByPlace,
  };
}
