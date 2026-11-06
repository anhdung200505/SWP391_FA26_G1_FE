import { useState } from 'react';
import { PublishContext } from './studentShell';
import { Outlet, useLocation } from 'react-router-dom';
import StudentDashboardHeader from '../StudentDashboardHeader';
import Footer from '../Footer';
import { studentWorkspaceItems, useHasClassRegistration } from './studentNav';

export default function StudentLayout() {
  const { pathname } = useLocation();
  const hasClass = useHasClassRegistration();
  const [extra, setExtra] = useState(null);

  const items = extra?.items || studentWorkspaceItems(hasClass);

  return (
    <PublishContext.Provider value={setExtra}>
      <div className="min-h-screen flex flex-col bg-slate-100 text-slate-900">
        {/* Header dạng Top Bar vuông vức chuyên nghiệp với hiệu ứng trượt đỏ */}
        <StudentDashboardHeader
          activeId={extra?.activeId}
          onSelect={extra?.onSelect}
          items={items}
        />

        {/* Nội dung chính tràn chiều rộng chuẩn Dashboard */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div key={pathname} className="page-enter">
            <Outlet />
          </div>
        </main>

        <Footer />
      </div>
    </PublishContext.Provider>
  );
}