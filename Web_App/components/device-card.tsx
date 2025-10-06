import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { Device } from "@/lib/types"
import { Activity, MapPin, Clock } from "lucide-react"

interface DeviceCardProps {
  device: Device
}

export function DeviceCard({ device }: DeviceCardProps) {
  const statusColors = {
    online: "bg-chart-2 text-background",
    offline: "bg-muted text-muted-foreground",
    warning: "bg-chart-5 text-background",
  }

  const formatLastSeen = (date: Date) => {
    const now = Date.now()
    const diff = now - date.getTime()
    const minutes = Math.floor(diff / 60000)

    if (minutes < 1) return "À l'instant"
    if (minutes < 60) return `Il y a ${minutes} min`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `Il y a ${hours}h`
    return `Il y a ${Math.floor(hours / 24)}j`
  }

  return (
    <Link href={`/device/${device.id}`}>
      <Card className="hover:border-primary/50 transition-colors cursor-pointer">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg font-semibold">{device.name}</CardTitle>
              <p className="text-sm text-muted-foreground">{device.type}</p>
            </div>
            <Badge className={statusColors[device.status]} variant="secondary">
              <Activity className="w-3 h-3 mr-1" />
              {device.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center text-sm text-muted-foreground">
            <MapPin className="w-4 h-4 mr-2" />
            {device.location}
          </div>
          <div className="flex items-center text-sm text-muted-foreground">
            <Clock className="w-4 h-4 mr-2" />
            {formatLastSeen(device.lastSeen)}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
