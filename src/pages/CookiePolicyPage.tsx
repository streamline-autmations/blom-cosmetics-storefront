import React, { useEffect } from 'react';
import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';
import { Container } from '../components/layout/Container';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { 
  Cookie, 
  Shield, 
  Eye, 
  Settings, 
  BarChart3, 
  Target,
  Globe,
  Mail,
  Phone,
  CheckCircle,
  AlertTriangle,
  Info
} from 'lucide-react';

export const CookiePolicyPage: React.FC = () => {
  useEffect(() => {
    document.title = 'Cookie Policy - BLOM Cosmetics';
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Learn about how BLOM Cosmetics uses cookies to improve your browsing experience and website functionality.');
    }
    window.scrollTo({ top: 0 });
  }, []);

  const cookieTypes = [
    {
      icon: Shield,
      title: 'Essential Cookies',
      description: 'Required for basic website functionality',
      purpose: 'These cookies are necessary for the website to function and cannot be switched off.',
      examples: ['Shopping cart', 'Login sessions', 'Security features', 'Form submissions'],
      canDisable: false
    },
    {
      icon: BarChart3,
      title: 'Analytics Cookies',
      description: 'Help us understand how visitors use our website',
      purpose: 'These cookies collect information about how you use our website to help us improve it.',
      examples: ['Page views', 'Time spent on site', 'Popular products', 'User journey tracking'],
      canDisable: true
    },
    {
      icon: Target,
      title: 'Marketing Cookies',
      description: 'Used to deliver relevant advertisements',
      purpose: 'These cookies track your browsing habits to show you relevant ads and content.',
      examples: ['Ad personalization', 'Social media integration', 'Retargeting campaigns', 'Conversion tracking'],
      canDisable: true
    },
    {
      icon: Settings,
      title: 'Preference Cookies',
      description: 'Remember your settings and preferences',
      purpose: 'These cookies remember your choices to provide a more personalized experience.',
      examples: ['Language settings', 'Currency preferences', 'Theme choices', 'Layout preferences'],
      canDisable: true
    }
  ];

  const thirdPartyCookies = [
    {
      name: 'Google Analytics',
      purpose: 'Website analytics and performance tracking',
      dataCollected: 'Page views, user interactions, device information',
      retention: '26 months',
      optOut: 'https://tools.google.com/dlpage/gaoptout'
    },
    {
      name: 'Facebook Pixel',
      purpose: 'Social media integration and advertising',
      dataCollected: 'Page visits, conversion events, user behavior',
      retention: '90 days',
      optOut: 'https://www.facebook.com/settings?tab=ads'
    },
    {
      name: 'PayFast',
      purpose: 'Payment processing and fraud prevention',
      dataCollected: 'Transaction data, payment preferences',
      retention: '7 years (regulatory requirement)',
      optOut: 'Cannot be disabled for payment processing'
    }
  ];

  const browserInstructions = [
    {
      browser: 'Google Chrome',
      steps: [
        'Click the three dots menu in the top right',
        'Select "Settings"',
        'Click "Privacy and security"',
        'Select "Cookies and other site data"',
        'Choose your preferred cookie settings'
      ]
    },
    {
      browser: 'Mozilla Firefox',
      steps: [
        'Click the menu button in the top right',
        'Select "Settings"',
        'Click "Privacy & Security"',
        'Under "Cookies and Site Data", click "Manage Data"',
        'Configure your cookie preferences'
      ]
    },
    {
      browser: 'Safari',
      steps: [
        'Click "Safari" in the menu bar',
        'Select "Preferences"',
        'Click the "Privacy" tab',
        'Choose your cookie and tracking settings',
        'Close the preferences window'
      ]
    },
    {
      browser: 'Microsoft Edge',
      steps: [
        'Click the three dots menu in the top right',
        'Select "Settings"',
        'Click "Cookies and site permissions"',
        'Select "Cookies and site data"',
        'Configure your cookie settings'
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      <Header showMobileMenu={true} />

      <main>
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-pink-50 to-blue-50 section-padding">
          <Container>
            <div className="text-center max-w-4xl mx-auto">
              <Cookie className="h-16 w-16 text-pink-400 mx-auto mb-6" />
              <h1 className="text-5xl font-bold mb-6">Cookie Policy</h1>
              <p className="text-xl text-gray-600 leading-relaxed mb-8">
                This policy explains how BLOM Cosmetics uses cookies and similar technologies 
                to enhance your browsing experience and improve our website functionality.
              </p>
              <p className="text-sm text-gray-500">Last updated: January 2025</p>
            </div>

            {/* Quick Overview */}
            <div className="grid md:grid-cols-3 gap-6 mt-12">
              <Card className="text-center">
                <CardContent className="p-6">
                  <Shield className="h-12 w-12 text-green-400 mx-auto mb-4" />
                  <h3 className="font-bold text-lg mb-2">Your Control</h3>
                  <p className="text-gray-600 text-sm">You can manage cookie preferences anytime</p>
                </CardContent>
              </Card>
              <Card className="text-center">
                <CardContent className="p-6">
                  <Eye className="h-12 w-12 text-blue-400 mx-auto mb-4" />
                  <h3 className="font-bold text-lg mb-2">Transparency</h3>
                  <p className="text-gray-600 text-sm">Clear information about what we collect</p>
                </CardContent>
              </Card>
              <Card className="text-center">
                <CardContent className="p-6">
                  <Settings className="h-12 w-12 text-pink-400 mx-auto mb-4" />
                  <h3 className="font-bold text-lg mb-2">Easy Management</h3>
                  <p className="text-gray-600 text-sm">Simple tools to control your preferences</p>
                </CardContent>
              </Card>
            </div>
          </Container>
        </section>

        {/* What Are Cookies */}
        <section className="section-padding">
          <Container>
            <div className="max-w-4xl mx-auto">
              <h2 className="text-4xl font-bold mb-8">What Are Cookies?</h2>
              <div className="prose prose-lg max-w-none">
                <p className="text-gray-600 leading-relaxed mb-6">
                  Cookies are small text files that are stored on your device (computer, tablet, or mobile) 
                  when you visit a website. They help websites remember information about your visit, 
                  such as your preferred language, login status, and other settings that can make your 
                  next visit easier and the site more useful to you.
                </p>
                <p className="text-gray-600 leading-relaxed mb-6">
                  Cookies are widely used by website owners to make their websites work more efficiently, 
                  provide reporting information, and deliver personalized content and advertising. 
                  They cannot harm your device or files, and they cannot access personal information 
                  unless you specifically provide it.
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <div className="flex items-start gap-3">
                    <Info className="h-6 w-6 text-blue-500 mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-blue-900 mb-2">Did You Know?</h4>
                      <p className="text-blue-800 text-sm">
                        Cookies were invented in 1994 by Lou Montulli, a web browser engineer. 
                        The name "cookie" comes from the computing term "magic cookie," which 
                        refers to a packet of data programs receive and send back unchanged.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Container>
        </section>

        {/* Types of Cookies */}
        <section className="section-padding bg-gray-50">
          <Container>
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold mb-4">Types of Cookies We Use</h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                We use different types of cookies for various purposes to enhance your experience
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
              {cookieTypes.map((type, index) => (
                <Card key={index} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-pink-400 to-blue-300 rounded-lg flex items-center justify-center flex-shrink-0">
                        <type.icon className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-xl font-bold">{type.title}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            type.canDisable 
                              ? 'bg-yellow-100 text-yellow-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {type.canDisable ? 'Optional' : 'Required'}
                          </span>
                        </div>
                        <p className="text-gray-600">{type.description}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 mb-4">{type.purpose}</p>
                    <h4 className="font-semibold mb-3">Examples:</h4>
                    <ul className="space-y-2">
                      {type.examples.map((example, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                          <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                          {example}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </Container>
        </section>

        {/* Third-Party Cookies */}
        <section className="section-padding">
          <Container>
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold mb-4">Third-Party Cookies</h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                We work with trusted partners who may also set cookies on our website
              </p>
            </div>

            <div className="max-w-6xl mx-auto">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse bg-white rounded-lg shadow-sm overflow-hidden">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-4 font-semibold">Service</th>
                      <th className="text-left p-4 font-semibold">Purpose</th>
                      <th className="text-left p-4 font-semibold">Data Collected</th>
                      <th className="text-left p-4 font-semibold">Retention</th>
                      <th className="text-left p-4 font-semibold">Opt-Out</th>
                    </tr>
                  </thead>
                  <tbody>
                    {thirdPartyCookies.map((cookie, index) => (
                      <tr key={index} className="border-t">
                        <td className="p-4 font-medium">{cookie.name}</td>
                        <td className="p-4 text-gray-600">{cookie.purpose}</td>
                        <td className="p-4 text-gray-600 text-sm">{cookie.dataCollected}</td>
                        <td className="p-4 text-gray-600 text-sm">{cookie.retention}</td>
                        <td className="p-4">
                          {cookie.optOut.startsWith('http') ? (
                            <a 
                              href={cookie.optOut} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-pink-400 hover:text-pink-500 text-sm"
                            >
                              Opt-out link
                            </a>
                          ) : (
                            <span className="text-gray-500 text-sm">{cookie.optOut}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Container>
        </section>

        {/* Managing Cookies */}
        <section className="section-padding bg-gray-50">
          <Container>
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold mb-4">Managing Your Cookie Preferences</h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                You have full control over which cookies you accept. Here's how to manage them
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-12 items-start">
              <div>
                <h3 className="text-2xl font-bold mb-6">Browser Settings</h3>
                <p className="text-gray-600 mb-8 leading-relaxed">
                  Most web browsers allow you to control cookies through their settings. 
                  Here are instructions for popular browsers:
                </p>

                <div className="space-y-6">
                  {browserInstructions.map((browser, index) => (
                    <Card key={index}>
                      <CardHeader>
                        <h4 className="font-semibold text-lg">{browser.browser}</h4>
                      </CardHeader>
                      <CardContent>
                        <ol className="space-y-2">
                          {browser.steps.map((step, stepIndex) => (
                            <li key={stepIndex} className="flex items-start gap-3 text-sm text-gray-600">
                              <span className="w-6 h-6 bg-pink-400 text-white rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0">
                                {stepIndex + 1}
                              </span>
                              {step}
                            </li>
                          ))}
                        </ol>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-2xl font-bold mb-6">Our Cookie Preferences</h3>
                <p className="text-gray-600 mb-8 leading-relaxed">
                  You can also manage your cookie preferences directly on our website 
                  using our cookie consent banner or preference center.
                </p>

                <Card className="mb-6">
                  <CardContent className="p-6">
                    <div className="text-center">
                      <Cookie className="h-12 w-12 text-pink-400 mx-auto mb-4" />
                      <h4 className="font-semibold text-lg mb-2">Cookie Preference Center</h4>
                      <p className="text-gray-600 mb-4 text-sm">
                        Manage your cookie settings and preferences in one place
                      </p>
                      <Button>
                        <Settings className="h-4 w-4 mr-2" />
                        Manage Preferences
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-6 w-6 text-yellow-500 mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-yellow-900 mb-2">Important Note</h4>
                      <p className="text-yellow-800 text-sm">
                        Disabling certain cookies may affect website functionality. 
                        Essential cookies cannot be disabled as they are required 
                        for basic website operations like security and shopping cart functionality.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Container>
        </section>

        {/* Updates and Changes */}
        <section className="section-padding">
          <Container>
            <div className="max-w-4xl mx-auto">
              <h2 className="text-4xl font-bold mb-8">Changes to This Policy</h2>
              <div className="prose prose-lg max-w-none">
                <p className="text-gray-600 leading-relaxed mb-6">
                  We may update this Cookie Policy from time to time to reflect changes in our 
                  practices, technology, legal requirements, or other factors. When we make changes, 
                  we will update the "Last updated" date at the top of this policy.
                </p>
                <p className="text-gray-600 leading-relaxed mb-6">
                  We encourage you to review this policy periodically to stay informed about how 
                  we use cookies. If we make material changes to this policy, we will notify you 
                  by email (if you have provided your email address) or by posting a notice on 
                  our website prior to the changes taking effect.
                </p>
                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-6 w-6 text-green-500 mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-green-900 mb-2">Stay Informed</h4>
                      <p className="text-green-800 text-sm">
                        Subscribe to our newsletter to receive notifications about important 
                        policy updates and changes that may affect your privacy and cookie preferences.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Container>
        </section>

        {/* Contact Information */}
        <section className="section-padding bg-gradient-to-r from-pink-400 to-blue-300 text-white">
          <Container>
            <div className="text-center max-w-4xl mx-auto">
              <h2 className="text-4xl font-bold mb-6">Questions About Cookies?</h2>
              <p className="text-xl text-pink-100 mb-8">
                If you have any questions about our use of cookies or this policy, 
                please don't hesitate to contact us.
              </p>

              <div className="grid md:grid-cols-3 gap-8 mb-12">
                <div className="text-center">
                  <Mail className="h-8 w-8 mx-auto mb-3 text-pink-200" />
                  <h4 className="font-semibold mb-2">Email</h4>
                  <p className="text-pink-100">shopblomcosmetics@gmail.com</p>
                </div>
                <div className="text-center">
                  <Phone className="h-8 w-8 mx-auto mb-3 text-pink-200" />
                  <h4 className="font-semibold mb-2">Phone</h4>
                  <p className="text-pink-100">+27 79 548 3317</p>
                </div>
                <div className="text-center">
                  <Globe className="h-8 w-8 mx-auto mb-3 text-pink-200" />
                  <h4 className="font-semibold mb-2">Address</h4>
                  <p className="text-pink-100">34 Horingbek St, Randfontein 1759</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" variant="secondary">
                  <Mail className="h-4 w-4 mr-2" />
                  Contact Support
                </Button>
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-pink-400">
                  <Settings className="h-4 w-4 mr-2" />
                  Manage Cookies
                </Button>
              </div>
            </div>
          </Container>
        </section>
      </main>

      <Footer />
    </div>
  );
};