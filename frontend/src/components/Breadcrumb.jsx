import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

const Breadcrumb = ({ crumbs }) => {
  if (!crumbs || crumbs.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ul role="list" className="flex items-center gap-1.5 text-[11px] font-mono text-slate-500">
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;

          return (
            <li key={crumb.label} className="flex items-center gap-1.5">
              {isLast ? (
                <span className="text-slate-300" aria-current="page">
                  {crumb.label}
                </span>
              ) : (
                <Link
                  to={crumb.to || '#'}
                  className="hover:text-accent transition-colors"
                >
                  {crumb.label}
                </Link>
              )}

              {!isLast && (
                <ChevronRight size={12} className="text-slate-600 flex-shrink-0" />
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default Breadcrumb;
