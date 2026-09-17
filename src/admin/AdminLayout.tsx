import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useTripStore } from '../entities/trip/model/tripStore';

const navigation = [
  { to: '/admin', label: '대시보드', end: true },
  { to: '/admin/users', label: '회원' },
  { to: '/admin/trips', label: '여행' },
  { to: '/admin/reports', label: '신고' },
  { to: '/admin/attractions', label: '관광지' },
  { to: '/admin/tti', label: 'TTI' },
  { to: '/admin/operations', label: '운영' },
];

export function AdminLayout() {
  const navigate = useNavigate();
  const user = useTripStore((state) => state.user);
  const logout = useTripStore((state) => state.logout);
  const signOut = () => {
    logout();
    navigate('/auth', { replace: true });
  };

  return (
    <div className="app-shell admin-shell">
      <div className="utility-bar"><div className="utility-inner"><span>ODDTRIP ADMIN · {user?.nickname ?? '운영자'}</span><button type="button" className="intro-return" onClick={signOut}>로그아웃</button></div></div>
      <header className="header">
        <div className="header-main">
          <Link className="brand" to="/admin"><i>odd</i>trip<small>ADMIN CONSOLE</small></Link>
          <nav className="global-nav admin-nav" aria-label="관리자 메뉴">{navigation.map((item) => <NavLink key={item.to} to={item.to} end={item.end}>{item.label}</NavLink>)}</nav>
          <div className="header-tools"><span className="status gray">운영자 전용</span></div>
        </div>
      </header>
      <main className="container"><Outlet /></main>
    </div>
  );
}
