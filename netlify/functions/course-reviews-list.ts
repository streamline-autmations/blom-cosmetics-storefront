// netlify/functions/course-reviews-list.ts
// Public read of approved reviews for one in-person course, newest first.
// Never returns reviewer_email.
import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const s = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export const handler: Handler = async (e) => {
  if (e.httpMethod === "OPTIONS") return { statusCode: 200, headers: CORS, body: "ok" };
  if (e.httpMethod !== "GET") {
    return { statusCode: 405, headers: CORS, body: JSON.stringify({ ok: false, error: "Method Not Allowed" }) };
  }

  const courseSlug = (e.queryStringParameters?.course_slug || "").trim();
  if (!courseSlug) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ ok: false, error: "Missing course_slug" }) };
  }

  const { data, error } = await s
    .from("course_reviews")
    .select("id, course_slug, instructor_name, reviewer_name, rating, body, created_at")
    .eq("course_slug", courseSlug)
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ ok: false, error: error.message }) };
  }

  return {
    statusCode: 200,
    headers: { ...CORS, "Content-Type": "application/json" },
    body: JSON.stringify({ ok: true, reviews: data ?? [] }),
  };
};
