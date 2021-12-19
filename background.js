"use strict";

browser.menus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId != "copy-link-text") {
    return;
  }

  let linkText = info.linkText;
  if (info.modifiers &&
      info.modifiers.length == 1 &&
      info.modifiers[0] == "Shift") {
    let response = await browser.permissions.request({origins: ["<all_urls>"]});
    if (response) {
      let result;
      try {
        result = (await browser.tabs.executeScript(tab.id, {
          frameId: info.frameId,
          matchAboutBlank: true,
          code: `
            var title = "";
            var XLINK_NS = "http://www.w3.org/1999/xlink";
            var elem = browser.menus.getTargetElement(${info.targetElementId});
            for (; elem; elem = elem.parentElement) {
              if (elem.href ||
                  elem.hasAttribute("href") ||
                  elem.hasAttributeNS(XLINK_NS, "href")) {
                title = elem.getAttribute("title") ??
                        elem.getAttributeNS(XLINK_NS, "title") ??
                        elem.querySelector("[title]")?.getAttribute("title") ?? "";
                break;
              }
            }
            title;
          `,
        }))[0];
      }
      catch(ex) {
        console.error(ex);
      }
      if (result &&
          result != "" &&
          result != linkText) {
        linkText = result;
      }
    }
  }

  navigator.clipboard.writeText(linkText).catch(() => {
    console.error("Failed to copy the link text.");
  });
});

browser.menus.create({
  id: "copy-link-text",
  title: browser.i18n.getMessage("contextMenuItemLink"),
  contexts: ["link"],
});
