# WCAG 2.2 AA keyboard and screen-reader checklist

Automated axe covers public routes in `e2e/a11y.spec.ts`. This sheet is the remaining AT pass. Authenticated routes need owner credentials.

## Keyboard

- [ ] Tab order is visible on every control (`:focus` ring).
- [ ] Skip link “Skip to main content” moves focus to `#main-content` on public, auth, and dashboard chrome.
- [ ] No keyboard trap in drawers, dialogs, or the 360px More drawer.
- [ ] Menus, tabs, and pagination are operable with Tab / Shift+Tab / Enter / Escape.
- [ ] Forms show errors next to the field and keep focus on the first invalid control.

## Screen reader (NVDA or VoiceOver; TalkBack if a device is available)

- [ ] Every input has a programmatic name (label or `aria-label`).
- [ ] Landmarks: one `main`, named `nav`, page `h1`.
- [ ] Status messages use `role="alert"` or live regions already used on login/support.
- [ ] Decorative icons are hidden; meaning is not color-only.
- [ ] Video lessons expose captions and a keyboard play control (T005).

## Responsive / reflow

- [ ] 360, 390, 768, 1280px: content reflows, no horizontal scroll (`e2e/responsive.spec.ts`).
- [ ] 200% zoom on `/` and `/login` does not clip primary actions.
- [ ] Touch targets on BottomNav and public header are at least 24×24 CSS px.

## Contrast

- [ ] Body text on `--gsc-background` / `--gsc-surface` meets 4.5:1.
- [ ] Primary button text on `--gsc-primary` meets 4.5:1.
- [ ] Error text `--gsc-critical` meets 4.5:1.

Do not tick a box from a screenshot. Tick only after the listed device or emulator was used.
