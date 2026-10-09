import { test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { initPostFootnotes } from "../assets/js/post-footnotes.js";

class Target extends EventTarget {
  handlers = new Set();
  addEventListener(type, handler, options) {
    this.handlers.add(handler);
    super.addEventListener(type, handler, options);
  }
  removeEventListener(type, handler, options) {
    this.handlers.delete(handler);
    super.removeEventListener(type, handler, options);
  }
}
class Element extends Target {
  children = [];
  attrs = new Map();
  style = {};
  classes = new Set();
  classList = {
    contains: (name) => this.classes.has(name),
    add: (name) => this.classes.add(name),
    remove: (name) => this.classes.delete(name),
  };
  offsetHeight = 50;
  top = 0;
  html = "";
  set innerHTML(value) {
    this.html = value;
    this.children = [];
  }
  get innerHTML() {
    return this.html;
  }
  setAttribute(name, value) {
    this.attrs.set(name, value);
  }
  getAttribute(name) {
    return this.attrs.get(name);
  }
  querySelectorAll() {
    return [];
  }
  cloneNode() {
    const clone = new Element();
    clone.innerHTML = this.innerHTML;
    return clone;
  }
  getBoundingClientRect() {
    return { top: this.top };
  }
  appendChild(child) {
    this.children.push(child);
    child.parent = this;
  }
  remove() {
    if (this.parent) this.parent.children = this.parent.children.filter((node) => node !== this);
  }
  contains(node) {
    return node === this || this.children.some((child) => child.contains(node));
  }
  closest(selector) {
    return selector === "sup" ? this.sup : selector === ".footnote-ref" && this.isRef ? this : null;
  }
  after(node) {
    this.parent.appendChild(node);
  }
  scrollIntoView(options) {
    this.scrollOptions = options;
  }
}
function fixture(desktop) {
  const document = new Target(),
    window = new Target(),
    sidebar = new Element(),
    section = new Element(),
    sep = new Element(),
    prose = new Element();
  const refs = [new Element(), new Element()];
  const notes = refs.map((ref, index) => {
    ref.isRef = true;
    ref.top = index ? 105 : 100;
    ref.setAttribute("href", `#fn${index + 1}`);
    ref.sup = new Element();
    ref.sup.parent = prose;
    const note = new Element();
    note.innerHTML = `<p>Note ${index + 1}</p>`;
    return note;
  });
  section.querySelectorAll = () => notes;
  document.querySelector = (selector) =>
    ({ "section.footnotes": section, "hr.footnotes-sep": sep, ".prose-site": prose })[selector];
  document.querySelectorAll = () => refs;
  document.getElementById = () => sidebar;
  document.createElement = () => new Element();
  const media = [new Target(), new Target(), new Target()];
  [media[0].matches, media[1].matches, media[2].matches] = [desktop, !desktop, true];
  window.matchMedia = (query) =>
    query.includes("min-width") ? media[0] : query.includes("max-width") ? media[1] : media[2];
  window.scrollY = 0;
  window.setTimeout = setTimeout;
  window.clearTimeout = clearTimeout;
  let disconnected = 0;
  window.ResizeObserver = class {
    observe() {}
    disconnect() {
      disconnected++;
    }
  };
  const click = (target) => target.dispatchEvent(new Event("click", { cancelable: true }));
  return {
    document,
    window,
    sidebar,
    section,
    sep,
    prose,
    refs,
    media,
    click,
    disconnected: () => disconnected,
  };
}

test("desktop notes align with references, avoid overlap and dispose on rerender", () => {
  const f = fixture(true);
  const dispose = initPostFootnotes(f.document, f.window);
  expect(f.sidebar.children).toHaveLength(2);
  expect(f.sidebar.children[0].style.cssText).toContain("top:100px");
  expect(f.sidebar.children[1].style.cssText).toContain("top:170px");
  expect(f.section.classList.contains("sr-only")).toBe(true);
  f.click(f.refs[0]);
  expect(f.prose.children).toHaveLength(0);
  dispose();
  expect(f.sidebar.children).toHaveLength(0);
  expect(f.section.classList.contains("sr-only")).toBe(false);
  expect(f.window.handlers.size + f.document.handlers.size + f.refs[0].handlers.size).toBe(0);
  expect(f.disconnected()).toBe(1);
});

test("small-screen notes toggle, switch, dismiss and do not retain stale handlers", () => {
  const f = fixture(false);
  const dispose = initPostFootnotes(f.document, f.window);
  expect(f.sidebar.children).toHaveLength(0);
  f.click(f.refs[0]);
  expect(f.prose.children).toHaveLength(1);
  expect(f.prose.children[0].getAttribute("data-fn")).toBe("#fn1");
  expect(f.prose.children[0].scrollOptions.behavior).toBe("auto");
  f.click(f.refs[1]);
  expect(f.prose.children).toHaveLength(1);
  expect(f.prose.children[0].getAttribute("data-fn")).toBe("#fn2");
  f.click(f.refs[1]);
  expect(f.prose.children).toHaveLength(0);
  f.click(f.refs[0]);
  const outside = new Event("click");
  Object.defineProperty(outside, "target", { value: new Element() });
  f.document.dispatchEvent(outside);
  expect(f.prose.children).toHaveLength(0);
  f.click(f.refs[0]);
  f.media[1].matches = false;
  f.media[1].dispatchEvent(new Event("change"));
  expect(f.prose.children).toHaveLength(0);
  dispose();
  expect(f.media[1].handlers.size).toBe(0);
  f.media[1].matches = true;
  const nextDispose = initPostFootnotes(f.document, f.window);
  f.click(f.refs[0]);
  expect(f.prose.children).toHaveLength(1);
  nextDispose();
  expect(f.prose.children).toHaveLength(0);
});

test("preview and public post share notes without enabling draft scripts or analytics", () => {
  const preview = readFileSync("admin/components/Preview.jsx", "utf8");
  const post = readFileSync("assets/js/post.js", "utf8");
  expect(preview).toContain('from "../../assets/js/post-footnotes.js"');
  expect(post).toContain('from "./post-footnotes.js"');
  expect(preview).toContain("useEffect(() => () => footnotes.current?.(), [])");
  expect(preview.indexOf("const html = sanitizePreview")).toBeLessThan(
    preview.indexOf("footnotes.current?.();")
  );
  expect(preview).toContain("if (event.defaultPrevented) return");
  expect(preview).toContain('sandbox="allow-same-origin"');
  expect(preview).not.toContain("allow-scripts");
  expect(preview).not.toContain("initArticleAnalytics");
});
