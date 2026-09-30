import React, { useState, useEffect } from 'react';
import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';
import { Container } from '../components/layout/Container';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { queries, BlogPost } from '../lib/supabase';
import { ShareButton } from '../components/ui/ShareButton';
import { pageSEO, trackPageView, updateSEO } from '../lib/seo';
import {
  Calendar,
  Clock,
  Search,
  TrendingUp,
  BookOpen,
  Heart,
  Eye
} from 'lucide-react';

export const BlogPage: React.FC = () => {
  const [, setPosts] = useState<BlogPost[]>([]);
  const [, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('all');

  useEffect(() => {
    updateSEO(pageSEO(
      'Blog',
      'Read BLOM Cosmetics blog posts for nail tips, product guides, and training insights.',
      '/blog'
    ));
    trackPageView('Blog | BLOM Cosmetics', 'https://blom-cosmetics.co.za/blog');
  }, []);

  // Fallback blog posts data
  const fallbackPosts = [
    {
      id: '1',
      title: 'Master the Perfect Watercolor Nail Art Technique',
      slug: 'master-watercolor-nail-art-technique',
      content: 'Learn the secrets behind creating stunning watercolor effects on nails...',
      excerpt: 'Discover the step-by-step process to create beautiful watercolor nail art that will wow your clients and elevate your nail artistry skills.',
      featured_image: 'https://images.pexels.com/photos/3997993/pexels-photo-3997993.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop',
      author_id: '1',
      status: 'published' as const,
      tags: ['tutorials', 'watercolor', 'nail-art'],
      meta_title: 'Master Watercolor Nail Art - BLOM Blog',
      meta_description: 'Learn professional watercolor nail art techniques',
      published_at: '2024-01-15T10:00:00Z',
      created_at: '2024-01-15T10:00:00Z',
      updated_at: '2024-01-15T10:00:00Z'
    },
    {
      id: '2',
      title: 'Top 10 Acrylic Nail Trends for 2024',
      slug: 'top-10-acrylic-nail-trends-2024',
      content: 'Explore the hottest acrylic nail trends that are dominating 2024...',
      excerpt: 'Stay ahead of the curve with these trending acrylic nail designs that your clients will love. From minimalist to bold statement nails.',
      featured_image: 'https://images.pexels.com/photos/3997992/pexels-photo-3997992.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop',
      author_id: '2',
      status: 'published' as const,
      tags: ['trends', 'acrylic', 'inspiration'],
      meta_title: 'Acrylic Nail Trends 2024 - BLOM Blog',
      meta_description: 'Discover the top acrylic nail trends for 2024',
      published_at: '2024-01-10T14:00:00Z',
      created_at: '2024-01-10T14:00:00Z',
      updated_at: '2024-01-10T14:00:00Z'
    },
    {
      id: '3',
      title: 'How to Build a Successful Nail Business',
      slug: 'build-successful-nail-business',
      content: 'Essential tips and strategies for starting and growing your nail business...',
      excerpt: 'From setting up your salon to marketing strategies, learn everything you need to know to build a thriving nail business.',
      featured_image: 'https://images.pexels.com/photos/3997991/pexels-photo-3997991.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop',
      author_id: '1',
      status: 'published' as const,
      tags: ['business', 'tips', 'entrepreneurship'],
      meta_title: 'Build a Successful Nail Business - BLOM Blog',
      meta_description: 'Learn how to start and grow your nail business',
      published_at: '2024-01-05T09:00:00Z',
      created_at: '2024-01-05T09:00:00Z',
      updated_at: '2024-01-05T09:00:00Z'
    },
    {
      id: '4',
      title: 'Product Review: BLOM Premium Acrylic Powder',
      slug: 'blom-premium-acrylic-powder-review',
      content: 'In-depth review of our premium acrylic powder system...',
      excerpt: 'Get an honest review of BLOM\'s premium acrylic powder, including application tips, durability testing, and professional insights.',
      featured_image: 'https://images.pexels.com/photos/3997993/pexels-photo-3997993.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop',
      author_id: '3',
      status: 'published' as const,
      tags: ['reviews', 'products', 'acrylic'],
      meta_title: 'BLOM Acrylic Powder Review - BLOM Blog',
      meta_description: 'Professional review of BLOM premium acrylic powder',
      published_at: '2024-01-01T12:00:00Z',
      created_at: '2024-01-01T12:00:00Z',
      updated_at: '2024-01-01T12:00:00Z'
    },
    {
      id: '5',
      title: 'Nail Health: Essential Care Tips for Professionals',
      slug: 'nail-health-care-tips-professionals',
      content: 'Comprehensive guide to maintaining healthy nails for both technicians and clients...',
      excerpt: 'Learn essential nail health practices that every professional should know to maintain healthy nails and prevent common issues.',
      featured_image: 'https://images.pexels.com/photos/3997992/pexels-photo-3997992.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop',
      author_id: '2',
      status: 'published' as const,
      tags: ['health', 'tips', 'professional'],
      meta_title: 'Nail Health Tips for Professionals - BLOM Blog',
      meta_description: 'Essential nail health care tips for nail professionals',
      published_at: '2023-12-28T16:00:00Z',
      created_at: '2023-12-28T16:00:00Z',
      updated_at: '2023-12-28T16:00:00Z'
    },
    {
      id: '6',
      title: 'Industry News: Latest Nail Art Innovations',
      slug: 'latest-nail-art-innovations-2024',
      content: 'Stay updated with the latest innovations in the nail art industry...',
      excerpt: 'Discover the cutting-edge tools, techniques, and products that are revolutionizing the nail art industry in 2024.',
      featured_image: 'https://images.pexels.com/photos/3997991/pexels-photo-3997991.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop',
      author_id: '1',
      status: 'published' as const,
      tags: ['news', 'innovation', 'industry'],
      meta_title: 'Nail Art Innovations 2024 - BLOM Blog',
      meta_description: 'Latest innovations in nail art industry',
      published_at: '2023-12-25T11:00:00Z',
      created_at: '2023-12-25T11:00:00Z',
      updated_at: '2023-12-25T11:00:00Z'
    }
  ];

  const blogCategories = [
    { name: 'All Posts', slug: 'all', count: 25 },
    { name: 'Tutorials', slug: 'tutorials', count: 8 },
    { name: 'Product Reviews', slug: 'reviews', count: 5 },
    { name: 'Industry News', slug: 'news', count: 4 },
    { name: 'Tips & Tricks', slug: 'tips', count: 6 },
    { name: 'Trends & Inspiration', slug: 'trends', count: 7 }
  ];

  const popularTags = [
    'nail-art', 'tutorials', 'acrylic', 'gel', 'watercolor', 
    'business', 'trends', 'reviews', 'tips', 'professional'
  ];

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const data = await queries.getBlogPosts(10);
        setPosts(data);
      } catch (error) {
        console.error('Error fetching blog posts:', error);
        // Use fallback data
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  const filteredPosts = fallbackPosts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         post.excerpt.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTag = selectedTag === 'all' || post.tags.includes(selectedTag);
    return matchesSearch && matchesTag;
  });

  const featuredPost = filteredPosts[0];
  const recentPosts = filteredPosts.slice(1, 4);
  const allPosts = filteredPosts.slice(4);

  // Intersection Observer for mobile shimmer effect
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
            }, 4000);
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

    // Observe all blog post cards
    const blogCards = document.querySelectorAll('.blog-card');
    blogCards.forEach((card) => observer.observe(card));

    return () => observer.disconnect();
  }, [filteredPosts]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getReadingTime = (content: string) => {
    const wordsPerMinute = 200;
    const wordCount = content.split(' ').length;
    return Math.ceil(wordCount / wordsPerMinute);
  };

  return (
    <div className="min-h-screen bg-white">
      <Header showMobileMenu={true} />

      <main>
        {/* Blog Hero Section */}
        <section className="bg-gradient-to-br from-pink-50 to-blue-50 section-padding">
          <Container>
            <div className="text-center max-w-4xl mx-auto">
              <h1 className="text-5xl font-bold mb-6">BLOM Beauty Blog</h1>
              <p className="text-xl text-gray-600 leading-relaxed mb-8">
                Stay inspired with the latest nail art tutorials, industry trends,
                product reviews, and professional tips from our expert team.
              </p>

              {/* Search Bar */}
              <div className="max-w-md mx-auto relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search articles..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input-field pl-12 w-full"
                />
              </div>
            </div>
          </Container>
        </section>

        {/* Featured Post */}
        {featuredPost && (
          <section className="section-padding">
            <Container>
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold mb-4">Featured Article</h2>
              </div>

              <Card className="blog-card group overflow-hidden max-w-4xl mx-auto">
                <div className="md:flex">
                  <div className="md:w-1/2 relative overflow-hidden">
                    <img
                      src={featuredPost.featured_image || 'https://images.pexels.com/photos/3997993/pexels-photo-3997993.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop'}
                      alt={featuredPost.title}
                      className="w-full h-64 md:h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {/* Shimmer Effect */}
                    <div className="absolute inset-0 pointer-events-none">
                      <div className="shimmer"></div>
                    </div>
                  </div>
                  <div className="md:w-1/2 p-8">
                    <div className="flex items-center gap-2 mb-4">
                      {featuredPost.tags.slice(0, 2).map((tag) => (
                        <span key={tag} className="px-3 py-1 bg-pink-100 text-pink-600 rounded-full text-sm font-medium">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <h3 className="text-2xl font-bold mb-4">{featuredPost.title}</h3>
                    <p className="text-gray-600 mb-6 leading-relaxed">{featuredPost.excerpt}</p>
                    
                    <div className="flex items-center gap-4 mb-6 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate(featuredPost.published_at!)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>{getReadingTime(featuredPost.content)} min read</span>
                      </div>
                    </div>

                    <Button>Read Full Article</Button>
                  </div>
                </div>
              </Card>
            </Container>
          </section>
        )}

        {/* Recent Posts */}
        <section className="section-padding bg-gray-50">
          <Container>
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold mb-4">Recent Articles</h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Stay up to date with our latest tutorials, tips, and industry insights
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {recentPosts.map((post) => (
                <Card key={post.id} className="blog-card group cursor-pointer overflow-hidden">
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <img
                      src={post.featured_image || 'https://images.pexels.com/photos/3997993/pexels-photo-3997993.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop'}
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {/* Shimmer Effect */}
                    <div className="absolute inset-0 pointer-events-none">
                      <div className="shimmer"></div>
                    </div>
                    <div className="absolute top-4 left-4">
                      <span className="px-2 py-1 bg-white text-gray-700 rounded text-sm font-medium">
                        {post.tags[0]}
                      </span>
                    </div>
                  </div>
                  <CardContent>
                    <h3 className="font-bold text-lg mb-2 group-hover:text-pink-400 transition-colors">
                      {post.title}
                    </h3>
                    <p className="text-gray-600 text-sm mb-4">{post.excerpt}</p>
                    
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate(post.published_at!)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>{getReadingTime(post.content)} min</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </Container>
        </section>

        {/* All Posts with Sidebar */}
        <section className="section-padding">
          <Container>
            <div className="grid lg:grid-cols-4 gap-12">
              {/* Main Content */}
              <div className="lg:col-span-3">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-3xl font-bold">All Articles</h2>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Popular
                    </Button>
                    <Button variant="outline" size="sm">
                      <Calendar className="h-4 w-4 mr-2" />
                      Latest
                    </Button>
                  </div>
                </div>

                <div className="space-y-8">
                  {allPosts.map((post) => (
                    <Card key={post.id} className="blog-card group cursor-pointer">
                      <div className="flex gap-6 p-6">
                        <div className="relative w-32 h-32 flex-shrink-0 overflow-hidden rounded-lg">
                          <img
                            src={post.featured_image || 'https://images.pexels.com/photos/3997993/pexels-photo-3997993.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop'}
                            alt={post.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 pointer-events-none">
                            <div className="shimmer"></div>
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {post.tags.slice(0, 2).map((tag) => (
                              <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-medium">
                                {tag}
                              </span>
                            ))}
                          </div>
                          <h3 className="font-bold text-xl mb-2 group-hover:text-pink-400 transition-colors">
                            {post.title}
                          </h3>
                          <p className="text-gray-600 mb-4">{post.excerpt}</p>
                          
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              <span>{formatDate(post.published_at!)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              <span>{getReadingTime(post.content)} min read</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Eye className="h-4 w-4" />
                              <span>1.2k views</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                {/* Load More */}
                <div className="text-center mt-12">
                  <Button size="lg" variant="outline">
                    Load More Articles
                  </Button>
                </div>
              </div>

              {/* Sidebar */}
              <div className="lg:col-span-1">
                <div className="space-y-8">
                  {/* Categories */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="font-bold text-lg mb-4">Categories</h3>
                    <ul className="space-y-2">
                      {blogCategories.map((category) => (
                        <li key={category.slug}>
                          <button
                            onClick={() => setSelectedTag(category.slug)}
                            className={`flex items-center justify-between w-full text-left py-2 px-3 rounded transition-colors ${
                              selectedTag === category.slug
                                ? 'bg-pink-100 text-pink-600'
                                : 'text-gray-600 hover:bg-white hover:text-pink-400'
                            }`}
                          >
                            <span>{category.name}</span>
                            <span className="text-sm">({category.count})</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Popular Tags */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="font-bold text-lg mb-4">Popular Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {popularTags.map((tag) => (
                        <button
                          key={tag}
                          onClick={() => setSelectedTag(tag)}
                          className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                            selectedTag === tag
                              ? 'bg-pink-400 text-white'
                              : 'bg-white text-gray-600 hover:bg-pink-100 hover:text-pink-600'
                          }`}
                        >
                          #{tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Newsletter Signup */}
                  <div className="bg-gradient-to-br from-pink-400 to-blue-300 rounded-lg p-6 text-white">
                    <h3 className="font-bold text-lg mb-2">Stay Updated</h3>
                    <p className="text-pink-100 mb-4 text-sm">
                      Get the latest tutorials and tips delivered to your inbox
                    </p>
                    <div className="space-y-3">
                      <input
                        type="email"
                        placeholder="Your email"
                        className="w-full px-3 py-2 rounded text-gray-900 text-sm"
                      />
                      <Button variant="secondary" size="sm" className="w-full">
                        Subscribe
                      </Button>
                    </div>
                  </div>

                  {/* Social Links */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="font-bold text-lg mb-4">Follow Us</h3>
                    <div className="flex gap-3">
                      <button className="p-2 bg-white rounded-lg hover:bg-pink-50 transition-colors">
                        <Heart className="h-5 w-5 text-pink-400" />
                      </button>
                      <ShareButton
                        url={window.location.href}
                        title="BLOM Beauty Blog"
                        description="Nail art tutorials, tips, and industry insights from BLOM Cosmetics."
                        className="p-2 bg-white rounded-lg hover:bg-pink-50 transition-colors"
                      />
                      <button className="p-2 bg-white rounded-lg hover:bg-pink-50 transition-colors">
                        <BookOpen className="h-5 w-5 text-pink-400" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Container>
        </section>
      </main>

      <Footer />
    </div>
  );
};
