import { describe, expect, it, vi, afterEach } from 'vitest';
import { prepareExportImages, sizeSvgForExport } from './prepareExportImages';

afterEach(() => vi.unstubAllGlobals());

describe('sizeSvgForExport', () => {
  it('sizes viewBox-only artwork without changing its coordinate system or paths', () => {
    const result = sizeSvgForExport(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="10 20 200 100"><path d="M10 20h200v100z"/></svg>',
      300,
      150
    );
    const svg = new DOMParser().parseFromString(result, 'image/svg+xml').documentElement;
    expect(svg.getAttribute('width')).toBe('300');
    expect(svg.getAttribute('height')).toBe('150');
    expect(svg.getAttribute('viewBox')).toBe('10 20 200 100');
    expect(svg.querySelector('path')?.getAttribute('d')).toBe('M10 20h200v100z');
  });

  it('uses resolved dimensions for percentage and physical-unit sizes', () => {
    const result = sizeSvgForExport('<svg width="100%" height="2cm"/>', 240, 75.59);
    expect(result).toContain('width="240"');
    expect(result).toContain('height="75.59"');
  });

  it('rejects malformed SVGs and unusable dimensions', () => {
    expect(() => sizeSvgForExport('<svg><path></svg>', 100, 100)).toThrow();
    expect(() => sizeSvgForExport('<html/>', 100, 100)).toThrow();
    expect(() => sizeSvgForExport('<svg/>', 0, 100)).toThrow();
  });
});

describe('prepareExportImages', () => {
  it('replaces a viewBox-only SVG with a sized export copy and waits for its decode', async () => {
    const host = document.createElement('div');
    const img = document.createElement('img');
    img.src = 'data:image/svg+xml,<svg viewBox="0 0 200 100"/>';
    Object.defineProperties(img, {
      naturalWidth: { value: 300 },
      naturalHeight: { value: 150 },
    });
    img.decode = vi.fn().mockResolvedValue(undefined);
    host.append(img);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        blob: async () => ({
          type: 'image/svg+xml',
          text: async () => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100"/>',
        }),
      })
    );
    await prepareExportImages(host);
    const svg = atob(img.src.split(',')[1]);
    expect(svg).toContain('width="300"');
    expect(svg).toContain('height="150"');
    expect(img.decode).toHaveBeenCalledTimes(2);
  });

  it('waits for offscreen images and leaves raster sources unchanged', async () => {
    const host = document.createElement('div');
    const img = document.createElement('img');
    img.src = 'https://example.test/photo.png';
    img.loading = 'lazy';
    const decode = vi.fn().mockResolvedValue(undefined);
    img.decode = decode;
    host.append(img);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        blob: async () => new Blob([], { type: 'image/png' }),
      })
    );
    await prepareExportImages(host);
    expect(decode).toHaveBeenCalledOnce();
    expect(img.loading).toBe('eager');
    expect(img.src).toBe('https://example.test/photo.png');
  });

  it('fails instead of exporting a broken image', async () => {
    const host = document.createElement('div');
    const img = document.createElement('img');
    img.decode = vi.fn().mockRejectedValue(new Error('decode failed'));
    host.append(img);
    await expect(prepareExportImages(host)).rejects.toThrow('could not be prepared');
  });
});
