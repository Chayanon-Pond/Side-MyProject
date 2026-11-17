import { m } from "motion/react";
import { EASE } from "../../lib/motion";

/**
 * Fade + lift on first entry into the viewport (once).
 * `as` picks the element; `delay` offsets inside a manual stagger.
 */
export const Reveal = ({ as = "div", delay = 0, y = 24, className, children, amount = 0.2, ...rest }) => {
  const Comp = m[as] || m.div;
  return (
    <Comp
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount }}
      transition={{ duration: 0.6, ease: EASE, delay }}
      {...rest}
    >
      {children}
    </Comp>
  );
};

/** Container whose direct <RevealItem> children stagger in when it enters the viewport. */
export const RevealGroup = ({ as = "div", className, children, gap = 0.07, amount = 0.15, ...rest }) => {
  const Comp = m[as] || m.div;
  return (
    <Comp
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: gap } } }}
      {...rest}
    >
      {children}
    </Comp>
  );
};

export const RevealItem = ({ as = "div", className, children, y = 28, ...rest }) => {
  const Comp = m[as] || m.div;
  return (
    <Comp
      className={className}
      variants={{
        hidden: { opacity: 0, y },
        show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
      }}
      {...rest}
    >
      {children}
    </Comp>
  );
};

export default Reveal;
