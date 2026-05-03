(() => {
  const STYLE_ID = "__selector-copy-highlight-style__";
  const CLASS = "__selector-copy-hl__";
  const PICK_CLASS = "__selector-copy-pick__";

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
      .${PICK_CLASS} {
        outline: 2px dashed #4a90d9 !important;
        outline-offset: 1px !important;
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  let highlighted = [];
  let pickHoverEl = null;
  let pickModeOn = false;

  function clearHighlights() {
    for (const el of highlighted) el.classList.remove(CLASS);
    highlighted = [];
  }

  function applyHighlights(selector) {
    clearHighlights();
    if (!selector) return 0;
    try {
      const elements = document.querySelectorAll(selector);
      elements.forEach((el) => el.classList.add(CLASS));
      highlighted = Array.from(elements);
      return highlighted.length;
    } catch {
      return -1;
    }
  }

  function normalizeClassName(className = "") {
    return className
      .trim()
      .split(/\s+/)
      .filter((name) => name && name !== PICK_CLASS && name !== CLASS)[0] || "";
  }

  function buildSimpleSelector(el) {
    const tag = (el.tagName || "").toLowerCase();
    const firstClass = normalizeClassName(el.className || "");
    return firstClass ? `${tag}.${firstClass}` : tag;
  }

  function onPickMouseMove(e) {
    if (!pickModeOn) return;
    const el = e.target;
    if (!(el instanceof Element)) return;

    if (pickHoverEl && pickHoverEl !== el) {
      pickHoverEl.classList.remove(PICK_CLASS);
    }

    pickHoverEl = el;
    pickHoverEl.classList.add(PICK_CLASS);
  }

  function stopPickMode() {
    pickModeOn = false;
    if (pickHoverEl) {
      pickHoverEl.classList.remove(PICK_CLASS);
      pickHoverEl = null;
    }
    document.removeEventListener("mousemove", onPickMouseMove, true);
    document.removeEventListener("click", onPickClick, true);
  }

  function onPickClick(e) {
    if (!pickModeOn) return;
    e.preventDefault();
    e.stopPropagation();

    const el = e.target;
    if (!(el instanceof Element)) {
      stopPickMode();
      return;
    }

    const payload = {
      tagName: (el.tagName || "").toLowerCase(),
      className: normalizeClassName(el.className || ""),
      selector: buildSimpleSelector(el),
    };

    stopPickMode();
    chrome.storage.local.set({
      selectorCopyLastPick: {
        ...payload,
        pickedAt: Date.now(),
      },
    });
    chrome.runtime.sendMessage({ type: "ELEMENT_PICKED", payload });
  }

  function startPickMode() {
    stopPickMode();
    pickModeOn = true;
    document.addEventListener("mousemove", onPickMouseMove, true);
    document.addEventListener("click", onPickClick, true);
  }

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
        const results = Array.from(elements)
          .map((el) => (el.innerText || el.textContent || "").trim())
          .filter(Boolean);
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

    if (request.type === "START_ELEMENT_PICK") {
      startPickMode();
      sendResponse({ ok: true });
    }
  });
})();
