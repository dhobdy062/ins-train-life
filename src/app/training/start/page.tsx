import { redirect } from "next/navigation";

export default async function TrainingStartPage() {
  redirect("/dashboard/trainee");
}
