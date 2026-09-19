"use strict";

const ALL_URLS = "<all_urls>";

async function hasAllUrlsPermission() {
  return browser.permissions.contains({origins: [ALL_URLS]});
}

const PERMISSION_NOTIFICATION_ID = "copy-link-text-permission-required";

function notifyPermissionRequired() {
  return browser.notifications.create(PERMISSION_NOTIFICATION_ID, {
    type: "basic",
    iconUrl: browser.runtime.getURL("icons/48.png"),
    title: browser.i18n.getMessage("permissionRequiredNotificationTitle"),
    message: browser.i18n.getMessage("permissionRequiredNotificationMessage"),
  });
}

browser.notifications.onClicked.addListener(notificationId => {
  if (notificationId !== PERMISSION_NOTIFICATION_ID) {
    return;
  }
  browser.notifications.clear(notificationId);
  browser.runtime.openOptionsPage();
});

async function injectLibrary(tabId, target) {
  await browser.scripting.executeScript({
    target: {tabId, ...target},
    injectImmediately: true,
    files: ["content.js"],
  });
}

browser.menus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "copy-link-text") {
    return;
  }

  let linkText = info.linkText;
  if (info.modifiers.length === 1 &&
      info.modifiers[0] === "Shift" &&
      await browser.permissions.request({origins: [ALL_URLS]})) {
    try {
      const target = {frameIds: [info.frameId]};
      await injectLibrary(tab.id, target);
      const [{result}] = await browser.scripting.executeScript({
        target: {tabId: tab.id, ...target},
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

  if (!await hasAllUrlsPermission()) {
    notifyPermissionRequired();
    return;
  }

  try {
    const target = {allFrames: true};
    await injectLibrary(tab.id, target);
    const results = await browser.scripting.executeScript({
      target: {tabId: tab.id, ...target},
      injectImmediately: true,
      func: () => getHoveredLinkText(),
    });
    const linkText = results.map(({result}) => result).find(Boolean);
    if (linkText) {
      writeClipboardText(linkText);
    }
  } catch (ex) {
    console.error(ex);
  }
});
