import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { auth } from "../../../../../auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const PRICE_IDS: Record<string, string | undefined> = {
  STARTER:     process.env.STRIPE_STARTER_PRICE_ID,
  PROFESIONAL: process.env.STRIPE_PROFESIONAL_PRICE_ID,
  CLINICA:     process.env.STRIPE_CLINICA_PRICE_ID,
};

export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Stripe no configurado" }, { status: 503 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2026-04-22.dahlia",
  });

  try {
    const session = await auth();
    if (!session?.user?.clinicId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { plan } = await req.json();
    const priceId = PRICE_IDS[plan];

    if (!priceId) {
      return NextResponse.json({ error: "Plan no válido" }, { status: 400 });
    }

    const clinic = await db.clinic.findUnique({
      where: { id: session.user.clinicId },
    });

    if (!clinic) {
      return NextResponse.json({ error: "Clínica no encontrada" }, { status: 404 });
    }

    let customerId = clinic.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: session.user.email,
        name: clinic.name,
        metadata: { clinicId: clinic.id },
      });
      customerId = customer.id;

      await db.clinic.update({
        where: { id: clinic.id },
        data: { stripeCustomerId: customerId },
      });
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?plan=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
      metadata: { clinicId: clinic.id, plan },
      subscription_data: {
        metadata: { clinicId: clinic.id, plan },
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("[stripe/checkout]", error);
    return NextResponse.json(
      { error: "Error al crear la sesión de pago" },
      { status: 500 }
    );
  }
}
