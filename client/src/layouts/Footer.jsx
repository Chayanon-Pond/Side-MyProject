import { Link } from "react-router-dom";
import { ArrowUp, Github, Instagram, Youtube, Twitter } from "lucide-react";
import Wordmark from "../components/brand/Wordmark";
import ThemeToggle from "../components/ui/ThemeToggle";
import NewsletterForm from "../features/newsletter/NewsletterForm";
import { useMakes } from "../hooks/useMakes";
import { makePath } from "../features/articles/paths";
import { scrollToTarget } from "../lib/smoothScroll";

const SECTIONS = [
  { to: "/articles?type=review", label: "Reviews" },
  { to: "/articles?type=news", label: "News" },
  { to: "/articles?type=feature", label: "Features" },
  { to: "/compare", label: "Spec showdown" },
  { to: "/articles", label: "All stories" },
];

const COMPANY = [
  { to: "/about", label: "About APEX" },
  { to: "/contact", label: "Contact" },
  { to: "/help", label: "Help & FAQ" },
  { to: "/admin", label: "Newsroom login" },
];

const SOCIALS = [
  { label: "APEX on GitHub", href: "https://github.com/Chayanon-Pond", Icon: Github },
  { label: "APEX on Instagram", href: "https://instagram.com", Icon: Instagram },
  { label: "APEX on YouTube", href: "https://youtube.com", Icon: Youtube },
  { label: "APEX on X", href: "https://x.com", Icon: Twitter },
];

const Col = ({ title, children }) => (
  <div>
    <h2 className="meta mb-4 text-subtle">{title}</h2>
    <ul className="space-y-2.5">{children}</ul>
  </div>
);

const FLink = ({ to, children }) => (
  <li>
    <Link to={to} className="sweep text-sm text-muted transition-colors hover:text-fg">
      {children}
    </Link>
  </li>
);

export default function Footer() {
  const { makes } = useMakes();
  const year = new Date().getFullYear();
  return (
    <footer className="relative mt-24 border-t border-line bg-surface">
      <div className="shell grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1.6fr]">
        <Col title="Makes">
          {(makes.length ? makes.slice(0, 6) : [{ make: "McLaren" }, { make: "Lamborghini" }, { make: "BMW" }]).map((mk) => (
            <FLink key={mk.make} to={makePath(mk.make)}>
              {mk.make}
            </FLink>
          ))}
        </Col>
        <Col title="Sections">
          {SECTIONS.map((s) => (
            <FLink key={s.to} to={s.to}>
              {s.label}
            </FLink>
          ))}
        </Col>
        <Col title="Company">
          {COMPANY.map((s) => (
            <FLink key={s.to} to={s.to}>
              {s.label}
            </FLink>
          ))}
        </Col>
        <div>
          <h2 className="meta mb-4 text-subtle">The Friday Lap</h2>
          <p className="mb-4 max-w-sm font-serif text-lg leading-snug text-fg">
            One email a week. The best of APEX, the spec sheet of the week, nothing else.
          </p>
          <NewsletterForm compact />
          <ul className="mt-6 flex gap-1" aria-label="Social links">
            {SOCIALS.map(({ label, href, Icon }) => (
              <li key={label}>
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-[2px] border border-line text-muted transition-colors hover:border-line-strong hover:text-fg"
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="shell overflow-hidden">
        <Wordmark className="h-auto w-full text-fg opacity-[0.06]" title="" />
      </div>

      <div className="border-t border-line">
        <div className="shell flex flex-col gap-4 py-6 text-xs text-subtle md:flex-row md:items-center md:justify-between">
          <p>
            © {year} APEX Editorial. Independent — not affiliated with any manufacturer. All trademarks belong to their owners.
          </p>
          <div className="flex items-center gap-4">
            <Link to="/help" className="hover:text-fg">Privacy</Link>
            <Link to="/help" className="hover:text-fg">Terms</Link>
            <ThemeToggle withLabel className="text-muted hover:text-fg" />
            <button
              type="button"
              onClick={() => scrollToTarget(0, { offset: 0 })}
              className="inline-flex items-center gap-1 hover:text-fg"
            >
              Back to top <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
