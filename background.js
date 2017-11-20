"use strict";
const {contextMenus, i18n, tabs, notifications} = browser;

const _ = i18n.getMessage;

function notify(message) {
  notifications.create("copy-link-text-notification", {
    type: "basic",
    title: "Copy Link Text",
    message
  });
}

contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId == "copy-link-text") {
    tabs.executeScript(tab.id, {
      code: `copyToClipboard(${JSON.stringify(info.linkText)});`
    }).catch(error => {
      console.error(error);
      notify("Failed to copy the text.");
    });
  }
});

contextMenus.create({
  id: "copy-link-text",
  title: _("contextMenuItemLink"),
  contexts: ["link"]
});
