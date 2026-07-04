#!/usr/bin/env bash
# Theo dõi inbox.jsonl, in ra mỗi prompt có status "pending" (mỗi dòng 1 lần).
# Dùng bởi Monitor của Claude để biết khi nào có prompt mới từ canvas.
INBOX="$(dirname "$0")/inbox.jsonl"
SEEN="$(dirname "$0")/.seen"
touch "$SEEN"
while true; do
  if [ -f "$INBOX" ]; then
    while IFS= read -r line; do
      [ -z "$line" ] && continue
      id=$(printf '%s' "$line" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p')
      status=$(printf '%s' "$line" | sed -n 's/.*"status":"\([^"]*\)".*/\1/p')
      [ "$status" != "pending" ] && continue
      grep -q "^$id$" "$SEEN" 2>/dev/null && continue
      echo "$id" >> "$SEEN"
      prompt=$(printf '%s' "$line" | sed -n 's/.*"prompt":"\([^"]*\)".*/\1/p')
      images=$(printf '%s' "$line" | sed -n 's/.*"images":\[\([^]]*\)\].*/\1/p' | tr -d '"')
      target=$(printf '%s' "$line" | sed -n 's/.*"targetFile":"\([^"]*\)".*/\1/p')
      out="NEW_PROMPT id=$id :: $prompt"
      [ -n "$target" ] && out="$out :: EDIT=$target"
      [ -n "$images" ] && out="$out :: IMAGES=$images"
      out="$out :: GUIDELINES=prompts/design-guidelines.md (đọc file này trước khi vẽ: icon SVG thật, không emoji, có animation, polish như Claude Design)"
      echo "$out"
    done < "$INBOX"
  fi
  sleep 2
done
