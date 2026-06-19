import { redirect } from "next/navigation";
import { auth } from "../../../../auth";
import { db } from "@/lib/db";
import { WizardFlow } from "@/components/onboarding/WizardFlow";

export const dynamic = "force-dynamic";

export default async function WizardPage() {
  const session = await auth();
  if (!session?.user?.clinicId) redirect("/login");

  const clinic = await db.clinic.findUnique({
    where:  { id: session.user.clinicId },
    select: { onboardingStep: true, onboardingCompleted: true },
  });
  if (!clinic) redirect("/login");
  if (clinic.onboardingCompleted) redirect("/dashboard");

  return <WizardFlow initialStep={clinic.onboardingStep} />;
}
