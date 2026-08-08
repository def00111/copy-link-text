(() => {
  const XLINK_NS = 'http://www.w3.org/1999/xlink';
  let last = { href: null, linkText: '' };

  function findAnchor(node) {
    for (let el = node; el; el = el.parentElement) {
      if (el.tagName === 'A' || el.hasAttribute('href') || el.hasAttributeNS(XLINK_NS, 'href')) {
        return el;
      }
    }
    return null;
  }

  function getLinkInfo(el) {
    const href = el.href || el.getAttribute('href') || el.getAttributeNS(XLINK_NS, 'href') || '';
    const text = (el.textContent || el.getAttribute('title') || el.getAttribute('aria-label') || '').trim();
    return { href, linkText: text };
  }

  document.addEventListener('mouseover', (event) => {
    try {
      const anchor = findAnchor(event.target);
      if (!anchor) return;
      const info = getLinkInfo(anchor);
      if (info.href !== last.href || info.linkText !== last.linkText) {
        last = info;
        browser.runtime.sendMessage({ type: 'hover', ...info }).catch(() => {});
      }
    } catch (ex) {
      // ignore
    }
  }, true);

  // Expose a quick responder for background queries from the same page
  browser.runtime.onMessage.addListener((message) => {
    if (message && message.type === 'getLastHovered') {
      return Promise.resolve(last);
    }
    return undefined;
  });
})();
