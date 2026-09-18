"use strict";

const ALL_URLS = "<all_urls>";

const statusEl = document.getElementById("permission-status");
const buttonEl = document.getElementById("grant-permission");

buttonEl.textContent = browser.i18n.getMessage("optionsGrantPermissionButton");

async function refresh() {
  const granted = await browser.permissions.contains({origins: [ALL_URLS]});
  statusEl.textContent = browser.i18n.getMessage(
    granted ? "optionsPermissionGranted" : "optionsPermissionNotGranted"
  );
  buttonEl.hidden = granted;
}

buttonEl.addEventListener("click", async () => {
  await browser.permissions.request({origins: [ALL_URLS]});
  refresh();
});

browser.permissions.onAdded.addListener(refresh);
browser.permissions.onRemoved.addListener(refresh);

refresh();
