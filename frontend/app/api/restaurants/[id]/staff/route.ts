import { NextResponse, type NextRequest } from "next/server";
import { getAuthUser } from "@/lib/server/auth";
import { createClient } from "@supabase/supabase-js";
import { sanitizeText, validateEmail, validateName } from "@/lib/server/restaurants";
import { securityAudit, SECURITY_CONFIG } from "@/lib/server/security";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // 1. Security Audit
        const audit = await securityAudit(request, {
            requireSafeOrigin: true,
            rateLimitKey: 'staff-management',
            rateLimitConfig: SECURITY_CONFIG.STAFF_MANAGEMENT
        });
        if (!audit.allowed) return audit.response!;

        const { user, supabase, error: authError } = await getAuthUser(request);

        if (!user || authError) {
            return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
        }

        const { id } = await params;

        // Verify current user is an owner of this restaurant
        const { data: memberCheck } = await supabase
            .from("restaurant_users")
            .select("role")
            .eq("restaurant_id", id)
            .eq("user_id", user.id)
            .maybeSingle();

        if (!memberCheck || memberCheck.role !== "owner") {
            return NextResponse.json({ error: "Forbidden: Only owners can create staff" }, { status: 403 });
        }

        const body = await request.json().catch(() => ({}));
        const { name, email, password, role } = body;

        const sanitizedName = sanitizeText(name || "", 100);
        const sanitizedEmail = email?.trim().toLowerCase();

        if (!sanitizedName || !sanitizedEmail || !password || !role) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        if (!validateName(sanitizedName)) {
            return NextResponse.json({ error: "Invalid name format" }, { status: 400 });
        }

        if (!validateEmail(sanitizedEmail)) {
            return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
        }

        if (password.length < 6) {
            return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
        }

        if (role !== "manager" && role !== "cashier") {
            return NextResponse.json({ error: "Invalid role specified" }, { status: 400 });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

        // Use service role to bypass auth.user RLS and email confirmations
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: { persistSession: false, autoRefreshToken: false }
        });

        // Create the global auth user
        const { data: authData, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
            email: sanitizedEmail,
            password: password,
            user_metadata: { name: sanitizedName, full_name: sanitizedName },
            email_confirm: true
        });

        if (createUserError) {
            return NextResponse.json({ error: createUserError.message }, { status: 400 });
        }

        if (!authData.user) {
            return NextResponse.json({ error: "Failed to create user record" }, { status: 500 });
        }

        // Link the user to the restaurant
        const { error: linkError } = await supabaseAdmin
            .from("restaurant_users")
            .insert({
                restaurant_id: id,
                user_id: authData.user.id,
                role: role
            });

        if (linkError) {
            // In a robust system we might cleanup the auth user here if link fails,
            // but for this phase we'll return the error clearly.
            // If code hits 23505 (unique violation), they are already a member
            if (linkError.code === "23505") {
                return NextResponse.json({ error: "User is already a member of this restaurant" }, { status: 400 });
            }
            return NextResponse.json({ error: linkError.message }, { status: 500 });
        }

        return NextResponse.json({ message: "Staff created successfully", user_id: authData.user.id }, { status: 201 });

    } catch (err: any) {
        console.error("Staff creation error:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
