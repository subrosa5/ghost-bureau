import type { SpecialCondition } from "./types";

export const CONDITION_LABELS: Record<SpecialCondition, string> = {
  "needs-attic": "нужен чердак",
  "fears-mirrors": "боится зеркал",
  "no-humans-nearby": "нельзя рядом с людьми",
  "loves-dampness": "любит сырость",
};

export const LIGHTING_LABELS: Record<string, string> = {
  dark: "темно",
  dim: "приглушённо",
  bright: "светло",
};
