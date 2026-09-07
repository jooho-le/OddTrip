import { Link, NavLink, Outlet } from 'react-router-dom';

const navigation = [
  { to: '/admin', label: '대시보드', end: true },
  { to: '/admin/users', label: '회원' },
  { to: '/admin/trips', label: '여행' },
  { to: '/admin/attractions', label: '관광지' },
  { to: '/admin/tti', label: 'TTI' },
  { to: '/admin/operations', label: '운영' },
];

export function AdminLayout() {
  return <div className="app-shell admin-shell"><div className="utility-bar"><div className="utility-inner"><span>ODDTRIP ADMIN</span><span>정적 관리자 화면</span></div></div><header className="header"><div className="header-main"><Link className="brand" to="/admin"><i>odd</i>trip<small>ADMIN CONSOLE · DEMO DATA</small></Link><nav className="global-nav admin-nav" aria-label="관리자 메뉴">{navigation.map((item) => <NavLink key={item.to} to={item.to} end={item.end}>{item.label}</NavLink>)}</nav><div className="header-tools"><span className="demo-label">DEMO DATA</span><Link className="line-btn" to="/">서비스로</Link></div></div></header><main className="container"><div className="admin-demo-banner"><b>관리자 데이터는 모두 정적 데모입니다.</b><span>실제 관리자 API가 연결되기 전에는 운영 상태로 해석할 수 없습니다.</span></div><Outlet /></main></div>;
}
