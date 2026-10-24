import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ManagementShell from '../../components/management/ManagementShell';
import { DiagramCaption } from '../../components/management/ManagementBits';
import ClassListTable from '../../components/classes/ClassListTable';
import { CLASS_STATUS } from '../../components/classes/classUtils';
import { getManagementClasses, getSports } from '../../api/managementApi';

const selectClass =
  'w-full sm:w-44 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-[#e31b23] cursor-pointer';

export default function ClassListPage() {
  const [classes, setClasses] = useState([]);
  const [sports, setSports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSport, setSelectedSport] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    getSports('1').then((data) => setSports(Array.isArray(data) ? data : [])).catch(() => setSports([]));
  }, []);

  useEffect(() => {
    let ignore = false;
    getManagementClasses({ sportId: selectedSport, status: selectedStatus })
      .then((data) => {
        if (ignore) return;
        setClasses(Array.isArray(data) ? data : []);
        setError('');
      })
      .catch((err) => {
        if (!ignore) setError(err.message || 'Không tải được danh sách lớp học.');
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [selectedSport, selectedStatus, reloadKey]);

  const changeFilter = (setter) => (event) => {
    setLoading(true);
    setter(event.target.value);
  };

  const reload = () => {
    setLoading(true);
    setReloadKey((key) => key + 1);
  };

  const keyword = searchTerm.toLowerCase();
  const filteredClasses = classes.filter(
    (item) =>
      item.name?.toLowerCase().includes(keyword) ||
      item.sportName?.toLowerCase().includes(keyword) ||
      item.coachName?.toLowerCase().includes(keyword),
  );

  return (
    <ManagementShell breadcrumb={[{ label: 'Bảng điều khiển', to: '/quan-ly' }, { label: 'Lớp học' }]}>
      {/* HEADER BANNER */}
      <section className="relative overflow-hidden rounded-3xl bg-[#12141d] px-6 py-8 text-white sm:px-8">
        <div
          className="pointer-events-none absolute inset-y-0 right-0 hidden w-[46%] bg-[#e31b23] sm:block"
          style={{ clipPath: 'polygon(22% 0, 100% 0, 100% 100%, 0 100%)' }}
        />
        <div className="relative max-w-xl">
          <span className="inline-block bg-[#e31b23] px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-white -skew-x-12">
            <span className="inline-block skew-x-12">Class Catalog</span>
          </span>
          <h1 className="mt-4 text-3xl font-black uppercase italic leading-none tracking-tight sm:text-5xl">
            Danh mục lớp học
          </h1>
          <p className="mt-4 max-w-md text-sm leading-6 text-white/75 sm:text-base">
            Quản lý thông tin khóa học, môn học, Huấn luyện viên phụ trách, phòng tập và lịch học chi tiết.
          </p>
          <DiagramCaption>
            <span className="text-white/40">Sports Classes & Schedules</span>
          </DiagramCaption>
        </div>
      </section>

      {/* BỘ LỌC TÌM KIẾM */}
      <div className="mt-6 flex flex-col lg:flex-row items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
          <select value={selectedSport} onChange={changeFilter(setSelectedSport)} className={selectClass}>
            <option value="">Tất cả môn học</option>
            {sports.map((sport) => (
              <option key={sport.id} value={sport.id}>
                {sport.name}
              </option>
            ))}
          </select>
          <select value={selectedStatus} onChange={changeFilter(setSelectedStatus)} className={selectClass}>
            <option value="">Mọi trạng thái</option>
            {Object.entries(CLASS_STATUS).map(([value, status]) => (
              <option key={value} value={value}>
                {status.label}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Tìm theo tên lớp, môn học, HLV..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="w-full sm:w-60 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium outline-none focus:border-[#e31b23]"
          />
        </div>

        <div className="flex w-full lg:w-auto gap-2">
          <button
            type="button"
            onClick={reload}
            disabled={loading}
            className="flex-1 lg:flex-none bg-slate-900 hover:bg-slate-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-colors cursor-pointer disabled:opacity-60"
          >
            🔄 Làm mới
          </button>
          <Link
            to="/quan-ly/lop-hoc/moi"
            className="flex-1 lg:flex-none text-center bg-[#e31b23] hover:bg-[#c4131a] text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-colors"
          >
            ➕ Tạo lớp mới
          </Link>
        </div>
      </div>

      {error && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-bold">⚠️ {error}</div>
      )}

      {/* DANH SÁCH BẢNG LỚP HỌC */}
      <div className="mt-6 bg-white rounded-3xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-black text-slate-900 uppercase">Danh sách lớp học ({filteredClasses.length})</h2>
        </div>

        {loading ? (
          <div className="py-16 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#e31b23] border-t-transparent mb-2" />
            <p className="text-xs font-bold text-gray-400">Đang tải danh sách lớp học...</p>
          </div>
        ) : filteredClasses.length > 0 ? (
          <ClassListTable
            classes={filteredClasses}
            renderAction={(item) => (
              <Link
                to={`/quan-ly/lop-hoc/${item.id}/lich`}
                className="inline-block bg-slate-900 hover:bg-[#e31b23] text-white font-bold text-[11px] px-3.5 py-1.5 rounded-xl transition-colors"
              >
                📅 Xem lịch
              </Link>
            )}
          />
        ) : (
          <div className="py-16 text-center text-xs font-bold text-gray-400">Không tìm thấy lớp học nào phù hợp.</div>
        )}
      </div>

    </ManagementShell>
  );
}
