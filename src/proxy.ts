import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const publicPaths = ["/", "/login"];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public paths
  if (publicPaths.some((p) => pathname === p)) {
    return NextResponse.next();
  }

  // Allow auth API routes (dashboard + sales admin OTP flows)
  if (pathname.startsWith("/api/auth/") || pathname.startsWith("/api/sales-auth/")) {
    return NextResponse.next();
  }

  // Allow webhook routes (they have their own auth via signature)
  if (pathname.startsWith("/api/webhooks/")) {
    return NextResponse.next();
  }

  // Allow cron routes (they have their own auth via CRON_SECRET)
  if (pathname.startsWith("/api/cron/")) {
    return NextResponse.next();
  }

  // Check session cookie for everything else
  const session = req.cookies.get("dash_session");
  if (!session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Sales admin area requires an extra OTP gate (sales_session).
  // The /sales/login page itself only needs the normal dashboard session.
  const isSalesArea =
    (pathname.startsWith("/sales") && pathname !== "/sales/login") ||
    pathname.startsWith("/api/sales/");
  if (isSalesArea && req.cookies.get("sales_session")?.value !== "true") {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/sales/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};