import { redirect } from "next/navigation";

// The schedule is the hub of the app - it has the next race, live status,
// your picks per race, and links to make picks or view live/results.
export default function Home() {
  redirect("/schedule");
}
