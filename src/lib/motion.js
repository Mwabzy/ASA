/* One motion vocabulary for the whole app.

   The brief is Stripe/Linear restraint, so the rules are narrow on purpose:
   fast, short travel, and never more than one thing moving for its own sake.
   Anything that needs a duration should take it from here rather than invent
   one, otherwise the app ends up with a dozen slightly different easings.

   MotionConfig in main.jsx holds all of this to prefers-reduced-motion. */

/* The house easing — the same cubic-bezier the stylesheet uses, so CSS and JS
   animations are indistinguishable. */
export const EASE = [0.22, 1, 0.36, 1];

export const DUR = {
  instant: 0.12,   /* colour and opacity swaps  */
  quick:   0.18,   /* hover, icon state         */
  base:    0.26,   /* entrances, toasts         */
  panel:   0.34    /* drawers and sheets        */
};

export const tween = (duration = DUR.base) => ({ duration, ease: EASE });

/* For things with weight — a drawer, a sliding indicator. Stiff enough to feel
   immediate, damped enough not to wobble. */
export const spring = { type: 'spring', stiffness: 420, damping: 38, mass: 0.9 };

/* ---------- entrances ---------- */

export const fade = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: tween(DUR.base) }
};

export const riseItem = {
  hidden:  { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: tween(DUR.base) }
};

/* A list should arrive as a list, not as n separate animations. Stagger is
   deliberately small — past ~40ms it reads as a slow cascade. */
export const staggerGroup = (stagger = 0.035, delayChildren = 0) => ({
  hidden:  {},
  visible: { transition: { staggerChildren: stagger, delayChildren } }
});

/* Cards carry more weight than text, so they travel slightly further. */
export const cardItem = {
  hidden:  { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: tween(DUR.base) }
};

/* ---------- interaction ---------- */

/* Pressing something should acknowledge the press. Kept very shallow: at this
   size anything below .97 reads as the button breaking rather than responding. */
export const press = { scale: 0.985 };

/* Menus and popovers belong to the control that opened them, so they scale
   from that edge rather than simply fading. */
export const popover = {
  hidden:  { opacity: 0, y: -4, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: tween(DUR.quick) },
  exit:    { opacity: 0, y: -4, scale: 0.98, transition: tween(DUR.instant) }
};

/* Height animations need overflow hidden on the element itself. */
export const collapse = {
  hidden:  { opacity: 0, height: 0 },
  visible: { opacity: 1, height: 'auto', transition: tween(DUR.quick) },
  exit:    { opacity: 0, height: 0, transition: tween(DUR.instant) }
};

/* An icon swapping meaning — the eye on a password field — should cross over,
   not pop. Both states occupy the same grid cell so there is no reflow. */
export const iconSwap = {
  hidden:  { opacity: 0, scale: 0.8 },
  visible: { opacity: 1, scale: 1, transition: tween(DUR.quick) },
  exit:    { opacity: 0, scale: 0.8, transition: tween(DUR.instant) }
};

/* Shared layout id for the underline that follows the active nav item. */
export const NAV_INDICATOR = 'nav-active-indicator';
