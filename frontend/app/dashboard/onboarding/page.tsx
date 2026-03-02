"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

export default function OnboardingPage() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  async function provision() {
    setError(null)
    const res = await fetch("/api/onboarding/provision", {
      method: "POST",
      headers: { "content-type": "application/json" },
      cache: "no-store",
    })

    if (!res.ok) {
      const text = await res.text()
      setError(text)
      return
    }

    startTransition(() => {
      router.replace("/dashboard")
      router.refresh()
    })
  }

  return (
    <div style={{ padding: "1rem", display: "grid", gap: "0.75rem", maxWidth: 520 }}>
      <h2 style={{ margin: 0 }}>Restova Dashboard</h2>
      <div style={{ color: "#666" }}>Finish setup to continue.</div>

      <button
        type="button"
        onClick={provision}
        disabled={pending}
        style={{
          padding: "0.75rem 1rem",
          borderRadius: 10,
          border: "1px solid #eaeaea",
          background: "white",
          cursor: pending ? "not-allowed" : "pointer",
        }}
      >
        {pending ? "Provisioning..." : "Create my restaurant"}
      </button>

      {error ? (
        <pre style={{ whiteSpace: "pre-wrap", padding: "0.75rem", border: "1px solid #f3caca", borderRadius: 10 }}>
          {error}
        </pre>
      ) : null}
    </div>
  )
}