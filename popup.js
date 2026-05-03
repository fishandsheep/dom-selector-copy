let lastResults = [];
let livePreviewOn = true;

const selectorInput = document.getElementById("selector");
const livePreviewCheckbox = document.getElementById("livePreview");
const matchCountEl = document.getElementById("matchCount");
const pickElementBtn = document.getElementById("pickElement");

livePreviewCheckbox.checked = true;

async function hydrateLastPickedSelector() {
  const { selectorCopyLastPick } = await chrome.storage.local.get("selectorCopyLastPick");
  if (!selectorCopyLastPick?.selector) return;

  const { selector, tagName, className } = selectorCopyLastPick;
  selectorInput.value = selector;

  if (livePreviewOn) {
    updatePreview(selector);
  }

  const classLabel = className ? `.${className}` : "(无 class)";
  matchCountEl.textContent = `已恢复: ${tagName || ""}${classLabel}`;
}

document.getElementById("helpBtn").addEventListener("click", () => {
  document.getElementById("helpPanel").classList.toggle("show");
});

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function clearPreview() {
  getActiveTab().then((tab) => {
    if (!tab?.id) return;
    chrome.tabs.sendMessage(tab.id, { type: "CLEAR_PREVIEW" });
  });
}

function updatePreview(selector) {
  if (!selector || !livePreviewOn) {
    clearPreview();
    matchCountEl.textContent = "";
    return;
  }

  getActiveTab().then((tab) => {
    if (!tab?.id) return;

    chrome.tabs.sendMessage(
      tab.id,
      {
        type: "PREVIEW_SELECTOR",
        selector,
      },
      (count) => {
        if (chrome.runtime.lastError) {
          matchCountEl.textContent = "";
          return;
        }
        matchCountEl.textContent = count > 0 ? `匹配 ${count} 个元素` : "无匹配";
      }
    );
  });
}

livePreviewCheckbox.addEventListener("change", (e) => {
  livePreviewOn = e.target.checked;
  const selector = selectorInput.value.trim();

  if (!livePreviewOn) {
    clearPreview();
    matchCountEl.textContent = "";
    return;
  }

  if (selector) {
    updatePreview(selector);
  }
});

selectorInput.addEventListener("input", (e) => {
  if (livePreviewOn) {
    updatePreview(e.target.value.trim());
  }
});

pickElementBtn.addEventListener("click", async () => {
  const tab = await getActiveTab();
  if (!tab?.id) return;

  chrome.tabs.sendMessage(tab.id, { type: "START_ELEMENT_PICK" }, (response) => {
    if (chrome.runtime.lastError) {
      matchCountEl.textContent = "当前页面不可拾取（如 chrome:// 页面）";
      return;
    }

    if (!response?.ok) {
      matchCountEl.textContent = "元素拾取启动失败";
      return;
    }

    matchCountEl.textContent = "请在页面中点击一个元素";
  });
});

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type !== "ELEMENT_PICKED") return;

  const { selector, tagName, className } = message.payload || {};
  if (!selector) return;

  selectorInput.value = selector;
  if (livePreviewOn) {
    updatePreview(selector);
  }

  const classLabel = className ? `.${className}` : "(无 class)";
  matchCountEl.textContent = `已填入: ${tagName || ""}${classLabel}`;
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local") return;
  if (!changes.selectorCopyLastPick?.newValue?.selector) return;

  const { selector, tagName, className } = changes.selectorCopyLastPick.newValue;
  selectorInput.value = selector;
  if (livePreviewOn) {
    updatePreview(selector);
  }

  const classLabel = className ? `.${className}` : "(无 class)";
  matchCountEl.textContent = `已同步: ${tagName || ""}${classLabel}`;
});

hydrateLastPickedSelector();

document.getElementById("run").addEventListener("click", async () => {
  const selector = selectorInput.value;
  const tab = await getActiveTab();

  if (!tab?.id) return;

  chrome.tabs.sendMessage(
    tab.id,
    {
      type: "QUERY_SELECTOR",
      selector,
    },
    (response) => {
      lastResults = response || [];
      document.getElementById("result").value = lastResults.join("\n");
    }
  );
});

document.getElementById("copy").addEventListener("click", async () => {
  const text = lastResults.join("\n");
  await navigator.clipboard.writeText(text);
});
