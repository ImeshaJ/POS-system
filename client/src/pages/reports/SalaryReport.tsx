import PageTitle from "@/components/common/PageTitle"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Users, Briefcase, DollarSign, Search, Download } from "lucide-react"
import { useState } from "react"

const salaries = [
  { name: "Dr. Silva (Vet)", position: "Veterinarian", salary: 150000 },
  { name: "Dr. Perera (Vet)", position: "Veterinarian", salary: 145000 },
  { name: "Nurse Jayasena", position: "Nursing Assistant", salary: 65000 },
  { name: "Receptionist Jane", position: "Receptionist", salary: 45000 },
  { name: "Groomer Suresh", position: "Pet Groomer", salary: 55000 },
]

export default function SalaryReport() {
  const [searchTerm, setSearchTerm] = useState("")
  const total = salaries.reduce((s, e) => s + e.salary, 0)
  const avgSalary = (total / salaries.length).toFixed(0)
  const maxSalary = Math.max(...salaries.map(s => s.salary))

  const filteredSalaries = salaries.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.position.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const downloadReport = () => {
    const csvContent = [
      ["Salary Report - " + new Date().toLocaleDateString()],
      [],
      ["Employee Name", "Position", "Salary (Rs.)"],
      ...filteredSalaries.map(s => [s.name, s.position, s.salary.toLocaleString()]),
      [],
      ["Total Payroll", "", total.toLocaleString()],
      ["Average Salary", "", avgSalary],
    ]
      .map(row => row.join(","))
      .join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "Salary-Report.csv"
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <PageTitle title="Salary Report" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Payroll</p>
                <p className="text-3xl font-bold text-cyan-600">Rs. {total.toLocaleString()}</p>
              </div>
              <DollarSign className="h-12 w-12 text-cyan-200" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Average Salary</p>
                <p className="text-3xl font-bold text-teal-600">Rs. {avgSalary}</p>
              </div>
              <Users className="h-12 w-12 text-teal-200" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Employees</p>
                <p className="text-3xl font-bold text-indigo-600">{salaries.length}</p>
              </div>
              <Briefcase className="h-12 w-12 text-indigo-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Staff Salary Details</CardTitle>
            <CardDescription>Monthly salary breakdown by employee</CardDescription>
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search employee/position..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500"
              />
            </div>
            <button
              onClick={downloadReport}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-semibold transition-colors"
            >
              <Download className="h-4 w-4" />
              Download
            </button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 bg-gray-50">
                  <th className="text-left py-3 px-4 font-semibold">Employee Name</th>
                  <th className="text-left py-3 px-4 font-semibold">Position</th>
                  <th className="text-right py-3 px-4 font-semibold">Salary</th>
                  <th className="text-right py-3 px-4 font-semibold">% of Total</th>
                </tr>
              </thead>
              <tbody>
                {filteredSalaries.map((s, i) => (
                  <tr key={i} className="border-b hover:bg-cyan-50 transition-colors">
                    <td className="py-3 px-4 font-medium">{s.name}</td>
                    <td className="py-3 px-4 text-gray-600">{s.position}</td>
                    <td className="py-3 px-4 text-right font-semibold text-cyan-600">Rs. {s.salary.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right text-gray-600">{((s.salary/total)*100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-cyan-50 font-bold">
                  <td colSpan={2} className="py-3 px-4">Total Payroll</td>
                  <td className="py-3 px-4 text-right text-cyan-700">Rs. {total.toLocaleString()}</td>
                  <td className="py-3 px-4 text-right text-cyan-700">100%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Salary Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-cyan-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Highest Salary</p>
              <p className="text-2xl font-bold text-cyan-700">Rs. {maxSalary.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-2">Senior veterinarian position</p>
            </div>
            <div className="p-4 bg-indigo-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Total Monthly Payroll</p>
              <p className="text-2xl font-bold text-indigo-700">Rs. {total.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-2">For {salaries.length} employees</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
