// Gera os PNGs do icone sem nenhuma dependencia externa.
// Desenho: fundo quase preto + tres barras ascendentes em verde-limao.
import zlib from 'node:zlib'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public')

const BG = [0x0b, 0x0b, 0x0c]
const ACCENT = [0xa3, 0xe6, 0x35]
const DIM = [0x3f, 0x53, 0x1c]

let crcTable = null
function crc32(buf) {
  if (!crcTable) {
    crcTable = new Int32Array(256)
    for (let n = 0; n < 256; n++) {
      let c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      crcTable[n] = c
    }
  }
  let c = -1
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ -1) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function encodePng(width, height, rgb) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 2 // color type: truecolor
  const raw = Buffer.alloc((width * 3 + 1) * height)
  let p = 0
  for (let y = 0; y < height; y++) {
    raw[p++] = 0 // filter: none
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 3
      raw[p++] = rgb[i]
      raw[p++] = rgb[i + 1]
      raw[p++] = rgb[i + 2]
    }
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// inset = fracao da borda reservada (maskable precisa de mais folga)
function draw(size, inset) {
  const rgb = Buffer.alloc(size * size * 3)
  const put = (x, y, c) => {
    const i = (y * size + x) * 3
    rgb[i] = c[0]
    rgb[i + 1] = c[1]
    rgb[i + 2] = c[2]
  }
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) put(x, y, BG)

  const pad = Math.round(size * inset)
  const inner = size - pad * 2
  const gap = Math.round(inner * 0.09)
  const barW = Math.round((inner - gap * 2) / 3)
  const heights = [0.42, 0.68, 1.0]
  const baseY = pad + inner

  for (let b = 0; b < 3; b++) {
    const x0 = pad + b * (barW + gap)
    const h = Math.round(inner * heights[b])
    const y0 = baseY - h
    const color = b === 2 ? ACCENT : b === 1 ? ACCENT : DIM
    const r = Math.round(barW * 0.22)
    for (let y = y0; y < baseY; y++) {
      for (let x = x0; x < x0 + barW; x++) {
        // cantos superiores arredondados
        const dx = x < x0 + r ? x0 + r - x : x > x0 + barW - 1 - r ? x - (x0 + barW - 1 - r) : 0
        const dy = y < y0 + r ? y0 + r - y : 0
        if (dx * dx + dy * dy > r * r) continue
        put(x, y, color)
      }
    }
  }
  return rgb
}

fs.mkdirSync(OUT, { recursive: true })
const files = [
  ['icon-180.png', 180, 0.2],
  ['icon-192.png', 192, 0.2],
  ['icon-512.png', 512, 0.2],
  ['icon-maskable-512.png', 512, 0.27],
]
for (const [name, size, inset] of files) {
  fs.writeFileSync(path.join(OUT, name), encodePng(size, size, draw(size, inset)))
}
console.log('icones gerados em public/')
