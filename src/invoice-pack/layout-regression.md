# Invoice Pack layout regression (manual / Playwright)

Re-run after layout changes to wizard, document previews, or Advance Receipt.

## Viewports

1440×900, 1280×800, 1024×768, 768×1024, 390×844, 360×800

## Checks

1. `.ip-wizard-step` — five items, no bounding-box overlap between siblings.
2. `#example` — `.ip-reminders-block` top is at least 24px below `.ip-doc-preview .ip-sheet` bottom.
3. `#advance` — `[data-testid="advance-demo"] .ip-money-table` left edge aligns with document padding (not flush to sheet right).
4. `document.documentElement.scrollWidth <= clientWidth` on the full page.
5. Walk wizard through all steps; generate pack; confirm `[data-testid="pack-sheet"]` and `pack-reminders` visible.
6. Advance form: `.ip-form-grid` two columns from 760px; fields stay inside container.
7. Print preview: invoice and receipt sheets render without clipped tables.

## Selectors introduced

- `.ip-wizard-step`, `.ip-doc-preview`, `.ip-reminders-block`, `.ip-form-grid`, `.ReceiptSheet` / `advance-demo`