function enableSidePanelOnActionClick() {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
}

chrome.runtime.onInstalled.addListener(() => {
  enableSidePanelOnActionClick();
});

chrome.runtime.onStartup.addListener(() => {
  enableSidePanelOnActionClick();
});
