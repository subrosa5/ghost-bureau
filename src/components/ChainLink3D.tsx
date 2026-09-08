"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * Декоративный 3D-элемент, вдохновлённый рендером на mox-studio.ru —
 * тёмное глянцевое звено цепи со студийным светом. Сам ассет не тянем
 * (это их файл), пересобираем ощущение материала/света своими силами.
 *
 * Форма — "стадион" (скруглённый прямоугольник, вытянутая капсула), не
 * обычный THREE.TorusGeometry (идеальный бублик — у настоящей цепи звенья
 * вытянутые). Два звена стоят в перпендикулярных плоскостях и продеты
 * друг в друга по вертикали — как в реальном звене, а не просто рядом.
 */

// Параметрическая кривая "стадион": две прямые стороны длиной L, соединённые
// двумя полуокружностями радиуса r слева и справа. По умолчанию — "лежачая"
// (широкая) форма; чтобы получить "стоячее" звено, кривую разворачивают на
// 90° после построения (rotation.z), а не меняют местами x/y в формуле —
// так проще не ошибиться в непрерывности стыков.
class StadiumCurve extends THREE.Curve<THREE.Vector3> {
  constructor(
    private straight: number,
    private radius: number
  ) {
    super();
  }
  getPoint(t: number, target = new THREE.Vector3()) {
    const L = this.straight;
    const r = this.radius;
    const perim = 2 * L + 2 * Math.PI * r;
    const d = t * perim;
    let x: number, y: number;
    if (d < L) {
      // верхняя прямая, слева направо
      x = -L / 2 + d;
      y = r;
    } else if (d < L + Math.PI * r) {
      // правая полуокружность, сверху вниз, выпуклость вправо
      const a = (d - L) / r; // 0..π
      const ang = Math.PI / 2 - a; // π/2 -> -π/2
      x = L / 2 + r * Math.cos(ang);
      y = r * Math.sin(ang);
    } else if (d < 2 * L + Math.PI * r) {
      // нижняя прямая, справа налево
      x = L / 2 - (d - L - Math.PI * r);
      y = -r;
    } else {
      // левая полуокружность, снизу вверх, выпуклость влево
      const a = (d - 2 * L - Math.PI * r) / r; // 0..π
      const ang = -Math.PI / 2 - a; // -π/2 -> -3π/2
      x = -L / 2 + r * Math.cos(ang);
      y = r * Math.sin(ang);
    }
    return target.set(x, y, 0);
  }
}

function makeLink(straight: number, radius: number, tube: number) {
  const curve = new StadiumCurve(straight, radius);
  const geo = new THREE.TubeGeometry(curve, 160, tube, 28, true);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x232323,
    roughness: 0.3,
    metalness: 0.35,
  });
  return new THREE.Mesh(geo, mat);
}

export function ChainLink3D({ size = 220 }: { size?: number }) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // WebGL доступен не везде одинаково — во встроенных браузерах (Telegram
    // in-app и т.п.) на части устройств контекст может не создаться вообще.
    // Это чисто декоративный элемент, поэтому при любой ошибке инициализации
    // тихо ничего не рисуем, а не роняем всю страницу неотловленным
    // исключением из эффекта.
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      return;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    camera.position.set(0.8, 0.3, 8);
    camera.lookAt(0, 0, 0);

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(size, size);
    mount.appendChild(renderer.domElement);

    // студийная трёхточечная схема — ключевой, заполняющий, контровой
    const key = new THREE.DirectionalLight(0xffffff, 2.4);
    key.position.set(4, 5, 6);
    const fill = new THREE.DirectionalLight(0xffffff, 0.7);
    fill.position.set(-5, -1, 3);
    const rim = new THREE.DirectionalLight(0xffffff, 1.4);
    rim.position.set(-3, 4, -6);
    const ambient = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(key, fill, rim, ambient);

    // одна форма-донор — оба звена собраны из неё, просто по-разному
    // повёрнуты и сдвинуты, ровно как звенья настоящей цепи.
    const STRAIGHT = 1.0;
    const RADIUS = 0.42;
    const TUBE = 0.2;
    const linkHeight = STRAIGHT + 2 * RADIUS; // после разворота в "стоячее" положение

    const group = new THREE.Group();

    const linkBottom = makeLink(STRAIGHT, RADIUS, TUBE);
    linkBottom.rotation.z = Math.PI / 2; // сделать "стоячим" (вертикальным)
    linkBottom.position.y = -linkHeight * 0.28;

    const linkTop = makeLink(STRAIGHT, RADIUS, TUBE);
    linkTop.rotation.z = Math.PI / 2; // тоже вертикальное
    linkTop.rotation.y = Math.PI / 2; // но в перпендикулярной плоскости — продето сквозь нижнее
    linkTop.position.y = linkHeight * 0.28;

    group.add(linkBottom, linkTop);
    const base = { x: 0.15, z: 0.05 };
    group.rotation.set(base.x, -0.35, base.z);
    scene.add(group);

    // По умолчанию модель сама крутится в среднем темпе (полный оборот
    // примерно за 9 секунд), показывая себя со всех сторон. Когда курсор
    // оказывается ПРЯМО НАД моделью — вращение по Y начинает следовать за
    // положением курсора внутри неё (без клика, просто наведение — как
    // будто крутишь 3D-объект пальцем). Как только курсор уходит —
    // автовращение продолжается с той точки, где остановилось, тем же
    // темпом и в ту же сторону — без рывка и без "возврата в исходную".
    const IDLE_SPEED = 0.0125; // рад/кадр
    let rotY = group.rotation.y;
    let rotX = base.x;
    let hovering = false;
    let targetRotY = rotY;
    let targetRotX = base.x;
    // угол по Y на момент, когда курсор зашёл на модель — цель вращения
    // при наведении считается ОТНОСИТЕЛЬНО него, а не от нуля. Без этого
    // после нескольких оборотов автовращения (rotY уже большое число)
    // наведение курсора дёргало бы модель назад к маленькому абсолютному
    // углу — видимая перемотка вместо плавного "подхвата".
    let hoverBaseY = rotY;

    function onEnter() {
      hovering = true;
      hoverBaseY = rotY;
    }
    function onLeave() {
      hovering = false;
    }
    function onPointerMove(e: PointerEvent) {
      if (!hovering) return;
      const rect = mount!.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1; // -1..1 слева направо
      const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1; // -1..1 сверху вниз
      targetRotY = hoverBaseY + nx * 1.6; // курсор слева-направо -> поворот вокруг Y
      targetRotX = base.x - ny * 0.4; // курсор сверху-вниз -> лёгкий наклон по X
    }

    if (!reduced) {
      mount.addEventListener("pointerenter", onEnter);
      mount.addEventListener("pointerleave", onLeave);
      mount.addEventListener("pointermove", onPointerMove);
    }

    let raf = 0;
    function tick() {
      if (!reduced) {
        if (hovering) {
          // отзывчиво следуем за курсором, пока он над моделью
          rotY += (targetRotY - rotY) * 0.18;
          rotX += (targetRotX - rotX) * 0.18;
        } else {
          // автовращение продолжается с текущего угла — никакого сброса;
          // наклон по X тем временем мягко возвращается к базовому уровню
          rotY += IDLE_SPEED;
          rotX += (base.x - rotX) * 0.02;
        }
      }
      group.rotation.y = rotY;
      group.rotation.x = rotX;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    }
    tick();

    return () => {
      cancelAnimationFrame(raf);
      mount.removeEventListener("pointerenter", onEnter);
      mount.removeEventListener("pointerleave", onLeave);
      mount.removeEventListener("pointermove", onPointerMove);
      renderer.dispose();
      linkBottom.geometry.dispose();
      linkTop.geometry.dispose();
      (linkBottom.material as THREE.Material).dispose();
      (linkTop.material as THREE.Material).dispose();
      mount.removeChild(renderer.domElement);
    };
  }, [size]);

  return <div ref={mountRef} style={{ width: size, height: size }} aria-hidden="true" />;
}
