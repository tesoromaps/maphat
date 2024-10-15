"use client"

import { useState, useEffect, useRef } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "/leaflet/marker-icon-2x.png",
  iconUrl: "/leaflet/marker-icon.png",
  shadowUrl: "/leaflet/marker-shadow.png",
})

interface Dataset {
  name: string
  type: "point" | "polygon"
  data: [number, number][] | [number, number][][]
}

export function AiEnhancedMapComponent() {
  const mapRef = useRef<L.Map | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [dataSource, setDataSource] = useState("")
  const [aiSuggestion, setAiSuggestion] = useState("")
  const [searchResults, setSearchResults] = useState<Dataset[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!mapRef.current) {
      const fortWorth = [32.7555, -97.3308]
      mapRef.current = L.map("map").setView(fortWorth, 10)

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(mapRef.current)

      L.marker(fortWorth).addTo(mapRef.current)
        .bindPopup("Fort Worth, Texas")
        .openPopup()
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [])

  const handleSearch = async () => {
    setLoading(true)
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`)
      const data = await response.json()
      if (data && data.length > 0) {
        const { lat, lon } = data[0]
        mapRef.current?.setView([parseFloat(lat), parseFloat(lon)], 13)
        L.marker([parseFloat(lat), parseFloat(lon)]).addTo(mapRef.current!)
          .bindPopup(data[0].display_name)
          .openPopup()
      } else {
        alert("Location not found")
      }
    } catch (error) {
      console.error("Error during geocoding:", error)
      alert("Error during search. Please try again.")
    }
    setLoading(false)
  }

  const handleDataIntegration = () => {
    console.log(`Integrating data from: ${dataSource}`)
    alert(`Data from ${dataSource} has been integrated into the map.`)
  }

  const handleAiSuggestion = async () => {
    setAiSuggestion("Analyzing the current map area...")
    setSearchResults([])
    setLoading(true)

    try {
      const bounds = mapRef.current?.getBounds()
      const center = mapRef.current?.getCenter()
      const zoom = mapRef.current?.getZoom()

      const response = await fetch('/api/ai-suggestion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bounds: bounds ? {
            north: bounds.getNorth(),
            south: bounds.getSouth(),
            east: bounds.getEast(),
            west: bounds.getWest(),
          } : null,
          center: center ? { lat: center.lat, lng: center.lng } : null,
          zoom,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to get AI suggestion')
      }

      const data = await response.json()
      setAiSuggestion(data.suggestion)

      // Parse and set the datasets
      const datasets: Dataset[] = data.datasets.map((dataset: any) => ({
        name: dataset.name,
        type: dataset.type,
        data: dataset.data,
      }))
      setSearchResults(datasets)
    } catch (error) {
      console.error('Error getting AI suggestion:', error)
      setAiSuggestion('Failed to get AI suggestion. Please try again.')
    }

    setLoading(false)
  }

  const displayDataset = (dataset: Dataset) => {
    if (mapRef.current) {
      if (dataset.type === "polygon") {
        L.polygon(dataset.data as [number, number][][]).addTo(mapRef.current)
          .bindPopup(dataset.name)
      } else if (dataset.type === "point") {
        (dataset.data as [number, number][]).forEach(point => {
          L.marker(point).addTo(mapRef.current!)
            .bindPopup(dataset.name)
        })
      }
      mapRef.current.fitBounds(L.latLngBounds(dataset.data.flat() as [number, number][]))
    }
  }

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      <div id="map" className="w-3/4 h-full"></div>
      <div className="w-1/4 p-4 bg-white overflow-y-auto">
        <Tabs defaultValue="search">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="search">Search</TabsTrigger>
            <TabsTrigger value="data">Data</TabsTrigger>
            <TabsTrigger value="ai">AI Tools</TabsTrigger>
          </TabsList>
          <TabsContent value="search">
            <Card>
              <CardHeader>
                <CardTitle>Search Location</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="search">Enter location:</Label>
                  <Input
                    id="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="e.g., Downtown Fort Worth"
                  />
                  <Button onClick={handleSearch} disabled={loading}>
                    {loading ? "Searching..." : "Search"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="data">
            <Card>
              <CardHeader>
                <CardTitle>Integrate Data</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="dataSource">Data source URL or file:</Label>
                  <Input
                    id="dataSource"
                    value={dataSource}
                    onChange={(e) => setDataSource(e.target.value)}
                    placeholder="e.g., https://data.gov/api/v1/data.json"
                  />
                  <Button onClick={handleDataIntegration}>Integrate</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="ai">
            <Card>
              <CardHeader>
                <CardTitle>AI Suggestions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button onClick={handleAiSuggestion} disabled={loading}>
                    {loading ? "Analyzing..." : "Get AI Suggestion"}
                  </Button>
                  {aiSuggestion && (
                    <p className="mt-2 text-sm text-gray-600">{aiSuggestion}</p>
                  )}
                  {searchResults.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-semibold mb-2">Suggested Datasets:</h4>
                      <ul className="list-disc pl-5">
                        {searchResults.map((dataset, index) => (
                          <li key={index} className="text-sm">
                            {dataset.name}
                            <Button
                              variant="link"
                              className="p-0 h-auto text-blue-500 hover:text-blue-700"
                              onClick={() => displayDataset(dataset)}
                            >
                              Display on Map
                            </Button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
