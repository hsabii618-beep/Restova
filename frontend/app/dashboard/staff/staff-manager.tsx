"use client";

import { useState } from "react";
import { Users, UserPlus, Mail, Lock, Shield, X, Save, ShieldAlert, BadgeCheck, AlertCircle, Edit2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

export type StaffMember = {
    id: string;
    user_id: string;
    role: string;
    email: string;
    name: string;
};

type Props = {
    restaurantId: string;
    currentUserId: string;
    staff: StaffMember[];
};

export default function StaffManager({ restaurantId, currentUserId, staff }: Props) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formOpen, setFormOpen] = useState(false);
    const [errorLine, setErrorLine] = useState("");
    const [successLine, setSuccessLine] = useState("");

    const [editingUser, setEditingUser] = useState<StaffMember | null>(null);

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        role: ""
    });

    const totals = {
        team: staff.length,
        managers: staff.filter(s => s.role === "manager").length,
        cashiers: staff.filter(s => s.role === "cashier").length,
    };

    function startCreate() {
        setFormOpen(true);
        setEditingUser(null);
        setErrorLine("");
        setSuccessLine("");
        setFormData({ name: "", email: "", password: "", role: "" });
    }

    function startEdit(member: StaffMember) {
        setFormOpen(true);
        setEditingUser(member);
        setErrorLine("");
        setSuccessLine("");
        setFormData({ name: member.name, email: member.email, password: "", role: member.role });
    }

    async function handleSaveStaff() {
        setErrorLine("");
        setSuccessLine("");

        if (!formData.name.trim() || !formData.email.trim() || !formData.role) {
            setErrorLine("Name, email, and role are required.");
            return;
        }
        if (!editingUser && !formData.password) {
            setErrorLine("A temporary password is required for new staff.");
            return;
        }

        if (formData.role === "owner") {
            setErrorLine("You cannot assign the owner role through this form.");
            return;
        }

        setLoading(true);

        try {
            let res;
            if (editingUser) {
                res = await fetch(`/api/restaurants/${restaurantId}/staff/${editingUser.user_id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        name: formData.name,
                        email: formData.email,
                        role: formData.role,
                        password: formData.password || undefined // send password only if typed
                    })
                });
            } else {
                res = await fetch(`/api/restaurants/${restaurantId}/staff`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(formData)
                });
            }

            const body = await res.json();

            if (!res.ok) {
                setErrorLine(body.error || "Failed to save staff member.");
                setLoading(false);
                return;
            }

            setSuccessLine(`Staff member successfully ${editingUser ? "updated" : "created"}.`);
            setFormData({ name: "", email: "", password: "", role: "" });
            setFormOpen(false);
            setEditingUser(null);

            // Refresh SSR payload seamlessly
            router.refresh();

        } catch (err: any) {
            setErrorLine("A network error occurred.");
        }

        setLoading(false);
    }

    async function handleDelete(member: StaffMember) {
        if (!window.confirm(`Are you sure you want to remove ${member.name} from the team?`)) return;

        setErrorLine("");
        setSuccessLine("");
        setLoading(true);

        try {
            const res = await fetch(`/api/restaurants/${restaurantId}/staff/${member.user_id}`, {
                method: "DELETE"
            });

            const body = await res.json();

            if (!res.ok) {
                setErrorLine(body.error || "Failed to delete staff member.");
                setLoading(false);
                return;
            }

            setSuccessLine("Staff member successfully removed.");
            if (editingUser?.user_id === member.user_id) {
                setFormOpen(false);
                setEditingUser(null);
            }
            router.refresh();
        } catch (err: any) {
            setErrorLine("A network error occurred while deleting.");
        }
        setLoading(false);
    }

    return (
        <div className="flex flex-col gap-6 max-w-5xl">
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Staff & Roles</h2>
                    <p className="text-neutral-500">Manage team access and permissions.</p>
                </div>
                <button
                    onClick={startCreate}
                    className="flex items-center gap-2 px-4 py-2 bg-neutral-900 dark:bg-neutral-50 text-neutral-50 dark:text-neutral-900 rounded-full text-sm font-medium hover:scale-105 transition-transform"
                >
                    <UserPlus className="w-4 h-4" /> Invite Staff
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
                <div className="p-6 border border-neutral-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-black">
                    <h3 className="text-sm font-medium text-neutral-500 mb-1">Total Team</h3>
                    <div className="text-2xl font-bold text-neutral-800 dark:text-neutral-200">{totals.team}</div>
                </div>
                <div className="p-6 border border-neutral-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-black">
                    <h3 className="text-sm font-medium text-neutral-500 mb-1">Managers</h3>
                    <div className="text-2xl font-bold text-neutral-800 dark:text-neutral-200">{totals.managers}</div>
                </div>
                <div className="p-6 border border-neutral-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-black">
                    <h3 className="text-sm font-medium text-neutral-500 mb-1">Cashiers</h3>
                    <div className="text-2xl font-bold text-neutral-800 dark:text-neutral-200">{totals.cashiers}</div>
                </div>
            </div>

            {successLine && (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 rounded-xl text-sm font-medium flex items-center gap-2">
                    <BadgeCheck className="w-4 h-4" />
                    {successLine}
                </div>
            )}

            {formOpen && (
                <div className="p-6 border border-neutral-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-black flex flex-col gap-4">
                    <div className="flex justify-between items-center mb-2">
                        <div className="font-semibold text-lg tracking-tight">{editingUser ? "Edit Staff Member" : "Create Staff Member"}</div>
                        <button onClick={() => setFormOpen(false)} className="text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"><X className="w-5 h-5" /></button>
                    </div>

                    {errorLine && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800/30 rounded-lg text-sm flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" /> {errorLine}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1 flex items-center gap-1"><UserPlus className="w-3 h-3" /> Full Name</label>
                            <input type="text" value={formData.name} maxLength={100} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-neutral-400" placeholder="Jane Doe" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1 flex items-center gap-1"><Mail className="w-3 h-3" /> Email</label>
                            <input type="email" value={formData.email} maxLength={255} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-neutral-400" placeholder="jane@example.com" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1 flex items-center gap-1"><Lock className="w-3 h-3" /> {editingUser ? "New Password (Optional)" : "Temporary Password"}</label>
                            <input type="text" value={formData.password} maxLength={72} onChange={e => setFormData({ ...formData, password: e.target.value })} className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-neutral-400" placeholder={editingUser ? "Leave blank to keep current" : "Secret!"} />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1 flex items-center gap-1"><Shield className="w-3 h-3" /> Role</label>
                            <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })} className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-neutral-400">
                                <option value="" disabled>Select Role...</option>
                                <option value="manager">Manager</option>
                                <option value="cashier">Cashier</option>
                            </select>
                            <p className="text-[10px] text-neutral-500 mt-1 italic">Owners cannot assign the owner role.</p>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-800">
                        <button disabled={loading} onClick={() => setFormOpen(false)} className="px-4 py-2 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 rounded-lg text-sm font-medium hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors">Cancel</button>
                        <button disabled={loading} onClick={handleSaveStaff} className="flex items-center gap-2 px-5 py-2 bg-neutral-900 dark:bg-neutral-50 text-neutral-50 dark:text-neutral-900 rounded-lg text-sm font-medium hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:cursor-not-allowed">
                            {loading ? "Saving..." : <><Save className="w-4 h-4" /> {editingUser ? "Save Changes" : "Create Account"}</>}
                        </button>
                    </div>
                </div>
            )}

            <div className="p-0 border border-neutral-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-black overflow-hidden relative">
                <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 flex justify-between items-center">
                    <h3 className="font-semibold flex items-center gap-2"><Users className="w-4 h-4 text-neutral-500" /> Active Members</h3>
                </div>

                {staff.length === 0 ? (
                    <div className="p-6 flex flex-col items-center justify-center h-48 text-sm text-neutral-500 italic">
                        <Users className="w-8 h-8 mb-2 opacity-30" />
                        Loading staff profiles...
                    </div>
                ) : (
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
                                    <span className="text-xs uppercase tracking-wider font-bold text-neutral-400 border border-neutral-200 dark:border-neutral-800 px-2 flex py-1 rounded-md">{member.role}</span>

                                    {member.user_id !== currentUserId && member.role !== 'owner' && (
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-4">
                                            <button
                                                onClick={() => startEdit(member)}
                                                className="p-1.5 text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors"
                                                title="Edit Staff"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
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
                )}
            </div>
        </div>
    );
}
