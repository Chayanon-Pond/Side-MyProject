import { Link, useViewTransitionState } from "react-router-dom";
import SmartImage from "../../components/ui/SmartImage";
import { coverOf } from "../../lib/image";
import { kickerOf } from "../../api/normalize";
import { formatShortDate } from "../../lib/format";
import { articlePath } from "./paths";
import { previewOf } from "./preview";

export const Kicker = ({ article, className = "" }) => <p className={`kicker ${className}`}>{kickerOf(article)}</p>;

export const Meta = ({ article, className = "" }) => (
  <p className={`meta normal-case tracking-normal ${className}`}>
    {article.author_name && <span className="text-fg/80">{article.author_name}</span>}
    {article.author_name && <span aria-hidden="true"> · </span>}
    <time dateTime={article.published_at || article.created_at}>{formatShortDate(article.published_at || article.created_at)}</time>
    {article.reading_time_min ? <span> · {article.reading_time_min} min read</span> : null}
  </p>
);

/**
 * Whole card is one link. Image: clipped scale + brightness on hover; title: underline sweep.
 * During a navigation to this article the image carries `view-transition-name: article-hero`
 * so it morphs into the detail hero.
 */
export default function ArticleCard({ article, variant = "standard", priority = false, sizes }) {
  const to = articlePath(article);
  const morphing = useViewTransitionState(to);
  const imgStyle = morphing ? { viewTransitionName: "article-hero" } : undefined;
  const linkProps = { to, viewTransition: true, state: { preview: previewOf(article) }, className: "group block focus-visible:outline-offset-4" };
  const cover = coverOf(article);

  if (variant === "compact") {
    return (
      <Link {...linkProps} className={`${linkProps.className} flex gap-4`}>
        <SmartImage
          src={cover.path}
          alt={cover.alt}
          fallback={cover.fallback}
          ratio="1 / 1"
          sizes="96px"
          className="w-24 shrink-0 rounded-[6px]"
          imgClassName="zoom-img"
          imgStyle={imgStyle}
        />
        <div className="min-w-0">
          <Kicker article={article} />
          <h3 className="mt-1.5 font-display text-base font-semibold leading-snug text-fg">
            <span className="sweep">{article.title}</span>
          </h3>
          <p className="meta mt-2 normal-case tracking-normal">
            {article.reading_time_min ? `${article.reading_time_min} min read` : formatShortDate(article.published_at)}
          </p>
        </div>
      </Link>
    );
  }

  const lead = variant === "lead";
  return (
    <Link {...linkProps}>
      <SmartImage
        src={cover.path}
        alt={cover.alt}
        fallback={cover.fallback}
        ratio={lead ? "16 / 9" : "4 / 3"}
        sizes={sizes || (lead ? "(min-width: 1024px) 66vw, 100vw" : "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw")}
        priority={priority}
        className="rounded-[6px]"
        imgClassName="zoom-img"
        imgStyle={imgStyle}
      />
      <Kicker article={article} className="mt-5" />
      <h3
        className={`mt-2 font-display font-bold leading-[1.15] tracking-tight text-fg ${
          lead ? "text-3xl md:text-4xl" : "text-xl"
        }`}
      >
        <span className="sweep">{article.title}</span>
      </h3>
      {article.dek && (
        <p className={`mt-3 text-muted ${lead ? "max-w-2xl font-serif text-xl leading-snug" : "line-clamp-2 text-[15px] leading-relaxed"}`}>
          {article.dek}
        </p>
      )}
      <Meta article={article} className="mt-4" />
    </Link>
  );
}
