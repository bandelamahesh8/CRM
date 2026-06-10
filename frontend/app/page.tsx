'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sparkles, BarChart2, Send, CornerDownLeft, RefreshCw, MessageSquare, AlertCircle } from 'lucide-react';
import ChatWindow, { ChatMessage } from '../components/ChatWindow';
import SegmentPreviewCard from '../components/SegmentPreviewCard';
import MessageDraftCard from '../components/MessageDraftCard';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function ChatPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Segment Action States
  const [activeAction, setActiveAction] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState<{ count: number | null; sample: any[] }>({
    count: null,
    sample: []
  });
  const [isLaunching, setIsLaunching] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  // Send initial welcome message
  useEffect(() => {
    setMessages([
      {
        id: 'welcome',
        sender: 'ai',
        text: "Hi! I'm your Xeno CRM assistant. 🚀\n\nDescribe the audience segment you'd like to target in plain English, and I'll build the segment filters, preview matching recipients, draft a personalized template, and launch your campaign.\n\nWhat are you planning today?"
      }
    ]);
  }, []);

  // Fetch segment audience preview numbers & samples
  const fetchSegmentPreview = async (filters: any) => {
    setPreviewLoading(true);
    setErrorText(null);
    try {
      const queryParams = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined) {
          queryParams.append(key, String(filters[key]));
        }
      });

      const res = await fetch(`${API_URL}/api/segments/preview?${queryParams.toString()}`);
      if (!res.ok) throw new Error('Failed to load segment preview');
      
      const data = await res.json();
      setPreviewData({
        count: data.count,
        sample: data.sample
      });
    } catch (err: any) {
      console.error('Error fetching preview:', err);
      setErrorText('Could not load segment preview. Verify backend is running.');
    } finally {
      setPreviewLoading(false);
    }
  };

  // Submit chat message to Express backend
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;

    const userMsgText = inputText.trim();
    setInputText('');
    setErrorText(null);

    // 1. Add user message to state
    const userMsgId = String(Date.now());
    const newMessages: ChatMessage[] = [
      ...messages,
      { id: userMsgId, sender: 'user', text: userMsgText }
    ];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      // Get API chat history
      const history = newMessages
        .filter(m => m.id !== 'welcome')
        .map(m => ({
          role: m.sender === 'user' ? 'user' : 'assistant',
          content: m.text
        }))
        .slice(-6); // Only send last few turns for context

      const res = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsgText, history })
      });

      if (!res.ok) throw new Error('API server down');

      const data = await res.json();
      
      // 2. Append AI response
      const aiMsgId = String(Date.now() + 1);
      const aiMsg: ChatMessage = {
        id: aiMsgId,
        sender: 'ai',
        text: data.reply,
        action: data.action // Attach preview_segment action metadata
      };

      setMessages(prev => [...prev, aiMsg]);
      
      if (data.action && data.action.type === 'preview_segment') {
        setActiveAction(data.action.data);
        // Trigger segment preview query
        await fetchSegmentPreview(data.action.data.filters);
      } else {
        setActiveAction(null);
      }
    } catch (err: any) {
      console.error(err);
      setErrorText('Error communicating with backend. Verify the Node server is active.');
      setMessages(prev => [
        ...prev,
        {
          id: String(Date.now()),
          sender: 'ai',
          text: "I couldn't contact the database or AI server. Make sure the backend server is running on port 5000 and the PostgreSQL database is alive!"
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Trigger Campaign Launch to channel stub
  const handleLaunchCampaign = async (campaignDetails: { name: string; template: string; channel: string }) => {
    if (!activeAction) return;
    setIsLaunching(true);
    setErrorText(null);

    try {
      const res = await fetch(`${API_URL}/api/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: campaignDetails.name,
          segmentFilters: activeAction.filters,
          messageTemplate: campaignDetails.template,
          channel: campaignDetails.channel
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to launch campaign');
      }

      const responseData = await res.json();
      
      // Append AI message about launch success
      setMessages(prev => [
        ...prev,
        {
          id: String(Date.now()),
          sender: 'ai',
          text: `🎉 Success! Launched "${campaignDetails.name}" to ${responseData.totalRecipients} recipients.\n\nDelivery webhook receipts will begin processing in the background. Redirecting you to the Insights Dashboard...`
        }
      ]);

      // De-active action block
      setActiveAction(null);

      // Redirect to campaign performance dashboard after 2 seconds
      setTimeout(() => {
        router.push('/insights');
      }, 2000);

    } catch (err: any) {
      console.error('Launch failed:', err);
      setErrorText(err.message || 'Campaign launch failed.');
      alert(`Error launching campaign: ${err.message}`);
    } finally {
      setIsLaunching(false);
    }
  };

  // Render Segment Preview Card + Message Editor side by side
  const renderActionCard = (actionData: any) => {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-2 mb-4 animate-slideDown">
        <SegmentPreviewCard
          description={actionData.description}
          filters={actionData.filters}
          count={previewData.count}
          sample={previewData.sample}
          isLoading={previewLoading}
        />
        <MessageDraftCard
          initialCampaignName={actionData.campaign_name}
          initialTemplate={actionData.suggested_message}
          channel={actionData.channel}
          onLaunch={handleLaunchCampaign}
          isLaunching={isLaunching}
        />
      </div>
    );
  };

  return (
    <main className="min-h-screen flex flex-col md:flex-row bg-slate-950 font-sans">
      
      {/* Sidebar navigation */}
      <nav className="w-full md:w-64 border-b md:border-b-0 md:border-r border-slate-900 bg-slate-950/60 backdrop-blur-xl p-6 flex flex-col justify-between flex-shrink-0">
        <div className="space-y-8">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center text-white shadow-lg shadow-brand-500/20 font-bold">
              X
            </div>
            <div>
              <h1 className="text-sm font-bold text-white tracking-wide">Xeno Mini CRM</h1>
              <span className="text-[10px] text-brand-400 font-semibold uppercase tracking-wider">Candidate Portal</span>
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-3 block mb-2">Navigation</span>
            <Link
              href="/"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold bg-brand-500/10 text-brand-300 border border-brand-500/20 transition"
            >
              <MessageSquare className="w-4 h-4" />
              AI Assistant Chat
            </Link>
            <Link
              href="/insights"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent transition"
            >
              <BarChart2 className="w-4 h-4" />
              Campaign Performance
            </Link>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-900 mt-6 md:mt-0 text-center">
          <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
            Bandela Mahesh | LPU
          </p>
          <p className="text-[9px] text-slate-600 font-medium mt-0.5">
            Reg. No. 12311419
          </p>
        </div>
      </nav>

      {/* Main Content Area */}
      <section className="flex-1 flex flex-col min-h-screen relative overflow-hidden">
        {/* Top bar */}
        <header className="h-16 border-b border-slate-900 px-6 flex items-center justify-between bg-slate-950/40 backdrop-blur-md flex-shrink-0 z-10">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand-400" />
            <h2 className="text-sm font-bold text-white tracking-wide">AI Campaign Assistant</h2>
          </div>
          <Link
            href="/insights"
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-850 text-slate-200 border border-slate-800 transition"
          >
            <BarChart2 className="w-4 h-4" />
            Dashboard Insights
          </Link>
        </header>

        {/* Chat window space */}
        <div className="flex-1 relative flex flex-col justify-between">
          
          {errorText && (
            <div className="mx-6 mt-4 p-3.5 bg-rose-500/10 border border-rose-500/25 rounded-xl text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <p className="font-semibold">{errorText}</p>
            </div>
          )}

          <ChatWindow
            messages={messages}
            isLoading={isLoading}
            renderActionCard={renderActionCard}
          />

          {/* User Chat Input Pane */}
          <footer className="p-6 bg-gradient-to-t from-slate-950 to-transparent border-t border-slate-900/40 flex-shrink-0">
            <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto">
              <div className="relative flex items-center glass-panel rounded-2xl border border-slate-800 p-2 shadow-2xl">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  disabled={isLoading || isLaunching}
                  className="flex-1 bg-transparent px-4 py-2.5 text-sm text-white focus:outline-none placeholder-slate-500 disabled:opacity-50"
                  placeholder="Describe your audience or type intent here..."
                />
                
                <button
                  type="submit"
                  disabled={!inputText.trim() || isLoading || isLaunching}
                  className="w-10 h-10 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-40 disabled:hover:bg-brand-600 flex items-center justify-center text-white transition-all shadow-md shadow-brand-500/10"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <div className="flex justify-between items-center px-4 mt-2">
                <span className="text-[10px] text-slate-500 font-medium">
                  Press Enter to send. Matches cities, purchases, spend amounts, categories, and inactivity.
                </span>
                <span className="text-[10px] text-slate-500 font-semibold flex items-center gap-1">
                  <CornerDownLeft className="w-3 h-3" /> Shift + Enter for new line
                </span>
              </div>
            </form>
          </footer>
        </div>
      </section>
    </main>
  );
}
