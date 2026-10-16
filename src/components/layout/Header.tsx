import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Container } from './Container';
import { User, Menu, X, Minus, Plus, Search, ChevronDown } from 'lucide-react';
import { SHOP_CATEGORY_TREE, ShopCategory } from '../../lib/shopCategories';
import { CartButton } from '../cart/CartButton';
import { WishlistButton } from '../wishlist/WishlistButton';
import { AnnouncementSignup } from './AnnouncementSignup';
import { AnnouncementBar } from './AnnouncementBar';
import { BackInStockPopup } from './BackInStockPopup';
import { BirthdayBundlePopup } from './BirthdayBundlePopup';
import { WomensDayPopup } from './WomensDayPopup';
import { CatEyeSpecialsPopup } from './CatEyeSpecialsPopup';
import { StarterPackPopup } from './StarterPackPopup';
import { CreatedForYouPopup } from './CreatedForYouPopup';

interface HeaderProps {
  showMobileMenu?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ showMobileMenu = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  
  // Mobile Accordion State for Shop (and which category groups are open inside it)
  const [isShopExpanded, setIsShopExpanded] = useState(false);
  const [openMobileGroups, setOpenMobileGroups] = useState<string[]>([]);

  // Site-wide search: jumps to the shop with the query applied
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isSearchOpen) searchInputRef.current?.focus();
  }, [isSearchOpen]);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    setIsSearchOpen(false);
    setIsMobileMenuOpen(false);
    navigate(query ? `/shop?q=${encodeURIComponent(query)}` : '/shop');
  };

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

  const categoryHref = (slug: string) => `/shop?category=${slug}`;
  const shopGroups = SHOP_CATEGORY_TREE.filter((node) => node.children?.length);
  const shopSingles = SHOP_CATEGORY_TREE.filter((node) => !node.children?.length);

  // Closes the hover/focus dropdown after a choice (focus would otherwise keep it open).
  const handleMenuChoice = (e: React.MouseEvent, href: string) => {
    handleNavClick(e, href);
    (document.activeElement as HTMLElement | null)?.blur();
  };

  const renderMegaLinks = (nodes: ShopCategory[], depth = 0): React.ReactNode => (
    <ul className={depth === 0 ? 'space-y-1' : 'mt-1 mb-1.5 ml-1 pl-3 border-l border-pink-100 space-y-0.5'}>
      {nodes.map((node) => (
        <li key={node.slug}>
          <a
            href={categoryHref(node.slug)}
            onClick={(e) => handleMenuChoice(e, categoryHref(node.slug))}
            className={`block rounded py-1 transition-colors hover:text-pink-600 focus-visible:outline-none focus-visible:text-pink-600 focus-visible:underline ${
              depth === 0 ? 'text-sm text-gray-700' : 'text-[13px] text-gray-500'
            }`}
          >
            {node.name}
          </a>
          {node.children && renderMegaLinks(node.children, depth + 1)}
        </li>
      ))}
    </ul>
  );

  const currentPath = location.pathname.replace(/\/$/, '') || '/';
  const currentCategory = new URLSearchParams(location.search).get('category') || 'all';

  return (
    <>
      <AnnouncementBar />
      <AnnouncementSignup />
      {/* Nude Cat Eye launch is the current live promo; it claims the visit ahead of the seasonal/restock popups. */}
      {/* Created For You TikTok Live is mounted first so it claims the visit ahead of Starter Pack. */}
      <CreatedForYouPopup />
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
                const isShop = item.name === 'Shop';
                return (
                  <div
                    key={item.name}
                    className="relative group"
                    onKeyDown={isShop ? (e) => {
                      if (e.key === 'Escape') (document.activeElement as HTMLElement | null)?.blur();
                    } : undefined}
                  >
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
                      {isShop && <ChevronDown className="inline-block w-3.5 h-3.5 ml-0.5 -mt-0.5 transition-transform duration-200 group-hover:rotate-180" aria-hidden />}
                      <span className={`absolute bottom-0 left-0 h-px bg-pink-500 transition-all duration-200 ${
                        isActive ? 'w-full' : 'w-0 group-hover:w-full'
                      }`} />
                    </a>
                    {isShop && (
                      <div className="absolute left-1/2 -translate-x-1/2 top-full pt-4 invisible opacity-0 translate-y-1 transition-all duration-150 group-hover:visible group-hover:opacity-100 group-hover:translate-y-0 group-focus-within:visible group-focus-within:opacity-100 group-focus-within:translate-y-0">
                        <div className="w-[640px] rounded-xl border border-gray-100 bg-white shadow-xl shadow-pink-900/5 p-6 grid grid-cols-3 gap-8">
                          {shopGroups.map((group) => (
                            <div key={group.slug}>
                              <a
                                href={categoryHref(group.slug)}
                                onClick={(e) => handleMenuChoice(e, categoryHref(group.slug))}
                                className="block mb-2 text-xs font-bold uppercase tracking-[0.18em] text-pink-600 hover:text-pink-700 focus-visible:outline-none focus-visible:underline"
                              >
                                {group.name}
                              </a>
                              {renderMegaLinks(group.children || [])}
                            </div>
                          ))}
                          <div>
                            <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-pink-600">More</p>
                            {renderMegaLinks(shopSingles)}
                            <a
                              href="/shop"
                              onClick={(e) => handleMenuChoice(e, '/shop')}
                              className="inline-block mt-4 text-sm font-semibold text-gray-900 underline underline-offset-4 decoration-pink-300 hover:decoration-pink-600 focus-visible:outline-none focus-visible:decoration-pink-600"
                            >
                              Shop all products
                            </a>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>

            {/* Action Icons - Right side */}
            <div className="flex items-center gap-1 md:gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsSearchOpen((open) => !open);
                }}
                className="p-2 text-gray-700 hover:text-pink-700 transition-colors"
                aria-label={isSearchOpen ? 'Close search' : 'Search products'}
                aria-expanded={isSearchOpen}
                aria-controls="site-search"
              >
                {isSearchOpen ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
              </button>
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

        {isSearchOpen && (
          <div id="site-search" className="border-t border-gray-100 bg-white">
            <Container>
              <form role="search" onSubmit={submitSearch} className="flex items-center gap-2 py-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    ref={searchInputRef}
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Escape' && setIsSearchOpen(false)}
                    placeholder="Search products or shade code, e.g. E005"
                    aria-label="Search products"
                    enterKeyHint="search"
                    className="w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-base text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-pink-300"
                  />
                </div>
                <button type="submit" className="px-4 py-2.5 rounded-xl bg-pink-600 text-white text-sm font-semibold hover:bg-pink-700 transition-colors">
                  Search
                </button>
              </form>
            </Container>
          </div>
        )}

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
                            isShopExpanded ? 'max-h-[1600px] opacity-100' : 'max-h-0 opacity-0'
                          }`}
                        >
                          <div className="py-1 px-4">
                            <a
                              href="/shop"
                              className={`block py-3 px-4 text-[15px] font-semibold rounded-lg transition-colors ${
                                currentPath === '/shop' && currentCategory === 'all' ? 'bg-pink-50 text-pink-700' : 'text-gray-900 hover:bg-pink-50'
                              }`}
                              onClick={(e) => handleNavClick(e, '/shop')}
                            >
                              Shop All
                            </a>
                            {SHOP_CATEGORY_TREE.map((node) => {
                              const href = categoryHref(node.slug);
                              const subActive = currentPath === '/shop' && currentCategory === node.slug;
                              const groupOpen = openMobileGroups.includes(node.slug);
                              return (
                                <div key={node.slug}>
                                  <div className="flex items-center">
                                    <a
                                      href={href}
                                      className={`flex-1 block py-3 px-4 text-[15px] rounded-lg transition-colors ${
                                        subActive ? 'bg-pink-50 text-pink-700 font-medium' : 'text-gray-700 hover:bg-pink-50'
                                      }`}
                                      onClick={(e) => handleNavClick(e, href)}
                                    >
                                      {node.name}
                                    </a>
                                    {node.children && (
                                      <button
                                        type="button"
                                        onClick={() => setOpenMobileGroups((prev) =>
                                          prev.includes(node.slug) ? prev.filter((s) => s !== node.slug) : [...prev, node.slug]
                                        )}
                                        aria-expanded={groupOpen}
                                        aria-label={`${groupOpen ? 'Hide' : 'Show'} ${node.name} types`}
                                        className="p-3 text-gray-500 rounded-lg hover:bg-pink-50"
                                      >
                                        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${groupOpen ? 'rotate-180' : ''}`} />
                                      </button>
                                    )}
                                  </div>
                                  {node.children && groupOpen && (
                                    <div className="ml-6 mb-1 border-l-2 border-pink-100">
                                      {node.children.map((child) => (
                                        <React.Fragment key={child.slug}>
                                          <a
                                            href={categoryHref(child.slug)}
                                            className={`block py-2.5 pl-4 text-sm rounded-r-md transition-colors ${
                                              currentPath === '/shop' && currentCategory === child.slug ? 'text-pink-700 bg-pink-50 font-medium' : 'text-gray-600 hover:text-pink-600 hover:bg-pink-50'
                                            }`}
                                            onClick={(e) => handleNavClick(e, categoryHref(child.slug))}
                                          >
                                            {child.name}
                                          </a>
                                          {child.children?.map((grandchild) => (
                                            <a
                                              key={grandchild.slug}
                                              href={categoryHref(grandchild.slug)}
                                              className={`block py-2 pl-8 text-[13px] rounded-r-md transition-colors ${
                                                currentPath === '/shop' && currentCategory === grandchild.slug ? 'text-pink-700 bg-pink-50 font-medium' : 'text-gray-500 hover:text-pink-600 hover:bg-pink-50'
                                              }`}
                                              onClick={(e) => handleNavClick(e, categoryHref(grandchild.slug))}
                                            >
                                              {grandchild.name}
                                            </a>
                                          ))}
                                        </React.Fragment>
                                      ))}
                                    </div>
                                  )}
                                </div>
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
