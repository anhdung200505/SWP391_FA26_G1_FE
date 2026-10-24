import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import ManagementShell from '../../components/management/ManagementShell';
import { DiagramCaption } from '../../components/management/ManagementBits';
import ClassListTable from '../../components/classes/ClassListTable';
import { CLASS_STATUS, formatDate } from '../../components/classes/classUtils';
import { changeClassCoach, deleteClass, getClassCoachOptions, getManagementClasses, getSports } from '../../api/managementApi';

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
  const [deleting, setDeleting] = useState(null);
  const [changingCoach, setChangingCoach] = useState(null);
  const [notice, setNotice] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  // Lớp vừa tạo từ trang Tạo lớp mới (navigate state). Xóa state khỏi lịch sử để tải lại trang không hiện lại panel.
  const [createdClass, setCreatedClass] = useState(location.state?.createdClass || null);

  useEffect(() => {
    if (location.state?.createdClass) navigate(location.pathname, { replace: true, state: null });
  }, [location, navigate]);

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

      {createdClass && <CreatedClassPanel item={createdClass} onClose={() => setCreatedClass(null)} />}

      {notice && (
        <div className="mt-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-bold flex items-center justify-between gap-3">
          <span>✅ {notice}</span>
          <button type="button" onClick={() => setNotice('')} className="text-emerald-500 hover:text-emerald-800 cursor-pointer">
            ✕
          </button>
        </div>
      )}

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
              <div className="inline-flex flex-col items-stretch gap-1.5">
                <Link
                  to={`/quan-ly/lop-hoc/${item.id}/lich`}
                  className="inline-block text-center bg-slate-900 hover:bg-[#e31b23] text-white font-bold text-[11px] px-3.5 py-1.5 rounded-xl transition-colors"
                >
                  📅 Xem lịch
                </Link>
                {['open', 'ongoing'].includes(item.status) && (
                  <button
                    type="button"
                    onClick={() => setChangingCoach(item)}
                    className="border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-bold text-[11px] px-3.5 py-1.5 rounded-xl transition-colors cursor-pointer"
                  >
                    👤 Đổi HLV
                  </button>
                )}
                {item.canDelete && (
                  <button
                    type="button"
                    onClick={() => setDeleting(item)}
                    className="border border-red-200 bg-white text-[#e31b23] hover:bg-red-50 font-bold text-[11px] px-3.5 py-1.5 rounded-xl transition-colors cursor-pointer"
                  >
                    🗑 Xóa lớp
                  </button>
                )}
              </div>
            )}
          />
        ) : (
          <div className="py-16 text-center text-xs font-bold text-gray-400">Không tìm thấy lớp học nào phù hợp.</div>
        )}
      </div>

      {changingCoach && (
        <ChangeClassCoachModal
          item={changingCoach}
          onClose={() => setChangingCoach(null)}
          onChanged={(updated) => {
            setNotice(`Đã đổi HLV lớp ${updated.name} sang ${updated.coachName}. Học viên của lớp đã nhận thông báo.`);
            setChangingCoach(null);
            reload();
          }}
        />
      )}

      {deleting && (
        <DeleteClassModal
          item={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={() => {
            setNotice(`Đã xóa lớp ${deleting.name}.`);
            setDeleting(null);
            reload();
          }}
        />
      )}

    </ManagementShell>
  );
}

const formatTime = (value) => String(value || '').slice(0, 5);

function CreatedClassPanel({ item, onClose }) {
  return (
    <section className="mt-6 relative overflow-hidden rounded-3xl border border-emerald-200 bg-white shadow-sm">
      <div className="absolute inset-y-0 left-0 w-1.5 bg-emerald-500" />
      <div className="p-6 sm:p-8 text-center">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-2xl text-emerald-600 ring-1 ring-emerald-200">
          ✓
        </span>
        <p className="mt-3 text-[11px] font-black uppercase tracking-[0.18em] text-emerald-600">Thêm lớp thành công</p>
        <h2 className="mt-1 text-2xl sm:text-3xl font-black uppercase italic text-slate-900">{item.name}</h2>
        <p className="mt-2 text-sm text-slate-600">
          {item.sportName} · {item.courseName} · HLV {item.coachName} · {item.roomName}
        </p>

        <div className="mx-auto mt-5 grid max-w-2xl grid-cols-1 sm:grid-cols-3 gap-3 text-left text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200">
          <div>
            <span className="text-gray-400 font-bold block">Thời gian</span>
            <strong className="text-slate-800">
              {formatDate(item.startDate)} ~ {formatDate(item.endDate)}
            </strong>
          </div>
          <div>
            <span className="text-gray-400 font-bold block">Số buổi</span>
            <strong className="text-slate-800">{item.sessionCount} buổi</strong>
          </div>
          <div>
            <span className="text-gray-400 font-bold block">Lịch tuần</span>
            <strong className="text-slate-800">
              {item.schedule.map((row) => `${row.weekdayName} ${formatTime(row.startTime)}`).join(', ')}
            </strong>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link
            to={`/quan-ly/lop-hoc/${item.id}/lich`}
            className="bg-[#e31b23] hover:bg-[#c4131a] text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-colors"
          >
            📅 Xem lịch buổi học
          </Link>
          <Link
            to="/quan-ly/lop-hoc/moi"
            className="bg-slate-900 hover:bg-slate-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-colors"
          >
            ➕ Tạo thêm lớp khác
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-5 py-2.5 rounded-xl transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </section>
  );
}

function ChangeClassCoachModal({ item, onClose, onChanged }) {
  const [options, setOptions] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [coachId, setCoachId] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getClassCoachOptions(item.id)
      .then(setOptions)
      .catch((err) => setLoadError(err.message || 'Không tải được danh sách HLV.'));
  }, [item.id]);

  const free = options?.coaches.filter((coach) => !coach.isCurrent && !coach.isBusy) || [];

  const submit = async (event) => {
    event.preventDefault();
    if (!coachId) {
      setError('Chọn huấn luyện viên mới.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      onChanged(await changeClassCoach(item.id, { coachUserId: coachId, note: note.trim() || null }));
    } catch (err) {
      setError(err.message || 'Đổi huấn luyện viên thất bại.');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <form onSubmit={submit} className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5">
        <div className="flex items-start justify-between pb-4 border-b border-gray-100">
          <div>
            <span className="inline-block bg-[#e31b23] text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded -skew-x-12 mb-1">
              <span className="inline-block skew-x-12">{item.sportName}</span>
            </span>
            <h3 className="text-xl font-black text-slate-900 uppercase">Đổi HLV cho lớp</h3>
            <p className="mt-1 text-xs font-bold text-slate-500">
              {item.name} · HLV hiện tại {item.coachName}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700 font-bold text-lg p-1 cursor-pointer">
            ✕
          </button>
        </div>

        {loadError ? (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-bold">⚠️ {loadError}</div>
        ) : !options ? (
          <div className="py-8 text-center">
            <div className="inline-block animate-spin rounded-full h-7 w-7 border-4 border-[#e31b23] border-t-transparent" />
          </div>
        ) : options.remainingSessions === 0 ? (
          <div className="p-4 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl text-xs font-bold">
            Lớp không còn buổi học nào sắp tới để đổi huấn luyện viên.
          </div>
        ) : (
          <>
            <div className="text-xs text-slate-600 bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
              Áp dụng cho <strong className="text-slate-900">{options.remainingSessions} buổi còn lại</strong> từ ngày{' '}
              <strong className="text-slate-900">{formatDate(options.firstSession)}</strong>. Buổi đã học và buổi đã hủy giữ nguyên.{' '}
              {item.enrolledCount} học viên của lớp sẽ nhận thông báo.
            </div>

            <label className="block space-y-1.5">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                Huấn luyện viên mới ({free.length} người rảnh)
              </span>
              <select
                value={coachId}
                onChange={(event) => setCoachId(event.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-[#e31b23] cursor-pointer"
              >
                <option value="">Chọn HLV...</option>
                {options.coaches.map((coach) => (
                  <option key={coach.id} value={coach.id} disabled={coach.isCurrent || coach.isBusy}>
                    {coach.name}
                    {coach.isCurrent ? ' · đang dạy lớp này' : coach.isBusy ? ` · ${coach.busyReason}` : ''}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1.5">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Lý do (gửi kèm thông báo cho học viên)</span>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={3}
                maxLength={500}
                placeholder="VD: HLV cũ chuyển công tác, HLV mới tiếp nhận lớp đến hết khóa."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-800 outline-none focus:border-[#e31b23] resize-none"
              />
            </label>
          </>
        )}

        {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-bold">⚠️ {error}</div>}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-5 py-2.5 rounded-xl transition-colors cursor-pointer"
          >
            Đóng
          </button>
          {options && options.remainingSessions > 0 && (
            <button
              type="submit"
              disabled={saving}
              className="bg-slate-900 hover:bg-[#e31b23] text-white font-bold text-xs px-6 py-2.5 rounded-xl transition-colors cursor-pointer disabled:opacity-60"
            >
              {saving ? 'Đang đổi...' : 'Đổi HLV & thông báo học viên'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

function DeleteClassModal({ item, onClose, onDeleted }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const confirm = async () => {
    setSaving(true);
    setError('');
    try {
      await deleteClass(item.id);
      onDeleted();
    } catch (err) {
      setError(err.message || 'Xóa lớp thất bại.');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5">
        <div className="flex items-start justify-between pb-4 border-b border-gray-100">
          <div>
            <span className="inline-block bg-[#e31b23] text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded -skew-x-12 mb-1">
              <span className="inline-block skew-x-12">Xác nhận</span>
            </span>
            <h3 className="text-xl font-black text-slate-900 uppercase">Xóa lớp học</h3>
            <p className="mt-1 text-xs font-bold text-slate-500">
              {item.name} · {item.sportName} · HLV {item.coachName}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700 font-bold text-lg p-1 cursor-pointer">
            ✕
          </button>
        </div>

        <div className="text-xs text-slate-600 bg-red-50/50 border border-red-100 p-3.5 rounded-xl">
          Lớp chưa có học viên nào đăng ký. Xóa lớp sẽ xóa luôn lịch tuần và{' '}
          <strong className="text-[#e31b23]">{item.sessionCount} buổi học</strong>, không thể hoàn tác. Giáo án của môn giữ nguyên.
        </div>

        {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-bold">⚠️ {error}</div>}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-5 py-2.5 rounded-xl transition-colors cursor-pointer"
          >
            Không xóa
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={saving}
            className="bg-[#e31b23] hover:bg-[#c4131a] text-white font-bold text-xs px-6 py-2.5 rounded-xl transition-colors cursor-pointer disabled:opacity-60"
          >
            {saving ? 'Đang xóa...' : 'Xác nhận xóa lớp'}
          </button>
        </div>
      </div>
    </div>
  );
}
