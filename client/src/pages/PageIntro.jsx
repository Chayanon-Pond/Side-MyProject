import MaskedHeadline from "../components/motion/MaskedHeadline";
import { Reveal } from "../components/motion/Reveal";

/** Editorial page header used by About / Contact / Help. */
export default function PageIntro({ kicker, title, children }) {
  return (
    <header className="max-w-3xl pb-12 pt-14 md:pt-20">
      <Reveal y={8}>
        <p className="kicker">{kicker}</p>
      </Reveal>
      <MaskedHeadline
        text={title}
        className="mt-3 font-expanded text-[clamp(40px,6vw,76px)] font-extrabold leading-[0.95] tracking-[-0.02em]"
      />
      {children && (
        <Reveal delay={0.3} className="mt-6 font-serif text-xl leading-relaxed text-muted md:text-2xl">
          {children}
        </Reveal>
      )}
    </header>
  );
}
