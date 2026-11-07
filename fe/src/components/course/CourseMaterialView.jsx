import { useState } from 'react';
import { downloadCourseMaterialPdf } from '../../api/courseMaterialApi';

export default function CourseMaterialView({ material }) {
  const [downloadError, setDownloadError] = useState('');
  const units = material?.units || [];

  if (!material) {
    return <p className="text-sm text-gray-600">Chưa có giáo trình cho môn này.</p>;
  }

  const download = async () => {
    setDownloadError('');
    try {
      await downloadCourseMaterialPdf(material.sportId, material.sportName);
    } catch (error) {
      setDownloadError(error.message);
    }
  };

  return (
    <article className="bg-white text-gray-900 shadow-sm">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-gray-300 px-6 py-5">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-gray-500">GIÁO TRÌNH</p>
          <h2 className="mt-1 font-serif text-3xl font-semibold">{material.sportName}</h2>
        </div>
        <button type="button" onClick={download} className="border border-gray-900 px-4 py-2 text-sm font-semibold">
          Tải PDF
        </button>
      </header>
      <p className="px-6 py-4 text-sm leading-6 text-gray-600">
        Mỗi dòng là một phần theo thứ tự từ đầu đến cuối. Cột ôn tập chỉ có chữ khi giáo trình ghi phải ôn nội dung đã học. Ô trống nghĩa là giáo trình không ghi yêu cầu đó.
      </p>
      {downloadError && <p className="px-6 pb-2 text-sm font-semibold text-[#b1131a]">{downloadError}</p>}
      {units.length === 0 ? (
        <p className="px-6 pb-6 text-sm text-gray-700">Môn này chưa có buổi nào trong giáo trình.</p>
      ) : (
        <div className="overflow-x-auto px-6 pb-6">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="w-[22%] border border-gray-400 px-3 py-2 font-semibold">Buổi</th>
                <th className="w-[40%] border border-gray-400 px-3 py-2 font-semibold">Nội dung học</th>
                <th className="w-[38%] border border-gray-400 px-3 py-2 font-semibold">Ôn tập</th>
              </tr>
            </thead>
            <tbody>
              {units.map((unit) => (
                <tr key={unit.sortOrder} className="align-top">
                  <td className="border border-gray-300 px-3 py-3 font-semibold">{unit.label}</td>
                  <td className="border border-gray-300 px-3 py-3 whitespace-pre-line">{unit.work}</td>
                  <td className="border border-gray-300 px-3 py-3 whitespace-pre-line">{unit.review}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </article>
  );
}
