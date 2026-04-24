(() => {
  const STYLE_ID = "__selector-copy-highlight-style__";
  const CLASS = "__selector-copy-hl__";

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .${CLASS} {
        outline: 2px solid #e8832a !important;
        outline-offset: 1px !important;
        background-color: rgba(232, 131, 42, 0.12) !important;
        transition: outline-color 0.15s, background-color 0.15s !important;
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  let highlighted = [];

  function clearHighlights() {
    for (const el of highlighted) {
      el.classList.remove(CLASS);
    }
    highlighted = [];
  }

  function applyHighlights(selector) {
    clearHighlights();
    if (!selector) return 0;
    try {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => el.classList.add(CLASS));
      highlighted = Array.from(elements);
      return highlighted.length;
    } catch {
      return -1;
    }
  }

  // Re-highlight on scroll/resize to keep overlays in sync
  let currentSelector = "";
  let rafId = 0;
  function scheduleRefresh() {
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => {
      if (currentSelector) applyHighlights(currentSelector);
    });
  }

  function startListening() {
    window.addEventListener("scroll", scheduleRefresh, true);
    window.addEventListener("resize", scheduleRefresh);
  }

  function stopListening() {
    window.removeEventListener("scroll", scheduleRefresh, true);
    window.removeEventListener("resize", scheduleRefresh);
    cancelAnimationFrame(rafId);
  }

  injectStyle();

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "QUERY_SELECTOR") {
      try {
        const elements = document.querySelectorAll(request.selector);
        const results = Array.from(elements).map(el =>
          (el.innerText || el.textContent || "").trim()
        ).filter(Boolean);
        sendResponse(results);
      } catch (e) {
        sendResponse(["Error: " + e.message]);
      }
    }

    if (request.type === "PREVIEW_SELECTOR") {
      currentSelector = request.selector;
      const count = applyHighlights(request.selector);
      if (count >= 0) {
        startListening();
        sendResponse(count);
      } else {
        stopListening();
        sendResponse(0);
      }
    }

    if (request.type === "CLEAR_PREVIEW") {
      currentSelector = "";
      clearHighlights();
      stopListening();
      sendResponse(0);
    }
  });
})();
