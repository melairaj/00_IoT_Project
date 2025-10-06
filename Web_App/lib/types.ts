export interface Device {
  id: string
  name: string
  type: string
  location: string
  status: "online" | "offline" | "warning"
  lastSeen: Date
}

export interface SensorReading {
  id: string
  deviceId: string
  timestamp: Date
  temperature: number // Celsius
  pressure: number // hPa
  altitude: number // meters
}
