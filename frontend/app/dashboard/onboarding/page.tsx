"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

export default function OnboardingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")

  const generateSlug = (val: string) => val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value)
    if (!slug || e.target.value.length > 2) {
      setSlug(generateSlug(e.target.value))
    }
  }

  async function provision(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/onboarding/provision", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name.trim(), slug: slug.trim() }),
        cache: "no-store",
      })

      if (!res.ok) {
        let text = "Server error"
        try {
          const json = await res.json()
          text = json.error || JSON.stringify(json)
        } catch {
          text = await res.text()
        }
        setError(text || "Provisioning failed")
        setLoading(false)
        return
      }

      router.replace("/dashboard")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error")
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: "1rem", display: "grid", gap: "1.5rem", maxWidth: 520 }}>
      <header>
        <h2 style={{ margin: 0, marginBottom: "0.5rem" }}>Restova Dashboard</h2>
        <div style={{ color: "var(--color-text-muted)" }}>Finish setup to continue.</div>
      </header>

      <form onSubmit={provision} style={{ display: "grid", gap: "1rem" }}>
        <div style={{ display: "grid", gap: "0.25rem" }}>
          <label htmlFor="name" style={{ fontSize: "0.9rem", fontWeight: "bold" }}>Restaurant Name</label>
          <input
            id="name"
            value={name}
            onChange={handleNameChange}
            type="text"
            placeholder="e.g. Burger King"
            required
            maxLength={100}
            style={{ padding: "0.75rem", borderRadius: 8, border: "1px solid var(--color-border-default)" }}
          />
        </div>

        <div style={{ display: "grid", gap: "0.25rem" }}>
          <label htmlFor="slug" style={{ fontSize: "0.9rem", fontWeight: "bold" }}>URL Slug</label>
          <input
            id="slug"
            value={slug}
            onChange={(e) => setSlug(generateSlug(e.target.value))}
            type="text"
            placeholder="e.g. burger-king"
            required
            maxLength={30}
            style={{ padding: "0.75rem", borderRadius: 8, border: "1px solid var(--color-border-default)" }}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "0.75rem 1rem",
            borderRadius: 10,
            border: "1px solid var(--color-border-default)",
            background: "var(--color-brand-primary)",
            color: "white",
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.7 : 1,
            fontWeight: "bold",
            marginTop: "0.5rem"
          }}
        >
          {loading ? "Submitting..." : "Submit for Approval"}
        </button>

        {error && (
          <div style={{ whiteSpace: "pre-wrap", padding: "0.75rem", border: "1px solid var(--color-border-error)", borderRadius: 10, color: "var(--color-error)" }}>
            {error}
          </div>
        )}
      </form>
    </div>
  )
}