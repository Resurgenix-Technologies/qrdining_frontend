import { useState } from 'react';

export default function LazyImg({ src, alt, className }) {
  const [loaded, setLoaded] = useState(false);
  if (!src) return null;
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      onLoad={() => setLoaded(true)}
      className={`${className} transition-opacity duration-200 ${loaded ? 'opacity-100' : 'opacity-0'}`}
    />
  );
}
