import styles from './ComphqWordmark.module.css'

/* The wordmark, and the second half of the identity. It carries the same split
 * the mark does: neutral for the name, highlight for the part that is the
 * product — comp is the noun every gym already has, hq is what this app adds.
 *
 * Text rather than a path, so it reads at any size, stays selectable and
 * searchable, and sits inside whatever heading the page needs for its outline.
 *
 * Size is a role rather than a value, because there are two places a wordmark
 * goes and they are not on the same ladder: the identity on a landing screen,
 * and a name in a bar full of links.
 */

export interface ComphqWordmarkProps {
  /** `lockup` is the identity beside the mark; `inline` sits in a nav bar. */
  size?: 'lockup' | 'inline'
}

export function ComphqWordmark({ size = 'lockup' }: ComphqWordmarkProps) {
  return (
    <span className={styles[size]}>
      <span className={styles.comp}>comp</span>
      <span className={styles.hq}>hq</span>
    </span>
  )
}
