import React from 'react';

type Message = { fromUser: boolean; text: string };

export default function MessageList({ messages }: { messages: Message[] }) {
  return (
    <div className="px-4 py-20 space-y-4 flex flex-col">
      {messages.map((m, i) => (
        <div
          key={i}
          data-message
          className={`max-w-[75%] px-5 py-3 ${
            m.fromUser
              ? 'self-end bg-blue-500/20 backdrop-blur-lg border border-blue-300/20 text-white shadow-lg'
              : 'self-start bg-white/10 backdrop-blur-lg border border-white/20 text-gray-100 shadow-lg'
          } rounded-2xl hover:shadow-xl transition-all duration-200`}
        >
          {m.text}
        </div>
      ))}
    </div>
  );
}