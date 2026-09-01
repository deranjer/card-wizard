import { useEffect, useState } from 'react';
import { assetUrl } from '../hooks/useAssetUrl';

interface ImageLoaderProps {
  path: string;
  style?: React.CSSProperties;
  alt?: string;
}

/**
 * Renders a project image by path. Shows a neutral placeholder while the
 * browser fetches it and an error box if it fails to load. The image is
 * served straight from disk via `/local-image` (see {@link assetUrl}), so
 * there is no IPC round-trip and no in-memory base64 cache.
 */
export function ImageLoader({ path, style, alt }: ImageLoaderProps) {
  const src = assetUrl(path);
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>(src ? 'loading' : 'error');

  useEffect(() => {
    setStatus(assetUrl(path) ? 'loading' : 'error');
  }, [path]);

  if (status === 'error') {
    return (
      <div
        style={{
          ...style,
          backgroundColor: '#fee',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '10px',
        }}
      >
        {src ? 'Error' : 'No image'}
      </div>
    );
  }

  return (
    <img
      src={src}
      style={{
        ...style,
        ...(status === 'loading' ? { backgroundColor: '#f0f0f0' } : null),
      }}
      alt={alt || ''}
      loading="lazy"
      onLoad={() => setStatus('loaded')}
      onError={() => setStatus('error')}
    />
  );
}
