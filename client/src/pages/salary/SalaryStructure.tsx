import { useEffect, useMemo, useState } from "react"
import PageTitle from "@/components/common/PageTitle"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  ArrowUpRight,
  ClipboardCheck,
  Download,
  LayoutTemplate,
  Layers3,
  PenSquare,
  Plus,
  Sparkles,
  Trash2,
  Wallet,
} from "lucide-react"

type SalaryStructureConfig = {
  id: string
  designation: string
  basicSalary: number
  dearness: number
  houseRent: number
  medicalAllowance: number
  specialAllowance: number
  providentFund: number
  taxDeduction: number
  insuranceDeduction: number
  otherDeduction: number
  createdAt: string
  updatedAt: string
}

type AllowanceFieldKey = "dearness" | "houseRent" | "medicalAllowance" | "specialAllowance"
type DeductionFieldKey = "providentFund" | "taxDeduction" | "insuranceDeduction" | "otherDeduction"
type NumericFieldKey = "basicSalary" | AllowanceFieldKey | DeductionFieldKey

type Html2PdfModule = typeof import("html2pdf.js")
let html2pdfLoader: Promise<Html2PdfModule["default"]> | null = null

async function loadHtml2Pdf() {
  if (!html2pdfLoader) {
    html2pdfLoader = import("html2pdf.js").then((mod) => mod.default)
  }
  return html2pdfLoader
}

const blankStructure = (): SalaryStructureConfig => ({
  id: "",
  designation: "",
  basicSalary: 0,
  dearness: 0,
  houseRent: 0,
  medicalAllowance: 0,
  specialAllowance: 0,
  providentFund: 0,
  taxDeduction: 0,
  insuranceDeduction: 0,
  otherDeduction: 0,
  createdAt: "",
  updatedAt: "",
})

const ALLOWANCE_FIELDS: Array<{ key: AllowanceFieldKey; label: string }> = [
  { key: "dearness", label: "Dearness allowance" },
  { key: "houseRent", label: "House rent allowance" },
  { key: "medicalAllowance", label: "Medical allowance" },
  { key: "specialAllowance", label: "Special allowance" },
]

const DEDUCTION_FIELDS: Array<{ key: DeductionFieldKey; label: string }> = [
  { key: "providentFund", label: "Provident fund" },
  { key: "taxDeduction", label: "Tax deduction" },
  { key: "insuranceDeduction", label: "Insurance deduction" },
  { key: "otherDeduction", label: "Other deduction" },
]

const formatCurrency = (value: number) => `Rs. ${value.toLocaleString()}`

const getAllowanceTotal = (structure: SalaryStructureConfig) =>
  structure.dearness + structure.houseRent + structure.medicalAllowance + structure.specialAllowance

const getDeductionTotal = (structure: SalaryStructureConfig) =>
  structure.providentFund + structure.taxDeduction + structure.insuranceDeduction + structure.otherDeduction

const getGrossSalary = (structure: SalaryStructureConfig) => structure.basicSalary + getAllowanceTotal(structure)

const getNetSalary = (structure: SalaryStructureConfig) => getGrossSalary(structure) - getDeductionTotal(structure)

export default function SalaryStructure() {
  const [structures, setStructures] = useState<SalaryStructureConfig[]>(() => {
    const saved = localStorage.getItem("salaryStructures")
    if (!saved) {
      return []
    }
    try {
      return JSON.parse(saved) as SalaryStructureConfig[]
    } catch (error) {
      console.error("Failed to parse salary structures", error)
      return []
    }
  })
  const [formData, setFormData] = useState<SalaryStructureConfig>(blankStructure())
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [search, setSearch] = useState("")

  useEffect(() => {
    localStorage.setItem("salaryStructures", JSON.stringify(structures))
  }, [structures])

  const filteredStructures = useMemo(() => {
    if (!search.trim()) {
      return structures
    }
    const query = search.trim().toLowerCase()
    return structures.filter((structure) =>
      structure.designation.toLowerCase().includes(query) || structure.id.toLowerCase().includes(query)
    )
  }, [structures, search])

  const totalGross = structures.reduce((sum, structure) => sum + getGrossSalary(structure), 0)
  const totalNet = structures.reduce((sum, structure) => sum + getNetSalary(structure), 0)
  const heroMetrics = [
    {
      label: "Structures defined",
      value: structures.length ? structures.length : "—",
      hint: structures.length ? "Blueprints ready" : "No templates yet",
      gradient: "from-[#0f172a] via-[#1d4ed8] to-[#7c3aed]",
      icon: LayoutTemplate,
    },
    {
      label: "Avg gross blueprint",
      value: structures.length ? formatCurrency(Math.round(totalGross / structures.length)) : "Rs. 0",
      hint: "Base + allowances",
      gradient: "from-[#134e4a] to-[#10b981]",
      icon: Wallet,
    },
    {
      label: "Avg net payout",
      value: structures.length ? formatCurrency(Math.round(totalNet / structures.length)) : "Rs. 0",
      hint: "After deductions",
      gradient: "from-[#4c0519] to-[#e11d48]",
      icon: Sparkles,
    },
    {
      label: "Highest blueprint",
      value: structures.length
        ? formatCurrency(
            Math.max(
              ...structures.map((structure) => Math.max(getNetSalary(structure), 0))
            )
          )
        : "Rs. 0",
      hint: structures.length ? "Top of range" : "Define first structure",
      gradient: "from-[#0f172a] to-[#38bdf8]",
      icon: ArrowUpRight,
    },
  ]

  const filteredGross = filteredStructures.reduce((sum, structure) => sum + getGrossSalary(structure), 0)
  const filteredNet = filteredStructures.reduce((sum, structure) => sum + getNetSalary(structure), 0)
  const filteredAllowances = filteredStructures.reduce((sum, structure) => sum + getAllowanceTotal(structure), 0)
  const filteredDeductions = filteredStructures.reduce((sum, structure) => sum + getDeductionTotal(structure), 0)

  function handleNumericField(field: NumericFieldKey, value: number) {
    setFormData((prev) => ({
      ...prev,
      [field]: Number.isNaN(value) ? 0 : value,
    }))
  }

  function handleNewStructure() {
    setFormData(blankStructure())
    setEditingId(null)
    setShowForm(true)
  }

  function handleEdit(structure: SalaryStructureConfig) {
    setFormData(structure)
    setEditingId(structure.id)
    setShowForm(true)
  }

  function handleDelete(id: string) {
    if (!window.confirm("Delete this salary structure?")) {
      return
    }
    const updated = structures.filter((structure) => structure.id !== id)
    setStructures(updated)
    alert("Salary structure deleted ✅")
  }

  function resetForm() {
    setFormData(blankStructure())
    setEditingId(null)
    setShowForm(false)
  }

  function handleSaveStructure(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!formData.designation.trim() || formData.basicSalary <= 0) {
      alert("Provide a designation and base salary before saving.")
      return
    }

    if (editingId) {
      const updated = structures.map((structure) =>
        structure.id === editingId
          ? {
              ...formData,
              id: editingId,
              createdAt: structure.createdAt,
              updatedAt: new Date().toISOString(),
            }
          : structure
      )
      setStructures(updated)
      alert("Salary structure updated ✅")
    } else {
      const nextId =
        structures.length > 0
          ? Math.max(...structures.map((structure) => Number(structure.id.replace(/\D/g, "")) || 0)) + 1
          : 1
      const timestamp = new Date().toISOString()
      const newStructure: SalaryStructureConfig = {
        ...formData,
        id: `SS-${String(nextId).padStart(4, "0")}`,
        createdAt: timestamp,
        updatedAt: timestamp,
      }
      setStructures([newStructure, ...structures])
      alert("Salary structure created ✅")
    }

    resetForm()
  }

  async function downloadStructurePDF(structure: SalaryStructureConfig) {
    const totalAllow = getAllowanceTotal(structure)
    const totalDeduct = getDeductionTotal(structure)
    const gross = getGrossSalary(structure)
    const net = getNetSalary(structure)

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 900px; margin: 0 auto;">
        <div style="border: 2px solid #333; padding: 20px; text-align: center; margin-bottom: 30px;">
          <h1 style="margin: 0 0 10px 0; color: #1a3a52;">FURRY FRIENDS VETERINARY CLINIC</h1>
          <h2 style="margin: 0; color: #2c5282; font-size: 18px;">SALARY STRUCTURE DOCUMENT</h2>
          <p style="margin: 10px 0 0 0; color: #666; font-size: 12px;">Generated: ${new Date().toLocaleDateString()}</p>
        </div>

        <div style="margin-bottom: 30px;">
          <h3 style="background-color: #2c5282; color: white; padding: 10px; margin: 0 0 15px 0; font-size: 14px;">EMPLOYEE DETAILS</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold; width: 30%;">Designation</td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">${structure.designation}</td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold; width: 30%;">Structure ID</td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">${structure.id}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold;">Created Date</td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">${structure.createdAt ? new Date(structure.createdAt).toLocaleDateString() : "—"}</td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold;">Last Updated</td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">${structure.updatedAt ? new Date(structure.updatedAt).toLocaleDateString() : "—"}</td>
            </tr>
          </table>
        </div>

        <div style="margin-bottom: 30px;">
          <h3 style="background-color: #2c5282; color: white; padding: 10px; margin: 0 0 15px 0; font-size: 14px;">EARNINGS COMPONENTS</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="background-color: #f0f4f8;">
              <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Component</td>
              <td style="padding: 10px; border: 1px solid #ddd; text-align: right; font-weight: bold;">Amount (Rs.)</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;">Basic Salary</td>
              <td style="padding: 10px; border: 1px solid #ddd; text-align: right; font-weight: bold;">${structure.basicSalary.toLocaleString()}</td>
            </tr>
            <tr style="background-color: #f9fafb;">
              <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Allowances:</td>
              <td style="padding: 10px; border: 1px solid #ddd;"></td>
            </tr>
            <tr>
              <td style="padding: 10px 10px 10px 30px; border: 1px solid #ddd;">• Dearness Allowance</td>
              <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">${structure.dearness.toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding: 10px 10px 10px 30px; border: 1px solid #ddd;">• House Rent Allowance</td>
              <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">${structure.houseRent.toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding: 10px 10px 10px 30px; border: 1px solid #ddd;">• Medical Allowance</td>
              <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">${structure.medicalAllowance.toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding: 10px 10px 10px 30px; border: 1px solid #ddd;">• Special Allowance</td>
              <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">${structure.specialAllowance.toLocaleString()}</td>
            </tr>
            <tr style="background-color: #dbeafe;">
              <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Total Allowances</td>
              <td style="padding: 10px; border: 1px solid #ddd; text-align: right; font-weight: bold; color: #16a34a;">${totalAllow.toLocaleString()}</td>
            </tr>
            <tr style="background-color: #dbeafe;">
              <td style="padding: 15px; border: 2px solid #1e3a8a; font-weight: bold; font-size: 14px;">GROSS SALARY</td>
              <td style="padding: 15px; border: 2px solid #1e3a8a; text-align: right; font-weight: bold; font-size: 14px; color: #1e40af;">Rs. ${gross.toLocaleString()}</td>
            </tr>
          </table>
        </div>

        <div style="margin-bottom: 30px;">
          <h3 style="background-color: #2c5282; color: white; padding: 10px; margin: 0 0 15px 0; font-size: 14px;">DEDUCTION COMPONENTS</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="background-color: #f0f4f8;">
              <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Component</td>
              <td style="padding: 10px; border: 1px solid #ddd; text-align: right; font-weight: bold;">Amount (Rs.)</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;">• Provident Fund</td>
              <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">${structure.providentFund.toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;">• Tax Deduction</td>
              <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">${structure.taxDeduction.toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;">• Insurance Deduction</td>
              <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">${structure.insuranceDeduction.toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;">• Other Deduction</td>
              <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">${structure.otherDeduction.toLocaleString()}</td>
            </tr>
            <tr style="background-color: #fee2e2;">
              <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Total Deductions</td>
              <td style="padding: 10px; border: 1px solid #ddd; text-align: right; font-weight: bold; color: #dc2626;">Rs. ${totalDeduct.toLocaleString()}</td>
            </tr>
            <tr style="background-color: #f3e8ff;">
              <td style="padding: 15px; border: 2px solid #6b21a8; font-weight: bold; font-size: 14px;">NET SALARY (Monthly)</td>
              <td style="padding: 15px; border: 2px solid #6b21a8; text-align: right; font-weight: bold; font-size: 14px; color: #7c3aed;">Rs. ${net.toLocaleString()}</td>
            </tr>
          </table>
        </div>

        <div style="margin-bottom: 30px; background-color: #f0fdf4; padding: 15px; border-left: 4px solid #16a34a;">
          <h3 style="margin: 0 0 15px 0; color: #15803d; font-size: 14px;">ANNUAL SUMMARY</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px; font-weight: bold; width: 50%;">Annual Gross Salary</td>
              <td style="padding: 8px; text-align: right; color: #16a34a; font-weight: bold;">Rs. ${(gross * 12).toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding: 8px; font-weight: bold;">Annual Deductions</td>
              <td style="padding: 8px; text-align: right; color: #dc2626; font-weight: bold;">Rs. ${(totalDeduct * 12).toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding: 12px; font-weight: bold; background-color: #dbeafe; border-top: 2px solid #0284c7;">Annual Net Salary</td>
              <td style="padding: 12px; text-align: right; color: #0369a1; font-weight: bold; background-color: #dbeafe; border-top: 2px solid #0284c7; font-size: 14px;">Rs. ${(net * 12).toLocaleString()}</td>
            </tr>
          </table>
        </div>

        <div style="border-top: 2px solid #1e3a8a; padding-top: 20px; margin-top: 20px; font-size: 11px; color: #666; text-align: center;">
          <p style="margin: 0 0 10px 0;"><strong>This is an official salary structure document for ${structure.designation}</strong></p>
          <p style="margin: 0 0 10px 0;">Applicable from ${structure.createdAt ? new Date(structure.createdAt).toLocaleDateString() : "—"}</p>
          <p style="margin: 0; color: #999;">Approved by Management | Confidential</p>
          <p style="margin: 10px 0 0 0; color: #999;">Furry Friends Veterinary Clinic</p>
        </div>
      </div>
    `

    const element = document.createElement("div")
    element.innerHTML = htmlContent

    const opt = {
      margin: 10,
      filename: `salary_structure_${structure.designation.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`,
      image: { type: "jpeg" as const, quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { orientation: "portrait" as const, unit: "mm", format: "a4" },
    }

    const html2pdf = await loadHtml2Pdf()
    html2pdf().set(opt).from(element).save()
  }

  async function downloadAllStructuresPDF() {
    let htmlContent = `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 1000px; margin: 0 auto;">
        <div style="border: 2px solid #333; padding: 20px; text-align: center; margin-bottom: 30px;">
          <h1 style="margin: 0 0 10px 0; color: #1a3a52;">FURRY FRIENDS VETERINARY CLINIC</h1>
          <h2 style="margin: 0; color: #2c5282; font-size: 18px;">ALL SALARY STRUCTURES REPORT</h2>
          <p style="margin: 10px 0 0 0; color: #666; font-size: 12px;">Generated: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
        </div>
    `

    structures.forEach((structure, index) => {
      const totalAllow = getAllowanceTotal(structure)
      const totalDeduct = getDeductionTotal(structure)
      const gross = getGrossSalary(structure)
      const net = getNetSalary(structure)

      htmlContent += `
        <div style="page-break-inside: avoid; margin-bottom: 30px; border: 1px solid #ccc; padding: 15px;">
          <h3 style="background-color: #2c5282; color: white; padding: 10px; margin: 0 0 15px 0; font-size: 14px;">${index + 1}. ${structure.designation}</h3>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 12px;">
            <tr style="background-color: #f0f4f8;">
              <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; width: 30%;">Structure ID</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${structure.id}</td>
              <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Created</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${structure.createdAt ? new Date(structure.createdAt).toLocaleDateString() : "—"}</td>
            </tr>
          </table>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 12px;">
            <tr style="background-color: #f0f4f8;">
              <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Component</td>
              <td style="padding: 8px; border: 1px solid #ddd; text-align: right; font-weight: bold;">Amount (Rs.)</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;">Basic Salary</td>
              <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${structure.basicSalary.toLocaleString()}</td>
            </tr>
            <tr style="background-color: #f9fafb;">
              <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Total Allowances</td>
              <td style="padding: 8px; border: 1px solid #ddd; text-align: right; color: #16a34a; font-weight: bold;">+Rs. ${totalAllow.toLocaleString()}</td>
            </tr>
            <tr style="background-color: #dbeafe;">
              <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">GROSS SALARY</td>
              <td style="padding: 10px; border: 1px solid #ddd; text-align: right; font-weight: bold; color: #1e40af;">Rs. ${gross.toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Total Deductions</td>
              <td style="padding: 8px; border: 1px solid #ddd; text-align: right; color: #dc2626; font-weight: bold;">-Rs. ${totalDeduct.toLocaleString()}</td>
            </tr>
            <tr style="background-color: #f3e8ff;">
              <td style="padding: 10px; border: 2px solid #6b21a8; font-weight: bold;">NET SALARY (Monthly)</td>
              <td style="padding: 10px; border: 2px solid #6b21a8; text-align: right; font-weight: bold; color: #7c3aed;">Rs. ${net.toLocaleString()}</td>
            </tr>
            <tr style="background-color: #fef3c7;">
              <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Annual Net Salary</td>
              <td style="padding: 8px; border: 1px solid #ddd; text-align: right; font-weight: bold; color: #b45309;">Rs. ${(net * 12).toLocaleString()}</td>
            </tr>
          </table>
        </div>
      `
    })

    const totalGlobalGross = structures.reduce((sum, structure) => sum + getGrossSalary(structure), 0)
    const totalGlobalDeductions = structures.reduce((sum, structure) => sum + getDeductionTotal(structure), 0)
    const totalGlobalNet = totalGlobalGross - totalGlobalDeductions

    htmlContent += `
      <div style="border: 2px solid #1e3a8a; padding: 20px; margin-top: 30px; background-color: #dbeafe;">
        <h3 style="margin: 0 0 15px 0; color: #0c2d48; font-size: 16px;">OVERALL SUMMARY</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 10px; font-weight: bold; width: 60%;">Total Salary Structures</td>
            <td style="padding: 10px; text-align: right; font-weight: bold; color: #1e40af; font-size: 14px;">${structures.length}</td>
          </tr>
          <tr style="background-color: #bfdbfe;">
            <td style="padding: 10px; font-weight: bold;">Total Monthly Gross Salary</td>
            <td style="padding: 10px; text-align: right; font-weight: bold; color: #16a34a; font-size: 14px;">Rs. ${totalGlobalGross.toLocaleString()}</td>
          </tr>
          <tr>
            <td style="padding: 10px; font-weight: bold;">Total Monthly Deductions</td>
            <td style="padding: 10px; text-align: right; font-weight: bold; color: #dc2626; font-size: 14px;">Rs. ${totalGlobalDeductions.toLocaleString()}</td>
          </tr>
          <tr style="background-color: #c7d2fe;">
            <td style="padding: 12px; font-weight: bold; font-size: 14px;">Total Monthly Net Payroll</td>
            <td style="padding: 12px; text-align: right; font-weight: bold; color: #7c3aed; font-size: 16px;">Rs. ${totalGlobalNet.toLocaleString()}</td>
          </tr>
          <tr>
            <td style="padding: 10px; font-weight: bold;">Total Annual Gross Salary</td>
            <td style="padding: 10px; text-align: right; font-weight: bold; color: #16a34a; font-size: 14px;">Rs. ${(totalGlobalGross * 12).toLocaleString()}</td>
          </tr>
          <tr style="background-color: #c7d2fe;">
            <td style="padding: 12px; font-weight: bold; font-size: 14px;">Total Annual Net Payroll</td>
            <td style="padding: 12px; text-align: right; font-weight: bold; color: #7c3aed; font-size: 16px;">Rs. ${(totalGlobalNet * 12).toLocaleString()}</td>
          </tr>
        </table>
      </div>

      <div style="border-top: 2px solid #1e3a8a; padding-top: 20px; margin-top: 30px; font-size: 11px; color: #666; text-align: center;">
        <p style="margin: 0 0 10px 0;"><strong>This is an official payroll summary document</strong></p>
        <p style="margin: 0 0 10px 0;">Document generated on ${new Date().toLocaleDateString()}</p>
        <p style="margin: 0; color: #999;">Approved by Management | Confidential</p>
        <p style="margin: 10px 0 0 0; color: #999;">Furry Friends Veterinary Clinic</p>
      </div>
      </div>
    `

    const element = document.createElement("div")
    element.innerHTML = htmlContent

    const opt = {
      margin: 10,
      filename: `all_salary_structures_${new Date().toISOString().split("T")[0]}.pdf`,
      image: { type: "jpeg" as const, quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { orientation: "portrait" as const, unit: "mm", format: "a4" },
    }

    const html2pdf = await loadHtml2Pdf()
    html2pdf().set(opt).from(element).save()
  }

  return (
    <div className="space-y-6">
      <PageTitle title="Salary Structure Management" />

      <Card className="brand-card brand-card-hover overflow-hidden">
        <CardContent className="p-0">
          <div className="bg-linear-to-r from-[#0f172a] via-[#1d4ed8] to-[#7c3aed] p-6 text-white">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/70">Compensation blueprint</p>
                <h2 className="text-3xl font-bold">Salary architecture</h2>
                <p className="text-sm text-white/80">Hero metrics, neon console, and pdf-ready ledgers to mirror the new payroll DNA.</p>
              </div>
              <div className="flex flex-col items-end gap-3 text-right">
                <Badge className="brand-pill border border-white/30 bg-white/10 text-white">
                  {structures.length ? `${structures.length} structures` : "No records yet"}
                </Badge>
                <Button onClick={showForm ? resetForm : handleNewStructure} className="rounded-2xl bg-white/90 px-5 py-2 text-[#0f172a] hover:bg-white">
                  <Plus className="mr-2 h-4 w-4" /> {showForm ? "Close builder" : "Launch builder"}
                </Button>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2 xl:grid-cols-4">
            {heroMetrics.map(({ label, value, hint, gradient, icon: Icon }) => (
              <div key={label} className={`rounded-2xl border border-white/10 bg-linear-to-br ${gradient} p-4 text-white shadow-lg`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-white/70">{label}</p>
                    <p className="mt-2 text-2xl font-bold">{value}</p>
                    <p className="text-xs text-white/80">{hint}</p>
                  </div>
                  <span className="rounded-2xl bg-white/20 p-2">
                    <Icon className="h-5 w-5" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="brand-card brand-card-hover">
        <CardContent className="space-y-4 p-6">
          <div className="flex items-start gap-3">
            <span className="rounded-2xl bg-muted/60 p-2 text-primary">
              <Layers3 className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Structure console</p>
              <h2 className="text-2xl font-bold text-foreground">Filters & actions</h2>
              <p className="text-sm text-muted-foreground">Search tiers, open the builder, or push pdf packets straight from the cockpit.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground">Search designation</Label>
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="e.g. Senior Vet" className="h-11 rounded-2xl" />
            </div>
            <div className="flex items-end gap-3">
              <Button variant="outline" onClick={() => setSearch("")} className="h-11 flex-1 rounded-2xl border-dashed">
                Reset search
              </Button>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <Button onClick={handleNewStructure} className="h-11 flex-1 rounded-2xl bg-[#0f172a] text-white">
                <PenSquare className="mr-2 h-4 w-4" /> New structure
              </Button>
              <Button onClick={downloadAllStructuresPDF} disabled={!structures.length} className="h-11 flex-1 rounded-2xl bg-[#15803d] text-white disabled:cursor-not-allowed disabled:opacity-60">
                <Download className="mr-2 h-4 w-4" /> Download all
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {showForm && (
        <Card className="brand-card brand-card-hover">
          <CardContent className="space-y-6 p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="rounded-2xl bg-muted/60 p-2 text-primary">
                  <ClipboardCheck className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{editingId ? "Edit structure" : "Create structure"}</p>
                  <h2 className="text-2xl font-bold text-foreground">Compensation builder</h2>
                  <p className="text-sm text-muted-foreground">One intake for base, allowances, deductions, net previews, and ledger-ready IDs.</p>
                </div>
              </div>
              <Badge className="brand-pill border border-primary/20 bg-primary/5 text-primary">
                {editingId ? `Editing · ${editingId}` : structures.length ? `Next ID · SS-${String(structures.length + 1).padStart(4, "0")}` : "Next ID · SS-0001"}
              </Badge>
            </div>

            <form className="space-y-6" onSubmit={handleSaveStructure}>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-foreground">Designation*</Label>
                  <Input value={formData.designation} onChange={(event) => setFormData((prev) => ({ ...prev, designation: event.target.value }))} placeholder="e.g. Lead Surgeon" className="h-12 rounded-2xl" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-foreground">Basic salary (Rs.)*</Label>
                  <Input type="number" min={0} value={formData.basicSalary} onChange={(event) => handleNumericField("basicSalary", Number(event.target.value))} className="h-12 rounded-2xl" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-foreground">Net preview</Label>
                  <Input readOnly value={formatCurrency(getNetSalary(formData))} className="h-12 rounded-2xl font-semibold" />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Allowance stack</p>
                    <p className="text-xs text-muted-foreground">Travel, housing, medical, or incentive top ups.</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {ALLOWANCE_FIELDS.map(({ key, label }) => (
                    <div key={key} className="space-y-2">
                      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
                      <Input type="number" min={0} value={formData[key]} onChange={(event) => handleNumericField(key, Number(event.target.value))} className="h-11 rounded-2xl" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Deductions stack</p>
                    <p className="text-xs text-muted-foreground">Compliance, insurance, or other offsets.</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {DEDUCTION_FIELDS.map(({ key, label }) => (
                    <div key={key} className="space-y-2">
                      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
                      <Input type="number" min={0} value={formData[key]} onChange={(event) => handleNumericField(key, Number(event.target.value))} className="h-11 rounded-2xl" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Basic</p>
                    <p className="text-lg font-semibold text-foreground">{formatCurrency(formData.basicSalary)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Allowances</p>
                    <p className="text-lg font-semibold text-emerald-600">+{formatCurrency(getAllowanceTotal(formData))}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Gross</p>
                    <p className="text-lg font-semibold text-[#1d4ed8]">{formatCurrency(getGrossSalary(formData))}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Deductions</p>
                    <p className="text-lg font-semibold text-rose-600">-{formatCurrency(getDeductionTotal(formData))}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Net monthly</p>
                    <p className="text-lg font-bold text-[#0f172a]">{formatCurrency(getNetSalary(formData))}</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button type="submit" className="flex-1 rounded-2xl bg-[#0f172a] text-white hover:bg-[#020617]">
                  <ClipboardCheck className="mr-2 h-4 w-4" /> {editingId ? "Update structure" : "Save structure"}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm} className="rounded-2xl border-border/60">
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {filteredStructures.length > 0 && (
        <Card className="brand-card brand-card-hover">
          <CardContent className="space-y-4 p-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Gross volume</p>
                <p className="mt-2 text-2xl font-bold text-foreground">{formatCurrency(filteredGross)}</p>
                <p className="text-xs text-muted-foreground">Across filtered records</p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Allowances</p>
                <p className="mt-2 text-2xl font-bold text-emerald-600">+{formatCurrency(filteredAllowances)}</p>
                <p className="text-xs text-muted-foreground">Additive incentive stack</p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Deductions</p>
                <p className="mt-2 text-2xl font-bold text-rose-600">-{formatCurrency(filteredDeductions)}</p>
                <p className="text-xs text-muted-foreground">Compliance offsets</p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Net payroll</p>
                <p className="mt-2 text-2xl font-bold text-[#0f172a]">{formatCurrency(filteredNet)}</p>
                <p className="text-xs text-muted-foreground">Current view</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="brand-card brand-card-hover">
        <CardContent className="space-y-4 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Salary structures</p>
              <h2 className="text-2xl font-bold text-foreground">Blueprint ledger</h2>
              <p className="text-sm text-muted-foreground">Same neon tables as sales—inline edits, pdf drops, and confident numbers.</p>
            </div>
            <Badge className="brand-pill border border-[#fee2e2] bg-[#fee2e2]/60 text-[#7f1d1d]">
              {filteredStructures.length ? `${filteredStructures.length} records` : "Awaiting entries"}
            </Badge>
          </div>

          <div className="rounded-3xl border border-border/40 bg-card">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-linear-to-r from-[#eef2ff] to-[#e0f2fe] text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                    <th className="px-4 py-3">Designation</th>
                    <th className="px-4 py-3 text-right">Basic</th>
                    <th className="px-4 py-3 text-right">Allowances</th>
                    <th className="px-4 py-3 text-right">Gross</th>
                    <th className="px-4 py-3 text-right">Deductions</th>
                    <th className="px-4 py-3 text-right">Net</th>
                    <th className="px-4 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStructures.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                        {structures.length === 0 ? "No salary structures yet" : "No results match the search."}
                      </td>
                    </tr>
                  ) : (
                    filteredStructures.map((structure, index) => {
                      const allowanceTotal = getAllowanceTotal(structure)
                      const deductionTotal = getDeductionTotal(structure)
                      const gross = getGrossSalary(structure)
                      const net = getNetSalary(structure)
                      return (
                        <tr key={structure.id} className={`border-b border-border/70 ${index % 2 === 0 ? "bg-card" : "bg-card/80"} transition hover:bg-muted/50`}>
                          <td className="px-4 py-4 align-top">
                            <p className="font-semibold text-foreground">{structure.designation}</p>
                            <p className="text-xs text-muted-foreground">{structure.id}</p>
                          </td>
                          <td className="px-4 py-4 text-right font-semibold text-muted-foreground">{formatCurrency(structure.basicSalary)}</td>
                          <td className="px-4 py-4 text-right font-semibold text-emerald-600">+{formatCurrency(allowanceTotal)}</td>
                          <td className="px-4 py-4 text-right font-semibold text-[#1d4ed8]">{formatCurrency(gross)}</td>
                          <td className="px-4 py-4 text-right font-semibold text-rose-600">-{formatCurrency(deductionTotal)}</td>
                          <td className="px-4 py-4 text-right text-lg font-bold text-[#0f172a]">{formatCurrency(net)}</td>
                          <td className="px-4 py-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <Button size="icon" variant="outline" onClick={() => handleEdit(structure)} className="h-9 w-9 rounded-2xl border border-[#bfdbfe] text-[#1d4ed8]">
                                <PenSquare className="h-4 w-4" />
                              </Button>
                              <Button size="icon" variant="outline" onClick={() => downloadStructurePDF(structure)} className="h-9 w-9 rounded-2xl border border-[#bbf7d0] text-[#15803d]">
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button size="icon" variant="outline" onClick={() => handleDelete(structure.id)} className="h-9 w-9 rounded-2xl border border-[#fecdd3] text-[#b91c1c]">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
