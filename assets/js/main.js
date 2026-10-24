(() => {
  const root = document.documentElement;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const hasGsap = typeof gsap !== "undefined";
  const ease = "expo.out";
  root.classList.add("ok");

  /* ---------- Lenis + GSAP on one ticker ---------- */
  let lenis = null;
  if (hasGsap) {
    gsap.registerPlugin(ScrollTrigger);
    if (!reduced && typeof Lenis !== "undefined") {
      lenis = new Lenis({ autoRaf: false, lerp: 0.12 });
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add((t) => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    }
  }
  $$('a[href^="#"]').forEach((a) =>
    a.addEventListener("click", (e) => {
      const t = $(a.getAttribute("href"));
      if (!t) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(t, { offset: -16 });
      else t.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
      t.setAttribute("tabindex", "-1");
      t.focus({ preventScroll: true });
    })
  );

  /* ---------- shutter: open on arrival, close on leave ---------- */
  const shutter = $(".shutter");
  const slats = shutter ? $$("i", shutter) : [];
  if (hasGsap && !reduced && shutter && root.classList.contains("shut")) {
    gsap.set(slats, { scaleY: 1 });
    gsap.to(slats, {
      scaleY: 0, duration: 0.7, ease, stagger: 0.045, delay: 0.12,
      onComplete: () => { root.classList.remove("shut"); sessionStorage.removeItem("shutter"); },
    });
  } else {
    root.classList.remove("shut");
  }
  addEventListener("pageshow", (e) => {
    if (e.persisted && hasGsap && slats.length) { gsap.set(slats, { scaleY: 0 }); root.classList.remove("shut"); }
  });
  if (hasGsap && !reduced && shutter) {
    $$("a[data-shutter]").forEach((a) =>
      a.addEventListener("click", (e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
        e.preventDefault();
        const href = a.href;
        shutter.style.visibility = "visible";
        sessionStorage.setItem("shutter", "1");
        gsap.fromTo(slats, { scaleY: 0 }, {
          scaleY: 1, duration: 0.5, ease: "expo.inOut", stagger: 0.04,
          onComplete: () => { location.href = href; },
        });
        setTimeout(() => { location.href = href; }, 1600);
      })
    );
  }

  /* ---------- hero: name revealed by shutter slats, once ---------- */
  const lines = $$(".name-line");
  if (lines.length && hasGsap && !reduced) {
    lines.forEach((l) => {
      const s = document.createElement("span");
      s.className = "slats";
      s.setAttribute("aria-hidden", "true");
      s.innerHTML = "<i></i>".repeat(9);
      l.appendChild(s);
    });
    const go = () => {
      const tl = gsap.timeline({ delay: root.classList.contains("shut") ? 0.7 : 0.1 });
      lines.forEach((l, n) =>
        tl.to($$("i", l), { scaleY: 0, duration: 0.8, ease, stagger: 0.05 }, n * 0.18)
      );
      tl.add(() => lines.forEach((l) => $(".slats", l).remove()));
    };
    root.classList.add("name-ready");
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(go);
  }

  /* ---------- entrances ---------- */
  if (hasGsap && !reduced) {
    const items = $$("[data-rise]");
    gsap.set(items, { opacity: 0, y: 28 });
    const rio = new IntersectionObserver((es) => {
      const hit = es.filter((e) => e.isIntersecting);
      hit.forEach((e, n) => {
        rio.unobserve(e.target);
        gsap.to(e.target, { opacity: 1, y: 0, duration: 0.9, ease, delay: n * 0.08 });
      });
    }, { rootMargin: "0px 0px -6% 0px" });
    items.forEach((el) => rio.observe(el));
    // the one scroll-expand moment: the first project's screen grows into place
    $$("[data-expand] .browser").forEach((b) => {
      gsap.fromTo(b, { scale: 0.84 }, {
        scale: 1, ease: "none",
        scrollTrigger: { trigger: b, start: "top 95%", end: "top 30%", scrub: true },
      });
    });
    // phone mock drifts a little against the scroll
    $$("[data-drift]").forEach((el) =>
      gsap.to(el, { yPercent: Number(el.dataset.drift), ease: "none",
        scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true } })
    );
  }

  /* ---------- rail: active nav + project in view ---------- */
  const now = $(".rail-now");
  const navLinks = $$(".rail-nav a");
  if ("IntersectionObserver" in window) {
    const projects = $$("[data-name]");
    const pio = new IntersectionObserver((es) => {
      es.forEach((e) => {
        if (!e.isIntersecting || !now) return;
        const el = e.target;
        now.innerHTML = "";
        const s = document.createElement("strong"); s.textContent = el.dataset.name;
        const t = document.createElement("span"); t.textContent = el.dataset.tags;
        now.append(s, t);
      });
    }, { rootMargin: "-45% 0px -45% 0px" });
    projects.forEach((p) => pio.observe(p));
    const secs = navLinks.filter((a) => a.getAttribute("href").startsWith("#")).map((a) => $(a.getAttribute("href"))).filter(Boolean);
    const nio = new IntersectionObserver((es) => {
      es.forEach((e) => {
        if (!e.isIntersecting) return;
        navLinks.forEach((a) => { if (a.getAttribute("href") !== "#" + e.target.id) a.removeAttribute("aria-current"); else a.setAttribute("aria-current", "true"); });
        if (projects.length && !e.target.querySelector("[data-name]") && now && e.target.id !== "work") now.innerHTML = "";
      });
    }, { rootMargin: "-40% 0px -55% 0px" });
    secs.forEach((s) => nio.observe(s));
  }

  /* ---------- demo storefront: pick a category ---------- */
  const cats = $$(".shop-cats button");
  const list = $(".shop-products");
  const data = [
    [["کفش ورزشی", "۱٬۸۹۰٬۰۰۰"], ["هودی نخی", "۹۸۰٬۰۰۰"]],
    [["قوری استیل", "۷۴۰٬۰۰۰"], ["چراغ مطالعه", "۵۶۰٬۰۰۰"]],
    [["هدفون بی‌سیم", "۲٬۳۵۰٬۰۰۰"], ["پاوربانک", "۱٬۱۲۰٬۰۰۰"]],
    [["کتاب آشپزی", "۳۴۰٬۰۰۰"], ["دفتر یادداشت", "۱۲۰٬۰۰۰"]],
  ];
  cats.forEach((b, i) =>
    b.addEventListener("click", () => {
      cats.forEach((c) => c.setAttribute("aria-pressed", String(c === b)));
      $$("li", list).forEach((li, n) => {
        $("b", li).textContent = data[i][n][0];
        $("small", li).textContent = data[i][n][1] + " تومان";
      });
      if (hasGsap && !reduced) gsap.fromTo($$("li", list), { y: 10, opacity: 0.2 }, { y: 0, opacity: 1, duration: 0.45, ease, stagger: 0.06 });
    })
  );

  /* ---------- muted loops play only while visible ---------- */
  $$("video[data-loop]").forEach((v) => {
    if (reduced || !("IntersectionObserver" in window)) { v.controls = true; return; }
    new IntersectionObserver((es) => es.forEach((e) => (e.isIntersecting ? v.play().catch(() => {}) : v.pause())), { threshold: 0.4 }).observe(v);
  });

  /* ---------- copy email ---------- */
  const cm = $(".copy-mail");
  if (cm) {
    const label = cm.textContent;
    cm.addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(cm.dataset.email); cm.textContent = "Copied"; }
      catch { location.href = "mailto:" + cm.dataset.email; return; }
      setTimeout(() => (cm.textContent = label), 1600);
    });
  }
})();
