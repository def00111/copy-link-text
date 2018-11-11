"use strict";

browser.menus.onClicked.addListener((info, tab) => {
  if (info.menuItemId == "copy-link-text") {
    let linkText = JSON.stringify(info.linkText).slice(1, -1);
    navigator.clipboard.writeText(linkText).catch(() => {
      console.error("Failed to copy the link text.");
    });
  }
});

browser.menus.create({
  id: "copy-link-text",
  title: browser.i18n.getMessage("contextMenuItemLink"),
  contexts: ["link"]
});
