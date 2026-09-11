/**
 * SINGLE CENTRALIZED CONSTANTS FILE
 * Contains all frontend/backend configuration, Cloudinary parameters,
 * API routes, Kitchen branding fallbacks, theme colors, and order lifecycle states.
 */

export const APP_CONFIG = {
  KITCHEN_SLUG: 'madhurawada',
  // Local development fallback: 'http://localhost:4000'
  // Deployed production backend (Render):
  API_BASE_URL:
    process.env.VITE_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    'https://madhurawada-backend.onrender.com',
  CLOUDINARY: {
    CLOUD_NAME: 'dad5lcdoy',
    API_KEY: '111742125773621',
    FOLDER: 'cloud_kitchen',
  },
};

export const KITCHEN_DEFAULT_BRANDING = {
  name: 'Madhurawada Home Kitchen',
  tagline: 'Authentic Homestyle Andhra Meals & Tiffins',
  description: 'Pure home-cooked happiness cooked in small batches in Madhurawada.',
  address: 'Madhurawada, Visakhapatnam, Andhra Pradesh 530041',
  phone: '+91 9704156957',
  whatsapp: '+91 9704156957',
  email: 'orders@madhurawadakitchen.in',
  radius: 3,
  hours: 'Breakfast: 7:30 AM - 10:30 AM | Lunch: 12:00 PM - 3:00 PM | Dinner: 7:00 PM - 10:00 PM',
  primaryColor: '#e65100',
  acceptingOrders: true,
};

export const ORDER_STATUS = {
  PENDING: { label: 'Pending', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20', step: 1 },
  CONFIRMED: { label: 'Confirmed', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20', step: 2 },
  PREPARING: { label: 'Preparing', color: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20', step: 3 },
  READY: { label: 'Ready for Dispatch', color: 'bg-purple-500/10 text-purple-500 border-purple-500/20', step: 4 },
  OUT_FOR_DELIVERY: { label: 'Out for Delivery', color: 'bg-orange-500/10 text-orange-500 border-orange-500/20', step: 5 },
  DELIVERED: { label: 'Delivered', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', step: 6 },
  CANCELLED: { label: 'Cancelled', color: 'bg-rose-500/10 text-rose-500 border-rose-500/20', step: 0 },
} as const;

export type OrderStatusType = keyof typeof ORDER_STATUS;

export const ADMIN_NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
  { id: 'orders', label: 'Live Orders', icon: 'ShoppingBag' },
  { id: 'hero', label: 'Hero Banner CMS', icon: 'Sparkles' },
  { id: 'banners', label: 'Promo Banners', icon: 'Image' },
  { id: 'sections', label: 'Menu Sections', icon: 'ListOrdered' },
  { id: 'categories', label: 'Food Categories', icon: 'FolderTree' },
  { id: 'items', label: 'Food Items', icon: 'UtensilsCrossed' },
  { id: 'about', label: 'About Story CMS', icon: 'BookOpen' },
  { id: 'contact', label: 'Contact Details', icon: 'PhoneCall' },
  { id: 'testimonials', label: 'Testimonials', icon: 'MessageSquareQuote' },
  { id: 'coupons', label: 'Coupons & Offers', icon: 'Tag' },
  { id: 'customers', label: 'Customer Base', icon: 'Users' },
  { id: 'media', label: 'Cloud Media', icon: 'UploadCloud' },
  { id: 'settings', label: 'Kitchen Settings', icon: 'Settings' },
];

export const CUSTOMER_NAV_ITEMS = [
  { label: 'Home', href: '#' },
  { label: 'Menu', href: '#menu' },
  { label: 'Offers', href: '#offers' },
  { label: 'About Us', href: '#about' },
  { label: 'Contact', href: '#contact' },
];
