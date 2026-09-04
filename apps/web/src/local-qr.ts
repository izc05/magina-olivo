const VERSION = 4;
const SIZE = VERSION * 4 + 17;
const DATA_CODEWORDS = 64;
const BLOCK_COUNT = 2;
const DATA_CODEWORDS_PER_BLOCK = 32;
const ECC_CODEWORDS_PER_BLOCK = 18;
const MAX_BYTE_LENGTH = 62;

export type QrMatrix = ReadonlyArray<ReadonlyArray<boolean>>;

function appendBits(target: boolean[], value: number, length: number): void {
  for (let bit = length - 1; bit >= 0; bit -= 1) {
    target.push(((value >>> bit) & 1) !== 0);
  }
}

function reedSolomonMultiply(x: number, y: number): number {
  let z = 0;
  for (let bit = 7; bit >= 0; bit -= 1) {
    z = ((z << 1) ^ ((z >>> 7) * 0x11d)) & 0xff;
    z ^= ((y >>> bit) & 1) * x;
  }
  return z;
}

function reedSolomonDivisor(degree: number): Uint8Array {
  const result = new Uint8Array(degree);
  result[degree - 1] = 1;
  let root = 1;

  for (let i = 0; i < degree; i += 1) {
    for (let j = 0; j < degree; j += 1) {
      result[j] = reedSolomonMultiply(result[j]!, root);
      if (j + 1 < degree) result[j] ^= result[j + 1]!;
    }
    root = reedSolomonMultiply(root, 0x02);
  }

  return result;
}

function reedSolomonRemainder(data: Uint8Array, divisor: Uint8Array): Uint8Array {
  const result = new Uint8Array(divisor.length);

  for (const byte of data) {
    const factor = byte ^ result[0]!;
    result.copyWithin(0, 1);
    result[result.length - 1] = 0;

    for (let j = 0; j < divisor.length; j += 1) {
      result[j] ^= reedSolomonMultiply(divisor[j]!, factor);
    }
  }

  return result;
}

function encodeDataCodewords(text: string): Uint8Array {
  const bytes = new TextEncoder().encode(text);
  if (bytes.length === 0 || bytes.length > MAX_BYTE_LENGTH) {
    throw new Error(`REWARD_QR_PAYLOAD_LENGTH:${bytes.length}`);
  }

  const bits: boolean[] = [];
  appendBits(bits, 0b0100, 4); // Byte mode.
  appendBits(bits, bytes.length, 8); // Version 1–9 byte count field.
  for (const byte of bytes) appendBits(bits, byte, 8);

  const capacityBits = DATA_CODEWORDS * 8;
  const terminatorLength = Math.min(4, capacityBits - bits.length);
  for (let i = 0; i < terminatorLength; i += 1) bits.push(false);
  while (bits.length % 8 !== 0) bits.push(false);

  const data = new Uint8Array(DATA_CODEWORDS);
  let dataLength = 0;
  for (let offset = 0; offset < bits.length; offset += 8) {
    let value = 0;
    for (let bit = 0; bit < 8; bit += 1) {
      value = (value << 1) | (bits[offset + bit] ? 1 : 0);
    }
    data[dataLength] = value;
    dataLength += 1;
  }

  let padIndex = 0;
  while (dataLength < DATA_CODEWORDS) {
    data[dataLength] = padIndex % 2 === 0 ? 0xec : 0x11;
    dataLength += 1;
    padIndex += 1;
  }

  return data;
}

function encodeCodewords(text: string): Uint8Array {
  const data = encodeDataCodewords(text);
  const divisor = reedSolomonDivisor(ECC_CODEWORDS_PER_BLOCK);
  const dataBlocks = Array.from({ length: BLOCK_COUNT }, (_, blockIndex) =>
    data.slice(
      blockIndex * DATA_CODEWORDS_PER_BLOCK,
      (blockIndex + 1) * DATA_CODEWORDS_PER_BLOCK,
    ),
  );
  const eccBlocks = dataBlocks.map((block) => reedSolomonRemainder(block, divisor));
  const result = new Uint8Array(
    DATA_CODEWORDS + BLOCK_COUNT * ECC_CODEWORDS_PER_BLOCK,
  );

  let cursor = 0;
  for (let index = 0; index < DATA_CODEWORDS_PER_BLOCK; index += 1) {
    for (const block of dataBlocks) {
      result[cursor] = block[index]!;
      cursor += 1;
    }
  }
  for (let index = 0; index < ECC_CODEWORDS_PER_BLOCK; index += 1) {
    for (const block of eccBlocks) {
      result[cursor] = block[index]!;
      cursor += 1;
    }
  }

  return result;
}

function formatBits(mask: number): number {
  // Error correction level M has format bits 00.
  const data = mask;
  let remainder = data;
  for (let i = 0; i < 10; i += 1) {
    remainder = (remainder << 1) ^ (((remainder >>> 9) & 1) * 0x537);
  }
  return ((data << 10) | remainder) ^ 0x5412;
}

export function encodeRewardQr(text: string): QrMatrix {
  const modules = Array.from({ length: SIZE }, () => Array<boolean>(SIZE).fill(false));
  const functionModules = Array.from({ length: SIZE }, () => Array<boolean>(SIZE).fill(false));

  function setFunctionModule(x: number, y: number, dark: boolean): void {
    if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return;
    modules[y]![x] = dark;
    functionModules[y]![x] = true;
  }

  function drawFinderPattern(left: number, top: number): void {
    for (let dy = -1; dy <= 7; dy += 1) {
      for (let dx = -1; dx <= 7; dx += 1) {
        const inFinder = dx >= 0 && dx <= 6 && dy >= 0 && dy <= 6;
        const dark = inFinder && (
          dx === 0 || dx === 6 || dy === 0 || dy === 6 ||
          (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4)
        );
        setFunctionModule(left + dx, top + dy, dark);
      }
    }
  }

  drawFinderPattern(0, 0);
  drawFinderPattern(SIZE - 7, 0);
  drawFinderPattern(0, SIZE - 7);

  for (let i = 8; i < SIZE - 8; i += 1) {
    setFunctionModule(6, i, i % 2 === 0);
    setFunctionModule(i, 6, i % 2 === 0);
  }

  // Version 4 has one non-overlapping alignment pattern centered at (26, 26).
  for (let dy = -2; dy <= 2; dy += 1) {
    for (let dx = -2; dx <= 2; dx += 1) {
      setFunctionModule(26 + dx, 26 + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }
  }

  const selectedMask = 0;
  const bits = formatBits(selectedMask);
  for (let i = 0; i <= 5; i += 1) setFunctionModule(8, i, ((bits >>> i) & 1) !== 0);
  setFunctionModule(8, 7, ((bits >>> 6) & 1) !== 0);
  setFunctionModule(8, 8, ((bits >>> 7) & 1) !== 0);
  setFunctionModule(7, 8, ((bits >>> 8) & 1) !== 0);
  for (let i = 9; i < 15; i += 1) setFunctionModule(14 - i, 8, ((bits >>> i) & 1) !== 0);
  for (let i = 0; i < 8; i += 1) setFunctionModule(SIZE - 1 - i, 8, ((bits >>> i) & 1) !== 0);
  for (let i = 8; i < 15; i += 1) setFunctionModule(8, SIZE - 15 + i, ((bits >>> i) & 1) !== 0);
  setFunctionModule(8, SIZE - 8, true);

  const payloadBits: boolean[] = [];
  for (const codeword of encodeCodewords(text)) appendBits(payloadBits, codeword, 8);

  let payloadIndex = 0;
  for (let right = SIZE - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vertical = 0; vertical < SIZE; vertical += 1) {
      const upward = ((right + 1) & 2) === 0;
      const y = upward ? SIZE - 1 - vertical : vertical;
      for (let offset = 0; offset < 2; offset += 1) {
        const x = right - offset;
        if (functionModules[y]![x]) continue;
        modules[y]![x] = payloadBits[payloadIndex] ?? false; // Includes version 4 remainder bits.
        payloadIndex += 1;
      }
    }
  }

  // Mask pattern 0: (row + column) mod 2 == 0.
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      if (!functionModules[y]![x] && (x + y) % 2 === 0) {
        modules[y]![x] = !modules[y]![x];
      }
    }
  }

  return modules;
}

export function qrMatrixToPath(matrix: QrMatrix): string {
  const commands: string[] = [];
  for (let y = 0; y < matrix.length; y += 1) {
    const row = matrix[y]!;
    for (let x = 0; x < row.length; x += 1) {
      if (row[x]) commands.push(`M${x} ${y}h1v1h-1z`);
    }
  }
  return commands.join('');
}

export const REWARD_QR_MODULE_COUNT = SIZE;
export const REWARD_QR_QUIET_ZONE = 4;
