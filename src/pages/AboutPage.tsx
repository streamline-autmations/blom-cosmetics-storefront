import React, { useEffect } from 'react';
import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';
import { Container } from '../components/layout/Container';
import { Card, CardContent } from '../components/ui/Card';
import { StockistsTeaser } from '../components/stockists/StockistsTeaser';
import {
  Award,
  Heart,
  Zap,
  Globe,
  BookOpen,
  Layers
} from 'lucide-react';

export const AboutPage: React.FC = () => {
  // Scroll to hash targets (e.g., #team, #story) and align section to top below sticky header
  useEffect(() => {
    const { hash } = window.location;
    if (!hash) return;
    const id = hash.replace('#', '');
    const el = document.getElementById(id);
    if (el) {
      const headerOffset = 80; // accommodates sticky header
      const y = el.getBoundingClientRect().top + window.scrollY - headerOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  }, []);
  const teamMembers = [
    {
      id: 1,
      name: 'Avané Crous',
      role: 'Founder & Lead Educator',
      bio: 'With over 8 years of professional nail artistry experience, Avané is the visionary founder of BLOM. As a skilled educator in acrylic nail application, she is dedicated to teaching safe, precise techniques while empowering students to feel confident in their craft. Her leadership drives BLOM’s mission to blend beauty with responsibility, creating a supportive community for both nail professionals and clients.',
      image: '/avane-crous.webp',
      badges: ['Owner', 'Acrylic Education', 'Safety‑Focused']
    },
    {
      id: 2,
      name: 'Anna-Marie Ernst',
      role: 'Administration & Client Care',
      bio: 'Anna-Marie is the heart and backbone of our team. As BLOM\'s dedicated admin, she ensures every detail runs smoothly, from bookings to logistics. Her caring nature, precision, and organizational talent keep the business balanced and structured, while her warmth inspires both our team and our clients every day.',
      image: '/anna-marie-ernst.webp',
      badges: ['Client Care', 'Admin', 'Logistics']
    }
  ];


  const whyChooseUs = [
    {
      icon: Award,
      title: 'Industry Recognition',
      description: 'Award-winning products and training programs recognized by professionals worldwide.'
    },
    {
      icon: Globe,
      title: 'Global Reach',
      description: 'Serving nail professionals across multiple countries with localized support and shipping.'
    },
    {
      icon: BookOpen,
      title: 'Comprehensive Education',
      description: 'From beginner basics to advanced masterclasses, we offer complete learning pathways.'
    },
    {
      icon: Zap,
      title: 'Cutting-Edge Innovation',
      description: 'Constantly developing new products and techniques to keep you ahead of trends.'
    }
  ];



  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header showMobileMenu={true} />

      <main className="flex-1">
        {/* About Hero Section */}
        <section className="bg-gradient-to-br from-pink-50 to-blue-50 section-padding">
          <Container>
            <div className="text-center max-w-4xl mx-auto">
              <h1 className="heading-with-stripe">About BLOM</h1>
              <p className="text-xl text-gray-600 leading-relaxed mt-6">
                Discover the story behind South Africa's most trusted nail care brand, 
                where passion meets professionalism and beauty blooms.
              </p>
            </div>
          </Container>
        </section>

        {/* The Dream Behind BLOM Section */}
        <section className="section-padding">
          <Container>
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="heading-with-stripe">THE DREAM BEHIND BLOM</h2>
                <div className="space-y-6 text-gray-600 leading-relaxed">
                  <p>
                    BLOM began as a dream. One night, the word "BLOM" appeared, with the O transformed into a lily—the flower of our founder's birth month. Paired with the calming blue of water, it became a constant reminder that passion and dedication are what help beauty bloom.
                  </p>
                  <p>
                    What started as a personal vision over 10 years ago has now grown into a brand dedicated to empowering nail professionals across South Africa and beyond.
                  </p>
                </div>
              </div>
              <div className="relative">
                <div className="relative rounded-2xl overflow-hidden shadow-2xl aspect-1">
                  <img
                    src="/about_us_square.webp"
                    alt="Dreamy beach scene with BLOM logo"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-br from-pink-200/20 via-blue-200/20 to-purple-200/20"></div>
                </div>
              </div>
            </div>
          </Container>
        </section>

        {/* Vision & Mission Section - original card design */}
        <section className="section-padding bg-[#F7FAFF]">
          <Container>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-white rounded-2xl p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
                <div className="mb-6">
                  <Layers className="w-10 h-10 text-pink-500" />
                </div>
                <h3 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-4 uppercase">Our Vision</h3>
                <p className="text-slate-600 text-lg leading-8">
                  To be one of South Africa's most trusted and loved nail care brands, empowering beauty with eco-friendly, cruelty-free, and innovative products that make self-expression affordable, fun, and accessible to everyone.
                </p>
              </div>

              <div className="bg-white rounded-2xl p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
                <div className="mb-6">
                  <Heart className="w-10 h-10 text-pink-500" />
                </div>
                <h3 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-4 uppercase">Our Mission</h3>
                <p className="text-slate-600 text-lg leading-8">
                  Our mission is to create high-quality nail products that combine sustainability with style. We are committed to eco-friendly practices, never testing on animals, and keeping our products affordable without compromise.
                </p>
              </div>
            </div>
          </Container>
        </section>


        {/* Why Choose Us Section */}
        <section className="section-padding bg-gradient-to-br from-pink-50 to-blue-50">
          <Container>
            <div className="text-center mb-12">
              <h2 className="heading-with-stripe">Why Choose BLOM?</h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Discover what sets us apart and makes BLOM the preferred choice 
                for nail professionals worldwide.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {whyChooseUs.map((reason, index) => (
                <Card key={index} className="text-center p-6 hover:shadow-lg transition-shadow">
                  <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <reason.icon className="h-6 w-6 text-pink-400" />
                  </div>
                  <h3 className="font-bold text-lg mb-3">{reason.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{reason.description}</p>
                </Card>
              ))}
            </div>
          </Container>
        </section>

        {/* Meet Team Section */}
        <section id="team" className="section-padding">
          <Container>
            <div className="text-center mb-12">
              <h2 className="heading-with-stripe">Meet Our Team</h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Our passionate team of experts brings together decades of experience, 
                creativity, and dedication to serve the nail professional community.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-8">
              {teamMembers.map((member) => (
                <Card
                  key={member.id}
                  className="overflow-hidden rounded-3xl bg-white ring-1 ring-slate-100 shadow-[0_10px_35px_rgba(15,23,42,0.06)] hover:shadow-[0_18px_50px_rgba(15,23,42,0.10)] hover:-translate-y-1 transition-all duration-300"
                >
                  <div className="relative aspect-1">
                    <img
                      src={member.image}
                      alt={member.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 via-black/5 to-transparent"></div>
                  </div>

                  <CardContent className="p-7">
                    <div className="text-center">
                      <h3 className="font-extrabold text-xl text-slate-900 tracking-tight">{member.name}</h3>
                      <div className="mx-auto mt-2 h-1 w-12 rounded-full bg-pink-300" />
                      <p className="mt-2 text-pink-500 font-semibold">{member.role}</p>

                      {member.badges && (
                        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                          {member.badges.map((b: string, i: number) => (
                            <span
                              key={i}
                              className="px-3 py-1 rounded-full text-xs font-medium bg-pink-400 text-white ring-1 ring-pink-100"
                            >
                              {b}
                            </span>
                          ))}
                        </div>
                      )}

                      <p className="mt-4 text-gray-600 text-sm leading-7">{member.bio}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </Container>
        </section>

        {/* Founders & Movement Section removed; bios are included in team cards */}

        <StockistsTeaser />

      </main>

      <Footer />
    </div>
  );
};