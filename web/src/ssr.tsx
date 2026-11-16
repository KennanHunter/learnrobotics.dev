import {
  createStartHandler,
  defaultStreamHandler,
  RequestHandler,
} from "@tanstack/solid-start/server";
import { createServerEntry } from "@tanstack/solid-start/server-entry";
import { paraglideMiddleware } from "./paraglide/server.js";
import { Register } from "@tanstack/solid-start";

const startHandler = createStartHandler(defaultStreamHandler);

const fetch: RequestHandler<Register> = (request, opts): Promise<Response> =>
  paraglideMiddleware(request, ({ request: localizedRequest }) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    startHandler(localizedRequest, opts),
  );

export default createServerEntry({ fetch });
