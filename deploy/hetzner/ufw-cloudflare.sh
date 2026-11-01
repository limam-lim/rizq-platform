#!/usr/bin/env bash
# UFW: 80/443 من نطاقات Cloudflare فقط + SSH 22 مفتوح للجميع.
# يجلب القوائم الرسمية من Cloudflare.
set -euo pipefail

if [[ "$(id -u)" -ne 0 ]]; then
  echo "run as root" >&2
  exit 1
fi

command -v ufw >/dev/null || { echo "ufw missing" >&2; exit 1; }
command -v curl >/dev/null || { echo "curl missing" >&2; exit 1; }

echo "[ufw-cf] fetching Cloudflare IP lists…"
V4="$(curl -fsSL https://www.cloudflare.com/ips-v4)"
V6="$(curl -fsSL https://www.cloudflare.com/ips-v6)"

ufw --force reset
ufw default deny incoming
ufw default allow outgoing

# SSH مفتوح (قيّده لاحقاً بـ IP إداري إن أمكن)
ufw allow 22/tcp comment 'ssh'

while IFS= read -r cidr; do
  [[ -z "$cidr" ]] && continue
  ufw allow from "$cidr" to any port 80 proto tcp comment 'cloudflare-http'
  ufw allow from "$cidr" to any port 443 proto tcp comment 'cloudflare-https'
done <<< "$V4"

while IFS= read -r cidr; do
  [[ -z "$cidr" ]] && continue
  ufw allow from "$cidr" to any port 80 proto tcp comment 'cloudflare-http6'
  ufw allow from "$cidr" to any port 443 proto tcp comment 'cloudflare-https6'
done <<< "$V6"

ufw --force enable
ufw status numbered
echo "[ufw-cf] done — TRUST_CLOUDFLARE=1 على Node خلف البروكسي"
