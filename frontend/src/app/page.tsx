'use client';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ChatLayout from '@/components/ChatLayout';
import MessageList from '@/components/MessageList';
import InputBar from '@/components/InputBar';
import Navbar from '@/components/Navbar';

export default function Home() {
  const apiURL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
  const [messages, setMessages] = useState<{fromUser:boolean; text:string}[]>([]);
  const fullIntro = "hi, i'm ishaan";
  const [typedIntro, setTypedIntro] = useState("");
  const [showIntro, setShowIntro] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let idx = 0;
    const interval = setInterval(() => {
      setTypedIntro(fullIntro.slice(0, idx + 1));
      idx++;
      if (idx >= fullIntro.length) clearInterval(interval);
    }, 100); // typing speed: 100ms per character
    return () => clearInterval(interval);
  }, []);

  // Scroll to show the newest message at the top of the viewport
  useEffect(() => {
    if (scrollRef.current && messages.length > 0) {
      // Calculate the position to show the newest message at the top
      const lastMessageIndex = messages.length - 1;
      const messageElements = scrollRef.current.querySelectorAll('[data-message]');
      
      if (messageElements.length > 0) {
        const lastMessage = messageElements[lastMessageIndex] as HTMLElement;
        if (lastMessage) {
          // Scroll to position the newest message at the top of the viewport
          const offsetTop = lastMessage.offsetTop - 100; // 100px from top for padding
          scrollRef.current.scrollTop = offsetTop;
        }
      }
    }
  }, [messages]);

  const send = async (text: string) => {
    setShowIntro(false);
    setMessages([...messages, { fromUser: true, text }]);

    const res = await fetch(apiURL + '/chat', {
      method: 'POST',
      headers: {
        'Content-Type':'application/json',
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`
      },
      body: JSON.stringify({question: text})
    });
    console.log(res);
    const { answer } = await res.json();
    setMessages(prev => [...prev, { fromUser: false, text: answer }]);
  };

  return (
    <div className="h-screen flex flex-col">
      <Navbar onAvatarClick={() => {
        /* TODO: navigate to admin page */
      }} />
      
      {/* Scrollable content area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto"
      >
        <div className="px-4 py-2 min-h-full flex flex-col">
          <AnimatePresence>
            {showIntro && (
              <motion.div
                key="intro"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex items-center justify-center text-center text-2xl font-semibold"
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

      {/* Fixed input bar at bottom */}
      <div className="fixed bottom-3 left-0 right-0 px-4 py-2 flex justify-center">
        <div className="w-full max-w-2xl">
          <InputBar onSend={send} onInput={() => setShowIntro(false)} />
        </div>
      </div>
    </div>
  );
}