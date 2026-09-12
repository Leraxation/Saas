"use client";

import { useMemo } from "react";
import Stage from "@/components/vision2040/Stage";
import FilmCanvas from "@/components/vision2040/FilmCanvas";
import Chrome from "@/components/vision2040/Chrome";
import { Act, Beat, Counter, Kicker } from "@/components/vision2040/parts";
import { useStage } from "@/lib/vision2040/useStage";
import {
  ACTS,
  BOARD,
  CLOSE,
  EVENT,
  FIGURES,
  GROWTH,
  NATION,
  NETWORK,
  OPERATORS,
  OUTLOOK,
  PILLARS,
  ROADMAP,
  SCALE,
  TITLES,
} from "@/lib/vision2040/data";
import { AIRPORTS, DESTINATIONS } from "@/lib/vision2040/geo";

export default function Vision2040() {
  const ids = useMemo(() => ACTS.map((a) => a.id), []);
  const api = useStage(ids);

  return (
    <div className="v-root">
      {/* Fixed full-bleed film canvas; every section below scrolls over it. */}
      <FilmCanvas triggerId="film-range" />
      <Stage api={api} />
      <Chrome api={api} />

      <main className="v-main">
        {/*
          The film's scroll range: acts I-II. Its last frame lands exactly as
          Act III opens on "Eleven governorates, one network", and the canvas
          then fades. The segment weights in FilmCanvas mirror these two act
          heights — change one, change both.
        */}
        <div id="film-range">
        {/* ── I · OVERTURE ───────────────────────────────────────────── */}
        <Act api={api} id="overture" vh={230}>
          <Beat api={api} act="overture" from={0} to={0.8} className="v-hero" lift={16}>
            <span className="v-hero__ar">{TITLES.visionAr}</span>
            <h1 className="v-hero__title">{TITLES.vision}</h1>
            <div className="v-hero__rule" aria-hidden="true" />
            <p className="v-hero__stand">{TITLES.standfirst}</p>
          </Beat>

          <Beat api={api} act="overture" from={0} to={0.34} className="v-scrollcue" lift={0}>
            <span className="v-scrollcue__line" aria-hidden="true" />
            <span>Scroll, or press space</span>
          </Beat>
        </Act>

        {/* ── II · THE NATION ────────────────────────────────────────── */}
        <Act api={api} id="nation" vh={340}>
          <Beat api={api} act="nation" from={0} to={0.28} className="v-panel v-panel--center">
            <Kicker>{NATION.kicker}</Kicker>
            <h2 className="v-h2">{NATION.heading}</h2>
            <p className="v-lede">{NATION.body}</p>
          </Beat>

          {NATION.beats.map((b, i) => (
            <Beat
              key={b.heading}
              api={api}
              act="nation"
              from={0.3 + i * 0.235}
              to={0.535 + i * 0.235}
              hold={i === NATION.beats.length - 1}
              className={`v-panel v-panel--${i % 2 === 0 ? "left" : "right"}`}
            >
              <span className="v-panel__index">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="v-h3">{b.heading}</h3>
              <p className="v-body">{b.body}</p>
            </Beat>
          ))}
        </Act>

        </div>{/* /#film-range — the film ends as Act III opens */}

        {/* ── III · THE NETWORK ──────────────────────────────────────── */}
        <Act api={api} id="network" vh={420}>
          <Beat api={api} act="network" from={0} to={0.26} className="v-panel v-panel--top">
            <Kicker>{NETWORK.kicker}</Kicker>
            <h2 className="v-h2">{NETWORK.heading}</h2>
            <p className="v-lede">{NETWORK.body}</p>
          </Beat>

          <Beat api={api} act="network" from={0.28} to={0.6} className="v-panel v-panel--corner">
            <div className="v-card">
            <span className="v-panel__index">{NETWORK.domesticLabel}</span>
            <ul className="v-chips">
              {AIRPORTS.map((a) => (
                <li key={a.code} className={a.tier === "hub" ? "is-hub" : undefined}>
                  <b>{a.code}</b>
                  <span>{a.name}</span>
                </li>
              ))}
            </ul>
            </div>
          </Beat>

          <Beat api={api} act="network" from={0.62} to={1} className="v-panel v-panel--corner" hold>
            <div className="v-card">
            <span className="v-panel__index">{NETWORK.internationalLabel}</span>
            <p className="v-body v-body--tight">
              {DESTINATIONS.length} points across the Gulf, the Levant, Europe, East
              Africa, South Asia and Southeast Asia — every one of them a trade route
              before it is a timetable.
            </p>
            </div>
          </Beat>

          <div className="v-mapnote">{NETWORK.mapCaption}</div>
        </Act>

        {/* ── IV · THE SCALE ─────────────────────────────────────────── */}
        <Act api={api} id="scale" vh={360}>
          <Beat api={api} act="scale" from={0} to={0.2} className="v-panel v-panel--top">
            <Kicker>{SCALE.kicker}</Kicker>
            <h2 className="v-h2">{SCALE.heading}</h2>
            <p className="v-lede">{SCALE.body}</p>
          </Beat>

          <Beat api={api} act="scale" from={0.22} to={0.62} className="v-figures">
            {FIGURES.map((f) => (
              <Counter key={f.label} api={api} act="scale" figure={f} from={0.26} to={0.52} />
            ))}
          </Beat>

          <Beat api={api} act="scale" from={0.6} to={1} className="v-panel v-panel--chart" hold>
            <h3 className="v-h3">
              {GROWTH.title}
              {!GROWTH.verified && <span className="v-tag">illustrative</span>}
            </h3>
            <p className="v-body v-body--tight">{GROWTH.unit}</p>
            <p className="v-figure__source">{GROWTH.source}</p>
          </Beat>
        </Act>

        {/* ── V · THE OPERATORS ──────────────────────────────────────── */}
        <Act api={api} id="operators" vh={420}>
          <Beat api={api} act="operators" from={0} to={0.16} className="v-panel v-panel--top">
            <Kicker>{OPERATORS.kicker}</Kicker>
            <h2 className="v-h2">{OPERATORS.heading}</h2>
            <p className="v-lede">{OPERATORS.body}</p>
          </Beat>

          {OPERATORS.items.map((e, i) => (
            <Beat
              key={e.id}
              api={api}
              act="operators"
              from={0.18 + i * 0.205}
              to={0.385 + i * 0.205}
              hold={i === OPERATORS.items.length - 1}
              className="v-operator"
            >
              <div className="v-card v-card--operator">
                <div className="v-operator__head">
                  <span className="v-operator__role">{e.role}</span>
                  <span className="v-operator__ar">{e.nameAr}</span>
                </div>
                <h3 className="v-operator__name">{e.name}</h3>
                <p className="v-pillar__claim">{e.claim}</p>
                <p className="v-body">{e.body}</p>
                <dl className="v-stats">
                  {e.stats.map((st) => (
                    <div key={st.label} title={st.source}>
                      <dt>{st.label}</dt>
                      <dd>{st.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </Beat>
          ))}
        </Act>

        {/* ── VI · THE SECTOR BOARD ──────────────────────────────────── */}
        <Act api={api} id="board" vh={300}>
          <Beat api={api} act="board" from={0} to={0.2} className="v-panel v-panel--top">
            <Kicker>{BOARD.kicker}</Kicker>
            <h2 className="v-h2">{BOARD.heading}</h2>
            <p className="v-lede">{BOARD.body}</p>
          </Beat>

          <Beat api={api} act="board" from={0.18} to={1} className="v-board" hold>
            <div className="v-board__grid" role="table" aria-label="Sector board">
              <div className="v-board__row v-board__row--head" role="row">
                {BOARD.columns.map((c) => (
                  <span key={c} role="columnheader">{c}</span>
                ))}
              </div>
              {BOARD.rows.map((r) => (
                <div key={r.entity} className={`v-board__row v-board__row--${r.tone}`} role="row">
                  <span className="v-board__entity" role="cell">{r.entity}</span>
                  <span role="cell">{r.mandate}</span>
                  <span className="v-board__scale" role="cell">{r.scale}</span>
                  <span className="v-board__exposure" role="cell">{r.exposure}</span>
                </div>
              ))}
            </div>
            <p className="v-board__asof">{BOARD.asOf}</p>
          </Beat>
        </Act>

        {/* ── VII · THE PILLARS ──────────────────────────────────────── */}
        <Act api={api} id="pillars" vh={340}>
          <Beat api={api} act="pillars" from={0} to={0.2} className="v-panel v-panel--top">
            <Kicker>{PILLARS.kicker}</Kicker>
            <h2 className="v-h2">{PILLARS.heading}</h2>
            <p className="v-lede">{PILLARS.body}</p>
          </Beat>

          {PILLARS.items.map((p, i) => (
            <Beat
              key={p.axis}
              api={api}
              act="pillars"
              from={0.22 + i * 0.26}
              to={0.48 + i * 0.26}
              hold={i === PILLARS.items.length - 1}
              className={`v-pillar v-pillar--${i}`}
            >
              <div className="v-card">
              <span className="v-pillar__ar">{p.axisAr}</span>
              <h3 className="v-h3">{p.axis}</h3>
              <p className="v-pillar__claim">{p.claim}</p>
              <ul className="v-list">
                {p.points.map((pt) => (
                  <li key={pt}>{pt}</li>
                ))}
              </ul>
              </div>
            </Beat>
          ))}

          <div className="v-mapnote">{PILLARS.source}</div>
        </Act>

        {/* ── VI · THE ROADMAP ───────────────────────────────────────── */}
        <Act api={api} id="roadmap" vh={360}>
          <Beat api={api} act="roadmap" from={0} to={0.16} className="v-panel v-panel--top">
            <Kicker>{ROADMAP.kicker}</Kicker>
            <h2 className="v-h2">{ROADMAP.heading}</h2>
            <p className="v-lede">{ROADMAP.body}</p>
          </Beat>

          {ROADMAP.phases.map((ph, i) => (
            <Beat
              key={ph.span}
              api={api}
              act="roadmap"
              from={0.18 + i * 0.205}
              to={0.385 + i * 0.205}
              hold={i === ROADMAP.phases.length - 1}
              className="v-phase"
            >
              <span className="v-phase__span">{ph.span}</span>
              <h3 className="v-phase__title">{ph.title}</h3>
              <p className="v-phase__lede">{ph.lede}</p>
              <ul className="v-list">
                {ph.items.map((it) => (
                  <li key={it}>{it}</li>
                ))}
              </ul>
            </Beat>
          ))}
        </Act>

        {/* ── IX · OUTLOOK ───────────────────────────────────────────── */}
        <Act api={api} id="outlook" vh={380}>
          <Beat api={api} act="outlook" from={0} to={0.16} className="v-panel v-panel--top">
            <Kicker>{OUTLOOK.kicker}</Kicker>
            <h2 className="v-h2">{OUTLOOK.heading}</h2>
            <p className="v-lede">{OUTLOOK.body}</p>
            <span className="v-tag v-tag--analysis">{OUTLOOK.disclaimer}</span>
          </Beat>

          {OUTLOOK.insights.map((it, i) => (
            <Beat
              key={it.head}
              api={api}
              act="outlook"
              from={0.18 + i * 0.205}
              to={0.385 + i * 0.205}
              hold={i === OUTLOOK.insights.length - 1}
              className="v-insight"
            >
              <div className="v-insight__metric">
                <span className="v-insight__value">{it.metric}</span>
                <span className="v-insight__label">{it.metricLabel}</span>
              </div>
              <div className="v-insight__text">
                <h3 className="v-h3">{it.head}</h3>
                <p className="v-body">{it.body}</p>
              </div>
            </Beat>
          ))}
          <div className="v-mapnote">{OUTLOOK.disclaimer}</div>
        </Act>

        {/* ── X · THE CLOSE ──────────────────────────────────────────── */}
        <Act api={api} id="close" vh={280}>
          <Beat api={api} act="close" from={0} to={0.28} className="v-panel v-panel--center">
            <Kicker>{CLOSE.kicker}</Kicker>
            <h2 className="v-h2">{CLOSE.heading}</h2>
            <p className="v-lede">{CLOSE.body}</p>
          </Beat>

          <Beat api={api} act="close" from={0.3} to={0.7} className="v-asks">
            {CLOSE.asks.map((a, i) => (
              <div key={a.title} className="v-ask">
                <span className="v-ask__num">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="v-h3">{a.title}</h3>
                <p className="v-body">{a.body}</p>
              </div>
            ))}
          </Beat>

          <Beat api={api} act="close" from={0.72} to={1} className="v-signoff" hold>
            <div className="v-signoff__rule" aria-hidden="true" />
            <p className="v-signoff__ar">{CLOSE.signoffAr}</p>
            <p className="v-signoff__en">{CLOSE.signoff}</p>
            <p className="v-signoff__meta">
              {EVENT.venueAr} · {EVENT.dateLineAr}
            </p>
            <p className="v-signoff__meta">
              {EVENT.venue} · {EVENT.dateLine}
            </p>
          </Beat>
        </Act>
      </main>
    </div>
  );
}
