import React, { useEffect, useMemo, useState } from 'react';
import { Star, BadgeCheck, Quote, PenLine, CheckCircle } from 'lucide-react';
import { Container } from '../layout/Container';
import { COURSE_REVIEW_INSTRUCTORS } from '../../lib/courseReviewInstructors';

export interface StaticCourseReview {
  name: string;
  initials: string;
  rating: number;
  courseTaken: string;
  date: string;
  instructorName: string;
  body: string[];
}

interface ApiCourseReview {
  id: string;
  instructor_name: string;
  reviewer_name: string;
  rating: number;
  body: string;
  created_at: string;
}

interface DisplayReview {
  key: string;
  name: string;
  initials: string;
  rating: number;
  subtitle: string;
  instructorName: string;
  body: string[];
}

interface CourseReviewsProps {
  courseSlug: string;
  courseTitle: string;
  instructors: Array<{ name: string; location?: string }>;
  staticReviews: StaticCourseReview[];
}

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('');

const monthYear = (iso: string) =>
  new Date(iso).toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' });

const toDisplay = (review: ApiCourseReview, courseTitle: string): DisplayReview => ({
  key: review.id,
  name: review.reviewer_name,
  initials: initialsOf(review.reviewer_name),
  rating: review.rating,
  subtitle: `${courseTitle} · ${monthYear(review.created_at)}`,
  instructorName: review.instructor_name,
  body: review.body.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean),
});

const emptyForm = { instructorName: '', name: '', email: '', rating: 0, body: '', website: '' };

export const CourseReviews: React.FC<CourseReviewsProps> = ({
  courseSlug,
  courseTitle,
  instructors,
  staticReviews,
}) => {
  const [liveReviews, setLiveReviews] = useState<ApiCourseReview[]>([]);
  const [instructorFilter, setInstructorFilter] = useState<string>('all');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [hoverRating, setHoverRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // Only instructors the submit function accepts for this course.
  const instructorNames = COURSE_REVIEW_INSTRUCTORS[courseSlug] ?? [];

  useEffect(() => {
    let cancelled = false;
    setLiveReviews([]);
    setInstructorFilter('all');
    fetch(`/.netlify/functions/course-reviews-list?course_slug=${encodeURIComponent(courseSlug)}`)
      .then((res) => (res.ok ? res.json() : { reviews: [] }))
      .then((json) => {
        if (!cancelled) setLiveReviews(json.reviews ?? []);
      })
      .catch(() => {
        // Reviews are non-critical; the static ones still render.
      });
    return () => {
      cancelled = true;
    };
  }, [courseSlug]);

  const allReviews: DisplayReview[] = useMemo(
    () => [
      ...liveReviews.map((r) => toDisplay(r, courseTitle)),
      ...staticReviews.map((r, i) => ({
        key: `static-${i}`,
        name: r.name,
        initials: r.initials,
        rating: r.rating,
        subtitle: `${r.courseTaken} · ${r.date}`,
        instructorName: r.instructorName,
        body: r.body,
      })),
    ],
    [liveReviews, staticReviews, courseTitle]
  );

  const visibleReviews =
    instructorFilter === 'all'
      ? allReviews
      : allReviews.filter((r) => r.instructorName === instructorFilter);

  const averageRating = visibleReviews.length
    ? visibleReviews.reduce((sum, r) => sum + r.rating, 0) / visibleReviews.length
    : 0;

  const countFor = (name: string) => allReviews.filter((r) => r.instructorName === name).length;

  const toggleExpanded = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const openForm = () => {
    setSubmitted(false);
    setFormError('');
    setForm({
      ...emptyForm,
      instructorName:
        instructorFilter !== 'all' ? instructorFilter : instructorNames.length === 1 ? instructorNames[0] : '',
    });
    setFormOpen(true);
  };

  const updateForm = (patch: Partial<typeof emptyForm>) => {
    setForm((prev) => ({ ...prev, ...patch }));
    setFormError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!form.instructorName) return setFormError('Please select the instructor who trained you.');
    if (!form.rating) return setFormError('Please choose a star rating.');
    if (!form.name.trim()) return setFormError('Please enter your name.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      return setFormError('Please enter a valid email address.');
    }
    if (form.body.trim().length < 10) return setFormError('Please write a little more about your experience.');

    setSubmitting(true);
    try {
      const res = await fetch('/.netlify/functions/course-reviews-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          course_slug: courseSlug,
          instructor_name: form.instructorName,
          reviewer_name: form.name.trim(),
          reviewer_email: form.email.trim(),
          rating: form.rating,
          body: form.body.trim(),
          website: form.website,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        setFormError(json.error || 'Something went wrong. Please try again.');
        return;
      }
      if (json.review) setLiveReviews((prev) => [json.review, ...prev]);
      setInstructorFilter('all');
      setSubmitted(true);
      setFormOpen(false);
      setForm(emptyForm);
    } catch {
      setFormError('Could not send your review. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    'w-full px-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-300 focus:border-pink-400 outline-none transition-all text-base bg-white';
  const shownRating = hoverRating || form.rating;

  return (
    <section
      id="course-reviews"
      className="py-20"
      style={{ background: 'linear-gradient(135deg, #FFE8F0 0%, #FFF0F6 50%, #FFE8F0 100%)' }}
    >
      <Container>
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-4 uppercase tracking-wide text-gray-900">
            Student Reviews
          </h2>
          <div className="w-20 h-1 bg-pink-400 mx-auto mb-6 rounded-full"></div>

          {/* Aggregate rating */}
          {visibleReviews.length > 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 mb-8">
              <div className="flex items-center gap-1" aria-hidden="true">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star
                    key={i}
                    className="h-6 w-6"
                    style={{ fill: i <= Math.round(averageRating) ? '#FBBF24' : 'transparent', color: '#FBBF24' }}
                  />
                ))}
              </div>
              <p className="text-gray-800 font-semibold">
                <span className="text-2xl font-bold text-gray-900">{averageRating.toFixed(1)}</span>
                <span className="text-gray-500"> / 5.0</span>
                <span className="text-gray-500 font-normal text-sm">
                  {' '}· {visibleReviews.length} review{visibleReviews.length === 1 ? '' : 's'}
                  {instructorFilter !== 'all' && ` for ${instructorFilter}`}
                </span>
              </p>
              <p className="text-sm text-gray-600 flex items-center gap-1.5">
                <BadgeCheck className="h-4 w-4 text-pink-400" />
                Real reviews from our students
              </p>
            </div>
          ) : (
            <p className="text-center text-gray-600 mb-8">
              {instructorFilter === 'all'
                ? 'No reviews yet. Trained with us? Be the first to share your experience.'
                : `No reviews for ${instructorFilter} yet. Be the first!`}
            </p>
          )}

          {/* Instructor filter */}
          {instructorNames.length > 1 && (
            <div className="flex flex-wrap justify-center gap-2 mb-10" role="group" aria-label="Filter reviews by instructor">
              {['all', ...instructorNames].map((name) => {
                const active = instructorFilter === name;
                const count = name === 'all' ? allReviews.length : countFor(name);
                return (
                  <button
                    key={name}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setInstructorFilter(name)}
                    className={`px-4 py-2 min-h-[44px] rounded-full text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 ${
                      active ? 'bg-pink-400 text-white shadow-md' : 'bg-white text-gray-700 hover:bg-pink-50'
                    }`}
                  >
                    {name === 'all' ? 'All instructors' : name}
                    <span className={`ml-1.5 ${active ? 'text-pink-50' : 'text-gray-400'}`}>({count})</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Review cards */}
          {visibleReviews.length > 0 && (
            <div className="grid md:grid-cols-2 gap-8">
              {visibleReviews.map((review) => {
                const isExpanded = expanded.has(review.key);
                const fullText = review.body.join(' ');
                const needsToggle = fullText.length > 220 || review.body.length > 1;
                return (
                  <article
                    key={review.key}
                    className="relative bg-white rounded-3xl p-8 md:p-10 shadow-lg flex flex-col"
                  >
                    <Quote className="absolute top-6 right-6 h-10 w-10 text-pink-100" aria-hidden="true" />

                    <div className="flex items-center gap-4 mb-4 pr-10">
                      <div
                        className="w-14 h-14 flex-shrink-0 rounded-full flex items-center justify-center text-xl font-bold text-white shadow-md"
                        style={{ background: 'linear-gradient(135deg, #FF74A4 0%, #FF9CC0 100%)' }}
                        aria-hidden="true"
                      >
                        {review.initials}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <h3 className="text-lg font-bold text-gray-900">{review.name}</h3>
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-white bg-pink-400 px-2 py-0.5 rounded-full">
                            <BadgeCheck className="h-3.5 w-3.5" />
                            Student
                          </span>
                        </div>
                        <p className="text-sm text-gray-500">{review.subtitle}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                      <div className="flex items-center gap-1" aria-label={`${review.rating} out of 5 stars`}>
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Star
                            key={i}
                            className="h-5 w-5"
                            aria-hidden="true"
                            style={{ fill: i <= review.rating ? '#FBBF24' : 'transparent', color: '#FBBF24' }}
                          />
                        ))}
                      </div>
                      <span className="text-sm text-gray-600">
                        Trained by <span className="font-semibold text-gray-900">{review.instructorName}</span>
                      </span>
                    </div>

                    {isExpanded ? (
                      <div className="space-y-3 text-gray-700 leading-relaxed text-[15px]">
                        {review.body.map((paragraph, pIndex) => (
                          <p key={pIndex}>{paragraph}</p>
                        ))}
                      </div>
                    ) : (
                      <p
                        className="text-gray-700 leading-relaxed text-[15px]"
                        style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                      >
                        {fullText}
                      </p>
                    )}

                    {needsToggle && (
                      <button
                        type="button"
                        onClick={() => toggleExpanded(review.key)}
                        aria-expanded={isExpanded}
                        className="mt-4 self-start text-sm font-semibold text-pink-500 hover:text-pink-600 transition-colors"
                      >
                        {isExpanded ? 'Read less' : 'Read more'}
                      </button>
                    )}
                  </article>
                );
              })}
            </div>
          )}

          {/* Leave a review */}
          <div className="mt-12">
            {submitted && !formOpen && (
              <p className="flex items-center justify-center gap-2 text-center text-gray-800 font-semibold mb-6" role="status">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Thank you! Your review is now live.
              </p>
            )}

            {!formOpen ? (
              <div className="text-center">
                <button
                  type="button"
                  onClick={openForm}
                  className="inline-flex items-center gap-2 px-8 py-4 min-h-[44px] rounded-full bg-gray-900 text-white font-semibold uppercase tracking-wide text-sm hover:bg-pink-500 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 focus-visible:ring-offset-2"
                >
                  <PenLine className="h-4 w-4" />
                  Write a review
                </button>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                noValidate
                className="bg-white rounded-3xl p-6 sm:p-8 md:p-10 shadow-lg max-w-2xl mx-auto space-y-6"
                aria-labelledby="course-review-form-title"
              >
                <div>
                  <h3 id="course-review-form-title" className="text-2xl font-bold text-gray-900 uppercase tracking-wide">
                    Review your training
                  </h3>
                  <p className="text-gray-600 mt-1">{courseTitle}</p>
                </div>

                <div>
                  <label htmlFor="review-instructor" className="block text-sm font-semibold text-gray-800 mb-3">
                    Your instructor <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="review-instructor"
                    value={form.instructorName}
                    onChange={(e) => updateForm({ instructorName: e.target.value })}
                    className={inputClass}
                    required
                  >
                    <option value="" disabled>
                      Select the instructor who trained you
                    </option>
                    {instructorNames.map((name) => {
                      const locations = instructors
                        .filter((i) => i.name === name && i.location)
                        .map((i) => i.location);
                      return (
                        <option key={name} value={name}>
                          {name}
                          {locations.length ? ` - ${locations.join(' / ')}` : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <fieldset>
                  <legend className="block text-sm font-semibold text-gray-800 mb-3">
                    Your rating <span className="text-red-500">*</span>
                  </legend>
                  <div className="flex items-center gap-1" role="radiogroup" onMouseLeave={() => setHoverRating(0)}>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <button
                        key={i}
                        type="button"
                        role="radio"
                        aria-checked={form.rating === i}
                        aria-label={`${i} star${i === 1 ? '' : 's'}`}
                        onClick={() => updateForm({ rating: i })}
                        onMouseEnter={() => setHoverRating(i)}
                        className="p-1.5 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
                      >
                        <Star
                          className="h-8 w-8 transition-colors"
                          aria-hidden="true"
                          style={{ fill: i <= shownRating ? '#FBBF24' : 'transparent', color: '#FBBF24' }}
                        />
                      </button>
                    ))}
                  </div>
                </fieldset>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="review-name" className="block text-sm font-semibold text-gray-800 mb-3">
                      Your name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="review-name"
                      type="text"
                      autoComplete="name"
                      maxLength={80}
                      value={form.name}
                      onChange={(e) => updateForm({ name: e.target.value })}
                      className={inputClass}
                      required
                    />
                    <p className="text-xs text-gray-500 mt-2">Shown with your review.</p>
                  </div>
                  <div>
                    <label htmlFor="review-email" className="block text-sm font-semibold text-gray-800 mb-3">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="review-email"
                      type="email"
                      autoComplete="email"
                      maxLength={254}
                      value={form.email}
                      onChange={(e) => updateForm({ email: e.target.value })}
                      className={inputClass}
                      required
                    />
                    <p className="text-xs text-gray-500 mt-2">Never shown publicly.</p>
                  </div>
                </div>

                <div>
                  <label htmlFor="review-body" className="block text-sm font-semibold text-gray-800 mb-3">
                    Your review <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="review-body"
                    rows={6}
                    maxLength={2000}
                    value={form.body}
                    onChange={(e) => updateForm({ body: e.target.value })}
                    placeholder="What did you learn? How was your instructor?"
                    className={`${inputClass} resize-y`}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-2 text-right">{form.body.length} / 2000</p>
                </div>

                {/* Honeypot, hidden from people and screen readers */}
                <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, overflow: 'hidden' }}>
                  <label htmlFor="review-website">Website</label>
                  <input
                    id="review-website"
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    value={form.website}
                    onChange={(e) => updateForm({ website: e.target.value })}
                  />
                </div>

                {formError && (
                  <p className="text-sm font-semibold text-red-600" role="alert">
                    {formError}
                  </p>
                )}

                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setFormOpen(false)}
                    className="px-6 py-3 min-h-[44px] rounded-full text-gray-700 font-semibold hover:bg-gray-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-8 py-3 min-h-[44px] rounded-full bg-pink-400 text-white font-semibold uppercase tracking-wide text-sm hover:bg-pink-500 transition-colors disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 focus-visible:ring-offset-2"
                  >
                    {submitting ? 'Posting…' : 'Post review'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </Container>
    </section>
  );
};
