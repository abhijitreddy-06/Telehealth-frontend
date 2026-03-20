import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const isProduction = process.env.NODE_ENV === "production";
const configuredBackend = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_SERVER_API_URL;

if (isProduction && !configuredBackend) {
  throw new Error("Missing backend API URL in production. Set NEXT_PUBLIC_API_URL or NEXT_SERVER_API_URL.");
}

if (isProduction && configuredBackend && configuredBackend.startsWith("http://")) {
  throw new Error("In production, backend API URL must use HTTPS.");
}

const BACKEND_URL = (configuredBackend || "http://localhost:10000").replace(/\/$/, "");
const SESSION_FETCH_TIMEOUT_MS = 70000;

const publicOnlyPaths = ["/", "/services", "/contact", "/auth", "/signup"];
const patientProtectedPaths = [
  "/patient/home",
  "/appointments",
  "/patient/video",
  "/pharmacy",
  "/records",
  "/predict",
  "/patient/profile",
  "/patient/profile/create",
];
const doctorProtectedPaths = [
  "/doctor/home",
  "/doctor/video",
  "/doctor/schedule",
  "/doctor/profile",
  "/doctor/past-appointments",
  "/doctor/profile/create",
];
const adminPublicPaths = ["/admin/auth"];
const adminProtectedPaths = ["/admin"];

type SessionPayload = {
  authenticated: boolean;
  role?: "patient" | "doctor";
  backendRole?: "user" | "doctor" | "admin";
  profileComplete?: boolean;
  redirect?: string;
  homePath?: string;
  profileCreatePath?: string;
};

type SessionEnvelope = {
  success: boolean;
  data: SessionPayload | null;
  error: string | null;
  message: string | null;
  authenticated?: boolean;
  role?: "patient" | "doctor";
  backendRole?: "user" | "doctor" | "admin";
  profileComplete?: boolean;
  redirect?: string;
  homePath?: string;
  profileCreatePath?: string;
};

function matchesPath(pathname: string, routes: string[]) {
  return routes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

async function getSession(request: NextRequest): Promise<SessionPayload | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SESSION_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(`${BACKEND_URL}/api/auth/session`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        cookie: request.headers.get("cookie") || "",
      },
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) return null;
    const payload = (await response.json()) as SessionEnvelope;

    if (payload?.success === true) {
      if (payload.data && typeof payload.data === "object") {
        return payload.data;
      }

      return {
        authenticated: Boolean(payload.authenticated),
        role: payload.role,
        backendRole: payload.backendRole,
        profileComplete: payload.profileComplete,
        redirect: payload.redirect,
        homePath: payload.homePath,
        profileCreatePath: payload.profileCreatePath,
      };
    }

    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

function redirectTo(request: NextRequest, pathname: string) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  return NextResponse.redirect(url);
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accept = request.headers.get("accept") || "";
  const contentType = request.headers.get("content-type") || "";
  const isJsonRequest =
    accept.includes("application/json") ||
    contentType.includes("application/json") ||
    request.headers.get("x-requested-with") === "XMLHttpRequest";

  // Allow API-like calls to pass through to backend rewrites.
  if (request.method !== "GET" && request.method !== "HEAD") {
    return NextResponse.next();
  }

  if (isJsonRequest) {
    return NextResponse.next();
  }

  const isPublicOnly = matchesPath(pathname, publicOnlyPaths) || pathname.startsWith("/auth/");
  const isAdminPublic = matchesPath(pathname, adminPublicPaths);
  const isPatientProtected = matchesPath(pathname, patientProtectedPaths);
  const isDoctorProtected = matchesPath(pathname, doctorProtectedPaths);
  const isAdminProtected = matchesPath(pathname, adminProtectedPaths);

  if (!isPublicOnly && !isAdminPublic && !isPatientProtected && !isDoctorProtected && !isAdminProtected) {
    return NextResponse.next();
  }

  const session = await getSession(request);
  const hasAuthCookie =
    request.cookies.has("accessToken") || request.cookies.has("refreshToken");

  if (isPublicOnly) {
    if (session?.authenticated && session.redirect) {
      return redirectTo(request, session.redirect);
    }
    return NextResponse.next();
  }

  if (isAdminPublic) {
    if (session?.authenticated && session.backendRole === "admin") {
      return redirectTo(request, "/admin");
    }
    return NextResponse.next();
  }

  if (isPatientProtected) {
    if (!session && hasAuthCookie) {
      return NextResponse.next();
    }
    if (!session?.authenticated) {
      return redirectTo(request, "/auth/patient");
    }
    if (session.role !== "patient") {
      return redirectTo(request, session.redirect || "/doctor/home");
    }
    if (!session.profileComplete && pathname !== "/patient/profile/create") {
      return redirectTo(request, session.profileCreatePath || "/patient/profile/create");
    }
    if (session.profileComplete && pathname === "/patient/profile/create") {
      return redirectTo(request, session.homePath || "/patient/home");
    }
    return NextResponse.next();
  }

  if (isDoctorProtected) {
    if (!session && hasAuthCookie) {
      return NextResponse.next();
    }
    if (!session?.authenticated) {
      return redirectTo(request, "/auth/doctor");
    }
    if (session.role !== "doctor") {
      return redirectTo(request, session.redirect || "/patient/home");
    }
    if (!session.profileComplete && pathname !== "/doctor/profile/create") {
      return redirectTo(request, session.profileCreatePath || "/doctor/profile/create");
    }
    if (session.profileComplete && pathname === "/doctor/profile/create") {
      return redirectTo(request, session.homePath || "/doctor/home");
    }
  }

  if (isAdminProtected) {
    if (!session?.authenticated) {
      return redirectTo(request, "/admin/auth");
    }
    if (session.backendRole !== "admin") {
      return redirectTo(request, session.redirect || "/");
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/services",
    "/contact",
    "/auth/:path*",
    "/signup",
    "/patient/home",
    "/appointments/:path*",
    "/patient/video/:path*",
    "/pharmacy/:path*",
    "/records/:path*",
    "/predict/:path*",
    "/patient/profile/:path*",
    "/patient/profile/create/:path*",
    "/doctor/home/:path*",
    "/doctor/video/:path*",
    "/doctor/schedule/:path*",
    "/doctor/profile/:path*",
    "/doctor/past-appointments/:path*",
    "/doctor/profile/create/:path*",
    "/admin/auth/:path*",
    "/admin/:path*",
  ],
};