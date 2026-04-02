/** Postgres/PostgREST errors when enrollments discount columns are not migrated yet */
export function isMissingEnrollmentDiscountColumn(message: string) {
  const m = message.toLowerCase();
  return (
    m.includes("enrollments_1.discount_type") ||
    m.includes("enrollments.discount_type") ||
    m.includes("enrollments_1.discount_value") ||
    m.includes("enrollments.discount_value") ||
    m.includes("enrollments_1.discount_reason") ||
    m.includes("enrollments.discount_reason") ||
    m.includes("enrollments_1.discount_start_date") ||
    m.includes("enrollments.discount_start_date") ||
    m.includes("enrollments_1.discount_end_date") ||
    m.includes("enrollments.discount_end_date") ||
    m.includes("enrollments_1.final_fee") ||
    m.includes("enrollments.final_fee")
  );
}
