# Voyage-Wz-Extractor

Pure Node.js extractor for MapleStory **v83** WZ (PKG1) asset files — no dependencies.

Takes a folder of `*.wz` files and produces a plain file tree your engine or web client can load directly:

```
assets/
├── Character/
│   ├── 00002000.img.json          # full property tree
│   └── 00002000.img/
│       ├── stand1/0/body.png      # canvas → PNG
│       └── stand1/0/arm.png
├── Mob/9001000.img/...
├── Sound/Bgm00.img/FloralLife.mp3 # sound → MP3/WAV
└── ...
```

## Features

- **Zero dependencies** — Node.js ≥ 18 only (`node:fs`, `node:zlib`, `node:buffer`)
- **Auto version detection** — brute-forces the WZ version hash (v83 confirmed: hash `0x754`, enc byte 172), so no config needed
- **Encrypted string decryption** (GMS key, `key_gms.bin` included)
- **Encrypted canvas blocks** (List.wz-style `[len][xor-key]` blocks) handled
- **All pixel formats**:
  
  | fmt | format |
  |-----|--------|
  | 1 | BGRA4444 (2 bpp) |
  | 2 | BGRA8888 (4 bpp) |
  | 513 | RGB565 (2 bpp) |
  | 517 | RGB565, one value per 16×16 block |
  | 1026 | DXT3 |
  | 2050 | DXT5 |
- **Property tree → JSON** with node shapes:
  - canvas → `{"_canvas": "<rel path>", "_w": n, "_h": n, ...props}`
  - vector → `[x, y]`, convex → `[[x,y], ...]`
  - UOL → `{"_uol": "../rel/path"}`
  - sound → `{"_sound": "<rel path>", "_ms": n}`
- **Sounds** exported as MP3 (passthrough) or proper WAV (RIFF header built from the WEX block)
- **Resume / partial extraction** (`--resume`, `--only=sub/path`, `--json-only`, WZ name filter)

## Usage

```sh
# Extract every .wz in ./wz into ./assets
node wz-extract.mjs ./wz ./assets

# Only specific WZs
node wz-extract.mjs ./wz ./assets Character Mob Map

# One IMG (fast)
node wz-extract.mjs ./wz ./assets --only=Character/00002000

# JSON only (skip PNG/WAV output)
node wz-extract.mjs ./wz ./assets --json-only

# Re-run after a failure: skip already-extracted IMGs
node wz-extract.mjs ./wz ./assets --resume
```

Requires Node ≥ 18. The GMS key ships in `key_gms.bin`; if you need KMS/BMS, drop the key bytes there (65536 bytes).

## Layout

- `wz-extract.mjs` — the extractor (single file, ~440 lines)
- `key_gms.bin` — GMS decryption key

 

## Notes

- Built and verified against the official v83 GMS client (14 WZ files, ~2.9 GB → 22,182 JSON + 555,617 PNG).
- MIT licensed.
