import { describe, it, expect } from 'vitest';
import { assetUrl } from './useAssetUrl';

describe('assetUrl', () => {
  it('returns empty string for empty input', () => {
    expect(assetUrl('')).toBe('');
    expect(assetUrl(undefined)).toBe('');
    expect(assetUrl(null)).toBe('');
  });

  it('passes data: and http(s): URLs through untouched', () => {
    expect(assetUrl('data:image/png;base64,AAAA')).toBe('data:image/png;base64,AAAA');
    expect(assetUrl('http://example.com/a.png')).toBe('http://example.com/a.png');
    expect(assetUrl('https://example.com/a.png')).toBe('https://example.com/a.png');
  });

  it('routes project-relative paths through the local-image middleware, encoded', () => {
    expect(assetUrl('images/card.png')).toBe('/local-image?path=images%2Fcard.png');
    expect(assetUrl('images/my card.png')).toBe('/local-image?path=images%2Fmy%20card.png');
  });
});
