import { NextResponse } from "next/server";

const CONVEX_AUTH_BASE_URL = process.env.NEXT_PUBLIC_CONVEX_SITE_URL!;
const APP_ORIGIN_HEADER = "x-app-origin";

async function proxy(request: Request, method: "GET" | "POST") {
  const url = new URL(request.url);
  let pathname = url.pathname;
  if (pathname === "/api/auth/sign-in/email-magic-link") {
    pathname = "/api/auth/magic-link/send";
  }

  const convexUrl = `${CONVEX_AUTH_BASE_URL}${pathname}${url.search}`;

  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("content-length");
  const resolvedOrigin = resolveRequestOrigin(request);
  if (resolvedOrigin) {
    headers.set(APP_ORIGIN_HEADER, resolvedOrigin);
  }

  let body: ReadableStream | undefined;
  if (method === "POST") {
    const arrayBuffer = await request.arrayBuffer();
    body = new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(arrayBuffer));
        controller.close();
      },
    });
  }

  const init: RequestInit & { duplex?: "half" } = {
    method,
    headers,
    body,
    redirect: "manual",
    ...(body && { duplex: "half" as const }),
  };

  const response = await fetch(convexUrl, init);

  const responseHeaders = new Headers(response.headers);
  responseHeaders.delete("content-encoding");
  responseHeaders.delete("content-length");

  const nextResponse = new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });

  return nextResponse;
}

export async function GET(request: Request) {
  return proxy(request, "GET");
}

export async function POST(request: Request) {
  return proxy(request, "POST");
}

function resolveRequestOrigin(request: Request): string | null {
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const forwardedHost = request.headers.get("x-forwarded-host");
  if (forwardedProto && forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  const origin = request.headers.get("origin");
  if (origin) {
    return origin;
  }

  const referer = request.headers.get("referer");
  if (referer) {
    try {
      return new URL(referer).origin;
    } catch {
      // ignore parse errors
    }
  }

  return process.env.NEXT_PUBLIC_APP_URL ?? null;
}

