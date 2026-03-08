import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const next = searchParams.get('next') ?? '/dashboard'

    if (code) {
        const supabase = await createSupabaseServerClient()
        const { error } = await supabase.auth.exchangeCodeForSession(code)

        if (!error) {
            const isLocalhost = process.env.NODE_ENV === 'development';
            const forwardedHost = request.headers.get('x-forwarded-host');
            const isProxy = !!forwardedHost;

            let redirectOrigin = origin;
            if (!isLocalhost && isProxy) {
                redirectOrigin = `https://${forwardedHost}`;
            }

            return NextResponse.redirect(`${redirectOrigin}${next}`)
        }
    }

    // Return the user to an error page with some instructions
    return NextResponse.redirect(`${origin}/login?error=Invalid+or+expired+verification+link`)
}
