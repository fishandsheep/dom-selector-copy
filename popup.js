let lastResults = [];
let livePreviewOn = false;

document.getElementById("helpBtn").addEventListener("click", () => {
  document.getElementById("helpPanel").classList.toggle("show");
});

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function updatePreview(selector) {
  if (!selector || !livePreviewOn) {
    chrome.tabs.sendMessage((chrome.devtoolsInspectedWindow ? undefined : undefined), { type: "CLEAR_PREVIEW" });
  }
  getActiveTab().then(tab => {
    chrome.tabs.sendMessage(tab.id, {
      type: "PREVIEW_SELECTOR",
      selector
    }, (response) => {
      const countEl = document.getElementById("matchCount");
      if (chrome.runtime.lastError) {
        countEl.textContent = "";
        return;
      }
      const count = Array.isArray(response) ? response.length : 0;
      countEl.textContent = count > 0 ? `匹配 ${count} 个元素` : (selector ? "无匹配" : "");
    });
  });
}

document.getElementById("livePreview").addEventListener("change", (e) => {
  livePreviewOn = e.target.checked;
  const selector = document.getElementById("selector").value.trim();
  if (!livePreviewOn) {
    getActiveTab().then(tab => {
      chrome.tabs.sendMessage(tab.id, { type: "CLEAR_PREVIEW" });
    });
    document.getElementById("matchCount").textContent = "";
  } else if (selector) {
    updatePreview(selector);
  }
});

document.getElementById("selector").addEventListener("input", (e) => {
  if (livePreviewOn) {
    updatePreview(e.target.value.trim());
  }
});

document.getElementById("run").addEventListener("click", async () => {
  const selector = document.getElementById("selector").value;

  const tab = await getActiveTab();

  chrome.tabs.sendMessage(tab.id, {
    type: "QUERY_SELECTOR",
    selector
  }, (response) => {
    lastResults = response || [];
    document.getElementById("result").value = lastResults.join("\n");
  });
});

document.getElementById("copy").addEventListener("click", async () => {
  const text = lastResults.join("\n");
  await navigator.clipboard.writeText(text);
});
