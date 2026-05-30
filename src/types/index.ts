import type {
  Clinic,
  User,
  Lead,
  LeadHistory,
  Patient,
  Appointment,
  PipelineStage,
  Plan,
  UserRole,
  LeadSource,
  AppointmentStatus,
} from "@prisma/client";

export type {
  Clinic,
  User,
  Lead,
  LeadHistory,
  Patient,
  Appointment,
  PipelineStage,
  Plan,
  UserRole,
  LeadSource,
  AppointmentStatus,
};

export type LeadWithStage = Lead & {
  stage: PipelineStage;
  history: (LeadHistory & { user: Pick<User, "id" | "name"> })[];
};

export type PatientWithAppointments = Patient & {
  appointments: (Appointment & { dentist: Pick<User, "id" | "name"> })[];
};

export type AppointmentWithRelations = Appointment & {
  patient: Pick<Patient, "id" | "fullName" | "phone">;
  dentist: Pick<User, "id" | "name">;
};

export type DashboardMetrics = {
  totalLeads: number;
  conversionRate: number;
  monthlyRevenue: number;
  appointmentsThisMonth: number;
  leadsBySource: { source: string; count: number }[];
  conversionByStage: { stage: string; count: number; percentage: number }[];
  revenueByMonth: { month: string; value: number }[];
  topProcedures: { name: string; count: number; revenue: number }[];
};

export type ActionResponse<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

export type NavItem = {
  label: string;
  href: string;
  icon: string;
};

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      clinicId: string;
      role: UserRole;
      avatarUrl?: string | null;
    };
  }

  interface User {
    id: string;
    name: string;
    email: string;
    clinicId: string;
    role: UserRole;
    avatarUrl?: string | null;
  }
}

// next-auth/jwt module augmentation moved to auth.ts
