import { Button, Field, Input, Sheet, SheetBody, SheetFooter, SheetHeader } from '@mond-design-system/react'
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'

// One name, typed beside the list it belongs to.
//
// v1 edited a division, a location and a role inside their own table rows: the
// name became an input the width of the name column and the row's last cell
// held Save and Cancel. A row is a line of a list, not a form. The row stays a
// row and the name opens here, which is also where a new one is typed — so
// adding and renaming are the same act in the same place rather than a form
// pinned under the table and an input inside it.
//
// DEFECT 25, fixed here rather than at three call sites: v1 emptied the box the
// moment it sent, so a refused write took the typed name with it and left the
// screen looking as though it had landed. The name is cleared and the sheet is
// shut only once the write has actually landed; a refusal leaves both alone and
// is reported by the page banner the caller reports through.

export interface NameSheetProps {
  open: boolean
  /** Names the sheet: "Add location", or the name being changed. */
  title: string
  /** Names the one field: "Location". */
  fieldLabel: string
  placeholder: string
  /** What the box opens holding. Empty while adding. */
  initial: string
  submitLabel: string
  busy?: boolean
  onClose: () => void
  /** Rejects when the write is refused, which is what keeps the sheet open. */
  onSubmit: (name: string) => Promise<unknown>
}

export function NameSheet({
  open, title, fieldLabel, placeholder, initial, submitLabel, busy, onClose, onSubmit,
}: NameSheetProps) {
  const [name, setName] = useState(initial)
  // The footer button submits the form in the body, which it does not contain,
  // and three of these sit on the setup screen at once.
  const formId = `name-sheet-${fieldLabel.toLowerCase().replace(/\s+/g, '-')}`

  // It opens on whichever row was tapped, so it opens holding that row's name
  // rather than the last one's.
  useEffect(() => {
    if (open) setName(initial)
  }, [open, initial])

  function submit(e: FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    void onSubmit(trimmed).then(() => { setName(''); onClose() }, () => {})
  }

  return (
    <Sheet open={open} onClose={onClose} label={title}>
      <SheetHeader onClose={onClose} closeLabel={`Close ${fieldLabel.toLowerCase()}`}>{title}</SheetHeader>
      <SheetBody>
        <form id={formId} onSubmit={submit}>
          <Field label={fieldLabel} required>
            <Input
              required
              autoFocus
              placeholder={placeholder}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
        </form>
      </SheetBody>
      <SheetFooter>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button type="submit" form={formId} loading={busy} disabled={!name.trim()}>
          {submitLabel}
        </Button>
      </SheetFooter>
    </Sheet>
  )
}
