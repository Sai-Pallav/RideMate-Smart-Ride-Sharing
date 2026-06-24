import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getNotifications } from '../api/notifications';

/**
 * Reusable NavigationBar Component
 * Renders TopNavBar on desktop (md and above) and BottomTabBar on mobile.
 */
export default function NavigationBar({ className = '', ...props }) {
  const location = useLocation();
  const currentPath = location.pathname;

  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const updateUnread = async () => {
      try {
        const res = await getNotifications();
        const list = res.notifications || res.data || [];
        setUnreadCount(list.filter(n => !n.is_read).length);
      } catch (err) {
        console.error("Failed to fetch unread notification count:", err);
      }
    };

    updateUnread();

    // Listen to storage events to sync unread count across tabs
    window.addEventListener('storage', updateUnread);
    // Poll count locally since React router transitions mutate state in the same tab
    const interval = setInterval(updateUnread, 5000);

    return () => {
      window.removeEventListener('storage', updateUnread);
      clearInterval(interval);
    };
  }, []);

  // Unified destination paths and icons
  const navItems = [
    {
      label: 'Home',
      path: '/home',
      icon: (active) => (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.5 : 2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      )
    },
    {
      label: 'Search',
      path: '/search',
      icon: (active) => (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.5 : 2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      )
    },
    {
      label: 'Create',
      path: '/create-ride',
      icon: (active) => (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.5 : 2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      label: 'Alerts',
      path: '/notifications',
      icon: (active) => (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.5 : 2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      )
    },
    {
      label: 'History',
      path: '/ride-history',
      icon: (active) => (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.5 : 2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      label: 'Profile',
      path: '/profile',
      icon: (active) => (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.5 : 2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      )
    }
  ];

  return (
    <div className={`w-full ${className}`} {...props}>
      {/* 1. Desktop Top Navigation Bar (Hidden on Mobile) */}
      <nav className="hidden md:flex items-center justify-between px-6 py-4 bg-brand-bg-card border-b border-slate-800 shadow-md">
        <Link to="/" className="text-xl font-black bg-gradient-to-r from-brand-primary to-brand-primary-light bg-clip-text text-transparent tracking-tight">
          COMMUNITY RIDE
        </Link>
        
        <div className="flex items-center gap-6">
          {navItems.map((item) => {
            const isActive = currentPath === item.path;
            return (
              <Link
                key={item.label}
                to={item.path}
                className={`
                  flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-lg transition duration-200
                  ${isActive 
                    ? 'text-brand-primary bg-brand-primary/5' 
                    : 'text-brand-text-secondary hover:text-brand-text-primary hover:bg-slate-800/40'
                  }
                `}
              >
                <div className="relative flex items-center">
                  {item.icon(isActive)}
                  {item.label === 'Alerts' && unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-brand-safety text-[8px] font-black text-white border border-slate-900 shadow-md">
                      {unreadCount}
                    </span>
                  )}
                </div>
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* 2. Mobile Bottom Tab Bar (Hidden on Desktop) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 px-2 py-2 bg-brand-bg-card/90 backdrop-blur-md border-t border-slate-850 shadow-2xl flex justify-around pb-safe">
        {navItems.map((item) => {
          const isActive = currentPath === item.path;
          return (
            <Link
              key={item.label}
              to={item.path}
              className={`
                flex flex-col items-center justify-center py-1 px-1 rounded-lg transition duration-150 select-none
                ${isActive ? 'text-brand-primary' : 'text-brand-text-secondary active:scale-95'}
              `}
            >
              <div className="relative mb-0.5">
                {item.icon(isActive)}
                {item.label === 'Alerts' && unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-brand-safety text-[8px] font-black text-white border border-slate-900 shadow-md animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </div>
              <span className="text-[9px] font-bold tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
