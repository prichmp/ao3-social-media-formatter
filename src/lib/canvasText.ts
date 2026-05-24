// Pure text-wrapping helpers for the canvas renderer.
//
// These take a `measure` callback rather than a canvas context so they can be
// unit-tested with a stub (jsdom has no real 2D text metrics). The caller is
// responsible for setting the right font on its context before measuring.

export type Measure = (text: string) => number;

/** A wrapped block: an array of paragraphs, each an array of visual lines. */
export type WrappedText = string[][];

/** Break a single word that is wider than `maxWidth` into character chunks. */
function breakWord(measure: Measure, word: string, maxWidth: number): string[] {
  const pieces: string[] = [];
  let current = '';
  for (const ch of word) {
    if (current !== '' && measure(current + ch) > maxWidth) {
      pieces.push(current);
      current = ch;
    } else {
      current += ch;
    }
  }
  if (current !== '') pieces.push(current);
  return pieces.length ? pieces : [''];
}

/** Greedily wrap one logical line (no newlines) into visual lines. */
export function wrapLine(measure: Measure, line: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let current = '';

  const pushWord = (word: string) => {
    if (current === '') {
      current = word;
    } else if (measure(`${current} ${word}`) <= maxWidth) {
      current = `${current} ${word}`;
    } else {
      lines.push(current);
      current = word;
    }
  };

  for (const word of line.split(' ')) {
    if (measure(word) > maxWidth) {
      // Flush whatever we have, then hard-break the oversized word.
      if (current !== '') {
        lines.push(current);
        current = '';
      }
      const pieces = breakWord(measure, word, maxWidth);
      for (let i = 0; i < pieces.length - 1; i++) lines.push(pieces[i]);
      current = pieces[pieces.length - 1];
    } else {
      pushWord(word);
    }
  }

  lines.push(current);
  return lines;
}

/**
 * Wrap user content into paragraphs of visual lines.
 *
 * Mirrors the old HTML renderer's semantics: a blank line (two-or-more
 * newlines) separates paragraphs; a single newline is a line break within a
 * paragraph.
 */
export function wrapText(measure: Measure, text: string, maxWidth: number): WrappedText {
  return text.split(/\n\n+/).map((paragraph) => {
    const visual: string[] = [];
    for (const logicalLine of paragraph.split('\n')) {
      visual.push(...wrapLine(measure, logicalLine, maxWidth));
    }
    return visual;
  });
}
