import React from 'react';
import { Link } from 'react-router-dom';

export default function MemberClassList({ loading, myClasses }) {
  return (
    <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs">
      <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-100">
        <div>
          <h2 className="text-lg font-black text-slate-900 uppercase">
            KHÓA HỌC & LỚP ĐÃ GHI DANH
          </h2>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Danh sách các lớp thể thao bạn đã đăng ký tham gia
          </p>
        </div>

        <Link to="/tuyen-sinh" className="text-xs font-extrabold text-[#e31b23] hover:underline">
          + Đăng ký khóa học mới
        </Link>
      </div>

      {loading ? (
        <div className="py-12 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#e31b23] border-t-transparent mb-2"></div>
          <p className="text-xs font-bold text-slate-400">Đang tải danh sách lớp học...</p>
        </div>
      ) : myClasses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {myClasses.map((cls, idx) => (
            <div
              key={cls.classId || idx}
              className="bg-slate-50 hover:bg-slate-100/80 rounded-2xl p-5 border border-slate-200 transition-all space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-black uppercase text-[#e31b23] bg-red-50 border border-red-100 px-2.5 py-0.5 rounded-md">
                    {cls.sportName || 'Thể thao'}
                  </span>
                  <h3 className="text-base font-black text-slate-900 mt-1.5">
                    {cls.className || cls.courseName}
                  </h3>
                </div>

                <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 uppercase">
                  ✓ Đã ghi danh
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-200/60">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Cấp độ:</span>
                  <span className="font-bold text-slate-800">{cls.level || 'Cơ bản'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">HLV Phụ trách:</span>
                  <span className="font-bold text-slate-800">{cls.coachName || 'Đang cập nhật'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Thời gian học:</span>
                  <span className="font-bold text-slate-800">
                    {cls.startDate} ~ {cls.endDate}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-12 px-4 text-center max-w-md mx-auto space-y-4">
          <div className="w-16 h-16 bg-red-50 text-[#e31b23] rounded-full flex items-center justify-center mx-auto text-2xl font-black">
            🏋️
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 uppercase">
              BẠN CHƯA ĐĂNG KÝ LỚP HỌC NÀO
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Hãy khám phá danh sách các khóa học thể thao đa dạng tại AnhDuy Sport để bắt đầu rèn luyện!
            </p>
          </div>

          <Link
            to="/tuyen-sinh"
            className="inline-block bg-[#e31b23] hover:bg-[#c4131a] text-white font-black text-xs uppercase px-8 py-3.5 rounded-xl shadow-md transition-all cursor-pointer"
          >
            KHÁM PHÁ CÁC KHÓA HỌC →
          </Link>
        </div>
      )}
    </section>
  );
}