// matching.ts — алгоритм подбора мест для привидений.
//
// Два уровня правил:
//   1) Жёсткие ограничения (hard constraints) — если место им не
//      удовлетворяет, оно вообще не рассматривается для этого привидения.
//      needs-attic / fears-mirrors / no-humans-nearby — это они.
//   2) Мягкий скор (0..100) — среди мест, прошедших жёсткие ограничения,
//      выбираем то, что лучше всего подходит по температуре, тишине,
//      освещению и влажности. loves-dampness — это мягкое предпочтение,
//      а не жёсткое требование (в отличие от needs-attic и т.д.), поэтому
//      несоответствие по влажности не исключает место, а просто снижает скор.
import type { Assignment, GhostRequest, Place, UnresolvedReason } from "./types";

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/** Жёсткие ограничения: почему место НЕ подходит категорически.
 * Возвращает список причин — пусто, если ограничений нет. */
export function hardViolations(ghost: GhostRequest, place: Place): string[] {
  const reasons: string[] = [];
  if (ghost.specialConditions.includes("needs-attic") && !place.hasAttic) {
    reasons.push("нужен чердак, а его здесь нет");
  }
  if (ghost.specialConditions.includes("fears-mirrors") && place.hasMirrors) {
    reasons.push("привидение боится зеркал, а они здесь есть");
  }
  if (ghost.specialConditions.includes("no-humans-nearby") && place.hasHumans) {
    reasons.push("нельзя селить рядом с людьми, а здесь они есть");
  }
  return reasons;
}

/** Мягкий скор совместимости (0..100) + причины, объясняющие число.
 * Вызывать только для мест, уже прошедших hardViolations (пустой список). */
export function scorePair(ghost: GhostRequest, place: Place): { score: number; reasons: string[] } {
  const reasons: string[] = [];

  // Температура: до 30 баллов, тем меньше — чем больше разница с любимой.
  const tempDiff = Math.abs(ghost.favoriteTemperature - place.temperature);
  const tempScore = clamp(30 - tempDiff * 2, 0, 30);
  if (tempDiff <= 2) reasons.push(`температура ${place.temperature}°C почти точно совпадает с любимой (${ghost.favoriteTemperature}°C)`);
  else if (tempDiff >= 10) reasons.push(`температура ${place.temperature}°C сильно отличается от желаемой (${ghost.favoriteTemperature}°C)`);

  // Тишина: чем тревожнее привидение, тем дороже ему обходится шум.
  const noiseScore = clamp(30 - (ghost.anxietyLevel / 10) * place.noiseLevel * 3, 0, 30);
  if (ghost.anxietyLevel >= 6 && place.noiseLevel <= 3) reasons.push("тихо — то, что нужно тревожному привидению");
  if (ghost.anxietyLevel >= 6 && place.noiseLevel >= 7) reasons.push("шумно — плохо переносится при высокой тревожности");

  // Освещение: тёмные места комфортнее для тревожных привидений.
  let lightScore: number;
  if (place.lighting === "dark") {
    lightScore = 20;
    if (ghost.anxietyLevel >= 5) reasons.push("темно — комфортно для тревожного привидения");
  } else if (place.lighting === "dim") {
    lightScore = 12;
  } else {
    lightScore = ghost.anxietyLevel > 5 ? 0 : 8;
    if (ghost.anxietyLevel > 5) reasons.push("слишком светло для тревожного привидения");
  }

  // Влажность: мягкое предпочтение, не жёсткое требование.
  let dampScore: number;
  if (ghost.specialConditions.includes("loves-dampness")) {
    dampScore = clamp(place.humidity * 2, 0, 20);
    if (place.humidity >= 6) reasons.push(`высокая влажность (${place.humidity}/10) — любимые условия`);
    else reasons.push(`суховато (влажность ${place.humidity}/10) для привидения, которое любит сырость`);
  } else {
    dampScore = 10; // нейтрально — не награждаем и не штрафуем за то, что привидению безразлично
  }

  const score = Math.round(clamp(tempScore + noiseScore + lightScore + dampScore, 0, 100));
  return { score, reasons };
}

export interface AllocationResult {
  assignments: Assignment[];
  unresolved: UnresolvedReason[];
  /** placeId -> сколько привидений туда уже заселено этим прогоном */
  occupancy: Record<string, number>;
}

/** Распределяет всех привидений по местам. Более срочные заявки (ранний
 * дедлайн, а при равенстве — более тревожные) обрабатываются первыми,
 * чтобы не отдать последнее хорошее место менее срочной заявке. */
export function allocate(ghosts: GhostRequest[], places: Place[], today: Date = new Date()): AllocationResult {
  const occupancy: Record<string, number> = Object.fromEntries(places.map((p) => [p.id, 0]));
  const assignments: Assignment[] = [];
  const unresolved: UnresolvedReason[] = [];

  const ordered = [...ghosts].sort((a, b) => {
    const byDeadline = a.deadline.localeCompare(b.deadline);
    if (byDeadline !== 0) return byDeadline;
    return b.anxietyLevel - a.anxietyLevel;
  });

  for (const ghost of ordered) {
    const deadlineDate = new Date(ghost.deadline + "T23:59:59");
    if (deadlineDate < today) {
      unresolved.push({ ghostId: ghost.id, reason: `дедлайн просрочен (${ghost.deadline})` });
      continue;
    }

    // Места, прошедшие жёсткие ограничения (независимо от занятости —
    // нужно для честного объяснения причины отказа).
    const eligible = places
      .map((place) => ({ place, violations: hardViolations(ghost, place) }))
      .filter((x) => x.violations.length === 0)
      .map((x) => x.place);

    if (eligible.length === 0) {
      const allViolations = places.flatMap((p) => hardViolations(ghost, p));
      const unique = [...new Set(allViolations)];
      unresolved.push({
        ghostId: ghost.id,
        reason: `ни одно место не подходит по условиям: ${unique.join("; ")}`,
      });
      continue;
    }

    const withCapacity = eligible.filter((p) => occupancy[p.id] < p.capacity);
    if (withCapacity.length === 0) {
      const names = eligible.map((p) => p.name).join(", ");
      unresolved.push({
        ghostId: ghost.id,
        reason: `подходящие места (${names}) уже заняты — нет свободных мест`,
      });
      continue;
    }

    let best: { place: Place; score: number; reasons: string[] } | null = null;
    for (const place of withCapacity) {
      const { score, reasons } = scorePair(ghost, place);
      if (!best || score > best.score) best = { place, score, reasons };
    }

    if (best) {
      occupancy[best.place.id] += 1;
      assignments.push({
        ghostId: ghost.id,
        placeId: best.place.id,
        score: best.score,
        reasons: best.reasons,
        manual: false,
        warning: null,
      });
    }
  }

  return { assignments, unresolved, occupancy };
}

/** Проверка ручного выбора оператора: не блокируем (оператор может
 * настоять), но честно предупреждаем, что именно не так. */
export function evaluateManualChoice(
  ghost: GhostRequest,
  place: Place,
  occupancyBefore: number
): { warning: string | null } {
  const problems: string[] = [];
  const hv = hardViolations(ghost, place);
  problems.push(...hv);
  if (occupancyBefore >= place.capacity) {
    problems.push(`место переполнено (${occupancyBefore}/${place.capacity})`);
  }
  if (problems.length === 0) return { warning: null };
  return { warning: `Плохой выбор: ${problems.join("; ")}` };
}
