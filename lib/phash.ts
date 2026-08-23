import sharp from "sharp";

/**
 * dHash: shrink to 9x8 grayscale, compare each pixel to its right neighbour ->
 * 64 bits. Robust to resizing and recompression (which is exactly what Facebook
 * does to uploads), so a Facebook copy hashes within a few bits of the original.
 */
export async function dHash(input: string | Buffer): Promise<string> {
  const { data } = await sharp(input, { failOn: "none" })
    .rotate()
    .grayscale()
    .resize(9, 8, { fit: "fill" })
    .raw()
    .toBuffer({ resolveWithObject: true });
  let bits = "";
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      bits += data[y * 9 + x] < data[y * 9 + x + 1] ? "1" : "0";
    }
  }
  return BigInt("0b" + bits).toString(16).padStart(16, "0");
}

/** Number of differing bits between two 16-hex-char hashes (0 = identical). */
export function hammingDistance(a: string, b: string): number {
  let n = 0;
  for (let i = 0; i < 16; i++) {
    let x = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    while (x) {
      n += x & 1;
      x >>= 1;
    }
  }
  return n;
}
