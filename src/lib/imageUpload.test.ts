import { describe, it, expect } from 'vitest';
import { fitWithin } from './imageUpload';

describe('fitWithin', () => {
  it('leaves images already within bounds untouched', () => {
    expect(fitWithin(100, 80, 240)).toEqual({ width: 100, height: 80 });
  });

  it('scales a wide image down to the max longest edge', () => {
    expect(fitWithin(2000, 1000, 1000)).toEqual({ width: 1000, height: 500 });
  });

  it('scales a tall image down to the max longest edge', () => {
    expect(fitWithin(500, 2000, 240)).toEqual({ width: 60, height: 240 });
  });

  it('handles square images', () => {
    expect(fitWithin(480, 480, 240)).toEqual({ width: 240, height: 240 });
  });

  it('returns zero dimensions for degenerate input', () => {
    expect(fitWithin(0, 0, 240)).toEqual({ width: 0, height: 0 });
  });
});
