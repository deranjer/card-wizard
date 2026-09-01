/**
 * Renders a card DOM element to a base64 PNG image.
 *
 * html2canvas-pro is loaded lazily so the (large) rasteriser stays out of the
 * initial bundle and only downloads when an export is actually run.
 */
export async function renderCardToImage(
  cardElement: HTMLElement,
  width: number,
  height: number
): Promise<string> {
  try {
    const { default: html2canvas } = await import('html2canvas-pro');
    const canvas = await html2canvas(cardElement, {
      width,
      height,
      scale: 2, // Higher quality for print
      backgroundColor: '#ffffff',
      logging: false,
      useCORS: true, // Allow cross-origin images
    });

    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error('Failed to render card to image:', error);
    throw error;
  }
}
