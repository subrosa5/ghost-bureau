"use client";

import { useEffect, useMemo, useState } from "react";
import { GhostForm } from "@/components/GhostForm";
import { AssignmentBoard, PlacesOverview } from "@/components/AssignmentBoard";
import { ChainLink3D } from "@/components/ChainLink3D";
import { ParallaxBackdrop } from "@/components/ParallaxBackdrop";
import { ReportView } from "@/components/ReportView";
import { WorklogView } from "@/components/WorklogView";
import { allocate } from "@/lib/matching";
import { buildReport } from "@/lib/report";
import { seedGhosts, seedPlaces } from "@/lib/seed";
import type { GhostRequest } from "@/lib/types";

type Tab = "requests" | "report" | "worklog";

export default function Home() {
  const [ghosts, setGhosts] = useState<GhostRequest[]>(seedGhosts);
  const [manualOverrides, setManualOverrides] = useState<Record<string, string>>({});
  const [tab, setTab] = useState<Tab>("requests");
  const places = seedPlaces;

  // Узел-цель портала для кликабельного слоя привидений (см. ParallaxBackdrop
  // и комментарий у #ghost-hotspot-root ниже) — владеем им здесь, где он
  // рендерится, и отдаём вниз пропом. callback-ref вызывает setState прямо
  // при подключении/отключении DOM-ноды — это ровно тот случай, для
  // которого callback-ref и предназначен, в отличие от useEffect +
  // document.getElementById(), который раньше был внутри самого
  // ParallaxBackdrop.
  const [hotspotRoot, setHotspotRoot] = useState<HTMLDivElement | null>(null);

  // без этого дедлайн, истёкший "прямо во время просмотра" (вкладка открыта
  // и просто ждёт), не пересчитался бы, пока не случится какое-то другое
  // действие с заявками — allocate() принимает точку отсчёта явным
  // параметром именно для этого.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const { assignments, unresolved } = useMemo(() => allocate(ghosts, places, now), [ghosts, places, now]);

  // финальные назначения = автоматические, поверх которых наложены ручные
  // переопределения оператора. ВАЖНО: строим по всем ghosts, а не только по
  // assignments — иначе ручное расселение изначально нерасселённого
  // привидения (например, у которого не было подходящего места) нигде не
  // учитывалось бы: occupancy мест и отчёт продолжали бы считать его
  // проблемным, хотя карточка заявки уже показывает успешное расселение.
  const finalAssignments = useMemo(() => {
    const autoByGhost = Object.fromEntries(assignments.map((a) => [a.ghostId, a]));
    return ghosts
      .map((g) => {
        const manualPlaceId = manualOverrides[g.id];
        const auto = autoByGhost[g.id];
        if (manualPlaceId) {
          return {
            ghostId: g.id,
            placeId: manualPlaceId,
            score: auto?.score ?? 0,
            reasons: auto?.reasons ?? [],
            manual: true,
            warning: null,
          };
        }
        return auto ?? null;
      })
      .filter((a): a is NonNullable<typeof a> => a !== null);
  }, [ghosts, assignments, manualOverrides]);

  const finalOccupancy = useMemo(() => {
    const occ: Record<string, number> = Object.fromEntries(places.map((p) => [p.id, 0]));
    for (const a of finalAssignments) {
      if (a.placeId) occ[a.placeId] = (occ[a.placeId] ?? 0) + 1;
    }
    return occ;
  }, [finalAssignments, places]);

  // из unresolved убираем тех, кого оператор всё же расселил вручную —
  // иначе отчёт противоречил бы карточке заявки (одно и то же привидение
  // не может одновременно быть "расселено" и "проблемной заявкой").
  const finalUnresolved = useMemo(
    () => unresolved.filter((u) => !manualOverrides[u.ghostId]),
    [unresolved, manualOverrides]
  );

  const report = useMemo(
    () => buildReport(ghosts, places, finalAssignments, finalUnresolved),
    [ghosts, places, finalAssignments, finalUnresolved]
  );

  function handleAdd(ghost: GhostRequest) {
    setGhosts((prev) => [...prev, ghost]);
  }

  function handleRemove(ghostId: string) {
    setGhosts((prev) => prev.filter((g) => g.id !== ghostId));
    setManualOverrides((prev) => {
      const next = { ...prev };
      delete next[ghostId];
      return next;
    });
  }

  function handleManualChange(ghostId: string, placeId: string) {
    setManualOverrides((prev) => {
      const next = { ...prev };
      if (placeId) next[ghostId] = placeId;
      else delete next[ghostId];
      return next;
    });
  }

  function handleClearAll() {
    setGhosts([]);
    setManualOverrides({});
  }

  function handleLoadDemo() {
    setGhosts(seedGhosts);
    setManualOverrides({});
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "requests", label: "Заявки" },
    { id: "report", label: "Отчёт" },
    { id: "worklog", label: "AI Worklog" },
  ];

  return (
    // без bg-white здесь: фон и так задан на <body> (globals.css) —
    // если продублировать его тут, эта обычная (не fixed/не позиционированная)
    // заливка красится ПОВЕРХ фонового fixed-слоя по правилам порядка
    // отрисовки — ровно поэтому пятна параллакса были не видны.
    <div className="min-h-screen text-neutral-900">
      {/* Видимый слой привидений — специально в начале разметки: элемент,
          который в DOM раньше, красится ПОД тем, что идёт позже (header
          с непрозрачным bg-swatch и карточки с bg-white) — так они
          визуально уходят под контент, а не поверх него. Кликабельность
          при этом не страдает — за неё отвечает отдельный невидимый слой
          в самом конце (#ghost-hotspot-root ниже), см. ParallaxBackdrop.tsx. */}
      <ParallaxBackdrop hotspotRoot={hotspotRoot} />
      <header className="flex items-center justify-between gap-4 border-b border-border bg-swatch px-6 py-6 sm:py-10">
        {/* Точный референс — их же wordmark ("BRANDING × DIGITAL"): светло-серая
            плашка (тот же #ececec, что у них под фирменным блоком), чисто
            чёрный текст (никакого цветного акцента здесь), умеренный вес
            (не extrabold — у них это где-то Medium/SemiBold), широкий трекинг.
            Подзаголовок ниже — намеренно другой, более читаемый уровень
            иерархии на обычном белом фоне, не часть самого wordmark. */}
        <h1 className="text-3xl font-semibold uppercase tracking-wide text-black sm:text-5xl">
          Бюро переселения × Привидений
        </h1>
        {/* 3D-элемент в духе их студийного рендера цепи — своя форма/сцена,
            не их файл, см. ChainLink3D.tsx. Прячем на совсем узких экранах,
            чтобы не спорил с заголовком за место. */}
        <div className="hidden shrink-0 sm:block">
          <ChainLink3D size={140} />
        </div>
      </header>
      {/* Типографика тела текста по их референсу: крупно, светлым весом,
          приглушённый серый как база — и несколько ключевых слов ярче/
          жирнее внутри той же фразы, а не отдельным акцентным цветом. */}
      <p className="border-b border-border px-6 py-6 text-xl font-normal leading-snug text-neutral-400 sm:py-8 sm:text-2xl">
        Подбираем привидениям <span className="font-medium text-neutral-900">новые места обитания</span> — с
        объяснением решений и учётом <span className="font-medium text-neutral-900">конфликтов</span>.
      </p>

      <nav className="flex gap-1 border-b border-border px-6">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-3 text-sm font-medium transition ${
              tab === t.id
                ? "border-b-2 border-accent text-accent"
                : "text-neutral-500 hover:text-neutral-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main className="mx-auto max-w-5xl px-6 py-6">
        {tab === "requests" && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
            <div className="space-y-4">
              <GhostForm onAdd={handleAdd} />
              <div className="flex gap-2">
                <button
                  onClick={handleClearAll}
                  className="flex-1 rounded border border-border-strong px-3 py-1.5 text-xs text-neutral-500 hover:border-red-300 hover:text-red-600"
                >
                  Очистить все заявки
                </button>
                <button
                  onClick={handleLoadDemo}
                  className="flex-1 rounded border border-border-strong px-3 py-1.5 text-xs text-neutral-500 hover:border-accent hover:text-accent"
                >
                  Загрузить пример
                </button>
              </div>
              <div>
                <h3 className="mb-2 text-sm font-semibold text-neutral-700">Места переселения</h3>
                <PlacesOverview places={places} occupancy={finalOccupancy} />
              </div>
            </div>

            <AssignmentBoard
              ghosts={ghosts}
              places={places}
              assignments={assignments}
              unresolved={unresolved}
              occupancy={finalOccupancy}
              manualOverrides={manualOverrides}
              onManualChange={handleManualChange}
              onRemoveGhost={handleRemove}
            />
          </div>
        )}

        {tab === "report" && <ReportView report={report} />}
        {tab === "worklog" && <WorklogView />}
      </main>

      {/* Цель для портала кликабельного (невидимого) слоя привидений —
          намеренно в самом конце разметки, чтобы клики по нему реально
          доходили (элемент, который в DOM позже, красится/кликается
          поверх того, что раньше). Сам видимый слой при этом остаётся
          рано в разметке (см. <ParallaxBackdrop/> вверху) — визуально
          привидения по-прежнему уходят под контент. */}
      <div id="ghost-hotspot-root" ref={setHotspotRoot} />
    </div>
  );
}
