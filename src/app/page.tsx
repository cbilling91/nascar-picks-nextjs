import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Trophy, Flag, Clock } from "lucide-react";
import { getCurrentUser } from "@/lib/token-auth";
import { getNASCARSchedule, getLiveLapData } from "@/lib/nascar-api";

export default async function Home() {
  const user = await getCurrentUser();

  const schedule = await getNASCARSchedule();
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const nextRace = schedule
    .filter((race) => new Date(race.date) >= todayStart)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0] ?? null;

  const formattedDate = nextRace
    ? new Date(nextRace.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : null;

  const lapData = nextRace ? await getLiveLapData(nextRace.raceId) : null;
  const isLive = lapData !== null && lapData.currentLap > 0;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2">NASCAR Picks 2026</h1>
        <p className="text-muted-foreground text-lg">
          Make your picks and compete for the championship
        </p>
      </div>

      {!user ? (
        <Card className="max-w-md mx-auto">
          <CardHeader className="text-center">
            <CardTitle>Welcome to NASCAR Picks</CardTitle>
            <CardDescription>
              Check your text messages for your access link
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              An admin will send you a link via text message. Click it to access the app.
            </p>
            <p className="text-xs text-muted-foreground text-center">
              Need to manage players? Visit <Link href="/admin/users" className="text-primary hover:underline">/admin/users</Link>
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Next Race</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{nextRace?.name ?? "TBD"}</div>
              <p className="text-xs text-muted-foreground">
                {formattedDate ?? "No upcoming races"}
              </p>
              <Button asChild className="mt-4 w-full" size="sm">
                <Link href={isLive ? `/race?raceId=${nextRace!.raceId}` : nextRace ? `/picks?raceId=${nextRace.raceId}` : "/schedule"}>
                  {isLive ? "View Live Race" : nextRace ? "Make Picks" : "View Schedule"}
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Your Rank</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">--</div>
              <p className="text-xs text-muted-foreground">
                Season not started
              </p>
              <Button asChild variant="outline" className="mt-4 w-full" size="sm">
                <Link href="/standings">View Standings</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Points</CardTitle>
              <Flag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">
                0 weekly wins
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Countdown</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">--d --h</div>
              <p className="text-xs text-muted-foreground">
                Until picks lock
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
