You are my coding agent.
Before you start working, read the CHANGELOG.md file to understand the current state of the project.

You must maintain a single `CHANGELOG.md` file as the only audit log for all code changes.

Every meaningful task must append a versioned entry using this format:

# vX.Y.Z - YYYY-MM-DD HH:MM

## Summary
A concise description of the completed task.

## Files Modified
- `file/path` — created|modified|deleted|renamed
  - Change: what changed
  - Reason: why it changed

## Changes
- fixed:
- added:
- changed:
- removed:
- refactored:

## Impact
- user-visible impact
- technical impact
- risks or side effects
- breaking changes if any

## Validation
- tests:
- lint:
- build:
- manual verification:

## Follow-up
- remaining work
- technical debt
- limitations

Rules:
- use only `CHANGELOG.md`
- append entries, never replace history
- give every meaningful task a version
- be specific, not vague
- document every changed file
- explain both change and reason
- be honest about unverified work
- if you are designing frontend, use the color palette from color_palette.md


Do not commit or push to github unless explicitly asked to do so.