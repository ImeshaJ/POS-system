import { LogOut, Bell } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/lib/authContext"
import { useToast } from "@/components/common/Toast"
import { ConfirmDialog } from "@/components/common/ConfirmDialog"
import { useState } from "react"

const Header = () => {
  const navigate = useNavigate()
  const { user, clearAuth } = useAuth()
  const toast = useToast()
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false)

  // Prevent rendering if user is not loaded yet
  if (!user) {
    return null
  }

  const handleLogoutConfirm = () => {
    clearAuth()
    navigate('/login')
    setLogoutDialogOpen(false)
  }

  const initial = (user.username || user.email || "U").charAt(0).toUpperCase()
  const displayName = user.username || user.email || "User"
  const displayRole = user.role ? user.role[0].toUpperCase() + user.role.slice(1) : "User"

  return (
    <header className="bg-white shadow-md px-4 lg:px-6 py-4 flex items-center justify-end sticky top-0 z-20">
      {/* Right Side */}
      <div className="flex items-center gap-3 lg:gap-4">
        {/* Notifications */}
        <button
          className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-200"
          onClick={() => toast.info("Notifications coming soon")}
          title="Notifications"
        >
          <Bell size={20} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        {/* Divider */}
        <div className="h-6 w-px bg-gray-200 hidden sm:block" />

        {/* User Info */}
        <button
          type="button"
          onClick={() => navigate("/settings/profile")}
          className="flex items-center gap-2 lg:gap-3 rounded-lg px-2 py-1 transition-colors duration-200 hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#002366]"
          title="View profile"
        >
          <div className="hidden sm:flex flex-col items-end leading-tight text-left">
            <p className="text-sm font-semibold text-gray-800 leading-none">
              {displayName}
            </p>
            <p className="text-xs text-gray-500 leading-none mt-1">
              {displayRole}
            </p>
          </div>
          <div className="h-10 w-10 rounded-full bg-linear-to-br from-[#6a11cb] to-[#2575fc]
                          flex items-center justify-center text-white font-bold text-sm shadow-md">
            {initial}
          </div>
        </button>

        {/* Logout */}
        <button
          onClick={() => setLogoutDialogOpen(true)}
          className="hidden sm:flex items-center gap-2 h-10 px-3 rounded-lg
                     text-sm font-medium text-red-600 hover:bg-red-50
                     transition-all duration-200"
          title="Logout"
        >
          <LogOut size={18} />
        </button>
      </div>

      <ConfirmDialog
        open={logoutDialogOpen}
        onOpenChange={setLogoutDialogOpen}
        title="Log out"
        description="Are you sure you want to log out?"
        onConfirm={handleLogoutConfirm}
        variant="danger"
        confirmText="Log out"
      />
    </header>
  )
}

export default Header