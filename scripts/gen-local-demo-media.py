#!/usr/bin/env python3
"""Regenerate demo-media SVGs from any remaining unsplash/picsum refs.
Prefer running the one-shot rewriter committed with the PR; this script
is a no-op scanner + SVG ensure for CI/local."""
import os, re, hashlib, json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'demo-media'
url_re = re.compile(r"https://(?:images\.unsplash\.com|picsum\.photos)[^\"'\s)]+")

def allowed(rel: str) -> bool:
  p = rel.replace('\\', '/')
  if any(s in p for s in ['.git/', 'node_modules/', '.baseline-main/', 'backups/', 'demo-media/']):
    return False
  return (
    p.startswith('rizq_')
    or p.startswith('rizq-backend/fixtures/')
    or p == 'scripts/test-hero-cover.js'
  )

left = []
for dirpath, dirs, files in os.walk(ROOT):
  dirs[:] = [d for d in dirs if d not in {'.git', 'node_modules', 'backups'}]
  for f in files:
    path = Path(dirpath) / f
    if path.suffix not in {'.js', '.html', '.json'}:
      continue
    rel = str(path.relative_to(ROOT))
    if not allowed(rel):
      continue
    text = path.read_text(encoding='utf-8', errors='ignore')
    found = url_re.findall(text)
    if found:
      left.append((rel, found[:3]))

if left:
  print('EXTERNAL DEMO IMAGE URLS STILL PRESENT:')
  for rel, sample in left:
    print(' ', rel, 'e.g.', sample[0][:80])
  raise SystemExit(1)

svgs = list(OUT.glob('*.svg')) if OUT.exists() else []
print('OK local demo media: 0 external refs; svg_count=%d' % len(svgs))
if len(svgs) < 50:
  raise SystemExit(2)
