import { notFound } from "next/navigation"
import Link from "next/link"
import { getDeviceById, generateReadings } from "@/lib/mock-data"
import { SensorChart } from "@/components/sensor-chart"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, Thermometer, Gauge, Mountain, MapPin, Activity } from "lucide-react"

export default function DevicePage({ params }: { params: { id: string } }) {
  const device = getDeviceById(params.id)

  if (!device) {
    notFound()
  }

  const readings = generateReadings(device.id, 48)
  const latestReading = readings[readings.length - 1]

  const temperatureData = readings.map((r) => ({
    timestamp: r.timestamp,
    value: r.temperature,
  }))

  const pressureData = readings.map((r) => ({
    timestamp: r.timestamp,
    value: r.pressure,
  }))

  const altitudeData = readings.map((r) => ({
    timestamp: r.timestamp,
    value: r.altitude,
  }))

  const statusColors = {
    online: "bg-chart-2 text-background",
    offline: "bg-muted text-muted-foreground",
    warning: "bg-chart-5 text-background",
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold tracking-tight">{device.name}</h1>
                <Badge className={statusColors[device.status]} variant="secondary">
                  <Activity className="w-3 h-3 mr-1" />
                  {device.status}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-muted-foreground">
                <span>{device.type}</span>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {device.location}
                </div>
              </div>
            </div>
          </div>

          {/* Current Values */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-chart-1/10 rounded-lg">
                      <Thermometer className="w-5 h-5 text-chart-1" />
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Température</div>
                      <div className="text-2xl font-bold">{latestReading.temperature.toFixed(1)}°C</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-chart-3/10 rounded-lg">
                      <Gauge className="w-5 h-5 text-chart-3" />
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Pression</div>
                      <div className="text-2xl font-bold">{latestReading.pressure.toFixed(1)} hPa</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-chart-5/10 rounded-lg">
                      <Mountain className="w-5 h-5 text-chart-5" />
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Altitude</div>
                      <div className="text-2xl font-bold">{latestReading.altitude.toFixed(1)} m</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">Historique (24h)</h2>

            <div className="grid grid-cols-1 gap-4">
              <SensorChart
                title="Température"
                data={temperatureData}
                unit="°C"
                color="hsl(var(--chart-1))"
                icon={<Thermometer className="w-4 h-4 text-chart-1" />}
              />

              <SensorChart
                title="Pression Atmosphérique"
                data={pressureData}
                unit=" hPa"
                color="hsl(var(--chart-3))"
                icon={<Gauge className="w-4 h-4 text-chart-3" />}
              />

              <SensorChart
                title="Altitude"
                data={altitudeData}
                unit=" m"
                color="hsl(var(--chart-5))"
                icon={<Mountain className="w-4 h-4 text-chart-5" />}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
