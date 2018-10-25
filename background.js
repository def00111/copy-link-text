"use strict";

function notify(message) {
  browser.notifications.create("copy-link-text-notification", {
    type: "basic",
    title: "Copy Link Text",
    message
  });
}

browser.menus.onClicked.addListener((info, tab) => {
  if (info.menuItemId == "copy-link-text") {
    let linkText = JSON.stringify(info.linkText).slice(1, -1);
    navigator.clipboard.writeText(linkText).catch(() => {
      notify("Failed to copy the link text.");
    });
  }
});

browser.menus.create({
  id: "copy-link-text",
  title: browser.i18n.getMessage("contextMenuItemLink"),
  contexts: ["link"]
});
