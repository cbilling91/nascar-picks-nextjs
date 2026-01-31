"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";
import { getNASCARSchedule, getNASCARDrivers, type NASCARRace, type NASCARDriver } from "@/lib/nascar-api";
import { createClient } from "@/lib/supabase/client";

const raceTypes: Record<string, { label: string; color: string }> = {
  clash: { label: "Clash", color: "bg-purple-600" },
  duel: { label: "Duel", color: "bg-blue-600" },
  regular: { label: "Regular Season", color: "bg-green-600" },
  allstar: { label: "All-Star", color: "bg-orange-600" },
  chase: { label: "Chase", color: "bg-red-600" },
  tournament: { label: "Tournament", color: "bg-yellow-600" },
};

export default function SchedulePage() {
  const [races, setRaces] = useState<NASCARRace[]>([]);
  const [drivers, setDrivers] = useState<NASCARDriver[]>([]);
  const [picks, setPicks] = useState<Record<number, number[]>>({});
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const loadSchedule = async () => {
      try {
        const schedule = await getNASCARSchedule();
        const driversList = await getNASCARDrivers();
        setDrivers(driversList);
        
        const now = new Date();
        
        // Separate future and past races
        const futureRaces = schedule.filter((race) => new Date(race.date) >= now);
        const pastRaces = schedule.filter((race) => new Date(race.date) < now);
        
        // Sort future races by date (nearest first)
        futureRaces.sort((a, b) => {
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        });
        
        // Sort past races by date (most recent first)
        pastRaces.sort((a, b) => {
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        });
        
        // Combine: future races first, then past races
        const sortedSchedule = [...futureRaces, ...pastRaces];
        setRaces(sortedSchedule);
        
        // Load user picks for all races
        const token = document.cookie
          .split("; ")
          .find((row) => row.startsWith("auth_token="))
          ?.split("=")[1];

        if (token) {
          const { data: user } = await supabase
            .from("profiles")
            .select("id")
            .eq("auth_token", token)
            .single();

          if (user) {
            const { data: userPicks } = await supabase
              .from("picks")
              .select("race_id, driver_1_id, driver_2_id, driver_3_id")
              .eq("user_id", user.id);

            if (userPicks) {
              const picksMap: Record<number, number[]> = {};
              userPicks.forEach((pick: any) => {
                picksMap[pick.race_id] = [pick.driver_1_id, pick.driver_2_id, pick.driver_3_id].filter(Boolean);
              });
              setPicks(picksMap);
            }
          }
        }
      } finally {
        setLoading(false);
      }
    };
    loadSchedule();
  }, []);

  const getRaceTypeColor = (type: string) => {
    const key = type.toLowerCase();
    return raceTypes[key]?.color || "bg-gray-600";
  };

  const getRaceTypeLabel = (type: string) => {
    const key = type.toLowerCase();
    return raceTypes[key]?.label || type;
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-6">
        <Calendar className="h-6 w-6" />
        <h1 className="text-2xl font-bold">2026 Race Schedule</h1>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-center py-8">Loading schedule...</p>
      ) : races.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">No races found</p>
      ) : (
        <div className="space-y-4">
          {races.map((race, index) => (
            <Card 
              key={race.raceId}
              className={index === 0 ? "border-primary border-2 bg-primary/5" : ""}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">{race.name}</CardTitle>
                    {index === 0 && (
                      <Badge className="bg-green-600">Next Race</Badge>
                    )}
                  </div>
                  <Badge className={getRaceTypeColor(race.type)}>
                    {getRaceTypeLabel(race.type)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{race.track}</p>
                <p className="text-sm font-medium mt-1">{formatDate(race.date)}</p>

                {picks[race.raceId] && picks[race.raceId].length > 0 && (
                  <div className="mt-3 flex gap-2 justify-center">
                    {picks[race.raceId].map((driverId) => {
                      const driver = drivers.find((d) => d.id === driverId);
                      if (!driver) return null;
                      return (
                        <div key={driver.id} className="flex flex-col items-center flex-1 max-w-[80px]">
                          <div className="w-full aspect-square bg-muted rounded overflow-hidden mb-0.5 flex items-center justify-center relative">
                            {driver.firesuitImage ? (
                              <img
                                src={driver.firesuitImage}
                                alt={`${driver.name} firesuit`}
                                className="w-full h-full object-contain"
                              />
                            ) : (
                              <div className="text-muted-foreground text-xs">No image</div>
                            )}
                            {driver.badgeImage && (
                              <img
                                src={driver.badgeImage}
                                alt={`${driver.name} badge`}
                                className="absolute top-0.5 left-0.5 h-4 w-4 object-contain bg-white rounded p-0.5"
                              />
                            )}
                          </div>
                          <p className="text-xs text-center line-clamp-1 leading-tight">{driver.name}</p>
                        </div>
                      );
                    })}
                  </div>
                )}

                <Button asChild className="mt-4 w-full" size="sm">
                  <Link href={`/picks?raceId=${race.raceId}`}>
                    {picks[race.raceId] && picks[race.raceId].length > 0 ? "Edit Picks" : "Make Picks"}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
