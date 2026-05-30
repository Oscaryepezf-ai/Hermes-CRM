import { redirect } from "next/navigation";
import { auth } from "../../../../auth";
import { db } from "@/lib/db";
import { SettingsView } from "@/components/dashboard/SettingsView";

function maskKey(key: string | undefined): string {
  if (!key || key === "sk-placeholder") return "••••••••••••••••";
  return "•".repeat(Math.min(key.length, 18));
}

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.clinicId) redirect("/login");

  const clinic = await db.clinic.findUnique({
    where: { id: session.user.clinicId },
    select: { name: true, plan: true },
  });

  if (!clinic) redirect("/login");

  return (
    <SettingsView
      clinicName={clinic.name}
      currentPlan={clinic.plan}
      apiKeyMasked={maskKey(process.env.OPENAI_API_KEY)}
    />
  );
}
