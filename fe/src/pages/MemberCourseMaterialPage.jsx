import { useEffect, useState } from 'react';
import { listCourseMaterials } from '../api/courseMaterialApi';
import CourseMaterialView from '../components/course/CourseMaterialView';
import { fieldClass } from '../components/coach/coachUi';

export default function MemberCourseMaterialPage() {
  const [materials, setMaterials] = useState([]);
  const [sportId, setSportId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = 'Giáo trình · AnhDuy Sport';
    let ignore = false;
    listCourseMaterials()
      .then((rows) => {
        if (ignore) return;
        const list = Array.isArray(rows) ? rows : [];
        setMaterials(list);
        setSportId(list[0] ? String(list[0].sportId) : '');
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

  const selected = materials.find((item) => String(item.sportId) === String(sportId)) || null;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-black">Giáo trình môn học</h1>
      <p className="mt-1 text-sm text-gray-500">Nội dung chung cho từng môn bạn đang học.</p>
      {loading && <p className="mt-6 text-sm text-gray-500">Đang tải giáo trình...</p>}
      {error && <p className="mt-6 text-sm font-semibold text-[#b1131a]">{error}</p>}
      {!loading && !error && materials.length === 0 && (
        <p className="mt-6 text-sm text-gray-600">Bạn chưa có môn nào để xem giáo trình.</p>
      )}
      {!loading && materials.length > 0 && (
        <div className="mt-6 space-y-4">
          <label className="block text-sm font-bold text-gray-700">
            Môn học
            <select value={sportId} onChange={(event) => setSportId(event.target.value)} className={fieldClass}>
              {materials.map((item) => (
                <option key={item.sportId} value={item.sportId}>
                  {item.sportName}
                </option>
              ))}
            </select>
          </label>
          <CourseMaterialView material={selected} />
        </div>
      )}
    </div>
  );
}
