/**
 * Give SVGs an explicit intrinsic size before html2canvas draws them. Chromium
 * displays viewBox-only SVGs correctly, but drawImage's source rectangle can
 * crop them when html2canvas reloads them without a layout viewport.
 * Only the temporary export DOM is changed; project assets stay untouched.
 */
export function sizeSvgForExport(source: string, width: number, height: number): string {
  const doc = new DOMParser().parseFromString(source, 'image/svg+xml');
  const svg = doc.documentElement;
  if (svg.localName !== 'svg' || doc.querySelector('parsererror')) {
    throw new Error('Cannot export an invalid SVG image.');
  }
  if (!(width > 0 && height > 0)) {
    throw new Error('Cannot determine SVG image dimensions for export.');
  }
  // Use the browser-resolved dimensions, including aspect ratio and any
  // explicit sizes/units, rather than assuming a square or changing the viewBox.
  svg.setAttribute('width', String(width));
  svg.setAttribute('height', String(height));
  return new XMLSerializer().serializeToString(svg);
}

function asDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Unable to read an image for export.'));
    reader.readAsDataURL(blob);
  });
}

export async function prepareExportImages(host: HTMLElement): Promise<void> {
  const images = Array.from(host.querySelectorAll('img'));
  await Promise.all(
    images.map(async (img) => {
      // Export roots live offscreen, so lazy images must be loaded explicitly.
      img.loading = 'eager';
      try {
        await img.decode();
        const response = await fetch(img.currentSrc || img.src);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const blob = await response.blob();
        if (blob.type.split(';')[0].toLowerCase() === 'image/svg+xml') {
          const source = sizeSvgForExport(await blob.text(), img.naturalWidth, img.naturalHeight);
          img.src = await asDataUrl(new Blob([source], { type: 'image/svg+xml' }));
          await img.decode();
        }
      } catch (cause) {
        throw new Error(
          'An image could not be prepared for export. Check that it loads correctly.',
          {
            cause,
          }
        );
      }
    })
  );
}
