import { redirect } from "next/navigation";
import { currentMonth } from "@/lib/date";

export default function Root() {
  redirect(`/m/${currentMonth()}`);
}
