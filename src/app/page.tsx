import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Trophy, Flag, Clock } from "lucide-react";
import { getCurrentUser } from "@/lib/token-auth";

export default async function Home() {
  const user = await getCurrentUser();

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
              <div className="text-2xl font-bold">Daytona 500</div>
              <p className="text-xs text-muted-foreground">
                February 16, 2026
              </p>
              <Button asChild className="mt-4 w-full" size="sm">
                <Link href="/picks">Make Picks</Link>
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
