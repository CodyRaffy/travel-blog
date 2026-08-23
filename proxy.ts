import { NextRequest, NextResponse } from "next/server";
import { createRemoteJWKSet, jwtVerify } from "jose";

/**
 * Admin gate. The public map, stop pages, posts and media stay open; anything
 * under /admin, every non-GET API call, and the photo thumbnail endpoint
 * (which reads the whole library, not just curated photos) require one of:
 *
 *  1. A request from this machine itself (http://localhost:2323/admin), which
 *     never passes through Cloudflare — identified by a loopback Host and the
 *     absence of the CF-Connecting-IP header Cloudflare adds to every proxied
 *     request. cloudflared forwards the public hostname as Host, so tunnel
 *     traffic can't look local.
 *
 *  2. A valid Cloudflare Access JWT (Cf-Access-Jwt-Assertion), verified against
 *     the team's public keys. Requires CF_ACCESS_TEAM_DOMAIN and CF_ACCESS_AUD.
 *
 * CF_ACCESS_AUD (application audience tag) and CF_ACCESS_EMAILS are optional
 * hardening on top. If Access isn't configured at all, remote admin is denied.
 */

const TEAM_DOMAIN = process.env.CF_ACCESS_TEAM_DOMAIN; // e.g. "raffensperger" for raffensperger.cloudflareaccess.com
// Optional: pin tokens to one Access application. Without it, any valid login from the team is accepted.
const AUD = process.env.CF_ACCESS_AUD;
// Optional extra lock: comma-separated emails that the Access login must match.
const ALLOWED_EMAILS = (process.env.CF_ACCESS_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

const jwks = TEAM_DOMAIN
  ? createRemoteJWKSet(new URL(`https://${TEAM_DOMAIN}.cloudflareaccess.com/cdn-cgi/access/certs`))
  : null;

function isProtected(req: NextRequest): boolean {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/admin")) return true;
  if (pathname.startsWith("/api/photos/")) return true; // raw library thumbnails
  if (pathname.startsWith("/api/") && req.method !== "GET" && req.method !== "HEAD" && req.method !== "OPTIONS") return true;
  if (pathname.startsWith("/api/stop-candidates") || pathname.startsWith("/api/post-candidates")) return true;
  return false;
}

function isLocalRequest(req: NextRequest): boolean {
  const host = (req.headers.get("host") ?? "").toLowerCase().split(":")[0];
  const loopback = host === "localhost" || host === "127.0.0.1" || host === "[::1]";
  return loopback && !req.headers.has("cf-connecting-ip");
}

async function hasValidAccessToken(req: NextRequest): Promise<boolean> {
  if (!jwks || !TEAM_DOMAIN) return false;
  const token = req.headers.get("cf-access-jwt-assertion") ?? req.cookies.get("CF_Authorization")?.value;
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, jwks, {
      issuer: `https://${TEAM_DOMAIN}.cloudflareaccess.com`,
      ...(AUD ? { audience: AUD } : {}),
    });
    if (ALLOWED_EMAILS.length > 0) {
      const email = String(payload.email ?? "").toLowerCase();
      if (!ALLOWED_EMAILS.includes(email)) return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function proxy(req: NextRequest) {
  if (!isProtected(req)) return NextResponse.next();
  if (isLocalRequest(req)) return NextResponse.next();
  if (await hasValidAccessToken(req)) return NextResponse.next();

  const wantsHtml = req.headers.get("accept")?.includes("text/html");
  if (wantsHtml) {
    return new NextResponse(
      "<!doctype html><title>Admin unavailable</title><body style=\"font-family:system-ui;padding:2rem\">" +
        "<h1>Admin is not available from here</h1><p>Use it from the server itself, or protect this path with Cloudflare Access.</p>",
      { status: 403, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export const config = {
  matcher: ["/admin/:path*", "/api/:path*"],
};
