# CLAUDE.md — Frontend Website Rules

## Always Do First
- **Invoke the `frontend-design` skill** before writing any frontend code, every session, no exceptions.

## Reference Images
- If a reference image is provided: match layout, spacing, typography, and color exactly. Swap in placeholder content (images via `https://placehold.co/`, generic copy). Do not improve or add to the design.
- If no reference image: design from scratch with high craft (see guardrails below).
- Screenshot your output, compare against reference, fix mismatches, re-screenshot. Do at least 2 comparison rounds. Stop only when no visible differences remain or user says so.

## Local Testing
- The app needs PHP + MySQL; a static file server cannot log in. Test against a **built copy**, never the working tree:
  copy the repo to a scratch folder, run `npm ci --prefix tools` once, then `node tools/build.mjs <copy>` (the build refuses to run inside a git working copy).
- Serve the copy with `php -S 127.0.0.1:8080 -t <copy>` and a local `api/config.php` pointing at a test database (e.g. Docker `mariadb:10.6`).
- Screenshot / browser-test with `puppeteer-core` and the locally installed Chrome (`C:/Program Files/Google/Chrome/Application/chrome.exe`). Never screenshot a `file:///` URL.

## Output Defaults
- Styles live in the `<style>` block of `index.html`; app code is JSX in `js/*.js`, precompiled at deploy by `tools/build.mjs`
- Custom CSS with CSS variables (no Tailwind) — use `--var` tokens for colors, spacing, and typography
- Placeholder images: `https://placehold.co/WIDTHxHEIGHT`
- Mobile-first responsive

## Brand Assets
- Always check the `brand_assets/` folder before designing. It may contain logos, color guides, style guides, or images.
- If assets exist there, use them. Do not use placeholders where real assets are available.
- If a color palette is defined, use those exact values — do not invent brand colors.

### Logo Usage Rule (strict)

- `brand_assets/green_med_logo.svg` — full logo, for light backgrounds.
- `brand_assets/Greenmed_Logo_General_Favicon.svg` — the mark alone (favicon, loading splash).
- There is no dark-background logo variant yet; don't place the logo on dark surfaces until one is added.

## Anti-Generic Guardrails
- **Colors:** Never use default Tailwind palette (indigo-500, blue-600, etc.). Pick a custom brand color and derive from it.
- **Shadows:** Never use flat `shadow-md`. Use layered, color-tinted shadows with low opacity.
- **Typography:** Never use the same font for headings and body. Pair a display/serif with a clean sans. Apply tight tracking (`-0.03em`) on large headings, generous line-height (`1.7`) on body.
- **Gradients:** Layer multiple radial gradients. Add grain/texture via SVG noise filter for depth.
- **Animations:** Only animate `transform` and `opacity`. Never `transition-all`. Use spring-style easing.
- **Interactive states:** Every clickable element needs hover, focus-visible, and active states. No exceptions.
- **Images:** Add a gradient overlay (`bg-gradient-to-t from-black/60`) and a color treatment layer with `mix-blend-multiply`.
- **Spacing:** Use intentional, consistent spacing tokens — not random Tailwind steps.
- **Depth:** Surfaces should have a layering system (base → elevated → floating), not all sit at the same z-plane.

## Hard Rules
- Do not add sections, features, or content not in the reference
- Do not "improve" a reference design — match it
- Do not stop after one screenshot pass
- Do not use `transition-all`
- Do not use default Tailwind blue/indigo as primary color