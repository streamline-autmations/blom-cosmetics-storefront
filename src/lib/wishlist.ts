interface WishlistItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  image: string;
  slug: string;
  // Made-to-order products must be bought from the product page (shade request form).
  requiresCustomRequest?: boolean;
}

class WishlistStore {
  private items: WishlistItem[] = [];
  private listeners: (() => void)[] = [];

  constructor() {
    // Load wishlist from localStorage on initialization
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('blom-wishlist');
      if (saved) {
        try {
          this.items = JSON.parse(saved);
        } catch (e) {
          console.error('Failed to parse wishlist from localStorage:', e);
        }
      }
    }
  }

  addItem(item: WishlistItem) {
    // Check if item already exists
    const existingIndex = this.items.findIndex(i => i.productId === item.productId);
    
    if (existingIndex === -1) {
      this.items.push(item);
      this.saveToStorage();
      this.notifyListeners();
      return true; // Item was added
    }
    return false; // Item already exists
  }

  removeItem(productId: string) {
    const initialLength = this.items.length;
    this.items = this.items.filter(item => item.productId !== productId);
    
    if (this.items.length !== initialLength) {
      this.saveToStorage();
      this.notifyListeners();
      return true; // Item was removed
    }
    return false; // Item wasn't found
  }

  toggleItem(item: WishlistItem): boolean {
    const exists = this.items.some(i => i.productId === item.productId);
    
    if (exists) {
      this.removeItem(item.productId);
      return false; // Item was removed
    } else {
      this.addItem(item);
      return true; // Item was added
    }
  }

  isInWishlist(productId: string): boolean {
    return this.items.some(item => item.productId === productId);
  }

  getItems(): WishlistItem[] {
    return [...this.items];
  }

  getItemCount(): number {
    return this.items.length;
  }

  clearWishlist() {
    this.items = [];
    this.saveToStorage();
    this.notifyListeners();
  }

  subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private saveToStorage() {
    if (typeof window !== 'undefined') {
      localStorage.setItem('blom-wishlist', JSON.stringify(this.items));
    }
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener());
  }
}

export const wishlistStore = new WishlistStore();

// Notification function for wishlist actions
export const showWishlistNotification = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
  // Create a simple notification element
  const notification = document.createElement('div');
  notification.className = `fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg text-white font-medium transition-all duration-300 transform translate-x-full ${
    type === 'success' ? 'bg-green-500' : 
    type === 'error' ? 'bg-red-500' : 
    'bg-blue-500'
  }`;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  // Animate in
  setTimeout(() => {
    notification.style.transform = 'translateX(0)';
  }, 100);
  
  // Remove after 3 seconds
  setTimeout(() => {
    notification.style.transform = 'translateX(100%)';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 3000);
};
