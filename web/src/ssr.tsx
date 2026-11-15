import {
  createStartHandler,
  defaultStreamHandler,
  createServerEntry,
} from "@tanstack/solid-start/server";

const fetch = createStartHandler(defaultStreamHandler);

export default createServerEntry({ fetch });
