import { useState } from "react";
import { responsiveImage } from "../../lib/image";
import { imgFallback, FALLBACK_IMAGE } from "../../lib/assets";

/**
 * Image with reserved aspect ratio (CLS≈0), lazy loading, Cloudinary srcset,
 * a quiet fade-in once decoded, and a one-shot fallback.
 *
 * `ratio` is a CSS aspect-ratio string ("16 / 9"); pass `fill` to stretch to the parent instead.
 */
const SmartImage = ({
  src,
  alt = "",
  ratio = "16 / 9",
  fill = false,
  sizes = "100vw",
  priority = false,
  className = "",
  imgClassName = "",
  imgStyle,
  width,
  height,
  fallback = FALLBACK_IMAGE,
  ...rest
}) => {
  const [loaded, setLoaded] = useState(false);
  const { src: url, srcSet } = responsiveImage(src, { fallback });
  return (
    <div
      className={`relative overflow-hidden bg-surface-2 ${fill ? "absolute inset-0" : ""} ${className}`}
      style={fill ? undefined : { aspectRatio: ratio }}
    >
      <img
        src={url}
        srcSet={srcSet}
        sizes={srcSet ? sizes : undefined}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={priority ? "high" : undefined}
        onLoad={() => setLoaded(true)}
        onError={(e) => {
          imgFallback(fallback)(e);
          setLoaded(true);
        }}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ease-[cubic-bezier(.2,.8,.2,1)] ${
          loaded ? "opacity-100" : "opacity-0"
        } ${imgClassName}`}
        style={imgStyle}
        {...rest}
      />
    </div>
  );
};

export default SmartImage;
