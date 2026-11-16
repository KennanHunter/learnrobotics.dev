import {
  createStartHandler,
  defaultStreamHandler,
  RequestHandler,
} from "@tanstack/solid-start/server";
import { createServerEntry } from "@tanstack/solid-start/server-entry";
import { paraglideMiddleware } from "./paraglide/server.js";
import { Register } from "@tanstack/solid-start";

const startHandler = createStartHandler(defaultStreamHandler);

// paraglide strips the locale prefix before TanStack sees the URL (server
// router basepath is "/"). The client router (src/router.tsx) uses
// basepath=`/${getLocale()}` so both sides agree on the matched route tree.
const fetch: RequestHandler<Register> = (request, opts): Promise<Response> =>
  paraglideMiddleware(request, ({ request: localizedRequest }) =>
    startHandler(localizedRequest, opts),
  );

export default createServerEntry({ fetch });
