# Quick Task 007: Run CI for Develop Pull Requests

**Date:** 2026-06-08
**Status:** Done

## Description

Run the existing GitHub Actions CI workflow for pull requests targeting `develop` as well as `master` so test checks can gate merges on both branches.

## Files Changed

- `.github/workflows/ci.yml` — extend the `pull_request` trigger branch list to include `develop` while keeping the existing `master` push flow unchanged
- `.specs/project/STATE.md` — record the completed quick task in project state

## Verification

- [x] `.github/workflows/ci.yml` includes `develop` in `on.pull_request.branches`
- [x] The workflow YAML parses successfully with `ruby -e 'require "yaml"; YAML.load_file(".github/workflows/ci.yml")'`

## Commit

`not committed`
