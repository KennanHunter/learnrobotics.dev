import pino from "pino";

const isDev = import.meta.env?.DEV ?? false;

export const logger = pino({
  level: isDev ? "debug" : "info",
  base: { env: isDev ? "dev" : "prod" },
  browser: {
    asObject: true,
    write: (o: unknown) => {
      console.log(JSON.stringify(o));
    },
  },
});
