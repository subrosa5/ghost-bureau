import { describe, expect, it } from "vitest";
import { allocate, evaluateManualChoice, hardViolations } from "./matching";
import { seedGhosts, seedPlaces } from "./seed";
import type { GhostRequest, Place } from "./types";

const basePlace: Place = {
  id: "p1",
  name: "Тестовое место",
  capacity: 1,
  hasAttic: true,
  lighting: "dark",
  hasMirrors: false,
  noiseLevel: 1,
  humidity: 5,
  hasHumans: false,
  temperature: 10,
};

const baseGhost: GhostRequest = {
  id: "gh1",
  name: "Тестовое привидение",
  anxietyLevel: 5,
  favoriteTemperature: 10,
  deadline: "2099-01-01",
  specialConditions: [],
};

describe("hardViolations", () => {
  it("не находит нарушений, если требований нет", () => {
    expect(hardViolations(baseGhost, basePlace)).toEqual([]);
  });

  it("требует чердак, если у привидения needs-attic", () => {
    const ghost = { ...baseGhost, specialConditions: ["needs-attic" as const] };
    const place = { ...basePlace, hasAttic: false };
    expect(hardViolations(ghost, place).length).toBeGreaterThan(0);
  });

  it("запрещает зеркала, если привидение их боится", () => {
    const ghost = { ...baseGhost, specialConditions: ["fears-mirrors" as const] };
    const place = { ...basePlace, hasMirrors: true };
    expect(hardViolations(ghost, place).length).toBeGreaterThan(0);
  });

  it("loves-dampness — мягкое предпочтение, не блокирует место", () => {
    const ghost = { ...baseGhost, specialConditions: ["loves-dampness" as const] };
    const dryPlace = { ...basePlace, humidity: 0 };
    expect(hardViolations(ghost, dryPlace)).toEqual([]);
  });
});

describe("allocate — пустой список заявок", () => {
  it("не падает и возвращает пустые результаты", () => {
    const result = allocate([], seedPlaces);
    expect(result.assignments).toEqual([]);
    expect(result.unresolved).toEqual([]);
  });
});

describe("allocate — просроченный дедлайн", () => {
  it("привидение с прошедшим дедлайном остаётся нерасселённым с понятной причиной", () => {
    const ghost: GhostRequest = { ...baseGhost, id: "expired", deadline: "2000-01-01" };
    const result = allocate([ghost], seedPlaces);
    expect(result.assignments).toEqual([]);
    expect(result.unresolved).toHaveLength(1);
    expect(result.unresolved[0].reason).toMatch(/дедлайн просрочен/);
  });
});

describe("allocate — нет подходящего места по жёстким условиям", () => {
  it("привидение без совместимого места остаётся нерасселённым", () => {
    // единственные два места с чердаком в seed-наборе (замок, библиотека)
    // оба содержат зеркала — needs-attic + fears-mirrors неразрешимо.
    const ghost: GhostRequest = {
      ...baseGhost,
      id: "impossible",
      specialConditions: ["needs-attic", "fears-mirrors"],
    };
    const result = allocate([ghost], seedPlaces);
    expect(result.assignments).toEqual([]);
    expect(result.unresolved[0].reason).toMatch(/не подходит по условиям/);
  });
});

describe("allocate — переполнение места", () => {
  it("при нескольких заявках на место вместимостью 1 лишние остаются нерасселёнными", () => {
    const place: Place = { ...basePlace, capacity: 1 };
    const ghosts: GhostRequest[] = [
      { ...baseGhost, id: "a", deadline: "2099-01-01" },
      { ...baseGhost, id: "b", deadline: "2099-01-02" },
    ];
    const result = allocate(ghosts, [place]);
    expect(result.assignments).toHaveLength(1);
    expect(result.unresolved).toHaveLength(1);
    expect(result.unresolved[0].reason).toMatch(/уже заняты/);
  });
});

describe("allocate — на полном seed-наборе покрыты все обязательные состояния", () => {
  const result = allocate(seedGhosts, seedPlaces);

  it("кто-то расселён успешно", () => {
    expect(result.assignments.length).toBeGreaterThan(0);
  });

  it("есть нерасселённые по разным причинам: дедлайн, нет места, переполнение", () => {
    const reasons = result.unresolved.map((u) => u.reason).join(" | ");
    expect(reasons).toMatch(/дедлайн просрочен/);
    expect(reasons).toMatch(/не подходит по условиям/);
    expect(reasons).toMatch(/уже заняты/);
  });
});

describe("evaluateManualChoice", () => {
  it("не предупреждает, если ручной выбор корректен", () => {
    const { warning } = evaluateManualChoice(baseGhost, basePlace, 0);
    expect(warning).toBeNull();
  });

  it("предупреждает, если ручной выбор конфликтует с условиями", () => {
    const ghost = { ...baseGhost, specialConditions: ["fears-mirrors" as const] };
    const place = { ...basePlace, hasMirrors: true };
    const { warning } = evaluateManualChoice(ghost, place, 0);
    expect(warning).not.toBeNull();
    expect(warning).toMatch(/боится зеркал/);
  });

  it("предупреждает про переполнение при ручном выборе", () => {
    const place = { ...basePlace, capacity: 1 };
    const { warning } = evaluateManualChoice(baseGhost, place, 1);
    expect(warning).toMatch(/переполнено/);
  });
});
