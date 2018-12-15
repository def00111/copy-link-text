"use strict";

browser.menus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId != "copy-link-text") {
    return;
  }

  let linkText = info.linkText;
  if (info.modifiers &&
      info.modifiers.length == 1 &&
      info.modifiers[0] == "Shift") {
    let result;
    try {
      result = await browser.tabs.executeScript(tab.id, {
        frameId: info.frameId,
        code: `
          var title = "";
          var elem = browser.menus.getTargetElement(${info.targetElementId});
          while (elem) {
            if (elem.href ||
                elem.hasAttribute("href") ||
                elem.hasAttributeNS("http://www.w3.org/1999/xlink", "href")) {
              if (elem.hasAttribute("title")) {
                title = elem.getAttribute("title");
              }
              break;
            }
            elem = elem.parentElement;
          }
          title;
        `,
      });
    }
    catch(ex) {
      console.error(ex);
    }
    if (result &&
        result[0] != "" &&
        result[0] != linkText) {
      linkText = result[0];
    }
  }

  linkText = JSON.stringify(linkText)
                 .replace(/^"|"$/g, "")
                 .replace(/\\(?=")/g, "");

  navigator.clipboard.writeText(linkText).catch(() => {
    console.error("Failed to copy the link text.");
  });
});

browser.menus.create({
  id: "copy-link-text",
  title: browser.i18n.getMessage("contextMenuItemLink"),
  contexts: ["link"],
});
