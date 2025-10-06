import type { Device, SensorReading } from "./types"

export const devices: Device[] = [
  {
    id: "device-001",
    name: "Capteur Bureau A",
    type: "Environmental Sensor",
    location: "Bureau Principal",
    status: "online",
    lastSeen: new Date(),
  },
  {
    id: "device-002",
    name: "Capteur Entrepôt",
    type: "Environmental Sensor",
    location: "Entrepôt Nord",
    status: "online",
    lastSeen: new Date(Date.now() - 5 * 60 * 1000),
  },
  {
    id: "device-003",
    name: "Capteur Extérieur",
    type: "Weather Station",
    location: "Toit Bâtiment B",
    status: "warning",
    lastSeen: new Date(Date.now() - 15 * 60 * 1000),
  },
  {
    id: "device-004",
    name: "Capteur Laboratoire",
    type: "Environmental Sensor",
    location: "Laboratoire R&D",
    status: "offline",
    lastSeen: new Date(Date.now() - 2 * 60 * 60 * 1000),
  },
]

// Generate mock sensor readings for the last 24 hours
export function generateReadings(deviceId: string, count = 48): SensorReading[] {
  const readings: SensorReading[] = []
  const now = Date.now()
  const interval = (24 * 60 * 60 * 1000) / count // 24 hours divided by count

  // Base values that vary by device
  const baseTemp = 20 + Math.random() * 10
  const basePressure = 1013 + Math.random() * 20
  const baseAltitude = 100 + Math.random() * 200

  for (let i = 0; i < count; i++) {
    const timestamp = new Date(now - (count - i) * interval)

    // Add some realistic variation
    const tempVariation = Math.sin(i / 5) * 3 + (Math.random() - 0.5) * 2
    const pressureVariation = Math.sin(i / 8) * 5 + (Math.random() - 0.5) * 3
    const altitudeVariation = Math.sin(i / 6) * 10 + (Math.random() - 0.5) * 5

    readings.push({
      id: `reading-${deviceId}-${i}`,
      deviceId,
      timestamp,
      temperature: Number((baseTemp + tempVariation).toFixed(1)),
      pressure: Number((basePressure + pressureVariation).toFixed(1)),
      altitude: Number((baseAltitude + altitudeVariation).toFixed(1)),
    })
  }

  return readings
}

export function getDeviceById(id: string): Device | undefined {
  return devices.find((device) => device.id === id)
}

export function getLatestReading(deviceId: string): SensorReading | undefined {
  const readings = generateReadings(deviceId, 1)
  return readings[0]
}
