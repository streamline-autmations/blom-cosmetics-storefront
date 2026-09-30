import React, { useState, useEffect } from 'react';
import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';
import { Container } from '../components/layout/Container';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { supabase } from '../lib/supabase';
import { Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';

export const AuthResetPage: React.FC = () => {
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });
  const [isValidToken, setIsValidToken] = useState(false);

  useEffect(() => {
    // Check if we have a valid password reset token in the URL
    const urlParams = new URLSearchParams(window.location.search);
    const accessToken = urlParams.get('access_token');
    const refreshToken = urlParams.get('refresh_token');
    
    if (accessToken && refreshToken) {
      setIsValidToken(true);
    } else {
      setStatus({ 
        type: 'error', 
        message: 'Invalid or expired password reset link. Please request a new password reset.' 
      });
    }
  }, []);

  const isFormValid = formData.password.length >= 6 && formData.password === formData.confirmPassword;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear status when user starts typing
    if (status.type) {
      setStatus({ type: null, message: '' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isFormValid || isSubmitting || !isValidToken) return;

    setIsSubmitting(true);
    setStatus({ type: null, message: '' });

    try {
      const { error } = await supabase.auth.updateUser({ password: formData.password });
      
      if (error) {
        setStatus({ 
          type: 'error', 
          message: error.message || 'Failed to update password. Please try again.' 
        });
        return;
      }

      setStatus({ 
        type: 'success', 
        message: 'Password updated successfully! Redirecting to your account...' 
      });
      
      // Redirect to account page after successful password update
      setTimeout(() => {
        window.location.href = '/account';
      }, 2000);
    } catch (error: any) {
      setStatus({ 
        type: 'error', 
        message: error.message || 'Failed to update password. Please try again.' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="section-padding">
        <Container>
          <div className="max-w-md mx-auto">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold mb-4">Reset Password</h1>
              <p className="text-xl text-gray-600">
                Enter your new password below
              </p>
            </div>

            {/* Reset Password Form */}
            <Card>
              <CardHeader>
                <h2 className="text-2xl font-bold text-center">Set New Password</h2>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Password Field */}
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                      New Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        id="password"
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        required
                        className="input-field pr-12"
                        placeholder="Enter new password"
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
                  </div>

                  {/* Confirm Password Field */}
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                      Confirm New Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        id="confirmPassword"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        required
                        className="input-field pr-12"
                        placeholder="Confirm new password"
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  {/* Password Match Indicator */}
                  {formData.confirmPassword && (
                    <div className={`text-sm flex items-center gap-2 ${
                      formData.password === formData.confirmPassword && formData.password.length >= 6
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}>
                      {formData.password === formData.confirmPassword && formData.password.length >= 6 ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <AlertCircle className="h-4 w-4" />
                      )}
                      {formData.password === formData.confirmPassword && formData.password.length >= 6
                        ? 'Passwords match'
                        : 'Passwords do not match'}
                    </div>
                  )}

                  {/* Status Message */}
                  {status.type && (
                    <div 
                      className={`p-4 rounded-lg flex items-center gap-2 ${
                        status.type === 'error' 
                          ? 'bg-red-50 text-red-700 border border-red-200' 
                          : 'bg-green-50 text-green-700 border border-green-200'
                      }`}
                    >
                      {status.type === 'error' ? (
                        <AlertCircle className="h-5 w-5 flex-shrink-0" />
                      ) : (
                        <CheckCircle className="h-5 w-5 flex-shrink-0" />
                      )}
                      <span>{status.message}</span>
                    </div>
                  )}

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    disabled={!isFormValid || isSubmitting || !isValidToken}
                    className="w-full bg-pink-400 hover:bg-pink-500 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Updating Password...
                      </div>
                    ) : (
                      'Update Password'
                    )}
                  </Button>
                </form>

                {/* Help Text */}
                <div className="mt-6 text-center">
                  <p className="text-sm text-gray-600">
                    Remember your password?{' '}
                    <a href="/login" className="text-pink-400 hover:text-pink-500 font-medium">
                      Sign in here
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
