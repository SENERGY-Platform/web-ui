# Pushing to master is the release

## Applies when

Merging or pushing anything to `master` in this repository, as of 2026-10-27.

**Not this if**: you are looking for how the image reaches a cluster. That is
deployment, and it lives in the GitOps repository, not here.

## What happens on a push

The prod workflow **auto-tags every push to `master`** and builds the ghcr image
from that tag. There is no separate release step to forget and none to trigger:
the merge *is* the release.

Two consequences worth stating, because neither is visible in the diff:

- A change that is not meant to ship yet must not reach `master`. There is no
  window between merge and release in which to hold it.
- The version that ends up deployed is decided by the tag the workflow created,
  not by anything in the repository's files.

## Only green tests tag

`prod.yml` calls `test.yml` first and its build job `needs` it, so a red test
leaves no tag and no image. That makes a flaky spec a release blocker: a test
that fails only in the full suite, or only under CI timing, stops a correct
change from shipping.

A push that changes only `docs/**` or `*.md` files is ignored by `prod.yml`
(`paths-ignore`): no tests, no tag, no image.
