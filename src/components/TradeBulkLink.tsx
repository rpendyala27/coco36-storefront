import { NavLink } from 'react-router-dom';

/** Outlined header control. Same destination as the old Trade text link. */
export function TradeBulkLink({ className = '' }: { className?: string }) {
  return (
    <NavLink
      to="/trade"
      className={`btn-ghost !px-3 !py-1.5 text-xs md:text-sm whitespace-nowrap ${className}`}
    >
      Trade & bulk
    </NavLink>
  );
}
