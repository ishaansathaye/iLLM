import React from 'react';
import Image from 'next/image';

type NavbarProps = {
  /** Called when the avatar is clicked, e.g. to switch to admin mode */
  onAvatarClick: () => void;
};

export default function Navbar({ onAvatarClick }: NavbarProps) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-white/5 border-b border-white/5">
      <div className="flex items-center justify-between px-6 py-4">
        {/* Branding */}
        <span className="text-2xl font-bold text-white">iLLM</span>
        
        {/* Avatar button */}
        <button
          onClick={onAvatarClick}
          className="focus:outline-none"
          aria-label="Switch to admin"
        >
          <Image
            src="/avatar.png"
            alt="Avatar"
            width={32}
            height={32}
            className="rounded-full"
          />
        </button>
      </div>
    </nav>
  );
}