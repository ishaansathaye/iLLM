'use client';
import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const pathname = usePathname() || '/';
  const isAdmin = pathname.startsWith('/admin');
  const avatarSrc = isAdmin
    ? '/avatars/admin.png'
    : pathname === '/login'
    ? '/avatars/user.png'
    : '/avatars/demo.png';

  const menuItems = isAdmin
    ? [
        { label: 'Chat', href: '/' },
        { label: 'Log In', href: '/login' },
      ]
    : [
        { label: 'Log In', href: '/login' },
        { label: 'Admin', href: '/admin' },
      ];

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
    <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-white/5 border-b border-white/5 h-16">
      <div className="flex items-center justify-between px-6 h-full">
        {/* Branding */}
        <span className="text-2xl font-bold text-white">iLLM</span>
        
        {/* Avatar dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setOpen(o => !o)}
            className="focus:outline-none relative"
            aria-label="Toggle menu"
          >
            <div className="absolute top-1 -right-0">
              <Image
                src={avatarSrc}
                alt="Avatar"
                width={45}
                height={45}
                className="rounded-full border-2 border-white/20 hover:border-white/40 transition-all duration-200"
              />
            </div>
            {/* Invisible clickable area to maintain original button size */}
            <div className="w-12 h-12"></div>
          </button>
          
          {open && (
            <div className="absolute right-0 mt-2 w-40 bg-gray-800 border border-gray-700 rounded-lg shadow-lg overflow-hidden">
              {menuItems.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block px-4 py-2 text-gray-200 hover:bg-gray-700"
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}