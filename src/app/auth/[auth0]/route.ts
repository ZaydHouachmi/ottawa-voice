import type { NextRequest } from "next/server";
import { auth0 } from "@/lib/auth0";

// Mounted explicitly as a real Route Handler rather than left to Next's
// middleware auto-mounting. Two things found by testing, not assumed:
//
// 1. On this stack (Turbopack + output: standalone + Next 16), proxy.ts
//    built successfully and even printed "ƒ Proxy (Middleware)" in the
//    build summary, but the resulting middleware-manifest.json was
//    silently empty - a known, tracked Turbopack bug specific to the new
//    proxy.ts convention (github.com/vercel/next.js#93328). Renaming to
//    the deprecated middleware.ts fixed the manifest.
// 2. Even with a correct manifest, calling this SDK's dispatcher from a
//    real Next.js middleware context differs subtly from a route handler:
//    its internal handler() falls through to NextResponse.next() - valid
//    only inside real middleware - for any request whose method+pathname
//    it doesn't recognize as an auth route (see auth-client.js). That's
//    also exactly what a HEAD request to /auth/login hits, since the
//    login branch is GET-only - which is what an early `curl -I` test
//    showed, and is not proof middleware invocation itself was broken.
//
// This explicit route sidesteps needing to resolve which of those was
// actually still a live problem: Route Handlers are proven to work
// correctly in standalone mode all session (/api/extract, /api/speak,
// /api/progress), and calling auth0.middleware() from here reuses 100%
// of the SDK's real per-path dispatch. Confirmed working: a real GET to
// /auth/login returns a 307 to Auth0's actual /authorize endpoint with
// correct client_id, redirect_uri, and PKCE params.
async function handle(request: NextRequest) {
  return auth0.middleware(request);
}

export const GET = handle;
export const POST = handle;
