import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  fullScreen?: boolean;
  message?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  fullScreen = false,
  message 
}) => {
  const sizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center z-50 bg-slate-50">
        <div className="relative">
          <div className="w-20 h-20 bg-brand rounded-2xl flex items-center justify-center animate-pulse-slow">
            <svg 
              className="w-10 h-10 text-white" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="1.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="3" y1="9" x2="21" y2="9" />
              <line x1="3" y1="15" x2="21" y2="15" />
              <line x1="9" y1="3" x2="9" y2="21" />
              <line x1="15" y1="9" x2="15" y2="21" />
              <circle cx="6" cy="6" r="1.5" fill="currentColor" />
            </svg>
          </div>
          <div className="absolute -bottom-2 -right-2">
            <Loader2 className="w-8 h-8 text-brand animate-spin" />
          </div>
        </div>
        {message && (
          <p className="mt-6 text-sm animate-pulse text-slate-500">
            {message}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-2">
      <Loader2 className={`${sizeClasses[size]} text-brand animate-spin`} />
      {message && (
        <span className="text-sm text-slate-500">
          {message}
        </span>
      )}
    </div>
  );
};

export const NoteCardSkeleton: React.FC = () => {
  return (
    <div className="rounded-xl border overflow-hidden animate-pulse bg-white border-slate-200">
      <div className="aspect-video skeleton bg-slate-200" />
      <div className="p-4 space-y-3">
        <div className="h-5 rounded skeleton w-3/4 bg-slate-200" />
        <div className="h-4 rounded skeleton w-full bg-slate-200" />
        <div className="h-4 rounded skeleton w-2/3 bg-slate-200" />
        <div className="flex items-center gap-2 pt-2">
          <div className="h-3 rounded skeleton w-20 bg-slate-200" />
          <div className="h-3 rounded skeleton w-24 bg-slate-200" />
        </div>
      </div>
    </div>
  );
};

export const NotesGridSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => (
  <div className="masonry-grid">
    {Array.from({ length: count }).map((_, i) => (
      <NoteCardSkeleton key={i} />
    ))}
  </div>
);

export default LoadingSpinner;
