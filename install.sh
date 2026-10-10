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
# JSONC targets (opencode.jsonc with comments) require python3 or node/bun.

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
# opencode.jsonc is preferred over opencode.json when both exist: OpenCode
# documentation leaves the coexistence undefined, and in practice the .jsonc
# form is the one OpenCode keeps reading.
TARGET="${OPENCODE_CONFIG:-}"
if [ -n "$TARGET" ]; then
  mkdir -p "$(dirname "$TARGET")"
else
  for candidate in \
    ./opencode.jsonc ./opencode.json \
    ./.opencode/opencode.jsonc ./.opencode/opencode.json \
    "$HOME/.config/opencode/opencode.jsonc" "$HOME/.config/opencode/opencode.json"
  do
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

# Warn when both formats coexist in the same directory.
if [ -f "$TARGET" ]; then
  TARGET_DIR=$(dirname "$TARGET")
  if [ -f "$TARGET_DIR/opencode.json" ] && [ -f "$TARGET_DIR/opencode.jsonc" ]; then
    log "warning: both opencode.json and opencode.jsonc exist in $TARGET_DIR"
    log "warning: OpenCode reads only one of them. After this run, delete the file that does not contain your other settings (usually the installer-created opencode.json)."
  fi
fi

# ---------- OpenCode schema detection (V1 vs V2) ----------
# V1: "provider" (singular) + npm + options
# V2: "providers" (plural) + package + settings
if command -v opencode >/dev/null 2>&1; then
  OPENCODE_FOUND=1
else
  OPENCODE_FOUND=0
  log "note: opencode was not found in PATH; the configuration will be written anyway, assuming the latest (V2) schema. Install OpenCode to use it."
fi
SCHEMA="${INSTALLER_SCHEMA:-}"
if [ -z "$SCHEMA" ]; then
  SCHEMA="v2"
  OPENCODE_VERSION=""
  if [ "$OPENCODE_FOUND" = 1 ]; then
    OPENCODE_VERSION=$(opencode --version 2>/dev/null | head -n 1 || true)
  fi
  case "$OPENCODE_VERSION" in
    [01].*) SCHEMA="v1" ;;
  esac
fi

export OP_FLAG="$ORIG_FLAG" OP_KEY="$KEY" OP_TARGET="$TARGET" OP_MODELS="$MODELS_FILE" OP_QUOTA="$QUOTA_FILE" OP_PROVIDER="$PROVIDER_ID" OP_SCHEMA="$SCHEMA"

# ---------- merge engines (each writes the merged config to stdout) ----------
run_python3() {
  python3 - <<'PY'
import json, os, re, sys

def fail(message):
    sys.stderr.write("install error: %s\n" % message)
    sys.exit(1)

def strip_jsonc(text):
    out = []
    i, n = 0, len(text)
    in_str = False
    while i < n:
        c = text[i]
        if in_str:
            out.append(c)
            if c == "\\" and i + 1 < n:
                out.append(text[i + 1])
                i += 2
                continue
            if c == '"':
                in_str = False
            i += 1
            continue
        if c == '"':
            in_str = True
            out.append(c)
            i += 1
            continue
        if c == "/" and i + 1 < n and text[i + 1] == "/":
            while i < n and text[i] != "\n":
                i += 1
            continue
        if c == "/" and i + 1 < n and text[i + 1] == "*":
            i += 2
            while i + 1 < n and not (text[i] == "*" and text[i + 1] == "/"):
                i += 1
            i += 2
            continue
        out.append(c)
        i += 1
    return "".join(out)

def parse_config_text(raw, label):
    try:
        return json.loads(raw), False
    except ValueError:
        pass
    stripped = strip_jsonc(raw)
    try:
        return json.loads(stripped), True
    except ValueError:
        pass
    try:
        return json.loads(re.sub(r",\s*([}\]])", r"\1", stripped)), True
    except ValueError as exc:
        fail("%s is not valid JSON or JSONC (%s). Nothing was modified." % (label, exc))

def load_file(path):
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
    models_resp = load_file(os.environ["OP_MODELS"])
    quota_resp = load_file(os.environ["OP_QUOTA"])
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
            raw = handle.read()
    except FileNotFoundError:
        raw = None
    if raw is not None:
        config, simplified = parse_config_text(raw, "the existing config")
else:
    simplified = False
if not isinstance(config, dict):
    fail("the existing config is not a JSON object. Nothing was modified.")

schema = os.environ.get("OP_SCHEMA", "v2")
if schema == "v1":
    container_key = "provider"
    entry = {
        "name": "Conjecture 56",
        "npm": "@ai-sdk/openai-compatible",
        "options": {
            "baseURL": "https://api.conjecture56.org/v1",
            "apiKey": key,
        },
        "models": models,
    }
else:
    container_key = "providers"
    entry = {
        "name": "Conjecture 56",
        "package": "@opencode/ai/providers/openai-compatible",
        "settings": {
            "baseURL": "https://api.conjecture56.org/v1",
            "apiKey": key,
        },
        "models": models,
    }

container = config.get(container_key)
if container is None:
    container = {}
if not isinstance(container, dict):
    fail("the existing '%s' entry is not an object. Nothing was modified." % container_key)

container[provider] = entry
config[container_key] = container

sys.stderr.write("schema: %s\n" % schema)
sys.stderr.write("models: %s\n" % ", ".join(ids))
if simplified:
    sys.stderr.write("note: the original file used JSONC syntax; comments and trailing commas were simplified. A backup was kept.\n")
json.dump(config, sys.stdout, indent=2)
PY
}

run_node() {
  node -e '
const fs = require("fs");
const env = process.env;
const fail = (message) => { console.error("install error: " + message); process.exit(1); };

function stripJsonc(text) {
  const out = [];
  let i = 0, inStr = false;
  while (i < text.length) {
    const c = text[i];
    if (inStr) {
      out.push(c);
      if (c === "\\" && i + 1 < text.length) { out.push(text[i + 1]); i += 2; continue; }
      if (c === "\"") inStr = false;
      i += 1;
      continue;
    }
    if (c === "\"") { inStr = true; out.push(c); i += 1; continue; }
    if (c === "/" && text[i + 1] === "/") { while (i < text.length && text[i] !== "\n") i += 1; continue; }
    if (c === "/" && text[i + 1] === "*") { i += 2; while (i + 1 < text.length && !(text[i] === "*" && text[i + 1] === "/")) i += 1; i += 2; continue; }
    out.push(c);
    i += 1;
  }
  return out.join("");
}

function parseConfigText(raw, label) {
  try { return { config: JSON.parse(raw), simplified: false }; } catch (e) {}
  const stripped = stripJsonc(raw);
  let simplified = true;
  try { return { config: JSON.parse(stripped), simplified }; } catch (e) {}
  try { return { config: JSON.parse(stripped.replace(/,\s*([}\]])/g, "$1")), simplified }; }
  catch (e) { fail(label + " is not valid JSON or JSONC (" + e.message + "). Nothing was modified."); }
}

function loadFile(path) { try { return JSON.parse(fs.readFileSync(path, "utf8")); } catch (e) { if (e.code === "ENOENT") return {}; fail("downloaded API data is not valid JSON. Nothing was modified."); } }

const modelsResp = loadFile(env.OP_MODELS);
const quotaResp = loadFile(env.OP_QUOTA);

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

const schema = env.OP_SCHEMA === "v1" ? "v1" : "v2";
const entry = schema === "v1"
  ? { name: "Conjecture 56", npm: "@ai-sdk/openai-compatible", options: { baseURL: "https://api.conjecture56.org/v1", apiKey: env.OP_KEY }, models }
  : { name: "Conjecture 56", package: "@opencode/ai/providers/openai-compatible", settings: { baseURL: "https://api.conjecture56.org/v1", apiKey: env.OP_KEY }, models };
const containerKey = schema === "v1" ? "provider" : "providers";

let config = {}, simplified = false;
if (env.OP_FLAG === "exists") {
  let raw = null;
  try { raw = fs.readFileSync(env.OP_TARGET, "utf8"); } catch (e) { if (e.code !== "ENOENT") fail("cannot read the existing config (" + e.message + "). Nothing was modified."); }
  if (raw !== null) { const parsed = parseConfigText(raw, "the existing config"); config = parsed.config; simplified = parsed.simplified; }
}
if (typeof config !== "object" || config === null || Array.isArray(config)) fail("the existing config is not a JSON object. Nothing was modified.");
let container = config[containerKey];
if (container === undefined || container === null) container = {};
if (typeof container !== "object" || Array.isArray(container)) fail("the existing " + containerKey + " entry is not an object. Nothing was modified.");

container[env.OP_PROVIDER] = entry;
config[containerKey] = container;

console.error("schema: " + schema);
console.error("models: " + ids.join(", "));
if (simplified) console.error("note: the original file used JSONC syntax; comments and trailing commas were simplified. A backup was kept.");
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
    jq --arg key "$OP_KEY" --argjson models "$MODELS_JSON" --arg provider "$OP_PROVIDER" --arg schema "$OP_SCHEMA" '
      def entry:
        if $schema == "v1" then
          { name: "Conjecture 56", npm: "@ai-sdk/openai-compatible", options: { baseURL: "https://api.conjecture56.org/v1", apiKey: $key }, models: $models }
        else
          { name: "Conjecture 56", package: "@opencode/ai/providers/openai-compatible", settings: { baseURL: "https://api.conjecture56.org/v1", apiKey: $key }, models: $models }
        end;
      (if $schema == "v1" then "provider" else "providers" end) as $container
      | .[$container] = (((.[$container] // {}) + {}) + { ($provider): entry })
    ' "$OP_TARGET" || die "the existing config could not be parsed. If it is an opencode.jsonc with comments, python3 or node is required to merge it safely. Nothing was modified."
  else
    jq -n --arg key "$OP_KEY" --argjson models "$MODELS_JSON" --arg provider "$OP_PROVIDER" --arg schema "$OP_SCHEMA" '
      def entry:
        if $schema == "v1" then
          { name: "Conjecture 56", npm: "@ai-sdk/openai-compatible", options: { baseURL: "https://api.conjecture56.org/v1", apiKey: $key }, models: $models }
        else
          { name: "Conjecture 56", package: "@opencode/ai/providers/openai-compatible", settings: { baseURL: "https://api.conjecture56.org/v1", apiKey: $key }, models: $models }
        end;
      (if $schema == "v1" then "provider" else "providers" end) as $container
      | { ($container): { ($provider): entry } }
    '
  fi
}

log "configuring the $PROVIDER_ID provider (engine: $ENGINE, schema: $SCHEMA)…"
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
if [ "$OPENCODE_FOUND" = 1 ]; then
  log "done. verify with: opencode run --model $PROVIDER_ID/<model> \"Reply exactly: Conjecture 56 ok\""
else
  log "done. install OpenCode, then verify with: opencode run --model $PROVIDER_ID/<model> \"Reply exactly: Conjecture 56 ok\""
fi
