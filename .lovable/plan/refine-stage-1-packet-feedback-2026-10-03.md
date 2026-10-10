# Refine Stage 1 packet feedback

## Changes
- Reset the controlled typing buffer only when one or more red HTTP packets expire, while preserving immediate focus and unrestricted A–Z input.
- Keep destroyed packets briefly as visual-only effects so their removal can play a fast laser/glitch disintegration without affecting scoring or matching.
- Add a subtle missed-packet alert flash and moving neon trail treatments for both packet types.
- Polish packet frames and labels for sharper readability using the existing cyber palette and semantic theme tokens.

## Technical details
- Track transient destruction effects separately from active packets so expired/destroyed items cannot be matched twice.
- Clear input from the animation loop only on an actual missed red packet; do not alter Backspace or normal controlled-input behavior.
- Use CSS animations with a reduced-motion fallback and avoid additional runtime libraries.
- Validate the current build and exercise Stage 1 in the browser after implementation.
