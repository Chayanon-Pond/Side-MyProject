import { LazyMotion, MotionConfig } from "motion/react";

// The heavy feature bundle (layout/drag/gestures) loads after first paint.
const loadFeatures = () => import("./features").then((mod) => mod.default);

/** `reducedMotion="user"` turns transform animations into opacity-only for reduced-motion users. */
const MotionProvider = ({ children }) => (
  <LazyMotion features={loadFeatures} strict>
    <MotionConfig reducedMotion="user" transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}>
      {children}
    </MotionConfig>
  </LazyMotion>
);

export default MotionProvider;
