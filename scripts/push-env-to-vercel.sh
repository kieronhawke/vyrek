#!/usr/bin/env bash
# Sync every variable in .env.local up to Vercel (production / preview / development).
# Idempotent — uses `--force` to overwrite existing values.
#
# The `preview` environment needs an empty-string positional gitbranch arg under
# the Vercel CLI Claude Code plugin (the hint to "omit for all preview branches"
# doesn't actually work — empty string does).
set -euo pipefail

ENV_FILE="$(dirname "$0")/../.env.local"

if [ ! -f "$ENV_FILE" ]; then
  echo "Error: $ENV_FILE not found"
  exit 1
fi

add_env() {
  local key="$1" val="$2" env="$3"
  local extra=()
  if [ "$env" = "preview" ]; then
    extra=("")  # empty gitbranch = all preview branches
  fi
  vercel env add "$key" "$env" "${extra[@]}" --value "$val" --yes --force \
    >/dev/null 2>&1 \
    && echo "   ✓ $env" \
    || echo "   ✗ $env (FAILED)"
}

while IFS= read -r line || [ -n "$line" ]; do
  line="${line#"${line%%[![:space:]]*}"}"
  line="${line%"${line##*[![:space:]]}"}"
  [ -z "$line" ] && continue
  [[ "$line" =~ ^# ]] && continue
  [[ "$line" != *"="* ]] && continue

  KEY="${line%%=*}"
  VALUE="${line#*=}"
  VALUE="${VALUE%\"}"
  VALUE="${VALUE#\"}"

  [ -z "$VALUE" ] && { echo "skip $KEY (empty)"; continue; }

  echo ""
  echo "→ $KEY"
  add_env "$KEY" "$VALUE" production
  add_env "$KEY" "$VALUE" preview
  add_env "$KEY" "$VALUE" development
done < "$ENV_FILE"

echo ""
echo "✓ Done. Run \`vercel --yes\` to redeploy."
