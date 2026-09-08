"use client";

import { useState } from "react";
import type { GhostRequest, SpecialCondition } from "@/lib/types";
import { CONDITION_LABELS } from "@/lib/labels";
import { DateInput } from "./DateInput";
import { NumberStepper } from "./NumberStepper";

const ALL_CONDITIONS = Object.keys(CONDITION_LABELS) as SpecialCondition[];

export function GhostForm({ onAdd }: { onAdd: (ghost: GhostRequest) => void }) {
  const [name, setName] = useState("");
  const [anxietyLevel, setAnxietyLevel] = useState("5");
  const [favoriteTemperature, setFavoriteTemperature] = useState("10");
  const [deadline, setDeadline] = useState("");
  const [conditions, setConditions] = useState<SpecialCondition[]>([]);
  const [error, setError] = useState<string | null>(null);
  // Меняем key у DateInput при каждом сбросе формы — React сам размонтирует
  // старый экземпляр и создаст новый с чистыми сегментами дд/мм/гггг,
  // без эффекта-синхронизации внутри самого DateInput.
  const [dateInputKey, setDateInputKey] = useState(0);

  function toggleCondition(c: SpecialCondition) {
    setConditions((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Укажите имя привидения — без него заявку не оформить.");
      return;
    }
    const anxiety = Number(anxietyLevel);
    if (!Number.isFinite(anxiety) || anxiety < 1 || anxiety > 10) {
      setError("Уровень тревожности должен быть числом от 1 до 10.");
      return;
    }
    // Number("") === 0, что попадает в допустимый диапазон — без явной
    // проверки на пустую строку очищенное поле молча проходило бы как 0°C
    // вместо явной ошибки "укажите значение", как у остальных полей.
    if (favoriteTemperature.trim() === "") {
      setError("Укажите любимую температуру.");
      return;
    }
    const temp = Number(favoriteTemperature);
    if (!Number.isFinite(temp) || temp < -30 || temp > 40) {
      setError("Любимая температура должна быть числом от -30 до 40°C.");
      return;
    }
    if (!deadline) {
      setError("Укажите дедлайн переселения.");
      return;
    }

    onAdd({
      id: `g-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: trimmedName,
      anxietyLevel: anxiety,
      favoriteTemperature: temp,
      deadline,
      specialConditions: conditions,
    });

    setName("");
    setAnxietyLevel("5");
    setFavoriteTemperature("10");
    setDeadline("");
    setConditions([]);
    setDateInputKey((k) => k + 1);
  }

  return (
    <form
      onSubmit={submit}
      noValidate // валидация полностью своя (submit); без этого браузер
      // блокировал бы событие submit нативной проверкой min/max поля
      // "тревожность" ДО того, как отработает наш обработчик — из-за чего
      // кастомная ошибка для этого поля никогда не показывалась (и любой
      // предыдущий кастомный баннер ошибки не очищался), а для "температуры"
      // (без min/max) всё работало как задумано — несогласованное поведение.
      className="space-y-3 rounded-lg border border-border bg-neutral-50 p-4"
    >
      <h3 className="text-sm font-semibold text-neutral-700">Новая заявка</h3>

      {error && (
        <p role="alert" className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <label className="col-span-2 flex flex-col gap-1 text-xs text-neutral-500">
          Имя привидения
          <input
            className="rounded border border-border-strong bg-white px-2 py-1.5 text-sm text-neutral-900"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Например, Тень Августа"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-neutral-500">
          Тревожность (1–10)
          <NumberStepper value={anxietyLevel} onChange={setAnxietyLevel} min={1} max={10} />
        </label>

        <label className="flex flex-col gap-1 text-xs whitespace-nowrap text-neutral-500">
          Температура, °C
          <NumberStepper value={favoriteTemperature} onChange={setFavoriteTemperature} min={-30} max={40} />
        </label>

        <label className="col-span-2 flex flex-col gap-1 text-xs text-neutral-500">
          Дедлайн переселения
          <DateInput key={dateInputKey} value={deadline} onChange={setDeadline} />
        </label>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-xs text-neutral-500">Особые условия</span>
        <div className="flex flex-wrap gap-2">
          {ALL_CONDITIONS.map((c) => (
            <button
              type="button"
              key={c}
              onClick={() => toggleCondition(c)}
              className={`rounded-full border px-3 py-1 text-xs transition ${
                conditions.includes(c)
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border-strong text-neutral-500 hover:border-neutral-400"
              }`}
            >
              {CONDITION_LABELS[c]}
            </button>
          ))}
        </div>
      </div>

      <button
        type="submit"
        className="w-full rounded bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-hover"
      >
        Добавить заявку
      </button>
    </form>
  );
}
