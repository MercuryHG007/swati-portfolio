"use client";

import Link from "next/link";
import { useEffect, useRef, type CSSProperties, type KeyboardEvent, type MouseEvent, type PointerEvent, type Ref } from "react";
import { ProtectedImage } from "@/components/cloudinary-image";

export type CarouselItem = {
  href: string;
  title: string;
  cta?: string;
  image?: { publicId: string; alt?: string; width: number; height: number } | null;
};

// Motion model (matches the reference site): a constant idle drift scaled to the viewport width,
// plus a velocity impulse from wheel input that decays each frame. Wheel direction sets the drift
// direction, so scrolling down moves the row right-to-left and scrolling up moves it left-to-right.
const DRIFT_DIVISOR = 32; // idle speed = innerWidth / 32 px per second
const WHEEL_GAIN = 2;
const KEY_IMPULSE = 800;
const MAX_VELOCITY = 6000;
const DECAY_PER_FRAME = 0.92;
const DIRECTION_EASE = 6;
const FLING_FACTOR = 0.9;
const DRAG_SLOP = 6;
const START_DIRECTION = -1; // before any scroll the row moves left-to-right

// Each picture is drawn 130% of its frame width, so it can slide up to 15% of the frame each way.
const OVERSCAN = 0.15;
const PARALLAX_DESKTOP = 0.15;
const PARALLAX_MOBILE = 0.1;
const MOBILE_BREAKPOINT = 768;

type MotionState = {
  x: number;
  v: number;
  dir: number;
  dirNow: number;
  period: number;
  running: boolean;
  raf: number;
  last: number;
  dragging: boolean;
  captured: boolean;
  lastX: number;
  lastT: number;
  dragV: number;
  moved: number;
};

const clampVelocity = (v: number) => Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, v));

// Shift each picture against its tile's position in the viewport, so the image appears to slide
// inside its frame as the row moves. Offscreen tiles are skipped.
function applyParallax(track: HTMLElement, viewportWidth: number) {
  const halfW = viewportWidth / 2;
  const shift = viewportWidth < MOBILE_BREAKPOINT ? PARALLAX_MOBILE : PARALLAX_DESKTOP;
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
  const motion = useRef<MotionState>({
    x: 0,
    v: 0,
    dir: START_DIRECTION,
    dirNow: START_DIRECTION,
    period: 0,
    running: false,
    raf: 0,
    last: 0,
    dragging: false,
    captured: false,
    lastX: 0,
    lastT: 0,
    dragV: 0,
    moved: 0,
  });

  useEffect(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    const group = groupRef.current;
    if (!viewport || !track || !group) return;
    const s = motion.current;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // One group (all items + trailing gap) is one loop period, so wrapping by it is seamless.
    const measure = () => {
      s.period = group.offsetWidth;
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
      const drift = reduced ? 0 : (window.innerWidth / DRIFT_DIVISOR) * s.dirNow;
      const speed = s.dragging ? 0 : drift + s.v;
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

    const onWheel = (event: WheelEvent) => {
      if (!s.running || reduced) return;
      if (Math.abs(event.deltaY) > 1) s.dir = event.deltaY > 0 ? 1 : -1;
      s.v = clampVelocity(s.v + event.deltaY * WHEEL_GAIN);
    };
    window.addEventListener("wheel", onWheel, { passive: true });

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
      viewport.removeEventListener("scroll", onScroll);
    };
  }, []);

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    const s = motion.current;
    s.dragging = true;
    s.captured = false;
    s.dragV = 0;
    s.moved = 0;
    s.lastX = event.clientX;
    s.lastT = performance.now();
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const s = motion.current;
    if (!s.dragging) return;
    const dx = event.clientX - s.lastX;
    const now = performance.now();
    s.x += dx;
    s.moved += Math.abs(dx);
    s.dragV = (dx / Math.max(1, now - s.lastT)) * 1000;
    if (Math.abs(dx) > 1) s.dir = dx > 0 ? -1 : 1;
    s.lastX = event.clientX;
    s.lastT = now;
    // Only capture once it's clearly a drag, so taps on links still navigate.
    if (!s.captured && s.moved > DRAG_SLOP) {
      s.captured = true;
      event.currentTarget.setPointerCapture(event.pointerId);
    }
  }

  function endDrag() {
    const s = motion.current;
    if (!s.dragging) return;
    s.dragging = false;
    if (Math.abs(s.dragV) > 50) s.v = clampVelocity(s.v - s.dragV * FLING_FACTOR);
  }

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

  // Suppress the click that ends a drag, so releasing after a swipe doesn't open a link.
  function onClickCapture(event: MouseEvent<HTMLDivElement>) {
    if (motion.current.moved > DRAG_SLOP) {
      event.preventDefault();
      event.stopPropagation();
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
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onClickCapture={onClickCapture}
      className="relative w-full cursor-grab touch-pan-y select-none overflow-hidden active:cursor-grabbing"
      style={{ "--h": "clamp(16rem, 60vh, 38rem)" } as CSSProperties}
    >
      <div ref={trackRef} className="flex w-max will-change-transform">
        <Group items={items} groupRef={groupRef} />
        <Group items={items} hidden />
      </div>
    </div>
  );
}

function Group({ items, groupRef, hidden = false }: { items: CarouselItem[]; groupRef?: Ref<HTMLDivElement>; hidden?: boolean }) {
  return (
    <div ref={groupRef} aria-hidden={hidden || undefined} className="flex shrink-0 gap-8 pr-8">
      {items.map((item, index) => (
        <Tile key={`${hidden ? "b" : "a"}-${item.href}`} item={item} hidden={hidden} priority={!hidden && index < 2} />
      ))}
    </div>
  );
}

function Tile({ item, hidden, priority }: { item: CarouselItem; hidden: boolean; priority: boolean }) {
  const ratio = item.image && item.image.height ? item.image.width / item.image.height : 0.8;

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
              sizes="50vw"
              draggable={false}
              className="object-cover"
              loading={priority ? "eager" : "lazy"}
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
