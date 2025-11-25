import { useState, useEffect } from 'react';
import { LoadImageAsDataURL } from '../../wailsjs/go/main/App';

// Cache for loaded images
const imageCache = new Map<string, string>();

export function useImageDataURL(path: string | undefined): string {
    const [dataURL, setDataURL] = useState<string>('');

    useEffect(() => {
        if (!path) {
            setDataURL('');
            return;
        }

        // Check if it's already a data URL or HTTP URL
        if (path.startsWith('data:') || path.startsWith('http')) {
            setDataURL(path);
            return;
        }

        // Check cache
        if (imageCache.has(path)) {
            setDataURL(imageCache.get(path)!);
            return;
        }

        // Load from file system
        LoadImageAsDataURL(path)
            .then((url) => {
                imageCache.set(path, url);
                setDataURL(url);
            })
            .catch((err) => {
                console.error('Failed to load image:', path, err);
                setDataURL('');
            });
    }, [path]);

    return dataURL;
}
