import { useEffect } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useUiNoticeStore } from '../shared/model/uiNoticeStore';

const navigation = [
  { to: '/admin', label: '대시보드', end: true },
  { to: '/admin/users', label: '회원' },
  { to: '/admin/trips', label: '여행' },
  { to: '/admin/attractions', label: '관광지' },
  { to: '/admin/tti', label: 'TTI' },
  { to: '/admin/operations', label: '운영' },
];

export function AdminLayout() {
  const showDemoOnce = useUiNoticeStore((state) => state.showDemoOnce);

  useEffect(() => {
    showDemoOnce('admin-demo', '관리자 화면의 수치와 목록은 현재 예시 데이터입니다. 운영 상태로 해석하거나 실제 관리 작업으로 사용하지 마세요.');
  }, [showDemoOnce]);

  return (
    <div className="app-shell admin-shell">
      <div className="utility-bar"><div className="utility-inner"><span>ODDTRIP ADMIN</span></div></div>
      <header className="header">
        <div className="header-main">
          <Link className="brand" to="/admin"><i>odd</i>trip<small>ADMIN CONSOLE</small></Link>
          <nav className="global-nav admin-nav" aria-label="관리자 메뉴">{navigation.map((item) => <NavLink key={item.to} to={item.to} end={item.end}>{item.label}</NavLink>)}</nav>
          <div className="header-tools"><Link className="line-btn" to="/">서비스로</Link></div>
        </div>
      </header>
      <main className="container"><Outlet /></main>
    </div>
  );
}
