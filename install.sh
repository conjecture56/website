#!/bin/sh
# Conjecture 56 — OpenCode installer
#
# Adds the Conjecture 56 provider (with every model available to your key)
# to your OpenCode configuration, backing up the file first.
#
# Usage:
#   curl -fsSL https://conjecture56.org/install.sh | sh
#
# The API key is requested with hidden input (never printed, never stored
# by this script outside the resulting configuration file).
#
# JSON editing requires one of: python3, node, bun, jq.

set -eu

API_BASE="https://api.conjecture56.org"
QUOTA_URL="$API_BASE/api/governance/virtual-keys/quota"
MODELS_URL="$API_BASE/v1/models"
PROVIDER_ID="conjecture56"

log() { printf '%s\n' "$*"; }
die() { printf 'install error: %s\n' "$*" >&2; exit 1; }

# ---------- JSON engine detection ----------
ENGINE="${INSTALLER_ENGINE:-}"
if [ -z "$ENGINE" ]; then
  for candidate in python3 node bun jq; do
    if command -v "$candidate" >/dev/null 2>&1; then
      ENGINE=$candidate
      break
    fi
  done
fi
[ -n "$ENGINE" ] || die "one of python3, node, bun or jq is required to edit the configuration safely. Install one and re-run. Nothing was modified."

# ---------- API key (hidden input from the terminal, not stdin) ----------
KEY="${CONJECTURE56_API_KEY:-}"
if [ -z "$KEY" ]; then
  if ! { printf '' > /dev/tty; } 2>/dev/null; then
    die "no terminal available to enter the key. Set CONJECTURE56_API_KEY in the environment and re-run."
  fi
  printf 'Conjecture 56 API key (input hidden): ' > /dev/tty
  { stty -echo < /dev/tty; } 2>/dev/null || true
  IFS= read -r KEY < /dev/tty || KEY=""
  { stty echo < /dev/tty; } 2>/dev/null || true
  printf '\n' > /dev/tty 2>/dev/null || true
  trap '{ stty echo < /dev/tty; } 2>/dev/null || true' EXIT INT TERM
fi
[ -n "$KEY" ] || die "no key entered. Nothing was modified."

# ---------- download current quota and model inventory ----------
WORKDIR=$(mktemp -d 2>/dev/null) || die "cannot create a temporary directory"
trap 'rm -rf "$WORKDIR"; { stty echo < /dev/tty; } 2>/dev/null || true' EXIT INT TERM

fetch() {
  if command -v curl >/dev/null 2>&1; then
    curl -fsS --max-time 30 -H "X-Api-Key: $KEY" "$1"
  elif command -v wget >/dev/null 2>&1; then
    wget -qO- --header="X-Api-Key: $KEY" "$1"
  else
    die "curl or wget is required to reach the API"
  fi
}

QUOTA_FILE="$WORKDIR/quota.json"
MODELS_FILE="$WORKDIR/models.json"
fetch "$QUOTA_URL" > "$QUOTA_FILE" 2>/dev/null || die "the API rejected the key or is unreachable. Nothing was modified."
fetch "$MODELS_URL" > "$MODELS_FILE" 2>/dev/null || printf '{"data":[]}' > "$MODELS_FILE"

# ---------- target configuration ----------
TARGET="${OPENCODE_CONFIG:-}"
if [ -n "$TARGET" ]; then
  mkdir -p "$(dirname "$TARGET")"
else
  for candidate in ./opencode.json ./.opencode/opencode.json "$HOME/.config/opencode/opencode.json"; do
    if [ -f "$candidate" ]; then
      TARGET=$candidate
      break
    fi
  done
  if [ -z "$TARGET" ]; then
    TARGET="$HOME/.config/opencode/opencode.json"
    mkdir -p "$(dirname "$TARGET")"
    log "no existing configuration found; the global config will be created at $TARGET"
  fi
fi
if [ -f "$TARGET" ]; then
  ORIG_FLAG="exists"
else
  ORIG_FLAG="new"
fi

export OP_FLAG="$ORIG_FLAG" OP_KEY="$KEY" OP_TARGET="$TARGET" OP_MODELS="$MODELS_FILE" OP_QUOTA="$QUOTA_FILE" OP_PROVIDER="$PROVIDER_ID"

# ---------- merge engines (each writes the merged config to stdout) ----------
run_python3() {
  python3 - <<'PY'
import json, os, sys

def fail(message):
    sys.stderr.write("install error: %s\n" % message)
    sys.exit(1)

def load(path):
    try:
        with open(path, "r", encoding="utf-8") as handle:
            return json.load(handle)
    except FileNotFoundError:
        return {}

try:
    flag = os.environ["OP_FLAG"]
    key = os.environ["OP_KEY"]
    target = os.environ["OP_TARGET"]
    provider = os.environ["OP_PROVIDER"]
    models_resp = load(os.environ["OP_MODELS"])
    quota_resp = load(os.environ["OP_QUOTA"])
except KeyError as exc:
    fail("missing environment variable: %s" % exc)

ids = []

def add_model(value):
    if isinstance(value, str) and value and value != "*" and value not in ids:
        ids.append(value)

for item in (models_resp.get("data") or []):
    if isinstance(item, dict):
        add_model(item.get("id"))
for config in (quota_resp.get("model_configs") or []):
    if isinstance(config, dict):
        add_model(config.get("model_name"))
if not ids:
    ids = ["qwen3.6"]

def pretty(model_id):
    base = model_id.split("/")[-1]
    return " ".join(word[:1].upper() + word[1:] for word in base.replace("_", "-").split("-") if word)

models = {model_id: {"name": pretty(model_id)} for model_id in ids}

config = {}
if flag == "exists":
    try:
        with open(target, "r", encoding="utf-8") as handle:
            config = json.load(handle)
    except FileNotFoundError:
        config = {}
    except ValueError as exc:
        fail("the existing config is not valid JSON (%s). Nothing was modified." % exc)
if not isinstance(config, dict):
    fail("the existing config is not a JSON object. Nothing was modified.")

providers = config.get("providers")
if providers is None:
    providers = {}
if not isinstance(providers, dict):
    fail("the existing 'providers' entry is not an object. Nothing was modified.")

providers[provider] = {
    "name": "Conjecture 56",
    "package": "@opencode/ai/providers/openai-compatible",
    "settings": {
        "baseURL": "https://api.conjecture56.org/v1",
        "apiKey": key,
    },
    "models": models,
}
config["providers"] = providers

sys.stderr.write("models: %s\n" % ", ".join(ids))
json.dump(config, sys.stdout, indent=2)
PY
}

run_node() {
  node -e '
const fs = require("fs");
const env = process.env;
const fail = (message) => { console.error("install error: " + message); process.exit(1); };
const load = (path) => { try { return JSON.parse(fs.readFileSync(path, "utf8")); } catch (e) { if (e.code === "ENOENT") return {}; fail("the existing config is not valid JSON (" + e.message + "). Nothing was modified."); } };

let modelsResp = {};
try { modelsResp = JSON.parse(fs.readFileSync(env.OP_MODELS, "utf8")); } catch (e) { modelsResp = {}; }
const quotaResp = JSON.parse(fs.readFileSync(env.OP_QUOTA, "utf8"));

const ids = [];
const add = (value) => { if (typeof value === "string" && value && value !== "*" && !ids.includes(value)) ids.push(value); };
for (const item of (modelsResp.data || [])) { if (item && typeof item === "object") add(item.id); }
for (const config of (quotaResp.model_configs || [])) { if (config && typeof config === "object") add(config.model_name); }
if (!ids.length) ids.push("qwen3.6");

const models = {};
for (const id of ids) {
  const pretty = id.split("/").pop().split(/[-_]+/).filter(Boolean).map((word) => word[0].toUpperCase() + word.slice(1)).join(" ");
  models[id] = { name: pretty };
}

let config = {};
if (env.OP_FLAG === "exists") config = load(env.OP_TARGET);
if (typeof config !== "object" || config === null || Array.isArray(config)) fail("the existing config is not a JSON object. Nothing was modified.");
let providers = config.providers;
if (providers === undefined || providers === null) providers = {};
if (typeof providers !== "object" || Array.isArray(providers)) fail("the existing providers entry is not an object. Nothing was modified.");

providers[env.OP_PROVIDER] = {
  name: "Conjecture 56",
  package: "@opencode/ai/providers/openai-compatible",
  settings: { baseURL: "https://api.conjecture56.org/v1", apiKey: env.OP_KEY },
  models,
};
config.providers = providers;

console.error("models: " + ids.join(", "));
process.stdout.write(JSON.stringify(config, null, 2));
'
}

run_bun() { run_node; }

run_jq() {
  MODEL_IDS=$(jq -rs '
    [ (.[0].data // [])[] | .id? | select(type == "string") ]
    + [ (.[1].model_configs // [])[] | .model_name? | select(type == "string") ]
    | map(select(length > 0 and . != "*"))
    | unique
    | (if length == 0 then ["qwen3.6"] else . end)
  ' "$OP_MODELS" "$OP_QUOTA") || die "could not parse the API response."
  printf 'models: %s\n' "$(printf '%s' "$MODEL_IDS" | jq -r 'join(", ")')" >&2

  MODELS_JSON=$(printf '%s' "$MODEL_IDS" | jq '
    map({ (.): { name: (split("/") | last | gsub("[-_]"; " ") | split(" ") | map((.[0:1] | ascii_upcase) + .[1:]) | join(" ")) } })
    | add
  ') || die "could not build the model list."

  if [ "$OP_FLAG" = "exists" ]; then
    jq --arg key "$OP_KEY" --argjson models "$MODELS_JSON" --arg provider "$OP_PROVIDER" '
      .providers = (((.providers // {}) + {}) + {
        ($provider): {
          name: "Conjecture 56",
          package: "@opencode/ai/providers/openai-compatible",
          settings: { baseURL: "https://api.conjecture56.org/v1", apiKey: $key },
          models: $models
        }
      })
    ' "$OP_TARGET" || die "the existing config is not valid JSON. Nothing was modified."
  else
    jq -n --arg key "$OP_KEY" --argjson models "$MODELS_JSON" --arg provider "$OP_PROVIDER" '
      {
        providers: {
          ($provider): {
            name: "Conjecture 56",
            package: "@opencode/ai/providers/openai-compatible",
            settings: { baseURL: "https://api.conjecture56.org/v1", apiKey: $key },
            models: $models
          }
        }
      }
    '
  fi
}

log "configuring the $PROVIDER_ID provider (engine: $ENGINE)…"
case "$ENGINE" in
  python3) MERGED=$(run_python3) || die "could not build the merged configuration. Nothing was modified." ;;
  node)    MERGED=$(run_node)    || die "could not build the merged configuration. Nothing was modified." ;;
  bun)     MERGED=$(run_bun)     || die "could not build the merged configuration. Nothing was modified." ;;
  jq)      MERGED=$(run_jq)      || die "could not build the merged configuration. Nothing was modified." ;;
  *)       die "unsupported engine: $ENGINE" ;;
esac
[ -n "$MERGED" ] || die "the merge produced no output. Nothing was modified."

# ---------- backup + atomic write ----------
if [ "$ORIG_FLAG" = "exists" ]; then
  BACKUP="$TARGET.backup-$(date +%Y%m%dT%H%M%S)"
  cp "$TARGET" "$BACKUP"
  log "backup saved: $BACKUP"
fi

TMP_TARGET="$TARGET.tmp.$$"
printf '%s\n' "$MERGED" > "$TMP_TARGET"
mv "$TMP_TARGET" "$TARGET"
if [ "$ORIG_FLAG" = "new" ]; then
  chmod 600 "$TARGET" 2>/dev/null || true
fi

log "updated: $TARGET"
log "done. verify with: opencode run --model $PROVIDER_ID/<model> \"Reply exactly: gateway-ok\""
