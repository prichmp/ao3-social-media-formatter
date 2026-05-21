import { describe, it, expect } from 'vitest';
import { el, selfClose, serialize, serializeMinified } from './htmlBuilder';

describe('el', () => {
  it('rejects disallowed tags', () => {
    expect(() => el('script')).toThrow('Tag not allowed');
  });

  it('rejects disallowed attributes', () => {
    // @ts-expect-error testing runtime guard
    expect(() => el('div', { style: 'color:red' })).toThrow('Attribute not allowed');
  });

  it('rejects id attribute', () => {
    // @ts-expect-error testing runtime guard
    expect(() => el('div', { id: 'foo' })).toThrow('Attribute not allowed');
  });
});

describe('serialize', () => {
  it('escapes text content', () => {
    const node = el('p', {}, ['<script>alert("xss")</script>']);
    const out = serialize(node);
    expect(out).not.toContain('<script>');
    expect(out).toContain('&lt;script&gt;');
  });

  it('escapes attribute values', () => {
    const node = selfClose('img', { src: 'https://x.com/img?a=1&b=2', alt: '"quoted"' });
    const out = serialize(node);
    expect(out).toContain('&amp;');
    expect(out).toContain('&quot;');
  });

  it('renders self-closing tags without children', () => {
    const node = selfClose('hr', { class: 'twt-sep' });
    const out = serialize(node);
    expect(out).toBe('<hr class="twt-sep">');
  });

  it('does not emit style attribute', () => {
    // @ts-expect-error guard test
    expect(() => el('div', { style: 'color: red' })).toThrow();
  });
});

describe('serializeMinified', () => {
  it('produces no newlines', () => {
    const node = el('div', { class: 'twt' }, [
      el('p', {}, ['Hello world']),
    ]);
    const out = serializeMinified(node);
    expect(out).not.toContain('\n');
    expect(out).toContain('<div class="twt"><p>Hello world</p></div>');
  });
});
