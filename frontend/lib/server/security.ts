import { type NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';

// PRODUCTION REDIS INITIALIZATION
let redis: Redis | null = null;
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    try {
        redis = new Redis({
            url: process.env.UPSTASH_REDIS_REST_URL,
            token: process.env.UPSTASH_REDIS_REST_TOKEN,
        });
    } catch (err) {
        console.error('[SECURITY] Failed to initialize Upstash Redis:', err);
    }
} else {
    console.warn('[SECURITY] Missing UPSTASH_REDIS_REST_URL/TOKEN. Falling back to in-memory rate limiting (unreliable in production).');
}

// FALLBACK IN-MEMORY RATE LIMITER
const fallbackRateLimitMap = new Map<string, { count: number, resetAt: number }>();

export interface RateLimitConfig {
    limit: number;      // Maximum requests
    windowMs: number;   // Window in milliseconds
}

export const SECURITY_CONFIG = {
    SLUG_CHECK: { limit: 100, windowMs: 60 * 1000 },       // 100 per minute
    PUBLIC_ORDER: { limit: 5, windowMs: 60 * 1000 },       // 5 per minute (very restrictive for spam)
    STAFF_MANAGEMENT: { limit: 20, windowMs: 60 * 1000 },  // 20 per minute
    SETTINGS_UPDATE: { limit: 10, windowMs: 60 * 1000 },   // 10 per minute
    AUTH_ATTEMPT: { limit: 5, windowMs: 60 * 1000 },       // 5 per minute
    STAFF_INVITATION: { limit: 10, windowMs: 60 * 1000 },  // 10 per minute
    STAFF_CONSUME: { limit: 5, windowMs: 60 * 1000 },     // 5 per minute per IP
    STAFF_INVITE_TOKEN_LIMIT: { limit: 3, windowMs: 60 * 1000 }, // 3 per minute per token
};

/**
 * Basic Rate Limiter (Async version using Upstash with Memory fallback)
 * Returns { allowed: true } if within limits, or specialized 429 response if not.
 */
export async function rateLimit(request: NextRequest, keyIdentifier: string, config: RateLimitConfig) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';
    const key = `${keyIdentifier}:${ip}`;
    const now = Date.now();

    // 1. TRY UPSTASH REDIS (Production path)
    if (redis) {
        try {
            const limiter = new Ratelimit({
                redis,
                limiter: Ratelimit.slidingWindow(config.limit, `${config.windowMs} ms`),
                analytics: true,
                prefix: '@upstash/ratelimit:restova',
            });
            const { success, reset } = await limiter.limit(key);

            if (!success) {
                logSecurityEvent('RATE_LIMIT_EXCEEDED', { ip, keyIdentifier, limit: config.limit, provider: 'upstash' });
                return {
                    allowed: false,
                    response: NextResponse.json(
                        { error: 'Too many requests. Please try again later.' },
                        { status: 429, headers: { 'Retry-After': Math.ceil((reset - now) / 1000).toString() } }
                    )
                };
            }
            return { allowed: true };
        } catch (err) {
            console.error('[SECURITY] Upstash Ratelimit error, falling back to memory:', err);
            // Continue to fallback
        }
    }

    // 2. FALLBACK TO IN-MEMORY (Local dev or Redis down)
    const record = fallbackRateLimitMap.get(key);

    if (!record || now > record.resetAt) {
        fallbackRateLimitMap.set(key, { count: 1, resetAt: now + config.windowMs });
        return { allowed: true };
    }

    if (record.count >= config.limit) {
        logSecurityEvent('RATE_LIMIT_EXCEEDED', { ip, keyIdentifier, limit: config.limit, provider: 'memory-fallback' });
        return {
            allowed: false,
            response: NextResponse.json(
                { error: 'Too many requests. Please try again later.' },
                { status: 429, headers: { 'Retry-After': Math.ceil((record.resetAt - now) / 1000).toString() } }
            )
        };
    }

    record.count += 1;
    return { allowed: true };
}

/**
 * CSRF / Origin Verification
 * Ensures the request is coming from our own domain.
 */
export function verifySafeOrigin(request: NextRequest) {
    const host = request.headers.get('host');
    const origin = request.headers.get('origin');
    const referer = request.headers.get('referer');

    // 1. If 'Origin' exists, it must match our host EXACTLY (allowing subdomains if needed)
    if (origin) {
        const originHost = new URL(origin).host;
        if (originHost !== host && !originHost.endsWith('.' + process.env.NEXT_PUBLIC_ROOT_DOMAIN)) {
            logSecurityEvent('CSRF_ORIGIN_MISMATCH', { origin, host });
            return false;
        }
        return true;
    }

    // 2. Fallback to 'Referer' if 'Origin' is missing
    if (referer) {
        try {
            const refererHost = new URL(referer).host;
            if (refererHost !== host && !refererHost.endsWith('.' + process.env.NEXT_PUBLIC_ROOT_DOMAIN)) {
                logSecurityEvent('CSRF_REFERER_MISMATCH', { referer, host });
                return false;
            }
            return true;
        } catch {
            return false;
        }
    }

    // 3. For state-changing requests, one of the two MUST be present
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
        logSecurityEvent('MISSING_ORIGIN_HEADERS', { method: request.method, path: request.nextUrl.pathname });
        return false;
    }

    return true;
}

/**
 * Structured Security Logger
 */
export function logSecurityEvent(event: string, details: Record<string, any>) {
    const timestamp = new Date().toISOString();
    const logEntry = {
        timestamp,
        event,
        ...details
    };
    console.warn(`[SECURITY_EVENT] ${JSON.stringify(logEntry)}`);
}

/**
 * Clean helper to verify everything at once for an API route
 */
export async function securityAudit(request: NextRequest, config?: {
    rateLimitKey?: string,
    rateLimitConfig?: RateLimitConfig,
    requireSafeOrigin?: boolean
}) {
    const url = request.nextUrl.pathname;
    const search = request.nextUrl.search;

    // 0. Suspicious Path / Traversal Detection
    if (url.includes('..') || search.includes('..') || url.includes('/etc/') || url.includes('passwd')) {
        logSecurityEvent('SUSPICIOUS_PATH_DETECTED', { path: url, search });
    }

    // 1. CSRF Check
    if (config?.requireSafeOrigin && !verifySafeOrigin(request)) {
        return {
            allowed: false,
            response: NextResponse.json({ error: 'Untrusted origin' }, { status: 403 })
        };
    }

    // 2. Rate Limit Check
    if (config?.rateLimitKey && config?.rateLimitConfig) {
        const rl = await rateLimit(request, config.rateLimitKey, config.rateLimitConfig);
        if (!rl.allowed) return rl;
    }

    return { allowed: true };
}
