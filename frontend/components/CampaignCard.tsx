'use client';

import React, { useState } from 'react';
import { Calendar, ChevronDown, ChevronUp, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';
import MetricBar from './MetricBar';

export interface CampaignData {
  id: string;
  name: string;
  segmentQuery: any;
  messageTemplate: string;
  channel: string;
  status: string;
  createdAt: string;
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  totalOpened: number;
  totalClicked: number;
}

interface CampaignCardProps {
  campaign: CampaignData;
  aiSummary?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export default function CampaignCard({ campaign, aiSummary, onRefresh, isRefreshing }: CampaignCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const formattedDate = new Date(campaign.createdAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const getStatusBadge = () => {
    switch (campaign.status) {
      case 'RUNNING':
        return (
          <span className="relative inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 ping-slow absolute left-2.5" />
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            <span className="ml-1.5">Running</span>
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Completed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            Draft
          </span>
        );
    }
  };

  const getChannelLabel = () => {
    return campaign.channel.toUpperCase();
  };

  return (
    <div className="glass-card rounded-2xl border border-slate-800 p-5 space-y-4">
      {/* Header Info */}
      <div className="flex justify-between items-start gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold text-white leading-tight">{campaign.name}</h3>
            <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-bold text-slate-400 border border-slate-700">
              {getChannelLabel()}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400 text-xs">
            <Calendar className="w-3.5 h-3.5" />
            <span>{formattedDate}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {campaign.status === 'RUNNING' && onRefresh && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRefresh();
              }}
              disabled={isRefreshing}
              className="p-2 rounded-lg bg-slate-850 hover:bg-slate-800 text-slate-450 border border-slate-800 hover:text-white transition disabled:opacity-50"
              title="Refresh stats"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          )}
          {getStatusBadge()}
        </div>
      </div>

      {/* Target Description */}
      <div className="text-sm bg-slate-950/20 px-3.5 py-2.5 border border-slate-850 rounded-xl">
        <span className="text-xs text-slate-400 block font-semibold uppercase tracking-wide mb-1">Target Segment</span>
        <p className="text-slate-200 font-medium text-xs">
          {campaign.segmentQuery?.description || 'All customers'}
        </p>
      </div>

      {/* Summary Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
        <div className="bg-slate-950/15 border border-slate-900 rounded-xl p-3 text-center">
          <span className="text-xs text-slate-450 font-semibold block">Total Recipients</span>
          <span className="text-xl font-extrabold text-white mt-1 block">{campaign.totalSent}</span>
        </div>
        <div className="bg-slate-950/15 border border-slate-900 rounded-xl p-3 text-center">
          <span className="text-xs text-slate-450 font-semibold block">Delivered</span>
          <span className="text-xl font-extrabold text-emerald-400 mt-1 block">{campaign.totalDelivered}</span>
        </div>
        <div className="bg-slate-950/15 border border-slate-900 rounded-xl p-3 text-center">
          <span className="text-xs text-slate-450 font-semibold block">Open Rate</span>
          <span className="text-xl font-extrabold text-violet-400 mt-1 block">
            {campaign.totalSent > 0 ? ((campaign.totalOpened / campaign.totalSent) * 100).toFixed(1) : '0'}%
          </span>
        </div>
        <div className="bg-slate-950/15 border border-slate-900 rounded-xl p-3 text-center">
          <span className="text-xs text-slate-450 font-semibold block">Click Rate</span>
          <span className="text-xl font-extrabold text-brand-400 mt-1 block">
            {campaign.totalSent > 0 ? ((campaign.totalClicked / campaign.totalSent) * 100).toFixed(1) : '0'}%
          </span>
        </div>
      </div>

      {/* Toggle Expansion Link */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-brand-400 hover:text-brand-300 py-1 border-t border-slate-900 pt-3 transition"
      >
        <span>{isExpanded ? 'Hide Performance Details' : 'View Detailed Performance'}</span>
        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {/* Expanded Stats & AI summary */}
      {isExpanded && (
        <div className="space-y-5 pt-3 border-t border-slate-900 animate-slideDown">
          {/* Progress Bars */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Funnels & Conversion</h4>
            
            <MetricBar
              label="Successful Delivery"
              value={campaign.totalDelivered}
              total={campaign.totalSent}
              colorClass="bg-emerald-500"
            />
            <MetricBar
              label="Open Engagement"
              value={campaign.totalOpened}
              total={campaign.totalSent}
              colorClass="bg-violet-500"
            />
            <MetricBar
              label="Link Clicks (CTR)"
              value={campaign.totalClicked}
              total={campaign.totalSent}
              colorClass="bg-brand-500"
            />
            <MetricBar
              label="Bounces & Failures"
              value={campaign.totalFailed}
              total={campaign.totalSent}
              colorClass="bg-rose-500"
            />
          </div>

          {/* AI generated Campaign Advisor Summary */}
          {aiSummary && (
            <div className="gradient-bg rounded-xl border border-brand-500/20 p-4 space-y-2">
              <div className="flex items-center gap-2 text-brand-300 font-bold text-xs uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-pink-400 animate-pulse" />
                AI Campaign Advisor Insights
              </div>
              <p className="text-sm text-slate-200 leading-relaxed italic">
                "{aiSummary}"
              </p>
            </div>
          )}

          {/* Message template details */}
          <div className="space-y-1.5">
            <span className="text-xs text-slate-450 font-bold uppercase tracking-wider block">Dispatched Template</span>
            <div className="bg-slate-950 border border-slate-900 rounded-xl p-3.5 text-xs text-slate-350 whitespace-pre-wrap leading-relaxed font-mono">
              {campaign.messageTemplate}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
