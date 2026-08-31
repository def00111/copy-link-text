"use strict";
const lastHoveredLink = new Map(); // tabId -> {href, linkText}

browser.runtime.onMessage.addListener((message, sender) => {
  try {
    if (!sender?.tab) return;
    const tabId = sender.tab.id;
    if (message?.type === 'hover') {
      lastHoveredLink.set(tabId, { href: message.href, linkText: message.linkText });
    } else if (message?.type === 'getLastHovered') {
      return Promise.resolve(lastHoveredLink.get(tabId) || null);
    }
  } catch (ex) {
    console.error(ex);
  }
  return undefined;
});

browser.commands.onCommand.addListener(async (command) => {
  if (command !== 'copy-last-hovered-link') return;
  try {
    const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (!activeTab) return;
    const info = lastHoveredLink.get(activeTab.id);
    if (!info || !info.linkText) return;
    navigator.clipboard.writeText(info.linkText).catch(error => {
      console.error('Failed to copy the last hovered link text.', error);
    });
  } catch (ex) {
    console.error(ex);
  }
});

browser.menus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "copy-link-text") {
    return;
  }

  let linkText = info.linkText;
  if (info.modifiers.length === 1 &&
      info.modifiers[0] === "Shift") {
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
            function findLastTooltip(root) {
              const iter = document.createNodeIterator(
                root,
                NodeFilter.SHOW_ELEMENT
              );

              const nodes = [root];
              for (let node = iter.nextNode(); node; node = iter.nextNode()) {
                nodes.push(node);
              }

              for (const node of nodes.toReversed()) {
                if (node.nodeName === "title") {
                  return node.textContent.trim();
                } else if (node.hasAttribute("title")) {
                  return node.getAttribute("title");
                } else if (node.hasAttributeNS(XLINK_NS, "title")) {
                  return node.getAttributeNS(XLINK_NS, "title");
                }
              }
              return "";
            }

            let elem = browser.menus.getTargetElement(targetElementId);
            for (; elem; elem = elem.parentElement) {
              if ("href" in elem ||
                  elem.hasAttribute("href") ||
                  elem.hasAttributeNS(XLINK_NS, "href")) {
                return findLastTooltip(elem);
              }
            }
            return "";
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

  const id = "copy-link-text";
  if (!info.menuIds.includes(id)) {
    browser.menus.create({
      id,
      title: browser.i18n.getMessage("contextMenuItemLink"),
      contexts: ["link"],
    },
    () => browser.menus.refresh());
  }
});
