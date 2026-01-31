"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Flag, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getNASCARSchedule, getNASCARDrivers, type NASCARRace, type NASCARDriver } from "@/lib/nascar-api";

function PicksContent() {
  const searchParams = useSearchParams();
  const raceId = searchParams.get("raceId") || "2";
  
  const [race, setRace] = useState<NASCARRace | null>(null);
  const [drivers, setDrivers] = useState<NASCARDriver[]>([]);
  const [selectedDrivers, setSelectedDrivers] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const supabase = createClient();

  useEffect(() => {
    const loadRaceAndPicks = async () => {
      setLoading(true);
      try {
        // Fetch all races and find the one matching raceId
        const schedule = await getNASCARSchedule();
        const foundRace = schedule.find((r) => r.raceId === parseInt(raceId));
        setRace(foundRace || null);
        
        // Fetch drivers
        const driversList = await getNASCARDrivers();
        setDrivers(driversList);
        
        // Load user picks
        await loadUserPicks();
      } finally {
        setLoading(false);
      }
    };
    loadRaceAndPicks();
  }, [raceId]);

  const loadUserPicks = async () => {
    setLoading(true);
    try {
      // Get token from cookie
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth_token="))
        ?.split("=")[1];

      if (!token) {
        setLoading(false);
        return;
      }

      // Get user by token
      const { data: user } = await supabase
        .from("profiles")
        .select("id")
        .eq("auth_token", token)
        .single();

      if (!user) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("picks")
        .select("driver_1_id, driver_2_id, driver_3_id")
        .eq("user_id", user.id)
        .eq("race_id", parseInt(raceId))
        .single();

      if (data) {
        const drivers = [data.driver_1_id, data.driver_2_id, data.driver_3_id].filter(Boolean);
        setSelectedDrivers(drivers);
      }
    } catch (error) {
      console.error("Error loading picks:", error);
    }
    setLoading(false);
  };

  const toggleDriver = (driverId: number) => {
    setSelectedDrivers((prev) => {
      if (prev.includes(driverId)) {
        return prev.filter((id) => id !== driverId);
      } else if (prev.length < 3) {
        return [...prev, driverId];
      }
      return prev;
    });
  };

  const savePicks = async () => {
    if (selectedDrivers.length !== 3) {
      setMessage("Please select exactly 3 drivers");
      return;
    }

    setSaving(true);
    try {
      // Get token from cookie
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth_token="))
        ?.split("=")[1];

      if (!token) {
        setMessage("Not authenticated");
        setSaving(false);
        return;
      }

      // Get user by token
      const { data: user } = await supabase
        .from("profiles")
        .select("id")
        .eq("auth_token", token)
        .single();

      if (!user) {
        setMessage("Not authenticated");
        setSaving(false);
        return;
      }

      const { error } = await supabase
        .from("picks")
        .upsert(
          {
            user_id: user.id,
            race_id: parseInt(raceId),
            driver_1_id: selectedDrivers[0],
            driver_2_id: selectedDrivers[1],
            driver_3_id: selectedDrivers[2],
          },
          { onConflict: "user_id,race_id" }
        );

      if (error) {
        setMessage(`Error saving picks: ${error.message}`);
      } else {
        setMessage("Picks saved successfully!");
        setTimeout(() => setMessage(""), 3000);
      }
    } catch (error: any) {
      setMessage(error.message || "Error saving picks");
    }
    setSaving(false);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-6">
        <Flag className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Make Your Picks</h1>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{race?.name || "Race"}</CardTitle>
          <CardDescription>{race?.date && race?.track ? `${race.date} • ${race.track}` : "Loading race details..."}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Select 3 drivers for this race. Your picks will be locked at race start.
          </p>

          {message && (
            <div className="mb-4 p-3 rounded bg-blue-50 text-blue-900 text-sm">
              {message}
            </div>
          )}

          {selectedDrivers.length > 0 && (
            <div className="mb-6 grid grid-cols-3 gap-4">
              {selectedDrivers.map((driverId) => {
                const driver = drivers.find((d) => d.id === driverId);
                if (!driver) return null;
                return (
                  <div key={driver.id} className="flex flex-col items-center">
                    <div className="w-full aspect-square bg-muted rounded-lg overflow-hidden mb-2 flex items-center justify-center relative">
                      {driver.firesuitImage ? (
                        <img
                          src={driver.firesuitImage}
                          alt={`${driver.name} firesuit`}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="text-muted-foreground text-sm">No firesuit image</div>
                      )}
                      {driver.badgeImage && (
                        <img
                          src={driver.badgeImage}
                          alt={`${driver.name} badge`}
                          className="absolute top-2 left-2 h-12 w-12 object-contain bg-white rounded p-1"
                        />
                      )}
                    </div>
                    <p className="text-sm font-semibold text-center line-clamp-2">{driver.name}</p>
                    <p className="text-xs text-muted-foreground text-center">{driver.teamName}</p>
                  </div>
                );
              })}
            </div>
          )}

          {loading ? (
            <p className="text-muted-foreground">Loading your picks...</p>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
                {drivers.map((driver: NASCARDriver) => (
                  <button
                    key={driver.id}
                    type="button"
                    onClick={() => toggleDriver(driver.id)}
                    className={`p-3 rounded-lg border-2 transition-all text-left flex flex-col cursor-pointer ${
                      selectedDrivers.includes(driver.id)
                        ? "border-primary bg-primary/10"
                        : "border-muted hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        {driver.badgeImage && (
                          <img
                            src={driver.badgeImage}
                            alt={`${driver.name} badge`}
                            className="h-10 w-10 object-contain mb-1"
                          />
                        )}
                        <p className="text-xs text-muted-foreground line-clamp-2">{driver.name}</p>
                        {driver.teamName && (
                          <p className="text-xs text-muted-foreground line-clamp-1 mt-1">{driver.teamName}</p>
                        )}
                      </div>
                      {selectedDrivers.includes(driver.id) && (
                        <Check className="w-4 h-4 text-primary flex-shrink-0 ml-1" />
                      )}
                    </div>

                    <div className="flex gap-2 items-center justify-center mt-auto pt-2">
                      {driver.manufacturerImage && (
                        <img
                          src={driver.manufacturerImage}
                          alt="Manufacturer"
                          className="h-6 w-6 object-contain"
                        />
                      )}
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <span className="font-semibold">{selectedDrivers.length}</span>
                  <span className="text-muted-foreground"> / 3 drivers selected</span>
                </div>
                <Button
                  onClick={savePicks}
                  disabled={selectedDrivers.length !== 3 || saving}
                  size="lg"
                >
                  {saving ? "Saving..." : "Save Picks"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function PicksPage() {
  return (
    <Suspense fallback={<div className="container mx-auto px-4 py-8">Loading...</div>}>
      <PicksContent />
    </Suspense>
  );
}
