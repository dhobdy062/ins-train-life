import { redirect } from "next/navigation";

export default async function DemoPage() {
  redirect("/dashboard/trainer");
}
