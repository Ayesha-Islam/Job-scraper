#!/usr/bin/env bash

set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "$script_dir/.." && pwd)"
output_path="${1:-$repo_root/job-scraper-source.tar.gz}"
file_list="$(mktemp)"

cleanup() {
  rm -f "$file_list"
}
trap cleanup EXIT

cd "$repo_root"

# Include tracked files that still exist plus intentional, non-ignored new source
# files. This also supports packaging a working tree with staged or unstaged
# deletions. Ignored secrets, dependencies, build output, and generated archives
# stay out.
while IFS= read -r -d '' path; do
  if [[ -f "$path" || -L "$path" ]]; then
    printf '%s\0' "$path" >> "$file_list"
  fi
done < <(git ls-files --cached --others --exclude-standard -z)

tar \
  --null \
  --files-from="$file_list" \
  --transform='s,^,Job-scraper/,' \
  --create \
  --gzip \
  --file="$output_path"

archive_listing="$(tar -tzf "$output_path")"

if printf '%s\n' "$archive_listing" | grep -E \
  '(^|/)(\.git|node_modules|\.next|dist)(/|$)' >/dev/null; then
  echo "Archive validation failed: generated content or Git metadata was included." >&2
  exit 1
fi

if printf '%s\n' "$archive_listing" \
  | grep -E '(^|/)\.env($|\.)' \
  | grep -vE '(^|/)\.env\.example$' >/dev/null; then
  echo "Archive validation failed: sensitive or generated content was included." >&2
  exit 1
fi

echo "Created clean source archive: $output_path"
