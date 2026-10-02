import React, { useEffect, useState } from 'react';
import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';
import { Container } from '../components/layout/Container';
import { Button } from '../components/ui/Button';
import { MapPin, Plus, Trash2, Home } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { authService, AuthState } from '../lib/auth';
import { AddressAutocomplete } from '../components/checkout/AddressAutocomplete';

interface UserAddress {
  id: string;
  user_id: string;
  address_name: string | null;
  recipient_name: string | null;
  recipient_phone: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  is_default: boolean;
  created_at: string;
}

interface AddressFormData {
  address_name: string;
  recipient_name: string;
  recipient_phone: string;
  address_line_1: string;
  address_line_2: string;
  city: string;
  province: string;
  postal_code: string;
  is_default: boolean;
}

export default function ManageAddresses() {
  const [authState, setAuthState] = useState<AuthState>({ user: null, loading: true, error: null });
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState<AddressFormData>({
    address_name: '',
    recipient_name: '',
    recipient_phone: '',
    address_line_1: '',
    address_line_2: '',
    city: '',
    province: '',
    postal_code: '',
    is_default: false,
  });

  useEffect(() => {
    document.title = 'Saved Addresses - BLOM Cosmetics';
    const unsub = authService.subscribe((s) => setAuthState(s));
    return unsub;
  }, []);

  const fetchAddresses = async () => {
    if (!authState.user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('user_addresses')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setAddresses(data || []);
    } catch (err: any) {
      console.error('Error fetching addresses:', err);
      setError(err.message || 'Failed to load addresses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, [authState.user]);

  const handleAddressSelect = (suggestion: any) => {
    const { properties } = suggestion;
    setFormData((prev) => ({
      ...prev,
      address_line_1: properties.address_line1 || properties.street || '',
      address_line_2: properties.address_line2 || '',
      city: properties.city || '',
      province: properties.state || '',
      postal_code: properties.postcode || '',
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!authState.user) {
      setError('You must be logged in to save an address');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const { error: insertError } = await supabase.from('user_addresses').insert({
        user_id: authState.user.id,
        address_name: formData.address_name || null,
        recipient_name: formData.recipient_name || null,
        recipient_phone: formData.recipient_phone || null,
        address_line_1: formData.address_line_1 || null,
        address_line_2: formData.address_line_2 || null,
        city: formData.city || null,
        province: formData.province || null,
        postal_code: formData.postal_code || null,
        is_default: formData.is_default,
      });

      if (insertError) {
        throw insertError;
      }

      // Reset form and refresh addresses
      setFormData({
        address_name: '',
        recipient_name: '',
        recipient_phone: '',
        address_line_1: '',
        address_line_2: '',
        city: '',
        province: '',
        postal_code: '',
        is_default: false,
      });
      setShowAddForm(false);
      await fetchAddresses();
    } catch (err: any) {
      console.error('Error saving address:', err);
      setError(err.message || 'Failed to save address');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (addressId: string) => {
    if (!confirm('Are you sure you want to delete this address?')) {
      return;
    }

    try {
      const { error: deleteError } = await supabase
        .from('user_addresses')
        .delete()
        .eq('id', addressId);

      if (deleteError) {
        throw deleteError;
      }

      await fetchAddresses();
    } catch (err: any) {
      console.error('Error deleting address:', err);
      setError(err.message || 'Failed to delete address');
    }
  };

  if (authState.loading || loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header showMobileMenu={true} />
        <main className="section-padding">
          <Container>
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-400 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading your addresses…</p>
            </div>
          </Container>
        </main>
        <Footer />
      </div>
    );
  }

  if (!authState.user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header showMobileMenu={true} />
        <main className="section-padding">
          <Container>
            <div className="text-center py-16">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Please log in</h1>
              <p className="text-gray-600 mb-6">You need to be logged in to manage your addresses.</p>
              <Button onClick={() => (window.location.href = '/login?redirect=/account/addresses')}>
                Log In
              </Button>
            </div>
          </Container>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header showMobileMenu={true} />
      <main className="section-padding">
        <Container>
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <MapPin className="h-8 w-8 text-pink-500" />
                <h1 className="text-3xl font-bold text-gray-900">Saved Addresses</h1>
              </div>
              {!showAddForm && (
                <Button onClick={() => setShowAddForm(true)}>
                  <Plus className="h-5 w-5 mr-2" />
                  Add New Address
                </Button>
              )}
            </div>
            <p className="text-gray-600">Manage your shipping addresses for faster checkout</p>
          </div>

          {/* Back to Account */}
          <div className="mb-6">
            <Button
              variant="outline"
              onClick={() => (window.location.href = '/account')}
            >
              ← Back to Account
            </Button>
          </div>

          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {/* Add Address Form */}
          {showAddForm && (
            <div className="bg-white rounded-xl border p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Add New Address</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address Name (e.g., "Home", "Work")
                  </label>
                  <input
                    type="text"
                    value={formData.address_name}
                    onChange={(e) => setFormData({ ...formData, address_name: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-pink-400 focus:border-pink-400"
                    placeholder="Home"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Recipient Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.recipient_name}
                      onChange={(e) => setFormData({ ...formData, recipient_name: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-pink-400 focus:border-pink-400"
                      placeholder="Full Name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      required
                      value={formData.recipient_phone}
                      onChange={(e) => setFormData({ ...formData, recipient_phone: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-pink-400 focus:border-pink-400"
                      placeholder="0XX XXX XXXX"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address Line 1 (Search for your address) *
                  </label>
                  <AddressAutocomplete
                    value={formData.address_line_1}
                    onChange={(value) => setFormData({ ...formData, address_line_1: value })}
                    onAddressSelect={handleAddressSelect}
                    placeholder="Start typing your address..."
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-pink-400 focus:border-pink-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address Line 2 (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.address_line_2}
                    onChange={(e) => setFormData({ ...formData, address_line_2: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-pink-400 focus:border-pink-400"
                    placeholder="Apartment, suite, etc."
                  />
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                    <input
                      type="text"
                      required
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-pink-400 focus:border-pink-400"
                      placeholder="City"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Province *</label>
                    <input
                      type="text"
                      required
                      value={formData.province}
                      onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-pink-400 focus:border-pink-400"
                      placeholder="Province"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Postal Code *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.postal_code}
                      onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-pink-400 focus:border-pink-400"
                      placeholder="0000"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_default"
                    checked={formData.is_default}
                    onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                    className="rounded border-gray-300 text-pink-500 focus:ring-pink-400"
                  />
                  <label htmlFor="is_default" className="text-sm text-gray-700">
                    Set as default address
                  </label>
                </div>

                <div className="flex gap-3">
                  <Button type="submit" disabled={saving}>
                    {saving ? 'Saving...' : 'Save Address'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAddForm(false)}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Addresses List */}
          {addresses.length === 0 ? (
            <div className="bg-white rounded-xl border p-12 text-center">
              <MapPin className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">No saved addresses</h2>
              <p className="text-gray-600 mb-4">
                Add your first address to make checkout faster next time!
              </p>
              {!showAddForm && (
                <Button onClick={() => setShowAddForm(true)}>
                  <Plus className="h-5 w-5 mr-2" />
                  Add New Address
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {addresses.map((address) => (
                <div
                  key={address.id}
                  className="bg-white rounded-xl border p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2">
                      <Home className="h-5 w-5 text-pink-500" />
                      <h3 className="font-bold text-lg">
                        {address.address_name || 'Unnamed Address'}
                      </h3>
                      {address.is_default && (
                        <span className="bg-pink-400 text-white text-xs px-2 py-1 rounded-full">
                          Default
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(address.id)}
                      className="text-red-500 hover:text-red-700 transition-colors"
                      title="Delete address"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="space-y-2 text-gray-700">
                    {address.recipient_name && (
                      <div>
                        <strong>Name:</strong> {address.recipient_name}
                      </div>
                    )}
                    {address.recipient_phone && (
                      <div>
                        <strong>Phone:</strong> {address.recipient_phone}
                      </div>
                    )}
                    <div>
                      <strong>Address:</strong>
                      <br />
                      {address.address_line_1}
                      {address.address_line_2 && (
                        <>
                          <br />
                          {address.address_line_2}
                        </>
                      )}
                      <br />
                      {address.city}, {address.province} {address.postal_code}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Container>
      </main>
      <Footer />
    </div>
  );
}
