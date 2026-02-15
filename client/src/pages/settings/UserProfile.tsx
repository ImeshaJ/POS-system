import { useEffect, useMemo, useState } from "react"
import PageTitle from "@/components/common/PageTitle"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/lib/authContext"
import type { AuthUser } from "@/lib/authContext"
import { apiPatch } from "@/lib/api"

const accountFields = [
  { label: "Username", key: "username" as const, editable: true },
  { label: "Email", key: "email" as const, editable: true },
  { label: "Role", key: "role" as const, editable: false },
]

function formatDate(value?: string) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.valueOf())) return "—"
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

type EditableKey = "username" | "email"

const editableKeys = new Set<EditableKey>(["username", "email"])

export default function UserProfile() {
  const { user, token, setAuth } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null)
  const [formData, setFormData] = useState(() => ({
    username: user?.username ?? "",
    email: user?.email ?? "",
  }))

  // If user is not loaded, show a loading state
  if (!user) {
    return <div className="p-6">Loading...</div>;
  }

  useEffect(() => {
    if (!user) return
    setFormData({ username: user.username, email: user.email })
  }, [user?.username, user?.email])

  const hasChanges = useMemo(() => {
    if (!user) return false
    return formData.username !== user.username || formData.email !== user.email
  }, [formData, user])

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target
    if (!editableKeys.has(name as EditableKey)) return
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleCancel = () => {
    if (user) {
      setFormData({ username: user.username, email: user.email })
    }
    setIsEditing(false)
    setSaving(false)
    setFeedback(null)
  }

  const handleSave = async () => {
    if (!user) return
    if (!hasChanges) {
      setIsEditing(false)
      return
    }

    if (!formData.username.trim()) {
      setFeedback({ type: "error", message: "Username cannot be empty." })
      return
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailPattern.test(formData.email.trim())) {
      setFeedback({ type: "error", message: "Please enter a valid email address." })
      return
    }

    const payload: Partial<Record<EditableKey, string>> = {}
    if (formData.username !== user.username) {
      payload.username = formData.username.trim()
    }
    if (formData.email !== user.email) {
      payload.email = formData.email.trim()
    }

    if (!Object.keys(payload).length) {
      setFeedback({ type: "error", message: "No changes detected." })
      return
    }

    try {
      setSaving(true)
      setFeedback(null)
      const response = await apiPatch<{ user: AuthUser }>("/api/auth/me", payload)
      const updatedUser = response.data.user

      if (updatedUser) {
        if (token) {
          setAuth(updatedUser, token)
        }
        setFormData({ username: updatedUser.username, email: updatedUser.email })
        setFeedback({ type: "success", message: "Profile updated successfully." })
        setIsEditing(false)
      } else {
        setFeedback({ type: "error", message: "No user data returned from server." })
      }
    } catch (error: any) {
      // Try to show a more specific error if available
      let message = ""
      if (error?.response?.data?.message) {
        message = error.response.data.message
      } else if (typeof error?.message === "string") {
        // Show only user-friendly errors, not technical ones
        if (error.message.includes("username") && error.message.includes("exists")) {
          message = "This username is already taken."
        } else if (error.message.includes("email") && error.message.includes("exists")) {
          message = "This email is already registered."
        }
      }
      if (message) {
        setFeedback({ type: "error", message })
      } else {
        setFeedback(null)
      }
    } finally {
      setSaving(false)
    }
  }

  if (!user) {
    return (
      <div className="p-6">
        <PageTitle title="User Profile" />
        <Card>
          <CardHeader>
            <CardTitle>No user data found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              We could not load your profile details. Please sign in again to continue.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageTitle title="User Profile" subtitle="View the information associated with your account." />

      <Card>
        <CardHeader className="gap-4 sm:flex sm:items-center sm:justify-between">
          <CardTitle>Account Overview</CardTitle>
          {isEditing ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCancel}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="rounded-lg bg-[#002366] px-4 py-2 text-sm font-semibold text-white shadow hover:bg-[#001b4d] disabled:opacity-60"
                disabled={saving || !hasChanges}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Edit
            </button>
          )}
        </CardHeader>
        {feedback && (
          <div
            className={`mx-6 -mt-2 rounded-lg border px-4 py-2 text-sm ${feedback.type === "success" ? "border-green-200 bg-green-50 text-green-700" : "border-red-200 bg-red-50 text-red-700"}`}
          >
            {feedback.message}
          </div>
        )}
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            {accountFields.map(({ label, key, editable }) => (
              <div key={key} className="rounded-xl border border-gray-100 bg-gray-50/50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
                {isEditing && editable ? (
                  <input
                    name={key}
                    value={formData[key as EditableKey]}
                    onChange={handleInputChange}
                    className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-900 focus:border-[#002366] focus:outline-none focus:ring-2 focus:ring-[#002366]/20"
                  />
                ) : (
                  <p className="text-lg font-semibold text-gray-900 mt-1">{user[key] || "—"}</p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Registration Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-gray-100 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">User ID</p>
              <p className="text-lg font-semibold text-gray-900 mt-1">#{user.id}</p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Registered On</p>
              <p className="text-lg font-semibold text-gray-900 mt-1">{formatDate(user.created_at)}</p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Last Updated</p>
              <p className="text-lg font-semibold text-gray-900 mt-1">{formatDate(user.updated_at)}</p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Status</p>
              <p className="text-lg font-semibold text-gray-900 mt-1">Active</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
