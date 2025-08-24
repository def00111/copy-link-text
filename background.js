"use strict";

browser.menus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId != "copy-link-text") {
    return;
  }

  let linkText = info.linkText;
  if (info.modifiers.length == 1 &&
      info.modifiers[0] == "Shift") {
    // activeTab doesn't work properly for frames
    const response = await browser.permissions.request({
      origins: ["<all_urls>"]
    });
    if (response) {
      try {
        const [{result}] = await browser.scripting.executeScript({
          target: {
            tabId: tab.id,
            frameIds: [info.frameId],
          },
          injectImmediately: true,
          func: targetElementId => {
            const XLINK_NS = "http://www.w3.org/1999/xlink";
            let title = "";
            let elem = browser.menus.getTargetElement(targetElementId);
            for (; elem; elem = elem.parentElement) {
              if ("href" in elem ||
                  elem.hasAttribute("href") ||
                  elem.hasAttributeNS(XLINK_NS, "href")) {
                title = elem.getAttribute("title") ??
                        elem.getAttributeNS(XLINK_NS, "title") ??
                        elem.querySelector("[title]")?.getAttribute("title") ?? "";
                break;
              }
            }
            return title;
          },
          args: [info.targetElementId],
        });
        if (result) {
          linkText = result;
        }
      } catch(ex) {
        console.error(ex);
      }
    }
  }

  navigator.clipboard.writeText(linkText).catch(error => {
    console.error("Failed to copy the link text.", error);
  });
});

browser.menus.onShown.addListener((info, tab) => {
  if (!info.contexts.includes("link")) {
    return;
  }

  if (!info.menuIds.length) {
    browser.menus.create({
      id: "copy-link-text",
      title: browser.i18n.getMessage("contextMenuItemLink"),
      contexts: ["link"],
    },
    () => browser.menus.refresh());
  }
});
