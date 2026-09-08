"use client";

/**
 * Числовое поле со своими стрелками ▲▼ вместо нативного спиннера
 * <input type="number">. Нативный спиннер по умолчанию видно в Chrome, но
 * не в Safari (он там показывается только по hover, что часто выглядит как
 * "спиннера вообще нет") — кросс-браузерно понятную стрелку гарантирует
 * только свой контрол. Сам ввод текстом при этом никуда не делся — можно
 * печатать значение напрямую, стрелки просто дублируют +1/-1.
 */
export function NumberStepper({
  value,
  onChange,
  min,
  max,
}: {
  value: string;
  onChange: (v: string) => void;
  min?: number;
  max?: number;
}) {
  function step(delta: number) {
    const current = Number(value);
    const base = Number.isFinite(current) ? current : (min ?? 0);
    let next = base + delta;
    if (min !== undefined) next = Math.max(min, next);
    if (max !== undefined) next = Math.min(max, next);
    onChange(String(next));
  }

  return (
    <div className="relative">
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded border border-border-strong bg-white px-2 py-1.5 pr-7 text-sm text-neutral-900
          [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <div className="absolute inset-y-0 right-0 flex w-6 flex-col border-l border-border-strong">
        <button
          type="button"
          tabIndex={-1}
          aria-label="Увеличить"
          onClick={() => step(1)}
          className="flex flex-1 items-center justify-center rounded-tr border-b border-border-strong text-neutral-400 hover:bg-neutral-50 hover:text-neutral-700"
        >
          <svg width="9" height="6" viewBox="0 0 9 6" fill="none" aria-hidden="true">
            <path d="M1 5L4.5 1L8 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button
          type="button"
          tabIndex={-1}
          aria-label="Уменьшить"
          onClick={() => step(-1)}
          className="flex flex-1 items-center justify-center rounded-br text-neutral-400 hover:bg-neutral-50 hover:text-neutral-700"
        >
          <svg width="9" height="6" viewBox="0 0 9 6" fill="none" aria-hidden="true">
            <path d="M1 1L4.5 5L8 1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
