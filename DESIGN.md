# Design Direction — Purr'Coffee (Kafe v1)

Dial: ENERGY 2 / RHYTHM 2 / MOTION 1

## Design Read
Warm 3-column Cafe Ordering, Cashier POS, & Manager Analytics web app for walk-in/table cafe customers, outlet cashiers, and cafe owners, in a warm peach-and-espresso paper-surface style, dial ENERGY 2 / RHYTHM 2 / MOTION 1.

## Palette (WCAG AA Verified)
- Canvas: `#FAF7F4` (warm oat paper)
- Card Surface: `#FFFFFF`
- Subtle Control Surface: `#F3EEE9`
- Hairline Border: `#E4DDD6` (non-text contrast >= 3:1 with active states)
- Primary Ink: `#1F1B18` (16.02:1 on `#FAF7F4`, 17.1:1 on `#FFFFFF`)
- Muted Ink: `#5E5650` (6.73:1 on `#FAF7F4`, 7.18:1 on `#FFFFFF`)
- Brand Primary (Terracotta): `#B8551E` with `#FFFFFF` text (4.82:1)
- Soft Peach Highlight: `#F3B68D` with `#1F1B18` ink (9.68:1)
- Active Selection (Espresso): `#231F1D` with `#FFFFFF` text (16.34:1)
- Positive / Paid: `#166534` on `#ECFDF3` (6.76:1)
- Alert / Unpaid / Sold Out: `#B93815` on `#FFF1EB` (5.23:1)

## Typography
- Primary UI & Display: `Plus Jakarta Sans` (friendly, crisp Indonesian legibility, `tabular-nums` for `Rp` prices, table numbers, and charts).

## Layout & Craft Rules
- Desktop: 3-column layout (Navigation rail, Menu/Workspace grid, Order Cart/Queue panel) inspired by the uploaded reference.
- Tablet/Mobile: Navigation collapses to compact top/bottom bar; Cart becomes a sticky bottom summary + slide-up drawer; minimum 44x44px touch targets; zero horizontal overflow.
- Radius hierarchy: `16px` cards/panels, `10px` buttons/inputs, `9999px` reserved for category & size filter chips.
