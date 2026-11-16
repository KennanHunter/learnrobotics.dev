import { createAuthClient } from "better-auth/solid";
import { anonymousClient } from "better-auth/client/plugins";
import { isServer } from "solid-js/web";

export const authClient = isServer
  ? ({} as ReturnType<typeof createAuthClient>)
  : createAuthClient({
      plugins: [anonymousClient()],
    });
