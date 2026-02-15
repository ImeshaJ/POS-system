import { useMemo, useState, type ChangeEvent } from "react"
import PageTitle from "@/components/common/PageTitle"
import { ReportHero } from "@/components/reports/ReportHero"
import { ReportConsole } from "@/components/reports/ReportConsole"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { HardDrive, RotateCcw, Calendar, AlertCircle, Check, CloudDownload, Shield } from "lucide-react"

const retentionOptions = [
  { label: "30 days", value: "30" },
  { label: "60 days", value: "60" },
  { label: "90 days", value: "90" },
]

const scheduleOptions = [
  { label: "Daily", value: "daily" },
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" },
]

const backupSchedule = [
  { label: "Daily backup", lastRun: "Today at 02:00", status: "success" },
  { label: "Weekly snapshot", lastRun: "Mon 00:00", status: "success" },
  { label: "Monthly archive", lastRun: "Feb 01 00:00", status: "scheduled" },
]

export default function BackupRestore() {
  const [backupStatus, setBackupStatus] = useState<"idle" | "backing-up" | "success">("idle")
  const [restoreStatus, setRestoreStatus] = useState<"idle" | "restoring" | "success">("idle")
  const [lastBackup, setLastBackup] = useState("2026-02-04 10:30 AM")
  const [retentionPolicy, setRetentionPolicy] = useState("60")
  const [scheduleCadence, setScheduleCadence] = useState("daily")
  const [notificationEmail, setNotificationEmail] = useState("ops@furryfriends.com")
  const [selectedFileName, setSelectedFileName] = useState("")

  const handleCreateBackup = () => {
    setBackupStatus("backing-up")
    setTimeout(() => {
      setBackupStatus("success")
      setLastBackup(new Date().toLocaleString())
      setTimeout(() => setBackupStatus("idle"), 3000)
    }, 2000)
  }

  const handleRestore = () => {
    setRestoreStatus("restoring")
    setTimeout(() => {
      setRestoreStatus("success")
      setTimeout(() => setRestoreStatus("idle"), 3000)
    }, 2000)
  }

  const lastBackupRelative = useMemo(() => {
    const parsed = new Date(lastBackup)
    if (Number.isNaN(parsed.valueOf())) return lastBackup
    return parsed.toLocaleString()
  }, [lastBackup])

  const heroMetrics = [
    {
      label: "Last backup",
      value: lastBackupRelative,
      hint: backupStatus === "backing-up" ? "Backup running" : "Automations healthy",
      gradient: "from-[#0f172a] via-[#3730a3] to-[#22d3ee]",
      icon: HardDrive,
    },
    {
      label: "Retention policy",
      value: `${retentionPolicy} days`,
      hint: scheduleCadence === "daily" ? "Daily snapshots" : `${scheduleCadence} cadence`,
      gradient: "from-[#14532d] to-[#22c55e]",
      icon: Shield,
    },
    {
      label: "Restore readiness",
      value: restoreStatus === "restoring" ? "In progress" : "Standby",
      hint: selectedFileName ? selectedFileName : "Waiting for file",
      gradient: "from-[#4c0519] to-[#fb7185]",
      icon: RotateCcw,
    },
    {
      label: "Cloud archive",
      value: "3 schedules",
      hint: "Daily · Weekly · Monthly",
      gradient: "from-[#0f172a] to-[#38bdf8]",
      icon: CloudDownload,
    },
  ]

  const highlightStats = [
    { label: "Cadence", value: scheduleOptions.find((option) => option.value === scheduleCadence)?.label ?? scheduleCadence, accent: "text-sky-400" },
    { label: "Retention", value: `${retentionPolicy} days`, accent: "text-emerald-400" },
    { label: "Notify", value: notificationEmail, accent: "text-amber-400" },
    { label: "Restore asset", value: selectedFileName || "No file chosen", accent: "text-pink-400" },
  ]

  const consoleFooter = (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <span className="text-muted-foreground">Automations set to {scheduleCadence}</span>
      <Badge variant="secondary" className="rounded-2xl border-dashed text-xs">
        Retention {retentionPolicy} days
      </Badge>
    </div>
  )

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    setSelectedFileName(file ? file.name : "")
  }

  return (
    <div className="space-y-6">
      <PageTitle title="Backup & Restore" subtitle="Safeguard every client, sales, and appointment record with neon resilience." />

      <ReportHero
        kicker="Continuity"
        title="Backup runway"
        subtitle="Daily snapshots, cloud archives, and one-click restores mapped into a single cockpit."
        badgeLabel={`Last backup ${lastBackupRelative || "unknown"}`}
        metrics={heroMetrics}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleCreateBackup} disabled={backupStatus === "backing-up"} className="rounded-2xl bg-white/90 px-5 py-2 text-[#0f172a] hover:bg-white">
              <HardDrive className={`mr-2 h-4 w-4 ${backupStatus === "backing-up" ? "animate-spin" : ""}`} /> Manual backup
            </Button>
            <Button variant="outline" onClick={handleRestore} disabled={restoreStatus === "restoring"} className="rounded-2xl border-white/60 text-white">
              <RotateCcw className={`mr-2 h-4 w-4 ${restoreStatus === "restoring" ? "animate-spin" : ""}`} /> Test restore
            </Button>
          </div>
        }
      />

      <ReportConsole
        icon={Calendar}
        title="Policies & alerts"
        description="Tune retention, cadence, and alerting so the clinic is always covered."
        footer={consoleFooter}
      >
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground">Retention window</Label>
              <Select value={retentionPolicy} onValueChange={setRetentionPolicy}>
                <SelectTrigger className="h-11 rounded-2xl">
                  <SelectValue placeholder="Select retention" />
                </SelectTrigger>
                <SelectContent>
                  {retentionOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground">Automation cadence</Label>
              <Select value={scheduleCadence} onValueChange={setScheduleCadence}>
                <SelectTrigger className="h-11 rounded-2xl">
                  <SelectValue placeholder="Select cadence" />
                </SelectTrigger>
                <SelectContent>
                  {scheduleOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground">Alert email</Label>
              <Input value={notificationEmail} onChange={(event) => setNotificationEmail(event.target.value)} className="h-11 rounded-2xl border-0 bg-muted/30" placeholder="alerts@clinic.com" />
            </div>
          </div>
          <div className="grid gap-3 lg:grid-cols-[auto_auto_1fr]">
            <Button variant="outline" className="h-11 rounded-2xl border-dashed" onClick={() => {
              setRetentionPolicy("60")
              setScheduleCadence("daily")
              setNotificationEmail("ops@furryfriends.com")
            }}>
              Reset defaults
            </Button>
            <Button onClick={handleCreateBackup} disabled={backupStatus === "backing-up"} className="h-11 rounded-2xl bg-[#0f172a] text-white">
              <HardDrive className={`mr-2 h-4 w-4 ${backupStatus === "backing-up" ? "animate-spin" : ""}`} /> Trigger backup
            </Button>
            <div className="flex items-center text-xs text-muted-foreground">Settings sync automatically to automation services.</div>
          </div>
        </>
      </ReportConsole>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {highlightStats.map((stat) => (
          <Card key={stat.label} className="brand-card text-center">
            <CardContent className="space-y-2 p-5">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{stat.label}</p>
              <p className={`text-3xl font-bold ${stat.accent}`}>{stat.value}</p>
              <p className="text-xs text-muted-foreground">Live policy context</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="brand-card brand-card-hover">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <HardDrive className="h-5 w-5 text-sky-300" />
              System backup
            </CardTitle>
            <CardDescription>Create a complete snapshot across clients, sales, inventory, and settings.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm text-muted-foreground">
                <strong className="text-white">Included:</strong> Clients, pets, appointments, inventory, billing, staff, and settings modules.
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-semibold text-muted-foreground">Backup guarantees</p>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-300" /> Automated daily snapshots</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-300" /> Manual backups on demand</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-300" /> Multi-region cloud storage</li>
              </ul>
            </div>
            <Button onClick={handleCreateBackup} disabled={backupStatus === "backing-up"} className="w-full rounded-2xl bg-[#0f172a] py-3 text-white">
              {backupStatus === "backing-up" ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Creating backup...
                </>
              ) : backupStatus === "success" ? (
                <>
                  <Check className="mr-2 h-4 w-4" /> Backup successful
                </>
              ) : (
                <>
                  <HardDrive className="mr-2 h-4 w-4" /> Create backup now
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className="brand-card brand-card-hover">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <RotateCcw className="h-5 w-5 text-amber-300" />
              Restore backup
            </CardTitle>
            <CardDescription>Bring production back online from any snapshot.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-amber-200/40 bg-amber-50/10 p-4">
              <p className="flex items-start gap-2 text-sm text-amber-100">
                <AlertCircle className="h-4 w-4" />
                <span><strong>Warning:</strong> Restoring overwrites current data. Capture a fresh backup beforehand.</span>
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-semibold text-muted-foreground">Before restoring</p>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-white/70" /> Capture a current backup</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-white/70" /> Verify no active sessions</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-white/70" /> Select the correct archive</li>
              </ul>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground">Select backup file</Label>
              <Input type="file" accept=".bak,.zip" onChange={handleFileChange} className="rounded-2xl border border-dashed border-white/20 bg-transparent" />
              {selectedFileName && <p className="text-xs text-muted-foreground">Ready to restore: {selectedFileName}</p>}
            </div>
            <Button onClick={handleRestore} disabled={restoreStatus === "restoring"} className="w-full rounded-2xl bg-amber-500 py-3 text-white hover:bg-amber-400">
              {restoreStatus === "restoring" ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Restoring...
                </>
              ) : restoreStatus === "success" ? (
                <>
                  <Check className="mr-2 h-4 w-4" /> Restore complete
                </>
              ) : (
                <>
                  <RotateCcw className="mr-2 h-4 w-4" /> Restore now
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="brand-card brand-card-hover">
        <CardHeader>
          <CardTitle>Automation schedule</CardTitle>
          <CardDescription>Operational heartbeat for snapshots and archives.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {backupSchedule.map((schedule) => (
            <div key={schedule.label} className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-semibold text-white">{schedule.label}</p>
                <p className="text-sm text-muted-foreground">Last run {schedule.lastRun}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="rounded-2xl border-dashed text-xs">
                  {schedule.status === "success" ? "Healthy" : "Scheduled"}
                </Badge>
                <Button variant="outline" size="sm" className="rounded-2xl border-white/40 text-white">
                  View logs
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
