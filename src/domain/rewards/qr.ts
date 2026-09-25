/** Compact QR for referral URLs. Version 3, byte mode, error level L. */

const QR_SIZE = 29;

function bit(value: number, index: number): number {
  return (value >> index) & 1;
}

function gfMul(a: number, b: number): number {
  let result = 0;
  let x = a;
  let y = b;
  while (y > 0) {
    if (y & 1) {
      result ^= x;
    }
    y >>= 1;
    x <<= 1;
    if (x & 0x100) {
      x ^= 0x11d;
    }
  }
  return result;
}

function reedSolomon(data: number[], ecCount: number): number[] {
  const gen = [1];
  let next = 1;
  for (let i = 0; i < ecCount; i += 1) {
    const copy = [0, ...gen];
    for (let j = 0; j < gen.length; j += 1) {
      copy[j] ^= gfMul(gen[j], next);
    }
    gen.length = 0;
    gen.push(...copy);
    next = gfMul(next, 2);
  }
  const ecc = new Array<number>(ecCount).fill(0);
  for (const byte of data) {
    const factor = byte ^ (ecc[0] ?? 0);
    ecc.shift();
    ecc.push(0);
    for (let i = 0; i < ecCount; i += 1) {
      ecc[i] ^= gfMul(gen[i + 1] ?? 0, factor);
    }
  }
  return ecc;
}

function placeFinder(modules: boolean[][], row: number, col: number): void {
  for (let r = -1; r <= 7; r += 1) {
    for (let c = -1; c <= 7; c += 1) {
      const rr = row + r;
      const cc = col + c;
      if (rr < 0 || cc < 0 || rr >= QR_SIZE || cc >= QR_SIZE) {
        continue;
      }
      const on =
        r === -1 ||
        r === 7 ||
        c === -1 ||
        c === 7 ||
        (r >= 0 && r <= 6 && c >= 0 && c <= 6 && (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4)));
      modules[rr][cc] = on;
    }
  }
}

export function referralQrMatrix(url: string): boolean[][] {
  const modules = Array.from({ length: QR_SIZE }, () => Array<boolean>(QR_SIZE).fill(false));
  placeFinder(modules, 0, 0);
  placeFinder(modules, 0, QR_SIZE - 7);
  placeFinder(modules, QR_SIZE - 7, 0);
  for (let i = 8; i < QR_SIZE - 8; i += 1) {
    modules[6][i] = i % 2 === 0;
    modules[i][6] = i % 2 === 0;
  }
  const bytes = Array.from(new TextEncoder().encode(url.slice(0, 53)));
  const data: number[] = [0x40, bytes.length, ...bytes];
  while (data.length < 55) {
    data.push(data.length % 2 === 0 ? 0xec : 0x11);
  }
  const ecc = reedSolomon(data.slice(0, 55), 15);
  const bits: number[] = [];
  for (const value of [...data.slice(0, 55), ...ecc]) {
    for (let i = 7; i >= 0; i -= 1) {
      bits.push(bit(value, i));
    }
  }
  let bitIndex = 0;
  let upward = true;
  for (let col = QR_SIZE - 1; col > 0; col -= 2) {
    if (col === 6) {
      col -= 1;
    }
    for (let offset = 0; offset < QR_SIZE; offset += 1) {
      const row = upward ? QR_SIZE - 1 - offset : offset;
      for (const c of [col, col - 1]) {
        if (row < 8 && c < 8) {
          continue;
        }
        if (row < 8 && c >= QR_SIZE - 8) {
          continue;
        }
        if (row >= QR_SIZE - 8 && c < 8) {
          continue;
        }
        if (row === 6 || c === 6) {
          continue;
        }
        modules[row][c] = bits[bitIndex] === 1;
        bitIndex += 1;
      }
    }
    upward = !upward;
  }
  return modules;
}

export function referralQrSvg(url: string): string {
  const matrix = referralQrMatrix(url);
  const cells = matrix
    .flatMap((row, y) =>
      row.map((on, x) =>
        on ? `<rect x="${x}" y="${y}" width="1" height="1" />` : "",
      ),
    )
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${QR_SIZE} ${QR_SIZE}" width="192" height="192" role="img" aria-label="Referral QR code">${cells}</svg>`;
}
