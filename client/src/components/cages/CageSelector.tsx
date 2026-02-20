import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { apiGet, apiPost } from "@/lib/api"
import { useToast } from "@/components/common/Toast"
import { Box, Calendar, CheckCircle2, XCircle } from "lucide-react"

type CageBooking = {
  id: number
  cage_number: number
  pet_name: string
  client_name: string
  animal_type: string
  start_date: string
  end_date: string
  status: string
  appointment_id?: number
  boarding_stay_id?: number
}

type CageAvailability = {
  cageNumber: number
  available: boolean
  booking: CageBooking | null
}

type CageSettings = {
  id: number
  total_cages: number
  cage_prefix: string
}

type CageSelectorProps = {
  startDate: string
  endDate: string
  onSelect?: (cageNumber: number) => void
  selectedCage?: number | null
  petName?: string
  clientName?: string
  animalType?: string
  appointmentId?: number
  boardingStayId?: number
  onBookingComplete?: (booking: CageBooking) => void
  readOnly?: boolean
}

export default function CageSelector({
  startDate,
  endDate,
  onSelect,
  selectedCage,
  petName,
  clientName,
  animalType,
  appointmentId,
  boardingStayId,
  onBookingComplete,
  readOnly = false,
}: CageSelectorProps) {
  const toast = useToast()
  const [cages, setCages] = useState<CageAvailability[]>([])
  const [settings, setSettings] = useState<CageSettings | null>(null)
  const [loading, setLoading] = useState(false)
  const [booking, setBooking] = useState(false)
  const [hoveredCage, setHoveredCage] = useState<number | null>(null)
  const [internalSelected, setInternalSelected] = useState<number | null>(selectedCage || null)

  // Use prop-controlled or internal state
  const currentSelected = selectedCage !== undefined ? selectedCage : internalSelected

  useEffect(() => {
    loadSettings()
  }, [])

  useEffect(() => {
    if (startDate && endDate) {
      loadAvailability()
    }
  }, [startDate, endDate])

  async function loadSettings() {
    try {
      const res = await apiGet<CageSettings>("/api/cages/settings")
      setSettings(res.data)
    } catch (err) {
      console.error("Failed to load cage settings:", err)
    }
  }

  async function loadAvailability() {
    if (!startDate || !endDate) return

    setLoading(true)
    try {
      const res = await apiGet<{
        totalCages: number
        cages: CageAvailability[]
        bookedCount: number
        availableCount: number
      }>(`/api/cages/availability?start_date=${startDate}&end_date=${endDate}`)
      setCages(res.data.cages)
    } catch (err) {
      console.error("Failed to load cage availability:", err)
      toast.error("Failed to load cage availability")
    } finally {
      setLoading(false)
    }
  }

  function handleCageClick(cage: CageAvailability) {
    if (readOnly) return
    if (!cage.available) {
      toast.warning(`Cage ${cage.cageNumber} is already booked`)
      return
    }

    const newSelected = cage.cageNumber === currentSelected ? null : cage.cageNumber

    if (onSelect) {
      onSelect(newSelected || 0)
    } else {
      setInternalSelected(newSelected)
    }
  }

  async function handleBookCage() {
    if (!currentSelected || !startDate || !endDate) {
      toast.warning("Please select a cage and date range")
      return
    }

    setBooking(true)
    try {
      const payload = {
        cage_number: currentSelected,
        appointment_id: appointmentId || null,
        boarding_stay_id: boardingStayId || null,
        pet_name: petName || null,
        client_name: clientName || null,
        animal_type: animalType || null,
        start_date: startDate,
        end_date: endDate,
      }

      const res = await apiPost<CageBooking>("/api/cages/bookings", payload)
      toast.success(`Cage ${currentSelected} booked successfully`)

      if (onBookingComplete) {
        onBookingComplete(res.data)
      }

      // Refresh availability
      await loadAvailability()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to book cage"
      toast.error(message)
    } finally {
      setBooking(false)
    }
  }

  const getCageStyle = (cage: CageAvailability) => {
    const isSelected = cage.cageNumber === currentSelected
    const isHovered = cage.cageNumber === hoveredCage

    if (isSelected) {
      return "bg-blue-500 border-blue-600 text-white shadow-lg scale-105"
    }
    if (!cage.available) {
      return "bg-red-100 border-red-300 text-red-800 cursor-not-allowed"
    }
    if (isHovered && !readOnly) {
      return "bg-green-100 border-green-400 text-green-800 shadow-md"
    }
    return "bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
  }

  const prefix = settings?.cage_prefix || "C"
  const availableCount = cages.filter(c => c.available).length
  const bookedCount = cages.filter(c => !c.available).length

  if (!startDate || !endDate) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            Please select check-in and check-out dates to view cage availability
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg font-semibold">Cage Selection</CardTitle>
            <p className="text-sm text-muted-foreground">
              {startDate} to {endDate}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <div className="flex items-center gap-1">
                <div className="h-3 w-3 rounded bg-green-500" />
                <span className="text-muted-foreground">Available ({availableCount})</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-3 w-3 rounded bg-red-400" />
                <span className="text-muted-foreground">Booked ({bookedCount})</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-3 w-3 rounded bg-blue-500" />
                <span className="text-muted-foreground">Selected</span>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <>
            {/* Cage Grid */}
            <div className="grid grid-cols-4 gap-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8">
              {cages.map((cage) => (
                <div
                  key={cage.cageNumber}
                  className="relative"
                  onMouseEnter={() => setHoveredCage(cage.cageNumber)}
                  onMouseLeave={() => setHoveredCage(null)}
                >
                  <button
                    type="button"
                    onClick={() => handleCageClick(cage)}
                    disabled={readOnly && !cage.available}
                    className={`
                      w-full aspect-square flex flex-col items-center justify-center
                      rounded-lg border-2 transition-all duration-200
                      ${getCageStyle(cage)}
                      ${readOnly && cage.available ? "cursor-default" : "cursor-pointer"}
                    `}
                  >
                    <Box className="h-5 w-5 mb-1" />
                    <span className="text-xs font-semibold">
                      {prefix}{cage.cageNumber}
                    </span>
                  </button>

                  {/* Tooltip for booked cages */}
                  {hoveredCage === cage.cageNumber && cage.booking && (
                    <div className="absolute z-10 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg whitespace-nowrap">
                      <div className="font-semibold">{cage.booking.pet_name}</div>
                      <div className="text-gray-300">{cage.booking.client_name}</div>
                      <div className="text-gray-400">
                        {cage.booking.start_date} - {cage.booking.end_date}
                      </div>
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-gray-900" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Selection Info */}
            {currentSelected && !readOnly && (
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg bg-blue-50 border border-blue-200 p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-semibold text-blue-900">
                      Cage {prefix}{currentSelected} Selected
                    </p>
                    <p className="text-sm text-blue-700">
                      {petName && `${petName} · `}
                      {startDate} to {endDate}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (onSelect) {
                        onSelect(0)
                      } else {
                        setInternalSelected(null)
                      }
                    }}
                    className="border-blue-200 text-blue-700"
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Clear
                  </Button>
                  {!onBookingComplete && (
                    <Button
                      size="sm"
                      onClick={handleBookCage}
                      disabled={booking}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {booking ? "Booking..." : "Confirm Booking"}
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* No cages available message */}
            {!loading && cages.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Box className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No cages configured. Please set up cage settings.</p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

// Compact version for inline use
export function CageSelectorCompact({
  startDate,
  endDate,
  selectedCage,
  onSelect,
  readOnly = false,
}: {
  startDate: string
  endDate: string
  selectedCage?: number | null
  onSelect?: (cageNumber: number) => void
  readOnly?: boolean
}) {
  const [cages, setCages] = useState<CageAvailability[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (startDate && endDate) {
      loadAvailability()
    }
  }, [startDate, endDate])

  async function loadAvailability() {
    if (!startDate || !endDate) return

    setLoading(true)
    try {
      const res = await apiGet<{
        totalCages: number
        cages: CageAvailability[]
      }>(`/api/cages/availability?start_date=${startDate}&end_date=${endDate}`)
      setCages(res.data.cages)
    } catch (err) {
      console.error("Failed to load cage availability:", err)
    } finally {
      setLoading(false)
    }
  }

  if (!startDate || !endDate) {
    return (
      <div className="text-sm text-muted-foreground italic">
        Select dates to view cages
      </div>
    )
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading cages...</div>
  }

  return (
    <div className="flex flex-wrap gap-2">
      {cages.map((cage) => {
        const isSelected = cage.cageNumber === selectedCage
        const isAvailable = cage.available

        return (
          <button
            key={cage.cageNumber}
            type="button"
            onClick={() => {
              if (readOnly || !isAvailable) return
              if (onSelect) {
                onSelect(isSelected ? 0 : cage.cageNumber)
              }
            }}
            disabled={readOnly || !isAvailable}
            className={`
              px-3 py-1.5 text-xs font-medium rounded-full border transition-all
              ${isSelected
                ? "bg-blue-500 border-blue-600 text-white"
                : isAvailable
                  ? "bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                  : "bg-red-50 border-red-200 text-red-400 cursor-not-allowed"
              }
            `}
            title={cage.booking ? `Booked by ${cage.booking.pet_name}` : "Available"}
          >
            C{cage.cageNumber}
          </button>
        )
      })}
    </div>
  )
}
