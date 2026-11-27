import React, { useState, useEffect } from 'react';
import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';
import { Container } from '../components/layout/Container';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { supabase } from '../lib/supabase';
import { safeRedirect } from '../lib/authRedirect';
import { EmailCodeLogin } from '../components/auth/EmailCodeLogin';
import { EmailField } from '../components/auth/EmailField';
import { Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';

type Mode = 'code' | 'password' | 'forgot';

export const LoginPage: React.FC = () => {
  const params = new URLSearchParams(window.location.search);
  const redirectPath = safeRedirect(params.get('redirect'));
  const signupHref = `/signup?redirect=${encodeURIComponent(redirectPath)}`;

  const [mode, setMode] = useState<Mode>(params.get('mode') === 'password' ? 'password' : 'code');
  const [email, setEmail] = useState(params.get('email') || '');
  const [autoSend, setAutoSend] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [problem, setProblem] = useState<null | 'wrong' | 'unconfirmed' | { message: string }>(null);

  useEffect(() => {
    document.title = 'Log In – BLOM Cosmetics';
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Log in to your BLOM Cosmetics account to view orders and manage your profile.');
    }
    window.scrollTo({ top: 0 });
  }, []);

  // Already signed in (e.g. came back from an email link): skip the form.
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) window.location.href = redirectPath;
    });
  }, [redirectPath]);

  const switchToCode = (next: Mode, send: boolean) => {
    setProblem(null);
    setAutoSend(send);
    setMode(next);
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setProblem(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setIsSubmitting(false);
      if (error.code === 'invalid_credentials') setProblem('wrong');
      else if (error.code === 'email_not_confirmed') setProblem('unconfirmed');
      else setProblem({ message: error.message });
      return;
    }
    window.location.href = redirectPath;
  };

  const emailLooksValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  return (
    <div className="min-h-screen bg-gray-50">
      <Header showMobileMenu={true} />

      <main className="section-padding">
        <Container>
          <div className="max-w-md mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold mb-4">
                {mode === 'forgot' ? 'Forgot your password?' : 'Welcome Back'}
              </h1>
              <p className="text-xl text-gray-600">
                {mode === 'forgot'
                  ? "No problem. We'll email you a code to log in, then you can pick a new password."
                  : 'Log in to manage your orders and account'}
              </p>
            </div>

            <Card>
              <CardHeader>
                <h2 className="text-2xl font-bold text-center">Log In</h2>
              </CardHeader>
              <CardContent>

                {mode === 'password' ? (
                  <form onSubmit={handlePasswordLogin} className="space-y-6 mt-4">
                    <EmailField id="loginEmail" value={email} onChange={(v) => { setEmail(v); setProblem(null); }} />

                    <div>
                      <label htmlFor="loginPassword" className="block text-sm font-medium text-gray-700 mb-2">
                        Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" aria-hidden="true" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          id="loginPassword"
                          name="password"
                          value={password}
                          onChange={(e) => { setPassword(e.target.value); setProblem(null); }}
                          required
                          className="input-field pl-12 pr-12"
                          placeholder="Enter your password"
                          autoComplete="current-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
                          aria-pressed={showPassword}
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <EyeOff className="h-5 w-5 text-gray-400" /> : <Eye className="h-5 w-5 text-gray-400" />}
                        </button>
                      </div>
                      <div className="mt-2 text-right">
                        <button
                          type="button"
                          onClick={() => switchToCode('forgot', emailLooksValid)}
                          className="text-sm text-pink-700 hover:text-pink-800 font-medium"
                        >
                          Forgot password?
                        </button>
                      </div>
                    </div>

                    {problem && (
                      <div className="p-4 rounded-lg bg-red-50 text-red-700 border border-red-200 space-y-3" role="alert">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
                          <span>
                            {problem === 'wrong'
                              ? "That email and password don't match. If you've forgotten your password, or you've only ever checked out as a guest, log in with an email code instead."
                              : problem === 'unconfirmed'
                                ? "Your email isn't confirmed yet. We'll email you a code: entering it confirms your email and logs you in."
                                : problem.message}
                          </span>
                        </div>
                        {problem !== 'wrong' && problem !== 'unconfirmed' ? null : (
                          <Button type="button" variant="outline" className="w-full" onClick={() => switchToCode('code', true)}>
                            Email me a login code
                          </Button>
                        )}
                      </div>
                    )}

                    <Button
                      type="submit"
                      className="w-full"
                      size="lg"
                      disabled={!emailLooksValid || !password || isSubmitting}
                      loading={isSubmitting}
                    >
                      {isSubmitting ? 'Logging in…' : 'Log in'}
                    </Button>

                    <p className="text-center text-sm">
                      <button
                        type="button"
                        onClick={() => switchToCode('code', false)}
                        className="text-pink-700 hover:text-pink-800 font-medium"
                      >
                        Log in with an email code instead
                      </button>
                    </p>
                  </form>
                ) : (
                  <div className="mt-4 space-y-6">
                    <EmailCodeLogin
                      // Remount so a mode switch can auto-send with the email typed so far.
                      key={`${mode}-${autoSend}`}
                      redirectPath={mode === 'forgot'
                        ? `/account/reset-password?next=${encodeURIComponent(redirectPath)}`
                        : redirectPath}
                      initialEmail={email}
                      onEmailChange={setEmail}
                      autoSend={autoSend}
                      sendLabel={mode === 'forgot' ? 'Email me a code' : 'Email me a login code'}
                    />
                    <p className="text-center text-sm">
                      <button
                        type="button"
                        onClick={() => { setProblem(null); setMode('password'); }}
                        className="text-pink-700 hover:text-pink-800 font-medium"
                      >
                        {mode === 'forgot' ? 'Back to password log in' : 'Log in with my password instead'}
                      </button>
                    </p>
                  </div>
                )}

                <div className="mt-6 text-center">
                  <p className="text-gray-600">
                    Don't have an account?{' '}
                    <a href={signupHref} className="text-pink-700 hover:text-pink-800 font-medium transition-colors">
                      Create account
                    </a>
                  </p>
                </div>

                <div className="mt-6 text-center">
                  <p className="text-xs text-gray-500">
                    By continuing, you agree to our{' '}
                    <a href="/terms" className="text-pink-700 hover:text-pink-800 transition-colors">Terms</a>{' '}
                    and acknowledge our{' '}
                    <a href="/privacy" className="text-pink-700 hover:text-pink-800 transition-colors">Privacy Policy</a>.
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
