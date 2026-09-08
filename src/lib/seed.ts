// seed.ts — стартовые данные для демонстрации. Даты дедлайнов считаются
// от момента запуска приложения, чтобы "просроченный дедлайн" всегда
// оставался просроченным, а не протухал в прошлом навсегда.
import type { GhostRequest, Place } from "./types";

const daysFromNow = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

export const seedPlaces: Place[] = [
  {
    id: "castle",
    name: "Старый замок",
    capacity: 2,
    hasAttic: true,
    lighting: "dim",
    hasMirrors: true,
    noiseLevel: 2,
    humidity: 6,
    hasHumans: false,
    temperature: 10,
  },
  {
    id: "lighthouse",
    name: "Маяк на скале",
    capacity: 1,
    hasAttic: false,
    lighting: "bright",
    hasMirrors: false,
    noiseLevel: 4,
    humidity: 8,
    hasHumans: false,
    temperature: 8,
  },
  {
    id: "library",
    name: "Заброшенная библиотека",
    capacity: 2,
    hasAttic: true,
    lighting: "dim",
    hasMirrors: true, // старые зеркала в холле — единственный чердак с зеркалами
    noiseLevel: 1,
    humidity: 4,
    hasHumans: false,
    temperature: 16,
  },
  {
    id: "theatre",
    name: "Старый театр",
    capacity: 1,
    hasAttic: false,
    lighting: "dark",
    hasMirrors: true,
    noiseLevel: 3,
    humidity: 5,
    hasHumans: true, // ночной сторож
    temperature: 14,
  },
  {
    id: "printworks",
    name: "Подвал старой типографии",
    capacity: 1,
    hasAttic: false,
    lighting: "dark",
    hasMirrors: false,
    noiseLevel: 5,
    humidity: 9,
    hasHumans: false,
    temperature: 12,
  },
];

export const seedGhosts: GhostRequest[] = [
  {
    id: "g1",
    name: "Барон Атрагон",
    anxietyLevel: 3,
    favoriteTemperature: 10,
    deadline: daysFromNow(10),
    specialConditions: ["needs-attic"],
  },
  {
    id: "g2",
    name: "Мадам Флёр",
    anxietyLevel: 8,
    favoriteTemperature: 15,
    deadline: daysFromNow(5),
    specialConditions: ["fears-mirrors", "no-humans-nearby"],
  },
  {
    id: "g3",
    name: "Тихий Уилл",
    anxietyLevel: 9,
    favoriteTemperature: 9,
    deadline: daysFromNow(3),
    specialConditions: ["loves-dampness"],
  },
  {
    id: "g4",
    name: "Кроха Пеппи",
    anxietyLevel: 2,
    favoriteTemperature: 14,
    deadline: daysFromNow(4),
    // второй претендент (наравне с g2 и g7) на маяк/типографию — вместе
    // их трое на два места вместимостью 1, кто-то останется без места.
    specialConditions: ["fears-mirrors", "no-humans-nearby"],
  },
  {
    id: "g5",
    name: "Старейшина Морн",
    anxietyLevel: 6,
    favoriteTemperature: 11,
    deadline: daysFromNow(-2), // уже просрочен — демонстрирует edge case
    specialConditions: ["needs-attic"],
  },
  {
    id: "g6",
    name: "Плакса Ивонна",
    anxietyLevel: 7,
    favoriteTemperature: 20,
    deadline: daysFromNow(7),
    // единственные места с чердаком (замок, библиотека) — оба с зеркалами.
    // Эта комбинация условий не удовлетворяется НИ ОДНИМ местом — демонстрирует "нет подходящего места".
    specialConditions: ["needs-attic", "fears-mirrors"],
  },
  {
    id: "g7",
    name: "Скрипучий Дэн",
    anxietyLevel: 4,
    favoriteTemperature: 9,
    deadline: daysFromNow(9),
    // третий претендент на маяк/типографию (единственные места без зеркал и людей,
    // вместимость 1 каждое) — демонстрирует переполнение при трёх заявках на два места.
    specialConditions: ["fears-mirrors", "no-humans-nearby"],
  },
  {
    id: "g8",
    name: "Скромный Отто",
    anxietyLevel: 5,
    favoriteTemperature: 12,
    deadline: daysFromNow(15),
    specialConditions: [], // без особых условий — демонстрирует обычный путь без ограничений
  },
];
