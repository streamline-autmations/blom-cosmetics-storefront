import React, { useEffect } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';
import { HeroSlider } from '../components/sections/HeroSlider';
import { LuckyPetalBanner } from '../components/luckyPetal/LuckyPetalBanner';
import { FeaturedProducts } from '../components/sections/FeaturedProducts';
import { TrustBadges } from '../components/sections/TrustBadges';
import { ShopByCategory } from '../components/sections/ShopByCategory';
import { MasterYourCraft } from '../components/sections/MasterYourCraft';
import { Testimonials } from '../components/sections/Testimonials';
import { SocialGallery } from '../components/sections/SocialGallery';
import { updateSEO, trackPageView } from '../lib/seo';
import rosePourGelPolish from '../assets/homepage/rose-pour-gel-polish.webp';
import gelPolishLineup from '../assets/homepage/gel-polish-lineup.webp';
import '../styles/homepage-refresh.css';

const storyImages = [
  {
    src: rosePourGelPolish,
    alt: 'BLOM gel polish styled with a sculptural pink rose',
  },
  {
    src: gelPolishLineup,
    alt: 'BLOM gel polish collection in deep floral shades',
  },
];

const responsiveSrcSet = (src: string) => {
  if (!src.includes('res.cloudinary.com')) return undefined;

  return [480, 800, 1200]
    .map((width) => `${src.replace(/w_\d+/, `w_${width}`)} ${width}w`)
    .join(', ');
};

export const HomePage: React.FC = () => {
  useEffect(() => {
    updateSEO({
      title: 'BLOM Cosmetics - Professional Nail Products and Training South Africa',
      description: 'Shop professional BLOM nail products and practical nail-art training for artists across South Africa.',
      keywords: 'nail care products, acrylic nails, beauty training, nail art, professional cosmetics, South Africa, BLOM',
      url: 'https://blom-cosmetics.co.za/',
    });

    trackPageView(
      'BLOM Cosmetics - Professional Nail Products and Training South Africa',
      'https://blom-cosmetics.co.za/',
    );
  }, []);

  return (
    <div className="home-page">
      <Header showMobileMenu={true} />

      <main>
        <HeroSlider />
        <LuckyPetalBanner />
        <TrustBadges />
        <FeaturedProducts />

        {/* Category data and Shop filtering will be redesigned in the final phase. */}
        <ShopByCategory />

        <MasterYourCraft />

        <section className="home-story" aria-labelledby="story-heading">
          <div className="home-shell home-story__layout">
            <div className="home-story__visual">
              {storyImages.map((image, index) => (
                <figure className={`home-story__image home-story__image--${index + 1}`} key={image.src}>
                  <img
                    src={image.src}
                    srcSet={responsiveSrcSet(image.src)}
                    sizes={index === 0
                      ? '(max-width: 860px) 88vw, 38vw'
                      : '(max-width: 860px) 40vw, 17vw'}
                    alt={image.alt}
                    loading="lazy"
                  />
                </figure>
              ))}
            </div>

            <div className="home-story__copy">
              <h2 id="story-heading">Built from the artist&apos;s point of view.</h2>
              <p>
                BLOM brings professional products and practical education together so nail
                artists can work with more confidence, consistency and creative freedom.
              </p>
              <p>
                Every product and course starts with the same question: will this help an
                artist create better work for a real client?
              </p>
              <a href="/about">
                Read the BLOM story <ArrowUpRight aria-hidden="true" />
              </a>
            </div>
          </div>
        </section>

        <Testimonials />
        <SocialGallery />
      </main>

      <Footer />
    </div>
  );
};
