// netlify/functions/course-reviews-submit.ts
// Public intake for in-person course reviews. Each review names the instructor who
// taught the student. Reviews publish immediately (status "approved"); admins can
// reject or delete them from the admin Reviews page.
import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import { COURSE_REVIEW_INSTRUCTORS } from "../../src/lib/courseReviewInstructors";

const s = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const MAX_NAME_LEN = 80;
const MAX_EMAIL_LEN = 254;
const MAX_BODY_LEN = 2000;
const MIN_BODY_LEN = 10;

const PUBLIC_COLUMNS = "id, course_slug, instructor_name, reviewer_name, rating, body, created_at";

function json(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers: { ...CORS, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

export const handler: Handler = async (e) => {
  if (e.httpMethod === "OPTIONS") return { statusCode: 200, headers: CORS, body: "ok" };
  if (e.httpMethod !== "POST") return json(405, { ok: false, error: "Method Not Allowed" });

  try {
    if (!e.body) return json(400, { ok: false, error: "Empty body" });
    const payload = JSON.parse(e.body);

    // Honeypot: real visitors never see or fill this field.
    if (payload.website) return json(200, { ok: true, review: null });

    const course_slug = String(payload.course_slug ?? "").trim();
    const instructor_name = String(payload.instructor_name ?? "").trim().slice(0, MAX_NAME_LEN);
    const reviewer_name = String(payload.reviewer_name ?? "").trim().slice(0, MAX_NAME_LEN);
    const reviewer_email = String(payload.reviewer_email ?? "").trim().toLowerCase().slice(0, MAX_EMAIL_LEN);
    const body = String(payload.body ?? "").trim().slice(0, MAX_BODY_LEN);
    const rating = Number(payload.rating);

    if (!course_slug) return json(400, { ok: false, error: "Missing course" });
    if (!instructor_name) return json(400, { ok: false, error: "Please select your instructor" });
    if (!COURSE_REVIEW_INSTRUCTORS[course_slug]?.includes(instructor_name)) {
      return json(400, { ok: false, error: "Please select your instructor from the list" });
    }
    if (!reviewer_name) return json(400, { ok: false, error: "Please enter your name" });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reviewer_email)) {
      return json(400, { ok: false, error: "Please enter a valid email address" });
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return json(400, { ok: false, error: "Please choose a star rating" });
    }
    if (body.length < MIN_BODY_LEN) return json(400, { ok: false, error: "Please write a little more about your experience" });

    const { data: course, error: courseError } = await s
      .from("courses")
      .select("slug")
      .eq("slug", course_slug)
      .eq("course_type", "in-person")
      .maybeSingle();
    if (courseError) return json(500, { ok: false, error: courseError.message });
    if (!course) return json(400, { ok: false, error: "Reviews are only open for in-person courses" });

    const { data, error } = await s
      .from("course_reviews")
      .insert({
        course_slug,
        instructor_name,
        reviewer_name,
        reviewer_email,
        rating,
        body,
        status: "approved",
      })
      .select(PUBLIC_COLUMNS)
      .single();

    if (error) {
      if (error.code === "23505") {
        return json(409, { ok: false, error: "You've already reviewed this course with this instructor. Thank you!" });
      }
      return json(500, { ok: false, error: error.message });
    }

    return json(200, { ok: true, review: data });
  } catch (err: any) {
    return json(500, { ok: false, error: err?.message || "Unexpected error" });
  }
};
