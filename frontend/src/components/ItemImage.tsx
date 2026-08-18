import React, { useState, useEffect, memo } from 'react';
import { resolveItemImage } from '../utils/itemImageResolver';

export interface ItemImageProps {
  category: string;
  name: string;
  fallbackEmoji: string;
  imgClass?: string;
  emojiClass?: string;
}

export const ItemImage: React.FC<ItemImageProps> = memo(({
  category,
  name,
  fallbackEmoji,
  imgClass = 'w-16 h-16 object-contain',
  emojiClass = 'text-2xl',
}) => {
  const [error, setError] = useState(false);
  const src = resolveItemImage(category, name);

  useEffect(() => {
    setError(false);
  }, [category, name]);

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
      onError={() => setError(true)}
    />
  );
});

ItemImage.displayName = 'ItemImage';
export default ItemImage;
