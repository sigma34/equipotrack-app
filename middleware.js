// middleware.js — Rate Limiting para Lumo
// Coloca este archivo en la raíz del proyecto (mismo nivel que package.json)
// Vercel lo ejecuta automáticamente en el Edge antes de cada request

import { NextResponse } from "next/server";

// Ventana de tiempo y límite de requests
const WINDOW_MS = 60 * 1000; // 1 minuto
const MAX_REQUESTS = 30;      // máximo 30 requests por minuto por IP
const LOGIN_MAX = 5;          // máximo 5 intentos de login por minuto por IP

// Map en memoria (se resetea por instancia de Edge — suficiente para protección básica)
const requestCounts = new Map();

function getCount(key) {
  const now = Date.now();
  const entry = requestCounts.get(key);
  if (!entry || now - entry.timestamp > WINDOW_MS) {
    requestCounts.set(key, { count: 1, timestamp: now });
    return 1;
  }
  entry.count += 1;
  return entry.count;
}

export function middleware(request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "unknown";

  const url = request.nextUrl.pathname;
  const isLoginAttempt = url.includes("/auth/v1/token");

  // Rate limit más estricto para login
  const limit = isLoginAttempt ? LOGIN_MAX : MAX_REQUESTS;
  const key = `${ip}:${isLoginAttempt ? "login" : "api"}`;
  const count = getCount(key);

  if (count > limit) {
    return new NextResponse(
      JSON.stringify({
        error: "too_many_requests",
        message: isLoginAttempt
          ? "Demasiados intentos de inicio de sesión. Espera 1 minuto."
          : "Demasiadas solicitudes. Espera un momento.",
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": "60",
          "X-RateLimit-Limit": String(limit),
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }

  const response = NextResponse.next();
  response.headers.set("X-RateLimit-Limit", String(limit));
  response.headers.set("X-RateLimit-Remaining", String(Math.max(0, limit - count)));
  return response;
}

export const config = {
  // Aplicar solo a las rutas relevantes
  matcher: [
    "/api/:path*",
    // Si usas proxy de Supabase
    "/auth/:path*",
  ],
};
