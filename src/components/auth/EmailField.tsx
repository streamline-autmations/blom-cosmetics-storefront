import React from 'react';
import { Mail } from 'lucide-react';
import { suggestEmailFix } from '../../lib/emailTypo';

interface EmailFieldProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
}

/** Email input with a "Did you mean …?" hint for common domain typos. */
export const EmailField: React.FC<EmailFieldProps> = ({ id, value, onChange, autoFocus }) => {
  const suggestion = value.includes('@') ? suggestEmailFix(value) : null;
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-2">
        Email address
      </label>
      <div className="relative">
        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" aria-hidden="true" />
        <input
          type="email"
          id={id}
          name="email"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          autoFocus={autoFocus}
          className="input-field pl-12"
          placeholder="your@email.com"
          autoComplete="email"
          inputMode="email"
          aria-describedby={suggestion ? `${id}-hint` : undefined}
        />
      </div>
      {suggestion && (
        <p id={`${id}-hint`} className="mt-2 text-sm text-gray-700" aria-live="polite">
          Did you mean <strong>{suggestion}</strong>?{' '}
          <button
            type="button"
            onClick={() => onChange(suggestion)}
            className="text-pink-700 hover:text-pink-800 font-medium underline"
          >
            Yes, fix it
          </button>
        </p>
      )}
    </div>
  );
};
