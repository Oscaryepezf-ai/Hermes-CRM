import { PrismaClient, LeadSource, AppointmentStatus, UserRole, Plan, MsgDirection, MsgStatus } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import * as dotenv from "dotenv";

dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Iniciando seed...");

  // Clínica principal
  const clinic = await prisma.clinic.upsert({
    where: { slug: "clinica-dental-sonrisas" },
    update: {},
    create: {
      name: "Clínica Dental Sonrisas",
      slug: "clinica-dental-sonrisas",
      phone: "+57 300 123 4567",
      address: "Cra. 15 #93-75, Oficina 301",
      city: "Bogotá",
      country: "CO",
      plan: Plan.PROFESIONAL,
    },
  });

  console.log("✅ Clínica creada:", clinic.name);

  // Usuarios
  const passwordHash = await bcrypt.hash("dentflow2024", 12);

  const owner = await prisma.user.upsert({
    where: { email: "dr.garcia@sonrisas.co" },
    update: {},
    create: {
      name: "Dr. Carlos García",
      email: "dr.garcia@sonrisas.co",
      password: passwordHash,
      role: UserRole.OWNER,
      clinicId: clinic.id,
    },
  });

  const staff = await prisma.user.upsert({
    where: { email: "recepcion@sonrisas.co" },
    update: {},
    create: {
      name: "María López",
      email: "recepcion@sonrisas.co",
      password: passwordHash,
      role: UserRole.STAFF,
      clinicId: clinic.id,
    },
  });

  console.log("✅ Usuarios creados:", owner.name, "&", staff.name);

  // Etapas del pipeline
  const stagesData = [
    { name: "Nuevo Lead", order: 1, color: "#6366f1" },
    { name: "Contactado", order: 2, color: "#8b5cf6" },
    { name: "Cita Agendada", order: 3, color: "#06b6d4" },
    { name: "Presupuesto Enviado", order: 4, color: "#f59e0b" },
    { name: "Convertido", order: 5, color: "#10b981" },
    { name: "Perdido", order: 6, color: "#ef4444" },
  ];

  const stages: Record<string, string> = {};
  for (const s of stagesData) {
    const stage = await prisma.pipelineStage.create({
      data: { ...s, clinicId: clinic.id },
    });
    stages[s.name] = stage.id;
  }

  console.log("✅ Etapas del pipeline creadas");

  // Leads de demostración
  const leadsData = [
    {
      fullName: "Andrea Martínez",
      phone: "+57 310 555 0101",
      email: "andrea.m@email.com",
      source: LeadSource.INSTAGRAM,
      interest: "Ortodoncia",
      estimatedValue: 4500000,
      stageId: stages["Nuevo Lead"],
    },
    {
      fullName: "Roberto Silva",
      phone: "+57 315 555 0102",
      source: LeadSource.REFERIDO,
      interest: "Implante dental",
      estimatedValue: 3200000,
      stageId: stages["Contactado"],
    },
    {
      fullName: "Camila Torres",
      phone: "+57 320 555 0103",
      email: "camila.t@gmail.com",
      source: LeadSource.GOOGLE,
      interest: "Blanqueamiento",
      estimatedValue: 800000,
      stageId: stages["Cita Agendada"],
    },
    {
      fullName: "Diego Ramírez",
      phone: "+57 311 555 0104",
      source: LeadSource.FACEBOOK,
      interest: "Carillas",
      estimatedValue: 6000000,
      stageId: stages["Presupuesto Enviado"],
    },
    {
      fullName: "Valentina Gómez",
      phone: "+57 314 555 0105",
      email: "vgomez@correo.co",
      source: LeadSource.WHATSAPP,
      interest: "Ortodoncia invisible",
      estimatedValue: 5500000,
      stageId: stages["Nuevo Lead"],
    },
    {
      fullName: "Andrés Moreno",
      phone: "+57 316 555 0106",
      source: LeadSource.TIKTOK,
      interest: "Blanqueamiento",
      estimatedValue: 750000,
      stageId: stages["Contactado"],
    },
    {
      fullName: "Lucía Herrera",
      phone: "+57 317 555 0107",
      email: "lucia.h@hotmail.com",
      source: LeadSource.INSTAGRAM,
      interest: "Implante dental",
      estimatedValue: 3800000,
      stageId: stages["Cita Agendada"],
    },
    {
      fullName: "Felipe Castillo",
      phone: "+57 318 555 0108",
      source: LeadSource.REFERIDO,
      interest: "Ortodoncia",
      estimatedValue: 4200000,
      stageId: stages["Presupuesto Enviado"],
    },
    {
      fullName: "Sara Quintero",
      phone: "+57 312 555 0109",
      source: LeadSource.GOOGLE,
      interest: "Carillas",
      estimatedValue: 5800000,
      stageId: stages["Nuevo Lead"],
    },
    {
      fullName: "Nicolás Vargas",
      phone: "+57 313 555 0110",
      email: "nvargas@empresa.co",
      source: LeadSource.REFERIDO,
      interest: "Limpieza dental",
      estimatedValue: 250000,
      stageId: stages["Contactado"],
    },
    {
      fullName: "Isabella Ríos",
      phone: "+57 319 555 0111",
      source: LeadSource.FACEBOOK,
      interest: "Ortodoncia",
      estimatedValue: 4700000,
      stageId: stages["Perdido"],
      notes: "No le gustó el presupuesto, fue a otra clínica",
    },
    {
      fullName: "Sebastián Peña",
      phone: "+57 321 555 0112",
      email: "speña@mail.com",
      source: LeadSource.INSTAGRAM,
      interest: "Implante dental",
      estimatedValue: 3500000,
      stageId: stages["Nuevo Lead"],
    },
  ];

  const createdLeads = [];
  for (const lead of leadsData) {
    const created = await prisma.lead.create({
      data: { ...lead, clinicId: clinic.id },
    });
    createdLeads.push(created);

    // Registrar historial inicial
    await prisma.leadHistory.create({
      data: {
        leadId: created.id,
        userId: staff.id,
        fromStage: null,
        toStage: "Nuevo Lead",
        note: "Lead creado",
      },
    });
  }

  console.log("✅ Leads creados:", createdLeads.length);

  // Pacientes de demostración
  const patientsData = [
    {
      fullName: "María Fernanda Castro",
      phone: "+57 300 111 2233",
      email: "mfcastro@gmail.com",
      birthDate: new Date("1990-03-15"),
      cedula: "1020304050",
      address: "Cra. 7 #45-20",
    },
    {
      fullName: "Juan Pablo Ospina",
      phone: "+57 310 222 3344",
      email: "jpospina@hotmail.com",
      birthDate: new Date("1985-07-22"),
      cedula: "2030405060",
    },
    {
      fullName: "Ana Lucía Mendez",
      phone: "+57 315 333 4455",
      birthDate: new Date("1995-11-08"),
      cedula: "3040506070",
      address: "Cll. 100 #15-40 Apto 302",
    },
    {
      fullName: "Carlos Eduardo Ruiz",
      phone: "+57 320 444 5566",
      email: "ceruiz@empresa.co",
      birthDate: new Date("1978-01-30"),
      cedula: "4050607080",
    },
    {
      fullName: "Patricia Salamanca",
      phone: "+57 311 555 6677",
      email: "pslm@correo.co",
      birthDate: new Date("1982-09-12"),
      cedula: "5060708090",
      address: "Av. 68 #22-15",
    },
    {
      fullName: "Alejandro Torres",
      phone: "+57 314 666 7788",
      birthDate: new Date("2000-05-25"),
      cedula: "6070809000",
    },
    {
      fullName: "Gloria Inés Parra",
      phone: "+57 316 777 8899",
      email: "giparra@mail.com",
      birthDate: new Date("1968-12-03"),
      cedula: "7080900001",
      address: "Cra. 30 #67-50",
    },
    {
      fullName: "Daniel Muñoz",
      phone: "+57 317 888 9900",
      email: "dmunoz@startup.co",
      birthDate: new Date("1993-08-17"),
      cedula: "8090000012",
    },
  ];

  const createdPatients = [];
  for (const patient of patientsData) {
    const created = await prisma.patient.create({
      data: { ...patient, clinicId: clinic.id },
    });
    createdPatients.push(created);
  }

  console.log("✅ Pacientes creados:", createdPatients.length);

  // Citas de demostración
  const now = new Date();
  const appointmentsData = [
    {
      patientId: createdPatients[0].id,
      dentistId: owner.id,
      procedure: "Ortodoncia - Control mensual",
      value: 150000,
      status: AppointmentStatus.COMPLETED,
      scheduledAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
    },
    {
      patientId: createdPatients[1].id,
      dentistId: owner.id,
      procedure: "Implante - Fase quirúrgica",
      value: 2800000,
      status: AppointmentStatus.COMPLETED,
      scheduledAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
    },
    {
      patientId: createdPatients[2].id,
      dentistId: owner.id,
      procedure: "Blanqueamiento dental",
      value: 750000,
      status: AppointmentStatus.SCHEDULED,
      scheduledAt: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000),
    },
    {
      patientId: createdPatients[3].id,
      dentistId: owner.id,
      procedure: "Limpieza y revisión",
      value: 250000,
      status: AppointmentStatus.CONFIRMED,
      scheduledAt: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
    },
    {
      patientId: createdPatients[4].id,
      dentistId: owner.id,
      procedure: "Carilla porcelana - Preparación",
      value: 1200000,
      status: AppointmentStatus.SCHEDULED,
      scheduledAt: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
    },
    {
      patientId: createdPatients[5].id,
      dentistId: owner.id,
      procedure: "Ortodoncia - Primera consulta",
      value: 200000,
      status: AppointmentStatus.SCHEDULED,
      scheduledAt: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000),
    },
    {
      patientId: createdPatients[6].id,
      dentistId: owner.id,
      procedure: "Extracción molar",
      value: 350000,
      status: AppointmentStatus.CANCELLED,
      scheduledAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      notes: "Paciente canceló por viaje",
    },
    {
      patientId: createdPatients[7].id,
      dentistId: owner.id,
      procedure: "Implante - Consulta inicial",
      value: 100000,
      status: AppointmentStatus.COMPLETED,
      scheduledAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      patientId: createdPatients[0].id,
      dentistId: owner.id,
      procedure: "Ortodoncia - Control",
      value: 150000,
      status: AppointmentStatus.SCHEDULED,
      scheduledAt: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
    },
    {
      patientId: createdPatients[1].id,
      dentistId: owner.id,
      procedure: "Implante - Seguimiento",
      value: 200000,
      status: AppointmentStatus.SCHEDULED,
      scheduledAt: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000),
    },
  ];

  for (const appointment of appointmentsData) {
    await prisma.appointment.create({
      data: { ...appointment, clinicId: clinic.id },
    });
  }

  console.log("✅ Citas creadas:", appointmentsData.length);

  // Mensajes de demostración para los primeros 5 leads
  const sampleConversations: { direction: MsgDirection; content: string; status: MsgStatus }[][] = [
    [
      { direction: MsgDirection.INBOUND,  content: "Hola buenas tardes, ¿tienen disponibilidad esta semana?", status: MsgStatus.READ },
      { direction: MsgDirection.OUTBOUND, content: "¡Hola! Claro que sí. ¿Qué día le queda mejor?", status: MsgStatus.READ },
      { direction: MsgDirection.INBOUND,  content: "El jueves en la tarde estaría perfecto", status: MsgStatus.READ },
      { direction: MsgDirection.OUTBOUND, content: "Perfecto, le agendo el jueves a las 3:00 PM. ¿Le parece bien?", status: MsgStatus.DELIVERED },
      { direction: MsgDirection.INBOUND,  content: "Sí perfecto, muchas gracias!", status: MsgStatus.READ },
    ],
    [
      { direction: MsgDirection.INBOUND,  content: "Buenos días, me recomendaron su clínica para ortodoncia", status: MsgStatus.READ },
      { direction: MsgDirection.OUTBOUND, content: "¡Buenos días! Con mucho gusto. ¿Desea agendar una valoración gratuita?", status: MsgStatus.READ },
      { direction: MsgDirection.INBOUND,  content: "Sí, ¿cuánto cuesta el tratamiento?", status: MsgStatus.READ },
      { direction: MsgDirection.OUTBOUND, content: "El plan completo va desde $3.500.000. Le envío el presupuesto detallado.", status: MsgStatus.DELIVERED },
    ],
    [
      { direction: MsgDirection.INBOUND,  content: "Hola, vi su publicidad en Instagram sobre blanqueamiento", status: MsgStatus.READ },
      { direction: MsgDirection.OUTBOUND, content: "¡Hola! Sí, tenemos promo activa. Le cuento los detalles...", status: MsgStatus.READ },
      { direction: MsgDirection.INBOUND,  content: "¿Incluye mantenimiento en casa?", status: MsgStatus.READ },
    ],
    [
      { direction: MsgDirection.INBOUND,  content: "Necesito urgente una cita, me duele mucho una muela", status: MsgStatus.READ },
      { direction: MsgDirection.OUTBOUND, content: "Entendemos la urgencia. Tenemos cupo hoy a las 5 PM. ¿Puede venir?", status: MsgStatus.DELIVERED },
    ],
    [
      { direction: MsgDirection.INBOUND,  content: "Hola, ¿atienden seguros de salud?", status: MsgStatus.READ },
      { direction: MsgDirection.OUTBOUND, content: "Hola, trabajamos con Sura, Compensar y Colsanitas. ¿Cuál tiene usted?", status: MsgStatus.READ },
      { direction: MsgDirection.INBOUND,  content: "Tengo Sura. ¿Me pueden dar la cita para la próxima semana?", status: MsgStatus.READ },
      { direction: MsgDirection.OUTBOUND, content: "Perfecto. Le envío la solicitud de autorización. En 48h tenemos respuesta.", status: MsgStatus.SENT },
    ],
  ];

  for (let i = 0; i < Math.min(createdLeads.length, sampleConversations.length); i++) {
    const lead = createdLeads[i];
    const conversation = sampleConversations[i];
    for (let j = 0; j < conversation.length; j++) {
      const msg = conversation[j];
      await prisma.message.create({
        data: {
          leadId: lead.id,
          direction: msg.direction,
          content: msg.content,
          status: msg.status,
          sentAt: new Date(now.getTime() - (conversation.length - j) * 5 * 60 * 1000),
        },
      });
    }
  }

  console.log("✅ Mensajes de demo creados");
  console.log("\n🎉 Seed completado exitosamente!");
  console.log("\n📧 Credenciales de acceso:");
  console.log("   Email: dr.garcia@sonrisas.co");
  console.log("   Contraseña: dentflow2024");
}

main()
  .catch((e) => {
    console.error("❌ Error en seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
