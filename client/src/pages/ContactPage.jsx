import { useEffect, useState } from "react";
import { ArrowUpRight, Check, Copy, Github, Mail } from "lucide-react";
import { toast } from "../lib/toast";
import PageIntro from "./PageIntro";
import { RevealGroup, RevealItem } from "../components/motion/Reveal";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

const EMAIL = "chayanon.kmutnb@gmail.com";
const GITHUB = "https://github.com/Chayanon-Pond";

const ContactPage = () => {
  useDocumentTitle("Contact");
  const [copied, setCopied] = useState(null);

  useEffect(() => {
    if (!copied) return undefined;
    const t = setTimeout(() => setCopied(null), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  const copy = async (value, key) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
    } catch {
      toast.error("Couldn't copy to clipboard");
    }
  };

  const rows = [
    { key: "email", label: "Email the editor", Icon: Mail, value: EMAIL, href: `mailto:${EMAIL}`, cta: "Write to us", note: "Story tips, corrections and press enquiries. We reply within two working days." },
    { key: "github", label: "Open source", Icon: Github, value: "github.com/Chayanon-Pond", href: GITHUB, cta: "Open GitHub", external: true, note: "Report a bug or request a feature by opening an issue." },
  ];

  return (
    <div className="shell">
      <PageIntro kicker="Contact" title="Talk to the newsroom.">
        Spotted an error, have a story, or want to tell us we got a verdict wrong? We read everything.
      </PageIntro>
      <RevealGroup className="grid gap-6 md:grid-cols-2">
        {rows.map(({ key, label, Icon, value, href, cta, external, note }) => (
          <RevealItem key={key} className="card-apex flex min-w-0 flex-col p-6 md:p-8">
            <Icon className="h-6 w-6 text-papaya-ink" aria-hidden="true" />
            <h2 className="mt-5 font-display text-xl font-bold">{label}</h2>
            <p className="mt-2 text-sm text-muted">{note}</p>
            <div className="mt-6 flex items-center gap-2 rounded-[2px] bg-surface-2 px-3 py-2">
              <span className="min-w-0 flex-1 truncate font-mono text-sm">{value}</span>
              <button
                type="button"
                onClick={() => copy(key === "email" ? EMAIL : GITHUB, key)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-[2px] text-muted hover:text-fg"
                aria-label={copied === key ? "Copied" : `Copy ${label.toLowerCase()}`}
              >
                {copied === key ? <Check className="h-4 w-4 text-ok" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
              </button>
            </div>
            <a
              href={href}
              target={external ? "_blank" : undefined}
              rel={external ? "noopener noreferrer" : undefined}
              className="btn-apex btn-ghost-apex mt-6 self-start"
            >
              {cta} <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </RevealItem>
        ))}
      </RevealGroup>
    </div>
  );
};

export default ContactPage;
