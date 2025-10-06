"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Plus } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function NewDevicePage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: "",
    type: "",
    location: "",
    status: "online" as "online" | "offline" | "warning",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // In a real app, this would save to a database
    console.log("[v0] New device created:", formData)
    // Redirect back to dashboard
    router.push("/")
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="space-y-8">
          {/* Header */}
          <div className="space-y-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Retour au Dashboard
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Plus className="w-6 h-6 text-primary" />
              </div>
              <h1 className="text-4xl font-bold tracking-tight">Nouveau Dispositif</h1>
            </div>
            <p className="text-muted-foreground text-lg">Ajoutez un nouveau dispositif IoT à votre système</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-card border border-border rounded-lg p-6 space-y-6">
              {/* Name Field */}
              <div className="space-y-2">
                <Label htmlFor="name">Nom du Dispositif</Label>
                <Input
                  id="name"
                  placeholder="Ex: Capteur Bureau Principal"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="bg-background"
                />
              </div>

              {/* Type Field */}
              <div className="space-y-2">
                <Label htmlFor="type">Type de Capteur</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                  required
                >
                  <SelectTrigger id="type" className="bg-background">
                    <SelectValue placeholder="Sélectionnez un type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BME280">BME280</SelectItem>
                    <SelectItem value="DHT22">DHT22</SelectItem>
                    <SelectItem value="BMP180">BMP180</SelectItem>
                    <SelectItem value="SHT31">SHT31</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Location Field */}
              <div className="space-y-2">
                <Label htmlFor="location">Emplacement</Label>
                <Input
                  id="location"
                  placeholder="Ex: Bureau, Entrepôt, Salle Serveur"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  required
                  className="bg-background"
                />
              </div>

              {/* Status Field */}
              <div className="space-y-2">
                <Label htmlFor="status">Statut Initial</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) =>
                    setFormData({ ...formData, status: value as "online" | "offline" | "warning" })
                  }
                >
                  <SelectTrigger id="status" className="bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="online">En Ligne</SelectItem>
                    <SelectItem value="offline">Hors Ligne</SelectItem>
                    <SelectItem value="warning">Avertissement</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <Button type="submit" className="flex-1 gap-2">
                <Plus className="w-4 h-4" />
                Créer le Dispositif
              </Button>
              <Button type="button" variant="outline" onClick={() => router.push("/")}>
                Annuler
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
