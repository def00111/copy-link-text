((global) => {
  "use strict";

  const XLINK_NS = 'http://www.w3.org/1999/xlink';

  const nonWhitespace = /\S/;

  function queryShadowSelector(selector) {
    const element = this.querySelector(selector);
    if (element) {
      return element;
    }

    for (const el of this.querySelectorAll("*")) {
      const shadowRoot = el.openOrClosedShadowRoot;
      if (shadowRoot) {
        const element = shadowRoot.queryShadowSelector(selector);
        if (element) {
          return element;
        }
      }
    }

    return null;
  }

  DocumentFragment.prototype.queryShadowSelector = queryShadowSelector;
  Element.prototype.queryShadowSelector = queryShadowSelector;

  Object.defineProperty(Node.prototype, "composedParentElement", {
    get() {
      if (this.parentElement) return this.parentElement;
      const root = this.getRootNode();
      return root.host ?? null;
    }
  });

  function findLink(el) {
    for (
      let currentElement = el;
      currentElement && document.body !== currentElement;
      currentElement = currentElement.composedParentElement
    ) {
      if (["a", "area"].includes(currentElement.localName)) {
        return currentElement;
      }
    }

    return null;
  }
  global.findLink = findLink;

  function findTitle(el) {
    if (!el) return null;
    return (
      el.getAttribute("title") ||
      el.localName === "title" && el.textContent ||
      findTitle(el.queryShadowSelector("[title], title"))
    );
  }
  global.findTitle = findTitle;

  function getLinkText(el) {
    const values = function* () {
      yield gatherTextUnder(el);
      yield findTitle(el);
      yield el.getAttribute("aria-label");
      yield el.getAttribute("alt"); // for the <area> element
      yield URL.parse(el.href)?.href;

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

    return "";
  }

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

  const mouseState = {
    target: null,
    x: 0,
    y: 0
  };

  const mouseMoveHandler = {
    handleEvent(event) {
      mouseState.x = event.x;
      mouseState.y = event.y;
      mouseState.target = new WeakRef(event.target);
    }
  };

  document.addEventListener("mousemove", mouseMoveHandler, true);

  browser.runtime.onMessage.addListener(message => {
    if (message?.type === 'getLinkText') {
      let target = mouseState.target?.deref();
      let link = findLink(target);
      if (!link) {
        const root = target?.openOrClosedShadowRoot ?? document;
        target = root.elementFromPoint(mouseState.x, mouseState.y);
        link = findLink(target);
      }
      if (link) {
        return Promise.resolve(getLinkText(link));
      }
    }
    return false;
  });
})(globalThis);
