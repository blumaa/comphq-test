import { useLogo } from '@/api/logo'
import { ComphqMark } from '@/components/ComphqMark/ComphqMark'
import { ComphqWordmark } from '@/components/ComphqWordmark/ComphqWordmark'
import styles from './CompetitionBrand.module.css'

// What names the competition in the bar: the logo it uploaded, or the CompHQ
// lockup until it does. v1 asked /api/logo from an effect inside its nav, so
// each public page fetched it again; here it is the shared query and the shell
// asks once for all of them.

export function CompetitionBrand() {
  const logo = useLogo()

  if (logo.data?.url) {
    return <img src={logo.data.url} alt="Competition logo" className={styles.logo} />
  }

  return (
    <span className={styles.lockup}>
      <span className={styles.mark}>
        <ComphqMark label="" />
      </span>
      <ComphqWordmark size="inline" />
    </span>
  )
}
