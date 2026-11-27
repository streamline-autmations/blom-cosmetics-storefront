import React, { useState, useEffect } from 'react';
import type { User } from '@supabase/supabase-js';
import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';
import { Container } from '../components/layout/Container';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { supabase } from '../lib/supabase';
import { safeRedirect } from '../lib/authRedirect';
import { EmailCodeLogin } from '../components/auth/EmailCodeLogin';

export const SignupPage: React.FC = () => {
  const params = new URLSearchParams(window.location.search);
  const redirectPath = safeRedirect(params.get('redirect'));
  const loginHref = `/login?redirect=${encodeURIComponent(redirectPath)}`;
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState(params.get('email') || '');
  const [agreeToTerms, setAgreeToTerms] = useState(false);

  useEffect(() => {
    document.title = 'Sign Up – BLOM Cosmetics';
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Create a BLOM Cosmetics account to shop faster, track orders, and manage your profile.');
    }
    window.scrollTo({ top: 0 });
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) window.location.href = redirectPath;
    });
  }, [redirectPath]);

  const signupData: Record<string, string> = {};
  if (name.trim()) signupData.name = name.trim();
  if (phone.trim()) signupData.phone = phone.trim();

  // Runs once the code is accepted. Existing customers who sign up again simply get logged in,
  // so only fill in fields they typed.
  const saveProfile = async (user: User) => {
    if (!signupData.name && !signupData.phone) return;
    await supabase.from('profiles').upsert({ id: user.id, email: user.email, ...signupData }, { onConflict: 'id' });
    await fetch('/.netlify/functions/contacts-intake', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: signupData.name || '',
        email: user.email,
        phone: signupData.phone || '',
        source: 'account_creation',
      }),
    }).catch(() => { /* marketing contact capture must never block sign-up */ });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header showMobileMenu={true} />

      <main className="section-padding">
        <Container>
          <div className="max-w-md mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold mb-4">Create Your Account</h1>
              <p className="text-xl text-gray-600">
                Join BLOM to shop faster and track your orders. No password to remember.
              </p>
            </div>

            <Card>
              <CardHeader>
                <h2 className="text-2xl font-bold text-center">Create Account</h2>
              </CardHeader>
              <CardContent>

                <div className="space-y-5 mt-4">
                  <div>
                    <label htmlFor="signupName" className="block text-sm font-medium text-gray-700 mb-2">
                      Full name
                    </label>
                    <input
                      type="text"
                      id="signupName"
                      name="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="input-field"
                      placeholder="e.g. Sarah Mitchell"
                      autoComplete="name"
                    />
                  </div>

                  <EmailCodeLogin
                    redirectPath={redirectPath}
                    initialEmail={email}
                    onEmailChange={setEmail}
                    signupData={signupData}
                    sendLabel="Create account"
                    blockedReason={agreeToTerms ? null : 'Please tick the box to agree to the Terms first.'}
                    onSignedIn={saveProfile}
                  >
                    <div>
                      <label htmlFor="signupPhone" className="block text-sm font-medium text-gray-700 mb-2">
                        Phone <span className="font-normal text-gray-500">(optional)</span>
                      </label>
                      <input
                        type="tel"
                        id="signupPhone"
                        name="phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="input-field"
                        placeholder="e.g. 082 123 4567"
                        autoComplete="tel"
                      />
                    </div>

                    <label className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        id="signupTerms"
                        name="agreeToTerms"
                        checked={agreeToTerms}
                        onChange={(e) => setAgreeToTerms(e.target.checked)}
                        className="mt-1 rounded border-gray-300 text-pink-400 focus:ring-pink-300"
                      />
                      <span className="text-sm text-gray-600">
                        I agree to the{' '}
                        <a href="/terms" className="text-pink-700 hover:text-pink-800 transition-colors">Terms of Service</a>{' '}
                        and{' '}
                        <a href="/privacy" className="text-pink-700 hover:text-pink-800 transition-colors">Privacy Policy</a>
                      </span>
                    </label>
                  </EmailCodeLogin>
                </div>

                <div className="mt-6 text-center">
                  <p className="text-gray-600">
                    Already have an account?{' '}
                    <a href={loginHref} className="text-pink-700 hover:text-pink-800 font-medium transition-colors">
                      Log in
                    </a>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </Container>
      </main>

      <Footer />
    </div>
  );
};
