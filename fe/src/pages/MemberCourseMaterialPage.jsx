
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
        if (!ignore) {
          setError(
            loadError.message || 'Không thể tải giáo trình.'
          );
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  const selected =
    materials.find(
      (item) => String(item.sportId) === String(sportId)
    ) || null;

  const chooseSport = (nextId) => {
    setSportId(nextId);
    setError('');
  };

  return (
    <div className="mx-auto max-w-none space-y-7 pb-10">

      {/* =====================================
          LOADING
      ====================================== */}
      {loading && (
        <section className="rounded-3xl border border-gray-200 bg-white p-12 text-center shadow-sm">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-[#ed1c24]" />

          <p className="mt-4 text-sm font-semibold text-gray-600">
            Đang tải giáo trình...
          </p>

          <p className="mt-1 text-xs text-gray-400">
            Vui lòng đợi trong giây lát.
          </p>
        </section>
      )}

      {/* =====================================
          ERROR
      ====================================== */}
      {!loading && error && (
        <section className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-lg font-black text-red-600">
            !
          </span>

          <div>
            <h2 className="font-black text-red-800">
              Không thể tải giáo trình
            </h2>

            <p className="mt-1 text-sm leading-6 text-red-700">
              {error}
            </p>
          </div>
        </section>
      )}

      {/* =====================================
          EMPTY STATE
      ====================================== */}
      {!loading && !error && materials.length === 0 && (
        <section className="rounded-3xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center shadow-sm">

          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 text-3xl">
            📚
          </div>

          <h2 className="mt-5 text-lg font-black text-gray-900">
            Chưa có giáo trình
          </h2>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
            Hiện tại chưa có dữ liệu giáo trình để hiển thị.
            Vui lòng quay lại sau.
          </p>
        </section>
      )}

      {/* =====================================
          MAIN CONTENT
      ====================================== */}
      {!loading && !error && materials.length > 0 && (
        <>
          {/* CHỌN MÔN HỌC */}
          <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">

            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
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

                <div>
                  <h2 className="text-lg font-black text-gray-900">
                    Chọn môn học
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-gray-500">
                    Chọn môn bạn muốn xem giáo trình và nội dung đào tạo.
                  </p>
                </div>
              </div>

              <div className="w-full sm:max-w-xs">
                <label
                  htmlFor="member-sport-select"
                  className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500"
                >
                  Môn học
                </label>

                <select
                  id="member-sport-select"
                  value={sportId}
                  onChange={(event) => chooseSport(event.target.value)}
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

            {/* SELECTED SPORT INFO */}
            {selected && (
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">

                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
                    {selected.sportName}
                  </span>

                  <span className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-600">
                    {selected.units?.length || 0} buổi học
                  </span>
                </div>

                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  SẴN SÀNG TRA CỨU
                </span>
              </div>
            )}
          </section>

          {/* =====================================
              COURSE MATERIAL VIEW
          ====================================== */}
          {selected && (
            <section className="space-y-4">

              <div className="flex items-center gap-3 px-1">
                <span className="h-6 w-1.5 rounded-full bg-[#ed1c24]" />

                <div>
                  <h2 className="text-lg font-black text-gray-900">
                    Nội dung giáo trình
                  </h2>

                  <p className="mt-0.5 text-sm text-gray-500">
                    {selected.sportName} · Lộ trình học tập theo từng buổi
                  </p>
                </div>
              </div>

              <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
                <CourseMaterialView material={selected} />
              </div>

            </section>
          )}

          {/* FOOTER NOTE */}
          <div className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-lg shadow-sm">
              💡
            </span>

            <div>
              <p className="text-sm font-bold text-gray-800">
                Mẹo học tập
              </p>

              <p className="mt-1 text-xs leading-5 text-gray-500">
                Hãy xem trước nội dung từng buổi để chuẩn bị tốt hơn
                cho quá trình luyện tập. Bạn có thể chọn môn khác
                bất cứ lúc nào để tra cứu giáo trình tương ứng.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
