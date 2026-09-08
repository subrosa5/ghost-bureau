"use client";

import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";

/**
 * Фоновые декоративные привидения. Два слоя, рендерящиеся в РАЗНЫХ местах
 * DOM, но с абсолютно синхронной позицией (общий rAF-цикл пишет одно и то
 * же значение transform в оба набора refs каждый кадр):
 *
 *   1) "Видимый" слой — просто картинки, pointer-events-none целиком.
 *      Рендерится РАНО в разметке (там же, где стоит <ParallaxBackdrop/> в
 *      page.tsx) — поэтому визуально уходит ПОД шапку/карточки, у которых
 *      есть свой фон: элемент, который в DOM раньше, красится позже
 *      идущими соседями того же уровня, а не поверх них.
 *   2) "Кликабельный" слой — невидимые (opacity:0, но не display:none —
 *      opacity не убирает элемент из хит-тестинга) кнопки той же формы и
 *      позиции, портированные (createPortal) в #ghost-hotspot-root — узел,
 *      который лежит в самом конце разметки (см. page.tsx), чтобы клики
 *      реально долетали. Сюда же — всплывающие пузыри-пасхалки, они и
 *      ДОЛЖНЫ быть поверх всего, когда появляются.
 *
 * Движение (то же самое для обоих слоёв, см. комментарии в tick()):
 * параллакс от скролла + медленное притяжение к курсору в "пустой" зоне
 * (не над контентом) + непрерывное парение (чистый CSS @keyframes).
 */

const GHOST_PATH =
  "M10,100 L10,45 A40,40 0 0 1 90,45 L90,100 " +
  "A10,10 0 0 1 70,100 A10,10 0 0 1 50,100 A10,10 0 0 1 30,100 A10,10 0 0 1 10,100 Z";

function GhostSvg({ colorVar, width }: { colorVar: string; width: number }) {
  return (
    <svg viewBox="0 0 100 118" width={width} height={(width * 118) / 100} className="block">
      <path
        d={GHOST_PATH}
        fill={`var(${colorVar})`}
        fillOpacity={0.16}
        stroke={`var(${colorVar})`}
        strokeOpacity={0.4}
        strokeWidth={2.5}
        strokeLinejoin="round"
      />
      <circle cx="38" cy="55" r="4.5" fill={`var(${colorVar})`} fillOpacity={0.45} />
      <circle cx="62" cy="55" r="4.5" fill={`var(${colorVar})`} fillOpacity={0.45} />
    </svg>
  );
}

// Единый, однотипный пузырь для всех фраз — раньше здесь было три разных
// вида (реплика/мысль/"взрыв" с зубчатым clip-path), но у "взрыва" зона под
// текст (незакрытая маской) слишком маленькая для более длинных фраз
// ("design!!!", "motion!!!") — часть слова обрезалась. Оставили только
// надёжный вид, который не зависел от длины текста.
function SpeechBubble({ text }: { text: string }) {
  return (
    <div className="relative">
      <div className="whitespace-nowrap rounded-2xl border-2 border-neutral-900 bg-white px-3 py-1.5 text-xs font-bold text-neutral-900 shadow-sm">
        {text}
      </div>
      <div className="absolute -bottom-1.5 left-5 h-3 w-3 rotate-45 border-b-2 border-l-2 border-neutral-900 bg-white" />
    </div>
  );
}

const PHRASES = ["design!!!", "motion!!!", "бууу!"];

interface GhostSpec {
  top: string;
  left?: string;
  right?: string;
  width: number;
  color: string;
  parallaxX: number;
  parallaxY: number;
  floatDuration: number;
  floatDelay: number;
}

const GHOSTS: GhostSpec[] = [
  { top: "-2rem", left: "-3rem", width: 130, color: "--accent", parallaxX: 0.55, parallaxY: 0.06, floatDuration: 7, floatDelay: 0 },
  { top: "16rem", right: "-2rem", width: 100, color: "--accent-blue", parallaxX: -0.45, parallaxY: 0.05, floatDuration: 8.5, floatDelay: 1.2 },
  { top: "40rem", left: "6%", width: 80, color: "--accent", parallaxX: 0.3, parallaxY: -0.04, floatDuration: 6.5, floatDelay: 2.4 },
  { top: "58rem", right: "10%", width: 110, color: "--accent-blue", parallaxX: -0.35, parallaxY: 0.04, floatDuration: 9, floatDelay: 0.6 },
];

const PULL_STRENGTH = 0.22;
const PULL_MAX = 160; // px
const PULL_LERP = 0.02; // очень медленно — заметно, только если держать курсор
const BUBBLE_LIFETIME_MS = 1800;

function floatStyle(g: GhostSpec): React.CSSProperties {
  return { animation: `ghost-float ${g.floatDuration}s ease-in-out infinite`, animationDelay: `${g.floatDelay}s` };
}

export function ParallaxBackdrop({ hotspotRoot }: { hotspotRoot: HTMLElement | null }) {
  const visualRefs = useRef<(HTMLDivElement | null)[]>([]);
  const hotspotRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [bubbles, setBubbles] = useState<Record<number, { text: string; key: number }>>({});
  const timeoutsRef = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  // Раньше узел портала искали сами через document.getElementById() внутри
  // useEffect + setState — рабочий, но не идеальный паттерн (setState прямо
  // в эффекте). Правильнее отдать владение узлом тому, кто его рендерит
  // (page.tsx) — он получает DOM-ноду через callback-ref и передаёт её сюда
  // пропом, без лишнего эффекта и лишнего рендера здесь.

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const cursor = { x: -9999, y: -9999, active: false };
    function onPointerMove(e: PointerEvent) {
      cursor.x = e.clientX;
      cursor.y = e.clientY;
      cursor.active = true;
    }
    function onPointerLeave() {
      cursor.active = false;
    }
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerleave", onPointerLeave, { passive: true });

    let mainEl = document.querySelector("main");
    function refreshMain() {
      mainEl = document.querySelector("main");
    }
    window.addEventListener("resize", refreshMain);

    const pullOffsets = GHOSTS.map(() => ({ x: 0, y: 0 }));

    let raf = 0;
    function tick() {
      const scrollY = window.scrollY;
      const mainRect = mainEl?.getBoundingClientRect();
      const inEmptyZone =
        cursor.active && mainRect ? cursor.x < mainRect.left || cursor.x > mainRect.right : false;

      GHOSTS.forEach((g, i) => {
        // позицию меряем по видимому слою — он всегда смонтирован; хотспот
        // (портал) может домонтироваться на кадр позже, но это неважно,
        // т.к. transform всё равно применяется к обоим одинаково.
        const visualEl = visualRefs.current[i];
        const hotspotEl = hotspotRefs.current[i];
        if (!visualEl) return;

        let targetX = 0;
        let targetY = 0;
        if (inEmptyZone) {
          const rect = visualEl.getBoundingClientRect();
          const cx = rect.left + rect.width / 2;
          const cy = rect.top + rect.height / 2;
          const dx = (cursor.x - cx) * PULL_STRENGTH;
          const dy = (cursor.y - cy) * PULL_STRENGTH;
          const dist = Math.hypot(dx, dy) || 1;
          const clampScale = Math.min(1, PULL_MAX / dist);
          targetX = dx * clampScale;
          targetY = dy * clampScale;
        }

        const p = pullOffsets[i];
        p.x += (targetX - p.x) * PULL_LERP;
        p.y += (targetY - p.y) * PULL_LERP;

        const scrollX = scrollY * g.parallaxX;
        const scrollYOff = scrollY * g.parallaxY;
        const transform = `translate3d(${scrollX + p.x}px, ${scrollYOff + p.y}px, 0)`;
        visualEl.style.transform = transform;
        if (hotspotEl) hotspotEl.style.transform = transform;
      });

      raf = requestAnimationFrame(tick);
    }
    tick();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerleave", onPointerLeave);
      window.removeEventListener("resize", refreshMain);
    };
  }, []);

  useEffect(() => {
    const timeouts = timeoutsRef.current;
    return () => {
      Object.values(timeouts).forEach(clearTimeout);
    };
  }, []);

  function handleGhostClick(i: number) {
    // тот же случайный выбор фразы, что и был — просто без рандома формы пузыря.
    // Это обработчик клика (вызывается только из onClick ниже), а не тело
    // рендера — Math.random() здесь безопасен, линтер (react-compiler-
    // ориентированное правило) не умеет отличать вызов внутри
    // event-хендлера от вызова во время рендера.
    // eslint-disable-next-line react-hooks/purity
    const text = PHRASES[Math.floor(Math.random() * PHRASES.length)];
    setBubbles((prev) => ({ ...prev, [i]: { text, key: Date.now() } }));
    clearTimeout(timeoutsRef.current[i]);
    timeoutsRef.current[i] = setTimeout(() => {
      setBubbles((prev) => {
        const next = { ...prev };
        delete next[i];
        return next;
      });
    }, BUBBLE_LIFETIME_MS);
  }

  const keyframesStyle = (
    <style>{`
      @keyframes ghost-float {
        0%   { transform: translate(0, 0) rotate(0deg); }
        25%  { transform: translate(6px, -14px) rotate(-2deg); }
        50%  { transform: translate(-4px, -22px) rotate(1.5deg); }
        75%  { transform: translate(-8px, -8px) rotate(2deg); }
        100% { transform: translate(0, 0) rotate(0deg); }
      }
      @keyframes bubble-pop {
        0%   { transform: scale(0.4) translateY(0); opacity: 0; }
        15%  { transform: scale(1.08) translateY(0); opacity: 1; }
        25%  { transform: scale(1) translateY(0); opacity: 1; }
        80%  { transform: scale(1) translateY(0); opacity: 1; }
        100% { transform: scale(0.94) translateY(-10px); opacity: 0; }
      }
    `}</style>
  );

  // Видимый слой — уходит под контент. Важно: -z-10 здесь ОБЯЗАТЕЛЕН, а
  // не просто раннее место в разметке — я ошибся раньше, думая, что порядок
  // в DOM сам по себе решает. На самом деле position:fixed красится в
  // отдельной, более ПОЗДНЕЙ фазе отрисовки, чем обычные статичные блоки
  // (карточки, шапка), вообще независимо от того, где элемент стоит в
  // разметке — единственное, что реально задвигает fixed-слой НАЗАД
  // относительно обычного контента, это отрицательный z-index. Кликам
  // это уже не мешает: они идут через отдельный портал-слой ниже.
  const visualLayer = (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      {keyframesStyle}
      {GHOSTS.map((g, i) => (
        <div
          key={i}
          ref={(el) => {
            visualRefs.current[i] = el;
          }}
          className="absolute"
          style={{ top: g.top, left: g.left, right: g.right }}
        >
          <div style={floatStyle(g)}>
            <GhostSvg colorVar={g.color} width={g.width} />
          </div>
        </div>
      ))}
    </div>
  );

  // Кликабельный слой — невидимый, но на самом верху (портал в конец
  // разметки), чтобы клик реально доходил, независимо от того, что
  // визуально в этом месте страницы стоит поверх видимого привидения.
  const hotspotLayer = (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      {GHOSTS.map((g, i) => {
        const bubble = bubbles[i];
        return (
          <div
            key={i}
            ref={(el) => {
              hotspotRefs.current[i] = el;
            }}
            className="absolute"
            style={{ top: g.top, left: g.left, right: g.right }}
          >
            <div style={floatStyle(g)}>
              <div className="relative">
                {bubble && (
                  <div
                    key={bubble.key}
                    className="pointer-events-none absolute bottom-full left-1/2 mb-1 -translate-x-1/2"
                    style={{ animation: `bubble-pop ${BUBBLE_LIFETIME_MS}ms ease-out forwards` }}
                  >
                    <SpeechBubble text={bubble.text} />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => handleGhostClick(i)}
                  className="pointer-events-auto block cursor-pointer bg-transparent p-0 opacity-0"
                  style={{ width: g.width, height: (g.width * 118) / 100 }}
                  aria-label="Привидение — нажми, чтобы что-то сказало"
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <>
      {visualLayer}
      {hotspotRoot ? createPortal(hotspotLayer, hotspotRoot) : null}
    </>
  );
}
