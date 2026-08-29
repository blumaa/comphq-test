import styles from './ComphqMark.module.css'

/* The mark. Three bars on a floor: the podium a competition ends at, and the
 * lanes it is run in, which are the same three rectangles seen from two sides.
 *
 * v1's mark was a 400x400 scene of letters flying in over a three-second gsap
 * timeline. It was drawn at 40px in the nav, where the letters were unreadable
 * and the animation replayed on every route change. This one has no timeline,
 * no dependency and no text, and it is drawn to be read at 40px first.
 *
 * Colour comes from the stylesheet, not from a fill attribute: a var() is not
 * reliable in an SVG presentation attribute, and a raw hex in TSX is a colour
 * check:tokens cannot see. The neutral bars take currentColor so the mark
 * inherits whatever surface it sits on; the lead bar is the highlight, which
 * is the one thing in this palette that means "in front right now".
 */

export interface ComphqMarkProps {
  /** Empty string marks it decorative, for a mark sitting beside the wordmark. */
  label?: string
}

export function ComphqMark({ label = 'CompHQ' }: ComphqMarkProps) {
  return (
    <svg
      className={styles.mark}
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      role={label ? 'img' : 'presentation'}
      aria-label={label || undefined}
      aria-hidden={label ? undefined : true}
    >
      <rect className={styles.floor} x="1" y="29" width="30" height="2" rx="1" />
      <rect className={styles.bar} x="2.5" y="15" width="8" height="14" rx="1.5" />
      <rect className={styles.lead} x="12" y="7" width="8" height="22" rx="1.5" />
      <rect className={styles.bar} x="21.5" y="19" width="8" height="10" rx="1.5" />
    </svg>
  )
}
