"use client";

import { useEffect, useRef } from "react";

/**
 * Декоративный фон для карточек Worklog (решения/ошибки/улучшения) — вместо
 * плоской заливки внутри елозит маленькое привидение, отскакивая от всех
 * четырёх краёв прямоугольника (как заставка DVD-логотипа), плюс лёгкий
 * параллакс текста от его положения. Специально другой силуэт, чем большие
 * фоновые привидения на странице (там вытянутый купол с волнистым хвостом) —
 * этот кругленький, с двумя точками-глазами, попроще и помельче.
 */

const MINI_GHOST_PATH =
  "M18 1C9 1 2 8.5 2 18v16.5c0 1.4 1.7 2.1 2.7 1.1l2.6-2.6 2.6 2.6c0.9 0.9 2.4 0.9 3.3 0l2.6-2.6 2.6 2.6c0.9 0.9 2.4 0.9 3.3 0l2.6-2.6 2.6 2.6c1 1 2.7 0.3 2.7-1.1V18C34 8.5 27 1 18 1Z";

function MiniGhostSvg({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 37" aria-hidden="true">
      <path d={MINI_GHOST_PATH} fill={color} />
      <circle cx={13} cy={15} r={1.9} fill="white" fillOpacity={0.9} />
      <circle cx={23} cy={15} r={1.9} fill="white" fillOpacity={0.9} />
    </svg>
  );
}

const SIZE = 26;
const SPEED = 0.5; // px/кадр — неторопливо, чтобы не спорить с текстом за внимание
// Насколько сильно текст блока откликается на положение привидения внутри
// него — специально маленькие числа (пара пикселей), это фон, а не эффект
// сам по себе, и текст должен оставаться полностью читаемым.
const PARALLAX_X = 5;
const PARALLAX_Y = 3;

export function WorklogGhost({
  color,
  seed = 0,
  contentRef,
}: {
  color: string;
  /** Разный старт/направление у разных карточек — чтобы привидения не двигались синхронно. */
  seed?: number;
  contentRef: React.RefObject<HTMLDivElement | null>;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const ghostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    const ghostEl = ghostRef.current;
    if (!host || !ghostEl) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // псевдослучайность от seed — детерминированно на карточку, но разные
    // карточки стартуют в разных точках и под разными углами.
    const rnd = (n: number) => {
      const v = Math.sin(seed * 12.9898 + n * 78.233) * 43758.5453;
      return v - Math.floor(v);
    };

    let width = host.clientWidth;
    let height = host.clientHeight;
    let x = rnd(1) * Math.max(1, width - SIZE);
    let y = rnd(2) * Math.max(1, height - SIZE);
    let dx = (rnd(3) < 0.5 ? -1 : 1) * SPEED;
    let dy = (rnd(4) < 0.5 ? -1 : 1) * SPEED;

    if (reduced) {
      // без анимации — просто тихо стоит в углу, не спорит с читаемостью
      // и не противоречит prefers-reduced-motion.
      ghostEl.style.transform = `translate3d(${width - SIZE - 8}px, 8px, 0)`;
      return;
    }

    // ResizeObserver есть почти везде, но это чисто декоративный элемент —
    // если вдруг недоступен в каком-то встроенном браузере, просто не
    // подстраиваемся под ресайз карточки, а не падаем.
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => {
      width = host.clientWidth;
      height = host.clientHeight;
    }) : null;
    ro?.observe(host);

    let raf = 0;
    function tick() {
      x += dx;
      y += dy;
      // отскок от всех четырёх краёв прямоугольника — "врезалось в нижний
      // край, улетело вверх", как попросили, а не только по горизонтали.
      if (x <= 0) {
        x = 0;
        dx = Math.abs(dx);
      } else if (x >= width - SIZE) {
        x = Math.max(0, width - SIZE);
        dx = -Math.abs(dx);
      }
      if (y <= 0) {
        y = 0;
        dy = Math.abs(dy);
      } else if (y >= height - SIZE) {
        y = Math.max(0, height - SIZE);
        dy = -Math.abs(dy);
      }
      // ненулевой уже проверен выше, но TS теряет сужение внутри вложенной
      // функции — ghostEl это тот же самый смонтированный узел все время
      // жизни эффекта.
      ghostEl!.style.transform = `translate3d(${x}px, ${y}px, 0)`;

      if (contentRef.current && width > SIZE && height > SIZE) {
        const nx = x / (width - SIZE) - 0.5; // -0.5..0.5
        const ny = y / (height - SIZE) - 0.5;
        contentRef.current.style.transform = `translate3d(${nx * PARALLAX_X}px, ${ny * PARALLAX_Y}px, 0)`;
      }

      raf = requestAnimationFrame(tick);
    }
    tick();

    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
    };
  }, [contentRef, seed]);

  return (
    <div ref={hostRef} className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <div ref={ghostRef} className="absolute left-0 top-0 opacity-[0.16]" style={{ willChange: "transform" }}>
        <MiniGhostSvg size={SIZE} color={color} />
      </div>
    </div>
  );
}
