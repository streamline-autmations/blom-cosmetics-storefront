import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';
import { Container } from '../components/layout/Container';
import { ClickableContact } from '../components/ui/ClickableContact';
import { ScrollableTabRow } from '../components/ui/ScrollableTabRow';
import { supabase } from '../lib/supabase';
import { getAffiliateRef } from '../lib/affiliate';
import { 
  Clock, 
  MapPin, 
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Calendar,
  Package,
  Ticket,
  Phone,
  Mail,
  Shield,
  CreditCard,
  X,
  Star,
  BadgeCheck,
  Quote
} from 'lucide-react';

/**
 * Shapes for the statically-defined course catalogue below.
 *
 * The catalogue is a heterogeneous literal: not every course offers packages,
 * multiple instructors, or a student discount. Declaring the optional members
 * explicitly stops TypeScript inferring a union per key (which previously
 * forced `as any` casts at every access site).
 */
interface CourseInstructor {
  name: string;
  image?: string;
  heroImage?: string;
  bio: string;
  location?: string;
  email?: string;
  phone?: string;
  availableDates?: string[];
  trainingSchedule?: Array<string | CourseListSection>;
  scheduleImages?: Array<{ src: string; alt: string }>;
}

interface CoursePackage {
  name: string;
  price: string;
  features: string[];
  kitValue?: string;
  originalPrice?: string;
  popular?: boolean;
  onSale?: boolean;
}

/** Some list blocks are flat strings, others are grouped under a sub-heading. */
interface CourseListSection {
  title: string;
  items: string[];
}

interface CourseAccordionItem {
  title: string;
  content: string[];
  note?: string;
}

interface Course {
  id: string;
  sku?: string;
  title: string;
  description: string;
  heroImage: string;
  mobileHeroImage?: string;
  heroFit?: string;
  heroBgColor?: string;
  duration: string;
  price: string;
  originalPrice?: string;
  numericPrice: number;
  depositAmount: number;
  isOnline: boolean;
  location: string;
  instructor: CourseInstructor;
  instructors?: CourseInstructor[];
  about: string[];
  packages: CoursePackage[];
  accordionData: CourseAccordionItem[];
  availableDates: string[];
  trainingSchedule: Array<string | CourseListSection>;
  thingsToBring: string[];
  studentDiscount: string[];
}

export const CourseDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const courseSlug = slug || 'professional-acrylic-training';
  const academyCourseSlug = courseSlug === 'online-watercolour-workshop'
    ? 'blom-flower-watercolor-workshop'
    : courseSlug;
  const privateTestCoupon = new URLSearchParams(window.location.search)
    .get('test_coupon')
    ?.trim()
    .toUpperCase() || '';
  const hasPrivateTestDiscount =
    courseSlug === 'trendy-ring-nail-art-course' &&
    privateTestCoupon.startsWith('RING-TEST-');
  // Course data
  const courses: Record<string, Course> = {
    'professional-acrylic-training': {
      id: 'a603be5f-2c56-4e95-9423-8229c8991b40',
      title: 'Ultimate Acrylic Nail Course',
      description: 'Master the art of acrylic nail application with hands-on training. Choose your kit, book your dates, and secure your spot with a deposit.',
      heroImage: '/professional-acrylic-training-hero.webp',
      duration: '5 Full Days (Intensive Training)',
      price: 'From R7,600',
      numericPrice: 7600,
      depositAmount: 1800,
      isOnline: false,
      location: '34 Horingbek Avenue, Helikonpark, Randfontein, Gauteng',
      instructor: {
        name: 'Avané Crous',
        image: '/avane-crous-headshot.webp',
        bio: 'Professional nail artist and educator with over 8 years of experience in acrylic nail application. Avané specializes in teaching proper techniques, safety protocols, and helping students build confidence in their nail artistry skills.'
      },
      instructors: [
        {
          name: 'Avané Crous',
          image: '/avane-crous-headshot.webp',
          bio: 'Professional nail artist and educator with over 8 years of experience in acrylic nail application. Avané specializes in teaching proper techniques, safety protocols, and helping students build confidence in their nail artistry skills.',
          location: '34 Horingbek Avenue, Helikonpark, Randfontein, Gauteng',
          email: 'shopblomcosmetics@gmail.com',
          phone: '+27 79 548 3317',
          availableDates: [
            '26–30 January 2027',
            '6–10 April 2027',
            '9–13 July 2027',
            '22–26 August 2027',
            '1–5 November 2027'
          ]
        },
        {
          name: 'Yolanda Botha',
          image: 'https://res.cloudinary.com/dy1gw7dr2/image/upload/q_auto/f_auto/v1778573976/WhatsApp_Image_2026-05-12_at_09.20.39_kercfw.jpg',
          bio: 'Professional nail artist with years of experience in nail artistry. Yolanda specializes in teaching proper techniques and helping students build confidence in their nail artistry skills.',
          location: '9 Addison str, Golf Park, Orkney',
          email: 'blom.orkney.northwest@gmail.com',
          phone: '0731518407',
          availableDates: [
            '12–16 October 2026',
            '2–6 November 2026',
            '30 November–4 December 2026'
          ],
          // Empty array hides the timetable card; omitting it would fall back to
          // the studio-wide August/September block.
          trainingSchedule: []
        },
        {
          name: 'Rochelle Ras',
          image: 'https://res.cloudinary.com/dnlgohkcc/image/upload/v1788858144/Codex_Image_Sep_8_2026_09_15_30_AM_ggfdfj.png',
          bio: 'Professional nail artist with years of experience in nail artistry. Rochelle specialises in teaching proper techniques and helping students build confidence in their nail artistry skills.',
          location: '21 Selborne Ave, Geduld Ext, Springs',
          email: 'blomcosmetics.springs@gmail.com',
          phone: '0760183671',
          availableDates: [
            '19–23 October 2026',
            '16–20 November 2026',
            '25–29 January 2027',
            '15–19 February 2027'
          ]
        },
        {
          name: 'Natasha Du Toit',
          image: 'https://res.cloudinary.com/wbmx31qv/image/upload/v1789373472/ChatGPT_Image_Sep_14_2026_10_11_00_AM.png',
          bio: 'Our Pretoria, Gauteng Area Mentor. Natasha brings passion, knowledge and a love for the nail industry, and specialises in helping students master acrylics with confidence.',
          location: 'Pretoria, Gauteng',
          email: 'natashatooshterblanche@gmail.com',
          phone: '0714625287',
          availableDates: [
            '5–9 October 2026'
          ],
          // Empty array hides the timetable card; omitting it would fall back to
          // the studio-wide August/September block.
          trainingSchedule: []
        }
      ],
      about: [
        'This comprehensive 5-day hands-on training program is designed to give you the skills and confidence to start your career as a professional nail technician. You\'ll master every aspect of acrylic nail application, from preparation to finishing, using professional-grade products and techniques.',
        'Our expert instructors will guide you through proper nail preparation, acrylic application, shaping, and finishing techniques. By the end of this course, you\'ll have the knowledge and practical experience needed to provide professional acrylic nail services to clients.'
      ],
      packages: [
        {
          name: 'Standard',
          price: 'R7,600',
          kitValue: 'R3,200',
          features: [
            'Prep & Primer',
            'Sculpting Forms (x300)',
            'Top Coat',
            'Colour Acrylic 15g',
            'Nude Acrylic 56g',
            'White Acrylic 56g',
            'Crystal Clear Acrylic 56g',
            '250ml Nail Liquid',
            '100% Kolinsky Brush',
            'Dappen Dish',
            'Training Manual',
            'Lint-Free Wipes',
            'Nail Cleanser 30ml',
            'Hand File & Buffer',
            'Cuticle Pusher',
            'Lifelong mentorship and modern techniques'
          ]
        },
        {
          name: 'Deluxe',
          price: 'R9,900',
          kitValue: 'R5,100',
          features: [
            'Prep & Primer',
            'Sculpting Forms (x300)',
            'Top Coat',
            'Colour Acrylic 15g',
            'Nude Acrylic 56g',
            'White Acrylic 56g',
            'Crystal Clear Acrylic 56g',
            '500ml Nail Liquid',
            '100% Kolinsky Brush',
            'Dappen Dish',
            'Training Manual',
            'Lint-Free Wipes',
            'Nail Cleanser 200ml',
            'Hand File & Buffer',
            'Unicorn Cuticle Pusher',
            'LED Lamp (x1)',
            'Electric File (x1)',
            'Safety Bit',
            'Box of Nail Tips',
            'Nail Glue',
            'Lifelong mentorship and modern techniques'
          ],
          popular: true
        }
      ],
      availableDates: [
        'August/September 2026 (28 Aug-1 Sep)',
        '26–30 January 2027',
        '6–10 April 2027',
        '9–13 July 2027',
        '22–26 August 2027',
        '1–5 November 2027'
      ],
      thingsToBring: [
        'Your own refreshments and lunch (coffee and tea will be provided daily)',
        'A practice hand (preferably a Habbil Hand – this is essential)',
        'An electric file (e-file) and a safety bit',
        'Two hand models: Day 4 model required for practical work; Day 5 model required for assessment'
      ],
      trainingSchedule: [
        {
          title: 'August/September 2026',
          items: [
            '28 August 2026 (08:30-16:00)',
            '29 August 2026 (08:30-16:00)',
            '30 August 2026 (09:00-15:00)',
            '31 August 2026 (08:30-15:00)',
            '1 September 2026 (08:30-16:00)'
          ]
        }
      ],
      studentDiscount: [
        'We have a shop inside the training studio',
        '10% discount on all product purchases during your training'
      ],
      accordionData: [
        {
          title: 'DAY 1: FOUNDATION & PREPARATION',
          content: [
            'Nail anatomy and health assessment',
            'Proper sanitation and safety protocols',
            'Nail preparation techniques',
            'Product knowledge and selection'
          ]
        },
        {
          title: 'DAY 2-3: ACRYLIC APPLICATION',
          content: [
            'Mixing ratios and consistency control',
            'Brush techniques and maintenance',
            'Application methods for different nail shapes',
            'Building structure and strength'
          ]
        },
        {
          title: 'DAY 4: SHAPING & REFINEMENT',
          content: [
            'Filing techniques for different nail shapes',
            'Surface preparation and smoothing',
            'Problem-solving and corrections',
            'Quality control standards'
          ],
          note: 'Note: Models are required for Day 4. Please arrange one model in advance.'
        },
        {
          title: 'DAY 5: FINISHING & BUSINESS',
          content: [
            'Buffing and polishing techniques',
            'Cuticle care and finishing touches',
            'Client consultation and aftercare',
            'Pricing strategies and business basics'
          ],
          note: 'Note: Models are required for Day 5. Please arrange one model in advance.'
        }
      ]
    },
    'rubber-base-perfection-course': {
      id: 'b8f2a3e1-4c7d-4e2f-8a9b-1c3d5e7f9a0b',
      title: 'Rubber Base Perfection & Russian Manicure',
      description: 'A 2-in-1 beginner-friendly intensive course. Master rubber base application and Russian manicure techniques over 3 to 4 full days of hands-on training.',
      heroImage: 'https://res.cloudinary.com/dy1gw7dr2/image/upload/q_auto/f_auto/v1778584938/ChatGPT_Image_May_12_2026_01_20_22_PM_ia7dr2.png',
      mobileHeroImage: 'https://res.cloudinary.com/dy1gw7dr2/image/upload/q_auto/f_auto/v1778573976/WhatsApp_Image_2026-05-11_at_14.38.55_ojc1qq.jpg',
      heroFit: 'contain',
      heroBgColor: '#FBEAF2',
      duration: '3 Full Days (Intensive Training)',
      price: 'From R4,819',
      numericPrice: 4819,
      depositAmount: 1800,
      isOnline: false,
      location: '34 Horingbek Avenue, Helikonpark, Randfontein, Gauteng',
      instructor: {
        name: 'Avané Crous',
        image: '/avane-crous-headshot.webp',
        bio: 'Professional nail artist and educator with over 8 years of experience. Avané specialises in rubber base systems, Russian manicure techniques, and helping students build the confidence and skill to succeed in the nail industry.'
      },
      instructors: [
        {
          name: 'Avané Crous',
          image: '/avane-crous-headshot.webp',
          bio: 'Professional nail artist and educator with over 8 years of experience. Avané specialises in rubber base systems, Russian manicure techniques, and helping students build the confidence and skill to succeed in the nail industry.',
          location: '34 Horingbek Avenue, Helikonpark, Randfontein, Gauteng',
          email: 'shopblomcosmetics@gmail.com',
          phone: '+27 79 548 3317',
          availableDates: [
            'July 2026 (4–6 Jul)',
            'September 2026 (26–28 Sep)',
            'November 2026 (5–7 Nov)',
            '1–3 March 2027',
            '7–9 June 2027',
            '27–29 September 2027',
            '29 November–1 December 2027'
          ],
          trainingSchedule: [
            {
              title: 'All Sessions',
              items: [
                'Day 1: 09:00 – 16:00',
                'Day 2: 09:00 – 15:00',
                'Day 3: 09:00 – 14:30'
              ]
            }
          ]
        },
        {
          name: 'Yolanda Botha',
          image: 'https://res.cloudinary.com/dy1gw7dr2/image/upload/q_auto/f_auto/v1778573976/WhatsApp_Image_2026-05-12_at_09.20.39_kercfw.jpg',
          bio: 'Professional nail artist with years of experience in nail artistry. Yolanda specialises in teaching proper techniques and helping students build confidence in their nail artistry skills.',
          location: '9 Addison str, Golf Park, Orkney',
          email: 'blom.orkney.northwest@gmail.com',
          phone: '0731518407',
          availableDates: [
            '14–16 September 2026',
            '29–31 October 2026'
          ],
          trainingSchedule: [
            {
              title: 'All Sessions',
              items: [
                'Day 1: 09:00 – 16:00',
                'Day 2: 09:00 – 16:00',
                'Day 3: 09:00 – 16:00'
              ]
            }
          ]
        },
        {
          name: 'Rochelle Ras',
          image: 'https://res.cloudinary.com/dnlgohkcc/image/upload/v1788858144/Codex_Image_Sep_8_2026_09_15_30_AM_ggfdfj.png',
          bio: 'Professional nail artist with years of experience in nail artistry. Rochelle specialises in teaching proper techniques and helping students build confidence in their nail artistry skills.',
          location: '21 Selborne Ave, Geduld Ext, Springs',
          email: 'blomcosmetics.springs@gmail.com',
          phone: '0760183671',
          availableDates: [
            '28–30 October 2026',
            '1–3 December 2026',
            '16–18 March 2027'
          ]
        }
      ],
      about: [
        'This 2-in-1 course is designed to empower, uplift, and equip you with everything you need to succeed in the nail industry. Over 3 intensive days, you\'ll master both the Rubber Base system and Russian Manicure — two of the most in-demand techniques in professional nail artistry.',
        'From nail anatomy and product chemistry through to sculpting, ombre, glitter fades, infills, and detailed basic art, this course covers it all. You\'ll leave with the skills, confidence, and business knowledge to start serving clients immediately.'
      ],
      packages: [
        {
          name: 'Standard',
          price: 'R4,819',
          kitValue: 'R3,200',
          features: [
            'Prep & Primer',
            'Sculpting Forms (x50)',
            'Glitter 5g',
            'Top Coat',
            'Nude Rubber Base',
            'White Rubber Base',
            'Clear Rubber Base',
            'Base Gel',
            'Builder in a Bottle',
            'Chrome',
            'Duster',
            'Safety Bit',
            'Detail Brush',
            'Training Manual',
            'Lint-Free Wipes',
            'Nail Cleanser 200ml',
            'Hand File & Buffer',
            'Wooden Cuticle Pusher x2',
            'Lifelong mentorship and modern techniques'
          ]
        },
        {
          name: 'Deluxe',
          price: 'R6,119',
          kitValue: 'R4,800',
          features: [
            'Prep & Primer',
            'Sculpting Forms (x50)',
            'Glitter 5g',
            'Top Coat',
            'Nude Rubber Base',
            'White Rubber Base',
            'Clear Rubber Base',
            'Base Gel',
            'Builder in a Bottle',
            'Chrome',
            'Duster',
            'Safety Bit',
            'Detail Brush',
            'Training Manual',
            'Lint-Free Wipes',
            'Nail Cleanser 200ml',
            'Hand File & Buffer',
            'Wooden Cuticle Pusher x2',
            'LED Lamp (x1) – worth R400',
            'Electric File (x1) – worth R1,050',
            'Lifelong mentorship and modern techniques'
          ],
          popular: true
        }
      ],
      availableDates: [
        'July 2026 (4–6 Jul)',
        'September 2026 (26–28 Sep)',
        'November 2026 (5–7 Nov)',
        '1–3 March 2027',
        '7–9 June 2027',
        '27–29 September 2027',
        '29 November–1 December 2027'
      ],
      thingsToBring: [
        'Your own refreshments and lunch (Coffee & tea provided daily)',
        'Practice hand – preferably a Habbill Hand (strongly recommended for long-term use)',
        'Electric file (e-file) if you have the Standard Kit',
        'Fine line brush if you have the Standard Kit',
        'One hand model on Day 3 for assessment'
      ],
      trainingSchedule: [
        {
          title: 'All Sessions',
          items: [
            'Day 1: 09:00 – 16:00',
            'Day 2: 09:00 – 15:00',
            'Day 3: 09:00 – 14:30'
          ]
        }
      ],
      studentDiscount: [
        'We have a shop inside the training studio',
        '10% discount on all product purchases during your training'
      ],
      accordionData: [
        {
          title: 'FOUNDATION: HEALTH, SAFETY & NAIL SCIENCE',
          content: [
            'Health and Safety protocols',
            'Nail anatomy',
            'Nail diseases & disorders',
            'Product chemistry'
          ]
        },
        {
          title: 'RUSSIAN MANICURE',
          content: [
            'Russian Manicure technique overview',
            'Cuticle care and preparation',
            'Hand file and Electric file techniques',
            'Professional cuticle scissors & drill bit usage'
          ]
        },
        {
          title: 'RUBBER BASE SYSTEM & APPLICATION',
          content: [
            'Rubber Base system overview',
            'Nail prep and application techniques',
            'Sculpting forms – form fitting and placement',
            'Application methods',
            'Natural overlay',
            'Sculptures & structure',
            'Infills',
            'Safe removal methods'
          ]
        },
        {
          title: 'NAIL ART, COLOUR & BUSINESS',
          content: [
            'Ombre, glitter fade and colour applications',
            'Detailed basic art',
            'Business tips and social media skills'
          ]
        }
      ]
    },
    'bridal-and-lace-nail-art-workshop': {
      id: 'be26f87c-0dde-46b0-9c0e-4218f366fec0', // Matches Store `courses` row
      sku: 'SKU_BRIDAL_LACE_WORKSHOP',
      title: 'Bridal and Lace Nail Art Workshop',
      description: 'Master the art of bridal nails and delicate lace designs in a hands-on, one-day workshop in Randfontein. Kit included.',
      // Nails-only crops of the flyer, so the flyer's own lettering doesn't clash with the page title.
      heroImage: 'https://res.cloudinary.com/hmvetruz/image/upload/c_crop,x_0,y_500,w_1024,h_360/f_auto,q_auto/v1789466319/courses/bridal-and-lace-nail-art-workshop/1_docwzm.png',
      mobileHeroImage: 'https://res.cloudinary.com/hmvetruz/image/upload/c_crop,x_330,y_500,w_400,h_440/f_auto,q_auto/v1789466319/courses/bridal-and-lace-nail-art-workshop/1_docwzm.png',
      heroBgColor: '#F3E4DC',
      duration: '1 Day Workshop',
      price: 'R1,850',
      numericPrice: 1850,
      // No deposit: the workshop is paid in full to secure a spot.
      depositAmount: 0,
      isOnline: false,
      location: '34 Horingbek Avenue, Helikonpark, Randfontein, Gauteng',
      instructor: {
        name: 'Yolanda Botha',
        image: 'https://res.cloudinary.com/dy1gw7dr2/image/upload/q_auto/f_auto/v1778573976/WhatsApp_Image_2026-05-12_at_09.20.39_kercfw.jpg',
        bio: 'Professional nail artist with years of experience in nail artistry. Yolanda specialises in teaching proper techniques and helping students build confidence in their nail artistry skills.'
      },
      instructors: [
        {
          name: 'Yolanda Botha',
          image: 'https://res.cloudinary.com/dy1gw7dr2/image/upload/q_auto/f_auto/v1778573976/WhatsApp_Image_2026-05-12_at_09.20.39_kercfw.jpg',
          bio: 'Professional nail artist with years of experience in nail artistry. Yolanda specialises in teaching proper techniques and helping students build confidence in their nail artistry skills.',
          location: '34 Horingbek Avenue, Helikonpark, Randfontein, Gauteng',
          email: 'blom.orkney.northwest@gmail.com',
          phone: '0731518407',
          availableDates: [
            '10 October 2026'
          ],
          trainingSchedule: [
            {
              title: '10 October 2026',
              items: [
                'Workshop starts at 08:30'
              ]
            }
          ]
        }
      ],
      about: [
        'Turn art into opportunity. This hands-on workshop teaches you how to create timeless bridal nail designs and delicate lace detail, using elegant techniques you can offer your clients straight away.',
        'Yolanda guides you through every design step by step with practical training and expert guidance, so you leave with new skills, beautiful techniques and the confidence to grow your bridal nail services.'
      ],
      packages: [
        {
          name: 'Workshop',
          price: 'R1,850',
          kitValue: 'Included',
          features: [
            'Kit included',
            'Hands-on practical training',
            'Expert guidance from Yolanda Botha',
            'Bridal nail art designs',
            'Delicate lace nail art techniques'
          ]
        }
      ],
      availableDates: [
        '10 October 2026'
      ],
      thingsToBring: [],
      trainingSchedule: [],
      studentDiscount: [],
      accordionData: [
        {
          title: 'BRIDAL NAIL ART',
          content: [
            'Timeless bridal nail designs',
            'Elegant techniques for a refined finish',
            'Designing for brides and special occasions'
          ]
        },
        {
          title: 'LACE NAIL ART',
          content: [
            'Delicate lace designs',
            'Fine detail work',
            'Combining lace with bridal accents'
          ]
        },
        {
          title: 'GROW YOUR SKILLS',
          content: [
            'Practical, hands-on training',
            'Expert guidance throughout the day',
            'Turning your nail art into opportunity'
          ]
        }
      ]
    },
    'customized-shaping-workshop': {
      id: 'f95e1464-0391-4f4d-81db-043a13d3bd4b', // Matches Store `courses` row
      sku: 'SKU_CUSTOMIZED_SHAPING_WORKSHOP',
      title: 'Customized Shaping Workshop',
      description: 'Shape, style, create. A hands-on one-day workshop at Blom Cosmetics Headquarters in Randfontein covering multiple nail shapes, perfect structure and small art techniques.',
      // Purpose-shot imagery, cropped to each container's exact aspect ratio so the
      // browser's object-fit: cover has nothing left to crop. Desktop hero is 2:1,
      // mobile hero is the 0.635 portrait the <picture> source renders at.
      heroImage: 'https://res.cloudinary.com/hmvetruz/image/upload/c_crop,x_0,y_30,w_1672,h_845/f_auto,q_auto/v1789561236/courses/customized-shaping-workshop/new_landscape_pktvnz.png',
      mobileHeroImage: 'https://res.cloudinary.com/hmvetruz/image/upload/c_crop,x_170,y_0,w_890,h_1402/f_auto,q_auto/v1789561229/courses/customized-shaping-workshop/new_portrait_wihyic.png',
      heroBgColor: '#F7E9EC',
      duration: '1 Day Workshop',
      price: 'R1,500',
      numericPrice: 1500,
      // No deposit: the workshop is paid in full to secure a spot.
      depositAmount: 0,
      isOnline: false,
      location: '34 Horingbek Avenue, Helikonpark, Randfontein, Gauteng',
      instructor: {
        name: 'Avané Crous',
        image: '/avane-crous-headshot.webp',
        bio: 'Professional nail artist and educator with over 8 years of experience. Avané specialises in shape, structure and balance, and helping students build the confidence to take their work to the next level.'
      },
      instructors: [
        {
          name: 'Avané Crous',
          image: '/avane-crous-headshot.webp',
          bio: 'Professional nail artist and educator with over 8 years of experience. Avané specialises in shape, structure and balance, and helping students build the confidence to take their work to the next level.',
          location: '34 Horingbek Avenue, Helikonpark, Randfontein, Gauteng',
          email: 'shopblomcosmetics@gmail.com',
          phone: '+27 79 548 3317',
          availableDates: [
            'Tuesday, 29 September 2026',
            '8 March 2027',
            '5 July 2027'
          ],
          trainingSchedule: []
        }
      ],
      about: [
        'Different shapes. Beautiful results. This hands-on workshop takes you through the nail shapes your clients actually ask for, and the structure work that makes each one sit balanced, symmetrical and strong.',
        'Avané guides you through every shape step by step at Blom Cosmetics Headquarters, with small, trendy art techniques to complement each one. You leave with sharper shaping, better structure and the confidence to charge for it.'
      ],
      packages: [
        {
          name: 'Workshop',
          price: 'R1,500',
          features: [
            'Multiple nail shapes to suit every client',
            'Balance, symmetry and flawless structure',
            'Easy, trendy small art techniques',
            'Guided, in-person practice with personal feedback',
            'Expert guidance from Avané Crous'
          ]
        }
      ],
      availableDates: [
        'Tuesday, 29 September 2026',
        '8 March 2027',
        '5 July 2027'
      ],
      thingsToBring: [],
      trainingSchedule: [],
      studentDiscount: [],
      accordionData: [
        {
          title: 'DIFFERENT NAIL SHAPES',
          content: [
            'Learn and master multiple nail shapes',
            'Matching the right shape to every client',
            'Shaping techniques that stay consistent set after set'
          ]
        },
        {
          title: 'PERFECT STRUCTURE',
          content: [
            'Tips for balance and symmetry',
            'Building flawless shaping from the apex out',
            'Strength and proportion in every shape'
          ]
        },
        {
          title: 'SMALL ART TECHNIQUES',
          content: [
            'Easy, trendy art techniques',
            'Small detail work that complements each shape',
            'Finishing touches clients notice'
          ]
        },
        {
          title: 'HANDS-ON PRACTICE',
          content: [
            'Guided, in-person training throughout the day',
            'Personal feedback on your own work',
            'Gain confidence and take your work to the next level'
          ]
        }
      ]
    },
    'blom-flower-watercolor-workshop': {
      id: '7c5276c1-9207-4653-89c3-bb4c675db5e2', // Matches Academy "Blom Flower Workshop"
      sku: 'SKU_FLOWER_WORKSHOP',
      title: 'Flower Nail Art Workshop',
      description: 'Learn how to create soft, dreamy flower nail art designs from the comfort of your home with step-by-step videos and detailed guidance.',
      heroImage: '/online-watercolor-card.webp',
      duration: 'Self-Paced',
      price: 'R480',
      numericPrice: 480,
      depositAmount: 0,
      isOnline: true,
      location: 'Online',
      instructor: {
        name: 'Avané Crous',
        image: '/avane-crous-headshot.webp',
        bio: 'Professional nail artist and educator with over 8 years of experience. Avané specializes in teaching proper techniques, safety protocols, and helping students build confidence in their nail artistry skills.'
      },
      about: [
        'This comprehensive online workshop teaches you the fundamentals of watercolor nail art. You\'ll learn how to create soft, dreamy designs that are perfect for any occasion.',
        'Through step-by-step video tutorials and detailed guidance, you\'ll master blending techniques, color theory, and how to create stunning watercolor effects on nails.'
      ],
      packages: [
        {
          name: 'Complete Workshop',
          price: 'R480',
          kitValue: 'Not Included',
          features: [
            'Lifetime access to video tutorials',
            'Step-by-step guides',
            'Color theory basics',
            'Blending techniques',
            'Certificate after you\'ve completed your exam'
          ]
        }
      ],
      availableDates: ['Available Now'],
      thingsToBring: [],
      trainingSchedule: [],
      studentDiscount: [],
      accordionData: [
        {
          title: 'MODULE 1: INTRODUCTION TO WATERCOLOR',
          content: [
            'Understanding watercolor nail art',
            'Essential tools and materials',
            'Color theory and mixing',
            'Basic techniques overview'
          ]
        },
        {
          title: 'MODULE 2: BLENDING TECHNIQUES',
          content: [
            'Wet-on-wet blending',
            'Gradient creation',
            'Color transitions',
            'Troubleshooting common issues'
          ]
        },
        {
          title: 'MODULE 3: DESIGN CREATION',
          content: [
            'Floral watercolor designs',
            'Abstract patterns',
            'Seasonal themes',
            'Personal style development'
          ]
        },
        {
          title: 'MODULE 4: FINISHING & MAINTENANCE',
          content: [
            'Top coat application',
            'Longevity tips',
            'Touch-up techniques',
            'Client consultation skills'
          ]
        }
      ]
    },
    'online-watercolour-workshop': {
      id: '7c5276c1-9207-4653-89c3-bb4c675db5e2', // Matches Academy "Blom Flower Workshop"
      sku: 'SKU_FLOWER_WORKSHOP',
      title: 'Flower Nail Art Workshop',
      description: 'Learn how to create soft, dreamy flower nail art designs from the comfort of your home with step-by-step videos and detailed guidance.',
      heroImage: '/online-watercolor-card.webp',
      duration: 'Self-Paced',
      price: 'R480',
      numericPrice: 480,
      depositAmount: 0,
      isOnline: true,
      location: 'Online',
      instructor: {
        name: 'Avané Crous',
        image: '/avane-crous-headshot.webp',
        bio: 'Professional nail artist and educator with over 8 years of experience. Avané specializes in teaching proper techniques, safety protocols, and helping students build confidence in their nail artistry skills.'
      },
      about: [
        'This comprehensive online workshop teaches you the fundamentals of watercolor nail art. You\'ll learn how to create soft, dreamy designs that are perfect for any occasion.',
        'Through step-by-step video tutorials and detailed guidance, you\'ll master blending techniques, color theory, and how to create stunning watercolor effects on nails.'
      ],
      packages: [
        {
          name: 'Complete Workshop',
          price: 'R480',
          kitValue: 'Not Included',
          features: [
            'Lifetime access to video tutorials',
            'Step-by-step guides',
            'Color theory basics',
            'Blending techniques',
            'Certificate after you\'ve completed your exam'
          ]
        }
      ],
      availableDates: ['Available Now'],
      thingsToBring: [],
      trainingSchedule: [],
      studentDiscount: [],
      accordionData: [
        {
          title: 'MODULE 1: INTRODUCTION TO WATERCOLOR',
          content: [
            'Understanding watercolor nail art',
            'Essential tools and materials',
            'Color theory and mixing',
            'Basic techniques overview'
          ]
        },
        {
          title: 'MODULE 2: BLENDING TECHNIQUES',
          content: [
            'Wet-on-wet blending',
            'Gradient creation',
            'Color transitions',
            'Troubleshooting common issues'
          ]
        },
        {
          title: 'MODULE 3: DESIGN CREATION',
          content: [
            'Floral watercolor designs',
            'Abstract patterns',
            'Seasonal themes',
            'Personal style development'
          ]
        },
        {
          title: 'MODULE 4: FINISHING & MAINTENANCE',
          content: [
            'Top coat application',
            'Longevity tips',
            'Touch-up techniques',
            'Client consultation skills'
          ]
        }
      ]
    },
    'faded-flowers-workshop': {
      id: 'faded-flowers-workshop',
      sku: 'SKU_FADED_FLOWERS_WORKSHOP',
      title: 'Faded Flowers Workshop',
      description: 'Master the art of faded flower nail designs from the comfort of your home. Step-by-step video tutorials guide you through sketching, shading, and creating six stunning faded flower designs.',
      heroImage: 'https://res.cloudinary.com/dnlgohkcc/image/upload/q_auto/f_auto/v1775453928/WhatsApp_Image_2026-04-03_at_12.34.07_uelxcc.jpg',
      duration: 'Self-Paced',
      price: 'R690',
      numericPrice: 690,
      depositAmount: 0,
      isOnline: true,
      location: 'Online',
      instructor: {
        name: 'Avané Crous',
        image: '/avane-crous-headshot.webp',
        bio: 'Professional nail artist and educator with over 8 years of experience. Avané specializes in teaching proper techniques and helping students build confidence in their nail artistry skills.'
      },
      about: [
        'This online workshop takes you through the beautiful art of faded flower nail designs. With 8 in-depth video tutorials, you\'ll learn everything from setting up your workspace to completing six unique faded flower designs.',
        'Perfect for nail artists at any level, this workshop covers sketching, colour application, and fading techniques — giving you the skills and confidence to recreate these designs on your clients or yourself.'
      ],
      packages: [
        {
          name: 'Complete Workshop',
          price: 'R690',
          kitValue: 'Not Included',
          features: [
            'Lifetime access to 8 video tutorials',
            'What You Need — tools & materials guide',
            'Sketch Description Part 1',
            'Design 1 through Design 6 step-by-step',
            'Certificate after completing your exam'
          ]
        }
      ],
      availableDates: ['Available Now'],
      thingsToBring: [],
      trainingSchedule: [],
      studentDiscount: [],
      accordionData: [
        {
          title: 'VIDEO 1: WHAT YOU NEED',
          content: [
            'Tools and materials overview',
            'Recommended products',
            'Workspace setup',
            'Preparation tips'
          ]
        },
        {
          title: 'VIDEO 2: SKETCH DESCRIPTION PART 1',
          content: [
            'Faded flower sketch basics',
            'Pencil technique',
            'Petal structure',
            'Building confidence with line work'
          ]
        },
        {
          title: 'DESIGNS 1–3',
          content: [
            'Design 1 step-by-step',
            'Design 2 step-by-step',
            'Design 3 step-by-step',
            'Colour application and fading techniques'
          ]
        },
        {
          title: 'DESIGNS 4–6',
          content: [
            'Design 4 step-by-step',
            'Design 5 step-by-step',
            'Design 6 step-by-step',
            'Finishing and sealing tips'
          ]
        }
      ]
    },
    'trendy-ring-nail-art-course': {
      id: 'trendy-ring-nail-art-course',
      sku: 'SKU_TRENDY_RING_NAIL_ART',
      title: 'Trendy Ring Nail Art Course',
      description: 'Turn simple nails into head-turning masterpieces with modern ring designs, balanced placement, dimensional details, and client-ready finishing techniques.',
      heroImage: 'https://res.cloudinary.com/dbhiu7lv0/image/upload/v1785340197/Trendy-Ring-Course-IMG_yltkfx.png',
      duration: 'Self-Paced',
      price: 'R650',
      numericPrice: 650,
      depositAmount: 0,
      isOnline: true,
      location: 'Online',
      instructor: {
        name: 'Avané Crous',
        image: '/avane-crous-headshot.webp',
        bio: 'Professional nail artist and educator with over 8 years of experience. Avané teaches refined, practical techniques that help artists create balanced and confidently finished nail art.'
      },
      about: [
        'Learn Avané’s approach to modern ring nail art in four focused, step-by-step video lessons. You will develop stronger placement, proportion, sculpting, and finishing skills for designs that feel polished rather than overcrowded.',
        'The course is suitable for beginners and working professionals, includes lifetime Academy access, and follows the same certificate-of-completion process as BLOM’s other online courses.'
      ],
      packages: [
        {
          name: 'Complete Course',
          price: 'R650',
          kitValue: 'Products Not Included',
          features: [
            'Lifetime access to all four video lessons',
            'Modern ring nail trends and design techniques',
            'Placement, balance, sculpting, and finishing guidance',
            'Suitable for beginners and professionals',
            'Certificate after completing your assessment',
            'Exclusive White + Clear Petal Paste pair for R399'
          ]
        }
      ],
      availableDates: ['Available Now'],
      thingsToBring: [
        'White Petal Paste',
        'Clear Petal Paste',
        'Nail art brush and preferred decorative elements'
      ],
      trainingSchedule: [],
      studentDiscount: [
        'Buy one White and one Clear Petal Paste for R399 together',
        'The student offer never expires',
        'One redemption per course purchase'
      ],
      accordionData: [
        {
          title: 'PART 1: FOUNDATIONS',
          content: [
            'Course setup and materials',
            'Understanding modern ring nail proportions',
            'Preparing the base design'
          ]
        },
        {
          title: 'PART 2: PLACEMENT & BALANCE',
          content: [
            'Building balanced ring compositions',
            'Spacing, scale, and visual flow',
            'Avoiding common placement mistakes'
          ]
        },
        {
          title: 'PART 3: DIMENSIONAL DETAILS',
          content: [
            'Sculpting controlled raised elements',
            'Adding decorative details',
            'Keeping the design refined and wearable'
          ]
        },
        {
          title: 'PART 4: CLIENT-READY FINISH',
          content: [
            'Refining the final composition',
            'Securing and finishing the artwork',
            'Creating a polished salon-ready result'
          ]
        }
      ]
    },
    'holiday-watercolor-workshop': {
      id: 'efe16488-1de6-4522-aeb3-b08cfae3a640',
      sku: 'SKU_XMAS_WATERCOLOR',
      title: 'Christmas Watercolor Nail Art Workshop',
      description: 'Paint festive watercolor nail art for the holidays! Learn Christmas tree designs, snowflakes, and winter wonderland techniques.',
      heroImage: '/christmas-watercolor-card.webp',
      duration: 'Self-Paced',
      price: 'R450',
      originalPrice: 'R650',
      numericPrice: 450,
      depositAmount: 0,
      isOnline: true,
      location: 'Online',
      instructor: {
        name: 'Avané Crous',
        image: '/avane-crous-headshot.webp',
        bio: 'Professional nail artist and educator with over 8 years of experience. Avané brings festive creativity to seasonal nail art and ensures you master techniques with confidence.'
      },
      about: [
        'Get into the holiday spirit with this special Christmas watercolor workshop! Learn to create stunning festive designs including Christmas trees, snowflakes, and winter wonderland scenes.',
        'Perfect for the holiday season, this workshop teaches you seasonal techniques that will make your nail art stand out during Christmas celebrations.'
      ],
      packages: [
        {
          name: 'Christmas Workshop',
          price: 'R450',
          originalPrice: 'R650',
          kitValue: 'Not Included',
          features: [
            'Lifetime access to Christmas tutorials',
            'Holiday design templates',
            'Seasonal color palettes',
            'Festive techniques guide',
            'Certificate after you\'ve completed your exam'
          ],
          onSale: true
        }
      ],
      availableDates: ['Available Now'],
      thingsToBring: [],
      trainingSchedule: [],
      studentDiscount: [],
      accordionData: [
        {
          title: 'MODULE 1: CHRISTMAS BASICS',
          content: [
            'Holiday color theory',
            'Christmas design elements',
            'Festive tool selection',
            'Seasonal inspiration'
          ]
        },
        {
          title: 'MODULE 2: CHRISTMAS TREE DESIGNS',
          content: [
            'Tree shape creation',
            'Ornament placement',
            'Light effects',
            'Tree variations'
          ]
        },
        {
          title: 'MODULE 3: SNOWFLAKE PATTERNS',
          content: [
            'Snowflake geometry',
            'Crystal effects',
            'Winter textures',
            'Frosted finishes'
          ]
        },
        {
          title: 'MODULE 4: WINTER WONDERLAND',
          content: [
            'Landscape creation',
            'Atmospheric effects',
            'Holiday scenes',
            'Final touches'
          ]
        }
      ]
    }
  };

  const course = courses[courseSlug as keyof typeof courses] || courses['professional-acrylic-training'];
  const depositAmount = !course.isOnline ? (course.depositAmount ?? 1800) : 0;

  // Verified student reviews — currently only the Professional Acrylic Training course.
  const courseReviews: Record<string, Array<{
    name: string;
    initials: string;
    rating: number;
    courseTaken: string;
    date: string;
    body: string[];
  }>> = {
    'professional-acrylic-training': [
      {
        name: 'Bebruchka',
        initials: 'B',
        rating: 5,
        courseTaken: '5-Day Acrylic Nail Course',
        date: 'March 2026',
        body: [
          "I recently completed the 5-day Acrylic Nail Course at Blom Cosmetics, and I can honestly say it was one of the best investments I've made in my nail career.",
          'From the moment the course started, I felt welcomed and supported. The trainer Avané is absolutely amazing — incredibly knowledgeable, well spoken, patient, and passionate about what she does. What stood out to me most was her ability to teach in a way that made every student feel comfortable and included. She genuinely treats everyone fairly and ensures that no one gets left behind.',
          'The quality of the products used throughout the course is exceptional. Not only do they perform beautifully, they also smell amazing, which makes the learning experience even more enjoyable. You can really tell that a lot of thought and care has gone into creating products that are both professional and high quality.',
          'Over the five days, I learned so much — everything from proper nail preparation and foundational techniques to sculpting multiple acrylic nail styles with confidence. The training was thorough, hands-on, and packed with valuable information that I know I will continue to use throughout my career.',
          'I left the course feeling confident, inspired, and excited to continue growing as a nail technician. I would highly recommend Blom Cosmetics to anyone looking to start their nail journey or improve their existing skills. Thank you for such an amazing learning experience!'
        ]
      },
      {
        name: 'Rosa',
        initials: 'R',
        rating: 5,
        courseTaken: '5-Day Acrylic Nail Course',
        date: 'April 2026',
        body: [
          "I just want to leave a little review on my recent nail training, and I couldn't be happier with the experience!",
          'Avané, you were absolutely amazing throughout the entire course — incredibly patient, knowledgeable, and always willing to help whenever we had questions or needed extra guidance. You got up a million times to assist and gave us tips and tricks along the way.',
          'The atmosphere was warm, welcoming, and supportive from day one. One of the special touches that stood out was arriving each morning to find a welcoming note on our table and coffee. It made us feel appreciated and motivated to learn every day.',
          'The training was well-structured, hands-on, and packed with valuable knowledge. Your passion for teaching truly shines through, and you made sure everyone felt confident and comfortable throughout the journey.',
          'I would highly recommend this training to anyone looking to start or grow their nail career. Thank you, Avané, for such a wonderful learning experience!'
        ]
      }
    ]
  };
  const reviews = courseReviews[courseSlug] ?? [];
  const averageRating = reviews.length
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;
  const [expandedAccordion, setExpandedAccordion] = useState<number | null>(0);
  const [selectedPackage, setSelectedPackage] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedInstructor, setSelectedInstructor] = useState<string>('');
  const [selectedInstructorIndex, setSelectedInstructorIndex] = useState<number>(0);
  const [showComparePackages, setShowComparePackages] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [expandedReviews, setExpandedReviews] = useState<Set<number>>(new Set());

  const toggleReview = (index: number) => {
    setExpandedReviews((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  // Initialize selectedInstructor with first instructor on mount
  useEffect(() => {
    const instructors = course.instructors;
    if (instructors && instructors.length > 0) {
      const firstInstructor = instructors[0];
      setSelectedInstructor(`${firstInstructor.name} - ${firstInstructor.location}`);
    }
  }, []);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    countryCode: '+27',
    terms: false
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  // In-person courses: the buyer chooses to pay the deposit (secure spot) or the full amount up front.
  // Courses without a deposit (depositAmount: 0) are always paid in full.
  const [paymentOption, setPaymentOption] = useState<'deposit' | 'full'>(depositAmount > 0 ? 'deposit' : 'full');
  // Payment provider chooser (PayFast vs Payflex) shown after the buyer confirms their booking.
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Full price (in Rands) of the currently selected package.
  const selectedPackagePrice = (() => {
    const selectedPkg = course.packages.find(pkg => pkg.name === selectedPackage);
    const priceMatch = selectedPkg?.price.match(/[\d,]+/);
    const basePrice = priceMatch ? parseFloat(priceMatch[0].replace(/,/g, '')) : course.numericPrice;
    return basePrice;
  })();
  const balanceAfterDeposit = Math.max(0, selectedPackagePrice - depositAmount);

  // Auto-select package and date if there's only one option
  useEffect(() => {
    if (course.packages.length === 1 && !selectedPackage) {
      setSelectedPackage(course.packages[0].name);
    }
    // Use the selected instructor's dates (same source as the Date dropdown);
    // the course-level list would pre-fill a date that instructor doesn't offer.
    const dates: string[] = course.instructors?.[selectedInstructorIndex]?.availableDates ?? course.availableDates;
    if (dates.length === 1 && !selectedDate) {
      setSelectedDate(dates[0]);
    }
  }, [course, selectedPackage, selectedDate, selectedInstructorIndex]);

  const toggleAccordion = (index: number) => {
    setExpandedAccordion(expandedAccordion === index ? null : index);
  };

  const scrollToBooking = () => {
    document.getElementById('booking-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  const selectPackage = (packageName: string) => {
    setSelectedPackage(packageName);
  };

  const selectDate = (date: string) => {
    setSelectedDate(date);
  };

  const compareFeatures = (() => {
    const seen = new Set<string>();
    const ordered: string[] = [];
    for (const pkg of course.packages) {
      for (const f of pkg.features) {
        if (!seen.has(f)) {
          seen.add(f);
          ordered.push(f);
        }
      }
    }
    return ordered;
  })();

  const validateField = (name: string, value: string | boolean) => {
    const errors: Record<string, string> = {};
    
    if (name === 'name' && typeof value === 'string' && value.trim().length < 2) {
      errors.name = 'Please enter your full name (minimum 2 characters)';
    }
    if (name === 'email' && typeof value === 'string') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!value.trim()) {
        errors.email = 'Please enter a valid email address';
      } else if (!emailRegex.test(value)) {
        errors.email = 'Please enter a valid email address';
      }
    }
    if (name === 'phone' && typeof value === 'string') {
      const phoneRegex = /^[0-9\s\-()]{7,15}$/;
      if (!value.trim()) {
        errors.phone = 'Please enter a valid phone number';
      } else if (!phoneRegex.test(value)) {
        errors.phone = 'Please enter a valid phone number';
      }
    }
    if (name === 'terms' && !value) {
      errors.terms = 'Please agree to the Terms & Conditions';
    }

    setFormErrors(prev => ({ ...prev, [name]: errors[name] || '' }));
    return !errors[name];
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const fieldValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    
    setFormData(prev => ({ ...prev, [name]: fieldValue }));
    validateField(name, fieldValue);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all fields
    const isValid = Object.entries(formData).every(([key, value]) => validateField(key, value));
    if (!isValid || !selectedPackage || !selectedDate) {
      showNotification('Please fill all required fields', 'error');
      return;
    }

    // For in-person courses, validate instructor selection
    if (!course.isOnline && !selectedInstructor) {
      showNotification('Please select an instructor and location', 'error');
      return;
    }

    // All details valid — let the buyer pick a payment provider (PayFast / Payflex).
    setShowPaymentModal(true);
  };

  const processCoursePayment = async (method: 'payfast' | 'payflex') => {
    setShowPaymentModal(false);
    setIsSubmitting(true);

    try {
      const nowBase36 = Date.now().toString(36).toUpperCase();
      const bytes = globalThis.crypto?.getRandomValues?.(new Uint8Array(3));
      const rand = bytes
        ? Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase()
        : Math.random().toString(16).slice(2, 8).toUpperCase();
      const clientPaymentId = `BL-${nowBase36}-${rand}`;
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (hasPrivateTestDiscount && !accessToken) {
        const returnPath = `${window.location.pathname}${window.location.search}`;
        window.location.href = `/login?redirect=${encodeURIComponent(returnPath)}`;
        return;
      }

      // Get the selected package price
      const selectedPkg = course.packages.find(pkg => pkg.name === selectedPackage);
      if (!selectedPkg) {
        showNotification('Please select a package', 'error');
        setIsSubmitting(false);
        return;
      }

      // Extract numeric price from package (e.g., "R450" -> 450)
      const priceMatch = selectedPkg.price.match(/[\d,]+/);
      const basePrice = priceMatch ? parseFloat(priceMatch[0].replace(/,/g, '')) : course.numericPrice;
      const coursePrice = basePrice;
      // Online courses are always paid in full. In-person courses let the buyer
      // choose between paying just the deposit or the full course price up front.
      const payInFull = course.isOnline || paymentOption === 'full';
      const paymentAmount = payInFull ? coursePrice : depositAmount;
      const paymentAmountCents = Math.round(paymentAmount * 100);
      const paymentLabel = course.isOnline ? 'Purchase' : (payInFull ? 'Full Payment' : 'Deposit');
      const paymentKind = payInFull ? 'full' : 'deposit';
      const amountOwedCents = payInFull ? 0 : Math.max(0, Math.round((coursePrice - depositAmount) * 100));

      // Create order with course as product
      const orderRes = await fetch('/.netlify/functions/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
        },
        body: JSON.stringify({
          order_kind: 'course',
          m_payment_id: clientPaymentId,
          affiliate_ref: getAffiliateRef(),
          buyer: {
            name: formData.name,
            email: formData.email,
            phone: `${formData.countryCode}${formData.phone}`
          },
          course_booking: {
            course_slug: academyCourseSlug,
            course_title: course.title,
            course_type: course.isOnline ? 'online' : 'in-person',
            selected_package: selectedPackage,
            selected_date: selectedDate,
            amount_paid_cents: paymentAmountCents,
            amount_owed_cents: amountOwedCents,
            payment_kind: paymentKind,
            instructor: selectedInstructor || null,
            details: {
              course_id: course.id,
              course_price_cents: Math.round(coursePrice * 100),
              deposit_cents: Math.round(depositAmount * 100)
            }
          },
          items: [{
            product_id: course.id,
            sku: course.sku,
            product_name: `${course.title} - ${selectedPackage} ${paymentLabel}`,
            unit_price: paymentAmountCents,
            quantity: 1
          }],
          totals: {
            subtotal_cents: paymentAmountCents,
            shipping_cents: 0,
            tax_cents: 0
          },
          coupon: privateTestCoupon ? { code: privateTestCoupon } : null,
          shipping: {
            method: 'collection'
          }
        })
      });

      if (!orderRes.ok) {
        const orderError = await orderRes.json().catch(() => null);
        throw new Error(orderError?.error || 'Failed to create order');
      }

      const orderData = await orderRes.json();
      const orderId = orderData.order_id;
      const merchantPaymentId = orderData.m_payment_id || orderData.merchant_payment_id || clientPaymentId;
      const effectivePaymentAmount = Number.isFinite(Number(orderData.total_cents))
        ? Number(orderData.total_cents) / 100
        : paymentAmount;

      const itemName = `${course.title} - ${selectedPackage} ${paymentLabel}`;
      const firstName = formData.name.trim().split(' ')[0];
      const lastName = formData.name.trim().split(' ').slice(1).join(' ') || firstName;

      // Payflex (Buy Now, Pay Later) — mirrors the checkout Payflex flow.
      if (method === 'payflex') {
        const pfxResponse = await fetch('/.netlify/functions/payflex-redirect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            order_id: orderId,
            m_payment_id: merchantPaymentId,
            amount: effectivePaymentAmount,
            shipping_amount: 0,
            consumer: {
              givenNames: firstName,
              surname: lastName,
              email: formData.email,
              phoneNumber: `${formData.countryCode}${formData.phone}`
            },
            items: [{
              name: itemName,
              sku: course.sku || '',
              quantity: 1,
              price: effectivePaymentAmount
            }]
          })
        });

        if (!pfxResponse.ok) {
          const pfxError = await pfxResponse.json().catch(() => ({ error: 'Payflex initiation failed' }));
          throw new Error(pfxError.error || 'Payflex initiation failed');
        }

        const pfxData = await pfxResponse.json();
        if (pfxData.checkout_url) {
          window.location.href = pfxData.checkout_url;
        } else {
          throw new Error('No checkout URL received from Payflex');
        }
        return;
      }

      // PayFast (default)
      const paymentRes = await fetch('/.netlify/functions/payfast-redirect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: orderId,
          amount: effectivePaymentAmount,
          item_name: itemName,
          m_payment_id: merchantPaymentId,
          email_address: formData.email,
          name_first: firstName,
          name_last: lastName,
          custom_str1: course.id, // Pass course ID
              custom_str2: academyCourseSlug // Pass course slug
        })
      });

      if (!paymentRes.ok) {
        throw new Error('Failed to initialize payment');
      }

      const contentType = paymentRes.headers.get('content-type') || '';

      if (contentType.includes('text/html')) {
        const html = await paymentRes.text();
        document.open();
        document.write(html);
        document.close();
      } else {
        const pfData = await paymentRes.json();
        const redirectUrl = pfData.redirect || pfData.url;
        if (redirectUrl) {
          window.location.href = redirectUrl;
        } else {
          throw new Error('No redirect URL received from PayFast');
        }
      }

    } catch (error) {
      console.error('Enrollment error:', error);
      showNotification(error instanceof Error ? error.message : 'Something went wrong. Please try again.', 'error');
      setIsSubmitting(false);
    }
  };

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg text-white font-medium transition-all duration-300 transform translate-x-full ${
      type === 'success' ? 'bg-green-500' : 'bg-red-500'
    }`;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.classList.remove('translate-x-full');
    }, 100);

    setTimeout(() => {
      notification.classList.add('translate-x-full');
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 300);
    }, 3000);
  };


  const countryCodes = [
    { code: '+27', country: '🇿🇦 ZA' },
    { code: '+264', country: '🇳🇦 NA' },
    { code: '+353', country: '🇮🇪 IE' },
    { code: '+44', country: '🇬🇧 GB' },
    { code: '+1', country: '🇺🇸 US' },
    { code: '+971', country: '🇦🇪 AE' }
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header showMobileMenu={true} />

      <main className="flex-1">
        {/* Hero Section */}
        <section
          className="relative h-[70vh] md:h-[80vh] overflow-hidden"
          style={{ backgroundColor: course.heroBgColor || '#000' }}
        >
          <picture>
            {course.mobileHeroImage && (
              <source media="(max-width: 768px)" srcSet={course.mobileHeroImage} />
            )}
            <img
              src={course.instructors?.[selectedInstructorIndex]?.heroImage || course.heroImage}
              alt={course.title}
              className={`absolute inset-0 w-full h-full object-cover ${course.heroFit === 'contain' ? 'md:object-contain' : ''}`}
            />
          </picture>
          <div className="absolute inset-0 bg-black bg-opacity-40"></div>
          
          <div className="relative h-full flex items-center justify-center">
            <div className="text-center text-white max-w-4xl mx-auto px-4">
              <h1 className="text-4xl md:text-6xl font-bold mb-4 uppercase tracking-wider text-white" style={{ textShadow: '0 6px 12px rgba(0,0,0,0.5), 0 2px 4px rgba(0,0,0,0.3)' }}>
                {course.title}
              </h1>
              <p className="text-lg md:text-xl mb-8 max-w-2xl mx-auto" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
                {course.description}
              </p>
              
              {/* Detail Pills */}
              <div className="flex flex-wrap justify-center gap-4 mb-8">
                <div className="flex items-center gap-3 px-6 py-3 rounded-full backdrop-blur-md" style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)' }}>
                  <Clock className="h-5 w-5" />
                  <span className="font-medium">{course.duration}</span>
                </div>
                <div className="flex items-center gap-3 px-6 py-3 rounded-full backdrop-blur-md" style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)' }}>
                  <CreditCard className="h-5 w-5" />
                  <span className="font-medium">{course.price}</span>
                </div>
                {course.isOnline && (
                  <div className="flex items-center gap-3 px-6 py-3 rounded-full backdrop-blur-md" style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)' }}>
                    <MapPin className="h-5 w-5" />
                    <span className="font-medium">{course.location}</span>
                  </div>
                )}
              </div>

              {/* CTA Button */}
              <button
                onClick={scrollToBooking}
                className="bg-pink-400 hover:bg-transparent text-[#1a1a1a] hover:text-black font-bold py-5 px-12 rounded-full text-lg uppercase tracking-wide transition-all duration-300 border-2 border-transparent hover:border-black"
                style={{ boxShadow: '0 4px 15px rgba(255,116,164,0.3)' }}
              >
                {course.isOnline ? 'Enroll Now' : 'Book Your Spot'}
              </button>
            </div>
          </div>
        </section>

        {courseSlug === 'trendy-ring-nail-art-course' && (
          <section className="bg-[#fbf8fc] py-10 sm:py-14" aria-label="Exclusive Trendy Ring course offer">
            <Container>
              <div className="mx-auto max-w-6xl overflow-hidden rounded-2xl border border-[#e7dcef] bg-white shadow-lg">
                <div className="grid items-center lg:grid-cols-[1.2fr_0.8fr]">
                  <img
                    src="https://res.cloudinary.com/dnlgohkcc/image/upload/v1785314350/IMG-20260728-WA0023_wssnnp.jpg"
                    alt="Exclusive course offer: White and Clear Petal Paste for R399"
                    className="h-full w-full min-h-[220px] object-cover"
                  />
                  <div className="p-7 sm:p-9">
                    <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#76548f]">Exclusive course offer</p>
                    <h2 className="mb-3 text-2xl font-bold text-gray-900">Get both Petal Pastes for R399</h2>
                    <p className="text-sm leading-relaxed text-gray-600">Buy this course and unlock your permanent White + Clear Petal Paste offer after checkout.</p>
                  </div>
                </div>
              </div>
            </Container>
          </section>
        )}

        {/* Meet Your Instructor */}
        <section className="py-20" style={{ background: 'linear-gradient(135deg, #FFE8F0 0%, #FFF0F6 50%, #FFE8F0 100%)' }}>
          <Container>
            <div className="max-w-5xl mx-auto">
              <h2 className="text-4xl md:text-5xl font-bold text-center mb-4 uppercase tracking-wide text-gray-900">
                MEET YOUR INSTRUCTOR
              </h2>
              <div className="w-20 h-1 bg-pink-400 mx-auto mb-12 rounded-full"></div>

              {/* Instructor Tabs - Only show if there are multiple instructors */}
              {course.instructors && course.instructors.length > 1 && (
                <ScrollableTabRow
                  className="mb-8"
                  activeIndex={selectedInstructorIndex}
                  hint={`Swipe to see all ${course.instructors.length} instructors`}
                >
                  {course.instructors.map((inst: any, idx: number) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setSelectedInstructorIndex(idx);
                        setSelectedInstructor(`${inst.name} - ${inst.location}`);
                        setSelectedDate('');
                      }}
                      aria-pressed={selectedInstructorIndex === idx}
                      className={`px-5 py-2.5 md:px-6 md:py-3 rounded-full font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 focus-visible:ring-offset-2 ${
                        selectedInstructorIndex === idx
                          ? 'bg-pink-400 text-[#1a1a1a] shadow-lg'
                          : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-pink-400'
                      }`}
                    >
                      {inst.name}
                    </button>
                  ))}
                </ScrollableTabRow>
              )}

              <div className="bg-white rounded-3xl p-8 md:p-12 shadow-xl">
                <div className="flex flex-col md:flex-row gap-8 md:gap-12 items-center">
                  <div className="w-48 h-48 flex-shrink-0">
                    <div className="w-full h-full rounded-full overflow-hidden border-4 border-pink-400 shadow-lg">
                      <img
                        src={course.instructors ? course.instructors[selectedInstructorIndex]?.image : course.instructor.image}
                        alt={course.instructors ? course.instructors[selectedInstructorIndex]?.name : course.instructor.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                  <div className="flex-1 text-center md:text-left">
                    <h3 className="text-3xl font-bold text-gray-900 mb-4">
                      {course.instructors ? course.instructors[selectedInstructorIndex]?.name : course.instructor.name}
                    </h3>
                    <p className="text-lg text-gray-700 leading-relaxed">
                      {course.instructors ? course.instructors[selectedInstructorIndex]?.bio : course.instructor.bio}
                    </p>
                    {course.instructors && course.instructors[selectedInstructorIndex]?.location && (
                      <div className="mt-4 p-4 bg-pink-50 rounded-xl">
                        <p className="text-gray-700 font-semibold flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-pink-400 flex-shrink-0" />
                          <span 
                            className="cursor-pointer hover:text-pink-500 transition-colors relative group"
                            onClick={() => {
                              navigator.clipboard.writeText(course.instructors?.[selectedInstructorIndex]?.location ?? '');
                            }}
                            title="Click to copy location"
                          >
                            {course.instructors[selectedInstructorIndex]?.location}
                            <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                              Click to copy
                            </span>
                          </span>
                        </p>
                        {course.instructors[selectedInstructorIndex]?.email && (
                          <p className="text-gray-700 font-semibold mt-2 flex items-center gap-2">
                            <Mail className="h-4 w-4 text-pink-400" />
                            <a 
                              href={`mailto:${course.instructors[selectedInstructorIndex]?.email}`}
                              className="hover:text-pink-500 transition-colors"
                            >
                              {course.instructors[selectedInstructorIndex]?.email}
                            </a>
                          </p>
                        )}
                        {course.instructors[selectedInstructorIndex]?.phone && (
                          <p className="text-gray-700 font-semibold mt-2 flex items-center gap-2">
                            <Phone className="h-4 w-4 text-pink-400" />
                            <a 
                              href={`tel:${course.instructors[selectedInstructorIndex]?.phone}`}
                              className="hover:text-pink-500 transition-colors"
                            >
                              {course.instructors[selectedInstructorIndex]?.phone}
                            </a>
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Container>
        </section>

        {/* About This Course */}
        <section className="py-20" style={{ background: 'linear-gradient(135deg, #FFE8F0 0%, #FFF0F6 50%, #FFE8F0 100%)' }}>
          <Container>
            <div className="max-w-5xl mx-auto">
              <h2 className="text-4xl md:text-5xl font-bold text-center mb-4 uppercase tracking-wide text-gray-900">
                ABOUT THIS COURSE
              </h2>
              <div className="w-20 h-1 bg-pink-400 mx-auto mb-12 rounded-full"></div>

              <div className="space-y-6 text-lg text-gray-700 leading-relaxed text-center md:text-left">
                {course.about.map((paragraph, index) => (
                  <p key={index} className="max-w-4xl mx-auto">{paragraph}</p>
                ))}
              </div>
            </div>
          </Container>
        </section>

        {/* What You'll Learn - Accordion */}
        <section className="py-20 bg-gray-50">
          <Container>
            <div className="max-w-4xl mx-auto">
              <h2 className="heading-with-stripe">What You'll Learn</h2>
              
              <div className="space-y-4">
                {course.accordionData.map((item, index) => (
                  <div key={index} className="bg-white border-2 border-gray-200 rounded-xl shadow-sm hover:border-blue-200 hover:shadow-md transition-all duration-300">
                    <button
                      onClick={() => toggleAccordion(index)}
                      className="w-full p-6 md:p-8 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                    >
                      <h3 className="text-lg md:text-xl font-bold text-gray-900 uppercase tracking-wide">
                        {item.title}
                      </h3>
                      {expandedAccordion === index ? (
                        <ChevronUp className="h-6 w-6 text-pink-400" />
                      ) : (
                        <ChevronDown className="h-6 w-6 text-pink-400" />
                      )}
                    </button>
                    
                    {expandedAccordion === index && (
                      <div className="px-6 md:px-8 pb-6 md:pb-8 bg-gray-50">
                        <ul className="space-y-3">
                          {item.content.map((lesson, lessonIndex) => (
                            <li key={lessonIndex} className="flex items-center gap-3">
                              <CheckCircle className="h-5 w-5 text-pink-400 flex-shrink-0" />
                              <span className="text-gray-700">{lesson}</span>
                            </li>
                          ))}
                        </ul>
                        {item.note && (
                          <div className="mt-4 p-4 rounded-lg" style={{ backgroundColor: '#CEE5FF' }}>
                            <p className="text-sm font-medium" style={{ color: '#1a5a9a' }}>{item.note}</p>
                      </div>
                    )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </Container>
        </section>

        {/* Choose Your Package */}
        <section className="py-20 bg-white">
          <Container>
            <div className="max-w-5xl mx-auto">
              <div className="flex items-center justify-between gap-4">
                <h2 className="heading-with-stripe">Choose Your Package</h2>
                {course.packages.length > 1 && (
                  <button
                    onClick={() => setShowComparePackages(true)}
                    className="bg-transparent hover:bg-pink-50 text-gray-900 font-semibold py-2 px-4 rounded-full transition-all duration-200 border border-gray-300"
                  >
                    Compare Packages
                  </button>
                )}
              </div>

              {showComparePackages && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                  <div
                    className="absolute inset-0 bg-black/40"
                    onClick={() => setShowComparePackages(false)}
                  />
                  <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden">
                    <div className="flex items-center justify-between p-6 border-b">
                      <div>
                        <div className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Compare</div>
                        <div className="text-2xl font-bold text-gray-900">Packages</div>
                      </div>
                      <button
                        onClick={() => setShowComparePackages(false)}
                        className="h-10 w-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
                        aria-label="Close"
                      >
                        <X className="h-5 w-5 text-gray-700" />
                      </button>
                    </div>

                    <div className="p-6 overflow-auto max-h-[70vh]">
                      <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-white">
                          <tr className="border-b">
                            <th className="py-3 pr-4 text-sm font-bold text-gray-900">What’s Included</th>
                            {course.packages.map((pkg) => (
                              <th key={pkg.name} className="py-3 px-4 text-sm font-bold text-gray-900 whitespace-nowrap">
                                <div className="flex flex-col gap-1">
                                  <span>{pkg.name}</span>
                                  <span className="text-xs font-semibold text-gray-500">{pkg.price}</span>
                                  <span className="text-xs font-semibold text-gray-500">Kit: {pkg.kitValue}</span>
                                </div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {compareFeatures.map((feature) => (
                            <tr key={feature} className="border-b last:border-b-0">
                              <td className="py-3 pr-4 text-sm text-gray-700">{feature}</td>
                              {course.packages.map((pkg) => {
                                const has = pkg.features.includes(feature);
                                return (
                                  <td key={pkg.name} className="py-3 px-4">
                                    {has ? (
                                      <div className="inline-flex items-center justify-center h-7 w-7 rounded-full" style={{ backgroundColor: '#CEE5FF' }}>
                                        <CheckCircle className="h-4 w-4" style={{ color: '#1a5a9a' }} />
                                      </div>
                                    ) : (
                                      <span className="text-gray-300">—</span>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="p-6 border-t flex justify-end gap-3">
                      <button
                        onClick={() => setShowComparePackages(false)}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-900 font-semibold py-3 px-6 rounded-full transition-colors"
                      >
                        Close
                      </button>
                      <button
                        onClick={() => {
                          setShowComparePackages(false);
                          scrollToBooking();
                        }}
                        className="bg-pink-400 hover:bg-pink-500 text-[#1a1a1a] font-semibold py-3 px-6 rounded-full transition-colors"
                      >
                        Book Now
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              <div className={`grid gap-8 ${course.packages.length === 1 ? 'max-w-md mx-auto' : 'md:grid-cols-2'}`}>
                {course.packages.map((pkg, index) => (
                  <div key={index} className={`bg-white border-2 ${pkg.popular ? 'border-pink-400' : 'border-gray-200'} rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 relative flex flex-col h-full ${pkg.popular ? 'shadow-xl' : ''}`} style={pkg.popular ? { boxShadow: '0 8px 30px rgba(255,116,164,0.2)' } : {}}>
                    {pkg.popular && (
                      <div className="absolute -top-1 left-1/2 -translate-x-1/2">
                        <div className="text-white px-6 py-2 rounded-b-2xl text-sm font-bold uppercase tracking-wide" style={{ backgroundColor: '#CEE5FF', color: '#1a1a1a' }}>
                          Most Popular
                        </div>
                      </div>
                    )}
                    
                    <div className="text-center mb-8 mt-4">
                      <h3 className="text-2xl font-bold text-gray-900 mb-4 uppercase">{pkg.name} Package</h3>
                      <div className="text-4xl font-bold text-pink-400 mb-2">{pkg.price}</div>
                      {pkg.originalPrice && (
                        <div className="text-lg text-gray-500 line-through mb-2">{pkg.originalPrice}</div>
                      )}
                      {pkg.kitValue === 'Not Included' ? (
                        <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-800 text-sm font-bold px-4 py-1.5 rounded-full uppercase">
                          No Kit Included
                        </div>
                      ) : pkg.kitValue === 'Included' ? (
                        <div className="text-sm font-semibold text-gray-500 uppercase">Kit Included</div>
                      ) : pkg.kitValue ? (
                        <div className="text-sm font-semibold text-gray-500 uppercase">Kit Value: {pkg.kitValue}</div>
                      ) : null}
                    </div>
                    
                    <ul className="space-y-4 mb-8 flex-grow">
                      {pkg.features.map((feature, featureIndex) => (
                        <li key={featureIndex} className="flex items-center gap-3 transition-all duration-300 hover:bg-pink-50 hover:translate-x-2 rounded-lg py-2 px-3 -mx-3 cursor-pointer">
                          <CheckCircle className="h-5 w-5 flex-shrink-0" style={{ color: '#CEE5FF', stroke: '#4A9FFF' }} />
                          <span className="text-gray-700">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    
                    <button
                      onClick={() => selectPackage(pkg.name)}
                      className="w-full bg-pink-400 hover:bg-transparent text-[#1a1a1a] hover:text-black font-bold py-4 px-6 rounded-full text-lg uppercase tracking-wide transition-all duration-300 border-2 border-transparent hover:border-black"
                      style={{ boxShadow: '0 4px 15px rgba(255,116,164,0.3)' }}
                    >
                      Choose {pkg.name}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </Container>
        </section>

        {/* Important Information */}
        <section className="py-20 bg-gray-50">
          <Container>
            <div className="max-w-5xl mx-auto">
              <h2 className="heading-with-stripe">Important Information</h2>
              
              <div className="grid md:grid-cols-2 gap-8">
                {/* Location */}
                <div className="min-w-0 break-words p-6 sm:p-10 md:p-12 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 text-center" style={{ backgroundColor: '#CEE5FF' }}>
                  <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-5">
                    <MapPin className="h-8 w-8 text-pink-400" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4 uppercase tracking-wide">Location</h3>
                  <p 
                    className="text-gray-800 text-base md:text-lg leading-relaxed cursor-pointer hover:text-pink-500 transition-colors relative group"
                    onClick={() => {
                      const location = course.instructors && course.instructors[selectedInstructorIndex]?.location 
                        ? course.instructors[selectedInstructorIndex]?.location 
                        : course.location;
                      navigator.clipboard.writeText(location);
                    }}
                    title="Click to copy location"
                  >
                    {course.instructors && course.instructors[selectedInstructorIndex]?.location 
                      ? course.instructors[selectedInstructorIndex]?.location 
                      : course.location}
                    <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      Click to copy
                    </span>
                    <br />
                    {course.isOnline && (
                      <span className="text-base text-gray-700">Access from anywhere</span>
                    )}
                  </p>
                </div>

                {/* Payment Info */}
                <div className="min-w-0 break-words p-6 sm:p-10 md:p-12 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 text-center" style={{ backgroundColor: '#CEE5FF' }}>
                  <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-5">
                    <CreditCard className="h-8 w-8 text-pink-400" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4 uppercase tracking-wide">{course.isOnline ? 'Payment' : 'Payment Options'}</h3>
                  <p className="text-gray-800 text-base md:text-lg leading-relaxed">
                    {course.isOnline
                      ? 'Full payment required'
                      : depositAmount > 0
                        ? `R${depositAmount.toLocaleString('en-ZA')} deposit to secure your spot, or pay in full`
                        : `Pay ${course.price} in full to secure your spot`}<br />
                    <span className="text-base text-gray-700">
                      {course.isOnline
                        ? 'Instant access after payment'
                        : depositAmount > 0 ? 'Choose deposit or full payment at checkout' : 'PayFast or Payflex accepted'}
                    </span>
                  </p>
                </div>

                {/* Course Dates */}
                {(() => {
                  const activeInstructor = course.instructors?.[selectedInstructorIndex];
                  const displayDates = activeInstructor?.availableDates ?? course.availableDates;
                  const scheduleImages: { src: string; alt: string }[] = activeInstructor?.scheduleImages ?? [];
                  return (
                    <div className="min-w-0 break-words p-6 sm:p-10 md:p-12 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 text-center" style={{ backgroundColor: '#CEE5FF' }}>
                      <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-5">
                        <Calendar className="h-8 w-8 text-pink-400" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-4 uppercase tracking-wide">{course.isOnline ? 'Access' : 'Course Dates'}</h3>
                      <div className="space-y-2">
                        {displayDates.map((date: string, index: number) => (
                          <button
                            key={index}
                            onClick={() => selectDate(date)}
                            className="block w-full px-5 py-3 rounded-full text-base font-semibold transition-all duration-300 hover:-translate-y-1"
                            style={selectedDate === date ? {
                              backgroundColor: '#FF74A4',
                              color: 'white'
                            } : {
                              backgroundColor: '#CEE5FF',
                              color: '#1a1a1a'
                            }}
                            onMouseEnter={(e) => {
                              if (selectedDate !== date) {
                                e.currentTarget.style.backgroundColor = '#FF74A4';
                                e.currentTarget.style.color = 'white';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (selectedDate !== date) {
                                e.currentTarget.style.backgroundColor = '#CEE5FF';
                                e.currentTarget.style.color = '#1a1a1a';
                              }
                            }}
                          >
                            {date}
                          </button>
                        ))}
                      </div>

                      {/* Schedule images – only shown when instructor has them */}
                      {scheduleImages.length > 0 && (
                        <div className="mt-6">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Schedule Details</p>
                          <div className="flex justify-center gap-3">
                            {scheduleImages.map((img, i) => (
                              <button
                                key={i}
                                onClick={() => setLightboxImage(img.src)}
                                className="group relative w-20 h-20 rounded-xl overflow-hidden border-2 border-white shadow-md hover:shadow-xl hover:border-pink-400 hover:scale-105 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-pink-400"
                                aria-label={`View ${img.alt}`}
                              >
                                <img
                                  src={img.src}
                                  alt={img.alt}
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                                  <span className="text-white text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity duration-300 drop-shadow">View</span>
                                </div>
                              </button>
                            ))}
                          </div>
                          <p className="text-xs text-gray-500 mt-2">Tap images to enlarge</p>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {!course.isOnline && course.thingsToBring.length > 0 && (
                  <div className="min-w-0 break-words p-6 sm:p-10 md:p-12 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 text-center" style={{ backgroundColor: '#CEE5FF' }}>
                    <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-5">
                      <Package className="h-8 w-8 text-pink-400" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-4 uppercase tracking-wide">What You Need to Bring</h3>
                    <ul className="text-gray-800 text-base md:text-lg leading-relaxed space-y-3 text-left">
                      {course.thingsToBring.map((item, index) => (
                        <li key={index} className="flex gap-2">
                          <span className="text-pink-400 mt-0.5">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {!course.isOnline && (() => {
                  const activeInstructor = course.instructors?.[selectedInstructorIndex];
                  const displaySchedule = activeInstructor?.trainingSchedule ?? course.trainingSchedule;
                  return displaySchedule.length > 0 && displaySchedule.map((block: any) => (
                    <div key={block.title} className="min-w-0 break-words p-6 sm:p-10 md:p-12 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 text-center" style={{ backgroundColor: '#CEE5FF' }}>
                      <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-5">
                        <Clock className="h-8 w-8 text-pink-400" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-3 uppercase tracking-wide">{`Training Times - ${block.title}`}</h3>
                      <ul className="text-gray-800 text-base md:text-lg leading-relaxed space-y-3 text-left mt-4">
                        {block.items.map((t: string, index: number) => (
                          <li key={index} className="flex gap-2">
                            <span className="text-pink-400 mt-0.5">•</span>
                            <span>{t}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ));
                })()}

                {!course.isOnline && course.studentDiscount.length > 0 && (
                  <div className="min-w-0 break-words p-6 sm:p-10 md:p-12 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 text-center" style={{ backgroundColor: '#CEE5FF' }}>
                    <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-5">
                      <Ticket className="h-8 w-8 text-pink-400" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-4 uppercase tracking-wide">Exclusive Student Discount</h3>
                    <ul className="text-gray-800 text-base md:text-lg leading-relaxed space-y-3 text-left">
                      {course.studentDiscount.map((item, index) => (
                        <li key={index} className="flex gap-2">
                          <span className="text-pink-400 mt-0.5">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Contact */}
                <div className="min-w-0 break-words p-6 sm:p-10 md:p-12 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 text-center" style={{ backgroundColor: '#CEE5FF' }}>
                  <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-5">
                    <Phone className="h-8 w-8 text-pink-400" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4 uppercase tracking-wide">Contact</h3>
                  <div className="space-y-3">
                    {/* Dynamic Phone based on selected instructor */}
                    {(course.instructors && course.instructors[selectedInstructorIndex]?.phone) || !course.isOnline ? (
                      <ClickableContact 
                        type="phone" 
                        value={course.instructors && course.instructors[selectedInstructorIndex]?.phone 
                          ? course.instructors[selectedInstructorIndex]?.phone 
                          : '+27 79 548 3317'} 
                        className="text-gray-800 text-base md:text-lg"
                      >
                        WhatsApp: {course.instructors && course.instructors[selectedInstructorIndex]?.phone 
                          ? course.instructors[selectedInstructorIndex]?.phone 
                          : '+27 79 548 3317'}
                      </ClickableContact>
                    ) : null}
                    {/* Dynamic Email based on selected instructor */}
                    <ClickableContact 
                      type="email" 
                      value={course.instructors && course.instructors[selectedInstructorIndex]?.email 
                        ? course.instructors[selectedInstructorIndex]?.email 
                        : 'shopblomcosmetics@gmail.com'} 
                      className="text-gray-800 text-base md:text-lg"
                    >
                      Email: {course.instructors && course.instructors[selectedInstructorIndex]?.email 
                        ? course.instructors[selectedInstructorIndex]?.email 
                        : 'shopblomcosmetics@gmail.com'}
                    </ClickableContact>
                  </div>
                </div>
              </div>
            </div>
          </Container>
        </section>

        {/* Student Reviews */}
        {reviews.length > 0 && (
          <section className="py-20" style={{ background: 'linear-gradient(135deg, #FFE8F0 0%, #FFF0F6 50%, #FFE8F0 100%)' }}>
            <Container>
              <div className="max-w-5xl mx-auto">
                <h2 className="text-4xl md:text-5xl font-bold text-center mb-4 uppercase tracking-wide text-gray-900">
                  Student Reviews
                </h2>
                <div className="w-20 h-1 bg-pink-400 mx-auto mb-6 rounded-full"></div>

                {/* Aggregate rating */}
                <div className="flex flex-col items-center justify-center gap-2 mb-12">
                  <div className="flex items-center gap-1">
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
                  </p>
                  <p className="text-sm text-gray-600 flex items-center gap-1.5">
                    <BadgeCheck className="h-4 w-4 text-pink-400" />
                    Based on real, verified student reviews
                  </p>
                </div>

                {/* Review cards */}
                <div className="grid md:grid-cols-2 gap-8">
                  {reviews.map((review, index) => (
                    <div
                      key={index}
                      className="relative bg-white rounded-3xl p-8 md:p-10 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col"
                    >
                      <Quote className="absolute top-6 right-6 h-10 w-10 text-pink-100" />

                      {/* Header: avatar + name + verified */}
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-14 h-14 flex-shrink-0 rounded-full flex items-center justify-center text-xl font-bold text-white shadow-md" style={{ background: 'linear-gradient(135deg, #FF74A4 0%, #FF9CC0 100%)' }}>
                          {review.initials}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-bold text-gray-900">{review.name}</h3>
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-pink-500 bg-pink-50 px-2 py-0.5 rounded-full">
                              <BadgeCheck className="h-3.5 w-3.5" />
                              Verified Student
                            </span>
                          </div>
                          <p className="text-sm text-gray-500">{review.courseTaken} · {review.date}</p>
                        </div>
                      </div>

                      {/* Stars */}
                      <div className="flex items-center gap-1 mb-4">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Star
                            key={i}
                            className="h-5 w-5"
                            style={{ fill: i <= review.rating ? '#FBBF24' : 'transparent', color: '#FBBF24' }}
                          />
                        ))}
                      </div>

                      {/* Body */}
                      {expandedReviews.has(index) ? (
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
                          {review.body.join(' ')}
                        </p>
                      )}

                      {/* Read more / less */}
                      <button
                        type="button"
                        onClick={() => toggleReview(index)}
                        className="mt-4 self-start text-sm font-semibold text-pink-500 hover:text-pink-600 transition-colors"
                      >
                        {expandedReviews.has(index) ? 'Read less' : 'Read more'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </Container>
          </section>
        )}

        {/* Booking Form */}
        <section id="booking-form" className="py-20 bg-white">
            <Container>
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                {/* Form Header */}
    <div className="bg-pink-400 p-12 text-center text-[#1a1a1a] relative" style={{ background: 'linear-gradient(135deg, rgba(244,114,182,0.9) 0%, rgba(236,72,153,0.95) 100%)' }}>
                  <h2 className="text-3xl md:text-4xl font-bold mb-3 uppercase tracking-wide" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                    {course.isOnline ? 'Enroll Now' : 'Book Your Spot'}
                  </h2>
                  <p className="text-lg opacity-90" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
                    {course.isOnline ? 'Get instant access to this online workshop' : 'Secure your place in this professional training course'}
                  </p>
                        </div>

                {/* Form Body */}
                <div className="p-12">
                  <form onSubmit={handleSubmit} className="space-y-7">
                    {/* Selection Summary */}
                    {(!selectedPackage || !selectedDate) && (
                      <div className="p-4 rounded-xl border-2 border-yellow-400 bg-yellow-50">
                        <p className="text-sm font-semibold text-gray-800 mb-2">Please complete your selections:</p>
                        <ul className="space-y-1 text-sm text-gray-700">
                          {!selectedPackage && (
                            <li className="flex items-center gap-2">
                              <span className="text-yellow-600">●</span>
                              <span>Choose a package</span>
                            </li>
                          )}
                          {!selectedDate && (
                            <li className="flex items-center gap-2">
                              <span className="text-yellow-600">●</span>
                              <span>Select a date</span>
                            </li>
                          )}
                        </ul>
                      </div>
                    )}

                    {(selectedPackage || selectedDate) && (
                      <div className="p-4 rounded-xl bg-green-50 border-2 border-green-200">
                        <p className="text-sm font-semibold text-gray-800 mb-2">Your Selections:</p>
                        <div className="space-y-1 text-sm text-gray-700">
                          {selectedPackage && (
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <span><strong>Package:</strong> {selectedPackage}</span>
                            </div>
                          )}
                          {selectedDate && (
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <span><strong>Date:</strong> {selectedDate}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Package & Date Dropdowns */}
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-3">
                          Package <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={selectedPackage}
                          onChange={(e) => setSelectedPackage(e.target.value)}
                          className="w-full px-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-300 focus:border-pink-400 outline-none transition-all text-base bg-white"
                        >
                          <option value="" disabled>
                            Select a package
                          </option>
                          {course.packages.map((pkg) => (
                            <option key={pkg.name} value={pkg.name}>
                              {pkg.name} ({pkg.price})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-3">
                          Date <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={selectedDate}
                          onChange={(e) => setSelectedDate(e.target.value)}
                          className="w-full px-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-300 focus:border-pink-400 outline-none transition-all text-base bg-white"
                        >
                          <option value="" disabled>
                            Select a date
                          </option>
                          {(course.instructors?.[selectedInstructorIndex]?.availableDates ?? course.availableDates).map((date: string) => (
                            <option key={date} value={date}>
                              {date}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Payment Option - deposit or full (in-person courses with a deposit only) */}
                    {!course.isOnline && depositAmount > 0 && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-3">
                          Payment Option <span className="text-red-500">*</span>
                        </label>
                        <div className="grid sm:grid-cols-2 gap-4">
                          <button
                            type="button"
                            onClick={() => setPaymentOption('deposit')}
                            aria-pressed={paymentOption === 'deposit'}
                            className={`text-left p-5 rounded-xl border-2 transition-all duration-300 ${
                              paymentOption === 'deposit'
                                ? 'border-pink-400 bg-pink-50 shadow-md'
                                : 'border-gray-200 bg-white hover:border-pink-200'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold text-gray-900">Pay Deposit</span>
                              <span className="font-bold text-pink-500">R{depositAmount.toLocaleString('en-ZA')}</span>
                            </div>
                            <p className="text-xs text-gray-600 leading-relaxed">
                              Secure your spot now.{selectedPackage
                                ? ` Remaining R${balanceAfterDeposit.toLocaleString('en-ZA')} due on the course start date.`
                                : ' Balance due on the course start date.'}
                            </p>
                          </button>

                          <button
                            type="button"
                            onClick={() => setPaymentOption('full')}
                            aria-pressed={paymentOption === 'full'}
                            className={`text-left p-5 rounded-xl border-2 transition-all duration-300 ${
                              paymentOption === 'full'
                                ? 'border-pink-400 bg-pink-50 shadow-md'
                                : 'border-gray-200 bg-white hover:border-pink-200'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold text-gray-900">Pay in Full</span>
                              <span className="font-bold text-pink-500">
                                {selectedPackage ? `R${selectedPackagePrice.toLocaleString('en-ZA')}` : '—'}
                              </span>
                            </div>
                            <p className="text-xs text-gray-600 leading-relaxed">
                              Pay the full course price now — nothing left to settle on the day.
                            </p>
                          </button>
                        </div>
                        {!selectedPackage && (
                          <p className="text-xs text-gray-500 mt-2">Select a package above to see the full price.</p>
                        )}
                      </div>
                    )}

                    {/* Instructor/Location Selection - Only for in-person courses */}
                    {!course.isOnline && course.instructors && course.instructors.length > 0 && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-3">
                          Instructor & Location <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={selectedInstructor}
                          onChange={(e) => {
                            setSelectedInstructor(e.target.value);
                            const idx = course.instructors?.findIndex((i: any) => `${i.name} - ${i.location}` === e.target.value);
                            if (idx !== undefined && idx >= 0) {
                              setSelectedInstructorIndex(idx);
                              setSelectedDate('');
                            }
                          }}
                          className="w-full px-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-300 focus:border-pink-400 outline-none transition-all text-base bg-white"
                        >
                          <option value="" disabled>
                            Select an instructor and location
                          </option>
                          {course.instructors.map((inst) => (
                            <option key={inst.name} value={`${inst.name} - ${inst.location}`}>
                              {inst.name} - {inst.location}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Row 2: Name & Email */}
                    <div className="grid md:grid-cols-2 gap-6">
                        <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-3">
                          Full Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                          className={`w-full px-4 py-4 border rounded-xl focus:ring-2 focus:ring-pink-300 focus:border-pink-400 outline-none transition-all text-base ${
                            formErrors.name ? 'border-red-500' : 'border-gray-300'
                          }`}
                            required
                          />
                          {formErrors.name && (
                          <p className="text-red-500 text-sm mt-2">{formErrors.name}</p>
                          )}
                        </div>

                        <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-3">
                          Email Address <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleInputChange}
                          className={`w-full px-4 py-4 border rounded-xl focus:ring-2 focus:ring-pink-300 focus:border-pink-400 outline-none transition-all text-base ${
                            formErrors.email ? 'border-red-500' : 'border-gray-300'
                          }`}
                            required
                          />
                          {formErrors.email && (
                          <p className="text-red-500 text-sm mt-2">{formErrors.email}</p>
                          )}
                        </div>
                      </div>

                    {/* Row 3: Phone Number */}
                      <div>
                      <label className="block text-sm font-semibold text-gray-800 mb-3">
                        Phone Number <span className="text-red-500">*</span>
                        </label>
                      <div className="flex gap-3">
                        <select
                          name="countryCode"
                          value={formData.countryCode}
                          onChange={handleInputChange}
                          className="w-28 sm:w-32 flex-shrink-0 px-3 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-300 focus:border-pink-400 outline-none transition-all text-base"
                        >
                          {countryCodes.map((country) => (
                            <option key={country.code} value={country.code}>
                              {country.country}
                            </option>
                          ))}
                        </select>
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleInputChange}
                          placeholder="123456789"
                          className={`flex-1 min-w-0 px-4 py-4 border rounded-xl focus:ring-2 focus:ring-pink-300 focus:border-pink-400 outline-none transition-all text-base ${
                            formErrors.phone ? 'border-red-500' : 'border-gray-300'
                          }`}
                          required
                        />
                      </div>
                        {formErrors.phone && (
                        <p className="text-red-500 text-sm mt-2">{formErrors.phone}</p>
                        )}
                      </div>

                    {/* Terms & Conditions */}
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          name="terms"
                          checked={formData.terms}
                          onChange={handleInputChange}
                        className="mt-1 rounded border-gray-300 text-pink-400 focus:ring-pink-300 w-5 h-5"
                          required
                        />
                      <label className="text-sm text-gray-600 leading-relaxed">
                        I agree to the <a href="/terms" className="text-pink-500 hover:text-pink-600 underline">Terms & Conditions</a>
                        </label>
                      </div>
                      {formErrors.terms && (
                        <p className="text-red-500 text-sm">{formErrors.terms}</p>
                      )}

                      {/* Submit Button */}
                    <div>
                      <button
                          type="submit"
                        disabled={isSubmitting || !selectedPackage || !selectedDate || !formData.terms}
                        className="w-full bg-pink-400 hover:bg-transparent text-[#1a1a1a] hover:text-black font-bold py-4 sm:py-5 px-5 sm:px-6 rounded-full text-sm sm:text-lg uppercase tracking-normal sm:tracking-wide transition-all duration-300 border-2 border-transparent hover:border-black disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-pink-400 disabled:hover:text-[#1a1a1a] disabled:hover:border-transparent"
                        style={{ boxShadow: '0 4px 15px rgba(255,116,164,0.3)' }}
                      >
                        {isSubmitting
                          ? 'Processing...'
                          : course.isOnline
                            ? 'Complete Purchase'
                            : paymentOption === 'full'
                              ? `Pay in Full & Secure Spot${selectedPackage ? ` (R${selectedPackagePrice.toLocaleString('en-ZA')})` : ''}`
                              : `Pay Deposit & Secure Spot (R${depositAmount.toLocaleString('en-ZA')})`}
                      </button>

                      {/* Help text when button is disabled */}
                      {(!selectedPackage || !selectedDate || !formData.terms) && !isSubmitting && (
                        <div className="mt-3 text-center text-sm text-gray-600">
                          {!selectedPackage && !selectedDate && (
                            <p>Please select a package and date above to continue</p>
                          )}
                          {!selectedPackage && selectedDate && (
                            <p>Please select a package above to continue</p>
                          )}
                          {selectedPackage && !selectedDate && (
                            <p>Please select a date above to continue</p>
                          )}
                          {selectedPackage && selectedDate && !formData.terms && (
                            <p>Please agree to the Terms & Conditions to continue</p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Security Icons */}
                    <div className="flex items-center justify-center gap-8 pt-6 border-t border-gray-200">
                      <div className="flex items-center gap-2 text-green-600">
                        <Shield className="h-5 w-5" />
                        <span className="text-sm font-semibold">Secure Payment</span>
            </div>
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle className="h-5 w-5" />
                        <span className="text-sm font-semibold">Instant Confirmation</span>
                      </div>
              </div>
                  </form>
            </div>
              </div>

              {/* Payment provider chooser modal (PayFast / Payflex) */}
              {showPaymentModal && (
                <div
                  className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                  onClick={() => !isSubmitting && setShowPaymentModal(false)}
                >
                  <div
                    className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 md:p-8 relative"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => setShowPaymentModal(false)}
                      disabled={isSubmitting}
                      aria-label="Close"
                      className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl leading-none disabled:opacity-40"
                    >
                      ✕
                    </button>

                    <h3 className="text-xl font-bold text-gray-900 mb-1">Choose how to pay</h3>
                    <p className="text-sm text-gray-600 mb-6">
                      {(() => {
                        const payNow = course.isOnline || paymentOption === 'full';
                        const regularAmount = payNow ? selectedPackagePrice : depositAmount;
                        const amt = hasPrivateTestDiscount ? 5 : regularAmount;
                        return `${payNow ? 'Total' : 'Deposit'}: R${amt.toLocaleString('en-ZA')}`;
                      })()}
                    </p>

                    <div className="space-y-4">
                      <button
                        type="button"
                        onClick={() => processCoursePayment('payfast')}
                        disabled={isSubmitting}
                        className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-gray-200 hover:border-pink-400 hover:bg-pink-50 transition-all duration-300 text-left disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <CreditCard className="h-7 w-7 text-pink-400 flex-shrink-0" />
                        <div>
                          <div className="font-bold text-gray-900">PayFast</div>
                          <div className="text-xs text-gray-600">Cards, EFT, Instant EFT, MoreTyme &amp; more</div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => processCoursePayment('payflex')}
                        disabled={isSubmitting}
                        className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-gray-200 hover:border-pink-400 hover:bg-pink-50 transition-all duration-300 text-left disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Calendar className="h-7 w-7 text-pink-400 flex-shrink-0" />
                        <div>
                          <div className="font-bold text-gray-900">Payflex</div>
                          <div className="text-xs text-gray-600">Buy now, pay later in 4 interest-free instalments</div>
                        </div>
                      </button>
                    </div>

                    {isSubmitting && (
                      <p className="text-center text-sm text-gray-600 mt-5">Redirecting to secure payment…</p>
                    )}
                    <p className="text-center text-xs text-gray-400 mt-4">You'll be redirected to complete payment securely.</p>
                  </div>
                </div>
              )}
            </div>
          </Container>
        </section>
      </main>

      {/* Lightbox for schedule images */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-2xl w-full" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute -top-10 right-0 text-white hover:text-pink-300 transition-colors"
              aria-label="Close"
            >
              <X className="h-8 w-8" />
            </button>
            <img
              src={lightboxImage}
              alt="Schedule"
              className="w-full rounded-2xl shadow-2xl"
            />
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default CourseDetailPage;
