import React, { useState, useEffect } from 'react';

// Extend window interface for script communication
declare global {
  interface Window {
    showSuccessModal?: boolean;
  }
}
import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';
import { Container } from '../components/layout/Container';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ClickableContact } from '../components/ui/ClickableContact';
import { StockistLocator } from '../components/stockists/StockistLocator';
import {
  Mail,
  Phone,
  MessageCircle,
  Send,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Upload,
  X,
  FileText,
  Truck,
  RotateCcw
} from 'lucide-react';

export const ContactPage: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    countryCode: '+27',
    subject: '',
    message: '',
    inquiryType: 'general'
  });
  const [isSubmitting] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showAllFaqs, setShowAllFaqs] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);


  const inquiryTypes = [
    { value: 'general', label: 'General Inquiry' },
    { value: 'products', label: 'Product Information' },
    { value: 'courses', label: 'Course Enrollment' },
    { value: 'support', label: 'Technical Support' },
    { value: 'business', label: 'Business Partnership' },
    { value: 'media', label: 'Media & Press' }
  ];

  const countryCodes = [
    { code: '+27', country: 'South Africa', flag: '🇿🇦' },
    { code: '+1', country: 'United States', flag: '🇺🇸' },
    { code: '+44', country: 'United Kingdom', flag: '🇬🇧' },
    { code: '+33', country: 'France', flag: '🇫🇷' },
    { code: '+49', country: 'Germany', flag: '🇩🇪' },
    { code: '+39', country: 'Italy', flag: '🇮🇹' },
    { code: '+34', country: 'Spain', flag: '🇪🇸' },
    { code: '+31', country: 'Netherlands', flag: '🇳🇱' },
    { code: '+32', country: 'Belgium', flag: '🇧🇪' },
    { code: '+41', country: 'Switzerland', flag: '🇨🇭' },
    { code: '+43', country: 'Austria', flag: '🇦🇹' },
    { code: '+46', country: 'Sweden', flag: '🇸🇪' },
    { code: '+47', country: 'Norway', flag: '🇳🇴' },
    { code: '+45', country: 'Denmark', flag: '🇩🇰' },
    { code: '+358', country: 'Finland', flag: '🇫🇮' },
    { code: '+351', country: 'Portugal', flag: '🇵🇹' },
    { code: '+353', country: 'Ireland', flag: '🇮🇪' },
    { code: '+61', country: 'Australia', flag: '🇦🇺' },
    { code: '+64', country: 'New Zealand', flag: '🇳🇿' },
    { code: '+81', country: 'Japan', flag: '🇯🇵' },
    { code: '+82', country: 'South Korea', flag: '🇰🇷' },
    { code: '+86', country: 'China', flag: '🇨🇳' },
    { code: '+91', country: 'India', flag: '🇮🇳' },
    { code: '+55', country: 'Brazil', flag: '🇧🇷' },
    { code: '+52', country: 'Mexico', flag: '🇲🇽' },
    { code: '+54', country: 'Argentina', flag: '🇦🇷' }
  ];


  const faqs = [
    {
      question: 'How do I enroll in a course?',
      answer: 'You can enroll in any of our courses by visiting the course page and clicking the "Enroll Now" button. You\'ll be guided through the payment process and will receive immediate access to online courses or confirmation details for in-person training.'
    },
    {
      question: 'What products do you recommend for beginners?',
      answer: 'For beginners, we recommend starting with our Beginner\'s Acrylic Kit which includes everything you need: primer, acrylic powder, liquid monomer, brushes, and detailed instructions. We also offer online tutorials to help you get started.'
    },
    {
      question: 'Do you offer international shipping?',
      answer: 'Yes, we ship internationally to most countries. Shipping costs and delivery times vary by location. You can see exact shipping costs during checkout. We also offer expedited shipping options for urgent orders.'
    },
    {
      question: 'How long do courses take to complete?',
      answer: 'Course duration varies by program. Online courses range from 4-12 hours and can be completed at your own pace. In-person workshops are typically 1-3 days. Each course page shows the exact duration and schedule.'
    },
    {
      question: 'What is your return policy?',
      answer: 'We offer a 30-day return policy on unopened products. For courses, we provide a 7-day satisfaction guarantee. If you\'re not completely satisfied, contact us for a full refund or exchange.'
    },
    {
      question: 'Do you provide certificates upon course completion?',
      answer: 'Yes, all our courses include a certificate of completion. Professional certification courses also provide industry-recognized credentials that you can use to advance your career and demonstrate your expertise to clients.'
    },
    {
      question: 'Can I get personalized product recommendations?',
      answer: 'Absolutely! Our expert team can provide personalized product recommendations based on your skill level, preferences, and goals. Contact us via email or phone for a consultation.'
    },
    {
      question: 'Do you offer bulk discounts for salons?',
      answer: 'Yes, we offer wholesale pricing for salons, schools, and bulk orders. Contact our business team at shopblomcosmetics@gmail.com for pricing information and to set up a wholesale account.'
    }
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachedFiles(prev => [...prev, ...files]);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    setAttachedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const scrollToContactForm = () => {
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
      contactForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Form submission is now handled by the script, but we keep this for validation
  const handleSubmit = () => {
    // Let the script handle the submission
    // This function is kept for any React-specific validation if needed
  };


  // Add the Cloudinary script and listen for success
  useEffect(() => {
    // Add the script to handle form submission
    const script = document.createElement('script');
    script.textContent = `
      const CLOUD_NAME = "dd89enrjz";
      const UPLOAD_PRESET = "blom_unsigned";
      const CONTACT_INTAKE_URL = "https://blom-admin-1.netlify.app/.netlify/functions/contact-intake";

      // --- upload one file to Cloudinary (unsigned) ---
      async function uploadToCloudinary(file){
        console.log('Uploading file:', file.name);
        if (file.size > 10 * 1024 * 1024) throw new Error(\`"\${file.name}" is over 10MB\`);

        const fd = new FormData();
        fd.append("file", file);
        fd.append("upload_preset", UPLOAD_PRESET);
        fd.append("folder", "blom/enquiries");

        const res = await fetch(\`https://api.cloudinary.com/v1_1/\${CLOUD_NAME}/auto/upload\`, {
          method: "POST",
          body: fd
        });
        const j = await res.json();
        console.log('Cloudinary response:', j);
        if (!res.ok || j.error) throw new Error(j.error?.message || "Upload failed");
        return j.secure_url;
      }

      // --- build payload and send to contact-intake ---
      async function submitContactForm(e){
        e.preventDefault();
        console.log('Form submitted, starting Cloudinary upload...');
        const form = e.target;

        // collect fields
        const fd = new FormData(form);
        const qs = new URLSearchParams(location.search);

        // Get product_slug and order_id from URL params or form if available
        const product_slug = qs.get("product_slug") || fd.get("product_slug")?.toString() || null;
        const order_id = qs.get("order_id") || fd.get("order_id")?.toString() || null;

        // Build name from full_name
        const fullName = fd.get("full_name")?.toString().trim() || "";
        const name = fullName || fd.get("name")?.toString().trim() || "";

        // Upload files first → gather Cloudinary URLs
        const fileInput = document.getElementById("attachments");
        const cloudinaryUrls = [];
        if (fileInput && fileInput.files?.length) {
          console.log('Files to upload:', fileInput.files.length);
          for (const f of fileInput.files) {
            try {
              const url = await uploadToCloudinary(f);
              cloudinaryUrls.push(url);
            } catch (err) {
              console.error('Failed to upload file:', f.name, err);
              // Continue with other files
            }
          }
        }

        const payload = {
          name: name,
          email: fd.get("email")?.toString().trim().toLowerCase() || "",
          phone: fd.get("phone")?.toString().trim() || "",
          subject: fd.get("subject")?.toString().trim() || "",
          message: fd.get("message")?.toString().trim() || "",
          product_slug: product_slug,
          order_id: order_id,
          source: "website",
          images: cloudinaryUrls, // Array of Cloudinary secure URLs
          meta: {
            userAgent: navigator.userAgent,
            inquiry_type: fd.get("inquiry_type")?.toString() || "",
            page_url: location.href,
            referrer: document.referrer || "",
            utm_source: qs.get("utm_source") || "",
            utm_medium: qs.get("utm_medium") || "",
            utm_campaign: qs.get("utm_campaign") || "",
            utm_term: qs.get("utm_term") || "",
            utm_content: qs.get("utm_content") || "",
          }
        };

        console.log('Final payload:', payload);

        // UX lock
        const btn = form.querySelector('[type="submit"]');
        const txt = btn.textContent;
        btn.disabled = true; btn.textContent = "Sending…";

        try {
          console.log('Sending to contact-intake:', CONTACT_INTAKE_URL);
          const r = await fetch(CONTACT_INTAKE_URL, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(payload)
          });
          console.log('Contact intake response:', r.status, r.statusText);
          
          const responseText = await r.text();
          console.log('Response body:', responseText);
          
          if (!r.ok) {
            let errorMessage = 'Failed to send message';
            try {
              const errorData = JSON.parse(responseText);
              errorMessage = errorData.error || errorData.message || errorMessage;
            } catch {
              errorMessage = responseText || errorMessage;
            }
            throw new Error(errorMessage);
          }
          
          // Show success modal
          console.log('Success! Showing modal...');
          window.showSuccessModal = true;
          form.reset();
        } catch (err) {
          console.error('Submission error:', err);
          alert("Couldn't send right now — please try again. Error: " + (err.message || err));
        } finally {
          btn.disabled = false; btn.textContent = txt;
        }
      }

      // Override the form submission
      const form = document.getElementById("contact-form");
      if (form) {
        console.log('Adding submit listener to form');
        form.addEventListener("submit", submitContactForm);
      } else {
        console.error('Form not found!');
      }
    `;
    
    document.head.appendChild(script);

    // Listen for success signal from the script
    const checkSuccess = () => {
      if (window.showSuccessModal) {
        setShowSuccessModal(true);
        window.showSuccessModal = false;
        // Reset form state
        setFormData({
          name: '',
          email: '',
          phone: '',
          countryCode: '+27',
          subject: '',
          message: '',
          inquiryType: 'general'
        });
        setAttachedFiles([]);
        setValidationErrors({});
        setAgreedToTerms(false);
      }
    };

    const interval = setInterval(checkSuccess, 100);
    
    return () => {
      clearInterval(interval);
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  const toggleFaq = (index: number) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header showMobileMenu={true} />

      <main className="flex-1">
        <StockistLocator />

        {/* Contact Hero Section - Original Design */}
        <section className="bg-gradient-to-r from-pink-50 to-blue-50 section-padding">
          <Container>
            <div className="text-center max-w-4xl mx-auto">
              <h1 className="heading-with-stripe">We're Here to Help</h1>
              <p className="text-xl text-gray-600 leading-relaxed">
                Questions about orders, products, or courses? Message us on WhatsApp for the fastest reply, or use the form below.
              </p>
            </div>
          </Container>
        </section>

        {/* Contact Form Section */}
        <section id="contact-form" className="section-padding bg-gray-50">
          <Container>
            <div className="max-w-2xl mx-auto">
              {/* Contact Form */}
              <div>
                <Card className="shadow-lg border-0">
                  <CardContent className="pt-10 pb-8 px-8">
                    {/* Form Header */}
                    <div className="text-center mb-8">
                      <h2 className="text-3xl font-bold text-gray-900 mb-3">Send us a Message</h2>
                      <p className="text-gray-600">
                        Fill out the form below and we'll get back to you within 1 business day.
                      </p>
                    </div>
                    
                    <form id="contact-form" onSubmit={handleSubmit} className="space-y-8">
                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <label htmlFor="name" className="block text-sm font-semibold text-gray-800 mb-2">
                            Full Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            id="name"
                            name="full_name"
                            value={formData.name}
                            onChange={(e) => {
                              setFormData(prev => ({ ...prev, name: e.target.value }));
                              if (validationErrors.name) {
                                setValidationErrors(prev => ({ ...prev, name: '' }));
                              }
                            }}
                            required
                            className="input-field focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all"
                            placeholder="Enter your full name"
                          />
                        </div>
                        <div>
                          <label htmlFor="email" className="block text-sm font-semibold text-gray-800 mb-2">
                            Email Address <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="email"
                            id="email"
                            name="email"
                            value={formData.email}
                            onChange={(e) => {
                              setFormData(prev => ({ ...prev, email: e.target.value }));
                              if (validationErrors.email) {
                                setValidationErrors(prev => ({ ...prev, email: '' }));
                              }
                            }}
                            required
                            className={`input-field focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all ${
                              validationErrors.email ? 'border-red-500' : ''
                            }`}
                            placeholder="your.email@example.com"
                          />
                          {validationErrors.email && (
                            <p className="text-red-500 text-sm mt-1">{validationErrors.email}</p>
                          )}
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <label htmlFor="phone" className="block text-sm font-semibold text-gray-800 mb-2">
                            Phone Number
                          </label>
                          <div className="flex gap-2">
                            <select
                              name="countryCode"
                              value={formData.countryCode}
                              onChange={(e) => {
                                setFormData(prev => ({ ...prev, countryCode: e.target.value }));
                              }}
                              className="input-field focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all w-32 flex-shrink-0"
                            >
                              {countryCodes.map((country) => (
                                <option key={country.code} value={country.code}>
                                  {country.flag} {country.code}
                                </option>
                              ))}
                            </select>
                            <input
                              type="tel"
                              id="phone"
                              name="phone"
                              value={formData.phone}
                              onChange={(e) => {
                                setFormData(prev => ({ ...prev, phone: e.target.value }));
                                if (validationErrors.phone) {
                                  setValidationErrors(prev => ({ ...prev, phone: '' }));
                                }
                              }}
                              className={`input-field focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all flex-1 ${
                                validationErrors.phone ? 'border-red-500' : ''
                              }`}
                              placeholder="XX XXX XXXX"
                            />
                          </div>
                          {validationErrors.phone && (
                            <p className="text-red-500 text-sm mt-1">{validationErrors.phone}</p>
                          )}
                        </div>
                        <div>
                          <label htmlFor="inquiryType" className="block text-sm font-semibold text-gray-800 mb-2">
                            Inquiry Type <span className="text-red-500">*</span>
                          </label>
                          <select
                            id="inquiryType"
                            name="inquiry_type"
                            value={formData.inquiryType}
                            onChange={(e) => {
                              setFormData(prev => ({ ...prev, inquiryType: e.target.value }));
                            }}
                            required
                            className="input-field focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all"
                          >
                            {inquiryTypes.map((type) => (
                              <option key={type.value} value={type.value}>
                                {type.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label htmlFor="subject" className="block text-sm font-semibold text-gray-800 mb-2">
                          Subject <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          id="subject"
                          name="subject"
                          value={formData.subject}
                          onChange={(e) => {
                            setFormData(prev => ({ ...prev, subject: e.target.value }));
                          }}
                          required
                          className="input-field focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all"
                          placeholder="Brief description of your inquiry"
                        />
                      </div>

                      <div>
                        <label htmlFor="message" className="block text-sm font-semibold text-gray-800 mb-2">
                          Message <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          id="message"
                          name="message"
                          value={formData.message}
                          onChange={(e) => {
                            setFormData(prev => ({ ...prev, message: e.target.value }));
                          }}
                          required
                          rows={6}
                          className="input-field resize-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all"
                          placeholder="Please provide detailed information about your inquiry. The more specific you are, the better we can assist you."
                        />
                      </div>

                      {/* File Attachment Section */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-3">
                          Attachments <span className="text-gray-500">(Optional)</span>
                        </label>
                        <div 
                          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                            dragActive 
                              ? 'border-pink-400 bg-pink-50' 
                              : 'border-gray-300 hover:border-gray-400'
                          }`}
                          onDragEnter={handleDrag}
                          onDragLeave={handleDrag}
                          onDragOver={handleDrag}
                          onDrop={handleDrop}
                        >
                          <Upload className="h-8 w-8 text-gray-400 mx-auto mb-3" />
                          <p className="text-gray-600 mb-2">
                            Drag and drop files here, or 
                            <label className="text-pink-500 hover:text-pink-600 cursor-pointer ml-1">
                              browse
                              <input
                                id="attachments"
                                name="attachments"
                                type="file"
                                multiple
                                onChange={handleFileUpload}
                                className="hidden"
                                accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif"
                              />
                            </label>
                          </p>
                          <p className="text-xs text-gray-500">
                            Supported formats: PDF, DOC, DOCX, TXT, JPG, PNG, GIF (Max 10MB per file)
                          </p>
                        </div>

                        {/* Attached Files List */}
                        {attachedFiles.length > 0 && (
                          <div className="mt-4 space-y-2">
                            <p className="text-sm font-medium text-gray-700">Attached Files:</p>
                            {attachedFiles.map((file, index) => (
                              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                  <FileText className="h-4 w-4 text-gray-500" />
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">{file.name}</p>
                                    <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeFile(index)}
                                  className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Terms and Conditions Checkbox */}
                      <div className="flex items-start gap-3">
                        <div className="flex items-center h-5">
                            <input
                              id="terms"
                              name="agree_terms"
                              type="checkbox"
                              checked={agreedToTerms}
                              onChange={(e) => {
                                setAgreedToTerms(e.target.checked);
                                if (validationErrors.terms) {
                                  setValidationErrors(prev => ({
                                    ...prev,
                                    terms: ''
                                  }));
                                }
                              }}
                              className={`w-4 h-4 rounded-md border-2 focus:ring-2 focus:ring-primary-pink transition-colors ${
                                agreedToTerms 
                                  ? 'bg-primary-pink border-primary-pink text-white' 
                                  : 'border-gray-300 hover:border-primary-pink'
                              } ${validationErrors.terms ? 'border-red-500' : ''}`}
                              style={{
                                accentColor: '#FF74A4'
                              }}
                            />
                        </div>
                        <div className="text-sm">
                          <label htmlFor="terms" className="text-gray-700 cursor-pointer">
                            I agree to the{' '}
                            <a href="/terms" className="text-primary-pink hover:text-pink-600 underline">
                              Terms & Conditions
                            </a>
                            {' '}and{' '}
                            <a href="/privacy" className="text-primary-pink hover:text-pink-600 underline">
                              Privacy Policy
                            </a>
                            {' '}<span className="text-red-500">*</span>
                          </label>
                          {validationErrors.terms && (
                            <p className="text-red-500 text-sm mt-1">{validationErrors.terms}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-center">
                        <Button 
                          type="submit" 
                          size="lg" 
                          className="px-8 py-3 flex items-center gap-2 shadow-lg hover:shadow-xl transition-shadow"
                          loading={isSubmitting}
                        >
                          <Send className="h-4 w-4" />
                          {isSubmitting ? 'Sending Message...' : 'Send Message'}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </div>


            </div>
          </Container>
        </section>

        <section className="section-padding bg-gray-50">
          <Container>
            <div className="grid md:grid-cols-3 gap-8">
              {/* WhatsApp Card */}
              <Card className="text-center p-8 hover:shadow-lg transition-shadow">
                <div className="w-16 h-16 bg-pink-400 rounded-full flex items-center justify-center mx-auto mb-6">
                  <MessageCircle className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">WhatsApp</h3>
                <p className="text-gray-600 mb-6">Fastest reply - usually within minutes</p>
                <a 
                  href="https://wa.me/27795483317" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-pink-500 to-pink-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-pink-600 hover:to-pink-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  CHAT NOW
                </a>
              </Card>

              {/* Email Card */}
              <Card className="text-center p-8 hover:shadow-lg transition-shadow">
                <div className="w-16 h-16 bg-pink-400 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Mail className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">Email</h3>
                <p className="text-gray-600 mb-6">We reply within 1 business day</p>
                <ClickableContact 
                  type="email" 
                  value="shopblomcosmetics@gmail.com"
                  className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-pink-500 to-pink-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-pink-600 hover:to-pink-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  SEND EMAIL
                </ClickableContact>
              </Card>

              {/* Phone Card */}
              <Card className="text-center p-8 hover:shadow-lg transition-shadow">
                <div className="w-16 h-16 bg-pink-400 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Phone className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">Phone</h3>
                <p className="text-gray-600 mb-6">Mon-Fri 08:00-17:00, Sat 09:00-14:00</p>
                <ClickableContact 
                  type="phone" 
                  value="+27 79 548 3317"
                  className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-pink-500 to-pink-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-pink-600 hover:to-pink-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  CALL NOW
                </ClickableContact>
              </Card>
            </div>
          </Container>
        </section>

        {/* Quick Help Section - Original Design */}
        <section className="section-padding bg-gradient-to-r from-pink-50 to-blue-50">
          <Container>
            <div className="text-center mb-12">
              <h2 className="heading-with-stripe">Quick Help</h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Find answers to common questions and access helpful resources quickly.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {/* Shipping & Delivery Card */}
              <Card className="text-center p-8 hover:shadow-lg transition-shadow">
                <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Truck className="w-8 h-8 text-amber-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Shipping & Delivery</h3>
                <p className="text-gray-600 mb-6">Track your order and delivery options</p>
                <a 
                  href="/shipping" 
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-pink-500 to-pink-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-pink-600 hover:to-pink-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  Learn More
                </a>
              </Card>

              {/* Returns & Refunds Card */}
              <Card className="text-center p-8 hover:shadow-lg transition-shadow">
                <div className="w-16 h-16 bg-blue-400 rounded-full flex items-center justify-center mx-auto mb-6 text-white">
                  <RotateCcw className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Returns & Refunds</h3>
                <p className="text-gray-600 mb-6">Easy returns within 30 days</p>
                <a 
                  href="/returns" 
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-pink-500 to-pink-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-pink-600 hover:to-pink-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  Learn More
                </a>
              </Card>

              {/* FAQs Card */}
              <Card className="text-center p-8 hover:shadow-lg transition-shadow">
                <div className="w-16 h-16 bg-pink-400 rounded-full flex items-center justify-center mx-auto mb-6 text-white">
                  <HelpCircle className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">FAQs</h3>
                <p className="text-gray-600 mb-6">Find answers to common questions</p>
                <a 
                  href="#faq" 
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-pink-500 to-pink-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-pink-600 hover:to-pink-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  Learn More
                </a>
              </Card>
            </div>
          </Container>
        </section>

        {/* FAQ Section - Original Design */}
        <section className="section-padding bg-blue-50">
          <Container>
            <div className="text-center mb-12">
              <h2 className="heading-with-stripe">FREQUENTLY ASKED QUESTIONS</h2>
            </div>

            <div className="max-w-4xl mx-auto">
              <div className="space-y-4 mb-8">
                {faqs.slice(0, showAllFaqs ? faqs.length : 4).map((faq, index) => (
                  <Card key={index} className="bg-white shadow-sm border-0 rounded-lg overflow-hidden">
                    <button
                      onClick={() => toggleFaq(index)}
                      className="w-full p-6 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                    >
                      <h3 className="font-semibold text-lg text-gray-900">{faq.question}</h3>
                      <div className="w-8 h-8 bg-blue-400 rounded-full flex items-center justify-center flex-shrink-0 text-white">
                        {expandedFaq === index ? (
                          <ChevronUp className="h-4 w-4 text-white" />
                        ) : (
                          <span className="text-white font-bold text-lg">+</span>
                        )}
                      </div>
                    </button>
                    {expandedFaq === index && (
                      <div className="px-6 pb-6">
                        <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
                      </div>
                    )}
                  </Card>
                ))}
              </div>

              {/* FAQ Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                {!showAllFaqs ? (
                  <Button
                    onClick={() => setShowAllFaqs(true)}
                    className="btn btn-secondary flex items-center gap-2"
                  >
                    <ChevronDown className="h-4 w-4" />
                    Read More
                  </Button>
                ) : (
                  <Button
                    onClick={() => setShowAllFaqs(false)}
                    className="btn btn-secondary flex items-center gap-2"
                  >
                    <ChevronUp className="h-4 w-4" />
                    Show Less
                  </Button>
                )}
                <Button
                  onClick={scrollToContactForm}
                  className="btn btn-primary flex items-center gap-2"
                >
                  <MessageCircle className="h-4 w-4" />
                  Ask Your Own Question
                </Button>
              </div>
            </div>
          </Container>
        </section>

      </main>

      <Footer />

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 transform transition-all">
            <div className="p-8 text-center">
              {/* Success Icon */}
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              
              {/* Success Message */}
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Thank You!</h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Thank you for submitting your message. One of our team members will contact you shortly.
              </p>
              
              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={() => setShowSuccessModal(false)}
                  className="flex-1 bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    setShowSuccessModal(false);
                    window.location.href = '/shop';
                  }}
                  variant="outline"
                  className="flex-1 border-pink-300 text-pink-600 hover:bg-pink-50 px-6 py-3 rounded-lg font-semibold transition-all duration-200"
                >
                  Continue Shopping
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
