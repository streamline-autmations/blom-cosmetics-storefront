import React, { useState, useEffect } from 'react';
import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';
import { Container } from '../components/layout/Container';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { CheckCircle, AlertCircle, Loader } from 'lucide-react';

export const AuthCallbackPage: React.FC = () => {
  const [status, setStatus] = useState<{ type: 'loading' | 'success' | 'error'; message: string }>({ 
    type: 'loading', 
    message: 'Processing authentication...' 
  });

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const accessToken = urlParams.get('access_token');
        const refreshToken = urlParams.get('refresh_token');
        const error = urlParams.get('error');
        const errorDescription = urlParams.get('error_description');

        if (error) {
          setStatus({
            type: 'error',
            message: errorDescription || 'Authentication failed. Please try again.'
          });
          return;
        }

        if (accessToken && refreshToken) {
          // Store tokens in localStorage for Supabase client
          localStorage.setItem('supabase.auth.token', JSON.stringify({
            access_token: accessToken,
            refresh_token: refreshToken,
            expires_at: Date.now() + (3600 * 1000) // 1 hour from now
          }));

          setStatus({
            type: 'success',
            message: 'Authentication successful! Redirecting to your account...'
          });

          // Redirect to account page after 2 seconds
          setTimeout(() => {
            window.location.href = '/account';
          }, 2000);
        } else {
          setStatus({
            type: 'error',
            message: 'Invalid authentication response. Please try again.'
          });
        }
      } catch (error: any) {
        setStatus({
          type: 'error',
          message: error.message || 'An unexpected error occurred during authentication.'
        });
      }
    };

    handleAuthCallback();
  }, []);

  const getStatusIcon = () => {
    switch (status.type) {
      case 'loading':
        return <Loader className="h-12 w-12 text-blue-500 mx-auto mb-4 animate-spin" />;
      case 'success':
        return <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />;
      case 'error':
        return <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />;
      default:
        return null;
    }
  };

  const getStatusColor = () => {
    switch (status.type) {
      case 'loading':
        return 'text-blue-600';
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <Container className="py-12">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader className="text-center">
              <h1 className="text-2xl font-bold text-gray-900">Authentication</h1>
            </CardHeader>
            
            <CardContent className="text-center">
              {getStatusIcon()}
              
              <p className={`text-lg font-medium mb-4 ${getStatusColor()}`}>
                {status.message}
              </p>

              {status.type === 'error' && (
                <div className="space-y-3">
                  <Button 
                    onClick={() => window.location.href = '/login'}
                    className="w-full bg-pink-400 hover:bg-pink-500 text-white"
                  >
                    Back to Login
                  </Button>
                  <Button 
                    onClick={() => window.location.href = '/signup'}
                    variant="outline"
                    className="w-full"
                  >
                    Create Account
                  </Button>
                </div>
              )}

              {status.type === 'success' && (
                <div className="text-sm text-gray-500">
                  <p>You will be redirected automatically...</p>
                  <Button 
                    onClick={() => window.location.href = '/account'}
                    className="mt-4 bg-pink-400 hover:bg-pink-500 text-white"
                  >
                    Go to Account Now
                  </Button>
                </div>
              )}

              {status.type === 'loading' && (
                <div className="text-sm text-gray-500">
                  <p>Please wait while we process your authentication...</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </Container>
      
      <Footer />
    </div>
  );
};
