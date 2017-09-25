"use strict";
const {contextMenus, i18n} = browser;

const _ = i18n.getMessage;

let input = null;

contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId == "copy-link-text") {
    if (!input) {
      input = document.createElement("input");
      document.body.append(input);
    }

    if (input.value != info.linkText) {
      input.value = info.linkText;
      input.select();
    }
    document.execCommand("copy");
  }
});

contextMenus.create({
  id: "copy-link-text",
  title: _("contextMenuItemLink"),
  contexts: ["link"]
});
