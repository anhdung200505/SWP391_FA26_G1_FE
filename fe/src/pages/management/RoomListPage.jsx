import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import ManagementShell from '../../components/management/ManagementShell';
import { createRoom, getCatalogSports, getRoomOverview, getRoomUsage, setRoomStatus, updateRoom } from '../../api/managementApi';
import { formatDate } from '../../data/accountManagement';

const focusRing =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e31b23]';
const controlClass = `h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none transition-colors focus:border-[#e31b23] focus:ring-2 focus:ring-[#e31b23]/25`;

const FILTERS = [
  { id: 'all', label: 'Tất cả' },
  { id: 'active', label: 'Đang dùng' },
  { id: 'inactive', label: 'Ngưng dùng' },
];

function normalize(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .toLowerCase();
}

export default function RoomListPage() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  // Hộp thoại ngưng dùng: { room, step: 'checking' | 'confirm' | 'blocked', usage, saving, error }
  const [dialog, setDialog] = useState(null);
  // Hộp thoại thêm/sửa phòng: { room } (room = null khi thêm mới)
  const [editing, setEditing] = useState(null);
  const [allSports, setAllSports] = useState([]);

  useEffect(() => {
    getCatalogSports().then((data) => setAllSports(Array.isArray(data) ? data : [])).catch(() => setAllSports([]));
  }, []);

  useEffect(() => {
    document.title = 'Phòng tập · AnhDuy Sport';
    let ignore = false;
    getRoomOverview()
      .then((data) => {
        if (!ignore) setRooms(Array.isArray(data) ? data : []);
      })
      .catch((requestError) => {
        if (!ignore) setError(requestError.message || 'Không tải được danh sách phòng.');
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, []);

  const replaceRoom = (updated) => setRooms((current) => current.map((item) => (item.id === updated.id ? updated : item)));

  const needle = normalize(query.trim());
  const visible = rooms.filter((room) => {
    if (filter === 'active' && !room.isActive) return false;
    if (filter === 'inactive' && room.isActive) return false;
    if (needle && !normalize(`${room.name} ${room.code} ${room.type} ${room.sports.map((sport) => sport.sportName).join(' ')}`).includes(needle)) {
      return false;
    }
    return true;
  });
  const counts = {
    all: rooms.length,
    active: rooms.filter((room) => room.isActive).length,
    inactive: rooms.filter((room) => !room.isActive).length,
  };

  // Ngưng dùng: hỏi máy chủ phòng còn buổi sắp tới không. Còn thì chỉ báo danh sách, chưa thể ngưng.
  const startDeactivate = async (room) => {
    setNotice('');
    setDialog({ room, step: 'checking', usage: null, saving: false, error: '' });
    try {
      const usage = await getRoomUsage(room.id);
      setDialog({ room, step: usage.sessionCount > 0 ? 'blocked' : 'confirm', usage, saving: false, error: '' });
    } catch (requestError) {
      setDialog({ room, step: 'confirm', usage: null, saving: false, error: requestError.message || 'Không kiểm tra được lịch phòng.' });
    }
  };

  const confirmDeactivate = async () => {
    const { room } = dialog;
    setDialog((current) => ({ ...current, saving: true, error: '' }));
    try {
      const updated = await setRoomStatus(room.id, false);
      replaceRoom(updated);
      setDialog(null);
      setNotice(`Đã ngưng dùng ${room.name}. Phòng không còn hiện khi tạo lớp hay đổi phòng.`);
    } catch (requestError) {
      // Giữa lúc xem và bấm có thể vừa có buổi mới xếp vào phòng: kiểm tra lại để hiện danh sách.
      try {
        const usage = await getRoomUsage(room.id);
        if (usage.sessionCount > 0) {
          setDialog({ room, step: 'blocked', usage, saving: false, error: '' });
          return;
        }
      } catch {
        // dùng thông báo lỗi gốc bên dưới
      }
      setDialog((current) => ({ ...current, saving: false, error: requestError.message || 'Không ngưng dùng được phòng.' }));
    }
  };

  const saveRoom = async (payload) => {
    const room = editing.room;
    const saved = room ? await updateRoom(room.id, payload) : await createRoom(payload);
    if (room) {
      replaceRoom(saved);
      setNotice(`Đã cập nhật ${saved.name}.`);
    } else {
      setRooms((current) => [...current, saved]);
      setNotice(`Đã thêm ${saved.name} (${saved.code}).`);
    }
    setEditing(null);
  };

  const reactivate = async (room) => {
    setNotice('');
    setError('');
    try {
      replaceRoom(await setRoomStatus(room.id, true));
      setNotice(`Đã mở lại ${room.name}.`);
    } catch (requestError) {
      setError(requestError.message || 'Không mở lại được phòng.');
    }
  };

  return (
    <ManagementShell breadcrumb={[{ label: 'Bảng điều khiển', to: '/quan-ly' }, { label: 'Phòng tập' }]}>
      <section className="rounded-3xl border border-slate-200 bg-white px-6 py-8 sm:px-8">
        <h1 className="text-2xl font-black text-balance text-slate-900 sm:text-3xl">Phòng tập</h1>
        <p className="mt-2 max-w-prose text-sm text-pretty text-slate-500">
          Danh sách phòng, sức chứa và môn dùng được. Phòng ngưng dùng sẽ không hiện khi tạo lớp, đổi phòng cho buổi học hay xếp lịch 1-1. Lớp và buổi học đã có vẫn giữ nguyên phòng.
        </p>
      </section>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setEditing({ room: null })}
          className={`inline-flex h-10 cursor-pointer items-center rounded-xl bg-[#e31b23] px-4 text-sm font-bold text-white transition-colors hover:bg-[#b1131a] ${focusRing}`}
        >
          + Thêm phòng
        </button>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Lọc theo trạng thái">
          {FILTERS.map((item) => {
            const active = filter === item.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={active}
                onClick={() => setFilter(item.id)}
                className={`inline-flex h-10 cursor-pointer items-center rounded-full px-4 text-sm font-bold transition-colors ${focusRing} ${
                  active ? 'bg-[#e31b23] text-white shadow' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
                }`}
              >
                {item.label}
                <span className={`ml-2 tabular-nums ${active ? 'text-white/80' : 'text-slate-400'}`}>{counts[item.id]}</span>
              </button>
            );
          })}
        </div>
        <label className="block w-full text-xs font-bold text-slate-600 sm:w-72">
          <span className="sr-only">Tìm phòng</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm tên phòng, môn..."
            className={`${controlClass} w-full`}
          />
        </label>
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

      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {loading ? (
          <div className="px-5 py-14 text-center text-sm font-semibold text-slate-500" aria-busy="true">
            Đang tải danh sách phòng...
          </div>
        ) : visible.length === 0 ? (
          <div className="px-5 py-14 text-center text-sm font-semibold text-slate-500">Không có phòng nào phù hợp.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-bold">Phòng</th>
                  <th className="px-5 py-3 font-bold">Sức chứa</th>
                  <th className="px-5 py-3 font-bold">Môn dùng được</th>
                  <th className="px-5 py-3 font-bold">Buổi sắp tới</th>
                  <th className="px-5 py-3 font-bold">Trạng thái</th>
                  <th className="px-5 py-3 text-right font-bold">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((room) => (
                  <tr key={room.id} className={room.isActive ? 'hover:bg-slate-50/60' : 'bg-slate-50/60 text-slate-500'}>
                    <td className="px-5 py-3">
                      <p className={`font-bold ${room.isActive ? 'text-slate-900' : 'text-slate-600'}`}>{room.name}</p>
                      <p className="text-xs text-slate-500">
                        {room.code}
                        {room.type ? ` · ${room.type}` : ''}
                      </p>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap tabular-nums">
                      <p className="font-semibold">{room.capacity} người</p>
                      <p className="text-xs text-slate-500">1-1 tối đa {room.privateConcurrency} buổi cùng lúc</p>
                    </td>
                    <td className="px-5 py-3">
                      {room.sports.length === 0 ? (
                        <span className="text-xs text-slate-400">Chưa gán môn</span>
                      ) : (
                        <ul className="flex flex-wrap gap-1.5">
                          {room.sports.map((sport) => (
                            <li
                              key={sport.sportId}
                              className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs font-semibold text-slate-700"
                              title={`${sport.allowGroup ? 'Lớp nhóm' : ''}${sport.allowGroup && sport.allowPrivate ? ' và ' : ''}${sport.allowPrivate ? 'Học 1-1' : ''}`}
                            >
                              {sport.sportName}
                              {sport.allowGroup && !sport.allowPrivate ? ' · nhóm' : ''}
                              {!sport.allowGroup && sport.allowPrivate ? ' · 1-1' : ''}
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap tabular-nums">
                      {room.upcomingSessionCount > 0 ? (
                        <span className="font-semibold text-slate-800">
                          {room.upcomingSessionCount} buổi · {room.upcomingClassCount} lớp
                        </span>
                      ) : (
                        <span className="text-slate-400">Không có</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {room.isActive ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                          <span className="size-1.5 rounded-full bg-emerald-500" />
                          Đang dùng
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-200 px-2.5 py-1 text-xs font-bold text-slate-600">
                          <span className="size-1.5 rounded-full bg-slate-400" />
                          Ngưng dùng
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setEditing({ room })}
                        className={`mr-2 inline-flex h-9 cursor-pointer items-center rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-700 transition-colors hover:border-slate-400 ${focusRing}`}
                      >
                        Sửa
                      </button>
                      {room.isActive ? (
                        <button
                          type="button"
                          onClick={() => startDeactivate(room)}
                          className={`inline-flex h-9 cursor-pointer items-center rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-700 transition-colors hover:border-red-300 hover:text-[#e31b23] ${focusRing}`}
                        >
                          Ngưng dùng
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => reactivate(room)}
                          className={`inline-flex h-9 cursor-pointer items-center rounded-xl bg-slate-900 px-3.5 text-xs font-bold text-white transition-colors hover:bg-slate-700 ${focusRing}`}
                        >
                          Mở lại
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {dialog && <DeactivateDialog dialog={dialog} onClose={() => setDialog(null)} onConfirm={confirmDeactivate} />}
      {editing && (
        <RoomFormModal
          room={editing.room}
          sports={allSports}
          onClose={() => setEditing(null)}
          onSave={saveRoom}
        />
      )}
    </ManagementShell>
  );
}

function DeactivateDialog({ dialog, onClose, onConfirm }) {
  const { room, step, usage, saving, error } = dialog;
  const closeRef = useRef(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (event) => {
      if (event.key === 'Escape' && !saving) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, saving]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-4 backdrop-blur-xs sm:items-center" onClick={saving ? undefined : onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="room-dialog-title"
        className="max-h-[88dvh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        {step === 'checking' && (
          <div aria-busy="true">
            <h2 id="room-dialog-title" className="text-lg font-black text-slate-900">
              Ngưng dùng {room.name}
            </h2>
            <p className="mt-3 text-sm text-slate-500">Đang kiểm tra lịch của phòng...</p>
          </div>
        )}

        {step === 'confirm' && (
          <>
            <h2 id="room-dialog-title" className="text-lg font-black text-slate-900">
              Ngưng dùng {room.name}?
            </h2>
            <p className="mt-3 text-sm text-pretty text-slate-600">
              Phòng không còn buổi học nào sắp tới. Sau khi ngưng, phòng sẽ không hiện khi tạo lớp, đổi phòng cho buổi học hay xếp lịch 1-1. Lớp và buổi đã học vẫn giữ tên phòng này. Bạn có thể mở lại bất cứ lúc nào.
            </p>
            {error && <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p>}
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                disabled={saving}
                className={`inline-flex h-11 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 ${focusRing}`}
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={saving}
                className={`inline-flex h-11 cursor-pointer items-center justify-center rounded-xl bg-[#e31b23] px-5 text-sm font-bold text-white hover:bg-[#c4131a] disabled:opacity-60 ${focusRing}`}
              >
                {saving ? 'Đang xử lý...' : 'Ngưng dùng'}
              </button>
            </div>
          </>
        )}

        {step === 'blocked' && usage && (
          <>
            <h2 id="room-dialog-title" className="text-lg font-black text-slate-900">
              Chưa thể ngưng dùng {room.name}
            </h2>
            <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-pretty text-amber-900">
              Phòng này còn {usage.sessionCount} buổi{usage.firstDate ? ` từ ${formatDate(usage.firstDate)} trở đi` : ''} ({usage.classCount} lớp). Hãy đổi phòng cho các buổi này trước.
            </p>

            <p className="mt-4 text-xs font-bold uppercase tracking-wide text-slate-500">Lớp đang dùng phòng</p>
            <ul className="mt-2 divide-y divide-slate-100 rounded-2xl border border-slate-200">
              {usage.classes.map((item) => (
                <li key={item.classId} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900">{item.className}</p>
                    <p className="text-xs tabular-nums text-slate-500">
                      {item.sessionCount} buổi · {formatDate(item.firstDate)}
                      {item.lastDate !== item.firstDate ? ` – ${formatDate(item.lastDate)}` : ''}
                    </p>
                  </div>
                  <Link
                    to={`/quan-ly/lop-hoc/${item.classId}/lich`}
                    className={`inline-flex h-9 shrink-0 items-center rounded-xl bg-slate-900 px-3.5 text-xs font-bold text-white transition-colors hover:bg-[#e31b23] ${focusRing}`}
                  >
                    Xem lịch lớp
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-pretty text-slate-500">
              Mở lịch lớp, chọn từng buổi rồi đổi sang phòng khác. Khi phòng hết buổi sắp tới, bạn quay lại đây để ngưng dùng.
            </p>

            <div className="mt-6 flex justify-end">
              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                className={`inline-flex h-11 cursor-pointer items-center justify-center rounded-xl bg-slate-900 px-5 text-sm font-bold text-white hover:bg-slate-700 ${focusRing}`}
              >
                Đã hiểu
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}


function RoomFormModal({ room, sports, onClose, onSave }) {
  const [name, setName] = useState(room?.name || '');
  const [type, setType] = useState(room?.type || '');
  const [capacity, setCapacity] = useState(String(room?.capacity ?? 20));
  const [concurrency, setConcurrency] = useState(String(room?.privateConcurrency ?? 1));
  const initial = room?.sports?.[0];
  const [sportId, setSportId] = useState(initial ? String(initial.sportId) : '');
  const [allowGroup, setAllowGroup] = useState(initial ? initial.allowGroup : true);
  const [allowPrivate, setAllowPrivate] = useState(initial ? initial.allowPrivate : true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    if (!room && !sportId) {
      setError('Chọn môn cho phòng.');
      return;
    }
    if (sportId && !allowGroup && !allowPrivate) {
      setError('Chọn lớp nhóm hoặc học 1-1 cho môn của phòng.');
      return;
    }
    if (!name.trim()) {
      setError('Nhập tên phòng.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave({
        name: name.trim(),
        type: type.trim() || null,
        capacity: Number(capacity),
        privateConcurrency: Number(concurrency),
        sports: sportId ? [{ sportId, allowGroup, allowPrivate }] : [],
      });
    } catch (requestError) {
      setError(requestError.message || 'Không lưu được phòng.');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <form onSubmit={submit} className="max-h-[90vh] w-full max-w-xl space-y-4 overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
        <h2 className="text-lg font-black text-slate-900">{room ? `Sửa ${room.name}` : 'Thêm phòng mới'}</h2>
        <div>
          <label className="block text-sm font-bold text-slate-700">
            Môn của phòng
            <select value={sportId} onChange={(event) => setSportId(event.target.value)} className={`${controlClass} mt-1 w-full`}>
              <option value="" disabled={Boolean(initial)}>Chọn môn</option>
              {sports.map((sport) => (
                <option key={sport.id} value={String(sport.id)}>
                  {sport.name}
                </option>
              ))}
            </select>
          </label>
          {sportId && (
            <div className="mt-2 flex gap-4 text-xs font-bold text-slate-600">
              <label className="flex items-center gap-1.5">
                <input type="checkbox" checked={allowGroup} onChange={() => setAllowGroup((value) => !value)} /> Lớp nhóm
              </label>
              <label className="flex items-center gap-1.5">
                <input type="checkbox" checked={allowPrivate} onChange={() => setAllowPrivate((value) => !value)} /> Học 1-1
              </label>
            </div>
          )}
        </div>
        <label className="block text-sm font-bold text-slate-700">
          Tên phòng
          <input value={name} onChange={(event) => setName(event.target.value)} maxLength={200} className={`${controlClass} mt-1 w-full`} />
        </label>
        <label className="block text-sm font-bold text-slate-700">
          Loại phòng
          <input value={type} onChange={(event) => setType(event.target.value)} maxLength={100} placeholder="Ví dụ: Sân cầu lông, Phòng nhảy" className={`${controlClass} mt-1 w-full`} />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-bold text-slate-700">
            Sức chứa (người)
            <input type="number" min="1" max="1000" value={capacity} onChange={(event) => setCapacity(event.target.value)} className={`${controlClass} mt-1 w-full`} />
          </label>
          <label className="block text-sm font-bold text-slate-700">
            Số buổi 1-1 cùng lúc
            <input type="number" min="1" max="50" value={concurrency} onChange={(event) => setConcurrency(event.target.value)} className={`${controlClass} mt-1 w-full`} />
          </label>
        </div>
        {error &&<p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-10 cursor-pointer rounded-xl bg-slate-100 px-5 text-sm font-bold text-slate-700 hover:bg-slate-200">
            Đóng
          </button>
          <button type="submit" disabled={saving} className="h-10 cursor-pointer rounded-xl bg-[#e31b23] px-5 text-sm font-bold text-white hover:bg-[#b1131a] disabled:opacity-60">
            {saving ? 'Đang lưu...' : 'Lưu phòng'}
          </button>
        </div>
      </form>
    </div>
  );
}
