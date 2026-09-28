-- Customer reviews for in-person courses, each linked to the instructor who taught it.
-- Written and read only through Netlify functions (service role), so RLS is on with no
-- anon/authenticated policies. Reviews publish immediately (status 'approved'); admins
-- can reject/delete them from the admin Reviews page.
CREATE TABLE IF NOT EXISTS public.course_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_slug text NOT NULL,
  instructor_name text NOT NULL CHECK (char_length(instructor_name) BETWEEN 1 AND 80),
  reviewer_name text NOT NULL CHECK (char_length(reviewer_name) BETWEEN 1 AND 80),
  reviewer_email text,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  status text NOT NULL DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS course_reviews_course_status_idx
  ON public.course_reviews (course_slug, status, created_at DESC);

-- One review per email per course + instructor.
CREATE UNIQUE INDEX IF NOT EXISTS course_reviews_one_per_email_idx
  ON public.course_reviews (course_slug, instructor_name, lower(reviewer_email))
  WHERE reviewer_email IS NOT NULL;

ALTER TABLE public.course_reviews ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.course_reviews FROM anon, authenticated;
