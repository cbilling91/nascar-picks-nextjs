"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";
import { getNASCARSchedule, getNASCARDrivers, isRaceLiveOrUpcoming, getLiveLapData, type NASCARRace, type NASCARDriver } from "@/lib/nascar-api";
import { useSupabase } from "@/lib/supabase/client";

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
  const [liveRaces, setLiveRaces] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const supabase = useSupabase();

  useEffect(() => {
    const loadSchedule = async () => {
      try {
        const schedule = await getNASCARSchedule();
        const driversList = await getNASCARDrivers();
        setDrivers(driversList);

        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const todayEnd = todayStart + 24 * 60 * 60 * 1000;

        // Only check live status for today's races (not all 36+ races)
        const live = new Set<number>();
        const todayRaces = schedule.filter((race) => {
          const raceTime = new Date(race.date).getTime();
          return raceTime >= todayStart && raceTime < todayEnd;
        });

        // Check live status: use getLiveLapData for regular races (real-time),
        // fall back to isRaceLiveOrUpcoming for other race types
        const liveChecks = await Promise.all(
          todayRaces.map(async (race) => {
            if (race.type === "regular") {
              const lapData = await getLiveLapData(race.raceId);
              return lapData && lapData.currentLap > 0;
            }
            return isRaceLiveOrUpcoming(race.raceId, race.date);
          })
        );
        todayRaces.forEach((race, i) => {
          if (liveChecks[i]) live.add(race.raceId);
        });
        setLiveRaces(live);

        // Sort: live first, then today's races, then next upcoming, then rest
        const sortedSchedule = [...schedule].sort((a, b) => {
          const aIsLive = live.has(a.raceId);
          const bIsLive = live.has(b.raceId);
          if (aIsLive !== bIsLive) return aIsLive ? -1 : 1;

          const aDate = new Date(a.date).getTime();
          const bDate = new Date(b.date).getTime();
          const aIsToday = aDate >= todayStart && aDate < todayEnd;
          const bIsToday = bDate >= todayStart && bDate < todayEnd;

          // Today's races come next (after live)
          if (aIsToday !== bIsToday) return aIsToday ? -1 : 1;

          // Then upcoming races nearest first
          const aIsFuture = aDate >= todayEnd;
          const bIsFuture = bDate >= todayEnd;
          if (aIsFuture !== bIsFuture) return aIsFuture ? -1 : 1;

          // Within same group, sort by date
          if (aIsFuture && bIsFuture) return aDate - bDate;
          return bDate - aDate; // Past: most recent first
        });

        setRaces(sortedSchedule);

        // Load user picks for all races
        const token = document.cookie
          .split("; ")
          .find((row) => row.startsWith("auth_token="))
          ?.split("=")[1];

        if (token) {
          const { data: user } = await supabase
            .from("profiles")
            .select("id, is_admin")
            .eq("auth_token", token)
            .single();

          if (user) {
            setIsAdmin(user.is_admin || false);

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

  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return "";
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
                <p className="text-sm font-medium mt-1">
                  {formatDate(race.date)} at {formatTime(race.date)}
                </p>

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

                <div className="mt-4 flex gap-2">
                  {liveRaces.has(race.raceId) && (
                    <Button asChild className="flex-1" size="sm" variant="default">
                      <Link href={`/race?raceId=${race.raceId}`}>
                        View Live Race
                      </Link>
                    </Button>
                  )}
                  {!liveRaces.has(race.raceId) && new Date(race.date).getTime() < new Date().getTime() && (
                    <Button asChild className="flex-1" size="sm" variant="secondary">
                      <Link href={`/race?raceId=${race.raceId}`}>
                        View Results
                      </Link>
                    </Button>
                  )}
                  {(new Date(race.date).getTime() >= new Date().getTime() || (isAdmin && liveRaces.has(race.raceId))) && (
                    <Button asChild className="flex-1" size="sm">
                      <Link href={`/picks?raceId=${race.raceId}`}>
                        {picks[race.raceId] && picks[race.raceId].length > 0 ? "Edit Picks" : "Make Picks"}
                      </Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
