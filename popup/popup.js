const toggle = document.querySelector("#enabled");
chrome.storage.local.get({ enabled: true }, prefs => {
  toggle.checked = prefs.enabled !== false;
});
toggle.addEventListener("change", () => {
  chrome.storage.local.set({ enabled: toggle.checked });
});
