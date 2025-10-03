# Community feed cards

This area collects light documentation for the hero cards rendered inside `CommunityFeedSection`. Keep card implementations colocated with the feed when it keeps things simple, but lean on these notes so future cards read consistently.

## Layout
- Target the same max width as the intro card (about 760px desktop) and keep generous padding (roughly 3.5rem horizontal, 5rem vertical).
- Use `Stack` for vertical rhythm and prefer responsive spacing objects (`{ xs: value, sm: value }`).
- Always round corners at least 28px and give each card a distinct yet subtle shadow.

## Typography
- Lead with a bold headline that celebrates the moment. Use `variant="h3"` or `h4` with heavy weight and tight letter spacing.
- Secondary copy should stay around `body1` size with 1.6 line height.
- When showing metadata (time, version, etc.), keep it uppercase and compact so it reads as a label.

## Actions
- Primary action buttons are pill shaped (full radius) with confident contrast and no uppercase transform.
- Limit to one or two actions per card; add an `IconButton` for dismiss when the card is optional.
- Respect keyboard and screen reader affordances with proper `aria-label` text on icon controls.

## Behavior
- Cards that surface time sensitive updates should auto hide when stale and respect user dismissals via local storage.
- Keep summary text concise (1 short paragraph). Pull from existing release metadata when available instead of hard coding.
- Favor controlled visibility state from the parent feed to avoid cards managing their own fetch lifecycles.
