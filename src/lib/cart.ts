// Cart state management and utilities
import { analytics } from './analytics';
import { standardShippingFor } from './shipping';
import type { ShadeRequest } from './shadeRequest';

export interface CartItem {
  id: string;
  productId: string;
  variantId?: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  variant?: {
    title: string;
    option1?: string;
    option2?: string;
    option3?: string;
  };
  // Bundle-specific properties
  isBundle?: boolean;
  includedProducts?: Array<{
    id: string;
    name: string;
    quantity: number;
    price: number;
    image?: string;
    variants?: Array<{
      name: string;
      inStock: boolean;
      image?: string;
    }>;
    selectedVariant?: string;
  }>;
  bundleVariants?: Record<string, string>;
  // Made-to-order request (products.requires_custom_request); each request is its own line.
  customization?: ShadeRequest;
}

export interface CartState {
  items: CartItem[];
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  cartId: string;
}

class CartStore {
  private static instance: CartStore;
  private state: CartState;
  private listeners: ((state: CartState) => void)[] = [];
  private storageKey = 'blom_cart';

  private constructor() {
    this.state = this.loadFromStorage();
    this.normalizeState();
    this.updateTotals();
  }

  static getInstance(): CartStore {
    if (!CartStore.instance) {
      CartStore.instance = new CartStore();
    }
    return CartStore.instance;
  }

  private loadFromStorage(): CartState {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          ...parsed,
          cartId: parsed.cartId || this.generateCartId()
        };
      }
    } catch (error) {
      console.error('Error loading cart from storage:', error);
    }

    return {
      items: [],
      subtotal: 0,
      shipping: 0,
      tax: 0,
      total: 0,
      cartId: this.generateCartId()
    };
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.state));
    } catch (error) {
      console.error('Error saving cart to storage:', error);
    }
  }

  // Ensure legacy/invalid items are fixed or removed
  private normalizeState(): void {
    let didChange = false;
    if (!Array.isArray(this.state.items)) {
      this.state.items = [];
      didChange = true;
    }

    // Filter out items that are completely broken (No ID AND No Name)
    const validItems = this.state.items.filter(item => {
      const isValid = item.id && item.name && item.price >= 0;
      if (!isValid) {
        console.warn('🗑️ Removing corrupt cart item:', item);
        didChange = true;
      }
      return isValid;
    });

    this.state.items = validItems.map((item, index) => {
      const normalized = { ...item } as CartItem;
      // Fix missing IDs if name exists
      if (!normalized.id || typeof normalized.id !== 'string') {
        normalized.id = `item_${Date.now()}_${index}`;
        didChange = true;
      }
      // Fix invalid quantities
      if (!normalized.quantity || normalized.quantity < 1) {
        normalized.quantity = 1;
        didChange = true;
      }
      return normalized;
    });

    if (didChange) {
      this.saveToStorage();
    }
  }

  private generateCartId(): string {
    return 'cart_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  private updateTotals(): void {
    this.state.subtotal = this.state.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    this.state.shipping = standardShippingFor(this.state.subtotal);
    
    // 15% VAT
    this.state.tax = Math.round((this.state.subtotal + this.state.shipping) * 0.15);
    
    this.state.total = this.state.subtotal + this.state.shipping + this.state.tax;
    
    this.saveToStorage();
    this.notifyListeners();
  }

  private notifyListeners(): void {
    // Emit a fresh snapshot so React state updates always detect changes
    const snapshot: CartState = {
      ...this.state,
      items: this.state.items.map(item => ({ ...item }))
    };
    this.listeners.forEach(listener => listener(snapshot));
  }

  subscribe(listener: (state: CartState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  getState(): CartState {
    return { ...this.state };
  }

  addItem(item: Omit<CartItem, 'quantity'>, quantity: number = 1): void {
    const existingIndex = item.customization ? -1 : this.state.items.findIndex(
      cartItem => cartItem.productId === item.productId && cartItem.variantId === item.variantId
    );

    if (existingIndex >= 0) {
      this.state.items[existingIndex].quantity += quantity;
    } else {
      this.state.items.push({ ...item, quantity });
    }

    // Enhanced E-commerce Analytics Tracking
    try {
      const cartItems = [{
        id: item.productId,
        name: item.name,
        category: 'Nail Care Products',
        price: item.price,
        quantity: quantity,
        brand: 'BLOM Cosmetics'
      }];

      analytics.addToCart(cartItems, item.price * quantity);
    } catch (error) {
      console.warn('Analytics tracking failed:', error);
    }

    this.updateTotals();
  }

  updateQuantity(itemId: string, quantity: number): void {
    if (quantity <= 0) {
      this.removeItem(itemId);
      return;
    }

    const item = this.state.items.find(item => item.id === itemId);
    if (item) {
      item.quantity = quantity;
      this.updateTotals();
    }
  }

  removeItem(itemIdOrProductId: string): void {
    const beforeLength = this.state.items.length;
    this.state.items = this.state.items.filter(
      item => item.id !== itemIdOrProductId && item.productId !== itemIdOrProductId
    );
    if (this.state.items.length !== beforeLength) {
      this.updateTotals();
    } else {
      // No change detected; still notify to refresh UI if needed
      this.notifyListeners();
    }
  }

  clearCart(): void {
    this.state.items = [];
    this.state.cartId = this.generateCartId();
    this.updateTotals();
  }

  getItemCount(): number {
    return this.state.items.reduce((sum, item) => sum + item.quantity, 0);
  }
}

import { useState, useEffect } from 'react';

// ... (existing code)

export const cartStore = CartStore.getInstance();

export function useCart() {
  const [state, setState] = useState(cartStore.getState());

  useEffect(() => {
    return cartStore.subscribe(setState);
  }, []);

  return {
    ...state,
    addItem: cartStore.addItem.bind(cartStore),
    removeItem: cartStore.removeItem.bind(cartStore),
    updateQuantity: cartStore.updateQuantity.bind(cartStore),
    clearCart: cartStore.clearCart.bind(cartStore),
    getItemCount: cartStore.getItemCount.bind(cartStore)
  };
}

// Utility functions
export const formatPrice = (price: number): string => {
  return `R${price.toFixed(2)}`;
};

export const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'success'): void => {
  // Don't show notification on mobile
  if (window.innerWidth < 768) {
    return;
  }

  // Create notification element
  const notification = document.createElement('div');
  notification.className = `cart-notification ${type === 'success' ? 'show' : ''}`;
  notification.textContent = message;

  document.body.appendChild(notification);

  // Animate in
  setTimeout(() => {
    notification.classList.add('show');
  }, 100);

  // Remove after 3 seconds
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, 400);
  }, 3000);
};
