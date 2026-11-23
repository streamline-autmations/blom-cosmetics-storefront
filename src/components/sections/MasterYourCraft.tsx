import React from 'react';
import { ArrowUpRight, Clock, MapPin } from 'lucide-react';

const courses = [
  {
    title: 'Rubber Base Perfection',
    meta: '3-4 days',
    location: 'Randfontein and Orkney',
    href: '/courses/rubber-base-perfection-course',
    image: 'https://res.cloudinary.com/dy1gw7dr2/image/upload/f_auto,q_auto,w_1400,c_limit/v1778573976/WhatsApp_Image_2026-05-11_at_14.38.55_ojc1qq.jpg',
    className: 'academy-course--featured',
  },
  {
    title: 'Trendy Ring Nail Art',
    meta: 'Self-paced',
    location: 'Online',
    href: '/courses/trendy-ring-nail-art-course',
    image: 'https://res.cloudinary.com/dnlgohkcc/image/upload/f_auto,q_auto,w_1000,c_limit/v1785314350/Trendy-Ring-Cover_mdc3dy.jpg',
    className: 'academy-course--compact',
  },
  {
    title: 'Faded Flowers',
    meta: 'Self-paced',
    location: 'Online',
    href: '/courses/faded-flowers-workshop',
    image: 'https://res.cloudinary.com/dnlgohkcc/image/upload/f_auto,q_auto,w_1000,c_limit/v1775453928/WhatsApp_Image_2026-04-03_at_12.34.07_uelxcc.jpg',
    className: 'academy-course--compact',
  },
  {
    title: '3D Animal Peekaboo Nail Art',
    meta: '8 Feb 2027',
    location: 'Randfontein',
    href: '/courses/peekaboo-nail-art-workshop',
    image: 'https://res.cloudinary.com/hmvetruz/image/upload/f_auto,q_auto,w_1400,c_limit/v1795250218/courses/peekaboo-nail-art-workshop/banner2_h0amwx.jpg',
    className: 'academy-course--wide',
  },
];

const responsiveSrcSet = (src: string) =>
  [480, 800, 1400]
    .map((width) => `${src.replace(/w_\d+/, `w_${width}`)} ${width}w`)
    .join(', ');

export const MasterYourCraft: React.FC = () => (
  <section className="home-academy" aria-labelledby="academy-heading">
    <div className="home-shell">
      <header className="home-section-heading">
        <p className="home-eyebrow">BLOM Academy</p>
        <h2 id="academy-heading">Techniques that move your work forward.</h2>
        <p>
          Learn in person or online with practical guidance, focused demonstrations and
          skills designed for real client work.
        </p>
      </header>

      <div className="home-academy__grid">
        {courses.map((course, index) => (
          <a className={`academy-course ${course.className}`} href={course.href} key={course.title}>
            <img
              src={course.image}
              srcSet={responsiveSrcSet(course.image)}
              sizes={index === 0 || course.className === 'academy-course--wide'
                ? '(max-width: 860px) 92vw, 58vw'
                : '(max-width: 860px) 92vw, 28vw'}
              alt={course.title}
              loading="lazy"
            />
            <div className="academy-course__overlay" />
            <div className="academy-course__content">
              <h3>{course.title}</h3>
              <div className="academy-course__meta">
                <span><Clock aria-hidden="true" /> {course.meta}</span>
                <span><MapPin aria-hidden="true" /> {course.location}</span>
              </div>
            </div>
            <span className="academy-course__arrow" aria-hidden="true">
              <ArrowUpRight />
            </span>
          </a>
        ))}
      </div>

      <div className="home-academy__footer">
        <p>Choose a focused online workshop or join us for hands-on professional training.</p>
        <a className="home-button home-button--primary" href="/courses">Explore all courses</a>
      </div>
    </div>
  </section>
);

export default MasterYourCraft;
