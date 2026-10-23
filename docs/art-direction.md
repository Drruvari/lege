# Lege art direction

## Concept

Lege should feel like an annotated reading desk: a current book in clear focus, a compact index of what is nearby, and marginal controls that appear where the reading work happens. The reference is the physical vocabulary of bookcloth, title pages, catalogue slips, and a reader's pencil marks—not the ornamental nostalgia of a faux antique library and not a generic software dashboard.

## Type and colour

Figtree is the UI face (12, 14, and 16px at 400–600); Fraunces is reserved for book titles and primary page headings (28–52px at 500–600); Literata is used only for long-form reading text (16–24px with 1.55–1.8 line height). Paper, sepia, and night themes share the same roles: warm neutral surfaces, high-contrast ink, oxblood actions, and brass reading-position marks. Brass is never a decorative gradient. Body and muted text target WCAG AA contrast in every theme.

## Layout and components

All application layouts use a 4px spacing base and align to a 12-column desktop grid, a 6-column tablet grid, and a 4-column mobile grid. The primary radius is 6px, with 4px for small controls and 10px only for large dialogs. Buttons, fields, menus, tabs, dialogs, toasts, empty states, and reader panels share one border, focus ring, and text scale; elevation is reserved for floating menus, dialogs, and the reading page. Phosphor icons use regular weight by default and fill only to communicate selected state.

## Density and motion

Library navigation and recent-book lists are index-dense, while the current-book area and reading page have more breathing room. Motion is allowed for menu/dialog entry, reader chrome fading, page progression, and progress changes. Durations are 120ms for control feedback and 220ms for view changes with an ease-out curve; reduced-motion removes both transforms and nonessential fades.

## Signature details

The current book uses a brass position rule with a precise reading label; recent books are arranged as a numbered reading index rather than repeated cards; and generated covers use flat bookcloth fields with title-page rules. Each detail directly supports orientation, resumption, or recognition.
