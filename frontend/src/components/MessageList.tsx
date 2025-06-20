import React from 'react';

type Message = { fromUser: boolean; text: string };

export default function MessageList({ messages }: { messages: Message[] }) {
  return (
    <div className="px-4 py-20 space-y-3 flex flex-col">
      {messages.map((m, i) => (
        <div
          key={i}
          data-message
          className={`max-w-[75%] px-4 py-2 ${
            m.fromUser
              ? 'self-end bg-blue-500/30 backdrop-blur-sm border border-blue-200/30 text-white'
              : 'self-start bg-white/10 backdrop-blur-sm border border-white/20 text-gray-100'
          } rounded-2xl`}
        >
          {m.text}
        </div>
      ))}
    </div>
  );
}