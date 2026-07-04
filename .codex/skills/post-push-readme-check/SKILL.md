---
name: post-push-readme-check
description: Check whether README or installation documentation needs updates after pushing changes to the Bilibili Media Controller repository. Use after any commit or push that changes features, shortcuts, script scope, install paths, Tampermonkey metadata, dist output, or user-facing behavior.
---

# Post-push README Check

## Workflow

After pushing new work in this repository, decide whether documentation must follow the code.

1. Inspect the latest pushed change with `git show --stat --oneline HEAD` and, when needed, `git diff --name-only HEAD~1..HEAD`.
2. Update `README.md` when the change affects user-visible behavior, shortcut keys, script scope, installation path, file names, Tampermonkey metadata, or release/install instructions.
3. Keep `README.md` bilingual: English full text first, then `---`, then Chinese full text.
4. Keep the English and Chinese sections structurally aligned.
5. If no README update is needed, say so explicitly in the final response.
6. If README changes are needed after a push, make a small docs-only commit and push it.

## Project-specific Checks

- Shortcut changes must be reflected in both language sections.
- Scope changes must mention whether YouTube and other sites are unaffected.
- Install changes must still point users to `dist/bilibili-enhancer.user.js` unless the actual file changes.
- Dist-only internal rebuilds do not require README changes unless published behavior changes.
