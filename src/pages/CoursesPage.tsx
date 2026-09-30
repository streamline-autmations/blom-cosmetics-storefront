import React, { useEffect } from 'react';
import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';
import { Container } from '../components/layout/Container';
import { Card, CardContent } from '../components/ui/Card';
import { Clock, MapPin, DollarSign, Star, Activity, Users } from 'lucide-react';
import { pageSEO, trackPageView, updateSEO } from '../lib/seo';

const CoursesPage: React.FC = () => {
  const inPersonCourses = [
    {
      id: 1,
      slug: 'professional-acrylic-training',
      title: 'Ultimate Acrylic Nail Course',
      description: 'Hands-on, career-start acrylic training in Randfontein. Master prep, application, structure & finishing in 5 days.',
      image: '/professional-acrylic-training-hero.webp',
      duration: '5 Days',
      location: 'Randfontein & Orkney',
      priceLabel: 'From R7,600'
    },
    {
      id: 5,
      slug: 'rubber-base-perfection-course',
      title: 'Rubber Base Perfection & Russian Manicure',
      description: '2-in-1 beginner-friendly course in Randfontein & Orkney. Master rubber base application, Russian manicure, sculpting, ombre, art & business skills over 3 to 4 intensive days.',
      image: 'https://res.cloudinary.com/dy1gw7dr2/image/upload/q_auto/f_auto/v1778584938/ChatGPT_Image_May_12_2026_01_21_51_PM_w6mltc.png',
      duration: '3–4 Full Days',
      location: 'Randfontein & Orkney',
      priceLabel: 'From R4,819'
    },
    {
      id: 8,
      slug: 'customized-shaping-workshop',
      title: 'Customized Shaping Workshop',
      description: 'Shape, style, create. Master multiple nail shapes, perfect structure and small art techniques with Avané in a hands-on one-day workshop at Blom HQ.',
      image: 'https://res.cloudinary.com/hmvetruz/image/upload/c_crop,x_223,y_0,w_1254,h_941/f_auto,q_auto/v1789561236/courses/customized-shaping-workshop/new_landscape_pktvnz.png',
      duration: '29 September 2026',
      location: 'Randfontein',
      priceLabel: 'R1,500'
    },
    {
      id: 7,
      slug: 'bridal-and-lace-nail-art-workshop',
      title: 'Bridal and Lace Nail Art Workshop',
      description: 'Master bridal nails and delicate lace designs with Yolanda in a hands-on, one-day workshop in Randfontein. Kit included.',
      image: 'https://res.cloudinary.com/hmvetruz/image/upload/c_crop,x_0,y_505,w_1024,h_768/f_auto,q_auto/v1789466319/courses/bridal-and-lace-nail-art-workshop/1_docwzm.png',
      duration: '10 October 2026 · 08:30',
      location: 'Randfontein',
      priceLabel: 'R1,850'
    }
  ];

  const onlineCourses = [
    {
      id: 6,
      slug: 'trendy-ring-nail-art-course',
      title: 'Trendy Ring Nail Art Course',
      description: 'Master modern ring nail trends, confident placement, dimensional details, and client-ready finishing in four focused video lessons.',
      image: 'https://res.cloudinary.com/dbhiu7lv0/image/upload/v1785340197/Trendy-Ring-Course-IMG_yltkfx.png',
      duration: 'Self-Paced',
      location: 'Online',
      price: 650,
      onSale: false
    },
    {
      id: 2,
      slug: 'blom-flower-watercolor-workshop',
      title: 'Flower Nail Art Workshop',
      description: 'Learn how to create soft, dreamy flower nail art designs from the comfort of your home with step-by-step videos and detailed guidance. Let your creativity bloom with BLOM.',
      image: '/online-watercolor-card.webp',
      duration: 'Self-Paced',
      location: 'Online',
      price: 480,
      onSale: false
    },
    {
      id: 3,
      slug: 'holiday-watercolor-workshop',
      title: 'Christmas Watercolor Nail Art Workshop',
      description: 'Paint festive watercolor nail art for the holidays! Learn Christmas tree designs, snowflakes, and winter wonderland techniques in this special seasonal workshop.',
      image: '/christmas-watercolor-card.webp',
      duration: 'Self-Paced',
      location: 'Online',
      price: 450,
      comparePrice: 650,
      onSale: true,
      discount: 31
    },
    {
      id: 4,
      slug: 'faded-flowers-workshop',
      title: 'Faded Flowers Workshop',
      description: 'Master the art of faded flower nail designs with 8 step-by-step video tutorials. From sketching to six stunning faded flower designs, learn at your own pace from home.',
      image: 'https://res.cloudinary.com/dnlgohkcc/image/upload/q_auto/f_auto/v1775453928/WhatsApp_Image_2026-04-03_at_12.34.07_uelxcc.jpg',
      duration: 'Self-Paced',
      location: 'Online',
      price: 690,
      onSale: false
    }
  ];

  // Intersection Observer for mobile shimmer effect
  useEffect(() => {
    updateSEO(pageSEO(
      'Courses',
      'Explore BLOM Cosmetics training courses and workshops. Book in-person training or learn online at your own pace.',
      '/courses'
    ));
    trackPageView('Courses | BLOM Cosmetics', 'https://blom-cosmetics.co.za/courses');
  }, []);

  useEffect(() => {
    const observerOptions = {
      threshold: 0.5,
      rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const shimmerElement = entry.target.querySelector<HTMLElement>('.shimmer');
          if (shimmerElement && !shimmerElement.classList.contains('shimmer-on-scroll')) {
            // Make container visible first
            const shimmerContainer = entry.target.querySelector<HTMLElement>('.absolute.inset-0');
            if (shimmerContainer) {
              shimmerContainer.style.opacity = '1';
              shimmerContainer.style.pointerEvents = 'none';
            }
            
            shimmerElement.classList.add('shimmer-on-scroll');
            // Remove class after animation to allow re-triggering
            setTimeout(() => {
              shimmerElement.classList.remove('shimmer-on-scroll');
              if (shimmerContainer) {
                shimmerContainer.style.opacity = '0';
              }
            }, 3000);
          }
        } else {
          // When element goes out of view, reset for re-triggering
          const shimmerElement = entry.target.querySelector<HTMLElement>('.shimmer');
          if (shimmerElement) {
            shimmerElement.classList.remove('shimmer-on-scroll');
            const shimmerContainer = entry.target.querySelector<HTMLElement>('.absolute.inset-0');
            if (shimmerContainer) {
              shimmerContainer.style.opacity = '0';
            }
          }
        }
      });
    }, observerOptions);

    // Observe all course cards
    const courseCards = document.querySelectorAll('.course-card');
    courseCards.forEach((card) => observer.observe(card));

    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header showMobileMenu={true} />

      <main className="flex-1">
        <Container>
          {/* In-Person Training */}
          <div id="in-person-training" className="py-16">
            <div className="text-center mb-12">
              <h2 className="heading-with-stripe">In-Person Training</h2>
            </div>

            <div className="flex justify-center">
              <div className="grid md:grid-cols-2 gap-8 max-w-4xl">
                {inPersonCourses.map((course, index) => (
                <Card
                  key={course.id}
                  className={`course-card group overflow-hidden rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 bg-white ${
                    // Centre a lone last card instead of leaving it stranded in the left column.
                    inPersonCourses.length % 2 === 1 && index === inPersonCourses.length - 1
                      ? 'md:col-span-2 md:justify-self-center md:w-[calc(50%-1rem)]'
                      : ''
                  }`}
                >
                  {/* Image with Shimmer */}
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <img
                      src={course.image}
                      alt={course.title}
                      className="w-full h-full object-cover"
                    />
                    {/* Shimmer Effect */}
                    <div className="absolute inset-0 pointer-events-none">
                      <div className="shimmer"></div>
                    </div>
                  </div>

                  <CardContent className="p-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-3">{course.title}</h3>
                    <p className="text-gray-600 mb-6 text-sm leading-relaxed">{course.description}</p>

                    <div className="space-y-2 mb-6">
                      <div className="flex items-center gap-2 text-gray-700 text-sm">
                        <Clock className="h-4 w-4 text-pink-500" />
                        <span>{course.duration}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-700 text-sm">
                        <MapPin className="h-4 w-4 text-pink-500" />
                        <span>{course.location}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-700 text-sm">
                        <DollarSign className="h-4 w-4 text-pink-500" />
                        <span className="font-semibold">{course.priceLabel}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => window.location.href = `/courses/${course.slug}`}
                      className="w-full bg-pink-400 hover:bg-pink-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200"
                    >
                      SEE MORE DETAILS
                    </button>
                  </CardContent>
                </Card>
                ))}
              </div>
            </div>
          </div>

          {/* Online Workshops */}
          <div id="online-workshops" className="py-16">
            <div className="text-center mb-12">
              <h2 className="heading-with-stripe">Online Workshops</h2>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {onlineCourses.map((course) => (
                <Card key={course.id} className="course-card group overflow-hidden rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 bg-white">
                  {/* Image with Shimmer */}
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <img
                      src={course.image}
                      alt={course.title}
                      className="w-full h-full object-cover"
                    />
                    {/* Shimmer Effect */}
                    <div className="absolute inset-0 pointer-events-none">
                      <div className="shimmer"></div>
                    </div>
                    {/* Sale Badge */}
                    {course.onSale && (
                      <div className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold uppercase shadow-lg">
                        SALE
                      </div>
                    )}
                  </div>

                  <CardContent className="p-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-3">{course.title}</h3>
                    <p className="text-gray-600 mb-6 text-sm leading-relaxed">{course.description}</p>

                    <div className="space-y-2 mb-6">
                      <div className="flex items-center gap-2 text-gray-700 text-sm">
                        <Clock className="h-4 w-4 text-blue-500" />
                        <span>{course.duration}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-700 text-sm">
                        <MapPin className="h-4 w-4 text-blue-500" />
                        <span>{course.location}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-700 text-sm">
                        <DollarSign className="h-4 w-4 text-blue-500" />
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-lg text-pink-500">R{course.price}</span>
                          {course.comparePrice && (
                            <>
                              <span className="text-sm text-gray-400 line-through">R{course.comparePrice}</span>
                              <span className="bg-red-100 text-red-600 px-2 py-1 rounded-full text-xs font-bold">
                                {course.discount}% OFF
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => window.location.href = `/courses/${course.slug}`}
                      className="w-full bg-pink-400 hover:bg-pink-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200"
                    >
                      SEE MORE DETAILS
                    </button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </Container>

        {/* Why Train with BLOM (card style) */}
        <section className="why-bloom py-16" aria-label="Why Train with BLOM">
          <Container>
            <div className="text-center mb-12">
              <h2 className="heading-with-stripe">Why Train with BLOM</h2>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="why-card">
                <div className="why-icon">
                  <Star width="32" height="32" strokeWidth="2" />
                </div>
                <h3 className="why-heading">Expert-Led Training</h3>
                <p className="why-copy">Learn from industry professionals with years of experience in nail artistry and salon management.</p>
              </div>

              <div className="why-card">
                <div className="why-icon">
                  <Activity width="32" height="32" strokeWidth="2" />
                </div>
                <h3 className="why-heading">Proven Techniques</h3>
                <p className="why-copy">Master salon-grade methods that deliver consistent, professional results every time.</p>
              </div>

              <div className="why-card">
                <div className="why-icon">
                  <Users width="32" height="32" strokeWidth="2" />
                </div>
                <h3 className="why-heading">Community Support</h3>
                <p className="why-copy">Join a network of passionate nail artists and get ongoing support throughout your journey.</p>
              </div>
            </div>
          </Container>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default CoursesPage;
