<div align="center">

<img src="https://github.com/user-attachments/assets/f3327f7f-5a19-403d-b881-d540287cdf14" width="120" height="120" alt="Voyage MapleStory WZ extractor logo" />

# Voyage WZ Extractor: MapleStory WZ File Extractor

**A pure Node.js MapleStory v83 WZ extractor.** Converts `.wz` (PKG1) asset files into plain JSON, PNG, MP3, and WAV that any engine or web client can load.
Zero dependencies · Auto version detection · GMS encryption support

<br />

![MapleStory v83](https://img.shields.io/badge/MapleStory-v83%20GMS-orange?style=for-the-badge)
![WZ PKG1](https://img.shields.io/badge/format-WZ%20(PKG1)-8A2BE2?style=for-the-badge)
![License](https://img.shields.io/github/license/comcad/Voyage-Wz-Extractor?style=for-the-badge)

![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A5%2018-339933?style=flat-square&logo=nodedotjs&logoColor=white)
![Dependencies](https://img.shields.io/badge/dependencies-0-brightgreen?style=flat-square)
![Output](https://img.shields.io/badge/output-JSON%20%C2%B7%20PNG%20%C2%B7%20MP3%20%C2%B7%20WAV-blue?style=flat-square)
[![Stars](https://img.shields.io/github/stars/comcad/Voyage-Wz-Extractor?style=flat-square&logo=github)](https://github.com/comcad/Voyage-Wz-Extractor/stargazers)
[![Forks](https://img.shields.io/github/forks/comcad/Voyage-Wz-Extractor?style=flat-square&logo=github)](https://github.com/comcad/Voyage-Wz-Extractor/forks)
[![Last commit](https://img.shields.io/github/last-commit/comcad/Voyage-Wz-Extractor?style=flat-square)](https://github.com/comcad/Voyage-Wz-Extractor/commits/main)
![Repo size](https://img.shields.io/github/repo-size/comcad/Voyage-Wz-Extractor?style=flat-square)

[![Discord](https://img.shields.io/badge/Discord-Join%20the%20community-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://discord.gg/SCVxm6tB4g)


**Voyage WZ Extractor** is an open-source **MapleStory WZ extractor** for **v83 (GMS)**. It reads a folder of `*.wz` files and writes a plain file tree (JSON property trees, PNG images, and MP3/WAV sounds) that your game engine or **MapleStory web client** can load directly. It is a single Node.js file with no dependencies.

It is the asset pipeline for [**Voyage Client**](https://github.com/comcad/Voyage-Client), an open-source MapleStory web client that runs in the browser.

## 📦 Output Format

The extractor takes a folder of `*.wz` files and produces a plain file tree:

```text
assets/
|-- Character/
|   |-- 00002000.img.json            # full property tree
|   `-- 00002000.img/
|       |-- stand1/0/body.png        # canvas -> PNG
|       `-- stand1/0/arm.png
|-- Mob/9001000.img/...
|-- Sound/Bgm00.img/FloralLife.mp3   # sound -> MP3/WAV
`-- ...
```

## ✨ Features

- **Zero dependencies**: Node.js ≥ 18 only (`node:fs`, `node:zlib`, `node:buffer`)
- **Auto version detection**: brute-forces the WZ version hash (v83 confirmed: hash `0x754`, enc byte 172), so no config is needed
- **Encrypted string decryption** (GMS key, `key_gms.bin` included)
- **Encrypted canvas blocks** (List.wz-style `[len][xor-key]` blocks) handled
- **All pixel formats** supported (see [the table below](#-supported-pixel-formats))
- **Property tree → JSON** with these node shapes:
  - canvas → `{"_canvas": "<rel path>", "_w": n, "_h": n, ...props}`
  - vector → `[x, y]`, convex → `[[x,y], ...]`
  - UOL → `{"_uol": "../rel/path"}`
  - sound → `{"_sound": "<rel path>", "_ms": n}`
- **Sounds** exported as MP3 (passthrough) or proper WAV (RIFF header built from the WEX block)
- **Resume / partial extraction** (`--resume`, `--only=sub/path`, `--json-only`, WZ name filter)

## 🎨 Supported Pixel Formats

| Format ID | Pixel format | Notes |
|:---:|---|---|
| `1` | BGRA4444 | 2 bpp |
| `2` | BGRA8888 | 4 bpp |
| `513` | RGB565 | 2 bpp |
| `517` | RGB565 | one value per 16×16 block |
| `1026` | DXT3 | block-compressed |
| `2050` | DXT5 | block-compressed |

## 🚀 Usage

> 📝 **Note:** Requires **Node.js ≥ 18**. Nothing to install: just clone and run.

```sh
git clone https://github.com/comcad/Voyage-Wz-Extractor
cd Voyage-Wz-Extractor
```

**Extract every `.wz` in `./wz` into `./assets`:**

```sh
node wz-extract.mjs ./wz ./assets
```

<details>
<summary><b>More examples: filters, single IMG, JSON-only, resume</b></summary>

<br />

**Only specific WZ files:**

```sh
node wz-extract.mjs ./wz ./assets Character Mob Map
```

**One IMG (fast):**

```sh
node wz-extract.mjs ./wz ./assets --only=Character/00002000
```

**JSON only (skip PNG/WAV output):**

```sh
node wz-extract.mjs ./wz ./assets --json-only
```

**Re-run after a failure (skip already-extracted IMGs):**

```sh
node wz-extract.mjs ./wz ./assets --resume
```

</details>

### Command-line options

| Option | What it does |
|---|---|
| `<wz-folder> <out-folder>` | Input folder of `.wz` files and output folder for the extracted tree |
| `Character Mob Map ...` | Optional WZ name filter: only extract the listed WZ files |
| `--only=sub/path` | Extract a single IMG or subtree, e.g. `--only=Character/00002000` |
| `--json-only` | Write JSON only; skip PNG and WAV/MP3 output |
| `--resume` | Skip IMGs that were already extracted |

> 💡 **Tip:** The GMS key ships in `key_gms.bin`. If you need **KMS/BMS**, drop the key bytes there (65536 bytes).

## 🎮 Use it with Voyage Client

This extractor produces the `assets/` folder that **[Voyage Client](https://github.com/comcad/Voyage-Client)**, the MapleStory v83 web client, loads at runtime:

1. Extract your WZ files: `node wz-extract.mjs <path-to-wz-folder> ./assets`
2. Copy the `assets/` folder into the root of the Voyage Client repo.
3. Start the client and play in your browser.

> 📝 **Note:** Use the `.wz` files provided by [Cosmic](https://github.com/P0nk/Cosmic) for full compatibility.

## 📁 Project Layout

| File | Purpose |
|---|---|
| `wz-extract.mjs` | The extractor (single file, ~440 lines) |
| `key_gms.bin` | GMS decryption key |

## ✅ Verified

Built and verified against the official **v83 GMS** client: **14 WZ files, ~2.9 GB → 22,182 JSON + 555,617 PNG**.

## ❓ FAQ

<details>
<summary><b>What is a MapleStory WZ extractor?</b></summary>

<br />

MapleStory stores its game data (images, sounds, maps, monsters, items) in packed `.wz` archives. A WZ extractor unpacks those archives into regular files. Voyage WZ Extractor turns them into JSON, PNG, MP3, and WAV.

</details>

<details>
<summary><b>Which MapleStory versions are supported?</b></summary>

<br />

**v83 (GMS)** is confirmed and verified. The WZ version hash is detected automatically. For KMS or BMS, replace the 65536-byte key in `key_gms.bin`.

</details>

<details>
<summary><b>Do I need to install any dependencies?</b></summary>

<br />

No. It uses only built-in Node.js modules (`node:fs`, `node:zlib`, `node:buffer`) and needs Node.js 18 or newer.

</details>

<details>
<summary><b>Can I extract just one character, mob, or map?</b></summary>

<br />

Yes. Pass a WZ name filter (e.g. `Character Mob Map`) or use `--only=Character/00002000` to extract a single IMG.

</details>

<details>
<summary><b>What do I do if extraction fails partway through?</b></summary>

<br />

Re-run the same command with `--resume`. Already-extracted IMGs are skipped.

</details>

<details>
<summary><b>What can I use the extracted files for?</b></summary>

<br />

Any engine or tool that can read JSON and PNG. It is built for the [Voyage Client](https://github.com/comcad/Voyage-Client) MapleStory web client, which loads the extracted assets directly in the browser.

</details>

## 💬 Community

Questions, feedback, or want to help test? Come hang out on Discord.

[![Discord](https://img.shields.io/badge/Discord-discord.gg%2FSCVxm6tB4g-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://discord.gg/SCVxm6tB4g)

## 📄 License

MIT licensed.

<div align="right">

[⬆ Back to top](#voyage-wz-extractor-maplestory-wz-file-extractor)

</div>
