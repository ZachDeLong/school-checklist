import { memo, useMemo } from 'react';
import Dropdown, { type DropdownItem } from './Dropdown';
import './FilterBar.css';

interface FilterBarProps {
  courseFilter: string;
  setCourseFilter: (filter: string) => void;
  courses: { value: string; label: string }[];
  hideCompleted: boolean;
  setHideCompleted: (hide: boolean) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

function FilterBar({
  courseFilter,
  setCourseFilter,
  courses,
  hideCompleted,
  setHideCompleted,
  searchQuery,
  setSearchQuery,
}: FilterBarProps) {
  const dropdownOptions: DropdownItem[] = useMemo(() => [
    { value: 'all', label: 'All' },
    { value: 'school', label: 'School' },
    { value: 'personal', label: 'Personal' },
    ...(courses.length > 0 ? [{ separator: true as const }, ...courses] : []),
  ], [courses]);

  return (
    <div className="filter-bar">
      <Dropdown
        variant="compact"
        value={courseFilter}
        onChange={setCourseFilter}
        options={dropdownOptions}
        ariaLabel="Filter by course"
      />

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
