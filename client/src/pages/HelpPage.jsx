import { useId, useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import PageIntro from "./PageIntro";
import DemoAccessCard from "../components/ui/DemoAccessCard";
import { DEMO_ADMIN, DEMO_OWNER_ADMIN, DEMO_USER } from "../components/ui/demoAccounts";
import { Reveal } from "../components/motion/Reveal";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { EASE } from "../lib/motion";

const A = ({ to, children }) => (
  <Link to={to} className="text-fg underline decoration-papaya underline-offset-4">
    {children}
  </Link>
);

const FAQS = [
  {
    q: "How do I create an account or sign in?",
    a: (
      <>
        Head to <A to="/register">Create account</A> to sign up, or <A to="/login">Sign in</A> if you already have one. Forgot your password?
        Use <A to="/forgot-password">password recovery</A> and we&apos;ll email you a reset link. Just exploring? Use one of the demo accounts
        on this page.
      </>
    ),
  },
  {
    q: "Can I upload images with an article?",
    a: "Image upload is part of the newsroom editor, available to admin accounts. Images are stored on Cloudinary (or the server's storage volume, depending on configuration) and delivered in the right size for your screen.",
  },
  {
    q: "Are there rules for comments?",
    a: "You need to be signed in to comment. Comments are limited to 1,000 characters, and we remove abuse, spam and personal attacks. Be kind — disagree with the argument, not the person.",
  },
  {
    q: "How does the spec comparison work?",
    a: (
      <>
        Every reviewed car has a spec sheet. On <A to="/compare">Spec showdown</A>, pick two cars and we line up power, torque, 0–100 km/h, top
        speed, weight and price. The better figure in each row is highlighted.
      </>
    ),
  },
  {
    q: "Where do I report a bug or suggest a feature?",
    a: (
      <>
        Contact the developer directly from the <A to="/contact">Contact</A> page, or open an issue on the project&apos;s GitHub repository.
      </>
    ),
  },
  {
    q: "How is my data handled?",
    a: "We store your name, username, email and anything you choose to publish (comments, profile photo). Passwords are hashed and never shown to anyone. Newsletter emails are only used to send the newsletter.",
  },
];

function FaqItem({ item, open, onToggle }) {
  const id = useId();
  return (
    <div className="border-b border-line">
      <h3>
        <button
          type="button"
          id={`${id}-btn`}
          aria-expanded={open}
          aria-controls={`${id}-panel`}
          onClick={onToggle}
          className="flex w-full items-center justify-between gap-6 py-5 text-left font-display text-lg font-semibold"
        >
          {item.q}
          <Plus className={`h-5 w-5 shrink-0 text-papaya-ink transition-transform duration-300 ${open ? "rotate-45" : ""}`} aria-hidden="true" />
        </button>
      </h3>
      <AnimatePresence initial={false}>
        {open && (
          <m.div
            id={`${id}-panel`}
            role="region"
            aria-labelledby={`${id}-btn`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="overflow-hidden"
          >
            <p className="max-w-2xl pb-6 leading-relaxed text-muted">{item.a}</p>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const HelpPage = () => {
  useDocumentTitle("Help & FAQ");
  const [open, setOpen] = useState(0);
  return (
    <div className="shell">
      <PageIntro kicker="Help centre" title="Questions, answered.">
        The quick guide to using APEX. Still stuck? <A to="/contact">Contact us</A>.
      </PageIntro>
      <div className="grid gap-12 lg:grid-cols-[1fr_340px]">
        <Reveal className="border-t border-line">
          {FAQS.map((f, i) => (
            <FaqItem key={f.q} item={f} open={open === i} onToggle={() => setOpen(open === i ? null : i)} />
          ))}
        </Reveal>
        <Reveal delay={0.1}>
          <div className="lg:sticky lg:top-24">
            {/* Demo credentials are intentionally visible (owner decision). */}
            <DemoAccessCard accounts={[DEMO_USER, DEMO_ADMIN, DEMO_OWNER_ADMIN]} />
            <p className="mt-3 text-xs text-subtle">
              Reader accounts sign in at <A to="/login">/login</A>; the admin account at <A to="/admin/login">/admin/login</A>.
            </p>
          </div>
        </Reveal>
      </div>
    </div>
  );
};

export default HelpPage;
