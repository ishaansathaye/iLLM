'use client';
import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [role, setRole] = useState<'admin'|'trusted'|'demo'>('demo');
  const pathname = usePathname() || '/';

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const session = data.session;
      if (session) {
        // fetch profile to get real role
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();
        if (!error && profile?.role) {
          setRole(profile.role as 'admin' | 'trusted' | 'demo');
        } else {
          setRole('trusted');
        }
      } else {
        setRole('demo');
      }
    });

    // subscribe to auth changes (optional)
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setRole('demo');
      }
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const avatarSrc = role === 'admin'
    ? '/avatars/admin.png'
    : role === 'trusted'
    ? '/avatars/user.png'
    : '/avatars/demo.png';

  let menuItems;
  if (pathname.startsWith('/login') || pathname.startsWith('/register')) {
    // On login or register page: show Chat & Admin
    menuItems = [
      { label: 'Chat', href: '/' },
      { label: 'Admin', href: '/admin' },
    ];
  } else if (pathname.startsWith('/admin')) {
    // On admin console: show Log In & Chat
    menuItems = [
      { label: 'Log In', href: '/login' },
      { label: 'Chat', href: '/' },
    ];
  } else {
    // On chat: show Admin & Log In
    menuItems = [
      { label: 'Admin', href: '/admin' },
      { label: 'Log In', href: '/login' },
    ];
  }

  useEffect(() => { 
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-white/5 border-b border-white/10 h-16">
      <div className="flex items-center justify-between px-6 h-full">
        {/* Branding */}
        <motion.span 
          className="text-2xl font-bold text-white"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          iLLM
        </motion.span>

        {/* Avatar dropdown */}
        <div className="relative" ref={menuRef}>
          <motion.button
            onClick={() => setOpen(o => !o)}
            className="focus:outline-none relative group"
            aria-label="Toggle menu"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <div className="absolute top-1 -right-0">
              <Image
                src={avatarSrc}
                alt="Avatar"
                width={45}
                height={45}
                className="rounded-full border-2 border-white/20 group-hover:border-white/40 transition-all duration-200 shadow-lg"
              />
              {/* Subtle glow effect */}
              <div className="absolute inset-0 rounded-full bg-blue-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 blur-sm"></div>
            </div>
            {/* Invisible clickable area to maintain original button size */}
            <div className="w-12 h-12"></div>
          </motion.button>

          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="absolute right-0 mt-2 w-44 bg-black/90 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl overflow-hidden"
                style={{
                  backdropFilter: 'blur(16px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(16px) saturate(180%)',
                }}
              >
                {/* Dropdown header */}
                <div className="px-4 py-3 border-b border-white/10">
                  <div className="text-xs text-gray-400 uppercase tracking-wide font-semibold">
                    Navigation
                  </div>
                </div>

                {/* Menu items */}
                <div className="py-2">
                  {menuItems.map((item, index) => (
                    <motion.div
                      key={item.href}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Link
                        href={item.href}
                        className="block px-4 py-3 text-gray-200 hover:text-white hover:bg-white/10 transition-all duration-200 group"
                        onClick={() => setOpen(false)}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{item.label}</span>
                          <motion.div
                            className="opacity-0 group-hover:opacity-100"
                            initial={false}
                            animate={{ x: 0 }}
                            whileHover={{ x: 2 }}
                          >
                            <svg
                              className="w-4 h-4 text-gray-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5l7 7-7 7"
                              />
                            </svg>
                          </motion.div>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>

                {/* Dropdown footer */}
                <div className="px-4 py-3 border-t border-white/10 bg-black/10">
                  <div className="text-xs text-gray-400 text-center">
                    Current: <span className="text-blue-400 font-medium">
                      {role === 'admin' ? 'Admin' : role === 'trusted' ? 'Login' : 'Demo'}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </nav>
  );
}