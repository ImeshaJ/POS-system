import { Outlet } from "react-router-dom"
import Sidebar from "./Sidebar"
import Header from "./Header"

export default function AppLayout() {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />

      <div className="flex-1 flex flex-col lg:ml-0">
        <Header />

        <main className="flex-1 overflow-y-auto p-4 lg:p-6 bg-linear-to-br from-gray-50 to-gray-100">
          <Outlet />
        </main>
      </div>
    </div>
  )
}