// Minimal ustar tar reader. We author bundles in build-jdk.mjs with GNU tar
// and `--format=ustar`, so we only need to parse the ustar shape: 512-byte
// header + file data padded to 512 bytes. Skips anything that isn't a
// regular file (directories are synthesized from file paths at stage time).

export type TarFile = { path: string; bytes: Uint8Array };

const decoder = new TextDecoder("utf-8");

function readString(block: Uint8Array, offset: number, length: number): string {
  const slice = block.subarray(offset, offset + length);
  let end = slice.indexOf(0);
  if (end < 0) end = slice.length;
  return decoder.decode(slice.subarray(0, end));
}

function readOctal(block: Uint8Array, offset: number, length: number): number {
  const s = readString(block, offset, length).trim();
  if (!s) return 0;
  return parseInt(s, 8);
}

export function parseTar(bytes: Uint8Array): TarFile[] {
  const files: TarFile[] = [];
  let offset = 0;
  while (offset + 512 <= bytes.length) {
    const header = bytes.subarray(offset, offset + 512);

    // Two consecutive zero blocks terminate the archive.
    let allZero = true;
    for (let i = 0; i < 512; i++) {
      if (header[i] !== 0) {
        allZero = false;
        break;
      }
    }
    if (allZero) break;

    const name = readString(header, 0, 100);
    const size = readOctal(header, 124, 12);
    const typeflag = String.fromCharCode(header[156] || 0x30);
    const prefix = readString(header, 345, 155);
    const path = prefix ? `${prefix}/${name}` : name;

    offset += 512;

    if (typeflag === "0" || typeflag === "\0") {
      const data = bytes.subarray(offset, offset + size);
      files.push({ path, bytes: new Uint8Array(data) });
    }

    offset += Math.ceil(size / 512) * 512;
  }
  return files;
}

/** Streaming gunzip via the platform DecompressionStream. */
export async function gunzip(bytes: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === "undefined") {
    throw new Error("DecompressionStream is not available in this environment");
  }
  const stream = new Response(
    new Blob([bytes as BlobPart])
      .stream()
      .pipeThrough(new DecompressionStream("gzip")),
  );
  const buf = await stream.arrayBuffer();
  return new Uint8Array(buf);
}
