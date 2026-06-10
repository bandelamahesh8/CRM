'use client';

import React from 'react';
import { Users, Filter, MapPin, ShoppingBag, DollarSign, Calendar } from 'lucide-react';

interface SegmentFilters {
  min_orders?: number;
  max_orders?: number;
  inactive_days?: number;
  min_spent?: number;
  max_spent?: number;
  city?: string;
  product_category?: string;
}

interface SegmentPreviewCardProps {
  description: string;
  filters: SegmentFilters;
  count: number | null;
  sample: any[];
  isLoading: boolean;
}

export default function SegmentPreviewCard({
  description,
  filters = {},
  count,
  sample,
  isLoading
}: SegmentPreviewCardProps) {
  
  // Helper to render filter chips
  const renderFilterChips = () => {
    const chips = [];

    if (filters.city) {
      chips.push(
        <span key="city" className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <MapPin className="w-3.5 h-3.5" />
          Cities: {filters.city}
        </span>
      );
    }
    
    if (filters.product_category) {
      chips.push(
        <span key="cat" className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
          <ShoppingBag className="w-3.5 h-3.5" />
          Category: {filters.product_category}
        </span>
      );
    }

    if (filters.min_orders !== undefined || filters.max_orders !== undefined) {
      const text = filters.min_orders !== undefined && filters.max_orders !== undefined
        ? `${filters.min_orders} - ${filters.max_orders} orders`
        : filters.min_orders !== undefined ? `>= ${filters.min_orders} orders` : `<= ${filters.max_orders} orders`;

      chips.push(
        <span key="orders" className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-violet-500/10 text-violet-400 border border-violet-500/20">
          <Filter className="w-3.5 h-3.5" />
          {text}
        </span>
      );
    }

    if (filters.min_spent !== undefined || filters.max_spent !== undefined) {
      const text = filters.min_spent !== undefined && filters.max_spent !== undefined
        ? `₹${filters.min_spent} - ₹${filters.max_spent} spent`
        : filters.min_spent !== undefined ? `Spent >= ₹${filters.min_spent}` : `Spent <= ₹${filters.max_spent}`;

      chips.push(
        <span key="spent" className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <DollarSign className="w-3.5 h-3.5" />
          {text}
        </span>
      );
    }

    if (filters.inactive_days !== undefined) {
      chips.push(
        <span key="inactive" className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
          <Calendar className="w-3.5 h-3.5" />
          Inactive: {filters.inactive_days}d+
        </span>
      );
    }

    return chips.length > 0 ? (
      <div className="flex flex-wrap gap-2 pt-1">
        {chips}
      </div>
    ) : null;
  };

  return (
    <div className="glass-card rounded-2xl border border-slate-800 p-5 space-y-4">
      {/* Title & Stats */}
      <div className="flex justify-between items-start gap-4">
        <div>
          <span className="text-xs font-semibold text-brand-400 uppercase tracking-wider">Audience Segment</span>
          <h3 className="text-base font-semibold text-white mt-1 leading-snug">{description}</h3>
        </div>
        <div className="flex flex-col items-end flex-shrink-0">
          <div className="flex items-center gap-2 text-white font-bold text-2xl">
            {isLoading ? (
              <span className="h-7 w-12 bg-slate-800 animate-pulse rounded-md" />
            ) : (
              <span>{count ?? 0}</span>
            )}
            <Users className="w-5 h-5 text-brand-400" />
          </div>
          <span className="text-xs text-slate-400">matched customers</span>
        </div>
      </div>

      {/* Render chips */}
      {renderFilterChips()}

      {/* Sample Customers List */}
      <div className="pt-2">
        <h4 className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">Sample Recipients</h4>
        
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-10 bg-slate-800/40 animate-pulse rounded-lg" />
            ))}
          </div>
        ) : sample.length > 0 ? (
          <div className="overflow-hidden border border-slate-800 rounded-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900/45 text-slate-400 border-b border-slate-800">
                    <th className="py-2.5 px-3.5 font-medium">Name</th>
                    <th className="py-2.5 px-3.5 font-medium">City</th>
                    <th className="py-2.5 px-3.5 font-medium">Email</th>
                    <th className="py-2.5 px-3.5 font-medium">Phone</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50 bg-slate-950/20">
                  {sample.map((cust) => (
                    <tr key={cust.id} className="text-slate-300">
                      <td className="py-2 px-3.5 font-medium text-slate-200">{cust.name}</td>
                      <td className="py-2 px-3.5">{cust.city}</td>
                      <td className="py-2 px-3.5 text-slate-400">{cust.email}</td>
                      <td className="py-2 px-3.5 text-slate-400">{cust.phone}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="text-center py-4 bg-slate-950/20 border border-dashed border-slate-800 rounded-xl text-slate-500 text-xs">
            No customers match the current filter criteria.
          </div>
        )}
      </div>
    </div>
  );
}
