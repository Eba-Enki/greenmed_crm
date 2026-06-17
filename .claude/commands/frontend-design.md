# Frontend Design Checklist

Before writing any frontend code for this project, complete every step below in order.

## 1. Load brand assets
- Read `brand_assets/greenmed_brand_guidelines.html` — extract the exact color palette, typography rules, and spacing tokens.
- Check `brand_assets/` for any logo or image files that should be used instead of placeholders.

## 2. Confirm active color tokens
Read the `:root` block in `index.html` and note the current values for:
- `--gm-400`, `--gm-500` (primary brand green — buttons, accents, active states only)
- `--dk`, `--g50`…`--g900` (neutral scale)
- `--gm-bg`, `--gm-border` (surface tints)
- `body` background color

## 3. Apply logo usage rule
Every section that shows a logo must use the correct variant:
- **Light background** (white, light grey, pale tints) → `brand_assets/green_med_logo.svg`
- **Dark background** (dark gradients, deep colors) → dark logo variant (check brand_assets/)
Never mix these up. Check navbar, sidebar brand area, footer, and any cards.

## 4. Design constraints to apply
- Brand green (`--gm-400: #608425`) is an **accent color only** — never use it as a large surface background.
- Large surfaces (sidebar, page bg, forms, cards) must use white or neutral grey tones — no greenish tints.
- Sidebar: light background (`#ffffff` or `#f8f9fb`), dark text, green accent only for active item (left border + subtle tint).
- Page background: neutral grey (`#f0f2f5`) — no green cast.
- Cards/forms: pure white (`#ffffff`).
- Buttons: keep `--gm-400` for primary actions.
- Every interactive element must have hover, focus-visible, and active states.
- Use `transition: background, border-color, box-shadow, color, transform` — never `transition: all`.

## 5. Confirm with user before implementing
Briefly summarize the planned color/design changes in 3-4 bullet points and ask the user to confirm before writing any CSS or HTML.
