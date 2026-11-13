"use client";

import { AppLink as Link } from "@/components/app-link";
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type Ref } from "react";
import { ProtectedImage } from "@/components/cloudinary-image";

export type CarouselItem = {
  href: string;
  title: string;
  cta?: string;
  image?: { publicId: string; alt?: string; width: number; height: number } | null;
  // Tiny blurred copy of the image, shown until the full picture has loaded.
  placeholder?: string;
};

// Motion model (matches the reference site): a constant idle drift, plus a velocity impulse from
// wheel or page-scroll input that decays each frame. Scroll direction sets the drift direction, so
// scrolling down moves the row right-to-left and scrolling up moves it left-to-right.
// The idle drift is 6rem per second, where rem is the root font size. That size is vw/192 on
// desktop and min(vw/37.5, 12px) below 1024px, so phones and tablets move faster.
const DRIFT_REM = 6;
const ADAPTIVE_BREAKPOINT = 1024;
const DESKTOP_ROOT_DIVISOR = 192;
const ADAPTIVE_ROOT_DIVISOR = 37.5;
const ADAPTIVE_ROOT_MAX = 12;
const WHEEL_GAIN = 2;
const SCROLL_GAIN = 2;
// A wheel gesture also fires scroll events; ignore those so the impulse isn't applied twice.
const WHEEL_SCROLL_OVERLAP_MS = 150;
const DRAG_CLICK_THRESHOLD = 6;
const KEY_IMPULSE = 800;
const MAX_VELOCITY = 6000;
const DECAY_PER_FRAME = 0.92;
const DIRECTION_EASE = 6;
const START_DIRECTION = -1; // before any scroll the row moves left-to-right

// Each picture is drawn 130% of its frame width, so it can slide up to 15% of the frame each way.
const OVERSCAN = 0.15;
const PARALLAX_DESKTOP = 0.15;
const PARALLAX_MOBILE = 0.1;

type MotionState = {
  x: number;
  v: number;
  dir: number;
  dirNow: number;
  period: number;
  running: boolean;
  raf: number;
  last: number;
};

const clampVelocity = (v: number) => Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, v));

function driftPerSecond(viewportWidth: number) {
  const rootPx =
    viewportWidth < ADAPTIVE_BREAKPOINT
      ? Math.min(viewportWidth / ADAPTIVE_ROOT_DIVISOR, ADAPTIVE_ROOT_MAX)
      : viewportWidth / DESKTOP_ROOT_DIVISOR;
  return DRIFT_REM * rootPx;
}

// Shift each picture against its tile's position in the viewport, so the image appears to slide
// inside its frame as the row moves. Offscreen tiles are skipped.
function applyParallax(track: HTMLElement, viewportWidth: number) {
  const halfW = viewportWidth / 2;
  const shift = viewportWidth < ADAPTIVE_BREAKPOINT ? PARALLAX_MOBILE : PARALLAX_DESKTOP;
  for (const layer of track.querySelectorAll<HTMLElement>("[data-parallax]")) {
    const frame = layer.parentElement;
    if (!frame) continue;
    const r = frame.getBoundingClientRect();
    if (r.right < 0 || r.left > viewportWidth) continue;
    const p = Math.max(-1, Math.min(1, (r.left + r.width / 2 - halfW) / (halfW + r.width / 2)));
    layer.style.transform = `translateX(${(-p * shift * r.width).toFixed(2)}px)`;
  }
}

export function FeaturedCarousel({ items, label = "Featured work" }: { items: CarouselItem[]; label?: string }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const groupRef = useRef<HTMLDivElement>(null);
  const [copies, setCopies] = useState(2);
  const motion = useRef<MotionState>({
    x: 0,
    v: 0,
    dir: START_DIRECTION,
    dirNow: START_DIRECTION,
    period: 0,
    running: false,
    raf: 0,
    last: 0,
  });

  useEffect(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    const group = groupRef.current;
    if (!viewport || !track || !group) return;
    const s = motion.current;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // One group is one loop period. Copies must cover the viewport plus one period, otherwise the
    // track runs out at the edge while it wraps and a gap shows.
    const measure = () => {
      s.period = group.offsetWidth;
      if (s.period > 0) setCopies(Math.max(2, Math.ceil(viewport.clientWidth / s.period) + 1));
    };
    measure();
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(group);

    const wrap = (x: number) => {
      if (s.period <= 0) return x;
      let wrapped = x % s.period;
      if (wrapped > 0) wrapped -= s.period;
      return wrapped;
    };

    const frame = (now: number) => {
      if (!s.running) return;
      const dt = Math.min(0.05, (now - s.last) / 1000);
      s.last = now;

      s.dirNow += (s.dir - s.dirNow) * Math.min(1, dt * DIRECTION_EASE);
      const drift = reduced ? 0 : driftPerSecond(window.innerWidth) * s.dirNow;
      const speed = drift + s.v;
      s.x = wrap(s.x - speed * dt);
      track.style.transform = `translate3d(${s.x.toFixed(2)}px,0,0)`;
      if (!reduced) applyParallax(track, window.innerWidth);

      s.v = clampVelocity(s.v) * Math.pow(DECAY_PER_FRAME, dt * 60);
      if (Math.abs(s.v) < 0.5) s.v = 0;

      s.raf = requestAnimationFrame(frame);
    };

    // Only animate while the carousel is on screen.
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !s.running) {
        s.running = true;
        s.last = performance.now();
        s.raf = requestAnimationFrame(frame);
      } else if (!entry.isIntersecting && s.running) {
        s.running = false;
        cancelAnimationFrame(s.raf);
      }
    });
    observer.observe(viewport);

    let lastWheel = -Infinity;
    const onWheel = (event: WheelEvent) => {
      lastWheel = performance.now();
      if (!s.running || reduced) return;
      if (Math.abs(event.deltaY) > 1) s.dir = event.deltaY > 0 ? 1 : -1;
      s.v = clampVelocity(s.v + event.deltaY * WHEEL_GAIN);
    };
    window.addEventListener("wheel", onWheel, { passive: true });

    // Touch screens never fire wheel events, so follow the page scroll itself. This covers finger
    // drags, momentum, keyboard and scrollbar scrolling, wherever on the page the gesture starts.
    let lastY = window.scrollY;
    const onPageScroll = () => {
      const maxY = document.documentElement.scrollHeight - window.innerHeight;
      // Skip iOS rubber-band overscroll, which would flip the direction spuriously.
      if (window.scrollY < 0 || window.scrollY > maxY) return;
      const dy = window.scrollY - lastY;
      lastY = window.scrollY;
      if (!s.running || reduced || performance.now() - lastWheel < WHEEL_SCROLL_OVERLAP_MS) return;
      if (Math.abs(dy) > 1) s.dir = dy > 0 ? 1 : -1;
      s.v = clampVelocity(s.v + dy * SCROLL_GAIN);
    };
    window.addEventListener("scroll", onPageScroll, { passive: true });

    // A mouse or pen drag doesn't scroll the page, so read it directly: dragging up acts like
    // scrolling down. Touch is left to the browser's own pan and handled by the scroll listener.
    let dragY: number | null = null;
    let dragDistance = 0;
    let dragged = false;
    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === "touch" || event.button !== 0) return;
      dragY = event.clientY;
      dragDistance = 0;
      dragged = false;
    };
    const onPointerMove = (event: PointerEvent) => {
      if (dragY === null) return;
      const dy = dragY - event.clientY;
      dragY = event.clientY;
      dragDistance += Math.abs(dy);
      if (dragDistance > DRAG_CLICK_THRESHOLD) dragged = true;
      if (!s.running || reduced) return;
      if (Math.abs(dy) > 1) s.dir = dy > 0 ? 1 : -1;
      s.v = clampVelocity(s.v + dy * SCROLL_GAIN);
    };
    const onPointerEnd = () => {
      dragY = null;
    };
    // Releasing a drag over a tile would otherwise open it.
    const onClickCapture = (event: MouseEvent) => {
      if (!dragged) return;
      dragged = false;
      event.preventDefault();
      event.stopPropagation();
    };
    viewport.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerup", onPointerEnd);
    window.addEventListener("pointercancel", onPointerEnd);
    viewport.addEventListener("click", onClickCapture, true);

    // Browsers can scroll an overflow:hidden box when a focused link is off-screen; undo that.
    const onScroll = () => {
      viewport.scrollLeft = 0;
    };
    viewport.addEventListener("scroll", onScroll);

    return () => {
      cancelAnimationFrame(s.raf);
      s.running = false;
      observer.disconnect();
      resizeObserver.disconnect();
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("scroll", onPageScroll);
      viewport.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerEnd);
      window.removeEventListener("pointercancel", onPointerEnd);
      viewport.removeEventListener("click", onClickCapture, true);
      viewport.removeEventListener("scroll", onScroll);
    };
  }, []);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const s = motion.current;
    if (event.key === "ArrowRight") {
      event.preventDefault();
      s.v = clampVelocity(s.v + KEY_IMPULSE);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      s.v = clampVelocity(s.v - KEY_IMPULSE);
    }
  }

  if (items.length === 0) return null;

  return (
    <div
      ref={viewportRef}
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
      tabIndex={0}
      onKeyDown={onKeyDown}
      className="relative w-full touch-pan-y select-none overflow-hidden"
      style={{ "--h": "55svh" } as CSSProperties}
    >
      <div ref={trackRef} className="flex w-max will-change-transform">
        {Array.from({ length: copies }, (_, index) => (
          <Group key={index} items={items} groupRef={index === 0 ? groupRef : undefined} hidden={index > 0} />
        ))}
      </div>
    </div>
  );
}

function Group({ items, groupRef, hidden = false }: { items: CarouselItem[]; groupRef?: Ref<HTMLDivElement>; hidden?: boolean }) {
  return (
    <div ref={groupRef} aria-hidden={hidden || undefined} className="flex shrink-0 gap-8 pr-8">
      {items.map((item, index) => (
        <Tile key={`${hidden ? "b" : "a"}-${item.href}`} item={item} hidden={hidden} eager={!hidden && index < 3} />
      ))}
    </div>
  );
}

function Tile({ item, hidden, eager }: { item: CarouselItem; hidden: boolean; eager: boolean }) {
  const ratio = item.image && item.image.height ? item.image.width / item.image.height : 0.8;
  // Tile height is 55svh and its width follows the image ratio. The image box is overscanned on both
  // sides, so the rendered width is larger than the tile. `sizes` needs that real width.
  const imageSizes = `calc(55svh * ${(ratio * (1 + OVERSCAN * 2)).toFixed(4)})`;

  return (
    <Link
      href={item.href}
      draggable={false}
      tabIndex={hidden ? -1 : undefined}
      className="group flex shrink-0 flex-col gap-3"
      style={{ width: `calc(var(--h) * ${ratio.toFixed(4)})` }}
    >
      <span className="relative block h-(--h) w-full overflow-hidden bg-surface">
        <span
          data-parallax
          className="absolute inset-y-0 will-change-transform"
          style={{ left: `-${OVERSCAN * 100}%`, width: `${(1 + OVERSCAN * 2) * 100}%` }}
        >
          {item.image ? (
            <ProtectedImage
              src={item.image.publicId}
              alt={item.image.alt || item.title}
              fill
              crop="fill"
              gravity="auto"
              sizes={imageSizes}
              draggable={false}
              className="object-cover"
              loading={eager ? "eager" : "lazy"}
              placeholder={item.placeholder ? "blur" : "empty"}
              blurDataURL={item.placeholder}
            />
          ) : null}
        </span>
        <span className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-background px-3 py-1 text-xs text-foreground opacity-0 transition group-hover:opacity-100">
          {item.cta ?? "View work"}
        </span>
      </span>
      <span className="truncate text-sm text-foreground">{item.title}</span>
    </Link>
  );
}
