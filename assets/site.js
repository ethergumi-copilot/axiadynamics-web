/* AXIA Dynamics 홈페이지 — 스크롤 등장 · 상단 바 · 카드 빛 · 메일 복사 */
(() => {
  "use strict";

  // 스크롤 등장 (.reveal → .in) — 흐름선 · 치수 그림도 같은 신호로 그려진다
  const items = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          e.target.classList.add("in");
          io.unobserve(e.target);
        });
      },
      { threshold: 0.14, rootMargin: "0px 0px -6% 0px" }
    );
    items.forEach((el) => io.observe(el));
  } else {
    items.forEach((el) => el.classList.add("in"));
  }

  // 상단 바 — 내리면 흐린 바탕 · 지금 보는 칸 표시
  const nav = document.querySelector(".nav");
  const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 12);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  const links = new Map();
  document.querySelectorAll(".nav-links a").forEach((a) => links.set(a.getAttribute("href").slice(1), a));
  if ("IntersectionObserver" in window && links.size) {
    const spy = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          const a = links.get(e.target.id);
          if (a) a.classList.toggle("active", e.isIntersecting);
        });
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    links.forEach((_, id) => {
      const sec = document.getElementById(id);
      if (sec) spy.observe(sec);
    });
  }

  // 카드 — 마우스를 따라오는 빛
  if (window.matchMedia("(pointer: fine)").matches) {
    document.querySelectorAll(".card").forEach((card) => {
      card.addEventListener("pointermove", (e) => {
        const r = card.getBoundingClientRect();
        card.style.setProperty("--mx", `${e.clientX - r.left}px`);
        card.style.setProperty("--my", `${e.clientY - r.top}px`);
      });
    });
  }

  // 메일 주소 복사
  const btn = document.getElementById("copy-mail");
  const msg = document.getElementById("copy-msg");
  if (btn && msg) {
    btn.addEventListener("click", async () => {
      const mail = btn.dataset.mail;
      let ok = false;
      try {
        await navigator.clipboard.writeText(mail);
        ok = true;
      } catch (_) {
        const ta = document.createElement("textarea");
        ta.value = mail;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        try { ok = document.execCommand("copy"); } catch (__) { ok = false; }
        ta.remove();
      }
      msg.textContent = ok ? `복사했습니다 — ${mail}` : `복사하지 못했습니다. 직접 적어 주세요: ${mail}`;
      clearTimeout(btn._t);
      btn._t = setTimeout(() => (msg.textContent = ""), 4000);
    });
  }
})();
