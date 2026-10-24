import { useEffect, useMemo, useState } from 'react';
import ClassListTable from './ClassListTable';
import ClassScheduleView from './ClassScheduleView';
import { getClasses, getSports } from '../../api/managementApi';

const selectClass =
  'w-full sm:w-44 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-[#e31b23] cursor-pointer';

function todayIso() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

// Danh mục công khai không có status lớp nên suy ra từ ngày.
function withStatus(item, today) {
  let status = 'ongoing';
  if (item.startDate > today) status = 'open';
  else if (item.endDate < today) status = 'closed';
  return { ...item, status };
}

const loadClasses = () =>
  getClasses('1').then((data) => {
    const today = todayIso();
    return (Array.isArray(data) ? data : []).map((item) => withStatus(item, today));
  });

// Lễ tân: bảng lớp rồi Xem lịch từng lớp, chỉ đổi HLV khi HLV bận.
export default function ReceptionClassSchedule() {
  const [classes, setClasses] = useState([]);
  const [sports, setSports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSport, setSelectedSport] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewingId, setViewingId] = useState('');

  useEffect(() => {
    getSports('1').then((data) => setSports(Array.isArray(data) ? data : [])).catch(() => setSports([]));
    loadClasses()
      .then(setClasses)
      .catch((err) => setError(err.message || 'Không tải được danh sách lớp học.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const keyword = searchTerm.toLowerCase();
    return classes.filter(
      (item) =>
        (!selectedSport || item.sportId === selectedSport) &&
        (item.name?.toLowerCase().includes(keyword) ||
          item.sportName?.toLowerCase().includes(keyword) ||
          item.coachName?.toLowerCase().includes(keyword)),
    );
  }, [classes, selectedSport, searchTerm]);

  if (viewingId) {
    return (
      <ClassScheduleView
        classId={viewingId}
        mode="reception"
        loadClasses={loadClasses}
        back={
          <button
            type="button"
            onClick={() => setViewingId('')}
            className="inline-block text-xs font-bold text-slate-500 hover:text-[#e31b23] transition-colors cursor-pointer"
          >
            ← Quay lại danh sách
          </button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
        <select value={selectedSport} onChange={(event) => setSelectedSport(event.target.value)} className={selectClass}>
          <option value="">Tất cả môn học</option>
          {sports.map((sport) => (
            <option key={sport.id} value={sport.id}>
              {sport.name}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Tìm theo tên lớp, môn học, HLV..."
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          className="w-full sm:w-72 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium outline-none focus:border-[#e31b23]"
        />
        <p className="sm:ml-auto text-[11px] font-bold text-slate-400">Đổi HLV khi HLV phụ trách bận. Học viên trong lớp nhận thông báo.</p>
      </div>

      {error && <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-bold">⚠️ {error}</div>}

      <div className="bg-white rounded-3xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-black text-slate-900 uppercase">Danh sách lớp học ({filtered.length})</h2>
        </div>
        {loading ? (
          <div className="py-16 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#e31b23] border-t-transparent mb-2" />
            <p className="text-xs font-bold text-gray-400">Đang tải danh sách lớp học...</p>
          </div>
        ) : filtered.length > 0 ? (
          <ClassListTable
            classes={filtered}
            renderAction={(item) => (
              <button
                type="button"
                onClick={() => setViewingId(item.id)}
                className="bg-slate-900 hover:bg-[#e31b23] text-white font-bold text-[11px] px-3.5 py-1.5 rounded-xl transition-colors cursor-pointer"
              >
                📅 Xem lịch
              </button>
            )}
          />
        ) : (
          <div className="py-16 text-center text-xs font-bold text-gray-400">Không tìm thấy lớp học nào phù hợp.</div>
        )}
      </div>
    </div>
  );
}
