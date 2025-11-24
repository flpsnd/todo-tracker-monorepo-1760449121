import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import {
  createAuth,
  allowedAppOrigins,
  defaultAuthBaseURL,
  normalizeSiteOrigin,
} from "./auth";

const AUTH_PATH_PREFIX = "/api/auth";
const APP_ORIGIN_HEADER = "x-app-origin";

const http = httpRouter();

const authRequestHandler = httpAction(async (ctx, request) => {
  const originFromHeader = request.headers.get(APP_ORIGIN_HEADER);
  const refererOrigin = request.headers.get("referer");
  const resolvedOrigin = pickValidOrigin(originFromHeader, refererOrigin);

  if (!resolvedOrigin) {
    return new Response("Forbidden", { status: 403 });
  }

  (ctx as { __appBaseURL?: string }).__appBaseURL = resolvedOrigin;

  const auth = createAuth(ctx as any);
  return auth.handler(request);
});

http.route({
  pathPrefix: `${AUTH_PATH_PREFIX}/`,
  method: "GET",
  handler: authRequestHandler,
});

http.route({
  pathPrefix: `${AUTH_PATH_PREFIX}/`,
  method: "POST",
  handler: authRequestHandler,
});

http.route({
  path: "/.well-known/openid-configuration",
  method: "GET",
  handler: httpAction(async () => {
    const target = `${process.env.CONVEX_SITE_URL}${AUTH_PATH_PREFIX}/convex/.well-known/openid-configuration`;
    return Response.redirect(target);
  }),
});

function pickValidOrigin(...origins: Array<string | null>): string | null {
  for (const value of origins) {
    if (!value) continue;
    const normalized =
      value.startsWith("http://") || value.startsWith("https://")
        ? normalizeSiteOrigin(value)
        : normalizeSiteOrigin(`https://${value}`);
    if (normalized && allowedAppOrigins.has(normalized)) {
      return normalized;
    }
  }
  return null;
}

export default http;
