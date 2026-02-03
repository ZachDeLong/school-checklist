import { memo } from 'react';
import { motion } from 'motion/react';
import './ProgressBar.css';

interface ProgressBarProps {
  completedCount: number;
  totalCount: number;
}

function ProgressBar({ completedCount, totalCount }: ProgressBarProps) {
  if (totalCount === 0) {
    return (
      <div className="progress-empty">
        Add your first task to get started
      </div>
    );
  }

  const percentage = Math.round((completedCount / totalCount) * 100);

  return (
    <div className="progress-container">
      <div className="progress-text">
        <span>{completedCount} of {totalCount} tasks done</span>
        <span className="progress-percent">{percentage}%</span>
      </div>
      <div className="progress-track">
        <motion.div
          className="progress-fill"
          animate={{ width: `${percentage}%` }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        />
      </div>
    </div>
  );
}

export default memo(ProgressBar);
