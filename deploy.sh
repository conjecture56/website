#!/bin/sh

set -eu

PROJECT_NAME="conjecture56"
PRODUCTION_BRANCH="main"
REPOSITORY_ROOT=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
TEMP_ROOT=${TMPDIR:-/tmp/opencode}

mkdir -p "$TEMP_ROOT"
DEPLOY_DIRECTORY=$(mktemp -d "$TEMP_ROOT/conjecture56-pages.XXXXXX")
trap 'rm -rf "$DEPLOY_DIRECTORY"' EXIT HUP INT TERM

git -C "$REPOSITORY_ROOT" archive HEAD -- \
  404.html \
  _headers \
  about \
  assets \
  collaborations \
  index.html \
  install.sh \
  keys \
  robots.txt \
  sitemap.xml \
  | tar -x -C "$DEPLOY_DIRECTORY"

COMMIT_HASH=$(git -C "$REPOSITORY_ROOT" rev-parse HEAD)
COMMIT_MESSAGE=$(git -C "$REPOSITORY_ROOT" log -1 --pretty=%s)

(
  cd "$DEPLOY_DIRECTORY"
  wrangler pages deploy . \
    --project-name "$PROJECT_NAME" \
    --branch "$PRODUCTION_BRANCH" \
    --commit-hash "$COMMIT_HASH" \
    --commit-message "$COMMIT_MESSAGE" \
    --commit-dirty=false
)
