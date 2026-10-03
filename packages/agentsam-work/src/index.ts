import React from 'react';
import { WorkItem } from '@inneranimalmedia/agentsam-work-graph';

export interface ProjectCardProps {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'archived' | 'planned';
  workItemsCount: number;
  completedItemsCount: number;
  targetRepo: string;
  onClick?: () => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  name,
  description,
  status,
  workItemsCount,
  completedItemsCount,
  targetRepo,
  onClick,
}) => {
  const progressPercent = workItemsCount > 0 ? Math.round((completedItemsCount / workItemsCount) * 100) : 0;

  return (
    <div
      onClick={onClick}
      className="p-4 rounded-xl border border-gray-800 bg-[#0c101a] hover:border-gray-700 transition-all cursor-pointer space-y-3"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-sm text-gray-200">{name}</h3>
        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
          status === 'active' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-gray-800 text-gray-400'
        }`}>
          {status}
        </span>
      </div>

      <p className="text-xs text-gray-400 line-clamp-2">{description}</p>

      <div className="space-y-1">
        <div className="flex items-center justify-between text-[11px] font-mono text-gray-500">
          <span>Progress: {progressPercent}%</span>
          <span>{completedItemsCount}/{workItemsCount} items</span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-gray-800 overflow-hidden">
          <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      <div className="text-[10px] text-gray-500 font-mono truncate">
        Repo: <span className="text-gray-400">{targetRepo}</span>
      </div>
    </div>
  );
};
