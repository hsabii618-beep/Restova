import { NextResponse, type NextRequest } from 'next/server'
import { getAuthUser } from '@/lib/server/auth'
import { checkSlugAvailability } from '@/lib/server/restaurants'
import { securityAudit, SECURITY_CONFIG } from '@/lib/server/security'

export async function GET(request: NextRequest) {
    try {
        // 1. Rate Limiting
        const audit = await securityAudit(request, {
            rateLimitKey: 'slug-check',
            rateLimitConfig: SECURITY_CONFIG.SLUG_CHECK
        });
        if (!audit.allowed) return audit.response!;

        const { user, error: authError } = await getAuthUser(request)

        if (!user || authError) {
            return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const slug = searchParams.get('slug')
        const restaurantId = searchParams.get('restaurantId')

        if (!slug) {
            return NextResponse.json({ error: 'Slug is required' }, { status: 400 })
        }

        const result = await checkSlugAvailability(slug, restaurantId || undefined)

        return NextResponse.json(result)
    } catch (err) {
        console.error(`Unexpected error in GET /api/restaurants/check-slug:`, err)
        return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
}
