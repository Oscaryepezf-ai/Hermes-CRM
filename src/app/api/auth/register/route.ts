import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { slugify } from "@/lib/utils";

const registerSchema = z.object({
  clinicName: z.string().min(2),
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { clinicName, name, email, password } = parsed.data;

    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { error: "Ya existe una cuenta con ese email" },
        { status: 409 }
      );
    }

    const baseSlug = slugify(clinicName);
    let slug = baseSlug;
    let suffix = 1;
    while (await db.clinic.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${suffix++}`;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const clinic = await db.clinic.create({
      data: {
        name: clinicName,
        slug,
        plan: "STARTER",
      },
    });

    // Etapas predeterminadas
    const defaultStages = [
      { name: "Nuevo Lead", order: 1, color: "#6366f1" },
      { name: "Contactado", order: 2, color: "#8b5cf6" },
      { name: "Cita Agendada", order: 3, color: "#06b6d4" },
      { name: "Presupuesto Enviado", order: 4, color: "#f59e0b" },
      { name: "Convertido", order: 5, color: "#10b981" },
      { name: "Perdido", order: 6, color: "#ef4444" },
    ];

    await db.pipelineStage.createMany({
      data: defaultStages.map((s) => ({ ...s, clinicId: clinic.id })),
    });

    await db.user.create({
      data: {
        name,
        email,
        password: passwordHash,
        role: "OWNER",
        clinicId: clinic.id,
      },
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("[register]", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
