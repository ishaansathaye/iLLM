"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { motion, AnimatePresence } from "framer-motion";
import { differenceInHours, parseISO } from "date-fns";

// Maximum number of demo requests allowed per session
const DEMO_LIMIT = 3;

export default function Navbar() {
  // Navigation state
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // User authentication state
  const [role, setRole] = useState<"admin" | "trusted" | "demo">("demo");
  const [email, setEmail] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Demo session quota state
  const [requestsLeft, setRequestsLeft] = useState<number | string>(DEMO_LIMIT);
  const [cooldownHours, setCooldownHours] = useState<number | string>(0);
  const pathname = usePathname() || "/";
  const router = useRouter();

  // Initialize user authentication state and role on component mount
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const session = data.session;
      if (session) {
        setEmail(session.user.email ?? null);
        setIsLoggedIn(true);

        // Fetch user profile to determine their role
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single();

        if (!error && profile?.role) {
          setRole(profile.role as "admin" | "trusted" | "demo");
        } else {
          setRole("trusted"); // Default to trusted for logged-in users
        }
      } else {
        setIsLoggedIn(false);
        setRole("demo");
        setEmail(null);
      }
    });

    // Subscribe to authentication state changes
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session) {
          setIsLoggedIn(false);
          setRole("demo");
        } else {
          setIsLoggedIn(true);
        }
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  // Fetch demo session data from Supabase
  const fetchDemoData = useCallback(async (sessionId: string) => {
    try {
      const { data, error } = await supabase
        .from("demo_sessions")
        .select("hit_count, expires_at")
        .eq("session_id", sessionId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching demo session:", error);
        // On error, assume full quota available
        setRequestsLeft(DEMO_LIMIT);
        setCooldownHours(0);
        return;
      }

      if (data) {
        // Calculate remaining requests
        const used = data.hit_count ?? 0;
        const remaining = Math.max(0, DEMO_LIMIT - used);
        setRequestsLeft(remaining);

        // Calculate hours remaining until expiration
        if (data.expires_at) {
          const now = new Date();
          const expiresAt = parseISO(data.expires_at);
          const hoursRemaining = differenceInHours(expiresAt, now);
          setCooldownHours(Math.max(0, hoursRemaining));
        } else {
          setCooldownHours(0);
        }
      } else {
        // No existing demo session: user has full quota available
        setRequestsLeft(DEMO_LIMIT);
        setCooldownHours(0);
      }
    } catch (error) {
      console.error("Unexpected error fetching demo data:", error);
      setRequestsLeft(DEMO_LIMIT);
      setCooldownHours(0);
    }
  }, []);

  // Set up demo session tracking and real-time updates
  useEffect(() => {
    // Non-demo users have unlimited access
    if (role !== "demo") {
      setRequestsLeft("∞");
      setCooldownHours("∞");
      return;
    }

    // Get or create a persistent session ID for demo users
    let sessionId = localStorage.getItem("demoSessionId");
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      localStorage.setItem("demoSessionId", sessionId);
    }

    // Initial fetch of demo session data
    fetchDemoData(sessionId);

    // Set up real-time subscription for live quota updates
    const channel = supabase
      .channel(`demo_${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "demo_sessions",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const row = payload.new as {
            hit_count?: number;
            expires_at?: string;
          } | null;

          if (row) {
            const used = row.hit_count ?? 0;
            const remaining = Math.max(0, DEMO_LIMIT - used);
            setRequestsLeft(remaining);

            // Calculate hours remaining until expiration
            if (row.expires_at) {
              const now = new Date();
              const expiresAt = parseISO(row.expires_at);
              const hoursRemaining = differenceInHours(expiresAt, now);
              setCooldownHours(Math.max(0, hoursRemaining));
            } else {
              setCooldownHours(0);
            }
          }
        }
      )
      .subscribe();

    // Set up periodic polling as fallback for real-time updates
    const pollInterval = setInterval(() => {
      fetchDemoData(sessionId);
    }, 30000); // Poll every 30 seconds

    // Cleanup subscriptions and intervals
    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [role, fetchDemoData]);

  // Determine avatar image based on user role
  const avatarSrc =
    role === "admin"
      ? "/avatars/admin.png"
      : role === "trusted"
      ? "/avatars/user.png"
      : "/avatars/demo.png";

  // Handle user logout
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setOpen(false);
      router.push("/login");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  // Generate context-sensitive menu items based on current page and auth status
  let menuItems;
  if (pathname.startsWith("/login") || pathname.startsWith("/register")) {
    // On login or register page: show Chat & Admin
    menuItems = [
      { label: "Chat", href: "/" },
      { label: "Admin", href: "/admin" },
    ];
  } else if (pathname.startsWith("/admin")) {
    // On admin console: show appropriate items based on login status
    if (isLoggedIn) {
      menuItems = [
        { label: "Chat", href: "/" },
        { label: "Log Out", action: handleLogout },
      ];
    } else {
      menuItems = [
        { label: "Log In", href: "/login" },
        { label: "Chat", href: "/" },
      ];
    }
  } else {
    // On chat: show appropriate items based on login status
    if (isLoggedIn) {
      menuItems = [
        { label: "Admin", href: "/admin" },
        { label: "Log Out", action: handleLogout },
      ];
    } else {
      menuItems = [
        { label: "Admin", href: "/admin" },
        { label: "Log In", href: "/login" },
      ];
    }
  }

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Format the demo quota status for display
  const formatDemoStatus = () => {
    if (role !== "demo") return "♾️ ∞";

    const requests =
      typeof requestsLeft === "number" ? requestsLeft : DEMO_LIMIT;
    const hours = typeof cooldownHours === "number" ? cooldownHours : 0;

    if (requests === 0) {
      if (hours > 0) {
        return `🧪 0/${DEMO_LIMIT} | Reset in ${hours}h`;
      } else {
        return `🧪 0/${DEMO_LIMIT} | Resetting...`;
      }
    } else {
      return `🧪 ${requests}/${DEMO_LIMIT} left`;
    }
  };

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
        <div className="text-sm text-gray-300 mx-4 flex items-center gap-2">
          <span>{formatDemoStatus()}</span>
        </div>

        {/* Avatar dropdown */}
        <div className="relative" ref={menuRef}>
          <motion.button
            onClick={() => setOpen((o) => !o)}
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
                  backdropFilter: "blur(16px) saturate(180%)",
                  WebkitBackdropFilter: "blur(16px) saturate(180%)",
                }}
              >
                {/* Dropdown header */}
                <div className="px-4 py-3 border-b border-white/10">
                  {email ? (
                    <div className="text-sm text-gray-200 font-medium">
                      {email.split("@")[0]}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-400 uppercase tracking-wide font-semibold">
                      Navigation
                    </div>
                  )}
                </div>

                {/* Menu items */}
                <div className="py-2">
                  {menuItems.map((item, index) => (
                    <motion.div
                      key={item.href || item.label}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      {item.href ? (
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
                      ) : (
                        <button
                          onClick={item.action}
                          className="w-full text-left block px-4 py-3 text-gray-200 hover:text-white hover:bg-white/10 transition-all duration-200 group"
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
                                  d="M17 16l4-4m0 0l-4-4m4 4H7"
                                />
                              </svg>
                            </motion.div>
                          </div>
                        </button>
                      )}
                    </motion.div>
                  ))}
                </div>

                {/* Dropdown footer */}
                <div className="px-4 py-3 border-t border-white/10 bg-black/10">
                  <div className="text-xs text-gray-400 text-center">
                    Current:{" "}
                    <span className="text-blue-400 font-medium">
                      {role === "admin"
                        ? "Admin"
                        : role === "trusted"
                        ? "Login"
                        : "Demo"}
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
