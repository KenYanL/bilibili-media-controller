---
name: bilibili-github-push-method
description: Remember and reuse the working GitHub push method for the Bilibili Media Controller repository. Use when committing, pushing, syncing, or troubleshooting GitHub uploads for this project, especially when SSH remote push fails or the agent needs to know whether HTTPS or SSH worked before.
---

# Bilibili GitHub Push Method

## Repository

- GitHub repo: `KenYanL/bilibili-media-controller`
- Local branch: `main`
- Configured `origin`: `git@github.com:KenYanL/bilibili-media-controller.git`

## Known Push History

SSH push to `origin` failed with:

```text
git@github.com: Permission denied (publickey).
fatal: Could not read from remote repository.
```

The successful push method was one-shot HTTPS using GitHub CLI credentials:

```bash
git -c credential.helper='!gh auth git-credential' push https://github.com/KenYanL/bilibili-media-controller.git main
```

Use that HTTPS command first unless SSH has been explicitly fixed.

## Workflow

1. Check state with `git status --short --branch`.
2. Commit locally as usual.
3. Push with the HTTPS command above.
4. Verify with `gh api repos/KenYanL/bilibili-media-controller/contents --jq '.[].path'` or a targeted `gh api` content check.
5. After a successful push, use `$post-push-readme-check` to decide whether docs need a follow-up update.

Do not waste time repeatedly retrying SSH unless the user says the SSH key has been repaired.
