import { isWhatsAppOtpReady } from "@/lib/auth/whatsapp-otp";
import { LegacyEmailRegisterForm } from "@/components/auth/LegacyEmailRegisterForm";
import { WhatsAppRegisterFlow } from "@/components/auth/WhatsAppRegisterFlow";

export const dynamic = "force-dynamic";

export default function RegisterPage() {
  return isWhatsAppOtpReady() ? <WhatsAppRegisterFlow /> : <LegacyEmailRegisterForm />;
}
