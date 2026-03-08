import { NextResponse, type NextRequest } from "next/server";
import { getAuthUser } from "@/lib/server/auth";
import { securityAudit, SECURITY_CONFIG } from "@/lib/server/security";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // 1. Security Audit
        const audit = await securityAudit(request, {
            requireSafeOrigin: true,
            rateLimitKey: `staff-legacy-block:${id}`,
            rateLimitConfig: SECURITY_CONFIG.STAFF_MANAGEMENT
        });
        if (!audit.allowed) return audit.response!;

        const { user, error: authError } = await getAuthUser(request);
        if (!user || authError) {
            return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
        }

        // We block this regardless of role, but we'll return a clear message
        return NextResponse.json({ 
            error: "Direct staff creation has been replaced by the invitation system. Please use the Generate Invitation button in the dashboard." 
        }, { status: 405 });

    } catch (err) {
        console.error("Staff creation block error:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
