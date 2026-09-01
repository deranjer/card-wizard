import html2canvas from 'html2canvas';

/**
 * Renders a card DOM element to a base64 PNG image
 */
export async function renderCardToImage(
  cardElement: HTMLElement,
  width: number,
  height: number
): Promise<string> {
  try {
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
