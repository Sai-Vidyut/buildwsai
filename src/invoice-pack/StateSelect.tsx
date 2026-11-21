import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { STATES } from './logic'
import { stateLabelForCode, stateMatchesQuery } from './state-search'

const MOBILE_SHEET_MQ = '(max-width: 720px)'

type StateSelectProps = {
  id: string
  value: string
  onChange: (code: string) => void
  placeholder?: string
  disabled?: boolean
  required?: boolean
}

export function StateSelect({
  id,
  value,
  onChange,
  placeholder = 'Select a state',
  disabled = false,
  required = false,
}: StateSelectProps) {
  const listboxId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const [mobileSheet, setMobileSheet] = useState(false)

  const filtered = useMemo(
    () => STATES.filter((row) => stateMatchesQuery(row, query)),
    [query],
  )

  const selectedLabel = value ? stateLabelForCode(value) : null

  const close = useCallback(() => {
    setOpen(false)
    setQuery('')
    setActiveIndex(0)
  }, [])

  const openPanel = useCallback(() => {
    if (disabled) return
    const nextMobile = typeof window !== 'undefined' && window.matchMedia(MOBILE_SHEET_MQ).matches
    setMobileSheet(nextMobile)
    const index = STATES.findIndex(([code]) => code === value)
    setActiveIndex(value && index >= 0 ? index : 0)
    setQuery('')
    setOpen(true)
  }, [disabled, value])

  const selectCode = useCallback(
    (code: string) => {
      onChange(code)
      close()
      rootRef.current?.querySelector<HTMLButtonElement>('[data-state-trigger]')?.focus()
    },
    [close, onChange],
  )

  useEffect(() => {
    if (!open) return
    const frame = window.requestAnimationFrame(() => searchRef.current?.focus())
    return () => window.cancelAnimationFrame(frame)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onDocPointer = (event: MouseEvent | TouchEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close()
    }
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        close()
        rootRef.current?.querySelector<HTMLButtonElement>('[data-state-trigger]')?.focus()
      }
    }
    document.addEventListener('mousedown', onDocPointer)
    document.addEventListener('touchstart', onDocPointer, { passive: true })
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocPointer)
      document.removeEventListener('touchstart', onDocPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [close, open])

  const safeActiveIndex =
    filtered.length === 0 ? 0 : Math.min(activeIndex, Math.max(0, filtered.length - 1))

  const onTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      if (!open) openPanel()
    }
  }

  const onSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, Math.max(0, filtered.length - 1)))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const row = filtered[safeActiveIndex]
      if (row) selectCode(row[0])
    } else if (event.key === 'Tab' && !event.shiftKey) {
      close()
    }
  }

  const panel = open ? (
  <>
    {mobileSheet ? (
      <button type="button" className="ip-state-backdrop no-print" aria-label="Close state list" onClick={close} />
    ) : null}
    <div
      className={mobileSheet ? 'ip-state-sheet' : 'ip-state-popover'}
      role="presentation"
      onKeyDown={(event) => event.stopPropagation()}
    >
      <div className="ip-state-search-wrap">
        <span className="ip-state-icon ip-state-icon-search" aria-hidden>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M7.25 12.5a5.25 5.25 0 1 0 0-10.5 5.25 5.25 0 0 0 0 10.5Zm6.5 1.2-3.15-3.15"
              stroke="currentColor"
              strokeWidth="1.35"
              strokeLinecap="round"
            />
          </svg>
        </span>
        <input
          ref={searchRef}
          type="search"
          className="ip-state-search"
          aria-controls={listboxId}
          aria-activedescendant={
            filtered[safeActiveIndex] ? `${id}-opt-${filtered[safeActiveIndex][0]}` : undefined
          }
          aria-label="Search states"
          placeholder="Search name, code, or abbreviation"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setActiveIndex(0)
          }}
          onKeyDown={onSearchKeyDown}
          autoComplete="off"
          enterKeyHint="done"
        />
      </div>
      {filtered.length ? (
        <ul id={listboxId} className="ip-state-list" role="listbox" aria-label="States and union territories">
          {filtered.map(([code, name], index) => {
            const selected = code === value
            const active = index === safeActiveIndex
            return (
              <li
                key={code}
                id={`${id}-opt-${code}`}
                role="option"
                aria-selected={selected}
                className={`ip-state-option${selected ? ' is-selected' : ''}${active ? ' is-active' : ''}`}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectCode(code)}
              >
                <span className="ip-state-option-name">{name}</span>
                <span className="ip-state-option-code">{code}</span>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="ip-state-empty" role="status">
          No state matches &ldquo;{query.trim()}&rdquo;.
        </p>
      )}
    </div>
  </>
  ) : null

  return (
    <div className="ip-state-select" ref={rootRef}>
      <button
        type="button"
        data-state-trigger
        id={id}
        className="ip-state-trigger"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? listboxId : undefined}
        aria-required={required || undefined}
        disabled={disabled}
        onClick={() => (open ? close() : openPanel())}
        onKeyDown={onTriggerKeyDown}
      >
        <span className={selectedLabel ? 'ip-state-trigger-value' : 'ip-state-trigger-placeholder'}>
          {selectedLabel ?? placeholder}
        </span>
        <span className="ip-state-trigger-icons" aria-hidden>
          <span className="ip-state-icon ip-state-icon-search">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M7.25 12.5a5.25 5.25 0 1 0 0-10.5 5.25 5.25 0 0 0 0 10.5Zm6.5 1.2-3.15-3.15"
                stroke="currentColor"
                strokeWidth="1.35"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <span className={`ip-state-chevron${open ? ' is-open' : ''}`}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 6.25 8 10.25l4-4" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
            </svg>
          </span>
        </span>
      </button>
      {panel}
    </div>
  )
}