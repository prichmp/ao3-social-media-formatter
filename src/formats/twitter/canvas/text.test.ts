import { describe, it, expect } from 'vitest';
import { wrapLine, wrapText } from './text';

// Stub metric: every character is 10px wide. So maxWidth 70 ≈ 7 chars.
const measure = (s: string) => s.length * 10;

describe('wrapLine', () => {
  it('wraps on word boundaries when a line is too wide', () => {
    expect(wrapLine(measure, 'aaa bbb ccc', 70)).toEqual(['aaa bbb', 'ccc']);
  });

  it('keeps a short line on one line', () => {
    expect(wrapLine(measure, 'hi there', 200)).toEqual(['hi there']);
  });

  it('returns a single empty line for empty input', () => {
    expect(wrapLine(measure, '', 100)).toEqual(['']);
  });

  it('hard-breaks a single word wider than maxWidth', () => {
    expect(wrapLine(measure, 'aaaaaaaa', 30)).toEqual(['aaa', 'aaa', 'aa']);
  });
});

describe('wrapText', () => {
  it('splits blank-line-separated text into paragraphs', () => {
    const result = wrapText(measure, 'one\n\ntwo', 100);
    expect(result).toEqual([['one'], ['two']]);
  });

  it('treats single newlines as line breaks within a paragraph', () => {
    const result = wrapText(measure, 'a\nb', 100);
    expect(result).toEqual([['a', 'b']]);
  });

  it('wraps within each paragraph', () => {
    const result = wrapText(measure, 'aaa bbb ccc', 70);
    expect(result).toEqual([['aaa bbb', 'ccc']]);
  });
});
