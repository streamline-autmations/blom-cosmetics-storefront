import React, { useEffect, useRef, useState } from 'react';
import type { AuthError, User } from '@supabase/supabase-js';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { EmailField } from './EmailField';

const RESEND_SECONDS = 60;

// Last successful send per address, kept across remounts (mode switches) so we never re-send
// inside the cooldown: each send replaces the code and breaks the link in the previous email.
const lastSentAt = new Map<string, number>();
const secondsLeft = (address: string) =>
  Math.max(0, Math.ceil(((lastSentAt.get(address) ?? 0) + RESEND_SECONDS * 1000 - Date.now()) / 1000));

interface EmailCodeLoginProps {
  /** Same-site path to open once signed in. */
  redirectPath: string;
  initialEmail?: string;
  /** Saved on the account when this email is new (name, phone). */
  signupData?: Record<string, string>;
  sendLabel?: string;
  /** When set, the send button is disabled and this is shown (e.g. terms not ticked). */
  blockedReason?: string | null;
  /** Send the code straight away (used when switching over from a failed password login). */
  autoSend?: boolean;
  /** Runs after the code is accepted, before the redirect. */
  onSignedIn?: (user: User) => Promise<void> | void;
  /** Lets a parent mirror the email (e.g. sign-up page). */
  onEmailChange?: (email: string) => void;
  /** Extra inputs shown under the email field on the first step (sign-up page). */
  children?: React.ReactNode;
}

function friendlyError(error: AuthError): string {
  switch (error.code) {
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return 'We just sent you a code. Please wait a minute, then try again.';
    case 'otp_expired':
      return 'That code is wrong or has expired. Use the code from the newest email, or send a new one.';
    case 'email_address_invalid':
      return "That email address doesn't look right. Please check it.";
    case 'validation_failed':
      return 'Please check your email address.';
  }
  if (/security purposes/i.test(error.message)) {
    return 'We just sent you a code. Please wait a minute, then try again.';
  }
  return error.message || 'Something went wrong. Please try again.';
}

/**
 * Passwordless login: email -> 6-digit code -> signed in.
 * Creates the account if the email is new, so it also covers sign-up and "forgot password".
 * Typing the code works in any browser; the email's button only works in the browser that asked.
 */
export const EmailCodeLogin: React.FC<EmailCodeLoginProps> = ({
  redirectPath,
  initialEmail = '',
  signupData,
  sendLabel = 'Email me a login code',
  blockedReason,
  autoSend,
  onSignedIn,
  onEmailChange,
  children,
}) => {
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState('');
  /** The address the code actually went to; verify against this, not the (editable) input. */
  const [sentTo, setSentTo] = useState('');
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [status, setStatus] = useState<{ type: 'error' | 'success'; message: string } | null>(null);
  const autoSent = useRef(false);
  const codeInput = useRef<HTMLInputElement>(null);
  const cameBack = useRef(false);

  const cleanEmail = email.trim().toLowerCase();
  const emailLooksValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  useEffect(() => {
    if (step === 'code') codeInput.current?.focus();
  }, [step]);

  const updateEmail = (value: string) => {
    setEmail(value);
    onEmailChange?.(value);
    if (status) setStatus(null);
  };

  /** Sends a code to `target` (the typed email, or the original address on resend). */
  const sendCode = async (target: string) => {
    if (busy || blockedReason || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target)) return;
    setSentTo(target);
    const wait = secondsLeft(target);
    if (wait > 0) {
      setStep('code');
      setCooldown(wait);
      setStatus({ type: 'success', message: `We already sent a code to ${target}. Check your inbox.` });
      return;
    }
    setBusy(true);
    setStatus(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: target,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}${redirectPath}`,
        data: signupData,
      },
    });
    setBusy(false);
    if (error) {
      setStatus({ type: 'error', message: friendlyError(error) });
      return;
    }
    lastSentAt.set(target, Date.now());
    setStep('code');
    setCode('');
    setCooldown(RESEND_SECONDS);
    setStatus({ type: 'success', message: `We sent a code to ${target}.` });
  };

  useEffect(() => {
    if (autoSend && !autoSent.current && emailLooksValid) {
      autoSent.current = true;
      void sendCode(cleanEmail);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSend]);

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = code.replace(/\D/g, '');
    if (token.length < 6 || busy) return;
    setBusy(true);
    setStatus(null);
    const { data, error } = await supabase.auth.verifyOtp({ email: sentTo, token, type: 'email' });
    if (error || !data.user) {
      setBusy(false);
      setStatus({ type: 'error', message: error ? friendlyError(error) : 'Please try again.' });
      return;
    }
    try {
      await onSignedIn?.(data.user);
    } catch (err) {
      // Never strand a signed-in customer on this screen because a profile save failed.
      console.warn('Post sign-in step failed:', err);
    }
    setStatus({ type: 'success', message: "You're in! Taking you there now…" });
    window.location.href = redirectPath;
  };

  const statusBox = status && (
    <div
      className={`p-4 rounded-lg flex items-start gap-2 ${
        status.type === 'error'
          ? 'bg-red-50 text-red-700 border border-red-200'
          : 'bg-green-50 text-green-800 border border-green-200'
      }`}
      role={status.type === 'error' ? 'alert' : 'status'}
    >
      {status.type === 'error' ? (
        <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
      ) : (
        <CheckCircle className="h-5 w-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
      )}
      <span className="min-w-0 break-words">{status.message}</span>
    </div>
  );

  if (step === 'email') {
    return (
      <form
        onSubmit={(e) => { e.preventDefault(); void sendCode(cleanEmail); }}
        className="space-y-5"
        noValidate
      >
        <EmailField id="codeLoginEmail" value={email} onChange={updateEmail} autoFocus={cameBack.current} />
        {children}
        {statusBox}
        <Button
          type="submit"
          className="w-full"
          size="lg"
          disabled={!emailLooksValid || busy || !!blockedReason}
          loading={busy}
        >
          {busy ? 'Sending…' : sendLabel}
        </Button>
        {blockedReason && emailLooksValid && (
          <p className="text-sm text-gray-600 text-center">{blockedReason}</p>
        )}
        <p className="text-sm text-gray-600 text-center">
          No password needed. We'll email you a code to log in.
        </p>
      </form>
    );
  }

  return (
    <form onSubmit={verifyCode} className="space-y-5">
      {statusBox}
      <div>
        <label htmlFor="codeLoginCode" className="block text-sm font-medium text-gray-700 mb-2">
          Enter the code from the email
        </label>
        <input
          ref={codeInput}
          id="codeLoginCode"
          name="code"
          value={code}
          onChange={(e) => { setCode(e.target.value.replace(/\D/g, '').slice(0, 8)); if (status?.type === 'error') setStatus(null); }}
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={8}
          className="input-field text-center text-2xl tracking-[0.4em] font-semibold"
          placeholder="••••••"
          aria-describedby="codeLoginHelp"
        />
        <p id="codeLoginHelp" className="mt-2 text-sm text-gray-600">
          It can take a minute to arrive. Check your spam or promotions folder too.
          You can also just tap the button in the email.
        </p>
      </div>
      <Button
        type="submit"
        className="w-full"
        size="lg"
        disabled={code.length < 6 || busy}
        loading={busy}
      >
        {busy ? 'Checking…' : 'Log in'}
      </Button>
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <button
          type="button"
          onClick={() => void sendCode(sentTo)}
          disabled={cooldown > 0 || busy}
          className="text-pink-700 hover:text-pink-800 font-medium disabled:text-gray-500 disabled:cursor-not-allowed"
        >
          {cooldown > 0 ? `Send a new code in ${cooldown}s` : 'Send a new code'}
        </button>
        <button
          type="button"
          onClick={() => { cameBack.current = true; setStep('email'); setStatus(null); }}
          className="text-gray-700 hover:text-gray-900 underline"
        >
          Use a different email
        </button>
      </div>
    </form>
  );
};
