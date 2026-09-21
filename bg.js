"use strict";

const ALL_URLS = "<all_urls>";

function hasAllUrlsPermission() {
  return browser.permissions.contains({origins: [ALL_URLS]});
}

function requestAllUrlsPermission() {
  return browser.permissions.request({origins: [ALL_URLS]});
}

const PERMISSION_NOTIFICATION_ID = "copy-link-text-permission-required";

browser.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "copy-link-text-alarm") {
    browser.notifications.clear(PERMISSION_NOTIFICATION_ID);
  }
});

const _ = browser.i18n.getMessage.bind(browser.i18n);

async function notifyPermissionRequired() {
  await browser.notifications.create(PERMISSION_NOTIFICATION_ID, {
    type: "basic",
    iconUrl: browser.runtime.getURL("icons/48.png"),
    title: _("permissionRequiredNotificationTitle"),
    message: _("permissionRequiredNotificationMessage"),
  });
  await browser.alarms.create("copy-link-text-alarm", {
    delayInMinutes: 0.5
  });
}

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
      await requestAllUrlsPermission()) {
    try {
      const target = {frameIds: [info.frameId]};
      await injectLibrary(tab.id, target);
      const [{result}] = await browser.scripting.executeScript({
        target: {tabId: tab.id, ...target},
        injectImmediately: true,
        func: (info) => {
          const res = {};
          let target = browser.menus.getTargetElement(info.targetElementId);
          let link = target.composedClosest("a, area");
          if (link) {
            res.title = copyLinkText.findTitle(link);
          }
          res.title ??= "";
          return res;
        },
        args: [info],
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
      title: _("contextMenuItemLink"),
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
      func: () => {
        const link = copyLinkText.findHoveredLink();
        if (link) {
          return copyLinkText.getLinkText(link);
        }
        return null;
      },
    });
    const linkText = results.map(({result}) => result).find(Boolean);
    if (linkText) {
      writeClipboardText(linkText);
    }
  } catch (ex) {
    console.error(ex);
  }
});
