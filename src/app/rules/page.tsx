import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen } from "lucide-react";

export default function RulesPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="flex items-center gap-2 mb-6">
        <BookOpen className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Competition Rules</h1>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Rules</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-invert prose-sm">
            <ul className="space-y-2 text-sm">
              <li>Pick 3 drivers each week before race start</li>
              <li>Only 1 driver can carry over from your previous race picks</li>
              <li>If 2 drivers are picked in consecutive races, the higher scorer is dropped</li>
              <li>Picks can be public or private</li>
              <li>$30 entry fee</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Scoring</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-invert prose-sm">
            <ul className="space-y-2 text-sm">
              <li><strong>Regular Races:</strong> Sum of your 3 drivers' race points</li>
              <li><strong>Weekly Win Bonus:</strong> +25 points for highest score</li>
              <li><strong>Clash:</strong> Top 5 combined finishing position (1st-30, 2nd-20, 3rd-15, 4th-10, 5th-5 pts)</li>
              <li><strong>All-Star Race:</strong> Top 5 combined finishing position (1st-30, 2nd-20, 3rd-15, 4th-10, 5th-5 pts)</li>
              <li><strong>Daytona Duels:</strong> Driver points for top 10 finish (1st-10, 2nd-9, etc.)</li>
            </ul>
            <p className="text-xs text-muted-foreground mt-4">*Extra races (Clash, Duels, All-Star) do not affect carryover rules for subsequent races</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>The Chase</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-invert prose-sm">
            <ul className="space-y-2 text-sm">
              <li>Top 10 in points at end of regular season make The Chase</li>
              <li>Points reset: 1st-200, 2nd-150, 3rd-125, 4th-100, 5th-75, 6th-60, 7th-45, 8th-30, 9th-15, 10th-0</li>
              <li>10 race finale, most points wins the championship</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>In-Season Tournament</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-invert prose-sm">
            <ul className="space-y-2 text-sm">
              <li>4-round head-to-head bracket (seeded after Sonoma)</li>
              <li>Round of 15: Chicagoland</li>
              <li>Round of 8: Atlanta</li>
              <li>Round of 4: North Wilkesboro</li>
              <li>Championship: Indianapolis</li>
              <li>Winner: 50 points + $60 | Runner-up: 25 points</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payouts</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-invert prose-sm">
            <ul className="space-y-2 text-sm">
              <li><strong>Season Champion:</strong> $220</li>
              <li><strong>2nd Place:</strong> $90</li>
              <li><strong>3rd Place:</strong> $30</li>
              <li><strong>Regular Season Champion:</strong> $50</li>
              <li><strong>Tournament Winner:</strong> $60</li>
            </ul>
            <p className="text-xs text-muted-foreground mt-4">*Based on 15 participants</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
