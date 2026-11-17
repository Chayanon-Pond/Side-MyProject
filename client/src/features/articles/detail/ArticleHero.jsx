import { useEffect, useRef } from "react";
import { heroProgress, useScrollProgress } from "../../../hooks/useScrollProgress";
import { prefersReducedMotion } from "../../../lib/motion";
import { releaseBootHero } from "../../../lib/bootHero";
import { Link } from "react-router-dom";
import MaskedHeadline from "../../../components/motion/MaskedHeadline";
import Avatar from "../../../components/ui/Avatar";
import { TYPE_LABEL } from "../../../api/normalize";
import { coverOf, responsiveImage } from "../../../lib/image";
import { imgFallback } from "../../../lib/assets";
import { formatDate } from "../../../lib/format";
import { makePath, typePath } from "../paths";

/** Delay for the CSS entrance (index.css `.anim-rise`): runs from the first paint, no JS per frame. */
const rise = (delay) => ({ "--d": `${delay}s` });

/** Full-bleed hero; the image is the shared-element target (`view-transition-name: article-hero`). */
export default function ArticleHero({ article }) {
  const ref = useRef(null);
  const layerRef = useRef(null);
  const textRef = useRef(null);
  // Parallax + fade while the hero scrolls away (measured only on scroll, styles written directly).
  useScrollProgress(
    ref,
    heroProgress,
    (p) => {
      if (layerRef.current) layerRef.current.style.transform = `translate3d(0, ${(p * 16).toFixed(2)}%, 0)`;
      if (textRef.current) {
        textRef.current.style.transform = `translate3d(0, ${(p * -12).toFixed(2)}%, 0)`;
        textRef.current.style.opacity = String(Math.max(0, 1 - p / 0.8));
      }
    },
    { enabled: !prefersReducedMotion() }
  );
  const cover = coverOf(article);
  const imgRef = useRef(null);
  // Same src/srcset/sizes as the <link rel=preload> the boot script in index.html adds.
  const { src, srcSet } = responsiveImage(cover.path, { base: 1920, fallback: cover.fallback });
  // The boot script's early copy of this photo (#boot-hero) goes away once ours is on screen.
  useEffect(() => {
    if (imgRef.current?.complete) releaseBootHero();
  }, [src]);
  const date = article.published_at || article.created_at;

  return (
    <header ref={ref} className="relative isolate flex h-[86vh] min-h-[520px] items-end overflow-hidden bg-[#0b0b0c] text-hero">
      <div ref={layerRef} className="absolute inset-0 -z-10 will-change-transform">
        <img
          src={src}
          srcSet={srcSet}
          sizes="100vw"
          alt={cover.alt}
          fetchPriority="high"
          loading="eager"
          ref={imgRef}
          onLoad={releaseBootHero}
          onError={(e) => {
            releaseBootHero();
            imgFallback(cover.fallback)(e);
          }}
          // Ken Burns as a CSS transform animation (no main-thread work, visible from first paint).
          className="anim-kenburns h-full w-full object-cover"
          style={{ viewTransitionName: "article-hero", "--kb-from": 1.08, "--kb-to": 1, "--kb-dur": "12s" }}
        />
      </div>
      <div className="hero-gradient absolute inset-0 -z-10" aria-hidden="true" />

      <div ref={textRef} className="shell w-full pb-14 md:pb-20">
        <div style={rise(0.05)} className="anim-rise flex flex-wrap items-center gap-3 font-mono text-xs uppercase tracking-[0.18em]">
          {article.make && (
            <Link to={makePath(article.make)} className="text-[#ff7a2b] hover:underline">
              {article.make}
            </Link>
          )}
          {article.article_type && (
            <Link to={typePath(article.article_type)} className="text-[#d6d6d2] hover:underline">
              {TYPE_LABEL[article.article_type]}
            </Link>
          )}
          {!article.make && !article.article_type && article.category_name && <span className="text-[#ff7a2b]">{article.category_name}</span>}
        </div>
        <MaskedHeadline
          text={article.title}
          className="mt-4 max-w-5xl font-expanded text-[clamp(40px,6.2vw,88px)] font-extrabold leading-[0.97] tracking-[-0.02em]"
        />
        {article.dek && (
          <p style={rise(0.4)} className="anim-rise mt-6 max-w-2xl font-serif text-xl leading-snug text-[#d6d6d2] md:text-2xl">
            {article.dek}
          </p>
        )}
        <div style={rise(0.55)} className="anim-rise mt-8 flex items-center gap-3">
          <Avatar src={article.author_avatar_url} name={article.author_name} size={40} className="!border-white/20 !bg-white/10 !text-white/80" />
          <div className="font-mono text-xs uppercase tracking-[0.08em] text-[#c9c9c4]">
            <p className="text-[#f2f2f0]">By {article.author_name}</p>
            <p>
              <time dateTime={date}>{formatDate(date)}</time>
              {article.reading_time_min ? ` · ${article.reading_time_min} min read` : ""}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
