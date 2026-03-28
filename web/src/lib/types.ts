export type UserRole = "admin" | "teacher";

export type StudentStatus = "active" | "paused" | "withdrawn";
export type AttendanceStatus = "present" | "absent" | "late" | "early_leave" | "makeup";
export type PaymentStatus = "paid" | "pending" | "unpaid" | "refunded";
export type MakeupStatus = "waiting" | "scheduled" | "completed";
export type ClassType = "regular" | "trial" | "oneday";

export interface Student {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  birth_date: string | null;
  grade: string;
  status: StudentStatus;
  join_date: string;
  parent_name: string | null;
  parent_phone: string | null;
  notes: string | null;
  created_at: string;
}

export interface AcademyClass {
  id: string;
  name: string;
  teacher_name: string;
  class_type: ClassType;
  class_status: "active" | "ended";
  days_of_week: string[];
  start_time: string;
  end_time: string;
  monthly_fee: number;
  monthly_sessions: number;
  capacity: number;
  created_at: string;
}

export interface Enrollment {
  id: string;
  student_id: string;
  class_id: string;
  enrolled_at: string;
}

export interface AttendanceRecord {
  id: string;
  class_id: string;
  student_id: string;
  class_date: string;
  status: AttendanceStatus;
  reason: string | null;
  makeup_status: MakeupStatus | null;
  makeup_scheduled_date: string | null;
  created_at: string;
}

export interface Payment {
  id: string;
  student_id: string;
  month_key: string;
  amount_due: number;
  amount_paid: number;
  status: PaymentStatus;
  paid_at: string | null;
  created_at: string;
}

export interface TeacherJournal {
  id: string;
  teacher_profile_id: string;
  category: "class" | "counsel" | "meeting" | "other";
  content: string;
  tagged_student_id: string | null;
  created_at: string;
}

export interface SalaryStatement {
  id: string;
  teacher_profile_id: string;
  month_key: string;
  base_salary: number;
  bonus_amount: number;
  deduction_amount: number;
  net_salary: number;
  status: "calculated" | "paid";
  paid_at: string | null;
  created_at: string;
}

export interface NaverReservation {
  id: string;
  naver_reservation_id: string;
  naver_place_id: string | null;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  reservation_date: string;
  reservation_time: string;
  class_type: string | null;
  number_of_people: number;
  status: "pending" | "confirmed" | "cancelled" | "no_show" | "converted";
  student_id: string | null;
  is_converted: boolean;
  notes: string | null;
  confirmed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
}

export interface ExternalNotice {
  id: string;
  source: string;
  title: string;
  link: string;
  original_date: string | null;
  author: string | null;
  scraped_at: string;
  is_active: boolean;
  created_at: string;
}
