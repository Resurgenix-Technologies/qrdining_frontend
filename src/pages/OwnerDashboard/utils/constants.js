import {
  ShoppingBag, Utensils, Grid3x3, BarChart3, Clock, ChefHat, Package, CheckCircle
} from 'lucide-react';

export const TABS = [
  { id: 'orders', label: 'Orders', icon: ShoppingBag },
  { id: 'menu', label: 'Menu', icon: Utensils },
  { id: 'tables', label: 'Tables', icon: Grid3x3 },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
];

export const STATUS_CONFIG = {
  new: { label: 'New', icon: Clock, next: 'preparing', bg: 'bg-blue-50 border-blue-200', badge: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
  preparing: { label: 'Preparing', icon: ChefHat, next: 'ready', bg: 'bg-amber-50 border-amber-200', badge: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  ready: { label: 'Ready', icon: Package, next: 'completed', bg: 'bg-green-50 border-green-200', badge: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
  completed: { label: 'Done', icon: CheckCircle, next: null, bg: 'bg-gray-50 border-gray-200', badge: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' },
};

export const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
