import { Link } from "react-router-dom";
import { Gauge, MessageSquare, Newspaper, ShieldCheck } from "lucide-react";
import PageIntro from "./PageIntro";
import { RevealGroup, RevealItem, Reveal } from "../components/motion/Reveal";
import SmartImage from "../components/ui/SmartImage";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

const PILLARS = [
  { Icon: Newspaper, title: "Long-form reviews", body: "Days with a car, not hours. We drive in the rain, in traffic and on roads we know by heart." },
  { Icon: Gauge, title: "Numbers that matter", body: "Every review carries a spec sheet you can compare head to head — no marketing adjectives." },
  { Icon: MessageSquare, title: "A real conversation", body: "Readers comment, reply and correct us. The best tips often come from owners." },
  { Icon: ShieldCheck, title: "Independent", body: "No manufacturer owns us, pays for coverage or approves copy before it runs." },
];

const STACK = [
  ["Frontend", "React 19, Vite, Tailwind CSS 4 + daisyUI 5, Motion, Lenis"],
  ["Backend", "Node.js (Express) with PostgreSQL"],
  ["Media", "Cloudinary image delivery with responsive transforms"],
  ["Auth", "JSON Web Tokens with role-based admin access"],
];

const AboutPage = () => {
  useDocumentTitle("About", "APEX is an independent magazine about performance cars.");
  return (
    <div className="shell">
      <PageIntro kicker="About APEX" title="Performance cars, read closely.">
        APEX is an independent magazine for people who care how a car feels, not just how fast it goes. We publish reviews, news and
        long reads — and we keep the numbers honest.
      </PageIntro>

      <Reveal>
        <SmartImage src="/img/gtsmc.jpg" alt="Grand tourer photographed in a studio" ratio="21 / 9" priority className="rounded-[6px]" />
      </Reveal>

      <RevealGroup className="mt-20 grid gap-px overflow-hidden rounded-[6px] border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
        {PILLARS.map(({ Icon, title, body }) => (
          <RevealItem key={title} className="bg-bg p-6">
            <Icon className="h-6 w-6 text-papaya-ink" aria-hidden="true" />
            <h2 className="mt-5 font-display text-lg font-bold">{title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
          </RevealItem>
        ))}
      </RevealGroup>

      <div className="mt-20 grid gap-12 lg:grid-cols-[1fr_1fr]">
        <Reveal>
          <p className="kicker">How we work</p>
          <h2 className="mt-3 font-expanded text-3xl font-extrabold">Slow to publish, quick to correct.</h2>
          <div className="mt-6 space-y-4 font-serif text-lg leading-relaxed text-muted">
            <p>
              Every review is written by someone who drove the car, and every figure on a spec sheet is checked against the manufacturer&apos;s
              published data. When we get something wrong, we fix it and say so at the bottom of the story.
            </p>
            <p>
              Cars are sometimes loaned to us for testing. That never buys a verdict, and we never accept payment for coverage.
            </p>
          </div>
        </Reveal>
        <Reveal delay={0.1} className="card-apex p-6 md:p-8">
          <p className="kicker">Under the bonnet</p>
          <h2 className="mt-3 font-display text-xl font-bold">How this site is built</h2>
          <dl className="mt-6 divide-y divide-line">
            {STACK.map(([k, v]) => (
              <div key={k} className="grid grid-cols-[110px_1fr] gap-4 py-3 text-sm">
                <dt className="meta">{k}</dt>
                <dd className="text-fg">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-6 text-sm text-muted">
            Found a bug or have an idea?{" "}
            <Link to="/contact" className="text-fg underline decoration-papaya underline-offset-4">
              Get in touch
            </Link>
            .
          </p>
        </Reveal>
      </div>
    </div>
  );
};

export default AboutPage;
