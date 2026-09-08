// types.ts — доменные модели бюро переселения привидений.

export type SpecialCondition =
  | "needs-attic" // нужен чердак
  | "fears-mirrors" // боится зеркал
  | "no-humans-nearby" // нельзя селить рядом с людьми
  | "loves-dampness"; // любит сырость

export interface GhostRequest {
  id: string;
  name: string;
  anxietyLevel: number; // 1..10 — выше = тревожнее, важнее тишина/уединение
  favoriteTemperature: number; // °C, желаемая температура места
  deadline: string; // ISO-дата, до какого числа нужно переселить
  specialConditions: SpecialCondition[];
}

export interface Place {
  id: string;
  name: string;
  capacity: number; // сколько привидений вмещает одновременно
  hasAttic: boolean;
  lighting: "dark" | "dim" | "bright"; // уровень освещения
  hasMirrors: boolean;
  noiseLevel: number; // 0..10
  humidity: number; // 0..10
  hasHumans: boolean; // обитаемо ли людьми
  temperature: number; // °C, реальная температура места
}

export interface Assignment {
  ghostId: string;
  placeId: string | null; // null = не расселён
  score: number; // 0..100, чем выше — тем лучше совпадение
  reasons: string[]; // человекочитаемые причины (почему подошло / что не идеально)
  manual: boolean; // true, если место выбрано вручную оператором, а не алгоритмом
  warning: string | null; // предупреждение, если ручной выбор конфликтует с условиями
}

export interface UnresolvedReason {
  ghostId: string;
  reason: string;
}
