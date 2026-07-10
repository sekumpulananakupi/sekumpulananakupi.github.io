# SA UPI Public UI Component Contract

This document defines the shared visual and accessibility contract for SA UPI public pages. The canonical tokens live in `assets/css/tokens.css`, the baseline reset in `assets/css/reset.css`, and shared component rules in `assets/css/components/system.css`.

## Design layers

1. **Tokens** — semantic color, typography, spacing, radius, elevation, and motion values.
2. **Reset** — predictable element defaults, visible focus, and reduced-motion support.
3. **Base and layout** — global page structure and responsive layout rules.
4. **Components** — reusable controls and feedback patterns.
5. **Pages** — page-specific composition only; do not duplicate shared component rules.

## Buttons and links

Use `.btn` for action controls. Add one visual variant:

- `.primary` — the primary action for a section.
- `.secondary` — a supporting high-emphasis action.
- `.ghost` — a secondary or contextual action.
- `.btn-link` — a compact branded link action.

Use `type="button"` on buttons that are not form submissions. Icon-only actions use `.icon-button`, an `aria-label`, and an icon marked `aria-hidden="true"`.

```html
<button class="btn primary" type="button">
  <i class="fa-solid fa-filter" aria-hidden="true"></i>
  Terapkan filter
</button>

<button class="icon-button" type="button" aria-label="Tutup dialog">
  <i class="fa-solid fa-xmark" aria-hidden="true"></i>
</button>
```

## Cards

Use `.system-card` for new generic content containers. Existing page-specific card classes may extend this appearance, but should preserve semantic headings, descriptive text, and an obvious primary action when needed.

## Content trust metadata

Use `.content-meta` to group source, verification, and freshness information.

- `.source-badge` communicates the named source.
- `.verified-badge` communicates verification.
- Include a readable `Diperbarui` timestamp whenever the content has a reliable update date.

```html
<div class="content-meta">
  <span class="source-badge"><i class="fa-solid fa-landmark" aria-hidden="true"></i> Sumber resmi</span>
  <span class="verified-badge"><i class="fa-solid fa-circle-check" aria-hidden="true"></i> Terverifikasi</span>
  <span>Diperbarui: 10 Juli 2026</span>
</div>
```

## Lists, results, and filters

- `.result-summary` shows count and supporting context.
- `.filter-summary` gives a concise active-filter summary.
- Dynamic count and status text must use `role="status"` or `aria-live="polite"`.
- Use `.is-hidden` for state-driven visibility; do not assign visual `style` attributes from JavaScript.

```html
<p id="filterSummary" class="filter-summary" aria-live="polite">Filter aktif: Semua hasil</p>
<span id="resultCount" role="status" aria-live="polite"></span>
```

## Loading, empty, and error states

Use one of these shared classes for asynchronous UI feedback:

- `.loading-state`
- `.empty-state`
- `.error-state`

Each state should explain what happened and, where appropriate, the next useful action. Decorative status icons are Font Awesome icons with `aria-hidden="true"`.

## Dialogs

Dialog markup must include `role="dialog"`, `aria-modal="true"`, an accessible name, and a matching close button. Behavior must:

1. Set `aria-hidden` as the dialog opens and closes.
2. Move focus into the dialog on open.
3. Close on Escape and overlay click when appropriate.
4. Trap Tab focus inside the open dialog.
5. Return focus to the invoking control on close.

## Terminology

Use **Maru** as the public-facing short form of **Mahasiswa Baru**. Explain “maba” only once where helpful as a familiar synonym. Do not rename technical route names, CSS classes, IDs, or stored data fields unless a coordinated migration is planned.

## Accessibility baseline

- Decorative icons use `aria-hidden="true"`.
- Meaningful icon-only controls provide an `aria-label`.
- Navigation disclosure buttons synchronize `aria-expanded`.
- All interactive elements retain the shared `:focus-visible` treatment.
- Avoid motion-dependent comprehension; the reset respects `prefers-reduced-motion`.
