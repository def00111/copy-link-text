"use strict";

browser.menus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "copy-link-text") {
    return;
  }

  let linkText = info.linkText;
  if (info.modifiers.length === 1 &&
      info.modifiers[0] === "Shift") {
    try {
      const [{result}] = await browser.scripting.executeScript({
        target: {
          tabId: tab.id,
          frameIds: [info.frameId],
        },
        injectImmediately: true,
        func: targetElementId => {
          const res = {};
          let target = browser.menus.getTargetElement(targetElementId);
          let link = findLink(target);
          if (link) {
            res.title = findTitle(link);
          }
          res.title ??= "";
          return res;
        },
        args: [info.targetElementId],
      });
      if (result.title) {
        linkText = result.title;
      }
    } catch (ex) {
      console.error(ex);
    }
  }

  writeClipboardText(linkText);
});

async function writeClipboardText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch (error) {
    console.error(`Failed to copy link text: ${error.message}`);
  }
}

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

browser.commands.onCommand.addListener(async (name, tab) => {
  if (name !== 'copy-link-text') return;
  try {
    const linkText = await browser.tabs.sendMessage(tab.id, {
      type: 'getLinkText'
    });
    if (linkText) {
      writeClipboardText(linkText);
    }
  } catch (ex) {
    console.error(ex);
  }
});
