import { useState, useEffect } from 'react';
import { LoadImageAsDataURL } from '../../wailsjs/go/main/App';

interface ImageLoaderProps {
  path: string;
  style?: React.CSSProperties;
  alt?: string;
}

// Cache for loaded images
const imageCache = new Map<string, string>();

export function ImageLoader({ path, style, alt }: ImageLoaderProps) {
  const [src, setSrc] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!path) {
      setSrc('');
      setLoading(false);
      return;
    }

    // Check if it's already a data URL or HTTP URL
    if (path.startsWith('data:') || path.startsWith('http')) {
      setSrc(path);
      setLoading(false);
      return;
    }

    // Check cache
    if (imageCache.has(path)) {
      setSrc(imageCache.get(path)!);
      setLoading(false);
      return;
    }

    // Load from file system
    setLoading(true);
    setError(false);
    LoadImageAsDataURL(path)
      .then((url) => {
        imageCache.set(path, url);
        setSrc(url);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load image:', path, err);
        setError(true);
        setLoading(false);
      });
  }, [path]);

  if (loading) {
    return <div style={{ ...style, backgroundColor: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>;
  }

  if (error || !src) {
    return <div style={{ ...style, backgroundColor: '#fee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>Error</div>;
  }

  return <img src={src} style={style} alt={alt || ''} />;
}
