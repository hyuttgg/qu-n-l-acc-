import React, { useState, useEffect, memo } from 'react';
import { resolveItemImage } from '../utils/itemImageResolver';

export interface ItemImageProps {
  category: string;
  name: string;
  fallbackEmoji: string;
  imgClass?: string;
  emojiClass?: string;
}

// Global set of known failed image URLs to prevent repeated 404 network storms
const failedImageUrls = new Set<string>();

export const ItemImage: React.FC<ItemImageProps> = memo(({
  category,
  name,
  fallbackEmoji,
  imgClass = 'w-16 h-16 object-contain',
  emojiClass = 'text-2xl',
}) => {
  const src = resolveItemImage(category, name);
  const isKnownFailed = src ? failedImageUrls.has(src) : true;
  const [error, setError] = useState<boolean>(isKnownFailed);

  useEffect(() => {
    if (src && failedImageUrls.has(src)) {
      setError(true);
    } else {
      setError(!src);
    }
  }, [src]);

  if (!src || error) {
    return <span className={emojiClass}>{fallbackEmoji}</span>;
  }

  return (
    <img
      src={src}
      alt={name}
      loading="lazy"
      decoding="async"
      className={imgClass}
      onError={() => {
        if (src) failedImageUrls.add(src);
        setError(true);
      }}
    />
  );
});

ItemImage.displayName = 'ItemImage';
export default ItemImage;
