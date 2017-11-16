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

let doCopy = String(text => {
  document.addEventListener("copy", evt => {
    evt.clipboardData.setData("text", text);
    evt.preventDefault();
  }, {
    capture: true,
    once: true
  });
  document.execCommand("copy");
});

contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId == "copy-link-text") {
    let text = info.linkText.replace(/\\/g, "\\\\");
    tabs.executeScript(tab.id, {
      code: `(${doCopy})("${text}");`
    }).catch(error => {
      console.error(error)
      notify("Failed to copy the text.");
    });
  }
});

contextMenus.create({
  id: "copy-link-text",
  title: _("contextMenuItemLink"),
  contexts: ["link"]
});
