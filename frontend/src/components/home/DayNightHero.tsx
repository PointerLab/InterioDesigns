import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const TOTAL_FRAMES = 128;

type Hotspot = {
  id: string;
  label: string;
  title: string;
  detail: string;
  x: number;
  y: number;
};

const hotspots: Hotspot[] = [
  {
    id: "sofa",
    label: "Sofa",
    title: "Textured Linen Sofa",
    detail: "Breathable linen blend with high-density cushions and refined Scandinavian proportions.",
    x: 32,
    y: 67,
  },
  {
    id: "table",
    label: "Coffee Table",
    title: "CNC Oak Coffee Table",
    detail: "Precision-milled form with matte-protected wood grain and hand-finished contour edges.",
    x: 49,
    y: 72,
  },
  {
    id: "tv",
    label: "TV Unit",
    title: "Integrated TV Console",
    detail: "Hidden storage channels and push-open cabinetry for calm, clutter-free visual composition.",
    x: 72,
    y: 58,
  },
];

const getFrameUrl = (index: number) => {
  const padded = index.toString().padStart(3, "0");
  const delay = index % 4 === 1 ? "0.07" : "0.06";
  return `/frames/frame_${padded}_delay-${delay}s.jpg`;
};

const drawImageCover = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, image: HTMLImageElement) => {
  const { width: canvasWidth, height: canvasHeight } = canvas;
  const scale = Math.max(canvasWidth / image.width, canvasHeight / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  const offsetX = (canvasWidth - drawWidth) / 2;
  const offsetY = (canvasHeight - drawHeight) / 2;

  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);
};

const DayNightHero = () => {
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const framesRef = useRef<(HTMLImageElement | null)[]>(Array(TOTAL_FRAMES).fill(null));
  const smoothProgressRef = useRef(0);
  const targetProgressRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const lastUiFrameRef = useRef(0);

  const [progress, setProgress] = useState(0);
  const [frameLoadCount, setFrameLoadCount] = useState(0);
  const [activeHotspot, setActiveHotspot] = useState("sofa");

  const frameUrls = useMemo(() => Array.from({ length: TOTAL_FRAMES }, (_, idx) => getFrameUrl(idx)), []);

  const drawFrameFromProgress = (value: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const frameIndex = Math.min(TOTAL_FRAMES - 1, Math.max(0, Math.round(value * (TOTAL_FRAMES - 1))));
    const frame = framesRef.current[frameIndex];
    if (!frame || !frame.complete) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    drawImageCover(ctx, canvas, frame);
  };

  useEffect(() => {
    const resizeCanvas = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const bounds = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const nextWidth = Math.max(1, Math.floor(bounds.width * dpr));
      const nextHeight = Math.max(1, Math.floor(bounds.height * dpr));

      if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
        canvas.width = nextWidth;
        canvas.height = nextHeight;
      }

      drawFrameFromProgress(smoothProgressRef.current);
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadFrame = (index: number) => {
      const image = new Image();
      image.decoding = "async";
      image.src = frameUrls[index];
      image.onload = () => {
        if (cancelled) return;
        framesRef.current[index] = image;
        setFrameLoadCount((count) => count + 1);
        if (index === 0 || Math.abs(index - Math.round(smoothProgressRef.current * (TOTAL_FRAMES - 1))) <= 1) {
          drawFrameFromProgress(smoothProgressRef.current);
        }
      };
    };

    loadFrame(0);

    let index = 1;
    const batchSize = 8;

    const loadBatch = () => {
      if (cancelled) return;
      for (let i = 0; i < batchSize && index < TOTAL_FRAMES; i += 1) {
        loadFrame(index);
        index += 1;
      }
      if (index < TOTAL_FRAMES) {
        window.setTimeout(loadBatch, 45);
      }
    };

    loadBatch();

    return () => {
      cancelled = true;
    };
  }, [frameUrls]);

  useEffect(() => {
    const updateTarget = () => {
      const section = sectionRef.current;
      if (!section) return;

      const rect = section.getBoundingClientRect();
      const totalScrollable = Math.max(1, section.offsetHeight - window.innerHeight);
      const traveled = Math.min(Math.max(-rect.top, 0), totalScrollable);
      targetProgressRef.current = traveled / totalScrollable;

      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(function tick() {
          const current = smoothProgressRef.current;
          const target = targetProgressRef.current;
          const next = current + (target - current) * 0.14;
          const now = performance.now();

          smoothProgressRef.current = Math.abs(target - next) < 0.001 ? target : next;
          drawFrameFromProgress(smoothProgressRef.current);

          if (now - lastUiFrameRef.current > 45 || Math.abs(target - smoothProgressRef.current) < 0.01) {
            setProgress(smoothProgressRef.current);
            lastUiFrameRef.current = now;
          }

          if (Math.abs(target - smoothProgressRef.current) > 0.001) {
            rafRef.current = requestAnimationFrame(tick);
          } else {
            rafRef.current = null;
          }
        });
      }
    };

    updateTarget();
    window.addEventListener("scroll", updateTarget, { passive: true });
    window.addEventListener("resize", updateTarget);

    return () => {
      window.removeEventListener("scroll", updateTarget);
      window.removeEventListener("resize", updateTarget);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const activeCard = hotspots.find((spot) => spot.id === activeHotspot) ?? hotspots[0];
  const moodOpacity = Math.min(0.8, progress * 0.95);
  const dayTint = Math.max(0.07, 0.2 - progress * 0.18);

  return (
    <section ref={sectionRef} className="relative h-[230vh]">
      <div className="sticky top-16 h-[calc(100vh-4rem)] overflow-hidden bg-[#efe8e2]">
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-label="Day to night room animation" />

        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: `linear-gradient(180deg, rgba(255,247,236,${dayTint}) 0%, rgba(255,211,166,${dayTint * 0.6}) 35%, rgba(26,15,10,${moodOpacity}) 100%)`,
          }}
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{ boxShadow: `inset 0 0 220px rgba(0,0,0,${progress * 0.45})` }}
        />

        {hotspots.map((spot) => {
          const isActive = activeHotspot === spot.id;
          return (
            <button
              key={spot.id}
              className="absolute z-30 hidden -translate-x-1/2 -translate-y-1/2 sm:block"
              style={{ left: `${spot.x}%`, top: `${spot.y}%`, opacity: progress > 0.03 ? 1 : 0 }}
              onMouseEnter={() => setActiveHotspot(spot.id)}
              onFocus={() => setActiveHotspot(spot.id)}
              onClick={() => setActiveHotspot(spot.id)}
              aria-label={`Show details: ${spot.label}`}
            >
              <span
                className={`flex h-9 min-w-9 items-center justify-center rounded-full border px-3 text-[11px] font-medium tracking-wide transition-all duration-300 ${
                  isActive
                    ? "border-card bg-card text-foreground shadow-[0_0_0_6px_rgba(255,255,255,0.25)]"
                    : "border-card/70 bg-foreground/60 text-card hover:bg-foreground/80"
                }`}
              >
                {spot.label}
              </span>
            </button>
          );
        })}

        <motion.div
          key={activeCard.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="absolute bottom-6 right-4 z-30 hidden w-[min(340px,calc(100%-2rem))] rounded-lg border border-border bg-card p-4 shadow-lg sm:block md:right-6"
        >
          <p className="eyebrow">In this room</p>
          <h3 className="mt-1.5 text-lg text-foreground">{activeCard.title}</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{activeCard.detail}</p>
        </motion.div>

        <div className="pointer-events-none absolute inset-0 z-10">
          <div className="container-page flex h-full items-center">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.15 }}
              className="pointer-events-auto max-w-md rounded-lg bg-card/95 p-7 shadow-lg md:p-10"
            >
              <p className="eyebrow">Interior design & renovation</p>
              <h1 className="mt-3 font-serif text-5xl font-semibold tracking-tight text-foreground md:text-6xl">
                REDEFINE
              </h1>
              <p className="mt-3 text-lg leading-relaxed text-muted-foreground md:text-xl">
                Your Home With Modern Design
                <br />
                And Timeless Furniture
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <Link to="/estimate">Get a free estimate</Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link to="/designs">Browse designs</Link>
                </Button>
              </div>
              <p className="mt-5 text-xs text-muted-foreground">Scroll to see the room from day to night.</p>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DayNightHero;
