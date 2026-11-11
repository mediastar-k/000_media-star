(() => {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  const root = document.documentElement;

  const year = document.querySelector("[data-year]");
  if (year) year.textContent = String(new Date().getFullYear());

  const video = document.querySelector(".hero__video");
  const toggle = document.querySelector("[data-video-toggle]");
  const label = toggle && toggle.querySelector(".hero__toggle-text");
  let userPaused = false;

  const setToggle = (paused) => {
    if (!toggle) return;
    toggle.setAttribute("aria-pressed", String(paused));
    label.textContent = paused ? "Video abspielen" : "Video anhalten";
  };

  const tryPlay = () => {
    if (!video) return;
    const p = video.play();
    if (p && p.catch) p.catch(() => setToggle(true));
  };

  if (video) {
    const markPlaying = () => video.classList.add("is-playing");
    video.addEventListener("playing", markPlaying);
    if (!video.paused && video.readyState > 2) markPlaying();
    video.addEventListener("error", () => root.classList.add("no-video"), true);

    if (reduce.matches) {
      video.removeAttribute("autoplay");
      video.pause();
      setToggle(true);
    }

    toggle && toggle.addEventListener("click", () => {
      if (video.paused) { userPaused = false; tryPlay(); setToggle(false); }
      else { userPaused = true; video.pause(); setToggle(true); }
    });

    const heroWatch = new IntersectionObserver(([e]) => {
      if (userPaused || reduce.matches) return;
      if (e.isIntersecting) tryPlay(); else video.pause();
    }, { threshold: 0.05 });
    heroWatch.observe(video.closest(".hero"));

    reduce.addEventListener("change", () => {
      if (reduce.matches) { video.pause(); setToggle(true); }
    });
  }

  const bar = document.querySelector("[data-bar]");
  const hero = document.querySelector(".hero");
  const layers = [...document.querySelectorAll("[data-depth]")];
  const fade = document.querySelector("[data-fade]");
  let ticking = false;
  let vh = window.innerHeight;
  const small = window.matchMedia("(max-width: 40rem)");

  const frame = () => {
    ticking = false;
    const y = window.scrollY;
    if (bar) bar.classList.toggle("is-solid", y > vh * 0.6);
    if (reduce.matches) return;
    const k = small.matches ? 0.6 : 1;
    for (const el of layers) {
      const host = el.parentElement;
      const r = host.getBoundingClientRect();
      if (r.bottom < -vh * 0.2 || r.top > vh * 1.2) continue;
      const depth = parseFloat(el.dataset.depth) * k;
      const offset = el.closest(".hero") ? -r.top : (vh / 2 - (r.top + r.height / 2));
      el.style.transform = `translate3d(0, ${(offset * depth).toFixed(2)}px, 0)`;
    }
    if (fade && hero) {
      const p = Math.min(1, Math.max(0, window.scrollY / (hero.offsetHeight * 0.75)));
      fade.style.opacity = String(1 - p * 0.9);
    }
  };

  const request = () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };
  window.addEventListener("scroll", request, { passive: true });
  window.addEventListener("resize", () => { vh = window.innerHeight; request(); }, { passive: true });
  reduce.addEventListener("change", () => {
    if (reduce.matches) {
      layers.forEach((el) => { el.style.transform = ""; });
      if (fade) fade.style.opacity = "";
    }
    request();
  });
  frame();

  const reveals = document.querySelectorAll("[data-reveal]");
  if ("IntersectionObserver" in window && !reduce.matches) {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
      }
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.05 });
    reveals.forEach((el, i) => {
      const sib = el.parentElement ? [...el.parentElement.children].indexOf(el) : 0;
      el.style.transitionDelay = `${Math.min(sib, 4) * 70}ms`;
      io.observe(el);
    });
  } else {
    reveals.forEach((el) => el.classList.add("is-in"));
  }

  const setFact = (key, value, unit) => {
    const v = document.querySelector(`[data-fact="${key}"]`);
    const u = document.querySelector(`[data-fact-unit="${key}"]`);
    if (v) v.textContent = value;
    if (u) u.textContent = unit;
  };
  const fmt = new Intl.NumberFormat("de-DE");
  const fmt1 = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 });

  const measure = () => {
    const nav = performance.getEntriesByType("navigation")[0];
    if (nav && nav.domContentLoadedEventEnd > 0) {
      const ms = Math.round(nav.domContentLoadedEventEnd - nav.startTime);
      if (ms >= 1000) setFact("ready", fmt1.format(ms / 1000), "Sekunden");
      else setFact("ready", fmt.format(ms), "Millisekunden");
    }
    let bytes = nav ? (nav.transferSize || nav.encodedBodySize || 0) : 0;
    for (const r of performance.getEntriesByType("resource")) {
      if (r.initiatorType === "video" || /\.(mp4|webm)(\?|$)/.test(r.name)) continue;
      bytes += r.transferSize || r.encodedBodySize || 0;
    }
    if (bytes > 0) setFact("weight", fmt.format(Math.round(bytes / 1024)), "KB");
    else setFact("weight", "", "hier nicht messbar");
    setFact("width", fmt.format(window.innerWidth), "Pixel");
  };
  window.addEventListener("resize", () => setFact("width", fmt.format(window.innerWidth), "Pixel"), { passive: true });
  if (document.readyState === "complete") setTimeout(measure, 0);
  else window.addEventListener("load", () => setTimeout(measure, 0), { once: true });

  const form = document.querySelector("[data-form]");
  if (form && window.fetch) {
    form.noValidate = true;
    const status = form.querySelector("[data-form-status]");
    const submit = form.querySelector("[type=submit]");
    const fields = [...form.querySelectorAll(".field")];
    const check = (field) => {
      const input = field.querySelector("input, textarea");
      const error = field.querySelector(".field__error");
      const ok = input.checkValidity();
      field.classList.toggle("is-invalid", !ok);
      input.setAttribute("aria-invalid", String(!ok));
      error.textContent = ok ? "" : error.dataset.error;
      return ok;
    };
    fields.forEach((field) => {
      const input = field.querySelector("input, textarea");
      input.addEventListener("blur", () => { if (input.value) check(field); });
      input.addEventListener("input", () => { if (field.classList.contains("is-invalid")) check(field); });
    });
    const say = (text, error) => { status.textContent = text; status.classList.toggle("is-error", error); };

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const invalid = fields.filter((f) => !check(f));
      if (invalid.length) { invalid[0].querySelector("input, textarea").focus(); return; }
      const data = Object.fromEntries(new FormData(form));
      if (data._honey) { form.reset(); say("Danke! Ihre Nachricht ist bei uns angekommen.", false); return; }
      submit.disabled = true;
      submit.textContent = "Wird gesendet …";
      say("", false);
      try {
        const res = await fetch(form.action.replace("formsubmit.co/", "formsubmit.co/ajax/"), {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(data),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok || String(body.success) !== "true") throw new Error();
        form.reset();
        say("Danke! Ihre Nachricht ist bei uns angekommen.", false);
      } catch {
        say("Das hat leider nicht geklappt. Bitte schreiben Sie uns direkt an media.star@web.de.", true);
      } finally {
        submit.disabled = false;
        submit.textContent = "Nachricht senden";
      }
    });
  }
})();
