import { useCallback, useEffect, useState } from 'react';
import ManagementShell from '../../components/management/ManagementShell';
import SportForm from '../../components/management/SportForm';
import CourseForm from '../../components/management/CourseForm';
import DeleteSportDialog from '../../components/management/DeleteSportDialog';
import { focusRing } from '../../components/management/sportLinkUtils';
import {
  createCatalogCourse,
  createCatalogSport,
  getCatalogCoachOptions,
  getCatalogCourses,
  getCatalogSports,
  getRoomOverview,
  setCatalogCourseStatus,
  updateCatalogCourse,
} from '../../api/managementApi';

const moneyFormat = new Intl.NumberFormat('vi-VN');

function formatLabel(course) {
  if (course.format !== 'private') return 'Lớp nhóm';
  return `Học 1-1 · ${course.sessionCount ?? '?'} buổi × ${course.sessionMinutes ?? '?'} phút`;
}

export default function SportCatalogPage() {
  const [sports, setSports] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [coaches, setCoaches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [openId, setOpenId] = useState(null);
  const [coursesBySport, setCoursesBySport] = useState({});
  const [courseLoadFailed, setCourseLoadFailed] = useState({});
  const [sportForm, setSportForm] = useState(false);
  // { sport, course } (course = null khi thêm mới)
  const [courseForm, setCourseForm] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const applyAll = useCallback(([sportData, roomData, coachData]) => {
    setSports(Array.isArray(sportData) ? sportData : []);
    setRooms((Array.isArray(roomData) ? roomData : []).filter((room) => room.isActive === true));
    setCoaches(Array.isArray(coachData) ? coachData : []);
    setError('');
  }, []);

  useEffect(() => {
    document.title = 'Môn học và khóa học · AnhDuy Sport';
    let ignore = false;
    Promise.all([getCatalogSports(), getRoomOverview(), getCatalogCoachOptions()])
      .then((data) => {
        if (!ignore) applyAll(data);
      })
      .catch((requestError) => {
        if (!ignore) setError(requestError.message || 'Không tải được danh sách môn.');
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [applyAll]);

  const loadCourses = async (sportId) => {
    setCourseLoadFailed((current) => ({ ...current, [sportId]: false }));
    try {
      const data = await getCatalogCourses(sportId);
      setCoursesBySport((current) => ({ ...current, [sportId]: Array.isArray(data) ? data : [] }));
      setError('');
    } catch {
      setCourseLoadFailed((current) => ({ ...current, [sportId]: true }));
    }
  };

  const toggleSport = (sportId) => {
    if (openId === sportId) {
      setOpenId(null);
      return;
    }
    setOpenId(sportId);
    if (!coursesBySport[sportId]) loadCourses(sportId);
  };

  const saveSport = async (payload) => {
    const saved = await createCatalogSport(payload);
    setSports((current) => [...current, saved]);
    setSportForm(false);
    setError('');
    setNotice(`Đã thêm môn ${saved.name} (${saved.code}).`);
  };

  const saveCourse = async (payload) => {
    const { sport, course } = courseForm;
    const saved = course ? await updateCatalogCourse(course.id, payload) : await createCatalogCourse(payload);
    setCoursesBySport((current) => {
      const list = current[sport.id] || [];
      return { ...current, [sport.id]: course ? list.map((item) => (item.id === saved.id ? saved : item)) : [...list, saved] };
    });
    if (!course) setSports((current) => current.map((item) => (item.id === sport.id ? { ...item, courseCount: item.courseCount + 1 } : item)));
    setCourseForm(null);
    setError('');
    setNotice(course ? `Đã cập nhật khóa ${saved.name}.` : `Đã thêm khóa ${saved.name} (${saved.code}).`);
  };

  const sportDeleted = (result) => {
    setSports((current) => current.filter((item) => item.id !== result.sportId));
    setCoursesBySport((current) => {
      const { [result.sportId]: removed, ...rest } = current;
      void removed;
      return rest;
    });
    setOpenId((current) => (current === result.sportId ? null : current));
    setDeleteTarget(null);
    setError('');
    setNotice(`Đã xóa môn ${result.sportName} và ${result.deletedCourses} khóa học.`);
  };

  const toggleCourse = async (sport, course) => {
    if (togglingId) return;
    setTogglingId(course.id);
    setNotice('');
    setError('');
    try {
      const saved = await setCatalogCourseStatus(course.id, !course.isActive);
      setCoursesBySport((current) => ({
        ...current,
        [sport.id]: (current[sport.id] || []).map((item) => (item.id === saved.id ? saved : item)),
      }));
      setError('');
      setNotice(saved.isActive ? `Đã mở lại khóa ${saved.name}.` : `Đã ngưng khóa ${saved.name}.`);
    } catch (requestError) {
      setError(requestError.message || 'Không đổi được trạng thái khóa học.');
    } finally {
      setTogglingId(null);
    }
  };

  const currentSport = courseForm ? sports.find((item) => item.id === courseForm.sport.id) || courseForm.sport : null;

  return (
    <ManagementShell breadcrumb={[{ label: 'Bảng điều khiển', to: '/quan-ly' }, { label: 'Môn học và khóa học' }]}>
      <section className="rounded-3xl border border-slate-200 bg-white px-6 py-8 sm:px-8">
        <h1 className="text-2xl font-black text-balance text-slate-900 sm:text-3xl">Môn học và khóa học</h1>
        <p className="mt-2 max-w-prose text-sm text-pretty text-slate-500">
          Thêm môn mới, gán phòng và huấn luyện viên cho môn, rồi tạo khóa học. Khóa học chỉ tạo được khi môn đã có HLV và phòng phù hợp. Việc gán phòng và HLV chỉ thêm, không gỡ.
        </p>
      </section>

      <div className="mt-5">
        <button
          type="button"
          onClick={() => setSportForm(true)}
          className={`inline-flex h-10 cursor-pointer items-center rounded-xl bg-[#e31b23] px-4 text-sm font-bold text-white transition-colors hover:bg-[#b1131a] ${focusRing}`}
        >
          + Thêm môn
        </button>
      </div>

      {notice && (
        <div className="mt-4 flex items-start justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800" role="status">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice('')} aria-label="Đóng thông báo" className={`cursor-pointer px-2 text-emerald-600 hover:text-emerald-900 ${focusRing}`}>
            ✕
          </button>
        </div>
      )}
      {error && (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700" role="alert">
          {error}
        </div>
      )}

      <div className="mt-4 space-y-3">
        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-14 text-center text-sm font-semibold text-slate-500" aria-busy="true">
            Đang tải danh sách môn...
          </div>
        ) : sports.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-14 text-center text-sm font-semibold text-slate-500">Chưa có môn nào.</div>
        ) : (
          sports.map((sport) => (
            <SportCard
              key={sport.id}
              sport={sport}
              open={openId === sport.id}
              courses={coursesBySport[sport.id]}
              loadFailed={courseLoadFailed[sport.id] === true}
              onRetry={() => loadCourses(sport.id)}
              onToggle={() => toggleSport(sport.id)}
              onAddCourse={() => setCourseForm({ sport, course: null })}
              onDelete={() => setDeleteTarget(sport)}
              onEditCourse={(course) => setCourseForm({ sport, course })}
              onToggleCourse={(course) => toggleCourse(sport, course)}
            />
          ))
        )}
      </div>

      {deleteTarget && <DeleteSportDialog key={deleteTarget.id} sport={deleteTarget} onClose={() => setDeleteTarget(null)} onDeleted={sportDeleted} />}
      {sportForm && <SportForm onClose={() => setSportForm(false)} onSave={saveSport} />}
      {courseForm && (
        <CourseForm
          sport={currentSport}
          course={courseForm.course}
          rooms={rooms}
          coaches={coaches}
          onClose={() => setCourseForm(null)}
          onSave={saveCourse}
        />
      )}
    </ManagementShell>
  );
}

function SportCard({ sport, open, courses, loadFailed, onRetry, onToggle, onAddCourse, onDelete, onEditCourse, onToggleCourse }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <button type="button" onClick={onToggle} aria-expanded={open} className={`flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left ${focusRing}`}>
          <span className="text-slate-400" aria-hidden="true">
            {open ? '▾' : '▸'}
          </span>
          <span className="min-w-0">
            <span className="block truncate font-black text-slate-900">{sport.name}</span>
            <span className="block text-xs text-slate-500">
              {sport.code}
              {sport.category ? ` · ${sport.category}` : ''} · {sport.courseCount} khóa học
            </span>
          </span>
        </button>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onDelete}
            className={`inline-flex h-9 cursor-pointer items-center rounded-xl border border-red-300 bg-white px-3.5 text-xs font-bold text-[#e31b23] transition-colors hover:bg-red-50 ${focusRing}`}
          >
            Xóa môn
          </button>
          <button
            type="button"
            onClick={onAddCourse}
            className={`inline-flex h-9 cursor-pointer items-center rounded-xl bg-slate-900 px-3.5 text-xs font-bold text-white transition-colors hover:bg-[#e31b23] ${focusRing}`}
          >
            Thêm khóa học
          </button>
        </div>
      </div>

      {open && (
        <div className="space-y-4 border-t border-slate-100 bg-slate-50/50 px-5 py-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Phòng</p>
              {sport.rooms.length === 0 ? (
                <p className="mt-1 text-xs text-slate-400">Chưa gán phòng</p>
              ) : (
                <ul className="mt-1 flex flex-wrap gap-1.5">
                  {sport.rooms.map((room) => (
                    <li key={room.roomId} className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                      {room.roomName}
                      {room.allowGroup && !room.allowPrivate ? ' · nhóm' : ''}
                      {!room.allowGroup && room.allowPrivate ? ' · 1-1' : ''}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Huấn luyện viên</p>
              {sport.coaches.length === 0 ? (
                <p className="mt-1 text-xs text-slate-400">Chưa gán HLV</p>
              ) : (
                <ul className="mt-1 flex flex-wrap gap-1.5">
                  {sport.coaches.map((coach) => (
                    <li key={coach.id} className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                      {coach.fullName}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Khóa học</p>
            {!courses && loadFailed ? (
              <p className="mt-2 flex items-center gap-3 text-sm text-red-700">
                Không tải được khóa học.
                <button type="button" onClick={onRetry} className={`inline-flex h-8 cursor-pointer items-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:border-slate-400 ${focusRing}`}>
                  Thử lại
                </button>
              </p>
            ) : !courses ? (
              <p className="mt-2 text-sm text-slate-500" aria-busy="true">
                Đang tải khóa học...
              </p>
            ) : courses.length === 0 ? (
              <p className="mt-2 text-sm text-slate-400">Môn này chưa có khóa học.</p>
            ) : (
              <ul className="mt-2 divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                {courses.map((course) => (
                  <li key={course.id} className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3 ${course.isActive ? '' : 'bg-slate-50 text-slate-500'}`}>
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 text-sm font-bold text-slate-900">
                        <span className={course.isActive ? '' : 'text-slate-600'}>{course.name}</span>
                        {!course.isActive && <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-bold text-slate-600">Ngưng</span>}
                      </p>
                      <p className="text-xs tabular-nums text-slate-500">
                        {course.code} · {formatLabel(course)} · {moneyFormat.format(course.price)} đ
                        {course.levelName ? ` · ${course.levelName}` : ''}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => onEditCourse(course)}
                        className={`inline-flex h-9 cursor-pointer items-center rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-700 transition-colors hover:border-slate-400 ${focusRing}`}
                      >
                        Sửa
                      </button>
                      <button
                        type="button"
                        onClick={() => onToggleCourse(course)}
                        className={`inline-flex h-9 cursor-pointer items-center rounded-xl px-3.5 text-xs font-bold transition-colors ${focusRing} ${
                          course.isActive
                            ? 'border border-slate-200 bg-white text-slate-700 hover:border-red-300 hover:text-[#e31b23]'
                            : 'bg-slate-900 text-white hover:bg-slate-700'
                        }`}
                      >
                        {course.isActive ? 'Ngưng' : 'Mở lại'}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
