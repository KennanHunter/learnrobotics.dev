import { createAuthClient } from "better-auth/solid";
import { anonymousClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [anonymousClient()],
});

export const { signIn, signOut, useSession } = authClient;
