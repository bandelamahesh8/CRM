'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { MessageSquare, BarChart2, RefreshCw, AlertCircle } from 'lucide-react';
import CampaignCard, { CampaignData } from '../../components/CampaignCard';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function InsightsPage() {
  const [campaigns, setCampaigns] = useState<CampaignData[]>([]);
  const [summaries, setSummaries] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  // Fetch all campaigns and load their AI summaries
  const fetchCampaigns = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    setErrorText(null);
    try {
      const res = await fetch(`${API_URL}/api/campaigns`);
      if (!res.ok) throw new Error('Backend server is not reachable');
      
      const data: CampaignData[] = await res.json();
      setCampaigns(data);

      // Fetch AI summaries for each campaign in parallel
      data.forEach(async (camp) => {
        if (!summaries[camp.id]) {
          try {
            const detailRes = await fetch(`${API_URL}/api/campaigns/${camp.id}`);
            if (detailRes.ok) {
              const detailData = await detailRes.json();
              setSummaries(prev => ({
                ...prev,
                [camp.id]: detailData.summary
              }));
            }
          } catch (e) {
            console.error(`Failed to load summary for ${camp.id}`, e);
          }
        }
      });

    } catch (err: any) {
      console.error(err);
      setErrorText('Could not contact the database. Verify node backend is active.');
    } finally {
      if (!isSilent) setIsLoading(false);
    }
  }, [summaries]);

  // Initial load
  useEffect(() => {
    fetchCampaigns();
  }, []);

  // Poll for live campaign updates if any campaign is in "RUNNING" state
  useEffect(() => {
    const hasRunningCampaign = campaigns.some(camp => camp.status === 'RUNNING');
    if (!hasRunningCampaign) return;

    console.log('[Dashboard] Active running campaigns found. Starting polling interval (3s)...');
    
    const interval = setInterval(() => {
      fetchCampaigns(true); // silent refresh
    }, 3000);

    return () => clearInterval(interval);
  }, [campaigns, fetchCampaigns]);

  // Handle manual trigger refresh
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await fetchCampaigns(true);
    
    // Refetch details/summaries for running campaigns
    const runningCampaigns = campaigns.filter(c => c.status === 'RUNNING');
    for (const camp of runningCampaigns) {
      try {
        const detailRes = await fetch(`${API_URL}/api/campaigns/${camp.id}`);
        if (detailRes.ok) {
          const detailData = await detailRes.json();
          setSummaries(prev => ({
            ...prev,
            [camp.id]: detailData.summary
          }));
        }
      } catch (e) {
        console.error(e);
      }
    }
    
    setIsRefreshing(false);
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
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent transition"
            >
              <MessageSquare className="w-4 h-4" />
              AI Assistant Chat
            </Link>
            <Link
              href="/insights"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold bg-brand-500/10 text-brand-300 border border-brand-500/20 transition"
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
            <BarChart2 className="w-4 h-4 text-brand-400" />
            <h2 className="text-sm font-bold text-white tracking-wide">Campaign Performance Dashboard</h2>
          </div>
          <button
            onClick={handleManualRefresh}
            disabled={isLoading || isRefreshing}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-850 text-slate-200 border border-slate-800 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Sync Dashboard
          </button>
        </header>

        {/* Dashboard Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorText && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/25 rounded-xl text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <p className="font-semibold">{errorText}</p>
            </div>
          )}

          {/* Headline stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="glass-panel border border-slate-900 rounded-2xl p-5 flex flex-col justify-between">
              <span className="text-xs text-slate-450 font-bold uppercase tracking-wider">Total Campaigns</span>
              <span className="text-3xl font-black text-white mt-2">
                {isLoading ? '...' : campaigns.length}
              </span>
            </div>
            <div className="glass-panel border border-slate-900 rounded-2xl p-5 flex flex-col justify-between">
              <span className="text-xs text-slate-450 font-bold uppercase tracking-wider">Messages Dispatched</span>
              <span className="text-3xl font-black text-emerald-400 mt-2">
                {isLoading ? '...' : campaigns.reduce((acc, c) => acc + c.totalSent, 0)}
              </span>
            </div>
            <div className="glass-panel border border-slate-900 rounded-2xl p-5 flex flex-col justify-between">
              <span className="text-xs text-slate-450 font-bold uppercase tracking-wider">Running Engagements</span>
              <span className="text-3xl font-black text-blue-400 mt-2">
                {isLoading ? '...' : campaigns.filter(c => c.status === 'RUNNING').length}
              </span>
            </div>
          </div>

          {/* Active Campaign List */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest pl-1">Executed Campaigns</h3>
            
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2].map(i => (
                  <div key={i} className="h-44 bg-slate-900/50 border border-slate-850 animate-pulse rounded-2xl" />
                ))}
              </div>
            ) : campaigns.length > 0 ? (
              <div className="space-y-4">
                {campaigns.map((camp) => (
                  <CampaignCard
                    key={camp.id}
                    campaign={camp}
                    aiSummary={summaries[camp.id]}
                    onRefresh={handleManualRefresh}
                    isRefreshing={isRefreshing}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-slate-950/20 border border-dashed border-slate-850 rounded-2xl text-slate-550 text-sm">
                No campaigns found. Head back to the AI Assistant and start one!
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
