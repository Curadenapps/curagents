#!/usr/bin/env bash
# Keeps the main curagents folder on an up-to-date `main`.
#
# Run by the SessionStart hook in .claude/settings.json, so it runs whenever
# any Claude (Curaden, Personal, Fabian's) starts a session in this repo, in
# the folder itself or in one of its worktrees. Agents in the cloud don't need
# it: they always read origin/main.
#
# It only ever fast-forwards or switches to main when nothing can be lost:
# - on main and clean: fast-forward to origin/main
# - on another branch or detached HEAD that's already in origin/main and clean:
#   switch to main, then fast-forward
# - uncommitted changes, unmerged commits, or no network: leave it alone and
#   say why in one line
# It never fails the session: it always exits 0.

set -u

here="${CLAUDE_PROJECT_DIR:-$(pwd)}"
# The main folder is the first entry of `git worktree list`, also when the
# session runs in a worktree.
main_dir=$(git -C "$here" worktree list --porcelain 2>/dev/null | sed -n '1s/^worktree //p')
[ -n "$main_dir" ] || exit 0

g() { git -C "$main_dir" "$@"; }
say() { echo "checkout sync: $*"; }

if ! g fetch -q origin main 2>/dev/null; then
  say "couldn't reach GitHub, so $main_dir wasn't updated."
  exit 0
fi

branch=$(g branch --show-current)
where="${branch:-a detached HEAD}"

if [ -n "$(g status --porcelain --untracked-files=no 2>/dev/null)" ]; then
  say "$main_dir has uncommitted changes on $where; left it alone. Commit or move them, then switch it to main."
  exit 0
fi

if [ "$branch" != "main" ]; then
  if ! g merge-base --is-ancestor HEAD origin/main; then
    say "$main_dir is on $where, which has commits that aren't in main; left it alone. Merge its PR (or move the work to a worktree), then switch it to main."
    exit 0
  fi
  if ! g switch -q main 2>/dev/null; then
    say "$main_dir is on $where (already in main) but couldn't switch to main, probably untracked files in the way; left it alone."
    exit 0
  fi
  switched="switched $main_dir from $where to main (its work was already in main)"
fi

before=$(g rev-parse HEAD)
if ! g merge -q --ff-only origin/main 2>/dev/null; then
  say "${switched:+$switched; }local main has commits that aren't on GitHub, so it wasn't updated. Push them in a PR."
  exit 0
fi
new=$(g rev-list --count "$before"..HEAD)

if [ -n "${switched:-}" ]; then
  say "$switched and pulled $new new commit(s)."
elif [ "$new" -gt 0 ]; then
  say "pulled $new new commit(s) into main in $main_dir."
fi
exit 0
