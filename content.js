((global) => {
  "use strict";

  const XLINK_NS = 'http://www.w3.org/1999/xlink';

  const nonWhitespace = /\S/;

  Object.defineProperty(Element.prototype, "composedClosest", {
    value(selectors) {
      let currentElement = this;
      while (currentElement) {
        if (currentElement.matches(selectors)) {
          return currentElement;
        }
        currentElement = currentElement.composedParentElement;
      }
      return null;
    },
    configurable: true,
    writable: true
  });

  // `configurable: true` because this file is re-injected fresh on every
  // Shift+click / shortcut invocation, so the property may already exist
  // in this document from a previous injection.
  Object.defineProperty(Node.prototype, "composedParentElement", {
    configurable: true,
    get() {
      if (this.parentElement) return this.parentElement;
      const root = this.getRootNode();
      return root.host ?? null;
    }
  });

  function getTitle(el) {
    if (el.localName === "title") {
      return el.textContent.trim();
    }

    return (
      el.getAttribute("title") ??
      el.getAttributeNS(XLINK_NS, "title")
    );
  }

  function findTitle(root) {
    if (root.nodeType === Node.ELEMENT_NODE) {
      const title = getTitle(root);
      if (title) {
        return title;
      }
    }

    for (const el of root.querySelectorAll("*")) {
      const title = getTitle(el);
      if (title) {
        return title;
      }

      const shadowRoot = el.openOrClosedShadowRoot;
      if (shadowRoot) {
        const title = findTitle(shadowRoot);
        if (title) {
          return title;
        }
      }
    }

    return null;
  }
  global.findTitle = findTitle;

  function getLinkText(el) {
    const values = function* () {
      yield gatherTextUnder(el);
      yield findTitle(el);
      yield el.getAttribute("aria-label");
      yield el.getAttribute("alt"); // for the <area> element

      // Handle SVG links:
      if (typeof el.href == "object" && el.href.animVal) {
        yield new URL(el.href.animVal, el.ownerDocument.baseURI).href;
      } else {
        yield URL.parse(el.href)?.href;
      }

      const href =
        el.getAttribute("href") ??
        el.getAttributeNS(XLINK_NS, "href");
      if (typeof href == "string") {
        yield URL.parse(href, el.ownerDocument.baseURI)?.href;
      }
    };

    for (const value of values()) {
      if (value && nonWhitespace.test(value)) {
        return value.trim();
      }
    }

    return null;
  }
  global.getLinkText = getLinkText;

  function* composedChildren(node) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      // A shadow tree replaces the host's light-DOM children.
      const shadowRoot = node.openOrClosedShadowRoot;
      if (shadowRoot) {
        yield* shadowRoot.childNodes;
        return;
      }

      // A slot renders its assigned nodes instead of its fallback content.
      if (node.localName === "slot") {
        yield* node.assignedNodes({ flatten: true });
        return;
      }
    }

    yield* node.childNodes;
  }

  function gatherTextUnder(root) {
    const parts = [];

    const traverse = function* (node) {
      if (node.nodeType === Node.TEXT_NODE) {
        yield node.data;
        return;
      }

      if (node.localName === "img") {
        const altText = node.getAttribute("alt");
        if (altText) {
          yield altText;
        }
      }

      for (const child of composedChildren(node)) {
        yield* traverse(child);
      }
    };

    for (const part of traverse(root)) {
      parts.push(part);
    }

    // Trim each part and remove empty parts.
    let text = parts.map(part => part.trim())
                    .filter(Boolean)
                    .join(" ");
    if (text) {
      // Compress remaining whitespace.
      text = text.replace(/\s+/g, " ");
    }

    return text;
  }

  // Finds the <a> or <area> currently under the pointer, using the browser's
  // native :hover state instead of tracking mousemove events -- it's
  // always accurate for "right now", and :hover also applies to every
  // ancestor of the truly-hovered element, so a plain descendant (e.g. a
  // <span> or <img> inside the link) resolves straight to its enclosing
  // link without a manual ancestor walk.
  //
  // A single querySelector() can't see into shadow roots, so when nothing
  // matches at this level we still need to descend into the shadow root
  // of whatever is deepest-hovered here and try again.
  function findHoveredLink(root = document) {
    const link = root.querySelector(":is(a, area):hover");
    if (link) {
      return link;
    }

    const hovered = root.querySelectorAll(":not(:root):hover");
    const shadowRoot = Array.prototype.at.call(hovered, -1)?.openOrClosedShadowRoot;
    return shadowRoot ? findHoveredLink(shadowRoot) : null;
  }
  global.findHoveredLink = findHoveredLink;
})(globalThis);
