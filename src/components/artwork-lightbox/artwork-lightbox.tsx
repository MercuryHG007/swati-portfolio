"use client";

/* eslint-disable @next/next/no-img-element -- slides and thumbnails use pre-sized Cloudinary URLs built in artwork-gallery; next/image would re-process them */

import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from "lucide-react";
import styles from "./artwork-lightbox.module.css";

export type LightboxSlide = {
  src: string;
  thumbSrc: string;
  alt: string;
  width: number;
  height: number;
};

type ArtworkLightboxProps = {
  slides: LightboxSlide[];
  title: string;
  initialIndex: number;
  onClose: () => void;
};

type Point = { x: number; y: number };
type View = { zoom: number; pan: Point };

type Gesture =
  | { kind: "pan"; startX: number; startY: number; startPan: Point; swipeable: boolean }
  | {
      kind: "pinch";
      startDistance: number;
      startZoom: number;
      startMidpoint: Point;
      startPan: Point;
    };

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.5;
const SLIDE_MS = 300;
const CLOSE_MS = 220;
const SWIPE_THRESHOLD_PX = 50;
// A pinch that ends this close to 1× snaps back to the fitted view.
const SNAP_TO_FIT_ZOOM = 0.05;
// Trackpad pinch arrives as ctrl+wheel; clamp each event so a mouse notch doesn't jump the zoom.
const WHEEL_DELTA_LIMIT = 50;
const WHEEL_ZOOM_SENSITIVITY = 0.01;
const INITIAL_VIEW: View = { zoom: MIN_ZOOM, pan: { x: 0, y: 0 } };

function prefersReducedMotion() {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

function clampZoom(zoom: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

// Keeps the zoomed image from being panned past its own edges.
function clampPan(pan: Point, zoom: number, image: HTMLElement, stage: HTMLElement): Point {
  const maxX = Math.max(0, (image.offsetWidth * zoom - stage.clientWidth) / 2);
  const maxY = Math.max(0, (image.offsetHeight * zoom - stage.clientHeight) / 2);
  return {
    x: Math.min(maxX, Math.max(-maxX, pan.x)),
    y: Math.min(maxY, Math.max(-maxY, pan.y)),
  };
}

function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function trapTab(event: KeyboardEvent, container: HTMLElement | null) {
  if (!container) return;
  const focusable = Array.from(container.querySelectorAll<HTMLElement>("button:not([disabled])"));
  if (focusable.length === 0) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = document.activeElement;

  if (!container.contains(active) || (event.shiftKey && active === container)) {
    event.preventDefault();
    first.focus();
  } else if (event.shiftKey && active === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
}

export function ArtworkLightbox({ slides, title, initialIndex, onClose }: ArtworkLightboxProps) {
  const [index, setIndex] = useState(initialIndex);
  const [outgoing, setOutgoing] = useState<{ key: number; index: number } | null>(null);
  const [view, setViewState] = useState<View>(INITIAL_VIEW);
  const [interacting, setInteracting] = useState(false);
  const [closing, setClosing] = useState(false);

  const count = slides.length;
  const hasMultiple = count > 1;

  const dialogRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const thumbRefs = useRef<(HTMLButtonElement | null)[]>([]);
  // Gesture handlers read the latest view from here, not from render closures.
  const viewRef = useRef<View>(INITIAL_VIEW);
  const pointersRef = useRef<Map<number, Point>>(new Map());
  const gestureRef = useRef<Gesture | null>(null);
  const timeoutsRef = useRef<number[]>([]);
  const outgoingKeyRef = useRef(0);
  const closingRef = useRef(false);

  const setView = useCallback((next: View) => {
    viewRef.current = next;
    setViewState(next);
  }, []);

  const schedule = useCallback((callback: () => void, ms: number) => {
    timeoutsRef.current.push(window.setTimeout(callback, ms));
  }, []);

  // Lock page scroll and move focus into the dialog; restore both on unmount.
  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, []);

  useEffect(() => {
    const timeouts = timeoutsRef.current;
    return () => timeouts.forEach((id) => window.clearTimeout(id));
  }, []);

  // Warm the cache for neighbouring slides so arrow navigation doesn't flash.
  useEffect(() => {
    if (!hasMultiple) return;
    for (const offset of [-1, 1]) {
      const neighbour = new Image();
      neighbour.src = slides[(index + offset + count) % count].src;
    }
  }, [count, hasMultiple, index, slides]);

  useEffect(() => {
    thumbRefs.current[index]?.scrollIntoView({
      block: "nearest",
      inline: "center",
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  }, [index]);

  const requestClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    setClosing(true);
    schedule(onClose, prefersReducedMotion() ? 0 : CLOSE_MS);
  }, [onClose, schedule]);

  const goTo = useCallback(
    (target: number) => {
      const next = (target + count) % count;
      if (next === index) return;

      outgoingKeyRef.current += 1;
      const key = outgoingKeyRef.current;
      setOutgoing({ key, index });
      setIndex(next);
      setView(INITIAL_VIEW);
      schedule(
        () => setOutgoing((current) => (current?.key === key ? null : current)),
        prefersReducedMotion() ? 0 : SLIDE_MS,
      );
    },
    [count, index, schedule, setView],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        requestClose();
      } else if (event.key === "ArrowLeft" && hasMultiple) {
        goTo(index - 1);
      } else if (event.key === "ArrowRight" && hasMultiple) {
        goTo(index + 1);
      } else if (event.key === "Tab") {
        trapTab(event, dialogRef.current);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goTo, hasMultiple, index, requestClose]);

  // Applies a requested view, clamping zoom and pan to what the stage can show.
  const constrain = useCallback((next: View): View => {
    if (next.zoom === MIN_ZOOM) return INITIAL_VIEW;
    const image = imageRef.current;
    const stage = stageRef.current;
    if (!image || !stage) return next;
    return { zoom: next.zoom, pan: clampPan(next.pan, next.zoom, image, stage) };
  }, []);

  // Trackpad pinch arrives as a ctrl+wheel event. React's wheel listeners are passive,
  // so this is attached natively to be able to cancel the browser's own page zoom.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey) return;
      event.preventDefault();

      const { zoom, pan } = viewRef.current;
      const delta = Math.max(-WHEEL_DELTA_LIMIT, Math.min(WHEEL_DELTA_LIMIT, event.deltaY));
      const nextZoom = clampZoom(zoom * Math.exp(-delta * WHEEL_ZOOM_SENSITIVITY));

      // Zoom around the cursor: keep the image point under it fixed.
      const rect = stage.getBoundingClientRect();
      const center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      const anchor = {
        x: (event.clientX - center.x - pan.x) / zoom,
        y: (event.clientY - center.y - pan.y) / zoom,
      };
      setView(
        constrain({
          zoom: nextZoom,
          pan: {
            x: event.clientX - center.x - nextZoom * anchor.x,
            y: event.clientY - center.y - nextZoom * anchor.y,
          },
        }),
      );
    };

    stage.addEventListener("wheel", onWheel, { passive: false });
    return () => stage.removeEventListener("wheel", onWheel);
  }, [constrain, setView]);


  const changeZoom = (next: number) => {
    setView(constrain({ zoom: clampZoom(next), pan: viewRef.current.pan }));
  };

  // Chooses pan or pinch from how many pointers are down.
  const startGesture = () => {
    const points = Array.from(pointersRef.current.values());
    const { zoom, pan } = viewRef.current;
    if (points.length === 1) {
      gestureRef.current = {
        kind: "pan",
        startX: points[0].x,
        startY: points[0].y,
        startPan: pan,
        swipeable: true,
      };
    } else if (points.length >= 2) {
      gestureRef.current = {
        kind: "pinch",
        startDistance: Math.max(1, distance(points[0], points[1])),
        startZoom: zoom,
        startMidpoint: midpoint(points[0], points[1]),
        startPan: pan,
      };
    }
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    event.currentTarget.setPointerCapture(event.pointerId);
    startGesture();
    setInteracting(true);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const points = pointersRef.current;
    if (!points.has(event.pointerId)) return;
    points.set(event.pointerId, { x: event.clientX, y: event.clientY });

    const gesture = gestureRef.current;
    const stage = stageRef.current;
    if (!gesture || !stage || !imageRef.current) return;

    if (gesture.kind === "pan") {
      if (viewRef.current.zoom === MIN_ZOOM) return;
      setView(
        constrain({
          zoom: viewRef.current.zoom,
          pan: {
            x: gesture.startPan.x + event.clientX - gesture.startX,
            y: gesture.startPan.y + event.clientY - gesture.startY,
          },
        }),
      );
      return;
    }

    const [a, b] = Array.from(points.values());
    if (!b) return;
    const zoom = clampZoom((gesture.startZoom * distance(a, b)) / gesture.startDistance);

    // Keep the image point that started under the fingers under the fingers as the zoom changes.
    const rect = stage.getBoundingClientRect();
    const center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    const start = gesture.startMidpoint;
    const anchor = {
      x: (start.x - center.x - gesture.startPan.x) / gesture.startZoom,
      y: (start.y - center.y - gesture.startPan.y) / gesture.startZoom,
    };
    const mid = midpoint(a, b);
    setView(
      constrain({
        zoom,
        pan: {
          x: mid.x - center.x - zoom * anchor.x,
          y: mid.y - center.y - zoom * anchor.y,
        },
      }),
    );
  };

  const handlePointerEnd = (event: ReactPointerEvent<HTMLDivElement>, cancelled: boolean) => {
    const points = pointersRef.current;
    if (!points.delete(event.pointerId)) return;
    const gesture = gestureRef.current;

    if (points.size === 0) {
      gestureRef.current = null;
      setInteracting(false);

      if (gesture?.kind === "pan" && gesture.swipeable && !cancelled && hasMultiple) {
        const dx = event.clientX - gesture.startX;
        if (viewRef.current.zoom === MIN_ZOOM && Math.abs(dx) >= SWIPE_THRESHOLD_PX) {
          goTo(dx < 0 ? index + 1 : index - 1);
        }
      }
      if (gesture?.kind === "pinch" && viewRef.current.zoom - MIN_ZOOM < SNAP_TO_FIT_ZOOM) {
        setView(INITIAL_VIEW);
      }
      return;
    }

    // One finger left after a pinch: keep panning from its current position, without swiping.
    const [remaining] = Array.from(points.values());
    gestureRef.current = {
      kind: "pan",
      startX: remaining.x,
      startY: remaining.y,
      startPan: viewRef.current.pan,
      swipeable: false,
    };
  };

  const current = slides[index];
  const preventDefault = (event: { preventDefault: () => void }) => event.preventDefault();

  return createPortal(
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={`${title} gallery`}
      tabIndex={-1}
      className={`${styles.root} ${closing ? styles.closing : ""}`}
    >
      <header className={styles.header}>
        <div className={styles.titleGroup}>
          <p className={styles.title}>{title}</p>
          {hasMultiple && (
            <p className={styles.counter}>
              {String(index + 1).padStart(2, "0")} / {String(count).padStart(2, "0")}
            </p>
          )}
        </div>
        <div className={styles.controls}>
          <div className={styles.zoomControls}>
            <button
              type="button"
              className={styles.iconButton}
              aria-label="Zoom out"
              disabled={view.zoom <= MIN_ZOOM}
              onClick={() => changeZoom(view.zoom - ZOOM_STEP)}
            >
              <ZoomOut size={18} />
            </button>
            <span className={styles.zoomLevel} aria-live="polite">
              {Math.round(view.zoom * 100)}%
            </span>
            <button
              type="button"
              className={styles.iconButton}
              aria-label="Zoom in"
              disabled={view.zoom >= MAX_ZOOM}
              onClick={() => changeZoom(view.zoom + ZOOM_STEP)}
            >
              <ZoomIn size={18} />
            </button>
          </div>
          <button
            type="button"
            className={styles.iconButton}
            aria-label="Close gallery"
            onClick={requestClose}
          >
            <X size={18} />
          </button>
        </div>
      </header>

      <div className={styles.body}>
        {hasMultiple && (
          <button
            type="button"
            className={styles.navButton}
            aria-label="Previous image"
            onClick={() => goTo(index - 1)}
          >
            <ChevronLeft size={20} />
          </button>
        )}

        <div
          ref={stageRef}
          className={styles.stage}
          style={{ cursor: view.zoom > MIN_ZOOM ? "grab" : "default" }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={(event) => handlePointerEnd(event, false)}
          onPointerCancel={(event) => handlePointerEnd(event, true)}
        >
          {outgoing && (
            <img
              key={`outgoing-${outgoing.key}`}
              src={slides[outgoing.index].src}
              alt=""
              aria-hidden="true"
              draggable={false}
              onDragStart={preventDefault}
              className={`${styles.image} ${styles.slideOut}`}
            />
          )}
          <img
            key={index}
            ref={imageRef}
            src={current.src}
            alt={current.alt}
            width={current.width}
            height={current.height}
            draggable={false}
            onDragStart={preventDefault}
            onContextMenu={preventDefault}
            className={`${styles.image} ${styles.slideIn} ${interacting ? styles.interacting : ""}`}
            style={{
              transform: `translate(${view.pan.x}px, ${view.pan.y}px) scale(${view.zoom})`,
            }}
          />
        </div>

        {hasMultiple && (
          <button
            type="button"
            className={styles.navButton}
            aria-label="Next image"
            onClick={() => goTo(index + 1)}
          >
            <ChevronRight size={20} />
          </button>
        )}
      </div>

      {hasMultiple && (
        <div className={styles.thumbs}>
          {slides.map((slide, i) => (
            <button
              key={slide.src}
              ref={(element) => {
                thumbRefs.current[i] = element;
              }}
              type="button"
              className={styles.thumb}
              aria-label={`Show image ${i + 1}`}
              aria-current={i === index ? "true" : undefined}
              onClick={() => goTo(i)}
            >
              <img src={slide.thumbSrc} alt="" draggable={false} className={styles.thumbImage} />
            </button>
          ))}
        </div>
      )}
    </div>,
    document.body,
  );
}
