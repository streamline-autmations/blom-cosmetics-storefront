// Instructors a student can link a course review to, per in-person course.
// Shared by the review form (CourseReviews.tsx) and the course-reviews-submit
// function, which rejects any other name. When an instructor is added to a
// course in CourseDetailPage.tsx, add them here too or they won't be reviewable.
export const COURSE_REVIEW_INSTRUCTORS: Record<string, readonly string[]> = {
  'professional-acrylic-training': ['Avané Crous', 'Yolanda Botha', 'Rochelle Ras', 'Natasha Du Toit'],
  'rubber-base-perfection-course': ['Avané Crous', 'Yolanda Botha', 'Rochelle Ras', 'Natasha Du Toit'],
  'bridal-and-lace-nail-art-workshop': ['Yolanda Botha'],
  'customized-shaping-workshop': ['Avané Crous'],
};
