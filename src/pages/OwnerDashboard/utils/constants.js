import {
  ShoppingBag, Utensils, Grid3x3, BarChart3, ChefHat, Package, CheckCircle
} from 'lucide-react';

export const TABS = [
  { id: 'orders', label: 'Orders', icon: ShoppingBag },
  { id: 'menu', label: 'Menu', icon: Utensils },
  { id: 'tables', label: 'Tables', icon: Grid3x3 },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
];

export const STATUS_CONFIG = {
  preparing: { label: 'Preparing', icon: ChefHat, bg: 'bg-amber-50 border-amber-200', badge: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  done_pending_verification: { label: 'Done (Pending Verification)', icon: Package, bg: 'bg-blue-50 border-blue-200', badge: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
  completed: { label: 'Completed', icon: CheckCircle, bg: 'bg-gray-50 border-gray-200', badge: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' },
};

export const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
