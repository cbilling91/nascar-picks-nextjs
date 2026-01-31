import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy } from "lucide-react";

export default function StandingsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-6">
        <Trophy className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Standings</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>2026 Season Standings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>Season has not started yet.</p>
            <p className="text-sm mt-2">Standings will appear after the first race.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
