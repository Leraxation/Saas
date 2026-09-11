"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ACTS, EVENT, collectUnverified } from "@/lib/vision2040/data";
import type { StageApi } from "@/lib/vision2040/useStage";

const PREFLIGHT_KEY = "vision2040.preflight.v1";

/**
 * Everything the presenter touches: the act rail, keyboard transport,
 * presenter mode, review mode, and the pre-flight data check.
 *
 * Keyboard transport matters more than it looks. A minister at a podium
 * should never have to find a scroll wheel — space and the arrow keys move
 * one act at a time, and the act lands pinned every time.
 */
export default function Chrome({ api }: { api: StageApi }) {
  const [help, setHelp] = useState(false);
  const [presenter, setPresenter] = useState(false);
  const [review, setReview] = useState(false);
  const [preflight, setPreflight] = useState<boolean | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const barRef = useRef<HTMLDivElement>(null);
  const started = useRef<number | null>(null);

  const unverified = collectUnverified();

  /* Pre-flight runs once per device, or whenever ?preflight is in the URL. */
  useEffect(() => {
    const forced = new URLSearchParams(window.location.search).has("preflight");
    let seen = false;
    try {
      seen = window.localStorage.getItem(PREFLIGHT_KEY) === "done";
    } catch {
      seen = false;
    }
    setPreflight(forced || !seen);
  }, []);

  const dismissPreflight = useCallback(() => {
    try {
      window.localStorage.setItem(PREFLIGHT_KEY, "done");
    } catch {
      /* private browsing — the check simply runs again next time */
    }
    setPreflight(false);
    started.current = performance.now();
  }, []);

  /* Review mode is a document-level flag so any figure can respond to it. */
  useEffect(() => {
    document.documentElement.dataset.review = review ? "on" : "off";
  }, [review]);

  /* The thin progress bar is written directly — never through React state. */
  useEffect(() => {
    return api.subscribe((s) => {
      if (barRef.current) barRef.current.style.transform = `scaleX(${s.progress})`;
    });
  }, [api]);

  /* Presenter clock. */
  useEffect(() => {
    if (!presenter) return;
    if (started.current === null) started.current = performance.now();
    const id = window.setInterval(() => {
      setElapsed(Math.floor((performance.now() - (started.current ?? 0)) / 1000));
    }, 500);
    return () => window.clearInterval(id);
  }, [presenter]);

  /* Keyboard transport. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      if (e.key === "Escape") {
        setHelp(false);
        return;
      }
      if (preflight) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          dismissPreflight();
        }
        return;
      }

      switch (e.key) {
        case " ":
        case "ArrowRight":
        case "ArrowDown":
        case "PageDown":
          e.preventDefault();
          api.goTo(api.activeIndex + 1);
          break;
        case "ArrowLeft":
        case "ArrowUp":
        case "PageUp":
          e.preventDefault();
          api.goTo(api.activeIndex - 1);
          break;
        case "Home":
          e.preventDefault();
          api.goTo(0);
          break;
        case "End":
          e.preventDefault();
          api.goTo(api.actCount - 1);
          break;
        case "f":
        case "F":
          if (document.fullscreenElement) void document.exitFullscreen();
          else void document.documentElement.requestFullscreen().catch(() => {});
          break;
        case "p":
        case "P":
          setPresenter((v) => !v);
          break;
        case "v":
        case "V":
          setReview((v) => !v);
          break;
        case "?":
        case "h":
        case "H":
          setHelp((v) => !v);
          break;
        default:
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [api, preflight, dismissPreflight]);

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");
  const act = ACTS[api.activeIndex] ?? ACTS[0];

  return (
    <>
      <div className="v-progress" aria-hidden="true">
        <div ref={barRef} className="v-progress__bar" />
      </div>

      {/* Masthead */}
      <header className="v-masthead">
        <span className="v-masthead__mark">رؤية عُمان ٢٠٤٠</span>
        <span className="v-masthead__rule" aria-hidden="true" />
        <span className="v-masthead__meta">
          {EVENT.convening} · {EVENT.dateLine}
        </span>
      </header>

      {/* Act rail */}
      <nav className="v-rail" aria-label="Presentation sections">
        <ol>
          {ACTS.map((a, i) => (
            <li key={a.id}>
              <button
                type="button"
                className={i === api.activeIndex ? "is-active" : undefined}
                onClick={() => api.goTo(i)}
                aria-current={i === api.activeIndex ? "true" : undefined}
              >
                <span className="v-rail__num">{a.numeral}</span>
                <span className="v-rail__name">{a.rail}</span>
                <span className="v-rail__tick" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ol>
      </nav>

      {/* Presenter mode */}
      {presenter && (
        <aside className="v-presenter" role="status">
          <div className="v-presenter__numeral">{act.numeral}</div>
          <div>
            <div className="v-presenter__act">{act.rail}</div>
            <div className="v-presenter__clock">
              {mm}:{ss}
            </div>
          </div>
          <div className="v-presenter__count">
            {api.activeIndex + 1} / {api.actCount}
          </div>
        </aside>
      )}

      {review && (
        <div className="v-reviewflag" role="status">
          Review mode — unverified figures are marked
        </div>
      )}

      <button type="button" className="v-help-btn" onClick={() => setHelp(true)}>
        ?<span className="sr-only"> Show keyboard shortcuts</span>
      </button>

      {/* Help */}
      {help && (
        <div className="v-modal" role="dialog" aria-modal="true" aria-label="Keyboard shortcuts">
          <div className="v-modal__panel">
            <h2>Presenter controls</h2>
            <dl className="v-keys">
              <div><dt>Space · →</dt><dd>Next section</dd></div>
              <div><dt>←</dt><dd>Previous section</dd></div>
              <div><dt>Home · End</dt><dd>First · last section</dd></div>
              <div><dt>F</dt><dd>Fullscreen</dd></div>
              <div><dt>P</dt><dd>Presenter mode — section, clock, position</dd></div>
              <div><dt>V</dt><dd>Review mode — flag unverified figures</dd></div>
              <div><dt>H · ?</dt><dd>This panel</dd></div>
              <div><dt>Esc</dt><dd>Close</dd></div>
            </dl>
            <p className="v-modal__note">
              Runs entirely offline once the film assets are in place. Nothing on this
              page requires a network connection at the podium.
            </p>
            <button type="button" className="v-btn" onClick={() => setHelp(false)}>
              Close
            </button>
          </div>
        </div>
      )}

      {/* Pre-flight check */}
      {preflight && (
        <div className="v-modal v-modal--preflight" role="dialog" aria-modal="true" aria-label="Pre-flight check">
          <div className="v-modal__panel v-modal__panel--wide">
            <span className="v-kicker">Before you present</span>
            <h2>Pre-flight check</h2>
            {unverified.length > 0 ? (
              <>
                <p className="v-modal__lede">
                  {unverified.length} figure{unverified.length === 1 ? "" : "s"} in this
                  briefing {unverified.length === 1 ? "is" : "are"} still illustrative.
                  Replace {unverified.length === 1 ? "it" : "them"} with official values in{" "}
                  <code>lib/vision2040/data.ts</code> and set <code>verified: true</code>{" "}
                  before this is shown to the sector.
                </p>
                <ul className="v-preflight__list">
                  {unverified.map((u) => (
                    <li key={u.label}>
                      <span className="v-preflight__label">{u.label}</span>
                      <span className="v-preflight__source">{u.source}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="v-modal__lede">
                Every figure in this briefing is marked verified against a cited source.
                You are clear to present.
              </p>
            )}
            <div className="v-modal__actions">
              <button type="button" className="v-btn v-btn--primary" onClick={dismissPreflight}>
                Understood — begin
              </button>
            </div>
            <p className="v-modal__note">
              This check runs once per device. Add <code>?preflight</code> to the URL to see it again.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
