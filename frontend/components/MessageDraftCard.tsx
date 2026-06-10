'use client';

import React, { useState, useRef } from 'react';
import { Send, MessageSquare, Mail, Smartphone, Info } from 'lucide-react';

interface MessageDraftCardProps {
  initialCampaignName: string;
  initialTemplate: string;
  channel: 'whatsapp' | 'email' | 'sms';
  onLaunch: (campaignData: { name: string; template: string; channel: string }) => void;
  isLaunching: boolean;
}

export default function MessageDraftCard({
  initialCampaignName,
  initialTemplate,
  channel,
  onLaunch,
  isLaunching
}: MessageDraftCardProps) {
  const [campaignName, setCampaignName] = useState(initialCampaignName);
  const [template, setTemplate] = useState(initialTemplate);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Helper to insert personalisation tags at cursor position
  const insertTag = (tag: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const startPos = textarea.selectionStart;
    const endPos = textarea.selectionEnd;
    const text = textarea.value;

    const newText = text.substring(0, startPos) + tag + text.substring(endPos);
    setTemplate(newText);

    // Reset cursor position after insert
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = startPos + tag.length;
    }, 0);
  };

  const handleLaunchClick = () => {
    if (!campaignName.trim()) return alert('Please enter a campaign name');
    if (!template.trim()) return alert('Please enter a message template');
    
    onLaunch({
      name: campaignName,
      template,
      channel
    });
  };

  // Get channel icon/color schema
  const getChannelConfig = () => {
    switch (channel) {
      case 'whatsapp':
        return {
          icon: <MessageSquare className="w-4 h-4 text-emerald-400" />,
          label: 'WhatsApp Gateway',
          style: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
        };
      case 'email':
        return {
          icon: <Mail className="w-4 h-4 text-cyan-400" />,
          label: 'Email SMTP',
          style: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
        };
      case 'sms':
        return {
          icon: <Smartphone className="w-4 h-4 text-amber-400" />,
          label: 'SMS Provider',
          style: 'bg-amber-500/10 text-amber-400 border-amber-500/20'
        };
    }
  };

  const channelConfig = getChannelConfig();

  return (
    <div className="glass-card rounded-2xl border border-slate-800 p-5 space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <span className="text-xs font-semibold text-brand-400 uppercase tracking-wider">Campaign Details & Creative</span>
        </div>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${channelConfig.style}`}>
          {channelConfig.icon}
          {channelConfig.label}
        </span>
      </div>

      {/* Campaign Name Input */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Campaign Name</label>
        <input
          type="text"
          value={campaignName}
          onChange={(e) => setCampaignName(e.target.value)}
          className="w-full px-3.5 py-2 rounded-xl text-sm glass-input font-medium"
          placeholder="e.g. June Retention Offer"
        />
      </div>

      {/* Message Template Text Area */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Message Template</label>
          <span className="text-xs text-brand-400 flex items-center gap-1">
            <Info className="w-3.5 h-3.5" /> Use tags below to personalize
          </span>
        </div>
        
        <textarea
          ref={textareaRef}
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
          rows={4}
          className="w-full px-3.5 py-2.5 rounded-xl text-sm glass-input resize-none leading-relaxed font-normal"
          placeholder="Type message template here..."
        />
      </div>

      {/* Tag Insertion Buttons */}
      <div className="space-y-1.5">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide block">Insert Personalization Tags</span>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => insertTag('{name}')}
            className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
          >
            👤 Customer Name ({'{name}'})
          </button>
          <button
            type="button"
            onClick={() => insertTag('{city}')}
            className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
          >
            📍 City ({'{city}'})
          </button>
          <button
            type="button"
            onClick={() => insertTag('{last_product}')}
            className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
          >
            🛍️ Last Product Bought ({'{last_product}'})
          </button>
        </div>
      </div>

      {/* Action Firing Panel */}
      <div className="pt-2 flex justify-end">
        <button
          type="button"
          onClick={handleLaunchClick}
          disabled={isLaunching}
          className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-500/20 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-brand-500/30 transition duration-200"
        >
          {isLaunching ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Launching Campaign...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Launch Campaign Now
            </>
          )}
        </button>
      </div>
    </div>
  );
}
