import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that don't require authentication
const PUBLIC_ROUTES = ["/login"];

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const accessToken = request.cookies.get("access_token");
    const refreshToken = request.cookies.get("refresh_token");

    const hasSession = accessToken || refreshToken;
    const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));

    // If no session and trying to access a protected route -> redirect to login
    if (!hasSession && !isPublicRoute) {
        const loginUrl = new URL("/login", request.url);
        return NextResponse.redirect(loginUrl);
    }

    // If has session and trying to access login -> redirect to home
    if (hasSession && isPublicRoute) {
        const homeUrl = new URL("/", request.url);
        return NextResponse.redirect(homeUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        // Match all routes except static files and Next.js internals
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};
