#!/usr/bin/env python3
"""One-shot: replace generated demo-media SVGs with topic-matched WebP photos.

Downloads commercially-licensed Unsplash/Pexels images, encodes WebP ≤120KB,
writes rizq-assets/demo-<section>/ + CREDITS.md, rewrites product refs,
deletes demo-media SVGs and the SVG generator.

Re-run is idempotent for already-present WebP targets.
"""
from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "rizq-assets"
DEMO_MEDIA = ROOT / "demo-media"
MANIFEST = DEMO_MEDIA / "MANIFEST.json"
MAX_BYTES = 120 * 1024
UA = "RizqDemoBuilder/1.0 (local asset bake; commercial stock)"

# Curated commercial-license sources for picsum placeholder seeds (topic-matched).
# Prefer Unsplash source URLs (license allows commercial use). Pexels as fallback.
PEXEL = "https://images.pexels.com/photos"
UNSPLASH = "https://images.unsplash.com"

PICSUM_SOURCES: dict[str, tuple[str, str, str]] = {
    # filename stem -> (section, source_url, credit)
    "p-ed6ac61c0def": (
        "misc",
        f"{UNSPLASH}/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=900&q=70",
        "Unsplash — storefront (commercial license)",
    ),
    "p-rizq-camel-a-640x480": (
        "livestock",
        f"{UNSPLASH}/photo-1703613168013-fd134a8df05f?auto=format&fit=crop&w=900&q=70",
        "Unsplash — camel in Wadi Rum desert",
    ),
    "p-rizq-camel-b-640x480": (
        "livestock",
        f"{UNSPLASH}/photo-1670687174580-c003b4716959?auto=format&fit=crop&w=900&q=70",
        "Unsplash — camel walking in desert",
    ),
    "p-rizq-camel-c-640x480": (
        "livestock",
        f"{UNSPLASH}/photo-1615380098674-d28bf1a87cd3?auto=format&fit=crop&w=900&q=70",
        "Unsplash — brown camels on desert",
    ),
    "p-rizq-cattle-a-640x480": (
        "livestock",
        f"{PEXEL}/422218/pexels-photo-422218.jpeg?auto=compress&cs=tinysrgb&w=900",
        "Pexels — cattle",
    ),
    "p-rizq-cattle-b-640x480": (
        "livestock",
        f"{PEXEL}/735968/pexels-photo-735968.jpeg?auto=compress&cs=tinysrgb&w=900",
        "Pexels — cows field",
    ),
    # Graduation ads by title topic
    "p-rizq-grad-ad01a-640x480": ("electronics", f"{UNSPLASH}/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=900&q=70", "Unsplash — smartphone"),
    "p-rizq-grad-ad01b-640x480": ("electronics", f"{UNSPLASH}/photo-1592899677977-9c10ca588bbd?auto=format&fit=crop&w=900&q=70", "Unsplash — phone detail"),
    "p-rizq-grad-ad02-640x480": ("electronics", f"{UNSPLASH}/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=70", "Unsplash — headphones"),
    "p-rizq-grad-ad03a-640x480": ("fashion", f"{UNSPLASH}/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=900&q=70", "Unsplash — men’s traditional wear"),
    "p-rizq-grad-ad03b-640x480": ("fashion", f"{UNSPLASH}/photo-1617137984095-74ce4fb2a0a9?auto=format&fit=crop&w=900&q=70", "Unsplash — men’s robe"),
    "p-rizq-grad-ad04-640x480": ("food", f"{UNSPLASH}/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=900&q=70", "Unsplash — rice bags"),
    "p-rizq-grad-ad05-640x480": ("gold", f"{UNSPLASH}/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=900&q=70", "Unsplash — gold bracelet"),
    "p-rizq-grad-ad06a-640x480": ("furniture", f"{UNSPLASH}/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=900&q=70", "Unsplash — sofa set"),
    "p-rizq-grad-ad06b-640x480": ("furniture", f"{UNSPLASH}/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&w=900&q=70", "Unsplash — living room"),
    "p-rizq-grad-ad07a-640x480": ("cars", f"{UNSPLASH}/photo-1621007947382-bb3c3994e3fb?auto=format&fit=crop&w=900&q=70", "Unsplash — Toyota sedan"),
    "p-rizq-grad-ad07b-640x480": ("cars", f"{UNSPLASH}/photo-1542362567-b07e54358753?auto=format&fit=crop&w=900&q=70", "Unsplash — car rear"),
    "p-rizq-grad-ad07c-640x480": ("cars", f"{UNSPLASH}/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=900&q=70", "Unsplash — car front"),
    "p-rizq-grad-ad08-640x480": ("cars", f"{UNSPLASH}/photo-1606664515524-ed2f786a0bd6?auto=format&fit=crop&w=900&q=70", "Unsplash — SUV / Tucson-like"),
    "p-rizq-grad-ad09-640x480": ("electronics", f"{UNSPLASH}/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&w=900&q=70", "Unsplash — smart TV"),
    "p-rizq-grad-ad10a-640x480": ("estate", f"{UNSPLASH}/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=900&q=70", "Unsplash — apartment interior"),
    "p-rizq-grad-ad10b-640x480": ("estate", f"{UNSPLASH}/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=900&q=70", "Unsplash — living space"),
    "p-rizq-grad-ad11-640x480": ("cars", f"{UNSPLASH}/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=900&q=70", "Unsplash — car tires"),
    "p-rizq-grad-ad12-640x480": ("furniture", f"{UNSPLASH}/photo-1518455027359-f3f8164ba9bd?auto=format&fit=crop&w=900&q=70", "Unsplash — office desk"),
    # catalog sections s01 electronics … s06
    "p-rizq-grad-cat-s01-01-640x480": ("electronics", f"{UNSPLASH}/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=800&q=70", "Unsplash — phone"),
    "p-rizq-grad-cat-s01-02-640x480": ("electronics", f"{UNSPLASH}/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=800&q=70", "Unsplash — charger"),
    "p-rizq-grad-cat-s01-03-640x480": ("electronics", f"{UNSPLASH}/photo-1484704849700-f032a568e944?auto=format&fit=crop&w=800&q=70", "Unsplash — earbuds"),
    "p-rizq-grad-cat-s01-04-640x480": ("electronics", f"{UNSPLASH}/photo-1601784551446-20c9e07cdbdb?auto=format&fit=crop&w=800&q=70", "Unsplash — phone case"),
    "p-rizq-grad-cat-s01-05-640x480": ("electronics", f"{UNSPLASH}/photo-1609091839311-b248ba949193?auto=format&fit=crop&w=800&q=70", "Unsplash — power bank"),
    "p-rizq-grad-cat-s01-06-640x480": ("electronics", f"{PEXEL}/699122/pexels-photo-699122.jpeg?auto=compress&cs=tinysrgb&w=800", "Pexels — smartphone cable"),
    "p-rizq-grad-cat-s02-01-640x480": ("fashion", f"{UNSPLASH}/photo-1617137984095-74ce4fb2a0a9?auto=format&fit=crop&w=800&q=70", "Unsplash — men’s wear"),
    "p-rizq-grad-cat-s02-02-640x480": ("fashion", f"{UNSPLASH}/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=800&q=70", "Unsplash — evening dress"),
    "p-rizq-grad-cat-s02-03-640x480": ("fashion", f"{UNSPLASH}/photo-1596755094514-f87e34085b85?auto=format&fit=crop&w=800&q=70", "Unsplash — men’s shirt"),
    "p-rizq-grad-cat-s02-04-640x480": ("accessories", f"{UNSPLASH}/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=800&q=70", "Unsplash — handbag"),
    "p-rizq-grad-cat-s02-05-640x480": ("accessories", f"{UNSPLASH}/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=800&q=70", "Unsplash — women’s shoes"),
    "p-rizq-grad-cat-s03-01-640x480": ("food", f"{UNSPLASH}/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=70", "Unsplash — vegetables"),
    "p-rizq-grad-cat-s03-02-640x480": ("food", f"{UNSPLASH}/photo-1536304993881-ff6e9eefa2a6?auto=format&fit=crop&w=800&q=70", "Unsplash — rice"),
    "p-rizq-grad-cat-s03-03-640x480": ("food", f"{UNSPLASH}/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=800&q=70", "Unsplash — dairy"),
    "p-rizq-grad-cat-s03-04-640x480": ("food", f"{UNSPLASH}/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=70", "Unsplash — bread"),
    "p-rizq-grad-cat-s03-05-640x480": ("food", f"{UNSPLASH}/photo-1567306301408-9b74779a11af?auto=format&fit=crop&w=800&q=70", "Unsplash — tomatoes"),
    "p-rizq-grad-cat-s03-06-640x480": ("food", f"{UNSPLASH}/photo-1576045057995-568f588f82fb?auto=format&fit=crop&w=800&q=70", "Unsplash — spices"),
    "p-rizq-grad-cat-s03-07-640x480": ("food", f"{UNSPLASH}/photo-1464965911861-746a04b4bca6?auto=format&fit=crop&w=800&q=70", "Unsplash — strawberries"),
    "p-rizq-grad-cat-s03-08-640x480": ("food", f"{UNSPLASH}/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=800&q=70", "Unsplash — fruit basket"),
    "p-rizq-grad-cat-s04-01-640x480": ("gold", f"{UNSPLASH}/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=800&q=70", "Unsplash — jewelry"),
    "p-rizq-grad-cat-s04-02-640x480": ("gold", f"{UNSPLASH}/photo-1602173574767-37ac01994b2a?auto=format&fit=crop&w=800&q=70", "Unsplash — gold necklace"),
    "p-rizq-grad-cat-s04-03-640x480": ("gold", f"{UNSPLASH}/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&w=800&q=70", "Unsplash — rings"),
    "p-rizq-grad-cat-s04-04-640x480": ("gold", f"{UNSPLASH}/photo-1573408301185-9146fe634ad0?auto=format&fit=crop&w=800&q=70", "Unsplash — earrings"),
    "p-rizq-grad-cat-s05-01-640x480": ("furniture", f"{UNSPLASH}/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=70", "Unsplash — sofa"),
    "p-rizq-grad-cat-s05-02-640x480": ("furniture", f"{UNSPLASH}/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=800&q=70", "Unsplash — chair"),
    "p-rizq-grad-cat-s05-03-640x480": ("furniture", f"{UNSPLASH}/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=70", "Unsplash — office furniture"),
    "p-rizq-grad-cat-s05-04-640x480": ("furniture", f"{UNSPLASH}/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=800&q=70", "Unsplash — bedroom"),
    "p-rizq-grad-cat-s06-01-640x480": ("cars", f"{UNSPLASH}/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=800&q=70", "Unsplash — car parts"),
    "p-rizq-grad-cat-s06-02-640x480": ("cars", f"{UNSPLASH}/photo-1487754180451-c456f719a1fc?auto=format&fit=crop&w=800&q=70", "Unsplash — engine bay"),
    "p-rizq-grad-cat-s06-03-640x480": ("cars", f"{UNSPLASH}/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=800&q=70", "Unsplash — tires"),
    "p-rizq-grad-cat-s06-04-640x480": ("cars", f"{UNSPLASH}/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=800&q=70", "Unsplash — vehicle"),
    "p-rizq-grad-corp01-480x360": ("corp", f"{UNSPLASH}/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=900&q=70", "Unsplash — corporate building"),
    "p-rizq-grad-corp02-480x360": ("corp", f"{UNSPLASH}/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=70", "Unsplash — office lobby"),
    "p-rizq-grad-corp03-480x360": ("corp", f"{UNSPLASH}/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=900&q=70", "Unsplash — business desk"),
    "p-rizq-grad-estate01-480x360": ("estate", f"{UNSPLASH}/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=900&q=70", "Unsplash — villa exterior"),
    "p-rizq-grad-estate02-480x360": ("estate", f"{UNSPLASH}/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=900&q=70", "Unsplash — modern home"),
    "p-rizq-grad-estate03-480x360": ("estate", f"{UNSPLASH}/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=900&q=70", "Unsplash — living room"),
    "p-rizq-grad-office01-480x360": ("office", f"{UNSPLASH}/photo-1497366216548-37526070297c?auto=format&fit=crop&w=900&q=70", "Unsplash — open office"),
    "p-rizq-grad-office02-480x360": ("office", f"{UNSPLASH}/photo-1497366810023-9014ce582001?auto=format&fit=crop&w=900&q=70", "Unsplash — meeting room"),
    "p-rizq-grad-office03-480x360": ("office", f"{UNSPLASH}/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=900&q=70", "Unsplash — handshake desk"),
    "p-rizq-grad-store01-480x360": ("stores", f"{UNSPLASH}/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=900&q=70", "Unsplash — retail store"),
    "p-rizq-grad-store02-480x360": ("stores", f"{UNSPLASH}/photo-1441984904996-e0b6ba687e04?auto=format&fit=crop&w=900&q=70", "Unsplash — clothing rack"),
    "p-rizq-grad-store03-480x360": ("stores", f"{UNSPLASH}/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=900&q=70", "Unsplash — shop counter"),
    "p-rizq-grad-store04-480x360": ("stores", f"{UNSPLASH}/photo-1556740749-887f6717d7e4?auto=format&fit=crop&w=900&q=70", "Unsplash — shop shelves"),
    "p-rizq-grad-store05-480x360": ("stores", f"{UNSPLASH}/photo-1604719312566-8912e9227c6a?auto=format&fit=crop&w=900&q=70", "Unsplash — boutique"),
    "p-rizq-grad-store06-480x360": ("stores", f"{UNSPLASH}/photo-1567401893414-76b7b1e5a7a5?auto=format&fit=crop&w=900&q=70", "Unsplash — market aisle"),
    "p-rizq-sr-gen-640x480": ("showroom", f"{UNSPLASH}/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=900&q=70", "Unsplash — auto workshop"),
    "p-rizq-sr-keys-640x480": ("showroom", f"{UNSPLASH}/photo-1487754180451-c456f719a1fc?auto=format&fit=crop&w=900&q=70", "Unsplash — car keys / service"),
    "p-rizq-sr-tires-640x480": ("showroom", f"{UNSPLASH}/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=900&q=70", "Unsplash — tires stack"),
    "u-test": (
        "misc",
        f"{UNSPLASH}/photo-1556740749-887f6717d7e4?auto=format&fit=crop&w=400&q=60",
        "Unsplash — test fixture shop",
    ),
}

# Guess section for restored Unsplash photos from common usage.
UNSPLASH_SECTION_HINTS = [
    (re.compile(r"1560448204|1502672260266|1522708323590|1613490493576|1600585154340|1600607687939|1600566753190|1600573472592|1600047509807|1600210492486|1600596542815|1552321554|1556912173|1616594039964|1512917774080|1560518883|1500382017468|1486006920555"), "estate"),
    (re.compile(r"1533473359331|1492144534655|1503376780353|1606664515524|1519641471654|1542362567|1558618666"), "cars"),
    (re.compile(r"1511707171634|1592899677977|1593359677879"), "electronics"),
    (re.compile(r"1515562141207|1602173574767|1611591437281"), "gold"),
    (re.compile(r"1503387762|1504307651254|1542838132"), "build"),
    (re.compile(r"1581578731548|1621905251189|1521791136064"), "services"),
    (re.compile(r"1555041469|1493663284031|1586023492125|1497366216548"), "furniture"),
    (re.compile(r"1441986300917|1441984904996|1472851294608|1556740749"), "stores"),
    (re.compile(r"1496181133206"), "showroom"),
]


def section_for_unsplash(stem: str) -> str:
    for rx, sec in UNSPLASH_SECTION_HINTS:
        if rx.search(stem):
            return sec
    return "misc"


def unsplash_url_from_stem(stem: str) -> str | None:
    if not stem.startswith("u-") or stem == "u-test":
        return None
    photo = "photo-" + stem[2:]
    return f"{UNSPLASH}/{photo}?auto=format&fit=crop&w=900&q=70"


def download(url: str, dest: Path) -> None:
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "image/*,*/*"})
    with urllib.request.urlopen(req, timeout=60) as resp:
        dest.write_bytes(resp.read())


def encode_webp(src: Path, dest: Path, max_bytes: int = MAX_BYTES) -> int:
    dest.parent.mkdir(parents=True, exist_ok=True)
    # Try decreasing quality until under budget
    for q in (72, 64, 56, 48, 40, 32, 24):
        tmp = dest.with_suffix(f".q{q}.webp")
        cmd = [
            "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
            "-i", str(src),
            "-vf", "scale='min(1200,iw)':-2",
            "-c:v", "libwebp", "-quality", str(q), "-compression_level", "6",
            str(tmp),
        ]
        r = subprocess.run(cmd, capture_output=True, text=True)
        if r.returncode != 0 or not tmp.exists():
            continue
        size = tmp.stat().st_size
        if size <= max_bytes or q == 24:
            if dest.exists():
                dest.unlink()
            tmp.rename(dest)
            # cleanup other q temps
            for p in dest.parent.glob(dest.stem + ".q*.webp"):
                try:
                    p.unlink()
                except OSError:
                    pass
            return size
        tmp.unlink(missing_ok=True)
    raise RuntimeError(f"failed to encode {src}")


def write_credits(section_dir: Path, lines: list[str]) -> None:
    section_dir.mkdir(parents=True, exist_ok=True)
    path = section_dir / "CREDITS.md"
    header = (
        f"# Credits — `{section_dir.name}`\n\n"
        "Demo photographs for Rizq UI previews. Commercial use allowed under "
        "Unsplash License / Pexels License. Attribution not required by those "
        "licenses; recorded here for provenance.\n\n"
        "| File | Source |\n|---|---|\n"
    )
    existing = path.read_text(encoding="utf-8") if path.exists() else header
    if "| File |" not in existing:
        existing = header
    for line in lines:
        if line not in existing:
            existing = existing.rstrip() + "\n" + line + "\n"
    path.write_text(existing, encoding="utf-8")


def convert_fashion_jpgs(credits: dict[str, list[str]]) -> dict[str, str]:
    """Convert existing fashion JPGs → WebP; return path rewrite map."""
    fashion = ASSETS / "demo-fashion"
    mapping: dict[str, str] = {}
    if not fashion.exists():
        return mapping
    for jpg in sorted(fashion.glob("*.jpg")):
        webp = jpg.with_suffix(".webp")
        if not webp.exists() or webp.stat().st_size > MAX_BYTES:
            encode_webp(jpg, webp)
        mapping[f"rizq-assets/demo-fashion/{jpg.name}"] = f"rizq-assets/demo-fashion/{webp.name}"
        mapping[f"/rizq-assets/demo-fashion/{jpg.name}"] = f"rizq-assets/demo-fashion/{webp.name}"
        credits.setdefault("demo-fashion", []).append(
            f"| `{webp.name}` | Existing local fashion demo photo (converted to WebP) |"
        )
        # remove jpg after successful webp
        jpg.unlink(missing_ok=True)
    return mapping


def main() -> int:
    if not DEMO_MEDIA.exists():
        print("demo-media missing", file=sys.stderr)
        return 1

    manifest = json.loads(MANIFEST.read_text(encoding="utf-8")) if MANIFEST.exists() else {}
    # Build stem -> preferred unsplash URL from manifest
    stem_from_manifest: dict[str, str] = {}
    for url, local in manifest.items():
        if "images.unsplash.com" not in url:
            continue
        stem = Path(str(local)).stem
        stem_from_manifest.setdefault(stem, url.split("?")[0] + "?auto=format&fit=crop&w=900&q=70")

    svgs = sorted(DEMO_MEDIA.glob("*.svg"))
    print(f"SVGs to replace: {len(svgs)}")

    path_map: dict[str, str] = {}  # old path variants -> new relative path
    credits: dict[str, list[str]] = {}
    failures: list[str] = []

    with tempfile.TemporaryDirectory(prefix="rizq-demo-") as td:
        tmp = Path(td)
        for svg in svgs:
            stem = svg.stem
            if stem in PICSUM_SOURCES:
                section, url, credit = PICSUM_SOURCES[stem]
            elif stem in stem_from_manifest:
                url = stem_from_manifest[stem]
                section = section_for_unsplash(stem)
                credit = f"Unsplash — restored from prior demo URL ({stem})"
            else:
                u = unsplash_url_from_stem(stem)
                if not u:
                    failures.append(f"no source for {stem}")
                    continue
                url = u
                section = section_for_unsplash(stem)
                credit = f"Unsplash — {stem}"

            out_dir = ASSETS / f"demo-{section}"
            out_file = out_dir / f"{stem}.webp"
            try:
                if not out_file.exists() or out_file.stat().st_size > MAX_BYTES or out_file.stat().st_size < 500:
                    raw = tmp / f"{stem}.img"
                    # fallback URLs if primary fails
                    candidates = [url]
                    if stem in PICSUM_SOURCES:
                        pass
                    elif "photo-" in url:
                        # alternate quality
                        candidates.append(url.replace("w=900", "w=800").replace("q=70", "q=60"))
                    # known-bad cattle URL historically — already replaced in PICSUM_SOURCES
                    ok = False
                    last_err = ""
                    for cand in candidates:
                        try:
                            download(cand, raw)
                            if raw.stat().st_size < 800:
                                raise RuntimeError("tiny download")
                            encode_webp(raw, out_file)
                            ok = True
                            url = cand
                            break
                        except Exception as e:  # noqa: BLE001
                            last_err = str(e)
                    if not ok:
                        # ultimate fallback: solid-topic pexels car photo etc.
                        fallback = f"{UNSPLASH}/photo-1556740749-887f6717d7e4?auto=format&fit=crop&w=800&q=60"
                        download(fallback, raw)
                        encode_webp(raw, out_file)
                        credit = credit + f" [fallback after error: {last_err[:80]}]"
                new_rel = f"rizq-assets/demo-{section}/{stem}.webp"
                for old in (
                    f"/demo-media/{stem}.svg",
                    f"demo-media/{stem}.svg",
                    f"./demo-media/{stem}.svg",
                ):
                    path_map[old] = new_rel
                # also bare paths used in fixtures
                path_map[f"demo-media/{stem}.svg"] = new_rel
                credits.setdefault(f"demo-{section}", []).append(
                    f"| `{stem}.webp` | {credit} — {url.split('?')[0]} |"
                )
                print(f"OK {stem} → {new_rel} ({out_file.stat().st_size} B)")
            except Exception as e:  # noqa: BLE001
                failures.append(f"{stem}: {e}")
                print(f"FAIL {stem}: {e}", file=sys.stderr)

        fashion_map = convert_fashion_jpgs(credits)
        path_map.update(fashion_map)

    for sec, lines in credits.items():
        write_credits(ASSETS / sec, lines)

    # Rewrite product sources
    skip_dirs = {".git", "node_modules", "backups", ".baseline-main"}
    exts = {".js", ".html", ".json", ".css", ".md"}
    rewritten = 0
    for dirpath, dirs, files in os.walk(ROOT):
        dirs[:] = [d for d in dirs if d not in skip_dirs]
        # do not rewrite inside demo-media itself (will be deleted)
        rel_dir = os.path.relpath(dirpath, ROOT)
        if rel_dir.startswith("demo-media"):
            continue
        for name in files:
            if Path(name).suffix not in exts:
                continue
            path = Path(dirpath) / name
            text = path.read_text(encoding="utf-8", errors="ignore")
            orig = text
            # longest keys first
            for old in sorted(path_map.keys(), key=len, reverse=True):
                text = text.replace(old, path_map[old])
            # catch remaining /demo-media/*.svg that mapped by stem
            def repl(m: re.Match[str]) -> str:
                stem = Path(m.group(1)).stem
                # find any mapped new path ending with stem.webp
                for v in path_map.values():
                    if v.endswith(f"/{stem}.webp"):
                        return v
                return m.group(0)

            text2 = re.sub(r"(?:\.?/)?demo-media/([A-Za-z0-9._-]+\.svg)", repl, text)
            if text2 != orig:
                path.write_text(text2, encoding="utf-8")
                rewritten += 1
                print("rewrote", path.relative_to(ROOT))

    print(f"rewrote files: {rewritten}")

    # Delete SVGs + generator + README that describes SVG generation
    for svg in DEMO_MEDIA.glob("*.svg"):
        svg.unlink()
    gen = ROOT / "scripts" / "gen-local-demo-media.py"
    if gen.exists():
        gen.unlink()
        print("deleted", gen.relative_to(ROOT))
    readme = DEMO_MEDIA / "README.md"
    if readme.exists():
        readme.write_text(
            "# Demo media (retired)\n\n"
            "Generated SVG placeholders were removed. Real demo photos live under "
            "`rizq-assets/demo-<section>/` with `CREDITS.md`.\n",
            encoding="utf-8",
        )
    # Keep MANIFEST as historical map but note retirement
    if MANIFEST.exists():
        MANIFEST.write_text(
            json.dumps(
                {
                    "_note": "Historical URL→local SVG map. SVGs removed; see rizq-assets/demo-*",
                    "legacy": manifest,
                },
                ensure_ascii=False,
                indent=2,
            )
            + "\n",
            encoding="utf-8",
        )

    left = list(DEMO_MEDIA.glob("*.svg"))
    print("remaining svgs", len(left))
    if failures:
        print("FAILURES:", *failures, sep="\n  ", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
