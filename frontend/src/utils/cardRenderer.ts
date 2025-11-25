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

/**
 * Renders a card component to an image without DOM
 * Useful for background processing
 */
export async function renderCardOffscreen(
    renderFunction: () => HTMLElement,
    width: number,
    height: number
): Promise<string> {
    // Create temporary container
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '-9999px';
    container.style.width = `${width}px`;
    container.style.height = `${height}px`;

    document.body.appendChild(container);

    try {
        const cardElement = renderFunction();
        container.appendChild(cardElement);

        const image = await renderCardToImage(cardElement, width, height);
        return image;
    } finally {
        document.body.removeChild(container);
    }
}
