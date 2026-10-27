"use client";

import { useEffect, useRef, useState } from "react";
import { ASSET_NOTES, CALLOUTS, CHAPTER_COPY, MARQUE, PHOTOS, SHOWROOM_PHOTO, SPECS } from "@/lib/unveil/content";
import { CHAPTERS } from "@/lib/unveil/timeline";

/**
 * The Vespera unveiling.
 *
 * Markup and copy live here so the page is server-rendered and readable with
 * scripts off. Motion is wired in one effect: it builds the Three.js scene on
 * the canvas, the GSAP timeline over it, and connects the two with a
 * ScrollTrigger that pins this section. The heavy modules are imported inside
 * the effect so they never land in the server bundle.
 */
/**
 * On a failed load, try the fallback URL once; if that fails too, hide the
 * figure the image sits in (or the image itself).
 */
function swapToFallback(fallback?: string) {
  return (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (fallback && img.dataset.fallback !== "done") {
      img.dataset.fallback = "done";
      img.src = fallback;
      return;
    }
    const fig = img.closest("figure");
    if (fig) fig.hidden = true;
    else img.hidden = true;
  };
}

export default function Unveil() {
  const rootRef = useRef<HTMLDivElement>(null);
  const pinRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cueRef = useRef<HTMLDivElement>(null);
  const chapterRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const calloutRefs = useRef<Array<HTMLDivElement | null>>([]);
  const counterRef = useRef<HTMLSpanElement>(null);
  const titleRef = useRef<HTMLSpanElement>(null);
  const railRef = useRef<HTMLSpanElement>(null);
  const modelErrorRef = useRef<HTMLSpanElement>(null);
  const finalePhotoRef = useRef<HTMLImageElement>(null);
  const [webgl, setWebgl] = useState<"pending" | "ok" | "missing">("pending");

  useEffect(() => {
    const canvas = canvasRef.current;
    const pin = pinRef.current;
    if (!canvas || !pin) return;

    let disposed = false;
    let cleanup: (() => void) | null = null;

    (async () => {
      const [{ UnveilScene }, { buildTimeline }, gsapMod] = await Promise.all([
        import("@/lib/unveil/scene"),
        import("@/lib/unveil/timeline"),
        import("gsap"),
      ]);
      if (disposed) return;

      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      let scene: InstanceType<typeof UnveilScene>;
      try {
        scene = new UnveilScene(canvas, { reducedMotion: reduced });
      } catch (err) {
        console.warn("[unveil] WebGL unavailable:", err);
        setWebgl("missing");
        return;
      }
      setWebgl("ok");
      pin.dataset.model = "loading";
      scene.ready.then(() => {
        if (disposed) return;
        pin.dataset.model = scene.modelStatus;
        if (scene.modelStatus !== "failed") canvas.dataset.ready = "true";
        else if (modelErrorRef.current) modelErrorRef.current.textContent = scene.modelError;
      });

      const ro = new ResizeObserver(([entry]) => {
        const { width, height } = entry.contentRect;
        scene.resize(width, height);
      });
      ro.observe(pin);
      scene.resize(pin.clientWidth, pin.clientHeight);

      const callouts = calloutRefs.current.filter(Boolean) as HTMLDivElement[];
      const chapters = chapterRefs.current;

      const ctx = gsapMod.gsap.context(() => {
        buildTimeline(
          scene.params,
          {
            trigger: pin,
            cue: cueRef.current,
            finalePhoto: finalePhotoRef.current,
            chapters: {
              cover: chapters.cover,
              reveal: chapters.reveal,
              anatomy: chapters.anatomy,
              assembly: chapters.assembly,
              finale: chapters.finale,
            },
            callouts,
            onUpdate: (progress, chapter) => {
              const c = CHAPTERS[chapter];
              if (counterRef.current && counterRef.current.textContent !== c.index) counterRef.current.textContent = c.index;
              if (titleRef.current && titleRef.current.textContent !== c.title) titleRef.current.textContent = c.title;
              if (railRef.current) railRef.current.style.transform = `scaleY(${progress})`;
              pin.dataset.chapter = c.id;
            },
          },
          { reducedMotion: reduced },
        );
      }, pin);

      // Anchor the callouts to their parts every frame.
      scene.onFrame = (s) => {
        for (const el of callouts) {
          const a = s.project(el.dataset.anchor || "");
          if (!a) continue;
          el.style.transform = `translate3d(${a.x.toFixed(1)}px, ${a.y.toFixed(1)}px, 0)`;
          el.style.opacity = a.visible ? "1" : "0";
        }
      };

      // Only render while the stage is on screen.
      const io = new IntersectionObserver(
        ([e]) => {
          if (e.isIntersecting && !document.hidden) scene.start();
          else scene.stop();
        },
        { threshold: 0 },
      );
      io.observe(pin);
      const onVis = () => (document.hidden ? scene.stop() : scene.start());
      document.addEventListener("visibilitychange", onVis);
      scene.start();

      cleanup = () => {
        document.removeEventListener("visibilitychange", onVis);
        io.disconnect();
        ro.disconnect();
        ctx.revert();
        scene.dispose();
      };
    })();

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, []);

  const setChapter = (id: string) => (el: HTMLDivElement | null) => {
    chapterRefs.current[id] = el;
  };

  return (
    <div className="u-root" ref={rootRef}>
      <section className="u-pin" ref={pinRef} data-chapter="cover" aria-label="Scroll-driven unveiling of the Vespera">
        <canvas ref={canvasRef} className="u-canvas" aria-hidden="true" />
        <img
          ref={finalePhotoRef}
          className="u-finale-photo"
          src={SHOWROOM_PHOTO.src}
          alt={SHOWROOM_PHOTO.alt}
          decoding="async"
          onError={swapToFallback(SHOWROOM_PHOTO.fallback)}
        />
        <div className="u-vignette" aria-hidden="true" />

        {webgl === "missing" && (
          <div className="u-nowebgl" role="status">
            <p>This stage needs WebGL. The copy below still reads; the car does not.</p>
          </div>
        )}
        <div className="u-model u-model--loading" role="status">
          <span className="u-model__bar" aria-hidden="true" />
          <span>Loading the 458 Italia</span>
        </div>
        <div className="u-model u-model--failed" role="alert">
          <span>The 3D model could not be loaded. Reload the page to try again.</span>
          <span className="u-model__err" ref={modelErrorRef} />
        </div>

        {/* Chrome */}
        <header className="u-chrome u-chrome--top">
          <a className="u-wordmark" href="#top">
            <span className="u-wordmark__name">{MARQUE.wordmark}</span>
            <span className="u-wordmark__sub">{MARQUE.tagline}</span>
          </a>
          <nav className="u-nav" aria-label="Chapters">
            {CHAPTERS.map((c) => (
              <span key={c.id} className="u-nav__item" data-id={c.id}>
                <span className="u-nav__idx">{c.index}</span>
                <span className="u-nav__title">{c.title}</span>
              </span>
            ))}
          </nav>
        </header>

        <footer className="u-chrome u-chrome--bottom">
          <div className="u-counter" aria-live="polite">
            <span className="u-counter__idx" ref={counterRef}>
              01
            </span>
            <span className="u-counter__sep" aria-hidden="true" />
            <span className="u-counter__title" ref={titleRef}>
              Under cover
            </span>
          </div>
          <div className="u-rail" aria-hidden="true">
            <span className="u-rail__fill" ref={railRef} />
          </div>
          <div className="u-cue" ref={cueRef}>
            <span className="u-cue__line" aria-hidden="true" />
            <span>Scroll to unveil</span>
          </div>
        </footer>

        {/* 01 · Under cover */}
        <div className="u-chapter u-chapter--cover" ref={setChapter("cover")}>
          <p className="u-kicker" data-line>
            {CHAPTER_COPY.cover.kicker}
          </p>
          {CHAPTER_COPY.cover.lines.map((l) => (
            <p key={l} className="u-statement" data-line>
              {l}
            </p>
          ))}
        </div>

        {/* 02 · The reveal */}
        <div className="u-chapter u-chapter--reveal" ref={setChapter("reveal")}>
          <p className="u-kicker" data-line>
            {CHAPTER_COPY.reveal.kicker}
          </p>
          <h1 className="u-display" data-line>
            <span data-display>{CHAPTER_COPY.reveal.display}</span>
          </h1>
          {CHAPTER_COPY.reveal.lines.map((l, i) => (
            <p key={l} className={i === 0 ? "u-mono" : "u-lede"} data-line>
              {l}
            </p>
          ))}
        </div>

        {/* 03 · Anatomy */}
        <div className="u-chapter u-chapter--anatomy" ref={setChapter("anatomy")}>
          <p className="u-kicker" data-line>
            {CHAPTER_COPY.anatomy.kicker}
          </p>
          {CHAPTER_COPY.anatomy.lines.map((l) => (
            <p key={l} className="u-statement" data-line>
              {l}
            </p>
          ))}
        </div>

        {CALLOUTS.map((c, i) => (
          <div
            key={c.anchor}
            className={`u-callout u-callout--${c.side}`}
            data-anchor={c.anchor}
            ref={(el) => {
              calloutRefs.current[i] = el;
            }}
          >
            <span className="u-callout__dot" data-dot aria-hidden="true" />
            <span className="u-callout__leader" data-leader aria-hidden="true" />
            <span className="u-callout__label" data-label>
              <span className="u-callout__title">{c.title}</span>
              <span className="u-callout__detail">{c.detail}</span>
            </span>
          </div>
        ))}

        {/* 04 · Assembly */}
        <div className="u-chapter u-chapter--assembly" ref={setChapter("assembly")}>
          <p className="u-kicker" data-line>
            {CHAPTER_COPY.assembly.kicker}
          </p>
          {CHAPTER_COPY.assembly.lines.map((l) => (
            <p key={l} className="u-statement" data-line>
              {l}
            </p>
          ))}
        </div>

        {/* Finale */}
        <div className="u-chapter u-chapter--finale" ref={setChapter("finale")}>
          <p className="u-display u-display--sm" data-line>
            <span data-display>{CHAPTER_COPY.finale.display}</span>
          </p>
          {CHAPTER_COPY.finale.lines.map((l) => (
            <p key={l} className="u-lede" data-line>
              {l}
            </p>
          ))}
          <p data-line>
            <a className="u-cta" href="#reserve">
              <span>{CHAPTER_COPY.finale.cta}</span>
              <span className="u-cta__arrow" aria-hidden="true">
                →
              </span>
            </a>
          </p>
        </div>
      </section>

      {/* Below the stage: ordinary, scrollable, honest. */}
      <section className="u-after" id="reserve">
        <div className="u-after__head">
          <p className="u-kicker">Specification</p>
          <h2 className="u-h2">
            {MARQUE.model} <span className="u-h2__thin">— factory figures</span>
          </h2>
          <p className="u-note">
            Manufacturer figures for the 458 Italia as launched. The car on the floor is a {MARQUE.year} coupé in Rosso
            Corsa; confirm its own service history and options at the viewing.
          </p>
        </div>
        <dl className="u-specs">
          {SPECS.map((s) => (
            <div key={s.label} className="u-spec">
              <dt>{s.label}</dt>
              <dd>
                {s.value}
                {s.note && <small>{s.note}</small>}
              </dd>
            </div>
          ))}
        </dl>

        <div className="u-after__head">
          <p className="u-kicker">The car itself</p>
          <h2 className="u-h2">
            As photographed, <span className="u-h2__thin">and in the showroom</span>
          </h2>
          <p className="u-note">
            The owner&rsquo;s photograph, and the same car composited into an indoor showroom by an AI image edit. The 3D car
            above is a model of the same 458 Italia, re-painted to match.
          </p>
        </div>
        <div className="u-photos">
          {PHOTOS.map((ph) => (
            <figure key={ph.src} className="u-photo">
              <img src={ph.src} alt={ph.alt} loading="lazy" onError={swapToFallback(ph.fallback)} />
              <figcaption>{ph.caption}</figcaption>
            </figure>
          ))}
        </div>

        <div className="u-after__head">
          <p className="u-kicker">What you just watched</p>
          <h2 className="u-h2">
            Procedural, <span className="u-h2__thin">and what would replace it</span>
          </h2>
          <p className="u-note">
            The car is a real model; the silk, the studio and the lights are built from numbers at load time. The table says
            what each element is today and the external asset that would take it the rest of the way.
          </p>
        </div>
        <div className="u-notes">
          {ASSET_NOTES.map((n) => (
            <article key={n.what} className="u-note-card">
              <h3>{n.what}</h3>
              <p>
                <strong>Now</strong> {n.now}
              </p>
              <p>
                <strong>Upgrade</strong> {n.upgrade}
              </p>
              <p className="u-note-card__where">{n.where}</p>
            </article>
          ))}
        </div>

        <footer className="u-footer">
          <span className="u-wordmark__name">{MARQUE.wordmark}</span>
          <span>Nocturne Automobili is a fictional showroom. 458 Italia model by vicent091036 via Sketchfab and the three.js examples. The silk is a shader.</span>
        </footer>
      </section>
    </div>
  );
}
