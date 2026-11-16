import pino from "pino";

const isDev = import.meta.env.DEV;

/**
 * Universal logger. Works in Node/workerd (server fns) and in the browser.
 *
 * Output goes to `console.log` as newline-delimited JSON, so piping
 * `pnpm dev` through `pino-pretty` produces coloured, human-readable lines
 * while still giving structured data for prod / log aggregators.
 */
export const logger = pino({
  level: isDev ? "debug" : "info",
  base: { env: isDev ? "dev" : "prod" },
  browser: {
    asObject: true,
    write: (o: unknown) => {
      // eslint-disable-next-line no-console
      console.log(JSON.stringify(o));
    },
  },
});

export function child(bindings: Record<string, unknown>) {
  return logger.child(bindings);
}
