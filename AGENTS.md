# Prototype Instructions

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

## Durable product design decisions

- Treat smartphones as the primary device. This is a mobile learning app that expands for desktop, not a desktop site compressed for mobile.
- On a 390px-wide screen, prioritize the active task, terminal output, command input, and immediate feedback above secondary navigation and explanation.
- Keep mobile side gutters near 12px, primary touch targets at least 44px, and the command input visible independently from the scrollable terminal history.
- Use compact learning navigation and avoid spending a large portion of the first viewport on branding or desktop-oriented chrome.
