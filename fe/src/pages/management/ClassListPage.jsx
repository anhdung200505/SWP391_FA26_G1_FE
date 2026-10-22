import React, { useState, useEffect } from 'react';
import ManagementShell from '../../components/management/ManagementShell';
import { DiagramCaption } from '../../components/management/ManagementBits';
import { getClasses, getClassDetail, getSports } from '../../api/managementApi';

export default function ClassListPage() {
  const [classes, setClasses] = useState([]);
  const [sports, setSports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSport, setSelectedSport] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal Chi tiết Lớp học & Lịch học
  const [selectedClass, setSelectedClass] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Load danh sách Bộ môn & Lớp học
  const fetchData = async () => {
    try {
      setLoading(true);
      const [sportsData, classesData] = await Promise.all([
        getSports('1').catch(() => []),
        getClasses('1', selectedSport || undefined).catch(() => []),
      ]);
      setSports(Array.isArray(sportsData) ? sportsData : []);
      setClasses(Array.isArray(classesData) ? classesData : []);
    } catch (err) {
      console.error('Lỗi khi tải danh sách lớp học:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedSport]);

  // Xem chi tiết lớp học & danh sách slots
  const handleViewDetail = async (classId) => {
    try {
      setLoadingDetail(true);
      const detail = await getClassDetail(classId);
      setSelectedClass(detail);
    } catch (err) {
      alert('Không thể lấy thông tin chi tiết lớp học.');
    } finally {
      setLoadingDetail(false);
    }
  };

  // Lọc theo từ khóa tìm kiếm
  const filteredClasses = classes.filter(
    (c) =>
      c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.sportName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.coachName?.toLowerCase().includes(searchTerm.toLowerCase())
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
      <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          {/* Lọc theo Bộ Môn */}
          <select
            value={selectedSport}
            onChange={(e) => setSelectedSport(e.target.value)}
            className="w-full sm:w-48 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-[#e31b23] cursor-pointer"
          >
            <option value="">Tất cả môn học</option>
            {sports.map((sport) => (
              <option key={sport.id} value={sport.id}>
                {sport.name} ({sport.openClassCount || 0} lớp)
              </option>
            ))}
          </select>

          {/* Ô Tìm Kiếm */}
          <input
            type="text"
            placeholder="Tìm theo tên lớp, môn học, HLV..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-64 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium outline-none focus:border-[#e31b23]"
          />
        </div>

        <button
          onClick={fetchData}
          disabled={loading}
          className="w-full sm:w-auto bg-slate-900 hover:bg-[#e31b23] text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-colors cursor-pointer"
        >
          🔄 Làm mới danh sách
        </button>
      </div>

      {/* DANH SÁCH BẢNG LỚP HỌC */}
      <div className="mt-6 bg-white rounded-3xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-black text-slate-900 uppercase">
            Danh sách Lớp học ({filteredClasses.length})
          </h2>
        </div>

        {loading ? (
          <div className="py-16 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#e31b23] border-t-transparent mb-2"></div>
            <p className="text-xs font-bold text-gray-400">Đang tải danh sách lớp học...</p>
          </div>
        ) : filteredClasses.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-gray-100 text-gray-400 font-extrabold uppercase text-[10px] tracking-wider">
                  <th className="p-4">Tên lớp / Môn</th>
                  <th className="p-4">Trình độ</th>
                  <th className="p-4">HLV Phụ trách</th>
                  <th className="p-4">Địa điểm / Phòng</th>
                  <th className="p-4">Sĩ số / Còn trống</th>
                  <th className="p-4">Học phí</th>
                  <th className="p-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium text-slate-700">
                {filteredClasses.map((cls) => (
                  <tr key={cls.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* TÊN LỚP */}
                    <td className="p-4">
                      <p className="font-bold text-slate-900 text-sm">{cls.name}</p>
                      <span className="inline-block bg-red-50 text-[#e31b23] border border-red-100 font-bold text-[10px] px-2 py-0.5 rounded mt-1">
                        {cls.sportName}
                      </span>
                    </td>

                    {/* TRÌNH ĐỘ */}
                    <td className="p-4">
                      <span className="bg-slate-100 text-slate-700 font-bold px-2.5 py-1 rounded-md">
                        {cls.level}
                      </span>
                    </td>

                    {/* HLV */}
                    <td className="p-4 font-bold text-slate-800">
                      👤 {cls.coachName || 'Đang cập nhật'}
                    </td>

                    {/* PHÒNG TẬP */}
                    <td className="p-4 text-slate-600">
                      📍 {cls.roomName || 'Sân tập'}
                    </td>

                    {/* SĨ SỐ */}
                    <td className="p-4">
                      <span className="font-bold text-slate-900">{cls.enrolledCount}/{cls.capacity}</span>
                      <span className="text-[11px] text-emerald-600 font-bold ml-1.5 bg-emerald-50 px-2 py-0.5 rounded">
                        còn {cls.availableSeats} chỗ
                      </span>
                    </td>

                    {/* HỌC PHÍ */}
                    <td className="p-4 font-black text-[#e31b23] text-sm">
                      {cls.tuition?.toLocaleString('vi-VN')} đ
                    </td>

                    {/* THAO TÁC */}
                    <td className="p-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleViewDetail(cls.id)}
                        className="bg-slate-900 hover:bg-[#e31b23] text-white font-bold text-[11px] px-3.5 py-1.5 rounded-xl transition-colors cursor-pointer"
                      >
                        👁️ Chi tiết & Lịch
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center text-xs font-bold text-gray-400">
            Không tìm thấy lớp học nào phù hợp.
          </div>
        )}
      </div>

      {/* MODAL POPUP CHI TIẾT LỚP HỌC & LỊCH HỌC */}
      {selectedClass && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-fadeIn max-h-[90vh] overflow-y-auto">
            
            {/* HEADER MODAL */}
            <div className="flex items-start justify-between pb-4 border-b border-gray-100">
              <div>
                <span className="inline-block bg-[#e31b23] text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded -skew-x-12 mb-1">
                  <span className="inline-block skew-x-12">{selectedClass.sportName}</span>
                </span>
                <h3 className="text-xl font-black text-slate-900 uppercase">
                  {selectedClass.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedClass(null)}
                className="text-slate-400 hover:text-slate-700 font-bold text-lg p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* THÔNG TIN TỔNG QUAN */}
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
                <strong className="text-slate-800">{selectedClass.level} ({selectedClass.ageRange || 'Mọi độ tuổi'})</strong>
              </div>
              <div>
                <span className="text-gray-400 font-bold block">Thời gian khóa học:</span>
                <strong className="text-slate-800">{selectedClass.startDate} ~ {selectedClass.endDate}</strong>
              </div>
              <div>
                <span className="text-gray-400 font-bold block">Học phí:</span>
                <strong className="text-[#e31b23] text-sm font-black">{selectedClass.tuition?.toLocaleString('vi-VN')} đ</strong>
              </div>
              <div>
                <span className="text-gray-400 font-bold block">Sĩ số:</span>
                <strong className="text-emerald-600 font-bold">{selectedClass.enrolledCount}/{selectedClass.capacity} học viên</strong>
              </div>
            </div>

            {/* MÔ TẢ LỚP HỌC */}
            {selectedClass.description && (
              <div className="text-xs text-slate-600 bg-red-50/50 border border-red-100 p-3.5 rounded-xl">
                <strong className="text-slate-900 block mb-1">Mô tả khóa học:</strong>
                <p>{selectedClass.description}</p>
              </div>
            )}

            {/* DANH SÁCH BUỔI HỌC (SLOTS) */}
            <div>
              <h4 className="text-xs font-black uppercase text-slate-900 mb-3">
                📅 Danh sách các buổi học ({selectedClass.slots?.length || 0} buổi)
              </h4>

              {selectedClass.slots && selectedClass.slots.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
                  {selectedClass.slots.map((slot) => (
                    <div key={slot.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-900 block">{slot.title || 'Buổi học'}</span>
                        <span className="text-slate-500 text-[11px]">{slot.date}</span>
                      </div>
                      <span className="font-mono font-bold bg-slate-200 text-slate-800 px-2 py-1 rounded">
                        {slot.startTime} - {slot.endTime}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic">Chưa có lịch học chi tiết được xếp.</p>
              )}
            </div>

            <div className="pt-2 text-right">
              <button
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