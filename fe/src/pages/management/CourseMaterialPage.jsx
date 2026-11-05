import { useEffect, useState } from 'react';
import ManagementShell from '../../components/management/ManagementShell';
import { listCourseMaterials, saveCourseMaterial } from '../../api/courseMaterialApi';
import { fieldClass, primaryButtonClass, quietButtonClass } from '../../components/coach/coachUi';

const emptyUnit = () => ({ label: '', work: '', review: '' });

export default function CourseMaterialPage() {
  const [materials, setMaterials] = useState([]);
  const [sportId, setSportId] = useState('');
  const [draft, setDraft] = useState({ sourceName: '', sourceUrl: '', note: '', units: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
        setDraft(first ? pick(first) : { sourceName: '', sourceUrl: '', note: '', units: [] });
      })
      .catch((loadError) => {
        if (!ignore) setError(loadError.message);
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, []);

  const choose = (nextId) => {
    setSportId(nextId);
    const found = materials.find((item) => String(item.sportId) === String(nextId));
    setDraft(found ? pick(found) : { sourceName: '', sourceUrl: '', note: '', units: [] });
    setNotice('');
    setError('');
  };

  const updateUnit = (index, field, value) => {
    setDraft((current) => ({
      ...current,
      units: current.units.map((unit, unitIndex) => (unitIndex === index ? { ...unit, [field]: value } : unit)),
    }));
  };

  const save = async () => {
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
      setMaterials((current) => current.map((item) => (item.sportId === saved.sportId ? saved : item)));
      setDraft(pick(saved));
      setNotice('Đã lưu giáo trình theo buổi.');
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ManagementShell breadcrumb={[{ label: 'Bảng điều khiển', to: '/quan-ly' }, { label: 'Giáo trình môn học' }]}>
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-black">Giáo trình môn học</h1>
        <p className="mt-1 text-sm text-gray-500">
          Một mẫu cho mọi môn: danh sách buổi từ đầu khóa đến cuối khóa. Bảy môn giữ thứ tự liên đoàn đã công bố. Bóng đá, bóng bàn, kiếm thuật, nhảy hiện đại và Golf 3D được xếp từ thứ tự kỹ năng đã công bố, vì các liên đoàn không có một thời khóa biểu cố định.
        </p>
        {loading && <p className="mt-6 text-sm text-gray-500">Đang tải...</p>}
        {error && <p className="mt-4 text-sm font-semibold text-[#b1131a]">{error}</p>}
        {!loading && materials.length > 0 && (
          <div className="mt-6 space-y-4 rounded-3xl border border-gray-200 bg-white p-5 sm:p-6">
            <label className="block text-sm font-bold text-gray-700">
              Môn học
              <select value={sportId} onChange={(event) => choose(event.target.value)} className={fieldClass}>
                {materials.map((item) => (
                  <option key={item.sportId} value={item.sportId}>
                    {item.sportName}
                  </option>
                ))}
              </select>
            </label>
            <div className="space-y-3">
              {draft.units.map((unit, index) => (
                <div key={index} className="rounded-2xl border border-gray-200 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-bold text-gray-500">Buổi {index + 1}</p>
                    <button
                      type="button"
                      className="text-xs font-bold text-[#b1131a]"
                      onClick={() =>
                        setDraft((current) => ({ ...current, units: current.units.filter((_, unitIndex) => unitIndex !== index) }))
                      }
                    >
                      Xóa buổi
                    </button>
                  </div>
                  <input
                    value={unit.label}
                    onChange={(event) => updateUnit(index, 'label', event.target.value)}
                    className={fieldClass}
                    placeholder="Tên buổi"
                  />
                  <textarea
                    value={unit.work}
                    onChange={(event) => updateUnit(index, 'work', event.target.value)}
                    rows={3}
                    className={fieldClass}
                    placeholder="Việc học viên làm trong buổi"
                  />
                  <textarea
                    value={unit.review}
                    onChange={(event) => updateUnit(index, 'review', event.target.value)}
                    rows={2}
                    className={fieldClass}
                    placeholder="Ôn tập, chỉ điền khi giáo trình có yêu cầu"
                  />
                </div>
              ))}
            </div>
            <button
              type="button"
              className={quietButtonClass}
              onClick={() => setDraft((current) => ({ ...current, units: [...current.units, emptyUnit()] }))}
            >
              Thêm buổi
            </button>
            {notice && <p className="text-sm font-semibold text-emerald-800">{notice}</p>}
            <button type="button" disabled={saving} onClick={save} className={primaryButtonClass}>
              {saving ? 'Đang lưu...' : 'Lưu giáo trình'}
            </button>
          </div>
        )}
      </div>
    </ManagementShell>
  );
}

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
