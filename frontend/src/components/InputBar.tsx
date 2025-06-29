import React, { useState } from 'react';

type InputBarProps = {
  onSend: (text: string) => void;
  onInput?: () => void;
  disabled?: boolean;
};

export default function InputBar({ onSend, onInput, disabled }: InputBarProps) {
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onInput?.();
      onSend(input);
      setInput('');
    }
  };
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`flex items-center space-x-2 bg-white/10 backdrop-blur-md rounded-full px-3 py-2 ${
        disabled ? 'opacity-50 pointer-events-none' : ''
      }`}
    >
      <input
        disabled={disabled}
        className="flex-1 bg-transparent outline-none text-gray-50"
        placeholder="Type your message…"
        value={input}
        onChange={(e) => {
          setInput(e.target.value);
          onInput?.();
        }}
        onKeyDown={handleKeyDown}
      />
      <button
        type="submit"
        disabled={disabled}
        className="text-xl"
      >
        ➤
      </button>
    </form>
  );
}