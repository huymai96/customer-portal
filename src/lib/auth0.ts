import { Auth0Client } from "@auth0/nextjs-auth0/server";

const audience = process.env.AUTH0_AUDIENCE?.trim();
const scope = process.env.AUTH0_SCOPE?.trim();

export const auth0 = new Auth0Client({
  authorizationParameters: {
    scope: scope || "openid profile email",
    ...(audience ? { audience } : {}),
  },
  signInReturnToPath: "/portal",
});
