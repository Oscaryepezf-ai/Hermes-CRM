import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const PLAN_MAP: Record<string, "STARTER" | "PROFESIONAL" | "CLINICA"> = {
  STARTER: "STARTER",
  PROFESIONAL: "PROFESIONAL",
  CLINICA: "CLINICA",
};

export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Stripe no configurado" }, { status: 503 });
  }
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2026-04-22.dahlia",
  });
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Sin firma" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return NextResponse.json({ error: "Firma inválida" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const clinicId = session.metadata?.clinicId;
        const plan = session.metadata?.plan;

        if (clinicId && plan && PLAN_MAP[plan]) {
          await db.clinic.update({
            where: { id: clinicId },
            data: {
              plan: PLAN_MAP[plan],
              stripeSubscriptionId: session.subscription as string,
            },
          });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const clinicId = subscription.metadata?.clinicId;

        if (clinicId) {
          await db.clinic.update({
            where: { id: clinicId },
            data: {
              plan: "STARTER",
              stripeSubscriptionId: null,
            },
          });
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const clinicId = subscription.metadata?.clinicId;
        const plan = subscription.metadata?.plan;

        if (clinicId && plan && PLAN_MAP[plan]) {
          await db.clinic.update({
            where: { id: clinicId },
            data: { plan: PLAN_MAP[plan] },
          });
        }
        break;
      }
    }
  } catch (error) {
    console.error("[webhook/stripe]", error);
    return NextResponse.json(
      { error: "Error procesando webhook" },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}
