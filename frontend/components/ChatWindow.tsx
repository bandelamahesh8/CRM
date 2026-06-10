'use client';

import React, { useEffect, useRef } from 'react';
import { User, Sparkles } from 'lucide-react';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  action?: any; // Preview segment or other actions
}

interface ChatWindowProps {
  messages: ChatMessage[];
  isLoading: boolean;
  renderActionCard?: (action: any, index: number) => React.ReactNode;
}

export default function ChatWindow({ messages, isLoading, renderActionCard }: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 max-h-[calc(100vh-220px)]">
      {messages.length === 0 && (
        <div className="h-full flex flex-col items-center justify-center text-center space-y-4 max-w-md mx-auto mt-12">
          <div className="w-16 h-16 rounded-2xl bg-brand-500/10 flex items-center justify-center text-brand-400 border border-brand-500/20">
            <Sparkles className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white">Xeno AI Campaign Planner</h2>
          <p className="text-sm text-slate-400">
            Describe who you want to target in natural English. For example:<br/>
            <span className="text-brand-300 italic">"Reach customers in Mumbai who have placed at least 2 orders."</span>
          </p>
        </div>
      )}

      {messages.map((msg, index) => {
        const isUser = msg.sender === 'user';
        return (
          <div key={msg.id} className="space-y-4">
            <div className={`flex items-start gap-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
              {!isUser && (
                <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/10 text-white flex-shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
              )}

              <div
                className={`max-w-[80%] rounded-2xl px-5 py-3.5 text-sm leading-relaxed ${
                  isUser
                    ? 'bg-brand-600 text-white rounded-tr-none shadow-md shadow-brand-500/5'
                    : 'glass-panel text-slate-100 rounded-tl-none border border-slate-800'
                }`}
              >
                {/* Support newline formatting */}
                <p className="whitespace-pre-line">{msg.text}</p>
              </div>

              {isUser && (
                <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 flex-shrink-0">
                  <User className="w-5 h-5" />
                </div>
              )}
            </div>

            {/* If message has action card, render it inline */}
            {!isUser && msg.action && msg.action.type === 'preview_segment' && renderActionCard && (
              <div className="pl-13 pr-4 animate-fadeIn">
                {renderActionCard(msg.action.data, index)}
              </div>
            )}
          </div>
        );
      })}

      {isLoading && (
        <div className="flex items-start gap-4 justify-start">
          <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center text-white flex-shrink-0">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div className="glass-panel text-slate-100 rounded-2xl rounded-tl-none px-5 py-4 border border-slate-800">
            <div className="flex gap-1">
              <span className="w-2.5 h-2.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
              <span className="w-2.5 h-2.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
              <span className="w-2.5 h-2.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
            </div>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
