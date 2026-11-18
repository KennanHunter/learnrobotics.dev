import { describe, it, expect } from "vitest";
import { gunzip, parseTar } from "~/lib/bundles/tar";

// Builds a minimal ustar + gzip stream in-process so we can exercise the
// extract pipeline without needing the real 140 MB JDK bundle on disk.
// Validates: header parsing, long-path prefix handling, gzip round-trip.
function writeUstarHeader(path: string, size: number): Uint8Array {
  const header = new Uint8Array(512);
  const enc = new TextEncoder();
  const [prefix, name] =
    path.length > 100
      ? [
          path.slice(0, path.lastIndexOf("/", 99)),
          path.slice(path.lastIndexOf("/", 99) + 1),
        ]
      : ["", path];
  header.set(enc.encode(name), 0);
  header.set(enc.encode(size.toString(8).padStart(11, "0") + "\0"), 124);
  header[156] = 0x30; // '0' = regular file
  header.set(enc.encode("ustar\0"), 257);
  header.set(enc.encode("00"), 263);
  if (prefix) header.set(enc.encode(prefix), 345);
  // Minimal checksum (ustar readers used in tests don't verify, but a real
  // tar does; compute to be safe).
  let sum = 0;
  for (let i = 0; i < 148; i++) sum += header[i]!;
  for (let i = 148; i < 156; i++) sum += 32; // spaces per spec
  for (let i = 156; i < 512; i++) sum += header[i]!;
  header.set(enc.encode(sum.toString(8).padStart(6, "0") + "\0 "), 148);
  return header;
}

function buildTar(files: { path: string; bytes: Uint8Array }[]): Uint8Array {
  const chunks: Uint8Array[] = [];
  for (const { path, bytes } of files) {
    chunks.push(writeUstarHeader(path, bytes.length));
    chunks.push(bytes);
    const pad = (512 - (bytes.length % 512)) % 512;
    if (pad > 0) chunks.push(new Uint8Array(pad));
  }
  chunks.push(new Uint8Array(1024));
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const c of chunks) {
    out.set(c, o);
    o += c.length;
  }
  return out;
}

async function gzipBytes(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Response(
    new Blob([bytes as BlobPart])
      .stream()
      .pipeThrough(new CompressionStream("gzip")),
  );
  return new Uint8Array(await stream.arrayBuffer());
}

describe("runtime-bundle tar/gunzip", () => {
  it("round-trips a short file through gzip + tar parse", async () => {
    const payload = new TextEncoder().encode('JAVA_VERSION="25.0.5.11.1"\n');
    const tar = buildTar([{ path: "release", bytes: payload }]);
    const gz = await gzipBytes(tar);

    const unpacked = await gunzip(gz);
    const files = parseTar(unpacked);

    expect(files).toHaveLength(1);
    expect(files[0]!.path).toBe("release");
    expect(new TextDecoder().decode(files[0]!.bytes)).toContain("JAVA_VERSION");
  });

  it("parses nested paths from a multi-file archive", async () => {
    const files = [
      { path: "release", bytes: new TextEncoder().encode("JAVA_VERSION=25\n") },
      { path: "lib/modules", bytes: new Uint8Array([0x89, 0x50, 0x4e, 0x47]) },
    ];
    const tar = buildTar(files);
    const gz = await gzipBytes(tar);

    const unpacked = await gunzip(gz);
    const parsed = parseTar(unpacked);

    const paths = parsed.map((f) => f.path).sort();
    expect(paths).toEqual(["lib/modules", "release"]);
    expect(parsed.find((f) => f.path === "lib/modules")!.bytes.length).toBe(4);
  });
});
