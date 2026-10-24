import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ManagementShell from '../../components/management/ManagementShell';
import { DiagramCaption } from '../../components/management/ManagementBits';
import { getClassDetail, getManagementClasses, getSports } from '../../api/managementApi';

const STATUS_STYLES = {
  open: { label: 'Sắp mở', className: 'bg-sky-50 text-sky-700 border-sky-200' },
  ongoing: { label: 'Đang học', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  closed: { label: 'Đã kết thúc', className: 'bg-slate-100 text-slate-600 border-slate-200' },
  cancelled: { label: 'Đã hủy', className: 'bg-red-50 text-[#e31b23] border-red-200' },
};

const selectClass =
  'w-full sm:w-44 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-[#e31b23] cursor-pointer';

const formatTime = (value) => String(value || '').slice(0, 5);

function formatDate(value) {
  if (!value) return '—';
  const [year, month, day] = String(value).split('-');
  return `${day}/${month}/${year}`;
}

export default function ClassListPage() {
  const [classes, setClasses] = useState([]);
  const [sports, setSports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSport, setSelectedSport] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const [selectedClass, setSelectedClass] = useState(null);

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

  const handleViewDetail = async (classId) => {
    try {
      setSelectedClass(await getClassDetail(classId));
    } catch (err) {
      alert(err.message || 'Không thể lấy thông tin chi tiết lớp học.');
    }
  };

  const keyword = searchTerm.toLowerCase();
  const filteredClasses = classes.filter(
    (item) =>
      item.name?.toLowerCase().includes(keyword) ||
      item.sportName?.toLowerCase().includes(keyword) ||
      item.coachName?.toLowerCase().includes(keyword),
  );

  return (
    <ManagementShell breadcrumb={[{ label: 'Bảng điều khiển', to: '/quan-ly' }, { label: 'Quản lý lớp học' }]}>
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
            Danh mục lớp học thể thao
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
            {Object.entries(STATUS_STYLES).map(([value, status]) => (
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
          <h2 className="text-base font-black text-slate-900 uppercase">Danh sách Lớp học ({filteredClasses.length})</h2>
        </div>

        {loading ? (
          <div className="py-16 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#e31b23] border-t-transparent mb-2" />
            <p className="text-xs font-bold text-gray-400">Đang tải danh sách lớp học...</p>
          </div>
        ) : filteredClasses.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-gray-100 text-gray-400 font-extrabold uppercase text-[10px] tracking-wider">
                  <th className="p-4">Tên lớp / Môn</th>
                  <th className="p-4">Lịch tuần</th>
                  <th className="p-4">HLV / Phòng</th>
                  <th className="p-4">Thời gian</th>
                  <th className="p-4">Sĩ số</th>
                  <th className="p-4">Trạng thái</th>
                  <th className="p-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium text-slate-700">
                {filteredClasses.map((item) => {
                  const status = STATUS_STYLES[item.status] || STATUS_STYLES.open;
                  const seatsLeft = item.capacity != null ? Math.max(item.capacity - item.enrolledCount, 0) : null;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4 min-w-[200px]">
                        <p className="font-bold text-slate-900 text-sm">{item.name}</p>
                        <span className="inline-block bg-red-50 text-[#e31b23] border border-red-100 font-bold text-[10px] px-2 py-0.5 rounded mt-1">
                          {item.sportName}
                        </span>
                        <span className="ml-1.5 text-[10px] font-bold text-slate-400">{item.level}</span>
                      </td>
                      <td className="p-4">
                        {item.schedule.length ? (
                          <div className="flex flex-col gap-1">
                            {item.schedule.map((row) => (
                              <span key={`${row.weekday}-${row.timeSlotId}`} className="font-mono font-bold bg-slate-100 text-slate-800 px-2 py-0.5 rounded whitespace-nowrap">
                                {row.weekdayName} · {formatTime(row.startTime)}-{formatTime(row.endTime)}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-300">Chưa xếp lịch</span>
                        )}
                      </td>
                      <td className="p-4">
                        <p className="font-bold text-slate-800">👤 {item.coachName}</p>
                        <p className="text-[11px] text-slate-500">📍 {item.roomName || 'Chưa xếp phòng'}</p>
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <p className="font-bold text-slate-800">
                          {formatDate(item.startDate)} ~ {formatDate(item.endDate)}
                        </p>
                        <p className="text-[11px] text-slate-400">{item.sessionCount} buổi</p>
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <span className="font-bold text-slate-900">
                          {item.enrolledCount}/{item.capacity ?? '∞'}
                        </span>
                        {seatsLeft != null && (
                          <span className="block text-[11px] text-emerald-600 font-bold">còn {seatsLeft} chỗ</span>
                        )}
                      </td>
                      <td className="p-4">
                        <span className={`inline-block whitespace-nowrap border text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${status.className}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="p-4 text-right whitespace-nowrap">
                        <div className="inline-flex flex-col items-stretch gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleViewDetail(item.id)}
                            className="bg-slate-900 hover:bg-[#e31b23] text-white font-bold text-[11px] px-3.5 py-1.5 rounded-xl transition-colors cursor-pointer"
                          >
                            👁️ Chi tiết & Lịch
                          </button>
                          <Link
                            to={`/quan-ly/lich-hoc?classId=${item.id}`}
                            className="border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-bold text-[11px] px-3.5 py-1.5 rounded-xl transition-colors text-center"
                          >
                            📅 Buổi học
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center text-xs font-bold text-gray-400">Không tìm thấy lớp học nào phù hợp.</div>
        )}
      </div>

      {/* MODAL POPUP CHI TIẾT LỚP HỌC & LỊCH HỌC */}
      {selectedClass && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-fadeIn max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-4 border-b border-gray-100">
              <div>
                <span className="inline-block bg-[#e31b23] text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded -skew-x-12 mb-1">
                  <span className="inline-block skew-x-12">{selectedClass.sportName}</span>
                </span>
                <h3 className="text-xl font-black text-slate-900 uppercase">{selectedClass.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedClass(null)}
                className="text-slate-400 hover:text-slate-700 font-bold text-lg p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div>
                <span className="text-gray-400 font-bold block">Huấn luyện viên:</span>
                <strong className="text-slate-800 text-sm">{selectedClass.coachName}</strong>
              </div>
              <div>
                <span className="text-gray-400 font-bold block">Địa điểm / Phòng:</span>
                <strong className="text-slate-800">{selectedClass.roomName}</strong>
              </div>
              <div>
                <span className="text-gray-400 font-bold block">Cấp độ & Độ tuổi:</span>
                <strong className="text-slate-800">
                  {selectedClass.level} ({selectedClass.ageRange || 'Mọi độ tuổi'})
                </strong>
              </div>
              <div>
                <span className="text-gray-400 font-bold block">Thời gian khóa học:</span>
                <strong className="text-slate-800">
                  {formatDate(selectedClass.startDate)} ~ {formatDate(selectedClass.endDate)}
                </strong>
              </div>
              <div>
                <span className="text-gray-400 font-bold block">Học phí:</span>
                <strong className="text-[#e31b23] text-sm font-black">{selectedClass.tuition?.toLocaleString('vi-VN')} đ</strong>
              </div>
              <div>
                <span className="text-gray-400 font-bold block">Sĩ số:</span>
                <strong className="text-emerald-600 font-bold">
                  {selectedClass.enrolledCount}/{selectedClass.capacity} học viên
                </strong>
              </div>
            </div>

            {selectedClass.description && (
              <div className="text-xs text-slate-600 bg-red-50/50 border border-red-100 p-3.5 rounded-xl">
                <strong className="text-slate-900 block mb-1">Mô tả khóa học:</strong>
                <p>{selectedClass.description}</p>
              </div>
            )}

            <div>
              <h4 className="text-xs font-black uppercase text-slate-900 mb-3">
                📅 Danh sách các buổi học ({selectedClass.slots?.length || 0} buổi)
              </h4>

              {selectedClass.slots && selectedClass.slots.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
                  {selectedClass.slots.map((slot) => (
                    <div key={slot.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-900 block">
                          {slot.title || 'Buổi học'}
                          {slot.status === 'cancelled' && (
                            <span className="ml-1.5 bg-red-50 text-[#e31b23] border border-red-200 text-[9px] font-black uppercase px-1.5 py-0.5 rounded">
                              Đã hủy
                            </span>
                          )}
                        </span>
                        <span className="text-slate-500 text-[11px]">{formatDate(slot.date)}</span>
                      </div>
                      <span className="font-mono font-bold bg-slate-200 text-slate-800 px-2 py-1 rounded">
                        {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic">Chưa có lịch học chi tiết được xếp.</p>
              )}
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Link
                to={`/quan-ly/lich-hoc?classId=${selectedClass.id}`}
                className="bg-[#e31b23] text-white font-bold text-xs px-6 py-2.5 rounded-xl hover:bg-[#c4131a] transition-colors"
              >
                Quản lý buổi học
              </Link>
              <button
                type="button"
                onClick={() => setSelectedClass(null)}
                className="bg-slate-900 text-white font-bold text-xs px-6 py-2.5 rounded-xl hover:bg-[#e31b23] transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </ManagementShell>
  );
}
