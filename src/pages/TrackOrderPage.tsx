import React from 'react';
import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';
import { Container } from '../components/layout/Container';
import { Clock } from 'lucide-react';

export const TrackOrderPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header showMobileMenu={true} />
      <main className="section-padding flex-1">
        <Container>
          <div className="max-w-md mx-auto py-12 text-center">
            <Clock className="h-16 w-16 text-pink-400 mx-auto mb-6" />
            <h1 className="text-3xl font-bold mb-4">Order Tracking</h1>
            <p className="text-gray-600 text-lg mb-2">Coming Soon</p>
            <p className="text-gray-500 mb-8">
              We're working on a better way to track your orders. Check back soon!
            </p>
            <a
              href="/shop"
              className="inline-block px-6 py-2 rounded-md bg-pink-400 text-white hover:bg-pink-500 transition"
            >
              Back to Shop
            </a>
          </div>
        </Container>
      </main>
      <Footer />
    </div>
  );
};


