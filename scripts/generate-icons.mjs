import { writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

function crc32(buffer) {
  let c = 0xffffffff
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([length, body, crc])
}

function encodePng(size, shade) {
  const raw = Buffer.alloc(size * (size * 4 + 1))
  const SS = 4
  for (let y = 0; y < size; y++) {
    const row = y * (size * 4 + 1)
    for (let x = 0; x < size; x++) {
      let sum = 0
      for (let sy = 0; sy < SS; sy++)
        for (let sx = 0; sx < SS; sx++) sum += shade((x + (sx + 0.5) / SS) / size, (y + (sy + 0.5) / SS) / size)
      const v = Math.round((sum / (SS * SS)) * 255)
      raw.set([v, v, v, 255], row + 1 + x * 4)
    }
  }
  const header = Buffer.alloc(13)
  header.writeUInt32BE(size, 0)
  header.writeUInt32BE(size, 4)
  header.set([8, 6, 0, 0, 0], 8)
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function artwork(inset) {
  return (u, v) => {
    const x = (u - inset) / (1 - 2 * inset)
    const y = (v - inset) / (1 - 2 * inset)
    const wave = 0.52 + 0.1 * Math.sin(x * Math.PI * 2)
    return y > wave ? 1 : 0
  }
}

const outputs = [
  ['public/pwa-192.png', 192, 0],
  ['public/pwa-512.png', 512, 0],
  ['public/maskable-512.png', 512, 0.1],
  ['public/apple-touch-icon.png', 180, 0],
]

for (const [file, size, inset] of outputs) {
  writeFileSync(file, encodePng(size, artwork(inset)))
  console.log(`${file} (${size}×${size})`)
}
