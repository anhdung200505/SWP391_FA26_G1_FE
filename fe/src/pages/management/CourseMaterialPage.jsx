
import { useEffect, useState } from 'react';
import ManagementShell from '../../components/management/ManagementShell';
import {
  listCourseMaterials,
  saveCourseMaterial,
} from '../../api/courseMaterialApi';
import {
  fieldClass,
  primaryButtonClass,
  quietButtonClass,
} from '../../components/coach/coachUi';

const emptyUnit = () => ({
  label: '',
  work: '',
  review: '',
});

const emptyDraft = () => ({
  sourceName: '',
  sourceUrl: '',
  note: '',
  units: [],
});

export default function CourseMaterialPage() {
  const [materials, setMaterials] = useState([]);
  const [sportId, setSportId] = useState('');
  const [draft, setDraft] = useState(emptyDraft());

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  // Các buổi đang mở (theo vị trí). Mặc định thu gọn hết để trang không dài.
  const [openUnits, setOpenUnits] = useState(() => new Set());

  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    document.title = 'Giáo trình môn học · AnhDuy Sport';

    let ignore = false;

    listCourseMaterials()
      .then((rows) => {
        if (ignore) return;

        const list = Array.isArray(rows) ? rows : [];

        setMaterials(list);

        const first = list[0];

        setSportId(first ? String(first.sportId) : '');
        setDraft(first ? pick(first) : emptyDraft());
      })
      .catch((loadError) => {
        if (!ignore) {
          setError(loadError.message || 'Không thể tải giáo trình.');
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  const selectedMaterial = materials.find(
    (item) => String(item.sportId) === String(sportId)
  );

  // Chọn môn học
  const choose = (nextId) => {
    const found = materials.find(
      (item) => String(item.sportId) === String(nextId)
    );

    setSportId(nextId);
    setDraft(found ? pick(found) : emptyDraft());
    setOpenUnits(new Set());

    setIsEditing(false);
    setNotice('');
    setError('');
  };

  // Cập nhật thông tin chung
  const updateDraft = (field, value) => {
    setDraft((current) => ({
      ...current,
      [field]: value,
    }));
  };

  // Cập nhật nội dung buổi học
  const updateUnit = (index, field, value) => {
    setDraft((current) => ({
      ...current,
      units: current.units.map((unit, unitIndex) =>
        unitIndex === index
          ? { ...unit, [field]: value }
          : unit
      ),
    }));
  };

  // Thêm buổi học
  const addUnit = () => {
    setDraft((current) => ({
      ...current,
      units: [...current.units, emptyUnit()],
    }));
    // Mở sẵn buổi vừa thêm để nhập ngay.
    setOpenUnits((current) => new Set(current).add(draft.units.length));

    setNotice('');
  };

  const toggleUnit = (index) => {
    setOpenUnits((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const expandAll = () => setOpenUnits(new Set(draft.units.map((_, index) => index)));
  const collapseAll = () => setOpenUnits(new Set());

  // Xóa buổi học
  const removeUnit = (index) => {
    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa Buổi ${index + 1}?`
    );

    if (!confirmed) return;

    setDraft((current) => ({
      ...current,
      units: current.units.filter(
        (_, unitIndex) => unitIndex !== index
      ),
    }));
    setOpenUnits(new Set());

    setNotice('');
  };

  // Bật chế độ chỉnh sửa
  const startEditing = () => {
    if (!selectedMaterial) return;

    setDraft(pick(selectedMaterial));
    setIsEditing(true);
    setNotice('');
    setError('');
  };

  // Hủy chỉnh sửa và khôi phục dữ liệu đã lưu
  const cancelEditing = () => {
    const confirmed = window.confirm(
      'Bạn có chắc muốn hủy chỉnh sửa? Những thay đổi chưa lưu sẽ bị mất.'
    );

    if (!confirmed) return;

    setDraft(
      selectedMaterial
        ? pick(selectedMaterial)
        : emptyDraft()
    );

    setIsEditing(false);
    setNotice('');
    setError('');
  };

  // Lưu giáo trình
  const save = async () => {
    if (!sportId) {
      setError('Vui lòng chọn môn học trước khi lưu.');
      return;
    }

    if (!isEditing) return;

    setSaving(true);
    setError('');
    setNotice('');

    try {
      const saved = await saveCourseMaterial(sportId, {
        sourceName: draft.sourceName,
        sourceUrl: draft.sourceUrl,
        note: draft.note,
        units: draft.units.map((unit, index) => ({
          sortOrder: index + 1,
          label: unit.label,
          work: unit.work,
          review: unit.review,
        })),
      });

      setMaterials((current) =>
        current.map((item) =>
          String(item.sportId) === String(saved.sportId)
            ? saved
            : item
        )
      );

      setDraft(pick(saved));
      setIsEditing(false);
      setNotice('Đã lưu giáo trình thành công.');

    } catch (saveError) {
      setError(
        saveError.message || 'Không thể lưu giáo trình.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <ManagementShell
      breadcrumb={[
        { label: 'Bảng điều khiển', to: '/quan-ly' },
        { label: 'Giáo trình môn học' },
      ]}
    >
      <div className="mx-auto max-w-none space-y-7 pb-10">

        {/* =====================================
            HERO BANNER
        ====================================== */}
        <section className="relative min-h-[265px] overflow-hidden rounded-[26px] bg-[#11121a] px-6 py-9 shadow-sm sm:px-9 sm:py-10 lg:px-10">

          {/* Red diagonal background */}
          <div
            className="absolute inset-y-0 right-0 w-[46%] bg-[#ed1c24]"
            style={{
              clipPath: 'polygon(22% 0, 100% 0, 100% 100%, 0 100%)',
            }}
          />

          {/* Hero content */}
          <div className="relative z-10 max-w-[650px]">

            <div
              className="inline-flex bg-[#ed1c24] px-5 py-2"
              style={{
                clipPath: 'polygon(5% 0, 100% 0, 95% 100%, 0 100%)',
              }}
            >
              <span className="text-[11px] font-black tracking-[0.18em] text-white sm:text-xs">
                COURSE MATERIALS
              </span>
            </div>

            <h1 className="mt-5 text-3xl font-black italic uppercase leading-[1.1] tracking-tight text-white sm:text-4xl lg:text-[52px]">
              GIÁO TRÌNH MÔN HỌC
            </h1>

            <p className="mt-4 max-w-[570px] text-sm font-medium leading-6 text-slate-200 sm:text-base">
              Quản lý nội dung đào tạo, chương trình giảng dạy và lộ trình
              học tập theo từng buổi. Chuẩn hóa giáo trình cho các môn thể thao
              tại AnhDuy Sport.
            </p>

            <p className="mt-2 text-[11px] font-extrabold tracking-[0.16em] text-slate-500">
              SPORTS CURRICULUM &amp; TRAINING PROGRAM
            </p>
          </div>
        </section>

        {/* =====================================
            LOADING
        ====================================== */}
        {loading && (
          <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />

            <p className="mt-4 text-sm font-medium text-slate-500">
              Đang tải dữ liệu giáo trình...
            </p>
          </div>
        )}

        {/* =====================================
            ERROR
        ====================================== */}
        {!loading && error && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-100 font-black text-red-600">
              !
            </span>

            <div>
              <p className="font-bold text-red-800">
                Đã xảy ra lỗi
              </p>

              <p className="mt-1 text-sm text-red-700">
                {error}
              </p>
            </div>
          </div>
        )}

        {/* =====================================
            EMPTY STATE
        ====================================== */}
        {!loading && materials.length === 0 && !error && (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-8 w-8" aria-hidden="true">
                <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21V5.5Z" />
                <path d="M4 18a2 2 0 0 1 2-2h14" />
              </svg>
            </div>

            <h2 className="mt-5 text-lg font-black text-slate-900">
              Chưa có dữ liệu giáo trình
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              Hiện tại hệ thống chưa trả về môn học nào.
              Vui lòng kiểm tra dữ liệu hoặc API giáo trình.
            </p>
          </div>
        )}

        {/* =====================================
            MAIN CONTENT
        ====================================== */}
        {!loading && materials.length > 0 && (
          <>
            {/* CHỌN MÔN HỌC */}
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                <div>
                  <div className="flex items-center gap-2">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        className="h-5 w-5"
                      >
                        <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21V5.5Z" />
                        <path d="M4 18a2 2 0 0 1 2-2h14" />
                      </svg>
                    </span>

                    <h2 className="text-lg font-black text-slate-900">
                      Chọn môn học
                    </h2>
                  </div>

                  <p className="mt-2 text-sm text-slate-500">
                    Chọn môn để xem nội dung giáo trình.
                  </p>
                </div>

                <div className="w-full sm:max-w-xs">
                  <select
                    value={sportId}
                    onChange={(event) => choose(event.target.value)}
                    disabled={saving}
                    className={`${fieldClass} !mt-0`}
                  >
                    {materials.map((item) => (
                      <option
                        key={item.sportId}
                        value={item.sportId}
                      >
                        {item.sportName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedMaterial && (
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
                      {selectedMaterial.sportName}
                    </span>

                    <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
                      {draft.units.length} buổi học
                    </span>
                  </div>

                  {!isEditing ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      CHẾ ĐỘ XEM
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700">
                      <span className="h-2 w-2 rounded-full bg-amber-500" />
                      ĐANG CHỈNH SỬA
                    </span>
                  )}
                </div>
              )}
            </section>

            {/* =====================================
                THÔNG TIN GIÁO TRÌNH
            ====================================== */}
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      className="h-5 w-5"
                    >
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z" />
                    </svg>
                  </span>

                  <div>
                    <h2 className="text-lg font-black text-slate-900">
                      Thông tin giáo trình
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Thông tin tài liệu và hướng dẫn chung cho khóa học.
                    </p>
                  </div>
                </div>

                {!isEditing && (
                  <button
                    type="button"
                    onClick={startEditing}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#ed1c24] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-red-700"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="h-4 w-4"
                    >
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z" />
                    </svg>
                    Sửa giáo trình
                  </button>
                )}
              </div>

              <div className="grid gap-5">

                {/* TÊN TÀI LIỆU */}
                <div>
                  <p className="mb-2 text-sm font-bold text-slate-700">
                    Tên tài liệu
                  </p>

                  {isEditing ? (
                    <input
                      value={draft.sourceName}
                      onChange={(event) =>
                        updateDraft('sourceName', event.target.value)
                      }
                      className={fieldClass}
                      placeholder="Ví dụ: Giáo trình bóng đá cơ bản"
                    />
                  ) : (
                    <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-800">
                      {draft.sourceName || (
                        <span className="italic text-slate-400">
                          Chưa có tên tài liệu
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* ĐƯỜNG DẪN */}
                <div>
                  <p className="mb-2 text-sm font-bold text-slate-700">
                    Đường dẫn tài liệu
                  </p>

                  {isEditing ? (
                    <input
                      value={draft.sourceUrl}
                      onChange={(event) =>
                        updateDraft('sourceUrl', event.target.value)
                      }
                      className={fieldClass}
                      placeholder="https://..."
                    />
                  ) : (
                    <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm">
                      {draft.sourceUrl ? (
                        <a
                          href={draft.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="break-all font-semibold text-blue-600 hover:underline"
                        >
                          {draft.sourceUrl}
                        </a>
                      ) : (
                        <span className="italic text-slate-400">
                          Chưa có đường dẫn tài liệu
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* GHI CHÚ */}
                <div>
                  <p className="mb-2 text-sm font-bold text-slate-700">
                    Ghi chú chung
                  </p>

                  {isEditing ? (
                    <textarea
                      value={draft.note}
                      onChange={(event) =>
                        updateDraft('note', event.target.value)
                      }
                      rows={3}
                      className={fieldClass}
                      placeholder="Nhập ghi chú hoặc định hướng giảng dạy chung..."
                    />
                  ) : (
                    <div className="min-h-[80px] whitespace-pre-wrap rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
                      {draft.note || (
                        <span className="italic text-slate-400">
                          Không có ghi chú chung.
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* =====================================
                NỘI DUNG TỪNG BUỔI
            ====================================== */}
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      className="h-5 w-5"
                    >
                      <path d="M8 6h13M8 12h13M8 18h13" />
                      <path d="M3 6h.01M3 12h.01M3 18h.01" />
                    </svg>
                  </span>

                  <div>
                    <h2 className="text-lg font-black text-slate-900">
                      Nội dung từng buổi học
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Lộ trình đào tạo theo thứ tự từ đầu khóa đến cuối khóa.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="w-fit rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                    {draft.units.length} BUỔI HỌC
                  </span>
                  {draft.units.length > 1 && (
                    <button
                      type="button"
                      onClick={openUnits.size === draft.units.length ? collapseAll : expandAll}
                      className="inline-flex h-9 cursor-pointer items-center rounded-full border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-700 transition-colors hover:border-[#ed1c24] hover:text-[#ed1c24] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1c24]"
                    >
                      {openUnits.size === draft.units.length ? 'Thu gọn tất cả' : 'Mở tất cả'}
                    </button>
                  )}
                </div>
              </div>

              {/* DANH SÁCH BUỔI */}
              <div className="mt-6 space-y-4">

                {draft.units.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="mx-auto h-8 w-8 text-slate-400" aria-hidden="true">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z" />
                    </svg>

                    <p className="mt-3 font-bold text-slate-800">
                      Chưa có nội dung buổi học
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      {isEditing
                        ? 'Bấm “Thêm buổi học” để xây dựng giáo trình.'
                        : 'Môn học này hiện chưa có nội dung giáo trình.'}
                    </p>
                  </div>
                )}

                {draft.units.map((unit, index) => {
                  const open = openUnits.has(index);
                  const panelId = `unit-panel-${index}`;
                  const preview = (unit.work || '').replace(/\s+/g, ' ').trim();

                  return (
                  <div
                    key={index}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white transition-colors hover:border-slate-300"
                  >
                    {/* TIÊU ĐỀ BUỔI: bấm để mở/thu gọn */}
                    <div className="flex items-stretch">
                      <button
                        type="button"
                        aria-expanded={open}
                        aria-controls={panelId}
                        onClick={() => toggleUnit(index)}
                        className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 sm:px-5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1c24]"
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#111827] text-sm font-black text-white">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-black text-slate-900">
                            {unit.label || 'Chưa đặt tên buổi học'}
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-slate-500">
                            {open ? `Buổi học ${index + 1}` : preview || 'Chưa có nội dung thực hành'}
                          </span>
                        </span>
                        <svg className={`size-5 shrink-0 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
                      </button>

                      {isEditing && (
                        <button
                          type="button"
                          onClick={() => removeUnit(index)}
                          className="inline-flex cursor-pointer items-center gap-1.5 border-l border-slate-100 px-4 text-xs font-bold text-red-600 transition-colors hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1c24]"
                          aria-label={`Xóa buổi ${index + 1}`}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
                            <path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m4 4v6m6-6v6" />
                          </svg>
                          <span className="hidden sm:inline">Xóa buổi</span>
                        </button>
                      )}
                    </div>

                    {open && (
                      <div id={panelId} className="space-y-5 border-t border-slate-100 p-4 sm:p-5">

                      {/* TÊN BUỔI */}
                      <div>
                        <p className="mb-2 text-sm font-bold text-slate-700">
                          Tên buổi học
                        </p>

                        {isEditing ? (
                          <input
                            value={unit.label}
                            onChange={(event) =>
                              updateUnit(index, 'label', event.target.value)
                            }
                            className={fieldClass}
                            placeholder="Ví dụ: Làm quen với kỹ thuật cơ bản"
                          />
                        ) : (
                          <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900">
                            {unit.label || (
                              <span className="italic font-normal text-slate-400">
                                Chưa có tên buổi học
                              </span>
                            )}
                          </p>
                        )}
                      </div>

                      {/* NỘI DUNG THỰC HÀNH */}
                      <div>
                        <p className="mb-2 text-sm font-bold text-slate-700">
                          Nội dung thực hành
                        </p>

                        {isEditing ? (
                          <textarea
                            value={unit.work}
                            onChange={(event) =>
                              updateUnit(index, 'work', event.target.value)
                            }
                            rows={3}
                            className={fieldClass}
                            placeholder="Mô tả các hoạt động và kỹ năng học viên sẽ thực hiện trong buổi..."
                          />
                        ) : (
                          <div className="min-h-[65px] whitespace-pre-wrap rounded-xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
                            {unit.work || (
                              <span className="italic text-slate-400">
                                Chưa có nội dung thực hành.
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* ÔN TẬP */}
                      <div>
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <p className="text-sm font-bold text-slate-700">
                            Ôn tập và đánh giá
                          </p>

                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                            TÙY CHỌN
                          </span>
                        </div>

                        {isEditing ? (
                          <textarea
                            value={unit.review}
                            onChange={(event) =>
                              updateUnit(index, 'review', event.target.value)
                            }
                            rows={2}
                            className={fieldClass}
                            placeholder="Nhập nội dung ôn tập hoặc tiêu chí đánh giá nếu có..."
                          />
                        ) : (
                          <div className="min-h-[55px] whitespace-pre-wrap rounded-xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
                            {unit.review || (
                              <span className="italic text-slate-400">
                                Không có nội dung ôn tập.
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      </div>
                    )}
                  </div>
                  );
                })}
              </div>

              {/* THÊM BUỔI */}
              {isEditing && (
                <button
                  type="button"
                  onClick={addUnit}
                  className={`${quietButtonClass} mt-5 flex w-full items-center justify-center gap-2 border border-dashed border-blue-300 bg-blue-50/50 text-blue-700 hover:border-blue-500 hover:bg-blue-50`}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="h-4 w-4"
                  >
                    <path d="M12 5v14M5 12h14" />
                  </svg>

                  Thêm buổi học
                </button>
              )}
            </section>

            {/* =====================================
                THÔNG BÁO
            ====================================== */}
            {notice && (
              <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                  ✓
                </span>

                {notice}
              </div>
            )}

            {/* =====================================
                ACTIONS - CUỐI TRANG
                KHÔNG STICKY
            ====================================== */}
            {isEditing && (
              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                  <div>
                    <p className="text-base font-black text-slate-900">
                      Hoàn tất chỉnh sửa giáo trình?
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      Kiểm tra nội dung trước khi lưu thay đổi.
                    </p>
                  </div>

                  <div className="flex flex-col-reverse gap-3 sm:flex-row">

                    <button
                      type="button"
                      disabled={saving}
                      onClick={cancelEditing}
                      className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Hủy chỉnh sửa
                    </button>

                    <button
                      type="button"
                      disabled={saving}
                      onClick={save}
                      className={`${primaryButtonClass} inline-flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60`}
                    >
                      {saving ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                          Đang lưu...
                        </>
                      ) : (
                        <>
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className="h-4 w-4"
                          >
                            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" />
                            <path d="M17 21v-8H7v8M7 3v5h8" />
                          </svg>

                          Lưu giáo trình
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </ManagementShell>
  );
}

// Chuyển dữ liệu API thành dữ liệu hiển thị trong form
function pick(material) {
  return {
    sourceName: material.sourceName || '',
    sourceUrl: material.sourceUrl || '',
    note: material.note || '',
    units: (material.units || []).map((unit) => ({
      label: unit.label || '',
      work: unit.work || '',
      review: unit.review || '',
    })),
  };
}
