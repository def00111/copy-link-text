"use strict";

browser.menus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId != "copy-link-text") {
    return;
  }

  let text = info.linkText;
  if (info.modifiers &&
      info.modifiers.length == 1 &&
      info.modifiers[0] == "Shift") {
    let result;
    try {
      result = await browser.tabs.executeScript(tab.id, {
        frameId: info.frameId,
        code: `
          var text = "";
          var elem = browser.menus.getTargetElement(${info.targetElementId});
          while (elem) {
            var url = elem.href;
            if (url) {
              // Handle SVG links:
              if (typeof url == "object" && url.animVal) {
                url = new URL(url.animVal, elem.baseURI).href;
              }
            }

            if (!url) {
              var href = elem.getAttribute("href") ||
                         elem.getAttributeNS("http://www.w3.org/1999/xlink", "href");

              if (href && /\S/.test(href)) {
                url = new URL(href, elem.baseURI).href;
              }
            }

            if (url && url == "${info.linkUrl}") {
              if (elem.hasAttribute("title")) {
                text = elem.getAttribute("title");
              }
              break;
            }
            elem = elem.parentElement;
          }
          text;
        `,
      });
    }
    catch(ex) {
    }
    if (result && result[0] != "") {
      text = result[0];
    }
  }

  text = JSON.stringify(text).slice(1, -1);
  navigator.clipboard.writeText(text).catch(() => {
    console.error("Failed to copy the link text.");
  });
});

browser.menus.create({
  id: "copy-link-text",
  title: browser.i18n.getMessage("contextMenuItemLink"),
  contexts: ["link"]
});
