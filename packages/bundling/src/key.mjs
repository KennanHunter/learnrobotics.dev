// Key conventions for R2-hosted bundle artifacts. Two shapes coexist:
//
//   - Flat: <kind>/<pin>/<file>            (teavm-style; several files per pin)
//   - Archive: <kind>/<pin>/bundle.tar.gz  (runtime-bundle style; single file)
//
// New bundle kinds should pick one; mixing within a kind breaks the listing +
// staging assumptions in the browser.

export const R2_ACCOUNT_ID = "1de9d7646d10b16be16d4afc4ac9a19b";

/** Default bucket; other buckets can be passed explicitly where needed. */
export const R2_BUCKET = "learn-robotics-dev-storage";

export function r2Endpoint(accountId = R2_ACCOUNT_ID) {
  return `https://${accountId}.r2.cloudflarestorage.com`;
}

/** Build a bundle key. `prefix` lets a kind opt out of the default
 *  `<kind>/` namespace — teavm's existing objects live at `teavm/<pin>/...`
 *  (no `bundles/` prefix), while new kinds use `bundles/<kind>/<pin>/...`.
 */
export function bundleKey({ kind, pin, filename, prefix }) {
  const parts = [];
  if (prefix) parts.push(prefix.replace(/\/+$/, ""));
  parts.push(kind, pin);
  if (filename) parts.push(filename);
  return parts.filter(Boolean).join("/");
}
