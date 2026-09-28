import React, { useEffect } from 'react';
import { Instagram, Facebook } from 'lucide-react';

// Custom WhatsApp Icon Component
const WhatsAppIcon: React.FC<{ className?: string; strokeWidth?: number }> = ({ className = "h-6 w-6" }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
  </svg>
);

// Custom TikTok Icon Component
const TikTokIcon: React.FC<{ className?: string; strokeWidth?: number }> = ({ className = "h-6 w-6" }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

export const Footer: React.FC = () => {
  useEffect(() => {
    const y = document.getElementById('year');
    if (y) y.textContent = String(new Date().getFullYear());
  }, []);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const input = e.currentTarget.querySelector('input[type="email"]') as HTMLInputElement | null;
    const email = input?.value.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { alert('Please enter a valid email.'); return; }
    setTimeout(() => { alert('Thanks for subscribing!'); input!.value = ''; }, 400);
  };

  return (
    <footer className="site-footer" role="contentinfo">
      <div className="footer-wrap">
        <div className="footer-col">
          <h4>Quick Links</h4>
          <ul className="footer-links">
            <li><a href="/">Home</a></li>
            <li><a href="/shop">Shop</a></li>
            <li><a href="/courses">Courses</a></li>
            <li><a href="/about">About</a></li>
            <li><a href="/contact">Contact</a></li>
            <li><a href="/shop?q=best">Best Sellers</a></li>
            <li><a href="/shop?q=new">New Arrivals</a></li>
            <li><a href="/shop?q=sale">Sale</a></li>
          </ul>
        </div>

        <div className="footer-col">
          <h4>Customer Care</h4>
          <ul className="footer-links">
            <li><a href="/contact">Contact</a></li>
            <li><a href="/faq">FAQ</a></li>
            <li><a href="/shipping">Shipping</a></li>
            <li><a href="/returns">Returns</a></li>
          </ul>
        </div>

        <div className="footer-col">
          <h4>About</h4>
          <ul className="footer-links">
            <li><a href="/about#story">Our Story</a></li>
            <li><a href="/courses">Education</a></li>
            <li><a href="/pro-services">Professional Services</a></li>
            <li><a href="/careers">Careers</a></li>
            <li><a href="https://heyzine.com/flip-book/6d112b7bc1.html" target="_blank" rel="noopener">View Catalogue</a></li>
          </ul>
        </div>

        <div className="footer-col">
          <h4>Connect</h4>
          <div className="footer-socials">
            <a aria-label="Instagram" href="https://www.instagram.com/cosmetics_blom/" target="_blank" rel="noopener" className="social-link">
              <Instagram className="h-6 w-6" strokeWidth={2} />
            </a>
            <a aria-label="Facebook" href="https://www.facebook.com/profile.php?id=61581058185006" target="_blank" rel="noopener" className="social-link">
              <Facebook className="h-6 w-6" strokeWidth={2} />
            </a>
            <a aria-label="WhatsApp" href="https://wa.me/27795483317" target="_blank" rel="noopener" className="social-link">
              <WhatsAppIcon className="h-6 w-6" strokeWidth={2} />
            </a>
            <a aria-label="TikTok" href="https://www.tiktok.com/@blom.cosmetics" target="_blank" rel="noopener" className="social-link">
              <TikTokIcon className="h-6 w-6" strokeWidth={2} />
            </a>
          </div>

          <h5 className="newsletter-title">Newsletter Signup</h5>
          <form className="newsletter" id="footer-newsletter" noValidate onSubmit={onSubmit}>
            <input className="newsletter-input" type="email" placeholder="Your email" aria-label="Email address" required />
            <button className="btn btn-blue" type="submit">Subscribe</button>
          </form>
          <p className="newsletter-helper">Sign up for our newsletter and get exclusive discounts + updates.</p>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="footer-bottom-content">
          <p>© <span id="year" /> BLOM Cosmetics. All rights reserved.</p>
          <p className="footer-designer">
            Designed by <a
              href="https://streamline-automations.co.za/?utm_source=blom-cosmetics&utm_medium=referral&utm_campaign=footer-credit"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-pink-500 transition-colors"
              onClick={() => (window as any).gtag?.('event', 'designed_by_click', { link_url: 'https://streamline-automations.co.za/', transport_type: 'beacon' })}
            >Streamline Automation</a>
          </p>
        </div>
        <nav className="footer-legal" aria-label="Legal links">
          <a href="/privacy">Privacy Policy</a>
          <a href="/terms">Terms & Conditions</a>
          <a href="/returns">Returns & Refunds</a>
          <a href="/track-order">Track Order</a>
        </nav>
      </div>
    </footer>
  );
};
