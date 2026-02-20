import { redirect } from "next/navigation";

export default async function DemoPage() {
  redirect("/workspace/select-organization?redirect_url=%2Fdashboard%2Ftrainer");
}
