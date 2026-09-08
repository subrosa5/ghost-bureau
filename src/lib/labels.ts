import type { Place, SpecialCondition } from "./types";

export const CONDITION_LABELS: Record<SpecialCondition, string> = {
  "needs-attic": "нужен чердак",
  "fears-mirrors": "боится зеркал",
  "no-humans-nearby": "нельзя рядом с людьми",
  "loves-dampness": "любит сырость",
};

// Строгий union вместо string — если Place['lighting'] когда-нибудь
// расширят новым значением, TypeScript сломает сборку прямо здесь, а не
// молча отрисует пустую строку в интерфейсе.
export const LIGHTING_LABELS: Record<Place["lighting"], string> = {
  dark: "темно",
  dim: "приглушённо",
  bright: "светло",
};
