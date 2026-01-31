import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Radio } from "lucide-react";

export default function LivePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-6">
        <Radio className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Live Race</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>No Race In Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>Live race tracking will appear here during races.</p>
            <p className="text-sm mt-2">Data updates every 10 seconds.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
