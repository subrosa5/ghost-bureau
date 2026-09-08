"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Сегментный ввод даты (день/месяц/год) с автопереходом между сегментами
 * прямо во время набора — как у срока действия карты. Обычный
 * <input type="date"> тут не годится: его внутренние сегменты — закрытый
 * shadow DOM браузера, JS не может ни управлять переходом между ними, ни
 * гарантировать одинаковое поведение в разных браузерах.
 *
 * Правило перехода без ожидания второй цифры: если первая введённая цифра
 * уже делает продолжение сегмента невозможным (день не может начинаться
 * с 4-9 как двузначное число — 40-99 не бывает, только однозначные 4-9;
 * то же для месяца с 2-9), переходим сразу. Иначе ждём вторую цифру.
 */

function digitsOnly(s: string) {
  return s.replace(/\D/g, "");
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function focusAndSelect(ref: React.RefObject<HTMLInputElement | null>) {
  ref.current?.focus();
  ref.current?.select();
}

// Крошечное привидение, бегающее по фону поля (только по горизонтали, не
// по всем четырём краям, как в карточках Worklog — тут попросили именно
// "влево-вправо"). Первая версия силуэта была со слишком мелкими деталями
// (несколько маленьких волн в хвосте) — при 13px они сливались в нечёткое
// пятно вместо привидения. Упростили до двух широких дуг снизу и увеличили
// размер — на таком масштабе форма должна читаться сразу, без деталей.
const TINY_GHOST_PATH =
  "M12 2.5C7.5 2.5 4 6.1 4 10.5v9.2c0 .95 1.1 1.4 1.75.75L8 18.2l2 2.15c.55.6 1.45.6 2 0l2-2.15 2.25 2.25c.65.65 1.75.2 1.75-.75V10.5C20 6.1 16.5 2.5 12 2.5Z";

function TinyGhostSvg({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d={TINY_GHOST_PATH} fill="#fa876b" />
    </svg>
  );
}

const GHOST_SIZE = 17;

function DateFieldGhost() {
  const hostRef = useRef<HTMLDivElement>(null);
  const ghostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    const ghostEl = ghostRef.current;
    if (!host || !ghostEl) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = host.clientWidth;
    let x = width / 2;
    // Хаотичное движение: не равномерный отскок туда-сюда с одной
    // скоростью, а случайная целевая скорость, которая время от времени
    // сама меняется (и по величине, и по направлению) — привидение то
    // ускоряется, то тормозит, то разворачивается посреди поля, а не
    // только у краёв.
    let dx = (Math.random() < 0.5 ? -1 : 1) * (0.2 + Math.random() * 0.3);
    let framesUntilRetarget = 40 + Math.random() * 60;

    if (reduced) {
      ghostEl.style.transform = `translate3d(${Math.max(0, width / 2 - GHOST_SIZE / 2)}px, 0, 0)`;
      return;
    }

    let raf = 0;
    function tick() {
      width = host!.clientWidth;

      framesUntilRetarget -= 1;
      if (framesUntilRetarget <= 0) {
        dx = (Math.random() < 0.5 ? -1 : 1) * (0.15 + Math.random() * 0.4);
        framesUntilRetarget = 40 + Math.random() * 60;
      }

      x += dx;
      if (x <= 0) {
        x = 0;
        dx = Math.abs(dx);
        framesUntilRetarget = 40 + Math.random() * 60;
      } else if (x >= width - GHOST_SIZE) {
        x = Math.max(0, width - GHOST_SIZE);
        dx = -Math.abs(dx);
        framesUntilRetarget = 40 + Math.random() * 60;
      }
      ghostEl!.style.transform = `translate3d(${x}px, 0, 0)`;
      raf = requestAnimationFrame(tick);
    }
    tick();
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div ref={hostRef} className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <div
        ref={ghostRef}
        className="absolute top-1/2 left-0 -translate-y-1/2 opacity-[0.22]"
        style={{ willChange: "transform" }}
      >
        <TinyGhostSvg size={GHOST_SIZE} />
      </div>
    </div>
  );
}

export function DateInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [initialYear, initialMonth, initialDay] = value ? value.split("-") : ["", "", ""];
  const [day, setDay] = useState(initialDay ?? "");
  const [month, setMonth] = useState(initialMonth ?? "");
  const [year, setYear] = useState(initialYear ?? "");

  const dayRef = useRef<HTMLInputElement>(null);
  const monthRef = useRef<HTMLInputElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);

  // Внешний сброс (например, форма очищает deadline после отправки) должен
  // очищать и внутренние сегменты. Раньше это делал useEffect + setState —
  // рабочий, но не лучший паттерн. Правильнее: у вызывающей стороны
  // (GhostForm) при сбросе формы меняется key на этом компоненте — React
  // размонтирует старый экземпляр и создаст новый с чистым состоянием сам,
  // без ручной синхронизации эффектом.

  function commit(d: string, m: string, y: string) {
    onChange(d.length === 2 && m.length === 2 && y.length === 4 ? `${y}-${m}-${d}` : "");
  }

  function handleDay(raw: string) {
    const digits = digitsOnly(raw).slice(0, 2);
    if (digits.length === 1 && Number(digits) > 3) {
      const v = digits.padStart(2, "0");
      setDay(v);
      commit(v, month, year);
      focusAndSelect(monthRef);
      return;
    }
    if (digits.length === 2) {
      const v = String(clamp(Number(digits) || 1, 1, 31)).padStart(2, "0");
      setDay(v);
      commit(v, month, year);
      focusAndSelect(monthRef);
      return;
    }
    setDay(digits);
    commit(digits, month, year);
  }

  function handleMonth(raw: string) {
    const digits = digitsOnly(raw).slice(0, 2);
    if (digits.length === 1 && Number(digits) > 1) {
      const v = digits.padStart(2, "0");
      setMonth(v);
      commit(day, v, year);
      focusAndSelect(yearRef);
      return;
    }
    if (digits.length === 2) {
      const v = String(clamp(Number(digits) || 1, 1, 12)).padStart(2, "0");
      setMonth(v);
      commit(day, v, year);
      focusAndSelect(yearRef);
      return;
    }
    setMonth(digits);
    commit(day, digits, year);
  }

  function handleYear(raw: string) {
    const digits = digitsOnly(raw).slice(0, 4);
    setYear(digits);
    commit(day, month, digits);
  }

  function handleDayKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    const el = e.currentTarget;
    if (e.key === "ArrowRight" && el.selectionStart === el.value.length) {
      focusAndSelect(monthRef);
    }
  }

  function handleMonthKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    const el = e.currentTarget;
    if (e.key === "Backspace" && el.value === "") {
      focusAndSelect(dayRef);
    } else if (e.key === "ArrowLeft" && el.selectionStart === 0) {
      focusAndSelect(dayRef);
    } else if (e.key === "ArrowRight" && el.selectionStart === el.value.length) {
      focusAndSelect(yearRef);
    }
  }

  function handleYearKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    const el = e.currentTarget;
    if (e.key === "Backspace" && el.value === "") {
      focusAndSelect(monthRef);
    } else if (e.key === "ArrowLeft" && el.selectionStart === 0) {
      focusAndSelect(monthRef);
    }
  }

  // Ширина в ch считается по цифре "0" — кириллические буквы плейсхолдера
  // ("мм", "гггг") заметно шире цифр и на 2ch/4ch обрезались/наезжали на
  // точку-разделитель. Сами введённые значения — всегда цифры, они узкие,
  // так что запас под плейсхолдер не мешает набору.
  const segClass = "bg-transparent text-center text-sm text-neutral-900 outline-none placeholder:text-neutral-300";

  return (
    <div className="relative isolate flex items-center gap-0.5 overflow-hidden rounded border border-border-strong bg-white px-2 py-1.5 focus-within:border-accent">
      <DateFieldGhost />
      <input
        ref={dayRef}
        className={segClass}
        style={{ width: "2.6ch" }}
        inputMode="numeric"
        placeholder="дд"
        value={day}
        onChange={(e) => handleDay(e.target.value)}
        onKeyDown={handleDayKeyDown}
        onFocus={(e) => e.target.select()}
        aria-label="День дедлайна"
      />
      <span className="text-neutral-300">.</span>
      <input
        ref={monthRef}
        className={segClass}
        style={{ width: "2.6ch" }}
        inputMode="numeric"
        placeholder="мм"
        value={month}
        onChange={(e) => handleMonth(e.target.value)}
        onKeyDown={handleMonthKeyDown}
        onFocus={(e) => e.target.select()}
        aria-label="Месяц дедлайна"
      />
      <span className="text-neutral-300">.</span>
      <input
        ref={yearRef}
        className={segClass}
        style={{ width: "4.6ch" }}
        inputMode="numeric"
        placeholder="гггг"
        value={year}
        onChange={(e) => handleYear(e.target.value)}
        onKeyDown={handleYearKeyDown}
        onFocus={(e) => e.target.select()}
        aria-label="Год дедлайна"
      />
    </div>
  );
}
