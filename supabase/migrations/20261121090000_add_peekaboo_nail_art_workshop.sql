-- Add the 3D Animal Peekaboo Nail Art Workshop (in-person, Blom Cosmetics HQ Randfontein, Avané Crous)
-- to the store's courses table. The id matches CourseDetailPage.tsx.

INSERT INTO public.courses (
  id,
  title,
  slug,
  description,
  short_description,
  price,
  image_url,
  featured_image,
  duration,
  level,
  is_active,
  course_type,
  template_key,
  instructor_name,
  instructor_bio,
  start_date
) VALUES (
  'e61a9717-1a52-4011-a8a3-a40cdaadb1e3',
  '3D Animal Peekaboo Nail Art Workshop',
  'peekaboo-nail-art-workshop',
  'Learn 5 adorable 3D peekaboo animal designs in a hands-on, one-day workshop at Blom Cosmetics Headquarters in Randfontein. Kit included.',
  'One-day 3D peekaboo animal nail art workshop at Blom HQ, Randfontein.',
  1800,
  'https://res.cloudinary.com/hmvetruz/image/upload/f_auto,q_auto/v1795245438/courses/peekaboo-nail-art-workshop/flyer_q4rxiq.jpg',
  'https://res.cloudinary.com/hmvetruz/image/upload/f_auto,q_auto/v1795245438/courses/peekaboo-nail-art-workshop/flyer_q4rxiq.jpg',
  '1 Day',
  'All Levels',
  true,
  'in-person',
  'peekaboo-nail-art-workshop',
  'Avané Crous',
  'Professional nail artist and educator with over 8 years of experience.',
  '2027-02-08 09:00:00+02'
)
ON CONFLICT (slug) DO NOTHING;
