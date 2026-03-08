"use client";

import { useState } from "react";
import { Users, UserPlus, Lock, Shield, X, ShieldAlert, BadgeCheck, AlertCircle, Trash2, Check, UserMinus, Link as LinkIcon, History, Copy } from "lucide-react";
import { useRouter } from "next/navigation";

export type StaffMember = {
    id: string;
    user_id: string;
    role: string;
    email: string;
    name: string;
};

export type Invitation = {
    id: string;
    role: string;
    status: string;
    consumed_email: string | null;
    consumed_full_name: string | null;
    expires_at: string;
    created_at: string;
};

type Props = {
    restaurantId: string;
    currentUserId: string;
    staff: StaffMember[];
    invitations: {
        pending_invites: Invitation[];
        pending_approvals: Invitation[];
        approved: Invitation[];
        rejected: Invitation[];
    } | null;
    isOwner: boolean;
};

export default function StaffManager({ restaurantId, currentUserId, staff, invitations, isOwner }: Props) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formOpen, setFormOpen] = useState(false);
    const [errorLine, setErrorLine] = useState("");
    const [successLine, setSuccessLine] = useState("");

    const [inviteResult, setInviteResult] = useState<{ url: string, expires: string } | null>(null);

    const [formData, setFormData] = useState({
        role: "cashier"
    });

    const totals = {
        team: staff.length,
        managers: staff.filter(s => s.role === "manager").length,
        cashiers: staff.filter(s => s.role === "cashier").length,
        pending: invitations?.pending_approvals.length || 0
    };

    function startInvite() {
        setFormOpen(true);
        setErrorLine("");
        setSuccessLine("");
        setInviteResult(null);
        setFormData({ role: "cashier" });
    }

    async function handleGenerateInvite() {
        setErrorLine("");
        setSuccessLine("");

        if (!formData.role) {
            setErrorLine("Please select a role.");
            return;
        }

        setLoading(true);

        try {
            const res = await fetch(`/api/restaurants/${restaurantId}/staff/invitations`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ role: formData.role })
            });

            const body = await res.json();

            if (!res.ok) {
                setErrorLine(body.error || "Failed to generate invitation.");
                setLoading(false);
                return;
            }

            setInviteResult({ url: body.inviteUrl, expires: body.expiresAt });
            setSuccessLine("Invitation link generated successfully.");
            router.refresh();

        } catch {
            setErrorLine("A network error occurred.");
        }

        setLoading(false);
    }

    async function handleAction(action: 'approve' | 'reject', inviteId: string) {
        setLoading(true);
        setErrorLine("");
        
        try {
            const res = await fetch(`/api/restaurants/${restaurantId}/staff/invitations/${inviteId}/${action}`, {
                method: "POST"
            });

            const body = await res.json();
            if (!res.ok) {
                setErrorLine(body.error || `Failed to ${action} staff request.`);
            } else {
                setSuccessLine(`Successfully ${action}ed request.`);
                router.refresh();
            }
        } catch {
            setErrorLine("A network error occurred.");
        }
        setLoading(false);
    }

    async function handleDelete(member: StaffMember) {
        if (!window.confirm(`Are you sure you want to remove ${member.name} from the team? This will NOT delete their global account, only their access to this restaurant.`)) return;

        setErrorLine("");
        setSuccessLine("");
        setLoading(true);

        try {
            const res = await fetch(`/api/restaurants/${restaurantId}/staff/${member.user_id}`, {
                method: "DELETE"
            });

            const body = await res.json();

            if (!res.ok) {
                setErrorLine(body.error || "Failed to remove staff member.");
            } else {
                setSuccessLine("Staff member successfully removed.");
                router.refresh();
            }
        } catch {
            setErrorLine("A network error occurred while deleting.");
        }
        setLoading(false);
    }

    const copyInviteUrl = () => {
        if (inviteResult) {
            navigator.clipboard.writeText(inviteResult.url);
            alert("Invite URL copied to clipboard!");
        }
    };

    return (
        <div className="flex flex-col gap-6 max-w-5xl">
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Staff Management</h2>
                    <p className="text-neutral-500 text-sm">Manage team access and handle join requests.</p>
                </div>
                {isOwner && (
                    <button
                        onClick={startInvite}
                        className="flex items-center gap-2 px-4 py-2 bg-neutral-900 dark:bg-neutral-50 text-neutral-50 dark:text-neutral-900 rounded-full text-sm font-medium hover:scale-105 transition-transform"
                    >
                        <UserPlus className="w-4 h-4" /> Generate Invitation
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-2">
                <div className="p-4 border border-neutral-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-black">
                    <h3 className="text-xs font-semibold text-neutral-500 uppercase mb-1">Active Team</h3>
                    <div className="text-2xl font-bold text-neutral-800 dark:text-neutral-200">{totals.team}</div>
                </div>
                <div className="p-4 border border-neutral-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-black">
                    <h3 className="text-xs font-semibold text-neutral-500 uppercase mb-1">Managers</h3>
                    <div className="text-2xl font-bold text-neutral-800 dark:text-neutral-200">{totals.managers}</div>
                </div>
                <div className="p-4 border border-neutral-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-black">
                    <h3 className="text-xs font-semibold text-neutral-500 uppercase mb-1">Cashiers</h3>
                    <div className="text-2xl font-bold text-neutral-800 dark:text-neutral-200">{totals.cashiers}</div>
                </div>
                <div className="p-4 border border-blue-100 dark:border-blue-900/30 rounded-xl bg-blue-50/30 dark:bg-blue-950/10">
                    <h3 className="text-xs font-semibold text-blue-500 dark:text-blue-400 uppercase mb-1">Pending Approval</h3>
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totals.pending}</div>
                </div>
            </div>

            {successLine && (
                <div className="p-4 bg-green-50 dark:bg-green-900/10 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 rounded-xl text-sm font-medium flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <BadgeCheck className="w-4 h-4" />
                        {successLine}
                    </div>
                    <button onClick={() => setSuccessLine("")} className="text-green-600 opacity-50 hover:opacity-100"><X className="w-4 h-4"/></button>
                </div>
            )}

            {errorLine && (
                <div className="p-4 bg-red-50 dark:bg-red-900/10 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-xl text-sm font-medium flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        {errorLine}
                    </div>
                    <button onClick={() => setErrorLine("")} className="text-red-600 opacity-50 hover:opacity-100"><X className="w-4 h-4"/></button>
                </div>
            )}

            {formOpen && !inviteResult && (
                <div className="p-6 border border-neutral-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-black shadow-xl max-w-xl">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h3 className="font-bold text-lg">Create Staff Invitation</h3>
                            <p className="text-sm text-neutral-500">Generate a one-time link for new staff to join.</p>
                        </div>
                        <button onClick={() => setFormOpen(false)} className="text-neutral-400 hover:text-neutral-900 dark:hover:text-white"><X className="w-5 h-5" /></button>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2 flex items-center gap-1"><Shield className="w-3 h-3" /> Select Role</label>
                            <div className="grid grid-cols-2 gap-3">
                                <button 
                                    onClick={() => setFormData({ ...formData, role: 'manager' })}
                                    className={`p-4 rounded-xl border transition-all text-left ${formData.role === 'manager' ? 'border-neutral-900 bg-neutral-50 dark:border-white dark:bg-neutral-900' : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-400'}`}
                                >
                                    <div className="font-bold text-sm">Manager</div>
                                    <div className="text-xs text-neutral-500 mt-1">Can manage menu, view reports, and manage orders.</div>
                                </button>
                                <button 
                                    onClick={() => setFormData({ ...formData, role: 'cashier' })}
                                    className={`p-4 rounded-xl border transition-all text-left ${formData.role === 'cashier' ? 'border-neutral-900 bg-neutral-50 dark:border-white dark:bg-neutral-900' : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-400'}`}
                                >
                                    <div className="font-bold text-sm">Cashier</div>
                                    <div className="text-xs text-neutral-500 mt-1">Limited to point of sale and order history.</div>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 mt-8">
                        <button disabled={loading} onClick={() => setFormOpen(false)} className="px-5 py-2 text-sm font-medium">Cancel</button>
                        <button disabled={loading || !formData.role} onClick={handleGenerateInvite} className="px-6 py-2 bg-neutral-900 dark:bg-neutral-50 text-neutral-50 dark:text-neutral-900 rounded-lg text-sm font-bold hover:scale-[1.02] transition-transform disabled:opacity-50">
                            {loading ? "Generating..." : "Generate Link"}
                        </button>
                    </div>
                </div>
            )}

            {inviteResult && (
                <div className="p-6 border-2 border-dashed border-green-500/30 rounded-xl bg-green-50/5 dark:bg-green-950/10 max-w-xl">
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-bold mb-4">
                        <LinkIcon className="w-5 h-5" /> Invitation Link Ready
                    </div>
                    <p className="text-sm text-neutral-500 mb-4">Share this link with your team member. They must sign in with Google to accept.</p>
                    
                    <div className="flex items-center gap-2 bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 p-3 rounded-lg group">
                        <input readOnly value={inviteResult.url} className="flex-1 bg-transparent text-sm outline-none border-none" />
                        <button onClick={copyInviteUrl} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-900 rounded-md transition-colors"><Copy className="w-4 h-4" /></button>
                    </div>
                    
                    <p className="text-[10px] text-neutral-500 mt-3 flex items-center gap-1 italic"><History className="w-3 h-3" /> Link expires in 7 days ({new Date(inviteResult.expires).toLocaleDateString()})</p>
                    
                    <button onClick={() => { setFormOpen(false); setInviteResult(null); }} className="mt-6 text-sm font-bold underline decoration-neutral-300 hover:decoration-neutral-900">Done, Link Shared</button>
                </div>
            )}

            {/* Pending Approvals Section */}
            {isOwner && invitations && invitations.pending_approvals.length > 0 && (
                <div className="border border-blue-200 dark:border-blue-900/30 rounded-xl bg-white dark:bg-black overflow-hidden">
                    <div className="px-6 py-4 bg-blue-500 text-white flex justify-between items-center">
                        <h3 className="font-bold flex items-center gap-2"><Lock className="w-4 h-4" /> Pending Staff Approvals</h3>
                        <span className="bg-white/20 px-2 py-0.5 rounded text-xs font-bold">{invitations.pending_approvals.length}</span>
                    </div>
                    <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
                        {invitations.pending_approvals.map((invite) => (
                            <div key={invite.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors">
                                <div className="flex gap-4 items-center">
                                    <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-lg shadow-inner">
                                        {invite.consumed_full_name?.slice(0, 1).toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                                            {invite.consumed_full_name}
                                            <span className="text-[10px] uppercase font-black bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-md border border-blue-200/50 dark:border-blue-800/50">{invite.role}</span>
                                        </div>
                                        <div className="text-sm text-neutral-500">{invite.consumed_email}</div>
                                        <div className="text-[10px] text-neutral-400 mt-1 flex items-center gap-1 uppercase tracking-tighter font-semibold">
                                            <History className="w-3 h-3" /> Requested on {new Date(invite.created_at).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 self-end md:self-center">
                                    <button 
                                        disabled={loading} 
                                        onClick={() => handleAction('reject', invite.id)}
                                        className="flex items-center gap-1.5 px-4 py-2 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm font-bold text-neutral-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all disabled:opacity-30"
                                    >
                                        <UserMinus className="w-4 h-4" /> Reject
                                    </button>
                                    <button 
                                        disabled={loading} 
                                        onClick={() => handleAction('approve', invite.id)}
                                        className="flex items-center gap-1.5 px-5 py-2 bg-neutral-900 dark:bg-neutral-50 text-neutral-50 dark:text-neutral-900 rounded-lg text-sm font-bold shadow-lg shadow-neutral-900/10 hover:scale-105 transition-all disabled:opacity-30"
                                    >
                                        <Check className="w-4 h-4" /> Approve
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-black overflow-hidden">
                <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 flex justify-between items-center">
                    <h3 className="font-semibold flex items-center gap-2"><Users className="w-4 h-4 text-neutral-500" /> Active Members</h3>
                    <span className="text-[10px] font-bold uppercase text-neutral-400 tracking-widest">{staff.length} Members</span>
                </div>

                <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
                    {staff.map((member) => (
                        <div key={member.id} className="p-4 flex justify-between items-center hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors group">
                            <div className="flex gap-4 items-center">
                                <div className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-sm font-bold text-neutral-500 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700">
                                    {member.name.slice(0, 1).toUpperCase()}
                                </div>
                                <div>
                                    <div className="font-semibold text-sm flex items-center gap-2">
                                        {member.name}
                                        {member.role === 'owner' && <span className="text-[10px] uppercase font-bold bg-neutral-200 dark:bg-neutral-800 px-1.5 py-0.5 rounded text-neutral-600 dark:text-neutral-300 flex items-center gap-1"><ShieldAlert className="w-3 h-3" /> Owner</span>}
                                    </div>
                                    <div className="text-sm text-neutral-500">{member.email}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] uppercase tracking-widest font-black text-neutral-400 border border-neutral-200 dark:border-neutral-800 px-2 py-0.5 rounded shadow-sm">{member.role}</span>

                                {member.user_id !== currentUserId && member.role !== 'owner' && isOwner && (
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-4">
                                        <button
                                            onClick={() => handleDelete(member)}
                                            className="p-1.5 text-neutral-400 hover:text-red-600 dark:hover:text-red-400 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                            title="Delete Staff"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Inactive/Pending/Historical Sections (Owner only) */}
            {isOwner && invitations && (invitations.pending_invites.length > 0 || invitations.rejected.length > 0) && (
                <div className="mt-8 space-y-6 opacity-60 hover:opacity-100 transition-opacity">
                    {invitations.pending_invites.length > 0 && (
                        <div>
                            <h4 className="text-xs font-bold uppercase tracking-widest text-neutral-500 mb-3 flex items-center gap-2"><LinkIcon className="w-3 h-3" /> Active Links ({invitations.pending_invites.length})</h4>
                            <div className="bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 rounded-xl divide-y divide-neutral-200 dark:divide-neutral-800">
                                {invitations.pending_invites.map(inv => (
                                    <div key={inv.id} className="p-3 flex justify-between items-center text-sm">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                            <span className="font-medium">{inv.role} invite</span>
                                        </div>
                                        <div className="text-xs text-neutral-400">Expires {new Date(inv.expires_at).toLocaleDateString()}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
