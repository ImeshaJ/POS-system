import { useState } from "react"
import { NavLink } from "react-router-dom"
import { ChevronDown, Menu, X } from "lucide-react"
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  Calendar,
  Settings,
} from "lucide-react"
import { useAuth } from "@/lib/authContext"
import logoImg from "../../assets/images/logo.png"

const menuItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  {
    label: "Sales",
    icon: ShoppingCart,
    submenu: [
      { label: "New Sale", path: "/sales/new" },
      { label: "Sales List", path: "/sales/list" },
      { label: "Sales Return", path: "/sales/return" },
      
    ],
  },
  {
    label: "Purchases",
    icon: Package,
    submenu: [
      { label: "New Purchase", path: "/purchases/new" },
      { label: "Purchase Return", path: "/purchases/return" },
      { label: "Purchases List", path: "/purchases/list" },
      { label: "Add Product", path: "/purchases/add" },
      { label: "Low Stock", path: "/purchases/low" },
      { label: "Expiry Alerts", path: "/purchases/expiry" },
    ],
  },
  {
    label: "Clients & Pets",
    icon: Users,
    submenu: [
      { label: "Clients", path: "/clients/list" },
      { label: "Pets", path: "/pets/list" },
      { label: "Medical History", path: "/medical-history" },
      { label: "Due Clients", path: "/clients/due" },
    ],
  },
  {
    label: "Appointments",
    icon: Calendar,
    submenu: [
      { label: "Appointment List", path: "/appointments/list" },
      { label: "Appointment Calendar", path: "/appointments/calendar" },
      { label: "Staff Schedule", path: "/appointments/staff" },
    ],
  },
  {
    label: "Suppliers",
    icon: Package,
    submenu: [
      { label: "Suppliers List", path: "/suppliers/list" },
      { label: "Supplier Due", path: "/suppliers/due" },
      { label: "Supplier Payments", path: "/suppliers/payments" },
    ],
  },
  {
    label: "Services",
    icon: Package,
    submenu: [
      { label: "Add Service", path: "/services/add" },
      { label: "Pet Grooming", path: "/services/grooming" },
      { label: "Cat Boarding", path: "/services/boarding" },
      { label: "Surgery Programs", path: "/services/surgery" },
      { label: "Physiotherapy", path: "/services/physiotherapy" },
      { label: "Hospitalization", path: "/services/hospitalization" },
    ],
  },
  {
    label: "Reports",
    icon: Package,
    submenu: [
      { label: "Expense Report", path: "/reports/expense" },
      { label: "Revenue Report", path: "/reports/revenue" },
      { label: "Stock Report", path: "/reports/stock" },
      { label: "Purchase Report", path: "/reports/purchase" },
      { label: "Sales Report", path: "/reports/sales" },
      { label: "Return History", path: "/reports/returns" },
      { label: "Salary Report", path: "/reports/salary" },
      { label: "VAT Report", path: "/reports/vat" },
      { label: "Services Report", path: "/reports/services" },
      { label: "Profit & Loss", path: "/reports/profitloss" },
    ],
  },
  {
    label: "Settings",
    icon: Settings,
    submenu: [
      { label: "Backup & Restore", path: "/settings/backup" },
      { label: "Users & Roles", path: "/settings/users" },
      { label: "Shop Info", path: "/settings/shop" },
      { label: "Recycle Bin", path: "/settings/recycle-bin" },
      { label: "Notifications", path: "/settings/notifications" },
    ],
  },
  {
    label: "VAT",
    icon: Package,
    submenu: [
      { label: "VAT Rates", path: "/vat/rates" },
      { label: "VAT Report", path: "/reports/vat" },
    ],
  },
  {
    label: "Expenses",
    icon: Package,
    submenu: [
      { label: "Add Expense", path: "/expenses/add" },
      { label: "Expense List", path: "/expenses/list" },
      { label: "Expense Report", path: "/reports/expense" },
    ],
  },
  {
    label: "Revenue",
    icon: Package,
    submenu: [
      { label: "Product Revenue", path: "/revenue/products" },
      { label: "Service Revenue", path: "/revenue/services" },
      { label: "Revenue Report", path: "/reports/revenue" },
    ],
  },
  {
    label: "Salary",
    icon: Package,
    submenu: [
      { label: "Employee List", path: "/salary/employees" },
      { label: "Salary Report", path: "/salary/report" },
      { label: "Salary Structure", path: "/salary/structure" },
    ],
  },
]

const staffMenuItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard/staff" },
  {
    label: "Sales",
    icon: ShoppingCart,
    submenu: [
      { label: "New Sale", path: "/sales/new" },
      { label: "Sales List", path: "/sales/list" },
      { label: "Sales Return", path: "/sales/return" },
    ],
  },
  {
    label: "Purchases",
    icon: Package,
    submenu: [
      { label: "New Purchase", path: "/purchases/new" },
      { label: "Purchase Return", path: "/purchases/return" },
      { label: "Purchases List", path: "/purchases/list" },
      { label: "Add Product", path: "/purchases/add" },
      { label: "Low Stock", path: "/purchases/low" },
      { label: "Expiry Alerts", path: "/purchases/expiry" },
    ],
  },
  {
    label: "Clients & Pets",
    icon: Users,
    submenu: [
      { label: "Clients", path: "/clients/list" },
      { label: "Pets", path: "/pets/list" },
      { label: "Medical History", path: "/medical-history" },
      { label: "Due Clients", path: "/clients/due" },
    ],
  },
  {
    label: "Appointments",
    icon: Calendar,
    submenu: [
      { label: "Appointment List", path: "/appointments/list" },
      { label: "Appointment Calendar", path: "/appointments/calendar" },
      { label: "Staff Schedule", path: "/appointments/staff" },
    ],
  },
  {
    label: "Services",
    icon: Package,
    submenu: [
      { label: "Add Service", path: "/services/add" },
      { label: "Pet Grooming", path: "/services/grooming" },
      { label: "Cat Boarding", path: "/services/boarding" },
      { label: "Surgery Programs", path: "/services/surgery" },
      { label: "Physiotherapy", path: "/services/physiotherapy" },
      { label: "Hospitalization", path: "/services/hospitalization" },
    ],
  },
  {
    label: "Settings",
    icon: Settings,
    submenu: [
      { label: "Notifications", path: "/settings/notifications" },
    ],
  },
]

export default function Sidebar() {
  const { role } = useAuth()
  const [isOpen, setIsOpen] = useState(true)
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null)


  const items = role === "staff" ? staffMenuItems : menuItems

  const toggleMenu = (label: string) => {
    setExpandedMenu(expandedMenu === label ? null : label)
  }

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden bg-[#002366] text-white p-2 rounded shadow-lg hover:bg-[#001f58]"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-screen w-64 bg-linear-to-b from-[#002366] to-[#001f58] text-white shadow-xl transition-transform duration-300 z-40 lg:relative lg:translate-x-0 overflow-y-auto ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo/Brand */}
        <div className="p-6 border-b border-[#004080] sticky top-0 bg-linear-to-b from-[#002366] to-[#001f58]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-linear-to-br from-[#6a11cb] to-[#2575fc] rounded-full flex items-center justify-center shadow-md">
              <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center">
                <img
                  src={logoImg}
                  alt="Logo"
                  className="w-7 h-7 object-contain rounded-full"
                />
              </div>
            </div>
            <div className="flex flex-col justify-center ml-2">
              <h1 className="text-lg font-bold leading-tight">Furry Friends</h1>
              <p className="text-xs text-[#b3d9ff] leading-tight">Vet Clinic POS</p>
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <nav className="py-4">
          {items.map((item) => (
            <div key={item.label}>
              {!item.submenu ? (
                <NavLink
                  to={item.path || "#"}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-6 py-3 transition-all duration-150 ${
                      isActive
                        ? "bg-[#004080] border-l-4 border-[#6a11cb] text-white shadow-md"
                        : "text-[#b3d9ff] hover:bg-[#003d66] hover:text-white"
                    }`
                  }
                  onClick={() => setIsOpen(false)}
                >
                  <item.icon size={18} />
                  <span className="text-sm font-medium">{item.label}</span>
                </NavLink>
              ) : (
                <>
                  <button
                    onClick={() => toggleMenu(item.label)}
                    className="w-full flex items-center justify-between px-6 py-3 text-[#b3d9ff] hover:bg-[#003d66] hover:text-white transition-all duration-150"
                  >
                    <div className="flex items-center gap-3">
                      <item.icon size={18} />
                      <span className="text-sm font-medium">{item.label}</span>
                    </div>
                    <ChevronDown
                      size={16}
                      className={`transition-transform duration-200 ${
                        expandedMenu === item.label ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {/* Submenu */}
                  {expandedMenu === item.label && item.submenu && (
                    <div className="bg-[#001f58] border-l-2 border-[#004080] animate-in slide-in-from-top-2">
                      {item.submenu.map((subitem) => (
                        <NavLink
                          key={subitem.path}
                          to={subitem.path}
                          className={({ isActive }) =>
                            `block px-12 py-2.5 text-xs transition-all duration-150 ${
                              isActive
                                ? "bg-[#004080] text-[#b3d9ff] font-semibold border-l-2 border-[#6a11cb]"
                                : "text-[#8fb3d9] hover:text-white hover:bg-[#003d66]"
                            }`
                          }
                          onClick={() => setIsOpen(false)}
                        >
                          {subitem.label}
                        </NavLink>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </nav>


      </aside>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  )
}
