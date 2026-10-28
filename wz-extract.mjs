#!/usr/bin/env node
/**
 * WZ (PKG1) extractor for MapleStory v83, pure Node.js (no dependencies).
 *
 * Output keeps the WZ directory tree, one JSON per .img plus one PNG per canvas:
 *   assets/Character/00002000.img.json
 *   assets/Character/00002000.img/stand1/0/body.png
 *   assets/Map/Map/Map1/100000000.img.json
 *   assets/Sound/Bgm00.img/FloralLife.mp3
 *
 * JSON node shapes:
 *   canvas  -> { "_canvas": "<png path relative to assets/>", "_w", "_h", ...child props }
 *   vector  -> [x, y]
 *   uol     -> { "_uol": "../relative/path" }
 *   sound   -> { "_sound": "<file path relative to assets/>" }
 *   convex  -> [[x,y], ...]
 *
 * Usage: node tools/wz-extract.mjs <wzDir> <outDir> [Character Map ...] [--json-only] [--only=sub/path]
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------- key
function loadKey() {
  const candidates = [
    path.join(__dirname, 'key_gms.bin'),
    path.join(__dirname, '../../NoLifeWzToNx/Keys.cpp'),
  ];
  for (const p of candidates) {
    if (!fs.existsSync(p)) continue;
    if (p.endsWith('.bin')) return fs.readFileSync(p);
    const src = fs.readFileSync(p, 'utf8');
    const i = src.indexOf('key_gms[');
    const body = src.slice(src.indexOf('{', i) + 1, src.indexOf('}', i));
    const bytes = Buffer.from(body.match(/0x[0-9a-fA-F]{1,2}/g).map((h) => parseInt(h, 16)));
    fs.writeFileSync(path.join(__dirname, 'key_gms.bin'), bytes); // cache for next run
    return bytes;
  }
  throw new Error('key_gms not found (expected tools/key_gms.bin or NoLifeWzToNx/Keys.cpp)');
}
const KEY = loadKey();

// ---------------------------------------------------------------- PNG / pixel decode
const CRC_TABLE = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});
function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function encodePNG(w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 6 })), chunk('IEND', Buffer.alloc(0)),
  ]);
}

const c5 = (v) => (v << 3) | (v >> 2);
const c6 = (v) => (v << 2) | (v >> 4);

function rgb565(v, out, o) {
  out[o] = c5((v >> 11) & 31); out[o + 1] = c6((v >> 5) & 63); out[o + 2] = c5(v & 31); out[o + 3] = 255;
}

function decodeDXT(w, h, src, dxt5) {
  const out = Buffer.alloc(w * h * 4);
  const col = new Uint8Array(16), alpha = new Uint8Array(16);
  let p = 0;
  for (let by = 0; by < h; by += 4) {
    for (let bx = 0; bx < w; bx += 4) {
      if (dxt5) {
        const a0 = src[p], a1 = src[p + 1];
        const tbl = [a0, a1];
        if (a0 > a1) for (let i = 1; i < 7; i++) tbl.push(((7 - i) * a0 + i * a1) / 7 | 0);
        else { for (let i = 1; i < 5; i++) tbl.push(((5 - i) * a0 + i * a1) / 5 | 0); tbl.push(0, 255); }
        let bits = 0n;
        for (let i = 0; i < 6; i++) bits |= BigInt(src[p + 2 + i]) << BigInt(8 * i);
        for (let i = 0; i < 16; i++) alpha[i] = tbl[Number((bits >> BigInt(3 * i)) & 7n)];
      } else {
        for (let i = 0; i < 8; i++) {
          alpha[i * 2] = (src[p + i] & 0xf) * 17; alpha[i * 2 + 1] = (src[p + i] >> 4) * 17;
        }
      }
      p += 8;
      const v0 = src[p] | (src[p + 1] << 8), v1 = src[p + 2] | (src[p + 3] << 8);
      const pal = Buffer.alloc(16);
      rgb565(v0, pal, 0); rgb565(v1, pal, 4);
      for (let c = 0; c < 3; c++) {
        pal[8 + c] = (2 * pal[c] + pal[4 + c]) / 3 | 0;
        pal[12 + c] = (pal[c] + 2 * pal[4 + c]) / 3 | 0;
      }
      const idx = src[p + 4] | (src[p + 5] << 8) | (src[p + 6] << 16) | (src[p + 7] << 24);
      p += 8;
      for (let i = 0; i < 16; i++) col[i] = (idx >>> (2 * i)) & 3;
      for (let py = 0; py < 4; py++) for (let px = 0; px < 4; px++) {
        const x = bx + px, y = by + py;
        if (x >= w || y >= h) continue;
        const o = (y * w + x) * 4, i = py * 4 + px, c = col[i] * 4;
        out[o] = pal[c]; out[o + 1] = pal[c + 1]; out[o + 2] = pal[c + 2]; out[o + 3] = alpha[i];
      }
    }
  }
  return out;
}

/** Returns RGBA buffer or null. format = fmt + fmt2 as stored in WZ. */
function decodePixels(w, h, fmt, px) {
  const n = w * h;
  const out = Buffer.alloc(n * 4);
  switch (fmt) {
    case 1: // BGRA4444
      for (let i = 0; i < n; i++) {
        const lo = px[i * 2], hi = px[i * 2 + 1];
        out[i * 4] = (hi & 15) * 17; out[i * 4 + 1] = (lo >> 4) * 17; out[i * 4 + 2] = (lo & 15) * 17; out[i * 4 + 3] = (hi >> 4) * 17;
      }
      return out;
    case 2: // BGRA8888
      for (let i = 0; i < n; i++) {
        out[i * 4] = px[i * 4 + 2]; out[i * 4 + 1] = px[i * 4 + 1]; out[i * 4 + 2] = px[i * 4]; out[i * 4 + 3] = px[i * 4 + 3];
      }
      return out;
    case 3: // DXT3 grayscale (rare)
    case 1026: return decodeDXT(w, h, px, false);
    case 2050: return decodeDXT(w, h, px, true);
    case 513: // RGB565
      for (let i = 0; i < n; i++) rgb565(px[i * 2] | (px[i * 2 + 1] << 8), out, i * 4);
      return out;
    case 517: { // RGB565, one value per 16x16 block
      const bw = Math.ceil(w / 16);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const b = ((y >> 4) * bw + (x >> 4)) * 2;
        rgb565(px[b] | (px[b + 1] << 8), out, (y * w + x) * 4);
      }
      return out;
    }
    default: return null;
  }
}
const BPP = { 1: 2, 2: 4, 3: 1, 513: 2, 517: 2 / 256, 1026: 1, 2050: 1 };

// ---------------------------------------------------------------- WZ reader
class Reader {
  constructor(buf, start) { this.b = buf; this.pos = 0; this.start = start; }
  u8() { return this.b[this.pos++]; }
  i8() { return this.b.readInt8(this.pos++); }
  u16() { const v = this.b.readUInt16LE(this.pos); this.pos += 2; return v; }
  i16() { const v = this.b.readInt16LE(this.pos); this.pos += 2; return v; }
  u32() { const v = this.b.readUInt32LE(this.pos); this.pos += 4; return v; }
  i32() { const v = this.b.readInt32LE(this.pos); this.pos += 4; return v; }
  f32() { const v = this.b.readFloatLE(this.pos); this.pos += 4; return v; }
  f64() { const v = this.b.readDoubleLE(this.pos); this.pos += 8; return v; }
  cint() { const v = this.i8(); return v === -128 ? this.i32() : v; }
  clong() { const v = this.i8(); if (v !== -128) return v; const r = Number(this.b.readBigInt64LE(this.pos)); this.pos += 8; return r; }

  str() {
    const s = this.i8();
    if (s === 0) return '';
    if (s > 0) { // UTF-16
      const len = s === 127 ? this.i32() : s;
      let mask = 0xaaaa, out = '';
      for (let i = 0; i < len; i++) {
        let c = this.u16() ^ mask ^ (KEY[i * 2] | (KEY[i * 2 + 1] << 8));
        mask = (mask + 1) & 0xffff;
        out += String.fromCharCode(c);
      }
      return out;
    }
    const len = s === -128 ? this.i32() : -s;
    let mask = 0xaa, out = '';
    for (let i = 0; i < len; i++) {
      out += String.fromCharCode(this.u8() ^ mask ^ KEY[i]);
      mask = (mask + 1) & 0xff;
    }
    return out;
  }
  strAt(off) { const save = this.pos; this.pos = off; const s = this.str(); this.pos = save; return s; }
  /** String block inside an .img: inline (0x00/0x73) or offset ref (0x01/0x1B) relative to img start. */
  strBlock(imgOff) {
    const t = this.u8();
    if (t === 0x00 || t === 0x73) return this.str();
    if (t === 0x01 || t === 0x1b) return this.strAt(imgOff + this.i32());
    throw new Error(`bad string block 0x${t.toString(16)} @${this.pos - 1}`);
  }
}

function versionHash(v) {
  let h = 0;
  for (const c of String(v)) h = (Math.imul(h, 32) + c.charCodeAt(0) + 1) >>> 0;
  const enc = (0xff ^ (h >>> 24) ^ ((h >>> 16) & 0xff) ^ ((h >>> 8) & 0xff) ^ (h & 0xff)) & 0xff;
  return { h, enc };
}

class WzFile {
  constructor(file) {
    this.buf = fs.readFileSync(file);
    if (this.buf.toString('ascii', 0, 4) !== 'PKG1') throw new Error('not PKG1');
    this.start = this.buf.readUInt32LE(12);
    this.r = new Reader(this.buf, this.start);
    this.enc = this.buf.readUInt16LE(this.start);
    this._detectVersion();
  }
  _offset(posOfField, stored) {
    let h = (~(posOfField - this.start)) >>> 0;
    h = Math.imul(h, this.hash) >>> 0;
    h = (h - 0x581c3f6d) >>> 0;
    const s = h & 0x1f;
    h = ((h << s) | (h >>> (32 - s))) >>> 0;
    return ((h ^ stored) >>> 0) + this.start * 2;
  }
  _detectVersion() {
    for (let v = 1; v < 1000; v++) {
      const { h, enc } = versionHash(v);
      if (enc !== this.enc) continue;
      this.hash = h;
      try {
        const entries = this.readDir(this.start + 2);
        if (entries.every((e) => e.offset > 0 && e.offset < this.buf.length) &&
            entries.filter((e) => e.type === 4).every((e) => this.buf[e.offset] === 0x73) &&
            entries.filter((e) => e.type === 3).every((e) => { try { this.readDir(e.offset); return true; } catch { return false; } })) {
          this.version = v; return;
        }
      } catch { /* try next */ }
    }
    throw new Error('could not detect WZ version');
  }
  readDir(off) {
    const r = this.r; r.pos = off;
    const count = r.cint();
    if (count < 0 || count > 100000) throw new Error('bad dir count');
    const out = [];
    for (let i = 0; i < count; i++) {
      let type = r.u8(), name;
      if (type === 1) { r.pos += 10; continue; }
      if (type === 2) {
        const ref = r.i32();
        const save = r.pos; r.pos = this.start + ref;
        type = r.u8(); name = r.str();
        r.pos = save;
      } else if (type === 3 || type === 4) name = r.str();
      else throw new Error(`bad dir entry type ${type}`);
      const size = r.cint(); r.cint(); // checksum
      const fieldPos = r.pos;
      const offset = this._offset(fieldPos, r.u32());
      out.push({ type, name, size, offset });
    }
    return out;
  }
}

// ---------------------------------------------------------------- img parsing
class ImgExtractor {
  constructor(wz, imgOff, outDir, relBase, opts) {
    this.wz = wz; this.r = new Reader(wz.buf, wz.start); this.imgOff = imgOff;
    this.outDir = outDir; this.relBase = relBase; this.opts = opts;
    this.stats = { png: 0, snd: 0, skip: 0 };
  }
  run() {
    const r = this.r; r.pos = this.imgOff;
    const type = r.strBlock(this.imgOff);
    if (type !== 'Property') throw new Error(`img root is ${type}`);
    r.pos += 2;
    return this.props('');
  }
  props(p) {
    const r = this.r, node = {};
    const count = r.cint();
    for (let i = 0; i < count; i++) {
      const name = r.strBlock(this.imgOff);
      const t = r.u8();
      const sub = p ? `${p}/${name}` : name;
      switch (t) {
        case 0: node[name] = null; break;
        case 2: case 11: node[name] = r.i16(); break;
        case 3: case 19: node[name] = r.cint(); break;
        case 20: node[name] = r.clong(); break;
        case 4: node[name] = r.u8() === 0x80 ? r.f32() : 0; break;
        case 5: node[name] = r.f64(); break;
        case 8: node[name] = r.strBlock(this.imgOff); break;
        case 9: {
          const len = r.u32(); const end = r.pos + len;
          node[name] = this.ext(sub);
          r.pos = end;
          break;
        }
        default: throw new Error(`unknown prop type ${t} at ${sub}`);
      }
    }
    return node;
  }
  ext(p) {
    const r = this.r;
    const type = r.strBlock(this.imgOff);
    switch (type) {
      case 'Property': r.pos += 2; return this.props(p);
      case 'Shape2D#Vector2D': return [r.cint(), r.cint()];
      case 'Shape2D#Convex2D': { const n = r.cint(); const a = []; for (let i = 0; i < n; i++) a.push(this.ext(`${p}/${i}`)); return a; }
      case 'UOL': r.pos += 1; return { _uol: r.strBlock(this.imgOff) };
      case 'Canvas': return this.canvas(p);
      case 'Sound_DX8': return this.sound(p);
      default: throw new Error(`unknown ext type ${type} at ${p}`);
    }
  }
  canvas(p) {
    const r = this.r;
    r.pos += 1;
    const node = r.u8() === 1 ? (r.pos += 2, this.props(p)) : {};
    const w = r.cint(), h = r.cint();
    const fmt = r.cint() + r.u8();
    r.pos += 4;
    const len = r.i32() - 1;
    r.pos += 1;
    const data = this.wz.buf.subarray(r.pos, r.pos + len);
    r.pos += len;
    const rel = `${this.relBase}/${p}.png`;
    node._w = w; node._h = h; node._canvas = rel;
    if (!this.opts.jsonOnly) {
      try {
        const px = inflateCanvas(data, Math.ceil(w * h * (BPP[fmt] ?? 4)));
        const rgba = px && decodePixels(w, h, fmt, px);
        if (rgba) {
          const file = path.join(this.outDir, rel);
          fs.mkdirSync(path.dirname(file), { recursive: true });
          fs.writeFileSync(file, encodePNG(w, h, rgba));
          this.stats.png++;
        } else { this.stats.skip++; node._fmt = fmt; }
      } catch (e) { this.stats.skip++; node._err = String(e.message || e); }
    }
    return node;
  }
  sound(p) {
    const r = this.r;
    r.pos += 1;
    const len = r.cint(); const ms = r.cint();
    r.pos += 51;
    const fmtLen = r.u8();
    const wfx = this.wz.buf.subarray(r.pos, r.pos + fmtLen);
    r.pos += fmtLen;
    const data = this.wz.buf.subarray(r.pos, r.pos + len);
    r.pos += len;
    const tag = fmtLen >= 2 ? wfx.readUInt16LE(0) : 0x55;
    let file, bytes;
    if (tag === 0x55 || fmtLen === 0) { file = `${this.relBase}/${p}.mp3`; bytes = data; }
    else {
      file = `${this.relBase}/${p}.wav`;
      const hdr = Buffer.alloc(12 + 8 + 16 + 8);
      hdr.write('RIFF', 0); hdr.writeUInt32LE(36 + len, 4); hdr.write('WAVE', 8);
      hdr.write('fmt ', 12); hdr.writeUInt32LE(16, 16); wfx.copy(hdr, 20, 0, 16);
      hdr.write('data', 36); hdr.writeUInt32LE(len, 40);
      bytes = Buffer.concat([hdr, data]);
    }
    if (!this.opts.jsonOnly) {
      const out = path.join(this.outDir, file);
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.writeFileSync(out, bytes);
      this.stats.snd++;
    }
    return { _sound: file, _ms: ms };
  }
}

function inflateCanvas(data, expected) {
  const hdr = data.readUInt16BE(0);
  let z = data;
  if (!(hdr === 0x789c || hdr === 0x78da || hdr === 0x7801 || hdr === 0x785e)) {
    // listWz-style encrypted blocks: [i32 len][len bytes xor KEY]...
    const parts = []; let p = 0;
    while (p + 4 <= data.length) {
      const n = data.readInt32LE(p); p += 4;
      if (n <= 0 || p + n > data.length) break;
      const blk = Buffer.from(data.subarray(p, p + n));
      for (let i = 0; i < n; i++) blk[i] ^= KEY[i];
      parts.push(blk); p += n;
    }
    z = Buffer.concat(parts);
  }
  const px = zlib.inflateSync(z, { finishFlush: zlib.constants.Z_SYNC_FLUSH });
  return px.length >= expected ? px : null;
}

// ---------------------------------------------------------------- main
function walk(wz, dirOff, rel, outRoot, opts, totals) {
  for (const e of wz.readDir(dirOff)) {
    const childRel = rel ? `${rel}/${e.name}` : e.name;
    if (e.type === 3) { walk(wz, e.offset, childRel, outRoot, opts, totals); continue; }
    if (opts.only && !childRel.startsWith(opts.only)) continue;
    const jsonFile = path.join(outRoot, `${childRel}.json`);
    if (opts.resume && fs.existsSync(jsonFile)) continue;
    try {
      const ex = new ImgExtractor(wz, e.offset, outRoot, childRel, opts);
      const tree = ex.run();
      fs.mkdirSync(path.dirname(jsonFile), { recursive: true });
      fs.writeFileSync(jsonFile, JSON.stringify(tree));
      totals.img++; totals.png += ex.stats.png; totals.snd += ex.stats.snd; totals.skip += ex.stats.skip;
    } catch (err) {
      totals.err++;
      console.error(`  ERR ${childRel}: ${err.message}`);
    }
    if (totals.img % 500 === 0) process.stdout.write(`  ...${totals.img} imgs, ${totals.png} png\n`);
  }
}

const args = process.argv.slice(2);
const flags = Object.fromEntries(args.filter((a) => a.startsWith('--')).map((a) => { const [k, v] = a.slice(2).split('='); return [k, v ?? true]; }));
const pos = args.filter((a) => !a.startsWith('--'));
const wzDir = pos[0] || path.join(__dirname, '..');
const outDir = pos[1] || path.join(__dirname, '../assets');
const pick = pos.slice(2);
const opts = { jsonOnly: !!flags['json-only'], only: flags.only, resume: !!flags.resume };

const files = fs.readdirSync(wzDir).filter((f) => f.endsWith('.wz') && f !== 'List.wz')
  .filter((f) => !pick.length || pick.includes(f.slice(0, -3)));
for (const f of files) {
  const t0 = Date.now();
  const name = f.slice(0, -3);
  try {
    const wz = new WzFile(path.join(wzDir, f));
    console.log(`=== ${f} (v${wz.version}) ===`);
    const totals = { img: 0, png: 0, snd: 0, skip: 0, err: 0 };
    walk(wz, wz.start + 2, '', path.join(outDir, name), opts, totals);
    console.log(`  done ${JSON.stringify(totals)} in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  } catch (e) {
    console.error(`=== ${f}: ${e.message}`);
  }
}
