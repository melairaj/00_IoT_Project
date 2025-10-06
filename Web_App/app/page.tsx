import { devices } from "@/lib/mock-data"
import { DeviceCard } from "@/components/device-card"
import { Activity, Plus } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function DashboardPage() {
  const onlineDevices = devices.filter((d) => d.status === "online").length
  const totalDevices = devices.length

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="space-y-8">
          {/* Header */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Activity className="w-6 h-6 text-primary" />
                </div>
                <h1 className="text-4xl font-bold tracking-tight">Gestion IoT</h1>
              </div>
              <Link href="/device/new">
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Nouveau Dispositif
                </Button>
              </Link>
            </div>
            <p className="text-muted-foreground text-lg">
              Surveillance et gestion de vos dispositifs IoT en temps réel
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="text-sm text-muted-foreground mb-1">Total Dispositifs</div>
              <div className="text-3xl font-bold">{totalDevices}</div>
            </div>
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="text-sm text-muted-foreground mb-1">En Ligne</div>
              <div className="text-3xl font-bold text-chart-2">{onlineDevices}</div>
            </div>
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="text-sm text-muted-foreground mb-1">Taux de Disponibilité</div>
              <div className="text-3xl font-bold">{Math.round((onlineDevices / totalDevices) * 100)}%</div>
            </div>
          </div>

          {/* Devices Grid */}
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">Dispositifs</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {devices.map((device) => (
                <DeviceCard key={device.id} device={device} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
