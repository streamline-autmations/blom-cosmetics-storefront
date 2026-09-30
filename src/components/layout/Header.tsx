import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Container } from './Container';
import { User, Menu, X, Minus, Plus } from 'lucide-react';
import { CartButton } from '../cart/CartButton';
import { WishlistButton } from '../wishlist/WishlistButton';
import { AnnouncementSignup } from './AnnouncementSignup';
import { AnnouncementBar } from './AnnouncementBar';
import { BackInStockPopup } from './BackInStockPopup';
import { BirthdayBundlePopup } from './BirthdayBundlePopup';
import { WomensDayPopup } from './WomensDayPopup';
import { CatEyeSpecialsPopup } from './CatEyeSpecialsPopup';
import { StarterPackPopup } from './StarterPackPopup';

interface HeaderProps {
  showMobileMenu?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ showMobileMenu = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  
  // Mobile Accordion State for Shop
  const [isShopExpanded, setIsShopExpanded] = useState(false);

  const handleNavClick = (e: React.MouseEvent, href: string) => {
    if (href.startsWith('http')) return;
    e.preventDefault();
    setIsMobileMenuOpen(false);
    navigate(href);
    requestAnimationFrame(() => {
      try {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch {
        window.scrollTo(0, 0);
      }
    });
  };

  const navigationItems = [
    { name: 'Home', href: '/' },
    { name: 'Shop', href: '/shop' },
    { name: 'Courses', href: '/courses' },
    { name: 'About', href: '/about' },
    { name: 'Contact', href: '/contact' }
  ];

  const shopCategories = [
    { name: 'Shop All', href: '/shop' },
    { name: 'Acrylic System', href: '/shop?category=acrylic-system' },
    { name: 'Bundle Deals', href: '/shop?category=bundle-deals' },
    { name: 'Gel System', href: '/shop?category=gel-system' },
    { name: 'Prep & Finishing', href: '/shop?category=prep-finishing' },
    { name: 'Tools & Essentials', href: '/shop?category=tools-essentials' },
    { name: 'Furniture', href: '/shop?category=furniture' }
  ];

  const currentPath = location.pathname.replace(/\/$/, '') || '/';
  const currentCategory = new URLSearchParams(location.search).get('category') || 'all';

  return (
    <>
      <AnnouncementBar />
      <AnnouncementSignup />
      {/* Nude Cat Eye launch is the current live promo; it claims the visit ahead of the seasonal/restock popups. */}
      <StarterPackPopup />
      <CatEyeSpecialsPopup />
      <WomensDayPopup />
      <BirthdayBundlePopup />
      <BackInStockPopup />

      {/* Main Header */}
      <header className="sticky top-0 z-50 border-b border-gray-200/70 bg-white/90 backdrop-blur-xl">
        <Container>
          <div className="flex items-center justify-between h-[72px]">
            {/* Mobile menu button - Left side (mobile only) */}
            {showMobileMenu && (
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden p-2 text-gray-700 hover:text-pink-600"
                aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={isMobileMenuOpen}
                aria-controls="mobile-menu"
              >
                {isMobileMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </button>
            )}

            {/* Logo - Left on desktop, center on mobile */}
            <div className="flex-shrink-0 lg:flex-shrink-0 lg:flex-none flex-1 flex justify-center lg:justify-start">
              <a href="/" className="text-2xl font-bold text-gray-900 header-logo" onClick={(e) => handleNavClick(e, '/')}>
                {logoFailed ? (
                  <span className="tracking-[0.16em] text-[1.05rem] font-extrabold">BLOM</span>
                ) : (
                  <img
                    src="/blom_logo-256.webp"
                    alt="BLOM Cosmetics"
                    width={256}
                    height={144}
                    className="h-12 md:h-10 w-auto"
                    onError={() => setLogoFailed(true)}
                  />
                )}
              </a>
            </div>

            {/* Desktop Navigation - Center */}
            <nav className="hidden lg:flex items-center gap-8 flex-1 justify-center">
              {navigationItems.map((item) => {
                const isActive = currentPath === item.href;
                return (
                  <div key={item.name} className="relative group">
                    <a
                      href={item.href}
                      className={`px-1 py-2 text-sm font-semibold transition-colors duration-200 relative ${
                        isActive 
                          ? 'text-pink-600'
                          : 'text-gray-700 hover:text-pink-600'
                      }`}
                      onClick={(e) => handleNavClick(e, item.href)}
                    >
                      {item.name}
                      <span className={`absolute bottom-0 left-0 h-px bg-pink-500 transition-all duration-200 ${
                        isActive ? 'w-full' : 'w-0 group-hover:w-full'
                      }`} />
                    </a>
                  </div>
                );
              })}
            </nav>

            {/* Action Icons - Right side */}
            <div className="flex items-center gap-2 md:gap-3">
              <a
                href="/account"
                className="p-2 text-gray-700 hover:text-pink-700 transition-colors"
                aria-label="Account"
              >
                <User className="h-5 w-5" />
              </a>
              <WishlistButton />
              <CartButton />
            </div>
          </div>
        </Container>

        {/* Mobile Navigation */}
        {showMobileMenu && (
          <div
            id="mobile-menu"
            className={`lg:hidden border-t bg-white shadow-lg overflow-hidden transition-all duration-300 ease-out fixed inset-0 top-[105px] z-40 overflow-y-auto ${
              isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
            style={{ height: 'calc(100vh - 105px)' }} // Adjust based on header height
            aria-hidden={!isMobileMenuOpen}
          >
            <div className="bg-white h-full pb-20">
              <div className="py-2">
                {navigationItems.map((item) => {
                  const isActive = currentPath === item.href;

                  if (item.name === 'Shop') {
                    return (
                      <div key={item.name} className="py-2 border-b border-gray-50">
                        <button
                          onClick={() => setIsShopExpanded(!isShopExpanded)}
                          className={`flex items-center justify-between w-full px-6 py-3 text-left rounded-xl mx-2 transition-colors ${
                            isActive ? 'bg-blue-50 text-gray-900' : 'hover:bg-pink-50 text-gray-900'
                          }`}
                        >
                          <span className="text-base font-medium">{item.name}</span>
                          {isShopExpanded ? (
                            <Minus className="w-4 h-4 text-gray-700" />
                          ) : (
                            <Plus className="w-4 h-4 text-gray-700" />
                          )}
                        </button>

                        <div
                          className={`overflow-hidden transition-all duration-300 ${
                            isShopExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
                          }`}
                        >
                          <div className="py-2">
                            {shopCategories.map((subItem, subIndex) => {
                              // Special handling for Acrylic System with collapsible logic
                              if (subItem.name === 'Acrylic System') {
                                // To make it collapsible, we'd need another state variable.
                                // Given the user request is just "open up subcategories", showing them inline is the most direct fix.
                                
                                return (
                                  <div key={subIndex} className="block">
                                    <div className="flex items-center justify-between px-4 mx-4 rounded-lg hover:bg-pink-50 transition-colors">
                                      <a
                                        href={subItem.href}
                                        className="flex-1 py-2.5 text-sm text-gray-600"
                                        onClick={(e) => handleNavClick(e, subItem.href)}
                                      >
                                        {subItem.name}
                                      </a>
                                    </div>
                                    
                                    {/* Subcategories always visible for now to ensure accessibility */}
                                    <div className="flex flex-col ml-12 border-l-2 border-pink-100 my-1 space-y-1">
                                       <a 
                                         href="/shop?category=core-acrylics"
                                         className="py-2 pl-4 text-xs font-medium text-gray-500 hover:text-pink-600 hover:bg-pink-50 rounded-r-md transition-colors block"
                                         onClick={(e) => handleNavClick(e, '/shop?category=core-acrylics')}
                                       >
                                         Core Acrylics
                                       </a>
                                       <a 
                                         href="/shop?category=coloured-acrylics"
                                         className="py-2 pl-4 text-xs font-medium text-gray-500 hover:text-pink-600 hover:bg-pink-50 rounded-r-md transition-colors block"
                                         onClick={(e) => handleNavClick(e, '/shop?category=coloured-acrylics')}
                                       >
                                         Coloured Acrylics
                                       </a>
                                    </div>
                                  </div>
                                );
                              }

                              const subCategory = new URLSearchParams(subItem.href.split('?')[1] || '').get('category') || 'all';
                              const subActive = currentPath === '/shop' && currentCategory === subCategory;

                              return (
                                <a
                                  key={subIndex}
                                  href={subItem.href}
                                  className={`block py-2.5 px-10 text-sm rounded-lg mx-4 transition-colors ${
                                    subActive
                                      ? 'bg-pink-50 text-pink-700'
                                      : 'text-gray-600 hover:bg-pink-50 hover:text-gray-900'
                                  }`}
                                  onClick={(e) => handleNavClick(e, subItem.href)}
                                >
                                  {subItem.name}
                                </a>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <a
                      key={item.name}
                      href={item.href}
                      className={`block py-4 px-6 text-base font-medium rounded-xl mx-2 transition-colors ${
                        isActive ? 'bg-blue-50 text-gray-900' : 'text-gray-900 hover:bg-pink-50'
                      }`}
                      onClick={(e) => handleNavClick(e, item.href)}
                    >
                      {item.name}
                    </a>
                  );
                })}
              </div>

              {/* Footer Links in Menu */}
              <div className="border-t border-gray-100 mt-4 pt-4 px-6 pb-8">
                 <div className="flex flex-col space-y-3">
                    <a href="/login" className="text-gray-500 text-sm">Log in</a>
                    <a href="/signup" className="text-gray-500 text-sm">Create account</a>
                 </div>
              </div>
            </div>
          </div>
        )}
      </header>
    </>
  );
};
