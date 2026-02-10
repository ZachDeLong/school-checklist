import { memo } from 'react';
import './FilterBar.css';

export type SourceFilter = 'all' | 'canvas' | 'manual';

interface FilterBarProps {
  sourceFilter: SourceFilter;
  setSourceFilter: (filter: SourceFilter) => void;
  hideCompleted: boolean;
  setHideCompleted: (hide: boolean) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

function FilterBar({
  sourceFilter,
  setSourceFilter,
  hideCompleted,
  setHideCompleted,
  searchQuery,
  setSearchQuery,
}: FilterBarProps) {
  return (
    <div className="filter-bar">
      <div className="filter-chips">
        <button
          className={`filter-chip ${sourceFilter === 'all' ? 'active' : ''}`}
          onClick={() => setSourceFilter('all')}
        >
          All
        </button>
        <button
          className={`filter-chip ${sourceFilter === 'canvas' ? 'active' : ''}`}
          onClick={() => setSourceFilter('canvas')}
        >
          Canvas
        </button>
        <button
          className={`filter-chip ${sourceFilter === 'manual' ? 'active' : ''}`}
          onClick={() => setSourceFilter('manual')}
        >
          Personal
        </button>
      </div>

      <div className="search-wrapper">
        <svg viewBox="0 0 24 24" fill="none" className="search-icon">
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2"/>
          <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        <input
          type="text"
          className="search-input"
          placeholder="Search tasks..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button
            className="search-clear"
            onClick={() => setSearchQuery('')}
            aria-label="Clear search"
          >
            ×
          </button>
        )}
      </div>

      <label className="hide-completed-toggle">
        <input
          type="checkbox"
          checked={hideCompleted}
          onChange={(e) => setHideCompleted(e.target.checked)}
        />
        <span className="toggle-label">Hide done</span>
      </label>
    </div>
  );
}

export default memo(FilterBar);
