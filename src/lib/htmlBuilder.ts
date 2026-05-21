const ALLOWED_TAGS = new Set([
  'div', 'p', 'span', 'a', 'b', 'i', 'em', 'strong',
  'img', 'hr', 'br', 'blockquote', 'ul', 'ol', 'li',
]);

const ALLOWED_ATTRS = new Set([
  'class', 'href', 'src', 'alt', 'width', 'height',
]);

export interface Attrs {
  class?: string;
  href?: string;
  src?: string;
  alt?: string;
  width?: number | string;
  height?: number | string;
}

export type Child = HtmlNode | string;

export interface HtmlNode {
  tag: string;
  attrs: Attrs;
  children: Child[];
  selfClosing?: boolean;
}

export function el(tag: string, attrs: Attrs = {}, children: Child[] = []): HtmlNode {
  if (!ALLOWED_TAGS.has(tag)) throw new Error(`Tag not allowed: ${tag}`);
  for (const key of Object.keys(attrs)) {
    if (!ALLOWED_ATTRS.has(key)) throw new Error(`Attribute not allowed: ${key}`);
  }
  return { tag, attrs, children };
}

export function selfClose(tag: string, attrs: Attrs = {}): HtmlNode {
  const node = el(tag, attrs);
  node.selfClosing = true;
  return node;
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function serializeAttrs(attrs: Attrs): string {
  let out = '';
  for (const [key, val] of Object.entries(attrs)) {
    if (val === undefined || val === null) continue;
    out += ` ${key}="${escapeAttr(String(val))}"`;
  }
  return out;
}

export function serialize(node: Child, indent = 0): string {
  if (typeof node === 'string') {
    return escapeText(node);
  }
  const pad = '  '.repeat(indent);
  const attrStr = serializeAttrs(node.attrs);
  if (node.selfClosing) {
    return `${pad}<${node.tag}${attrStr}>`;
  }
  if (node.children.length === 0) {
    return `${pad}<${node.tag}${attrStr}></${node.tag}>`;
  }
  const allText = node.children.every(c => typeof c === 'string');
  if (allText) {
    const text = (node.children as string[]).map(escapeText).join('');
    return `${pad}<${node.tag}${attrStr}>${text}</${node.tag}>`;
  }
  const inner = node.children.map(c => serialize(c, indent + 1)).join('\n');
  return `${pad}<${node.tag}${attrStr}>\n${inner}\n${pad}</${node.tag}>`;
}

export function serializeMinified(node: Child): string {
  if (typeof node === 'string') {
    return escapeText(node);
  }
  const attrStr = serializeAttrs(node.attrs);
  if (node.selfClosing) {
    return `<${node.tag}${attrStr}>`;
  }
  const inner = node.children.map(c => serializeMinified(c)).join('');
  return `<${node.tag}${attrStr}>${inner}</${node.tag}>`;
}
