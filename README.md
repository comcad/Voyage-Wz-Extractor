<div align="center">

<img src="https://github.com/user-attachments/assets/f3327f7f-5a19-403d-b881-d540287cdf14" width="120" height="120" alt="Voyage MapleStory WZ extractor logo" />

# Voyage WZ Extractor: Voyage-Client WZ File Extractor

**A pure Node.js Voyage-Client v83 WZ extractor.** Turns `.wz` files into JSON, PNG, MP3, and WAV.

<br />

![License](https://img.shields.io/github/license/comcad/Voyage-Wz-Extractor?style=for-the-badge)
![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A5%2018-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)

[![Stars](https://img.shields.io/github/stars/comcad/Voyage-Wz-Extractor?style=flat-square&logo=github)](https://github.com/comcad/Voyage-Wz-Extractor/stargazers)
![Dependencies](https://img.shields.io/badge/dependencies-0-brightgreen?style=flat-square)
[![Discord](https://img.shields.io/badge/Discord-Join-5865F2?style=flat-square&logo=discord&logoColor=white)](https://discord.gg/SCVxm6tB4g)

</div>

<br />

An open-source **Voyage-Client WZ extractor** for **v83**. It reads a folder of `*.wz` files and writes plain JSON, PNG, and MP3/WAV files that your engine or **MapleStory web client** can load directly. One Node.js file, no dependencies. It is the asset extractor for [**Voyage Client**](https://github.com/comcad/Voyage-Client).

## 🚀 Usage

Requires **Node.js ≥ 18**. Nothing to install.

```sh
git clone https://github.com/comcad/Voyage-Wz-Extractor
cd Voyage-Wz-Extractor
node wz-extract.mjs <path-to-wz-folder> ./assets
```

Then copy the `assets` folder into the root of [Voyage Client](https://github.com/comcad/Voyage-Client).

> 📝 **Note:** Use the `.wz` files provided by [Cosmic](https://github.com/P0nk/Cosmic) for full compatibility.

<details>
<summary><b>Extra options</b></summary>

<br />

```sh
# Only specific WZ files
node wz-extract.mjs ./wz ./assets Character Mob Map

# One IMG (fast)
node wz-extract.mjs ./wz ./assets --only=Character/00002000

# JSON only (skip PNG/WAV output)
node wz-extract.mjs ./wz ./assets --json-only

# Re-run after a failure: skip already-extracted IMGs
node wz-extract.mjs ./wz ./assets --resume
```

</details>

## 💬 Community

[![Discord](https://img.shields.io/badge/Discord-discord.gg%2FSCVxm6tB4g-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://discord.gg/SCVxm6tB4g)

## 📄 License

MIT


## ⚠️ Disclaimer

### No Game Assets Included
This repository contains **no** copyrighted Nexon assets. That includes `.wz` files, extracted images, audio, maps, and any other game data. It contains only original source code written by the contributors.

To use this software, you must supply your own legally obtained copy of the game files. You are solely responsible for ensuring you have the legal right to possess and use them. The contributors do not provide, host, link to, or distribute these files and will not assist in obtaining them.

### Intended Use
This software is provided for educational, research, and interoperability purposes, and for use with self-hosted servers on a private, non-commercial basis. It is not intended to circumvent any technological protection measure, to replace or compete with any official Nexon product or service, or to be used for commercial gain.

The contributors do not sell this software, charge for access, or accept payment for in-game items or advantages. Anyone who does so with this software acts on their own account and at their own risk.

### License Scope
The MIT license in this repository applies **only** to the original source code written by the contributors. It grants no rights to any Nexon trademarks, assets, or other intellectual property.

### No Warranty
THIS SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR CONTRIBUTORS BE LIABLE FOR ANY CLAIM, DAMAGES, OR OTHER LIABILITY ARISING FROM THE USE OF THIS SOFTWARE.

### Your Responsibility
You are responsible for complying with all applicable laws and with any license or terms of service that apply to the game files and servers you use.

