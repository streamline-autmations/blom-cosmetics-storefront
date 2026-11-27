import React, { useState, useEffect } from 'react';
import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';
import { Container } from '../components/layout/Container';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { supabase } from '../lib/supabase';
import { safeRedirect } from '../lib/authRedirect';
import { EmailCodeLogin } from '../components/auth/EmailCodeLogin';
import { Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';

/**
 * Set a new password. Serves /auth/reset (old reset-email links) and /account/reset-password
 * (after logging in with an email code). Works off the signed-in session: the Supabase client
 * has already swapped the link's ?code= for a session by the time getSession() resolves.
 */
export const AuthResetPage: React.FC = () => {
  const params = new URLSearchParams(window.location.search);
  const nextPath = safeRedirect(params.get('next'));
  const [phase, setPhase] = useState<'checking' | 'ready' | 'no-session'>('checking');
  const [accountEmail, setAccountEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    document.title = 'Set a New Password – BLOM Cosmetics';
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAccountEmail(session?.user.email ?? '');
      setPhase(session ? 'ready' : 'no-session');
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6 || isSubmitting) return;
    setIsSubmitting(true);
    setStatus(null);
    const { error } = await supabase.auth.updateUser({ password });
    if (error && error.code !== 'same_password') {
      setIsSubmitting(false);
      setStatus({
        type: 'error',
        message: error.code === 'weak_password'
          ? 'Please choose a longer password, with letters and numbers.'
          : error.message || 'Could not save your password. Please try again.',
      });
      return;
    }
    setStatus({ type: 'success', message: 'Password saved. Taking you to your account…' });
    setTimeout(() => { window.location.href = nextPath; }, 1200);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="section-padding">
        <Container>
          <div className="max-w-md mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold mb-4">
                {phase === 'no-session' ? 'Let’s get you back in' : 'Set a New Password'}
              </h1>
              <p className="text-xl text-gray-600">
                {phase === 'no-session'
                  ? 'This link has expired, or it opened in a different browser. Get a login code instead: it works anywhere.'
                  : "You're logged in. Pick a new password, or skip this and keep using email codes."}
              </p>
            </div>

            <Card>
              <CardHeader>
                <h2 className="text-2xl font-bold text-center">
                  {phase === 'no-session' ? 'Log In' : 'New Password'}
                </h2>
              </CardHeader>
              <CardContent>
                {phase === 'checking' && (
                  <p className="text-center text-gray-600" role="status">One moment…</p>
                )}

                {phase === 'no-session' && (
                  <EmailCodeLogin
                    redirectPath={`/account/reset-password?next=${encodeURIComponent(nextPath)}`}
                    sendLabel="Email me a code"
                  />
                )}

                {phase === 'ready' && (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Say whose password this is, in case the browser was already logged in as someone else. */}
                    <p className="text-sm text-gray-700 break-words">
                      Changing the password for <strong>{accountEmail}</strong>.{' '}
                      Not you?{' '}
                      <button
                        type="button"
                        onClick={async () => { await supabase.auth.signOut(); setPhase('no-session'); }}
                        className="text-pink-700 hover:text-pink-800 font-medium underline"
                      >
                        Log out
                      </button>
                    </p>
                    <div>
                      <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                        New password
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          id="password"
                          name="password"
                          value={password}
                          onChange={(e) => { setPassword(e.target.value); setStatus(null); }}
                          required
                          minLength={6}
                          autoComplete="new-password"
                          className="input-field pr-12"
                          placeholder="At least 6 characters"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700"
                          aria-pressed={showPassword}
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>

                    {status && (
                      <div
                        className={`p-4 rounded-lg flex items-start gap-2 ${
                          status.type === 'error'
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : 'bg-green-50 text-green-800 border border-green-200'
                        }`}
                        role={status.type === 'error' ? 'alert' : 'status'}
                      >
                        {status.type === 'error'
                          ? <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
                          : <CheckCircle className="h-5 w-5 flex-shrink-0 mt-0.5" aria-hidden="true" />}
                        <span className="min-w-0 break-words">{status.message}</span>
                      </div>
                    )}

                    <Button
                      type="submit"
                      className="w-full"
                      size="lg"
                      disabled={password.length < 6 || isSubmitting}
                      loading={isSubmitting}
                    >
                      {isSubmitting ? 'Saving…' : 'Save password'}
                    </Button>

                    <p className="text-center">
                      <a href={nextPath} className="text-sm text-gray-700 hover:text-gray-900 underline">
                        Skip for now
                      </a>
                    </p>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
        </Container>
      </main>

      <Footer />
    </div>
  );
};
