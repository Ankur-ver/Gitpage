import React from 'react';
import { Link } from 'react-router-dom';
import { ExclamationCircleIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';

interface Props {
  message  : string;
  username?: string;
}

const RepositoryError: React.FC<Props> = ({ message, username }) => (
  <div className="min-h-screen bg-bg-primary pt-14 flex items-center justify-center">
    <div className="text-center max-w-md px-4">
      <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20
                      flex items-center justify-center mx-auto mb-4">
        <ExclamationCircleIcon className="w-8 h-8 text-red-400" />
      </div>
      <h2 className="text-xl font-bold text-text-primary mb-2">
        Repository not found
      </h2>
      <p className="text-text-muted text-sm mb-6">{message}</p>
      <div className="flex items-center justify-center gap-3">
        <Link
          to={username ? `/${username}` : '/'}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-bg-card
                     border border-[#2a2a3a] text-text-secondary hover:text-text-primary
                     text-sm transition-colors"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          {username ? `Back to ${username}` : 'Go Home'}
        </Link>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500
                     text-white text-sm transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  </div>
);

export default RepositoryError;