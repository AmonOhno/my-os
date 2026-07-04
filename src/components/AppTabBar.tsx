import { NavLink } from 'react-router-dom';

export function AppTabBar() {
  return (
    <nav className="tab-bar">
      <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
        きょう
      </NavLink>
      <NavLink to="/connections" className={({ isActive }) => (isActive ? 'active' : '')}>
        つながり
      </NavLink>
    </nav>
  );
}
