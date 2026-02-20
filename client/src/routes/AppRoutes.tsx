import { lazy, Suspense } from "react"

import { Routes, Route } from "react-router-dom"
import AppLayout from "@/components/layout/AppLayout"
import { AuthProvider } from "@/lib/AuthProvider"
import ProtectedRoute from "@/components/auth/ProtectedRoute"


const Splash = lazy(() => import("../pages/auth/Splash"))
const AddService = lazy(() => import("@/pages/services/AddService"))
const Login = lazy(() => import("@/pages/auth/Login"))
const Register = lazy(() => import("@/pages/auth/Register"))
const ResetPassword = lazy(() => import("@/pages/auth/ResetPassword"))
const NewSale = lazy(() => import("@/pages/sales/NewSale"))

import SalesList from "@/pages/sales/SalesList"
import SalesReturn from "@/pages/sales/SalesReturn"
import SalesInvoice from "@/pages/sales/SalesInvoice"
import SalesReceipt80mm from "@/pages/sales/SalesReceipt80mm"
import NewPurchase from "@/pages/purchases/NewPurchase"
import PurchaseAddProduct from "@/pages/purchases/AddProduct"
import PurchaseList from "@/pages/purchases/PurchaseList"
import PurchaseDetail from "@/pages/purchases/PurchaseDetail"
import PurchaseReturn from "@/pages/purchases/PurchaseReturn"
import LowStock from "@/pages/purchases/LowStock"
import ExpiryAlerts from "@/pages/purchases/ExpiryAlerts"
import PetsList from "@/pages/clientsPets/PetsList"
import MedicalHistory from "@/pages/clientsPets/MedicalHistory"
import DueClients from "@/pages/clientsPets/DueClients"
import AppointmentList from "@/pages/appointments/AppointmentList"
import CalendarView from "@/pages/appointments/CalendarView"
import StaffSchedule from "@/pages/appointments/StaffSchedule"
import ProductRevenue from "@/pages/revenue/ProductRevenue"
import ServiceRevenue from "@/pages/revenue/ServiceRevenue"
import AddExpense from "@/pages/expenses/AddExpense"
import ExpenseList from "@/pages/expenses/ExpenseList"
import VatRates from "@/pages/vat/VatRates_new"
import EmployeeList from "@/pages/salary/EmployeeList"
import SalaryReport from "@/pages/salary/SalaryReport"
import SalaryStructure from "@/pages/salary/SalaryStructure"
import ExpenseReport from "@/pages/reports/ExpenseReport"
import RevenueReport from "@/pages/reports/RevenueReport"
import Dashboard from "@/pages/dashboard/Dashboard"
import StockReport from "@/pages/reports/StockReport"
import PurchaseReport from "@/pages/reports/PurchaseReport"
import SalesReport from "@/pages/reports/SalesReport"
import ReturnHistory from "@/pages/reports/ReturnHistory"
import VatReport from "@/pages/reports/VatReport"
import ServicesReport from "@/pages/reports/ServicesReport"
import ProfitLossReport from "@/pages/reports/ProfitLossReport"
import BackupRestore from "@/pages/settings/BackupRestore"
import UserRoles from "@/pages/settings/UsersRoles"
import ShopInfo from "@/pages/settings/ShopInfo"
import Notifications from "@/pages/settings/Notifications"
import SupplierList from "@/pages/suppliers/SupplierList"
import SupplierDue from "@/pages/suppliers/SupplierDue"
import SupplierPayments from "@/pages/suppliers/SupplierPayments"
import CatBoarding from "@/pages/services/CatBoarding"
import PetGrooming from "@/pages/services/PetGrooming"
import SurgeryServices from "@/pages/services/SurgeryServices"
import PhysiotherapyServices from "@/pages/services/PhysiotherapyServices"
import HospitalizationServices from "@/pages/services/HospitalizationServices"
import RecycleBin from "@/pages/settings/RecycleBin"
import StaffDashboard from "@/pages/dashboard/StaffDashboard"
import ClientsList from "@/pages/clientsPets/ClientsList"
import UserProfile from "@/pages/settings/UserProfile"
function AppRoutes() {
	return (
		<AuthProvider>
			<Suspense fallback={<div>Loading...</div>}>
				<Routes>
					<Route path="/" element={<Splash />} />
					<Route path="/login" element={<Login />} />
					<Route path="/register" element={<Register />} />
					<Route path="/reset-password" element={<ResetPassword />} />
					<Route element={<ProtectedRoute />}>
						<Route element={<AppLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/dashboard/staff" element={<StaffDashboard />} />
							<Route path="/sales/new" element={<NewSale />} />
							<Route path="/sales/list" element={<SalesList />} />
							<Route path="/sales/return" element={<SalesReturn />} />
							
							<Route path="/purchases/new" element={<NewPurchase />} />
							<Route path="/purchases/add" element={<PurchaseAddProduct />} />
							<Route path="/purchases/:id" element={<PurchaseDetail />} />
							<Route path="/purchases/list" element={<PurchaseList />} />
							
							<Route path="/purchases/return" element={<PurchaseReturn />} />
							
							
							
							<Route path="/purchases/low" element={<LowStock />} />
							<Route path="/purchases/expiry" element={<ExpiryAlerts />} />
							<Route path="/pets/list" element={<PetsList />} />
							<Route path="/medical-history" element={<MedicalHistory />} />
							<Route path="/clients/due" element={<DueClients />} />
							<Route path="/clients/list" element={<ClientsList />} />

							<Route path="/appointments/calendar" element={<CalendarView />} />
							<Route path="/appointments/staff" element={<StaffSchedule />} />
							<Route path="/revenue/products" element={<ProductRevenue />} />
							<Route path="/revenue/services" element={<ServiceRevenue />} />
							<Route path="/expenses/add" element={<AddExpense />} />
							<Route path="/expenses/list" element={<ExpenseList />} />
							<Route path="/vat/rates" element={<VatRates />} />
						
						
							<Route path="/salary/employees" element={<EmployeeList />} />
							<Route path="/salary/report" element={<SalaryReport />} />
							<Route path="/salary/structure" element={<SalaryStructure />} />
						
							
							<Route path="/reports/expense" element={<ExpenseReport />} />
							<Route path="/reports/revenue" element={<RevenueReport />} />
							<Route path="/reports/stock" element={<StockReport />} />
							<Route path="/reports/purchase" element={<PurchaseReport />} />
							<Route path="/reports/sales" element={<SalesReport />} />
							<Route path="/reports/returns" element={<ReturnHistory />} />
							<Route path="/reports/salary" element={<SalaryReport />} />
							<Route path="/reports/vat" element={<VatReport />} />
							<Route path="/reports/services" element={<ServicesReport />} />
							<Route path="/reports/profitloss" element={<ProfitLossReport />} />
							<Route path="/settings/backup" element={<BackupRestore />} />
							<Route path="/settings/users" element={<UserRoles />} />
							<Route path="/settings/shop" element={<ShopInfo />} />
							<Route path="/settings/recycle-bin" element={<RecycleBin />} />
							<Route path="/settings/notifications" element={<Notifications />} />
							<Route path="/sales/invoice/:invoiceNo" element={<SalesInvoice />} />
							<Route path="/appointments/list" element={<AppointmentList />} />
							<Route path="/suppliers/list" element={<SupplierList />} />
							<Route path="/suppliers/due" element={<SupplierDue />} />
							<Route path="/suppliers/payments" element={<SupplierPayments />} />
							<Route path="/sales/receipt-80mm" element={<SalesReceipt80mm />} />
							<Route path="/services/new" element={<AddService />} />
							<Route path="/services/add" element={<AddService />} />

							<Route path="/services/boarding" element={<CatBoarding />} />
							<Route path="/services/grooming" element={<PetGrooming />} />
							<Route path="/services/surgery" element={<SurgeryServices />} />
							<Route path="/services/physiotherapy" element={<PhysiotherapyServices />} />
							<Route path="/services/hospitalization" element={<HospitalizationServices />} />
              <Route path="/settings/profile" element={<UserProfile />} />
						</Route>
					</Route>
				</Routes>
			</Suspense>
		</AuthProvider>
	)
}

export default AppRoutes;


