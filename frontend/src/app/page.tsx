'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import ChatLayout from '@/components/ChatLayout';
import MessageList from '@/components/MessageList';
import InputBar from '@/components/InputBar';
import Navbar from '@/components/Navbar';
import { supabase } from '@/lib/supabaseClient';
import detectIncognito from 'detectincognitojs';

export default function Home() {
  const router = useRouter();
  const [isCheckingPrivateMode, setIsCheckingPrivateMode] = useState(true);
  const [isPrivateMode, setIsPrivateMode] = useState(false);

  // Simple and reliable private browsing detection using detectIncognito.js
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const detectPrivateBrowsing = async () => {
      try {
        console.log('Running detectIncognito.js...');
        
        const result = await detectIncognito();
        console.log(`Browser: ${result.browserName}, Private: ${result.isPrivate}`);

        if (result.isPrivate) {
          setIsPrivateMode(true);
          setTimeout(() => {
            router.replace('/login');
          }, 3000);
        } else {
          setIsCheckingPrivateMode(false);
        }

      } catch (error) {
        console.error('Error detecting private browsing:', error);
        // If detection fails, assume normal browsing and continue
        setIsCheckingPrivateMode(false);
      }
    };

    // Small delay to ensure DOM is ready
    setTimeout(detectPrivateBrowsing, 200);
  }, [router]);

  const apiURL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
  
  const [sessionId] = useState(() => {
    if (typeof window === 'undefined') return '';
    try {
      let sid = window.localStorage.getItem('demoSessionId');
      if (!sid) {
        sid = crypto.randomUUID();
        window.localStorage.setItem('demoSessionId', sid);
      }
      return sid;
    } catch {
      return crypto.randomUUID();
    }
  });

  const [messages, setMessages] = useState<{fromUser:boolean; text:string}[]>([]);
  const fullIntro = "hi, i'm ishaan";
  const [typedIntro, setTypedIntro] = useState("");
  const [showIntro, setShowIntro] = useState(true);
  const [isDemoBlocked, setIsDemoBlocked] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showIntro) return;
    let idx = 0;
    const interval = setInterval(() => {
      setTypedIntro(fullIntro.slice(0, idx + 1));
      idx++;
      if (idx >= fullIntro.length) clearInterval(interval);
    }, 100);
    return () => clearInterval(interval);
  }, [showIntro]);

  useEffect(() => {
    if (scrollRef.current && messages.length > 0) {
      const lastMessageIndex = messages.length - 1;
      const messageElements = scrollRef.current.querySelectorAll('[data-message]');
      if (messageElements.length > 0) {
        const lastMessage = messageElements[lastMessageIndex] as HTMLElement;
        if (lastMessage) {
          const offsetTop = lastMessage.offsetTop - 100;
          scrollRef.current.scrollTop = offsetTop;
        }
      }
    }
  }, [messages]);

  const send = async (text: string) => {
    if (isCheckingPrivateMode || isPrivateMode) return;
    
    setShowIntro(false);
    setMessages([...messages, { fromUser: true, text }]);
    
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Session-Id': sessionId,
      };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const res = await fetch(apiURL + '/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({ question: text }),
      });
      
      if (res.status === 401) {
        // user has been revoked or session expired
        await supabase.auth.signOut();
        router.replace('/login');
        return;
      }
      
      if (res.status === 403) {
        setIsDemoBlocked(true);
        return;
      }
      if (!res.ok) {
        alert(`Error: ${res.status} ${res.statusText}`);
        return;
      }
      
      const { answer } = await res.json();
      setMessages(prev => [...prev, { fromUser: false, text: answer }]);
    } catch (error) {
      console.error('Chat request failed', error);
      alert('Network error—please try again.');
    }
  };

  if (isCheckingPrivateMode) {
    return (
      <div className="h-screen flex flex-col bg-gradient-to-br from-gray-900 via-black to-gray-800">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-white">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-lg">Verifying browser environment...</p>
            <p className="text-sm text-gray-400 mt-2">Checking for private browsing</p>
          </div>
        </div>
      </div>
    );
  }

  if (isPrivateMode) {
    return (
      <div className="h-screen flex flex-col bg-gradient-to-br from-gray-900 via-black to-gray-800">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-white max-w-lg mx-auto px-4">
            <div className="text-6xl mb-6">🚫</div>
            <h2 className="text-3xl font-bold mb-4 text-red-400">Private Browsing Not Supported</h2>
            <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-6 mb-6">
              <p className="text-gray-200 mb-4">
                This demo requires full browser storage capabilities to function properly.
              </p>
              <div className="text-left text-sm text-gray-300 space-y-2">
                <p>• <strong>Chrome:</strong> Exit Incognito mode</p>
                <p>• <strong>Safari:</strong> Turn off Private Browsing</p>
                <p>• <strong>Firefox:</strong> Exit Private Window</p>
              </div>
            </div>
            <div className="flex items-center justify-center text-gray-400">
              <div className="animate-spin rounded-full h-4 w-4 border-b border-gray-400 mr-2"></div>
              <span className="text-sm">Redirecting...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-gray-900 via-black to-gray-800">
      <Navbar />
      
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="px-4 py-2 min-h-full flex flex-col">
          <AnimatePresence>
            {showIntro && (
              <motion.div
                key="intro"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex items-center justify-center text-center text-2xl font-semibold text-white"
              >
                <div>
                  {typedIntro}
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 1] }}
                    transition={{ repeat: Infinity, repeatType: 'loop', duration: 0.7 }}
                    className="inline-block"
                  >
                    |
                  </motion.span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <ChatLayout>
            <MessageList messages={messages} />
          </ChatLayout>
        </div>
      </div>
      
      {isDemoBlocked && (
        <div className="fixed bottom-20 left-0 right-0 px-4">
          <div className="max-w-2xl mx-auto bg-red-600 text-white p-3 rounded-lg text-center">
            Demo limit reached — please&nbsp;
            <a href="/login" className="underline font-semibold">
              log in
            </a>
            &nbsp;to continue.
          </div>
        </div>
      )}
      
      <div className="fixed bottom-3 left-0 right-0 px-4 py-2 flex justify-center">
        <div className="w-full max-w-2xl">
          <InputBar 
            onSend={send} 
            onInput={() => setShowIntro(false)} 
            disabled={isDemoBlocked || isCheckingPrivateMode || isPrivateMode} 
          />
        </div>
      </div>
    </div>
  );
}