'use client';

import { useEffect, useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  Clock,
  MapPin,
  ShoppingBag,
  Plus,
  Minus,
  Leaf,
  UtensilsCrossed,
  Search,
  Check,
  Heart,
  MessageSquare,
  Sparkles,
  Phone,
  Tag,
  Star,
  RefreshCw,
  ChevronRight,
  PackageCheck,
  User,
  UserCheck,
  LogOut,
  ShieldCheck,
  Menu,
  X,
  Calendar,
} from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { sample, api, money, type Content, type RecordData } from '@/lib/kitchen';
import { KITCHEN_DEFAULT_BRANDING, ORDER_STATUS, OrderStatusType } from './constants/cloudKitchenConstants';

import { trackVisitorEvent } from '@/lib/tracker';

type CustomerProfile = {
  id: string;
  name: string;
  phone: string;
  customerCode: string;
};

export default function CustomerStorefront() {
  const [content, setContent] = useState<Content>(sample);
  const [connected, setConnected] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [veg, setVeg] = useState(false);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [openCart, setOpenCart] = useState(false);
  const [openTracking, setOpenTracking] = useState(false);
  const [openProfile, setOpenProfile] = useState(false);
  const [detailItem, setDetailItem] = useState<RecordData | null>(null);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [orderResult, setOrderResult] = useState<{ id: string; status: string; trackingToken?: string; note?: string } | null>(null);
  const [trackingId, setTrackingId] = useState('');
  const [trackingData, setTrackingData] = useState<any>(null);
  const [trackingLoading, setTrackingLoading] = useState(false);

  // Customer Profile & Real-time Orders State
  const [customer, setCustomer] = useState<CustomerProfile | null>(null);
  const [customerOrders, setCustomerOrders] = useState<any[]>([]);
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Moving sticky header: slides out of view on scroll down, slides into view on scroll up
  const [headerVisible, setHeaderVisible] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Customer Service Interest Impression & Waitlist State
  const [openInterest, setOpenInterest] = useState(false);
  const [interestName, setInterestName] = useState('');
  const [interestPhone, setInterestPhone] = useState('');
  const [interestMeal, setInterestMeal] = useState('Lunch & Dinner');
  const [interestArea, setInterestArea] = useState('Rajanukunte');
  const [interestNote, setInterestNote] = useState('');
  const [interestLoading, setInterestLoading] = useState(false);
  const [interestSubmitted, setInterestSubmitted] = useState(false);

  // Scheduled Order Timing State
  const [deliveryMode, setDeliveryMode] = useState<'asap' | 'scheduled'>('asap');
  const [scheduleDate, setScheduleDate] = useState('Tomorrow');
  const [scheduleSlot, setScheduleSlot] = useState('🍛 Lunch (12:30 PM - 2:00 PM)');

  const navigateTo = (anchorId: string) => {
    setMobileMenuOpen(false);
    setTimeout(() => {
      const el = document.getElementById(anchorId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }, 80);
  };

  const handleInterestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanP = interestPhone.replace(/\D/g, '').slice(-10);
    if (!cleanP || cleanP.length < 10) {
      alert('Please enter a valid 10-digit WhatsApp phone number');
      return;
    }
    setInterestLoading(true);
    try {
      await api('public/madhurawada/interest', 'POST', {
        name: interestName || customer?.name || 'BLR Resident',
        phone: cleanP,
        mealPreference: interestMeal,
        preferredArea: interestArea,
        note: interestNote,
      });
      trackVisitorEvent('SERVICE_INTEREST_SUBMITTED', `${interestName || 'Resident'} (${cleanP})`, {
        meal: interestMeal,
        area: interestArea,
      });
      setInterestSubmitted(true);
    } catch (err: any) {
      alert(err.message || 'Failed to submit interest. Please try again.');
    } finally {
      setInterestLoading(false);
    }
  };

  // Visitor Telemetry Tracking: Initial Page View & Heartbeat Interval
  useEffect(() => {
    trackVisitorEvent('PAGE_VIEW', 'Homepage');

    // Heartbeat every 20s to update latestSeen and total duration spent
    const heartbeatTimer = setInterval(() => {
      trackVisitorEvent('HEARTBEAT', 'Active');
    }, 20000);

    return () => clearInterval(heartbeatTimer);
  }, []);

  useEffect(() => {
    let lastScrollY = typeof window !== 'undefined' ? Math.max(0, window.scrollY) : 0;
    let accumulatedDelta = 0;
    let ticking = false;

    const handleScroll = () => {
      const currentScrollY = Math.max(0, window.scrollY);

      // Keep header visible while mobile drawer is open
      if (mobileMenuOpen) {
        setHeaderVisible(true);
        lastScrollY = currentScrollY;
        accumulatedDelta = 0;
        ticking = false;
        return;
      }

      // Always visible at the very top of the page
      if (currentScrollY <= 15) {
        setHeaderVisible(true);
        lastScrollY = currentScrollY;
        accumulatedDelta = 0;
        ticking = false;
        return;
      }

      const delta = currentScrollY - lastScrollY;

      // If user reversed scroll direction, reset the accumulator
      if ((delta > 0 && accumulatedDelta < 0) || (delta < 0 && accumulatedDelta > 0)) {
        accumulatedDelta = 0;
      }

      accumulatedDelta += delta;
      lastScrollY = currentScrollY;

      // Scrolling DOWN -> immediately hide header
      if (accumulatedDelta > 8) {
        setHeaderVisible(false);
      }
      // Scrolling UP -> immediately reveal header
      else if (accumulatedDelta < -5) {
        setHeaderVisible(true);
      }

      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(handleScroll);
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [mobileMenuOpen]);

  useEffect(() => {
    api('public/madhurawada')
      .then((d) => {
        setContent(d);
        setConnected(true);
      })
      .catch(() => {});

    try {
      setCart(JSON.parse(localStorage.getItem('kitchen-cart') || '{}'));
      const savedProfile = JSON.parse(localStorage.getItem('kitchen-customer-profile') || 'null');
      if (savedProfile) {
        setCustomer(savedProfile);
        fetchCustomerOrders(savedProfile.phone, savedProfile.id);
      }
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem('kitchen-cart', JSON.stringify(cart));
  }, [cart]);

  // Fetch real-time customer orders from database using Customer ID / Phone
  async function fetchCustomerOrders(phone: string, customerId?: string) {
    if (!phone && !customerId) return;
    setTrackingLoading(true);
    try {
      const data = await api(`public/madhurawada/customer/orders?phone=${encodeURIComponent(phone)}&customerId=${encodeURIComponent(customerId || '')}`);
      if (data.orders) {
        setCustomerOrders(data.orders);
      }
      if (data.customer) {
        setCustomer(data.customer);
        localStorage.setItem('kitchen-customer-profile', JSON.stringify(data.customer));
      }
    } catch (err) {
      console.error('Failed to fetch customer orders:', err);
    } finally {
      setTrackingLoading(false);
    }
  }

  // Handle Customer Registration / Sign-In
  async function handleCustomerAuth(e: React.FormEvent) {
    e.preventDefault();
    const cleanPhone = regPhone.replace(/\D/g, '').slice(0, 10);
    if (!regName || cleanPhone.length !== 10) {
      setError('Please enter a valid 10-digit mobile number starting with 6-9');
      return;
    }
    setAuthLoading(true);
    setError('');

    try {
      const res = await api('public/madhurawada/customer/auth', 'POST', {
        name: regName,
        phone: cleanPhone,
      });

      setCustomer(res);
      localStorage.setItem('kitchen-customer-profile', JSON.stringify(res));
      await fetchCustomerOrders(res.phone, res.id);
      setOpenProfile(false);
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setAuthLoading(false);
    }
  }

  const handleCustomerLogout = () => {
    setCustomer(null);
    setCustomerOrders([]);
    localStorage.removeItem('kitchen-customer-profile');
  };

  const rows = (key: string) => (content[key] as RecordData[] || []).filter((r) => r.active !== false);

  const kitchen = {
    ...KITCHEN_DEFAULT_BRANDING,
    ...(content.kitchen as Record<string, any>),
  };

  const sections = rows('sections');
  const categories = rows('categories').filter((c) => sections.some((s) => s.id === c.sectionId));
  const items = rows('items').filter((i) => categories.some((c) => c.id === i.categoryId));
  const banners = rows('banners');
  const hero = rows('hero')[0] || {
    name: 'Comfort Food. Made Like Home.',
    description: 'Freshly prepared meals, familiar flavours, and the comfort of home in every bite. Prepared in small batches with cold-pressed oils & traditional ground spices.',
    cta: 'Explore Our Menu',
    image: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=1200&q=80',
  };
  const testimonials = rows('testimonials');
  const coupons = rows('coupons');
  const contact = rows('contact')[0];
  const about = rows('about')[0];

  const filteredItems = items.filter((i) => {
    const matchesCategory = category === 'all' || i.categoryId === category;
    const matchesVeg = !veg || i.veg;
    const matchesSearch = i.name.toLowerCase().includes(search.toLowerCase()) || (i.description || '').toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesVeg && matchesSearch;
  });

  const cartLines = items.filter((i) => (cart[i.id] || 0) > 0);
  const subtotal = cartLines.reduce((n, i) => n + Number(i.price) * (cart[i.id] || 0), 0);
  const totalItemCount = cartLines.reduce((n, i) => n + (cart[i.id] || 0), 0);

  const updateCart = (id: string, delta: number) => {
    const item = items.find((i) => i.id === id);
    const newQty = Math.max(0, Math.min(20, (cart[id] || 0) + delta));
    if (delta > 0 && item) {
      trackVisitorEvent('ADD_TO_CART', item.name, { price: item.price, quantity: newQty });
    }
    setCart((prev) => ({
      ...prev,
      [id]: newQty,
    }));
  };

  async function handleCheckout(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!kitchen.acceptingOrders) return;
    setPending(true);
    setError('');
    const form = new FormData(e.currentTarget);
    const rawPhone = String(form.get('phone') || '');
    const phoneVal = rawPhone.replace(/\D/g, '').slice(0, 10);
    const nameVal = String(form.get('name') || '');

    if (phoneVal.length !== 10) {
      setError('Please enter a valid 10-digit mobile number starting with 6-9');
      setPending(false);
      return;
    }

    try {
      const idempotencyKey =
        sessionStorage.getItem('checkout-key') ||
        (() => {
          const key = crypto.randomUUID();
          sessionStorage.setItem('checkout-key', key);
          return key;
        })();

      const order = await api('public/madhurawada/orders', 'POST', {
        name: nameVal,
        phone: phoneVal,
        address: form.get('address'),
        note: form.get('note'),
        scheduledDate: deliveryMode === 'scheduled' ? scheduleDate : undefined,
        scheduledSlot: deliveryMode === 'scheduled' ? scheduleSlot : undefined,
        idempotencyKey,
        items: cartLines.map((i) => ({ id: i.id, quantity: cart[i.id] })),
      });

      trackVisitorEvent('ORDER_PLACED', `Order ${order.id}`, { total: order.total });

      setOrderResult(order);
      sessionStorage.removeItem('checkout-key');
      localStorage.setItem('kitchen-last-order', JSON.stringify(order));

      // Auto-register customer profile if not exists
      if (!customer) {
        try {
          const profile = await api('public/madhurawada/customer/auth', 'POST', { name: nameVal, phone: phoneVal });
          setCustomer(profile);
          localStorage.setItem('kitchen-customer-profile', JSON.stringify(profile));
        } catch {}
      }

      // Refresh real-time customer orders
      if (phoneVal) {
        fetchCustomerOrders(phoneVal);
      }

      setCart({});
    } catch (err: any) {
      setError(err.message || 'Order creation failed');
    } finally {
      setPending(false);
    }
  }

  async function trackOrderById(idToTrack: string, tokenToUse?: string) {
    if (!idToTrack) return;
    setTrackingId(idToTrack);
    setTrackingLoading(true);
    try {
      let token = tokenToUse;
      if (!token) {
        const found = customerOrders.find((o) => o.id === idToTrack);
        token = found?.trackingToken;
      }
      if (!token) {
        const lastOrder = JSON.parse(localStorage.getItem('kitchen-last-order') || '{}');
        if (lastOrder.id === idToTrack) token = lastOrder.trackingToken;
      }

      const data = await api(`public/madhurawada/orders/${idToTrack}`, 'GET', undefined, {
        'x-order-token': token || '',
      });
      setTrackingData(data);
    } catch (err: any) {
      setTrackingData({ error: 'Order not found or invalid token.' });
    } finally {
      setTrackingLoading(false);
    }
  }

  const openWhatsAppOrder = () => {
    trackVisitorEvent('WHATSAPP_CLICK', 'WhatsApp Order Button');
    const waNumber = (kitchen.whatsapp || '7760902191').replace(/[^0-9]/g, '');
    const targetNumber = waNumber.startsWith('91') ? waNumber : `91${waNumber}`;
    const message = `Hello ${kitchen.name}! I would like to place an order from your BLR Home Foods — Your Own Home menu.`;
    window.open(`https://wa.me/${targetNumber}?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <div
      style={{ '--brand': kitchen.primaryColor || '#e65100' } as React.CSSProperties}
      className="min-h-screen bg-[#faf9f6] w-full max-w-[100vw] overflow-x-hidden relative"
    >
      {/* Premium Food-Inspired Navigation Header */}
      <header
        className={`site-header sticky top-0 z-40 ${
          headerVisible ? 'header-visible shadow-sm' : 'header-hidden shadow-none'
        }`}
      >
        <div className="flex items-center justify-between w-full gap-2 sm:gap-6 min-w-0">
          {/* Brand Identity with Custom Handi Emblem & Steaming Leaf */}
          <a className="brand min-w-0 shrink group" href="/">
            <div className="brand-emblem-wrapper">
              <div className="brand-emblem-shadow">
                <svg viewBox="0 0 44 44" className="w-9 h-9 sm:w-11 sm:h-11 shrink-0" fill="none">
                  {/* Outer warm ring */}
                  <circle cx="22" cy="22" r="20" fill="url(#brandGrad)" />
                  <circle cx="22" cy="22" r="19" stroke="#fed7aa" strokeWidth="1" strokeDasharray="2 2" opacity="0.6" />
                  
                  {/* Animated rising steam wisps from pot */}
                  <path d="M17 10 C 16 8, 18 6, 17 4" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" opacity="0.8" className="steam-line steam-1" />
                  <path d="M22 9 C 23 7, 21 5, 22 3" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" opacity="0.9" className="steam-line steam-2" />
                  <path d="M27 10 C 26 8, 28 6, 27 4" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" opacity="0.8" className="steam-line steam-3" />
                  
                  {/* Traditional Cooking Pot / Handi */}
                  <path d="M12 18 C 12 16, 32 16, 32 18 L 30 20 C 32 24, 31 29, 22 29 C 13 29, 12 24, 14 20 Z" fill="#ffffff" />
                  <ellipse cx="22" cy="18" rx="8" ry="1.8" fill="#fed7aa" />
                  
                  {/* Crossed Chef Utensils Silhouette */}
                  <path d="M18 27 L 26 19" stroke="#c2410c" strokeWidth="1.4" strokeLinecap="round" />
                  <path d="M26 27 L 18 19" stroke="#c2410c" strokeWidth="1.4" strokeLinecap="round" />
                  
                  {/* Sprouting Curry Leaf on Pot Rim */}
                  <path d="M27 16 C 32 14, 34 10, 35 7 C 32 9, 29 12, 27 16 Z" fill="#22c55e" className="logo-leaf" />
                  
                  <defs>
                    <linearGradient id="brandGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#ea580c" />
                      <stop offset="50%" stopColor="#c2410c" />
                      <stop offset="100%" stopColor="#9a3412" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>

            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm sm:text-lg font-serif font-bold text-stone-900 tracking-tight leading-tight group-hover:text-amber-800 transition-colors truncate">
                  {kitchen.name}
                </span>
                <span className="hidden sm:inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" title="Kitchen Open & Cooking"></span>
              </div>
              <span className="text-[8px] sm:text-[9.5px] font-bold tracking-[2.2px] text-amber-700 uppercase leading-none mt-0.5">
                YOUR OWN HOME
              </span>
            </div>
          </a>

          {/* Desktop Center Navigation Links with Expanding Micro-Indicators */}
          <nav className="hidden lg:flex items-center gap-8 text-sm font-medium">
            <a href="#menu" className="nav-link group">
              <span>Menu</span>
              <span className="nav-indicator"></span>
            </a>
            <a href="#offers" className="nav-link group">
              <span className="flex items-center gap-1.5">
                <span>Offers</span>
                <span className="text-[9px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.2 rounded-full border border-amber-300">
                  20% OFF
                </span>
              </span>
              <span className="nav-indicator"></span>
            </a>
            <a href="#story" className="nav-link group">
              <span>Our Story</span>
              <span className="nav-indicator"></span>
            </a>
            <a href="#contact" className="nav-link group">
              <span>Contact Us</span>
              <span className="nav-indicator"></span>
            </a>
          </nav>

          {/* Right Action Controls: Customer Account, Track Orders, Bag */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Customer Account Trigger */}
            <button
              onClick={() => setOpenProfile(true)}
              className="customer-btn inline-flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-xs font-semibold rounded-full shrink-0 cursor-pointer"
              title={customer ? `Account: ${customer.name}` : 'Register / Sign In'}
            >
              {customer ? (
                <>
                  <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                    <ShieldCheck size={13} className="text-emerald-700" />
                  </div>
                  <span className="hidden sm:inline max-w-[70px] sm:max-w-[105px] truncate text-xs text-stone-900 font-medium">
                    {customer.name}
                  </span>
                  <span className="hidden md:inline text-[9.5px] bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded font-mono border border-stone-200">
                    {customer.customerCode}
                  </span>
                </>
              ) : (
                <>
                  <div className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                    <User size={12} className="text-amber-800" />
                  </div>
                  <span className="hidden sm:inline text-xs font-medium text-stone-800">Sign In</span>
                </>
              )}
            </button>

            {/* Real-time Order Tracking Trigger */}
            <button
              onClick={() => {
                setOpenTracking(true);
                setTrackingData(null);
                if (customer) {
                  fetchCustomerOrders(customer.phone, customer.id);
                }
              }}
              className="track-orders-btn hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 sm:py-2 text-xs font-semibold rounded-full shrink-0 cursor-pointer"
              title="Track Live Orders"
            >
              <Clock size={14} className="text-amber-700 shrink-0" />
              <span className="text-stone-800 font-medium">Track Orders</span>
            </button>

            {/* Premium Animated Shopping Bag Trigger */}
            <button
              className="bag-btn"
              onClick={() => {
                setOpenCart(true);
                setOrderResult(null);
              }}
              aria-label={`Shopping bag with ${totalItemCount} items`}
            >
              <ShoppingBag size={15} />
              <span className="hidden sm:inline text-xs font-semibold">Bag</span>
              <span className={`bag-count ${totalItemCount > 0 ? 'bag-count-active' : ''}`}>
                {totalItemCount}
              </span>
            </button>

            {/* Mobile Navigation Menu Toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden flex items-center justify-center p-2 rounded-full border border-amber-900/15 bg-white/90 hover:bg-amber-50 text-stone-800 shadow-xs transition-colors shrink-0 cursor-pointer"
              aria-label="Open navigation menu"
              title="Open Navigation Menu"
            >
              <Menu size={18} className="stroke-[2.2] text-stone-800" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Off-Canvas Slide-Over Navigation Sidebar */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex justify-end">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Slide-over Drawer Panel */}
          <div className="relative w-[85vw] max-w-sm h-full bg-[#faf9f6] flex flex-col justify-between shadow-2xl border-l border-stone-200 z-10 animate-in slide-in-from-right duration-300 overflow-y-auto">
            {/* Drawer Header */}
            <div className="p-4 border-b border-stone-200 bg-white flex items-center justify-between sticky top-0 z-10 shadow-2xs">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 shrink-0">
                  <svg viewBox="0 0 44 44" className="w-full h-full" fill="none">
                    <circle cx="22" cy="22" r="20" fill="url(#drawerGrad)" />
                    <circle cx="22" cy="22" r="19" stroke="#fed7aa" strokeWidth="1" strokeDasharray="2 2" opacity="0.6" />
                    <path d="M12 18 C 12 16, 32 16, 32 18 L 30 20 C 32 24, 31 29, 22 29 C 13 29, 12 24, 14 20 Z" fill="#ffffff" />
                    <path d="M18 27 L 26 19" stroke="#c2410c" strokeWidth="1.4" strokeLinecap="round" />
                    <path d="M26 27 L 18 19" stroke="#c2410c" strokeWidth="1.4" strokeLinecap="round" />
                    <path d="M27 16 C 32 14, 34 10, 35 7 C 32 9, 29 12, 27 16 Z" fill="#22c55e" />
                    <defs>
                      <linearGradient id="drawerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#ea580c" />
                        <stop offset="100%" stopColor="#9a3412" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-serif font-bold text-stone-900 leading-tight">{kitchen.name}</div>
                  <div className="text-[9px] text-amber-800 font-bold tracking-widest uppercase">YOUR OWN HOME</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Close menu"
              >
                <X size={18} />
              </button>
            </div>

            {/* Navigation Menu Items with Direct Smooth Jump */}
            <div className="p-4 space-y-4 flex-1">
              {/* Primary Navigation Links */}
              <div className="space-y-1">
                <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest px-3 mb-1">Navigation Menu</div>

                <button
                  onClick={() => navigateTo('menu')}
                  className="w-full px-3 py-2.5 rounded-xl text-left text-sm font-semibold text-stone-800 hover:bg-amber-50 hover:text-[var(--brand)] transition-colors flex items-center justify-between group"
                >
                  <span className="flex items-center gap-2.5">
                    <span className="text-base">🍛</span>
                    <span>Explore Daily Menu</span>
                  </span>
                  <ChevronRight size={16} className="text-stone-400 group-hover:translate-x-0.5 transition-transform" />
                </button>

                <button
                  onClick={() => navigateTo('offers')}
                  className="w-full px-3 py-2.5 rounded-xl text-left text-sm font-semibold text-stone-800 hover:bg-amber-50 hover:text-[var(--brand)] transition-colors flex items-center justify-between group"
                >
                  <span className="flex items-center gap-2.5">
                    <span className="text-base">🏷️</span>
                    <span>Special Deals & Combos</span>
                  </span>
                  <ChevronRight size={16} className="text-stone-400 group-hover:translate-x-0.5 transition-transform" />
                </button>

                <button
                  onClick={() => navigateTo('story')}
                  className="w-full px-3 py-2.5 rounded-xl text-left text-sm font-semibold text-stone-800 hover:bg-amber-50 hover:text-[var(--brand)] transition-colors flex items-center justify-between group"
                >
                  <span className="flex items-center gap-2.5">
                    <span className="text-base">🏡</span>
                    <span>Our Homemaker Story</span>
                  </span>
                  <ChevronRight size={16} className="text-stone-400 group-hover:translate-x-0.5 transition-transform" />
                </button>

                <button
                  onClick={() => navigateTo('contact')}
                  className="w-full px-3 py-2.5 rounded-xl text-left text-sm font-semibold text-stone-800 hover:bg-amber-50 hover:text-[var(--brand)] transition-colors flex items-center justify-between group"
                >
                  <span className="flex items-center gap-2.5">
                    <span className="text-base">📍</span>
                    <span>Kitchen Address & Delivery</span>
                  </span>
                  <ChevronRight size={16} className="text-stone-400 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>

              {/* Special Features: Scheduling & Interest */}
              <div className="pt-2 border-t border-stone-200 space-y-2">
                <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest px-3">Service & Pre-Orders</div>

                {/* Service Waiting / VIP Interest Button */}
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setOpenInterest(true);
                  }}
                  className="w-full p-3 rounded-xl bg-gradient-to-r from-amber-500/15 via-orange-500/15 to-rose-500/15 border border-amber-300 text-left hover:border-amber-400 transition-all flex items-center justify-between"
                >
                  <div>
                    <div className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                      <Sparkles size={14} className="text-amber-600" />
                      <span>Waiting for Service?</span>
                    </div>
                    <div className="text-[11px] text-stone-600 mt-0.5">
                      Join VIP Waitlist & Get 20% OFF launch discount
                    </div>
                  </div>
                  <Heart size={16} className="text-rose-500 fill-rose-500 shrink-0 ml-2" />
                </button>

                {/* Advance Schedule Orders Button */}
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setDeliveryMode('scheduled');
                    setOpenCart(true);
                  }}
                  className="w-full p-3 rounded-xl bg-amber-50/90 border border-amber-200 text-left hover:border-amber-300 transition-all flex items-center justify-between"
                >
                  <div>
                    <div className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                      <Calendar size={14} className="text-amber-700" />
                      <span>Schedule Orders in Advance</span>
                    </div>
                    <div className="text-[11px] text-stone-600 mt-0.5">
                      Pre-order lunch, dinner, or weekly boxes
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-stone-400" />
                </button>
              </div>

              {/* Account & Live Tracking */}
              <div className="pt-2 border-t border-stone-200 space-y-2">
                <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest px-3">Account & Orders</div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setOpenProfile(true);
                    }}
                    className="flex flex-col items-center justify-center p-3 bg-white border border-stone-200 hover:border-amber-300 rounded-xl text-stone-800 transition-all text-center"
                  >
                    <User size={18} className="text-amber-600 mb-1" />
                    <span className="text-xs font-semibold">{customer ? customer.name.split(' ')[0] : 'Sign In'}</span>
                    <span className="text-[10px] text-stone-400">{customer ? customer.customerCode : 'Register'}</span>
                  </button>

                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setOpenTracking(true);
                      setTrackingData(null);
                      if (customer) fetchCustomerOrders(customer.phone, customer.id);
                    }}
                    className="flex flex-col items-center justify-center p-3 bg-white border border-stone-200 hover:border-amber-300 rounded-xl text-stone-800 transition-all text-center"
                  >
                    <Clock size={18} className="text-amber-600 mb-1" />
                    <span className="text-xs font-semibold">Track Orders</span>
                    <span className="text-[10px] text-stone-400">Live Status</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Drawer Bottom Actions */}
            <div className="p-4 border-t border-stone-200 bg-white space-y-2.5">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  openWhatsAppOrder();
                }}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors"
              >
                <MessageSquare size={16} />
                <span>Chat & Order on WhatsApp</span>
              </button>

              <div className="text-[11px] text-stone-500 text-center flex items-center justify-center gap-1">
                <span>📍 Serving Rajanukunte, Yelahanka & North Bengaluru</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <main>
        {/* Premium Editorial Hero Section */}
        {hero && (
          <section className="hero-editorial">
            <div className="hero-ambient-ring-1"></div>
            <div className="hero-ambient-ring-2"></div>

            <div className="hero-grid-container max-w-[1440px] mx-auto">
              {/* Left Column: Brand Storytelling & Editorial Typography */}
              <div className="hero-editorial-copy">
                {/* Brand Eyebrow Badge */}
                <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white/90 border border-amber-500/25 text-stone-800 text-xs font-semibold tracking-wider uppercase mb-5 backdrop-blur-sm shadow-xs w-fit">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
                  </span>
                  <span className="tracking-widest text-[10.5px] font-bold text-stone-700">
                    BLR HOME FOODS · MADE WITH CARE
                  </span>
                </div>

                {/* Main Headline */}
                <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-[60px] font-serif font-normal text-stone-900 leading-[1.08] tracking-tight mb-5">
                  Comfort Food. <br />
                  <span className="bg-gradient-to-r from-amber-700 via-orange-600 to-amber-800 bg-clip-text text-transparent font-medium">
                    Made Like Home.
                  </span>
                </h1>

                {/* Supporting Description */}
                <p className="text-stone-600 text-base sm:text-lg leading-relaxed max-w-lg mb-8 font-light">
                  Freshly prepared meals, familiar flavours, and the comfort of home in every bite. Prepared in small batches with pure ground spices, cold-pressed oils, and traditional family recipes.
                </p>

                {/* Side-by-Side Modern CTA Buttons */}
                <div className="flex flex-wrap items-center gap-3.5 sm:gap-4 mb-7">
                  <a
                    href="#menu"
                    className="inline-flex items-center justify-center gap-2 px-6 sm:px-7 py-3.5 sm:py-4 bg-gradient-to-r from-orange-600 via-amber-600 to-amber-700 hover:from-orange-700 hover:to-amber-800 text-white font-semibold text-sm sm:text-base rounded-full shadow-lg shadow-orange-950/15 hover:shadow-xl hover:shadow-orange-950/25 transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                  >
                    <span>Explore Our Menu</span>
                    <ArrowUpRight size={18} />
                  </a>

                  <button
                    onClick={openWhatsAppOrder}
                    className="inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-3.5 sm:py-4 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm sm:text-base rounded-full shadow-md shadow-emerald-950/15 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 border border-emerald-600/40 cursor-pointer"
                  >
                    <MessageSquare size={18} />
                    <span>Order on WhatsApp</span>
                  </button>
                </div>

                {/* Trust & Heritage Indicators */}
                <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs text-stone-600 font-medium pt-5 border-t border-stone-200/80">
                  <div className="flex items-center gap-1.5">
                    <Sparkles size={14} className="text-amber-600 shrink-0" />
                    <span>Freshly prepared</span>
                  </div>
                  <span className="text-stone-300">·</span>
                  <div className="flex items-center gap-1.5">
                    <Leaf size={14} className="text-emerald-700 shrink-0" />
                    <span>Small batches</span>
                  </div>
                  <span className="text-stone-300">·</span>
                  <div className="flex items-center gap-1.5">
                    <Heart size={14} className="text-rose-500 shrink-0" />
                    <span>Made with care</span>
                  </div>
                </div>

                {/* VIP Interest Pill Trigger */}
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setOpenInterest(true);
                      trackVisitorEvent('INTEREST_CLICK', 'Hero VIP Interest Pill');
                    }}
                    className="group inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 hover:bg-amber-500/20 border border-amber-400/40 text-amber-950 text-xs font-medium transition-all hover:scale-[1.02] active:scale-98 cursor-pointer"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-600 animate-pulse"></span>
                    <span>Pre-register in Rajanukunte & Yelahanka for <strong>20% OFF</strong></span>
                    <ArrowRight size={12} className="text-amber-700 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              </div>

              {/* Right Column: Signature Layered Food Centerpiece Experience */}
              <div className="hero-visual-stage">
                <div className="hero-plate-wrapper">
                  {/* Rotating Culinary Stamp / Seal */}
                  <div className="hero-seal">
                    <svg viewBox="0 0 120 120" className="w-full h-full">
                      <defs>
                        <path id="sealTextPath" d="M 60, 60 m -43, 0 a 43,43 0 1,1 86,0 a 43,43 0 1,1 -86,0" />
                      </defs>
                      <circle cx="60" cy="60" r="56" fill="#fffdf9" stroke="#d97706" strokeWidth="1.2" strokeDasharray="3 2" />
                      <circle cx="60" cy="60" r="32" fill="#fef3c7" stroke="#b45309" strokeWidth="1" />
                      <text fontSize="7" fontWeight="bold" letterSpacing="2.2" fill="#78350f">
                        <textPath href="#sealTextPath" startOffset="0%">
                          ★ BLR HOME FOODS ★ AUTHENTIC HOMESTYLE ★
                        </textPath>
                      </text>
                      <g transform="translate(48, 48)">
                        <UtensilsCrossed size={24} className="text-amber-800" />
                      </g>
                    </svg>
                  </div>

                  {/* Floating Hand-Drawn Curry Leaf 1 */}
                  <div className="floating-curry-leaf-1">
                    <svg viewBox="0 0 48 48" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M6 38 C 10 24, 22 12, 42 6 C 36 22, 28 34, 12 40 Z" fill="#166534" opacity="0.9" />
                      <path d="M6 38 C 18 26, 30 16, 42 6" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
                      <path d="M18 27 C 22 28, 25 31, 27 34" stroke="#22c55e" strokeWidth="1" strokeLinecap="round" opacity="0.6" />
                      <path d="M26 19 C 30 20, 33 22, 35 25" stroke="#22c55e" strokeWidth="1" strokeLinecap="round" opacity="0.6" />
                    </svg>
                  </div>

                  {/* Floating Hand-Drawn Curry Leaf 2 */}
                  <div className="floating-curry-leaf-2">
                    <svg viewBox="0 0 42 42" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M36 34 C 30 20, 20 10, 4 6 C 10 22, 18 32, 32 38 Z" fill="#15803d" opacity="0.85" />
                      <path d="M36 34 C 24 22, 14 14, 4 6" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
                    </svg>
                  </div>

                  {/* Floating Star Anise Culinary Spice */}
                  <div className="floating-star-anise">
                    <svg viewBox="0 0 40 40" className="w-full h-full" fill="#78350f" opacity="0.8">
                      <path d="M20 2 L23 14 L35 11 L26 20 L35 29 L23 26 L20 38 L17 26 L5 29 L14 20 L5 11 L17 14 Z" />
                      <circle cx="20" cy="20" r="4" fill="#451a03" />
                    </svg>
                  </div>

                  {/* Floating Red Chili Culinary Accent */}
                  <div className="floating-chili">
                    <svg viewBox="0 0 36 36" className="w-full h-full" fill="none">
                      <path d="M8 28 C 14 22, 22 14, 28 6 C 26 16, 20 24, 10 30 Z" fill="#dc2626" opacity="0.85" />
                      <path d="M28 6 C 30 4, 32 3, 34 4" stroke="#15803d" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </div>

                  {/* Rising Steam Wisps from Hot Dish */}
                  <div className="hero-steam-container">
                    <div className="hero-steam-wisp hero-steam-wisp-1"></div>
                    <div className="hero-steam-wisp hero-steam-wisp-2"></div>
                    <div className="hero-steam-wisp hero-steam-wisp-3"></div>
                  </div>

                  {/* Main Circular Gourmet Food Platter */}
                  <div className="hero-plate-frame">
                    <img
                      src={hero.image || 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=1200&q=80'}
                      alt="Fresh Homestyle Food - BLR Home Foods"
                    />
                  </div>

                  {/* Floating Glassmorphic Top Card: Rating & Families */}
                  <div className="hero-glass-card-top">
                    <div className="w-9 h-9 rounded-full bg-amber-500/15 border border-amber-500/20 flex items-center justify-center shrink-0 text-amber-700">
                      <Star size={18} fill="currentColor" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 font-bold text-xs text-stone-900">
                        <span>4.9 / 5.0</span>
                        <span className="text-[10px] text-amber-700 font-semibold bg-amber-100 px-1.5 py-0.2 rounded">TOP RATED</span>
                      </div>
                      <div className="text-[11px] text-stone-600 leading-tight">
                        Loved by Rajanukunte & Yelahanka Families
                      </div>
                    </div>
                  </div>

                  {/* Floating Glassmorphic Bottom Card: 100% Home Cooked */}
                  <div className="hero-glass-card-bottom">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span className="text-[10.5px] tracking-wider uppercase font-bold text-emerald-400">
                        100% HOMESTYLE KITCHEN
                      </span>
                    </div>
                    <p className="text-xs text-stone-300 font-light leading-snug">
                      Cold-pressed oils · Ground spices · No excess oiliness
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Feature Service Strip */}
        <div className="service-strip">
          <span>
            <MapPin /> Direct delivery within {kitchen.radius} km of Rajanukunte
          </span>
          <span>
            <Clock /> {kitchen.hours}
          </span>
          <span>
            <Leaf /> Pure vegetarian & homestyle non-veg dishes
          </span>
        </div>

        {/* Promotional Offers & Banners Carousel */}
        {banners.length > 0 && (
          <section id="offers" className="my-8 px-[5%] sm:px-[6%]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {banners.map((b) => (
                <div
                  key={b.id}
                  className="promo bg-gradient-to-r from-amber-50 to-orange-100/60 border border-amber-200/80 p-5 sm:p-6 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs"
                >
                  <div>
                    <div className="eyebrow text-amber-800 font-bold text-xs tracking-wider flex items-center gap-1.5 mb-1">
                      <Tag size={14} /> SPECIAL OFFER
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold text-stone-900 mb-1.5">{b.name}</h2>
                    <p className="text-xs sm:text-sm text-stone-700 max-w-sm">{b.description}</p>
                  </div>
                  <a
                    href="#menu"
                    className="inline-flex items-center gap-2 font-semibold text-amber-900 hover:text-amber-700 text-xs sm:text-sm whitespace-nowrap bg-white px-4 py-2.5 rounded-lg border border-amber-300 shadow-xs shrink-0 self-start sm:self-center"
                  >
                    Order Now <ArrowRight size={16} />
                  </a>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Main Food Menu Section */}
        <section id="menu" className="menu-section">
          <div className="section-heading">
            <div className="eyebrow">PREPARED WITH LOVE & CARE</div>
            <div className="heading-row">
              <h2>Explore Our Daily Menu</h2>
              <p>Hygienic, fresh, and authentically spiced home meals.</p>
            </div>
          </div>

          {/* Menu Controls & Filters */}
          <div className="menu-toolbar">
            <div className="chips" role="tablist" aria-label="Menu categories">
              <button
                className={category === 'all' ? 'selected' : ''}
                onClick={() => {
                  setCategory('all');
                  trackVisitorEvent('CATEGORY_CLICK', 'All Items');
                }}
              >
                All Items ({items.length})
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  className={category === c.id ? 'selected' : ''}
                  onClick={() => {
                    setCategory(c.id);
                    trackVisitorEvent('CATEGORY_CLICK', c.name);
                  }}
                >
                  {c.name}
                </button>
              ))}
            </div>

            <div className="menu-filters">
              <label className="search border border-stone-300 rounded-full px-3.5 py-2 bg-white shadow-xs">
                <Search size={17} className="text-stone-400 shrink-0" />
                <input
                  aria-label="Search menu"
                  placeholder="Search breakfast, thalis, biryani..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>

              <label className="veg-filter">
                <Switch checked={veg} onCheckedChange={setVeg} /> Veg Only
              </label>
            </div>
          </div>

          {/* Food Cards Grid */}
          <div className="food-grid">
            {filteredItems.map((i, index) => (
              <article className="food-card bg-white shadow-xs hover:shadow-md transition-shadow" key={i.id}>
                {i.image && (
                  <button
                    className={'food-photo crop-' + (index % 3)}
                    onClick={() => {
                      setDetailItem(i);
                      trackVisitorEvent('CARD_CLICK', i.name, { price: i.price, categoryId: i.categoryId });
                    }}
                  >
                    <img src={i.image} alt={i.name} />
                    {i.bestseller && <span className="food-tag">KITCHEN BESTSELLER</span>}
                  </button>
                )}
                <div className="food-body">
                  <div className="item-meta">
                    <span className={i.veg ? 'veg-symbol' : 'nonveg-symbol'}>
                      {i.veg ? '▣ VEG' : '▣ NON-VEG'}
                    </span>
                    <span>⏱ {i.prepTime || 20} mins</span>
                  </div>

                  <button
                    className="item-title hover:text-[var(--brand)] transition-colors"
                    onClick={() => {
                      setDetailItem(i);
                      trackVisitorEvent('CARD_CLICK', i.name, { price: i.price, categoryId: i.categoryId });
                    }}
                  >
                    {i.name}
                  </button>
                  <p>{i.description}</p>

                  <div className="price-row">
                    <strong>{money(Number(i.price))}</strong>

                    {cart[i.id] ? (
                      <div className="quantity">
                        <button aria-label={'Remove ' + i.name} onClick={() => updateCart(i.id, -1)}>
                          <Minus size={15} />
                        </button>
                        <span>{cart[i.id]}</span>
                        <button aria-label={'Add ' + i.name} onClick={() => updateCart(i.id, 1)}>
                          <Plus size={16} />
                        </button>
                      </div>
                    ) : (
                      <button className="add" onClick={() => updateCart(i.id, 1)}>
                        Add <Plus size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>

          {!filteredItems.length && (
            <div className="empty">
              <h3>No dishes found</h3>
              <p>Try adjusting your search query or switching categories.</p>
            </div>
          )}

          <p className="menu-note">
            All meals are prepared fresh in small batches at our Rajanukunte home kitchen. Custom spice level requests can be added during checkout.
          </p>
        </section>

        {/* Customer Testimonials Section */}
        {testimonials.length > 0 && (
          <section className="bg-stone-900 text-white py-16 px-[6%] my-12 rounded-3xl mx-[4%]">
            <div className="text-center max-w-xl mx-auto mb-10">
              <div className="text-amber-400 font-bold text-xs tracking-widest uppercase mb-2">NEIGHBOURHOOD REVIEWS</div>
              <h2 className="text-3xl font-serif">Loved by Rajanukunte & Yelahanka Families</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {testimonials.map((t) => (
                <div key={t.id} className="bg-stone-800/80 border border-stone-700 p-6 rounded-2xl shadow-sm">
                  <div className="flex text-amber-400 gap-1 mb-3">
                    {[...Array(t.rating || 5)].map((_, idx) => (
                      <Star key={idx} size={16} fill="currentColor" />
                    ))}
                  </div>
                  <p className="text-stone-300 italic text-sm leading-relaxed mb-4">"{t.description}"</p>
                  <div className="font-semibold text-white text-xs tracking-wider uppercase">— {t.name}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Our Story Section */}
        {about && (
          <section className="story" id="story">
            <span className="story-number">01 / HOMEMAKER CHEF STORY</span>
            <div>
              <h2>{about.name}</h2>
              <p>{about.description}</p>
            </div>
            <div className="story-seal">
              <UtensilsCrossed size={34} />
              <span>
                Freshly Cooked.<br />Direct to Your Door.
              </span>
            </div>
          </section>
        )}

        {/* Contact Us Section */}
        {contact && (
          <section id="contact" className="contact">
            <div>
              <div className="eyebrow">ALWAYS AT YOUR SERVICE</div>
              <h2>Rajanukunte, Bengaluru.</h2>
            </div>
            <div>
              <MapPin size={24} />
              <h3>{kitchen.address}</h3>
              <p>{kitchen.hours}</p>
              <p className="mt-2 text-stone-600 font-medium">Direct Delivery Radius: Up to {kitchen.radius} km</p>
              <div className="mt-3 flex flex-wrap gap-2.5">
                <a
                  href={`tel:${(kitchen.phone || '7760902191').replace(/[^0-9+]/g, '')}`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg text-xs font-semibold transition-colors border border-stone-200"
                >
                  <Phone size={14} className="text-amber-700" />
                  <span>Call: {kitchen.phone || '+91 7760902191'}</span>
                </a>
                <button
                  type="button"
                  onClick={openWhatsAppOrder}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  <MessageSquare size={14} className="text-emerald-600" />
                  <span>WhatsApp: {kitchen.whatsapp || '+91 7760902191'}</span>
                </button>
              </div>
              <p className="mt-4 font-mono text-sm text-stone-800 bg-stone-100 p-3 rounded-lg border border-stone-200">
                {contact.description}
              </p>
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer>
        <div>
          <strong>{kitchen.name}</strong>
          <p>{kitchen.description}</p>
        </div>
        <div>
          <small>© 2026 BLR Home Foods · Your Own Home · All rights reserved.</small>
        </div>
      </footer>

      {/* Customer Registration & Account Profile Dialog */}
      <Dialog open={openProfile} onOpenChange={setOpenProfile}>
        <DialogContent className="w-[95vw] max-w-md p-5 sm:p-6 rounded-2xl max-h-[88vh] overflow-y-auto">
          <DialogTitle className="text-xl font-bold text-stone-900 flex items-center gap-2">
            <UserCheck className="text-emerald-600" size={22} />
            {customer ? 'Your Customer Account' : 'Customer Sign In / Registration'}
          </DialogTitle>
          <DialogDescription className="text-xs text-stone-600">
            {customer
              ? 'Your unique Customer ID links all your live orders automatically across devices.'
              : 'Enter your name and mobile number to create your Customer ID.'}
          </DialogDescription>

          {customer ? (
            <div className="my-4 space-y-4">
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 p-4 rounded-xl space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-stone-500 font-medium">Unique Customer ID:</span>
                  <span className="font-mono text-xs font-bold bg-emerald-600 text-white px-2 py-0.5 rounded shadow-2xs">
                    {customer.customerCode}
                  </span>
                </div>
                <div className="text-base font-bold text-stone-900">{customer.name}</div>
                <div className="text-xs text-stone-600">📱 Mobile: +91 {customer.phone.replace(/^\+91\s*/, '')}</div>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => {
                    setOpenProfile(false);
                    setOpenTracking(true);
                    fetchCustomerOrders(customer.phone, customer.id);
                  }}
                  className="w-full py-2.5 bg-stone-900 text-white rounded-lg text-xs font-semibold hover:bg-stone-800 flex items-center justify-center gap-2"
                >
                  <Clock size={15} /> View My Live Orders ({customerOrders.length})
                </button>

                <button
                  onClick={handleCustomerLogout}
                  className="w-full py-2 border border-stone-300 text-stone-600 hover:text-stone-900 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5"
                >
                  <LogOut size={14} /> Sign Out of Account
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleCustomerAuth} className="form-stack my-4">
              <label>
                Full Name
                <input
                  required
                  placeholder="e.g. Ramesh Verma"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                />
              </label>

              <label className="block text-sm font-semibold text-stone-700">
                Mobile Phone Number (10 digits)
                <div className="flex items-center rounded-lg border border-stone-300 bg-white overflow-hidden focus-within:ring-2 focus-within:ring-amber-500 focus-within:border-amber-500 transition-all shadow-xs mt-1.5">
                  <div className="bg-stone-100 text-stone-800 font-bold text-sm px-3.5 py-2.5 border-r border-stone-200 flex items-center gap-1.5 select-none shrink-0">
                    <span className="text-base">🇮🇳</span>
                    <span className="font-mono text-stone-900 tracking-tight">+91</span>
                  </div>
                  <input
                    required
                    type="tel"
                    pattern="[6-9][0-9]{9}"
                    maxLength={10}
                    inputMode="numeric"
                    placeholder="9876543210"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="w-full px-3 py-2.5 text-sm font-mono tracking-wider text-stone-900 bg-transparent border-0 outline-none focus:outline-none focus:ring-0 placeholder:text-stone-400 placeholder:font-sans"
                  />
                </div>
              </label>

              {error && <div className="error text-xs">{error}</div>}

              <button disabled={authLoading} className="primary full">
                {authLoading ? 'Registering...' : 'Create / Sign In Customer ID'}
              </button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Item Details Dialog */}
      <Dialog
        open={!!detailItem}
        onOpenChange={(open) => {
          if (!open) {
            setDetailItem(null);
          }
        }}
      >
        <DialogContent className="w-[95vw] max-w-md p-5 sm:p-6 rounded-2xl max-h-[88vh] overflow-y-auto">
          <DialogTitle>{detailItem?.name}</DialogTitle>
          <DialogDescription>{detailItem?.description}</DialogDescription>
          <div className="my-3 text-sm text-stone-600">
            <p>{detailItem?.veg ? '🌱 100% Vegetarian' : '🍗 Non-Vegetarian'}</p>
            <p>Prep Time: {detailItem?.prepTime || 20} minutes</p>
          </div>
          <div className="flex items-center justify-between mt-4">
            <strong className="text-2xl font-bold">{money(Number(detailItem?.price || 0))}</strong>
            <button
              className="primary"
              onClick={() => {
                if (detailItem) {
                  updateCart(detailItem.id, 1);
                  trackVisitorEvent('MODAL_ZOOM_ADD', detailItem.name, { price: detailItem.price });
                }
                setDetailItem(null);
              }}
            >
              Add to Bag <Plus size={18} />
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Real-time Order Tracking Dialog */}
      <Dialog open={openTracking} onOpenChange={setOpenTracking}>
        <DialogContent className="w-[95vw] max-w-md p-5 sm:p-6 rounded-2xl max-h-[88vh] overflow-y-auto">
          <DialogTitle className="text-xl font-bold text-stone-900 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <PackageCheck className="text-amber-600" size={22} /> Track Orders
            </span>
            {customer && (
              <span className="font-mono text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full font-bold">
                {customer.customerCode}
              </span>
            )}
          </DialogTitle>
          <DialogDescription className="text-xs text-stone-600">
            {customer
              ? `Real-time orders for ${customer.name} (${customer.phone})`
              : 'Click any recent order or register your Customer ID to track live preparation.'}
          </DialogDescription>

          {/* Real-time Orders List linked to Customer ID */}
          {customerOrders.length > 0 ? (
            <div className="my-4 space-y-2.5">
              <div className="flex justify-between items-center text-xs font-semibold text-stone-700 tracking-wider uppercase">
                <span>Your Real-Time Orders ({customerOrders.length})</span>
                <button
                  onClick={() => customer && fetchCustomerOrders(customer.phone, customer.id)}
                  className="text-amber-700 hover:underline text-[11px] flex items-center gap-1"
                >
                  <RefreshCw size={12} /> Refresh Live
                </button>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {customerOrders.map((ord) => (
                  <button
                    key={ord.id}
                    onClick={() => trackOrderById(ord.id, ord.trackingToken)}
                    className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between group ${
                      trackingId === ord.id
                        ? 'border-amber-500 bg-amber-50/80 shadow-xs'
                        : 'border-stone-200 bg-white hover:border-amber-300 hover:bg-stone-50'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-stone-900 text-xs flex items-center gap-2 flex-wrap">
                        <span>Order #{ord.id.substring(0, 8).toUpperCase()}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-800 border border-amber-200">
                          {ord.status}
                        </span>
                        {ord.note?.includes('[SCHEDULED:') && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-100 text-purple-900 border border-purple-200 flex items-center gap-1">
                            <Calendar size={11} /> SCHEDULED
                          </span>
                        )}
                      </div>
                      {ord.note?.includes('[SCHEDULED:') && (
                        <div className="text-[11px] font-semibold text-purple-900 bg-purple-50 border border-purple-200 rounded px-2 py-0.5 mt-1 w-fit flex items-center gap-1">
                          <span>📅 {ord.note.match(/\[SCHEDULED:\s*([^\]]+)\]/)?.[1] || 'Scheduled Delivery'}</span>
                        </div>
                      )}
                      <div className="text-xs text-stone-500 mt-1">
                        Total: {money(ord.total / 100 || ord.total || 0)} · {new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>

                    <div className="text-amber-700 group-hover:translate-x-0.5 transition-transform flex items-center text-xs font-semibold">
                      Live <ChevronRight size={16} />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="my-4 p-4 text-center bg-stone-50 rounded-xl border border-stone-200 text-xs text-stone-500 space-y-2">
              <p>No orders found for this account yet.</p>
              {!customer && (
                <button
                  onClick={() => {
                    setOpenTracking(false);
                    setOpenProfile(true);
                  }}
                  className="text-amber-700 font-semibold underline block mx-auto"
                >
                  Register your Customer ID to link all orders
                </button>
              )}
            </div>
          )}

          {/* Manual Input Fallback */}
          <details className="text-xs text-stone-600 my-2">
            <summary className="cursor-pointer font-medium hover:text-stone-900 select-none text-stone-500">
              Or track using a specific Order ID manually
            </summary>
            <div className="flex gap-2 mt-3">
              <input
                type="text"
                placeholder="Enter full Order ID..."
                value={trackingId}
                onChange={(e) => setTrackingId(e.target.value)}
                className="flex-1 border border-stone-300 rounded-md px-3 py-2 text-xs font-mono"
              />
              <button
                onClick={() => trackOrderById(trackingId)}
                disabled={trackingLoading}
                className="px-4 py-2 bg-stone-900 text-white rounded-md text-xs font-semibold hover:bg-stone-800 disabled:opacity-50"
              >
                {trackingLoading ? 'Checking...' : 'Track'}
              </button>
            </div>
          </details>

          {/* Live Order Timeline Output */}
          {trackingData && (
            <div className="mt-4 bg-stone-900 text-white p-4 rounded-xl text-xs space-y-3 shadow-md animate-in fade-in">
              {trackingData.error ? (
                <p className="text-rose-400">{trackingData.error}</p>
              ) : (
                <>
                  <div className="flex justify-between items-center pb-2 border-b border-stone-700">
                    <span className="font-semibold text-stone-200 font-mono">Order #{trackingData.id?.substring(0, 8).toUpperCase()}</span>
                    <div className="flex items-center gap-1.5">
                      {trackingData.note?.includes('[SCHEDULED:') && (
                        <span className="uppercase text-purple-300 bg-purple-950/90 px-2 py-0.5 rounded text-[10px] font-bold border border-purple-700 flex items-center gap-1">
                          <Calendar size={11} /> SCHEDULED
                        </span>
                      )}
                      <span className="uppercase text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded text-[10px] font-bold border border-amber-800/50">
                        {trackingData.status}
                      </span>
                    </div>
                  </div>

                  {trackingData.note?.includes('[SCHEDULED:') && (
                    <div className="p-2.5 rounded-lg bg-purple-950/80 border border-purple-700 text-purple-200 flex items-start gap-2">
                      <Calendar size={16} className="text-purple-300 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-[10px] uppercase font-bold text-purple-300 tracking-wider">Scheduled Delivery Slot</div>
                        <div className="text-xs font-semibold text-white mt-0.5">
                          📅 {trackingData.note.match(/\[SCHEDULED:\s*([^\]]+)\]/)?.[1]}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between text-stone-400 text-[11px]">
                    <span>Total Amount: {money(trackingData.total / 100 || trackingData.total || 0)}</span>
                    <span>Placed: {new Date(trackingData.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>

                  <div className="pt-2 border-t border-stone-800 space-y-2">
                    <p className="font-semibold text-stone-300 text-[11px]">Real-Time Kitchen Timeline:</p>
                    {trackingData.history?.map((h: any, idx: number) => (
                      <div key={idx} className="flex justify-between text-stone-400 text-[11px] py-1 border-b border-stone-800/40">
                        <span className="flex items-center gap-1.5 text-stone-200">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span> {h.status}
                        </span>
                        <span>{new Date(h.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Cart & Checkout Dialog */}
      <Dialog open={openCart} onOpenChange={setOpenCart}>
        <DialogContent className="cart-dialog">
          <DialogTitle>{orderResult ? 'Order Request Received! 🎉' : 'Your Meal Bag'}</DialogTitle>
          <DialogDescription>
            {orderResult
              ? 'Our kitchen team in BLR is reviewing your order.'
              : 'Review your selected items before sending your order request.'}
          </DialogDescription>

          {orderResult ? (
            <div className="py-4 space-y-4 text-center">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <Check size={28} />
              </div>

              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-left text-sm space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs text-stone-500 block">Order ID:</span>
                    <span className="font-mono text-sm font-bold text-stone-900">#{orderResult.id?.slice(0, 8).toUpperCase()}</span>
                  </div>
                  <span className="uppercase font-bold text-xs bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-1 rounded-full">
                    {orderResult.status}
                  </span>
                </div>

                {orderResult.note?.includes('[SCHEDULED:') && (
                  <div className="p-2.5 rounded-lg bg-purple-50 border border-purple-200 text-purple-950 flex items-start gap-2">
                    <Calendar size={16} className="text-purple-700 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-purple-800">
                        Scheduled Delivery Time
                      </div>
                      <div className="text-xs font-bold text-purple-950 mt-0.5">
                        📅 {orderResult.note.match(/\[SCHEDULED:\s*([^\]]+)\]/)?.[1]}
                      </div>
                    </div>
                  </div>
                )}

                <p className="text-xs text-stone-600">
                  Full Order Reference: <span className="font-mono text-[11px] select-all bg-white px-1.5 py-0.5 rounded border">{orderResult.id}</span>
                </p>
                <p className="text-xs text-stone-600">
                  Your order is linked to your Customer ID and updated live in real time.
                </p>
              </div>

              <button
                onClick={() => {
                  setOpenCart(false);
                  setOrderResult(null);
                  setOpenTracking(true);
                  if (customer) {
                    fetchCustomerOrders(customer.phone, customer.id);
                  }
                  if (orderResult.id) {
                    trackOrderById(orderResult.id, orderResult.trackingToken);
                  }
                }}
                className="w-full py-2.5 bg-stone-900 text-white rounded-md font-semibold text-sm hover:bg-stone-800"
              >
                Track This Order Live
              </button>
            </div>
          ) : (
            <>
              {cartLines.map((i) => (
                <div className="cart-line" key={i.id}>
                  <div>
                    <b>{i.name}</b>
                    <small>{money(Number(i.price))}</small>
                  </div>
                  <div className="quantity">
                    <button onClick={() => updateCart(i.id, -1)} aria-label="Decrease quantity">
                      <Minus size={15} />
                    </button>
                    {cart[i.id]}
                    <button onClick={() => updateCart(i.id, 1)} aria-label="Increase quantity">
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              ))}

              {!cartLines.length ? (
                <p className="py-8 text-center text-stone-500 text-sm">Your bag is empty. Explore our menu to add items!</p>
              ) : (
                <>
                  <div className="cart-total">
                    Item Subtotal <b>{money(subtotal)}</b>
                  </div>

                  {!connected || !kitchen.acceptingOrders ? (
                    <div className="notice">
                      Notice: Kitchen is currently set to sample mode and not accepting live orders right now.
                    </div>
                  ) : (
                    <form onSubmit={handleCheckout} className="form-stack">
                      <label>
                        Customer Name
                        <input
                          name="name"
                          required
                          minLength={2}
                          defaultValue={customer?.name || ''}
                          placeholder="e.g. Rajesh Sharma"
                        />
                      </label>

                      <label className="block text-sm font-semibold text-stone-700">
                        Mobile Number (for order delivery updates)
                        <div className="flex items-center rounded-lg border border-stone-300 bg-white overflow-hidden focus-within:ring-2 focus-within:ring-amber-500 focus-within:border-amber-500 transition-all shadow-xs mt-1.5">
                          <div className="bg-stone-100 text-stone-800 font-bold text-sm px-3.5 py-2.5 border-r border-stone-200 flex items-center gap-1.5 select-none shrink-0">
                            <span className="text-base">🇮🇳</span>
                            <span className="font-mono text-stone-900 tracking-tight">+91</span>
                          </div>
                          <input
                            name="phone"
                            required
                            type="tel"
                            pattern="[6-9][0-9]{9}"
                            maxLength={10}
                            inputMode="numeric"
                            defaultValue={customer?.phone ? customer.phone.replace(/\D/g, '').slice(-10) : ''}
                            onChange={(e) => {
                              e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10);
                            }}
                            placeholder="9876543210"
                            className="w-full px-3 py-2.5 text-sm font-mono tracking-wider text-stone-900 bg-transparent border-0 outline-none focus:outline-none focus:ring-0 placeholder:text-stone-400 placeholder:font-sans"
                          />
                        </div>
                      </label>

                      {/* Delivery Timing Mode: ASAP vs Scheduled */}
                      <div className="my-2.5 p-3 bg-amber-50/80 border border-amber-200/90 rounded-xl space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold text-stone-800">
                          <span className="flex items-center gap-1.5">
                            <Calendar size={14} className="text-amber-700" /> Delivery Timing
                          </span>
                          <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold">
                            {deliveryMode === 'scheduled' ? 'Pre-Order' : 'Instant'}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setDeliveryMode('asap')}
                            className={`py-2 px-2 rounded-lg text-xs font-semibold border transition-all text-center ${
                              deliveryMode === 'asap'
                                ? 'bg-amber-700 text-white border-amber-700 shadow-2xs'
                                : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                            }`}
                          >
                            ⚡ Deliver ASAP
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeliveryMode('scheduled')}
                            className={`py-2 px-2 rounded-lg text-xs font-semibold border transition-all text-center ${
                              deliveryMode === 'scheduled'
                                ? 'bg-amber-700 text-white border-amber-700 shadow-2xs'
                                : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                            }`}
                          >
                            📅 Schedule for Later
                          </button>
                        </div>

                        {deliveryMode === 'scheduled' && (
                          <div className="pt-2 border-t border-amber-200/80 space-y-2 text-xs animate-in fade-in duration-200">
                            <div>
                              <label className="block text-[11px] font-semibold text-stone-700 mb-1">Select Delivery Date:</label>
                              <select
                                value={scheduleDate}
                                onChange={(e) => setScheduleDate(e.target.value)}
                                className="w-full border border-stone-300 rounded-lg p-2 text-xs bg-white text-stone-900 font-medium outline-none"
                              >
                                <option value="Today">Today</option>
                                <option value="Tomorrow">Tomorrow</option>
                                <option value="Day After Tomorrow">Day After Tomorrow</option>
                                <option value="Upcoming Saturday">Upcoming Saturday</option>
                                <option value="Upcoming Sunday">Upcoming Sunday</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-[11px] font-semibold text-stone-700 mb-1">Select Meal Time Slot:</label>
                              <select
                                value={scheduleSlot}
                                onChange={(e) => setScheduleSlot(e.target.value)}
                                className="w-full border border-stone-300 rounded-lg p-2 text-xs bg-white text-stone-900 font-medium outline-none"
                              >
                                <option value="☀️ Breakfast (7:30 AM - 9:00 AM)">☀️ Breakfast (7:30 AM - 9:00 AM)</option>
                                <option value="🍛 Lunch (12:30 PM - 2:00 PM)">🍛 Lunch (12:30 PM - 2:00 PM)</option>
                                <option value="☕ Evening Snacks (4:30 PM - 6:00 PM)">☕ Evening Snacks (4:30 PM - 6:00 PM)</option>
                                <option value="🌙 Dinner (7:30 PM - 9:30 PM)">🌙 Dinner (7:30 PM - 9:30 PM)</option>
                              </select>
                            </div>

                            <p className="text-[11px] text-amber-900 bg-amber-100/70 p-2 rounded border border-amber-200">
                              ✅ Order scheduled for: <strong>{scheduleDate}</strong> during <strong>{scheduleSlot}</strong>
                            </p>
                          </div>
                        )}
                      </div>

                      <label>
                        Rajanukunte / Bengaluru Delivery Address
                        <textarea name="address" required minLength={10} placeholder="Apartment / Flat number, Landmark in Rajanukunte, Yelahanka..." />
                      </label>

                      <label>
                        Special Spice / Preparation Note (Optional)
                        <textarea name="note" maxLength={500} placeholder="e.g. Less spicy for kids, extra chutney requested" />
                      </label>

                      {error && <p role="alert" className="error">{error}</p>}

                      <button disabled={pending} className="primary">
                        {pending ? 'Sending Order Request...' : deliveryMode === 'scheduled' ? 'Schedule Order Request' : 'Send Order Request'}
                      </button>
                    </form>
                  )}
                </>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Customer Service Interest Impression & Waitlist Dialog */}
      <Dialog open={openInterest} onOpenChange={setOpenInterest}>
        <DialogContent className="w-[95vw] max-w-md p-5 sm:p-6 rounded-2xl max-h-[88vh] overflow-y-auto">
          <DialogTitle className="text-xl font-bold text-stone-900 flex items-center gap-2">
            <Sparkles className="text-amber-600" size={22} />
            Waiting for BLR Home Meals?
          </DialogTitle>
          <DialogDescription className="text-xs text-stone-600">
            Tell us you're waiting for our service! We will register your interest and send you a private launch message on WhatsApp plus a 20% discount coupon.
          </DialogDescription>

          {interestSubmitted ? (
            <div className="py-6 space-y-4 text-center">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <Heart size={30} className="fill-emerald-600" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-stone-900">You're On Our VIP Priority List!</h3>
                <p className="text-xs text-stone-600 max-w-xs mx-auto">
                  Thank you for supporting BLR Home Foods — Your Own Home. We will message you on WhatsApp the moment cooking begins!
                </p>
              </div>
              <button
                onClick={() => {
                  setInterestSubmitted(false);
                  setOpenInterest(false);
                }}
                className="w-full py-2.5 bg-stone-900 text-white rounded-lg text-xs font-semibold hover:bg-stone-800"
              >
                Back to Menu
              </button>
            </div>
          ) : (
            <form onSubmit={handleInterestSubmit} className="form-stack my-3 space-y-3">
              <label>
                Your Name
                <input
                  required
                  placeholder="e.g. Sravani or Ramesh"
                  value={interestName}
                  onChange={(e) => setInterestName(e.target.value)}
                />
              </label>

              <label className="block text-sm font-semibold text-stone-700">
                WhatsApp Phone Number
                <div className="flex items-center rounded-lg border border-stone-300 bg-white overflow-hidden focus-within:ring-2 focus-within:ring-amber-500 focus-within:border-amber-500 transition-all shadow-xs mt-1.5">
                  <div className="bg-stone-100 text-stone-800 font-bold text-sm px-3.5 py-2.5 border-r border-stone-200 flex items-center gap-1.5 select-none shrink-0">
                    <span className="text-base">🇮🇳</span>
                    <span className="font-mono text-stone-900 tracking-tight">+91</span>
                  </div>
                  <input
                    required
                    type="tel"
                    pattern="[6-9][0-9]{9}"
                    maxLength={10}
                    inputMode="numeric"
                    placeholder="9876543210"
                    value={interestPhone}
                    onChange={(e) => setInterestPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="w-full px-3 py-2.5 text-sm font-mono tracking-wider text-stone-900 bg-transparent border-0 outline-none focus:outline-none focus:ring-0 placeholder:text-stone-400"
                  />
                </div>
              </label>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">What meal do you need?</label>
                  <select
                    value={interestMeal}
                    onChange={(e) => setInterestMeal(e.target.value)}
                    className="w-full border border-stone-300 rounded-lg p-2 text-xs bg-white text-stone-900"
                  >
                    <option value="Lunch & Dinner">Lunch & Dinner</option>
                    <option value="Lunch Only (Office / Home)">Lunch Only</option>
                    <option value="Dinner Only">Dinner Only</option>
                    <option value="Morning Breakfast">Morning Breakfast</option>
                    <option value="Millet Snacks & Crispies">Millet Snacks</option>
                    <option value="Monthly Tiffin Subscription">Monthly Tiffin</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Your Delivery Locality (Rajanukunte & North BLR)</label>
                  <select
                    value={interestArea}
                    onChange={(e) => setInterestArea(e.target.value)}
                    className="w-full border border-stone-300 rounded-lg p-2 text-xs bg-white text-stone-900"
                  >
                    <option value="Rajanukunte">Rajanukunte</option>
                    <option value="Yelahanka New Town">Yelahanka New Town</option>
                    <option value="Yelahanka Old Town">Yelahanka Old Town</option>
                    <option value="Doddaballapur Road / Marasandra">Doddaballapur Road / Marasandra</option>
                    <option value="Adde Vishwanathapura">Adde Vishwanathapura</option>
                    <option value="Hesaraghatta">Hesaraghatta</option>
                    <option value="Singanayakanahalli">Singanayakanahalli</option>
                    <option value="Vidyaranyapura / MS Palya">Vidyaranyapura / MS Palya</option>
                    <option value="Hebbal / Sahakar Nagar">Hebbal / Sahakar Nagar</option>
                    <option value="Other Area in North Bengaluru">Other Area in North Bengaluru</option>
                  </select>
                </div>
              </div>

              <label>
                Dietary or Special Requests (Optional)
                <input
                  placeholder="e.g. Less oil, diabetic friendly, or pure vegetarian"
                  value={interestNote}
                  onChange={(e) => setInterestNote(e.target.value)}
                />
              </label>

              <button
                disabled={interestLoading}
                className="w-full py-3 bg-gradient-to-r from-amber-700 to-orange-700 hover:from-amber-800 hover:to-orange-800 text-white font-bold rounded-xl text-sm shadow-md transition-all flex items-center justify-center gap-2 mt-2"
              >
                <Heart size={16} className="fill-white" />
                {interestLoading ? 'Recording Interest...' : "I'm Interested · Keep Me Posted ✨"}
              </button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
