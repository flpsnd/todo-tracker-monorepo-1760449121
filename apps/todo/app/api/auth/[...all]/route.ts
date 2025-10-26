import { NextResponse } from "next/server";

const CONVEX_AUTH_BASE_URL = process.env.NEXT_PUBLIC_CONVEX_SITE_URL!;

async function proxy(request: Request, method: "GET" | "POST") {
  const url = new URL(request.url);
  const convexUrl = `${CONVEX_AUTH_BASE_URL}${url.pathname}${url.search}`;

  console.log("Auth proxy ->", method, convexUrl);

  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("content-length");

  let body: ReadableStream | undefined;
  if (method !== "GET" && method !== "HEAD") {
    const arrayBuffer = await request.arrayBuffer();
    body = new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(arrayBuffer));
        controller.close();
      },
    });
  }

  const init: RequestInit = {
    method,
    headers,
    body,
    redirect: "manual",
    duplex: body ? "half" : undefined,
  };

  const response = await fetch(convexUrl, init);

  const responseHeaders = new Headers(response.headers);
  responseHeaders.delete("content-encoding");
  responseHeaders.delete("content-length");

  const setCookie = responseHeaders.get("set-cookie");
  if (setCookie) {
    console.log("Auth proxy <- set-cookie", setCookie);
  }

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
