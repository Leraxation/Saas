/* =============================================================
   Oman Air — site behaviour
   Navigation, booking tabs, validation, destination filtering,
   region/language preferences. The scroll sequence lives in main.js.
   ============================================================= */

const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/* -------------------------------------------------------------
   Header: transparent over the hero, solid once past it
   ------------------------------------------------------------- */
(function header() {
  const header = $("#header");
  const track = $("#track");
  if (!header) return;
  if (!track) {
    // Inner pages have no canvas hero for the bar to sit over.
    header.classList.add("is-solid");
    return;
  }

  const update = () => {
    // Solid as soon as the canvas hero has scrolled out from under the bar.
    const past = window.scrollY > track.offsetHeight - window.innerHeight * 0.6;
    header.classList.toggle("is-solid", past);
  };
  update();
  addEventListener("scroll", update, { passive: true });
  addEventListener("resize", update);
})();

/* -------------------------------------------------------------
   Primary navigation: mega menus + mobile drawer
   ------------------------------------------------------------- */
(function nav() {
  const burger = $("#burger");
  const primary = $("#primary-nav");

  burger?.addEventListener("click", () => {
    const open = primary.classList.toggle("is-open");
    burger.setAttribute("aria-expanded", String(open));
  });

  const items = $$(".has-menu");

  // Hover drives the menus only where the layout is the floating desktop one
  // and the device actually hovers; elsewhere click does.
  const hoverMenus = () => matchMedia("(hover: hover) and (min-width: 901px)").matches;

  const closeAll = (except) => {
    items.forEach((li) => {
      if (li === except) return;
      li.classList.remove("is-open");
      $("button", li)?.setAttribute("aria-expanded", "false");
    });
  };

  items.forEach((li) => {
    const btn = $("button", li);

    const open = (on) => {
      if (on) closeAll(li);
      li.classList.toggle("is-open", on);
      btn.setAttribute("aria-expanded", String(on));
    };

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      // Where hover already owns the menu, a click would immediately undo
      // what the hover just opened — so let hover keep it.
      if (hoverMenus()) return;
      open(!li.classList.contains("is-open"));
    });

    // Pointer users get hover, but only on the desktop layout where the
    // mega menu is a floating panel rather than an inline accordion.
    li.addEventListener("mouseenter", () => hoverMenus() && open(true));
    li.addEventListener("mouseleave", () => hoverMenus() && open(false));

    // Keyboard: opens on focus, closes when focus leaves the group.
    li.addEventListener("focusin", () => open(true));
    li.addEventListener("focusout", () => {
      requestAnimationFrame(() => {
        if (!li.contains(document.activeElement)) open(false);
      });
    });
  });

  document.addEventListener("click", () => closeAll(null));
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    closeAll(null);
    primary?.classList.remove("is-open");
    burger?.setAttribute("aria-expanded", "false");
  });
})();

/* -------------------------------------------------------------
   Booking tabs
   ------------------------------------------------------------- */
(function tabs() {
  const tabs = $$(".tab");
  if (!tabs.length) return;

  const select = (tab) => {
    tabs.forEach((t) => {
      const on = t === tab;
      t.classList.toggle("is-active", on);
      t.setAttribute("aria-selected", String(on));
      const pane = document.getElementById(t.getAttribute("aria-controls"));
      pane.hidden = !on;
      pane.classList.toggle("is-active", on);
    });
  };

  tabs.forEach((tab, i) => {
    tab.addEventListener("click", () => select(tab));
    tab.addEventListener("keydown", (e) => {
      const dir = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
      if (!dir) return;
      e.preventDefault();
      const next = tabs[(i + dir + tabs.length) % tabs.length];
      next.focus();
      select(next);
    });
  });
})();

/* -------------------------------------------------------------
   Booking form: trip type, swap, validation
   ------------------------------------------------------------- */
(function bookingForm() {
  const today = new Date().toISOString().slice(0, 10);
  $$('input[type="date"]').forEach((i) => (i.min = today));

  // Return date only applies to a return trip.
  const returnField = $("#return-field");
  const ret = $("#ret");
  $$('input[name="trip"]').forEach((radio) => {
    radio.addEventListener("change", () => {
      const isReturn = $('input[name="trip"]:checked').value === "return";
      returnField.hidden = !isReturn;
      ret.required = isReturn;
    });
  });

  $("#swap")?.addEventListener("click", () => {
    const from = $("#from"), to = $("#to");
    [from.value, to.value] = [to.value, from.value];
    from.focus();
  });

  const setError = (input, message) => {
    input.closest(".field")?.classList.toggle("is-bad", Boolean(message));
    const slot = $(`[data-err-for="${input.id}"]`);
    if (slot) slot.textContent = message || "";
    return !message;
  };

  const rules = {
    from: (v) => (v.trim() ? "" : "Choose where you are flying from"),
    to:   (v) => (v.trim() ? "" : "Choose where you are flying to"),
    depart: (v) => (v ? "" : "Pick a departure date"),
    ret:  (v, form) => {
      const isReturn = form.querySelector('input[name="trip"]:checked')?.value === "return";
      if (!isReturn) return "";
      if (!v) return "Pick a return date";
      return v < form.querySelector("#depart").value ? "Return cannot be before departure" : "";
    },
    pnr:    (v) => (/^[A-Za-z0-9]{6}$/.test(v.trim()) ? "" : "Enter the 6-character booking reference"),
    "ci-pnr": (v) => (/^[A-Za-z0-9]{6}$/.test(v.trim()) ? "" : "Enter the 6-character booking reference"),
    surname:    (v) => (v.trim().length > 1 ? "" : "Enter the last name on the booking"),
    "ci-surname": (v) => (v.trim().length > 1 ? "" : "Enter the last name on the booking"),
    "fs-no": (v) => (/^(WY\s?)?\d{1,4}$/i.test(v.trim()) ? "" : "Enter a flight number, e.g. WY 101"),
    "fs-date": (v) => (v ? "" : "Pick a date"),
  };

  $$(".pane").forEach((form) => {
    form.addEventListener("submit", (e) => {
      e.preventDefault();

      let ok = true;
      let firstBad = null;
      $$("input, select", form).forEach((input) => {
        const rule = rules[input.id];
        if (!rule) return;
        if (input.closest("[hidden]")) return;
        const message = rule(input.value, form);
        if (!setError(input, message)) {
          ok = false;
          firstBad = firstBad || input;
        }
      });

      const note = $("[data-note]", form);
      if (!ok) {
        firstBad?.focus();
        note.textContent = "";
        return;
      }

      // No booking engine is wired up on this build — the real flow posts to
      // the reservations system. Confirm the input instead of faking a result.
      if (form.id === "pane-book" && $("#from").value.trim().toLowerCase() === $("#to").value.trim().toLowerCase()) {
        setError($("#to"), "Origin and destination cannot match");
        $("#to").focus();
        return;
      }
      note.textContent = "Search ready — connect this form to the reservations system to return live results.";
    });

    $$("input, select", form).forEach((input) => {
      input.addEventListener("input", () => {
        if (input.closest(".field")?.classList.contains("is-bad")) {
          const rule = rules[input.id];
          if (rule) setError(input, rule(input.value, form));
        }
      });
    });
  });
})();

/* -------------------------------------------------------------
   Destination filter + search
   ------------------------------------------------------------- */
(function destinations() {
  const list = $("#dests");
  if (!list) return;

  const items = $$("li", list);
  const search = $("#dest-search");
  const empty = $("#dest-empty");
  let region = "all";

  const apply = () => {
    const q = (search?.value || "").trim().toLowerCase();
    let shown = 0;
    items.forEach((li) => {
      const matchRegion = region === "all" || li.dataset.region === region;
      const matchText = !q || li.textContent.toLowerCase().includes(q);
      const show = matchRegion && matchText;
      li.hidden = !show;
      if (show) shown++;
    });
    if (empty) empty.hidden = shown > 0;
  };

  $$(".pill").forEach((pill) => {
    pill.addEventListener("click", () => {
      $$(".pill").forEach((p) => p.classList.toggle("is-active", p === pill));
      region = pill.dataset.region;
      apply();
    });
  });

  search?.addEventListener("input", apply);
})();

/* -------------------------------------------------------------
   Region, language and currency
   Preferences are a per-browser convenience, so localStorage is the
   right home for them — wrapped, since it throws in some contexts.
   ------------------------------------------------------------- */
(function preferences() {
  const KEY = "omanair:prefs";
  const sheet = $("#region-sheet");
  const label = $("#region-label");

  const read = () => {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
  };
  const write = (prefs) => {
    try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch { /* private mode */ }
  };

  const applyLanguage = (lang) => {
    const rtl = lang === "ar";
    document.documentElement.lang = rtl ? "ar" : "en";
    document.documentElement.dir = rtl ? "rtl" : "ltr";
    const toggle = $("#lang-toggle");
    if (toggle) {
      toggle.textContent = rtl ? "English" : "العربية";
      toggle.lang = rtl ? "en" : "ar";
    }
  };

  const render = (prefs) => {
    const { country = "Oman", lang = "en", ccy = "OMR" } = prefs;
    if (label) label.textContent = `${country} · ${lang === "ar" ? "العربية" : "English"} · ${ccy}`;
    applyLanguage(lang);
  };

  let prefs = read();
  render(prefs);

  $("#region-btn")?.addEventListener("click", () => {
    $("#sel-country").value = prefs.country || "Oman";
    $("#sel-lang").value = prefs.lang || "en";
    $("#sel-ccy").value = prefs.ccy || "OMR";
    sheet.hidden = false;
    $("#region-btn").setAttribute("aria-expanded", "true");
    $("#sel-country").focus();
  });

  const close = () => {
    sheet.hidden = true;
    $("#region-btn")?.setAttribute("aria-expanded", "false");
    $("#region-btn")?.focus();
  };

  $("#region-close")?.addEventListener("click", close);
  sheet?.addEventListener("click", (e) => { if (e.target === sheet) close(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !sheet.hidden) close(); });

  $("#region-save")?.addEventListener("click", () => {
    prefs = { country: $("#sel-country").value, lang: $("#sel-lang").value, ccy: $("#sel-ccy").value };
    write(prefs);
    render(prefs);
    close();
  });

  // The utility-bar toggle is a shortcut for the language row alone.
  $("#lang-toggle")?.addEventListener("click", () => {
    prefs = { ...prefs, lang: (prefs.lang || "en") === "ar" ? "en" : "ar" };
    write(prefs);
    render(prefs);
  });
})();

/* Footer year */
const yearEl = $("#year");
if (yearEl) yearEl.textContent = String(new Date().getFullYear());
