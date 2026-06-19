import { PrismaClient, LeadSource, AppointmentStatus, UserRole, Plan, MsgDirection, MsgStatus } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import * as dotenv from "dotenv";

dotenv.config();

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
  ssl: { rejectUnauthorized: false },
});
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
      phone: "+593 99 123 4567",
      address: "Av. Amazonas N34-12 y Eloy Alfaro, Oficina 301",
      city: "Quito",
      country: "EC",
      plan: Plan.PROFESIONAL,
    },
  });

  console.log("✅ Clínica creada:", clinic.name);

  // Usuarios
  const passwordHash = await bcrypt.hash("dentflow2024", 12);

  const owner = await prisma.user.upsert({
    where: { email: "dr.garcia@sonrisas.ec" },
    update: {},
    create: {
      name: "Dr. Carlos García",
      email: "dr.garcia@sonrisas.ec",
      password: passwordHash,
      role: UserRole.ADMIN,
      clinicId: clinic.id,
    },
  });

  const staff = await prisma.user.upsert({
    where: { email: "recepcion@sonrisas.ec" },
    update: {},
    create: {
      name: "María López",
      email: "recepcion@sonrisas.ec",
      password: passwordHash,
      role: UserRole.RECEPTIONIST,
      clinicId: clinic.id,
    },
  });

  console.log("✅ Usuarios creados:", owner.name, "&", staff.name);

  // Etapas del pipeline — 6 etapas definitivas
  const stagesData = [
    { name: "Contacto Nuevo",  slug: "contacto_nuevo", order: 0, color: "#4A90E2", bgColor: "#EEF3FC", headerBgColor: "#DDE8F8", icon: "UserPlus",     isProtected: true,  isDefault: true },
    { name: "Contactado",      slug: "contactado",      order: 1, color: "#8B7CF6", bgColor: "#F2EFFE", headerBgColor: "#E8E2FC", icon: "Phone",        isProtected: false, isDefault: true },
    { name: "Calificado",      slug: "calificado",      order: 2, color: "#0D9488", bgColor: "#EDFAF4", headerBgColor: "#D8F4E8", icon: "BadgeCheck",   isProtected: false, isDefault: true },
    { name: "Cita Agendada",   slug: "cita_agendada",   order: 3, color: "#E8A528", bgColor: "#FEF9EE", headerBgColor: "#FDF0D4", icon: "CalendarCheck",isProtected: false, isDefault: true },
    { name: "Convertido",      slug: "convertido",      order: 4, color: "#10B981", bgColor: "#EDFBF6", headerBgColor: "#D4F5E7", icon: "HeartPulse",   isProtected: true,  isDefault: true },
    { name: "Perdido",         slug: "perdido",         order: 5, color: "#F47B8A", bgColor: "#FEF2F4", headerBgColor: "#FDE2E7", icon: "XCircle",      isProtected: true,  isDefault: true },
  ];

  const stages: Record<string, string> = {};
  for (const s of stagesData) {
    const stage = await prisma.pipelineStage.create({
      data: { ...s, clinicId: clinic.id, isCustom: false },
    });
    stages[s.slug] = stage.id;
  }

  console.log("✅ Etapas del pipeline creadas");

  // Leads de demostración
  const leadsData = [
    {
      fullName: "Andrea Martínez",
      phone: "+593 99 555 0101",
      email: "andrea.m@email.com",
      source: LeadSource.INSTAGRAM,
      interest: "Ortodoncia",
      estimatedValue: 1800,
      stageId: stages["contacto_nuevo"],
    },
    {
      fullName: "Roberto Silva",
      phone: "+593 98 555 0102",
      source: LeadSource.REFERIDO,
      interest: "Implante dental",
      estimatedValue: 1400,
      stageId: stages["contactado"],
    },
    {
      fullName: "Camila Torres",
      phone: "+593 97 555 0103",
      email: "camila.t@gmail.com",
      source: LeadSource.GOOGLE,
      interest: "Blanqueamiento",
      estimatedValue: 280,
      stageId: stages["cita_agendada"],
    },
    {
      fullName: "Diego Ramírez",
      phone: "+593 96 555 0104",
      source: LeadSource.FACEBOOK,
      interest: "Carillas",
      estimatedValue: 2200,
      stageId: stages["calificado"],
    },
    {
      fullName: "Valentina Gómez",
      phone: "+593 99 555 0105",
      email: "vgomez@correo.com",
      source: LeadSource.WHATSAPP,
      interest: "Ortodoncia invisible",
      estimatedValue: 2500,
      stageId: stages["contacto_nuevo"],
    },
    {
      fullName: "Andrés Moreno",
      phone: "+593 98 555 0106",
      source: LeadSource.TIKTOK,
      interest: "Blanqueamiento",
      estimatedValue: 260,
      stageId: stages["contactado"],
    },
    {
      fullName: "Lucía Herrera",
      phone: "+593 97 555 0107",
      email: "lucia.h@hotmail.com",
      source: LeadSource.INSTAGRAM,
      interest: "Implante dental",
      estimatedValue: 1600,
      stageId: stages["cita_agendada"],
    },
    {
      fullName: "Felipe Castillo",
      phone: "+593 96 555 0108",
      source: LeadSource.REFERIDO,
      interest: "Ortodoncia",
      estimatedValue: 1700,
      stageId: stages["calificado"],
    },
    {
      fullName: "Sara Quintero",
      phone: "+593 99 555 0109",
      source: LeadSource.GOOGLE,
      interest: "Carillas",
      estimatedValue: 2400,
      stageId: stages["contacto_nuevo"],
    },
    {
      fullName: "Nicolás Vargas",
      phone: "+593 98 555 0110",
      email: "nvargas@empresa.com",
      source: LeadSource.REFERIDO,
      interest: "Limpieza dental",
      estimatedValue: 45,
      stageId: stages["contactado"],
    },
    {
      fullName: "Isabella Ríos",
      phone: "+593 97 555 0111",
      source: LeadSource.FACEBOOK,
      interest: "Ortodoncia",
      estimatedValue: 1900,
      stageId: stages["perdido"],
      notes: "No le gustó el presupuesto, fue a otra clínica",
    },
    {
      fullName: "Sebastián Peña",
      phone: "+593 96 555 0112",
      email: "sepeña@mail.com",
      source: LeadSource.INSTAGRAM,
      interest: "Implante dental",
      estimatedValue: 1500,
      stageId: stages["contacto_nuevo"],
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
      phone: "+593 99 111 2233",
      email: "mfcastro@gmail.com",
      birthDate: new Date("1990-03-15"),
      cedula: "1020304050",
      address: "Av. 6 de Diciembre N24-100",
    },
    {
      fullName: "Juan Pablo Ospina",
      phone: "+593 98 222 3344",
      email: "jpospina@hotmail.com",
      birthDate: new Date("1985-07-22"),
      cedula: "2030405060",
    },
    {
      fullName: "Ana Lucía Mendez",
      phone: "+593 97 333 4455",
      birthDate: new Date("1995-11-08"),
      cedula: "3040506070",
      address: "Av. República del Salvador N35-50 y Suecia",
    },
    {
      fullName: "Carlos Eduardo Ruiz",
      phone: "+593 96 444 5566",
      email: "ceruiz@empresa.com",
      birthDate: new Date("1978-01-30"),
      cedula: "4050607080",
    },
    {
      fullName: "Patricia Salamanca",
      phone: "+593 99 555 6677",
      email: "pslm@correo.com",
      birthDate: new Date("1982-09-12"),
      cedula: "5060708090",
      address: "Av. Naciones Unidas y Av. de los Shyris",
    },
    {
      fullName: "Alejandro Torres",
      phone: "+593 98 666 7788",
      birthDate: new Date("2000-05-25"),
      cedula: "6070809000",
    },
    {
      fullName: "Gloria Inés Parra",
      phone: "+593 97 777 8899",
      email: "giparra@mail.com",
      birthDate: new Date("1968-12-03"),
      cedula: "7080900001",
      address: "Av. Mariscal Sucre y Av. Occidental",
    },
    {
      fullName: "Daniel Muñoz",
      phone: "+593 96 888 9900",
      email: "dmunoz@startup.com",
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
      value: 60,
      status: AppointmentStatus.COMPLETED,
      scheduledAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
    },
    {
      patientId: createdPatients[1].id,
      dentistId: owner.id,
      procedure: "Implante - Fase quirúrgica",
      value: 1300,
      status: AppointmentStatus.COMPLETED,
      scheduledAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
    },
    {
      patientId: createdPatients[2].id,
      dentistId: owner.id,
      procedure: "Blanqueamiento dental",
      value: 280,
      status: AppointmentStatus.SCHEDULED,
      scheduledAt: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000),
    },
    {
      patientId: createdPatients[3].id,
      dentistId: owner.id,
      procedure: "Limpieza y revisión",
      value: 45,
      status: AppointmentStatus.CONFIRMED,
      scheduledAt: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
    },
    {
      patientId: createdPatients[4].id,
      dentistId: owner.id,
      procedure: "Carilla porcelana - Preparación",
      value: 450,
      status: AppointmentStatus.SCHEDULED,
      scheduledAt: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
    },
    {
      patientId: createdPatients[5].id,
      dentistId: owner.id,
      procedure: "Ortodoncia - Primera consulta",
      value: 50,
      status: AppointmentStatus.SCHEDULED,
      scheduledAt: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000),
    },
    {
      patientId: createdPatients[6].id,
      dentistId: owner.id,
      procedure: "Extracción molar",
      value: 70,
      status: AppointmentStatus.CANCELLED,
      scheduledAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      notes: "Paciente canceló por viaje",
    },
    {
      patientId: createdPatients[7].id,
      dentistId: owner.id,
      procedure: "Implante - Consulta inicial",
      value: 30,
      status: AppointmentStatus.COMPLETED,
      scheduledAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      patientId: createdPatients[0].id,
      dentistId: owner.id,
      procedure: "Ortodoncia - Control",
      value: 60,
      status: AppointmentStatus.SCHEDULED,
      scheduledAt: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
    },
    {
      patientId: createdPatients[1].id,
      dentistId: owner.id,
      procedure: "Implante - Seguimiento",
      value: 50,
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
      { direction: MsgDirection.OUTBOUND, content: "El plan completo va desde $1.800. Le envío el presupuesto detallado.", status: MsgStatus.DELIVERED },
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
      { direction: MsgDirection.OUTBOUND, content: "Hola, trabajamos con Humana, Salud S.A. y Ecuatoriano Suizo. ¿Cuál tiene usted?", status: MsgStatus.READ },
      { direction: MsgDirection.INBOUND,  content: "Tengo Humana. ¿Me pueden dar la cita para la próxima semana?", status: MsgStatus.READ },
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
  console.log("   Email: dr.garcia@sonrisas.ec");
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
