import React from 'react';
import { Link } from 'react-router-dom';
import {
  cardClass,
  cardHeadClass,
  sectionTitle,
  sectionSub,
  linkAccent,
  btnPrimary,
  emptyBox,
  spinnerClass,
} from './memberUi';

export default function MemberClassList({ loading, myClasses }) {
  return (
    <section className={cardClass}>
      <div className={`flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between ${cardHeadClass}`}>
        <div>
          <h2 className={sectionTitle}>Khóa học và lớp đã ghi danh</h2>
          <p className={sectionSub}>Danh sách các lớp thể thao bạn đã đăng ký tham gia</p>
        </div>

        <Link to="/dang-ky-khoa-hoc" className={linkAccent}>
          + Đăng ký khóa học mới
        </Link>
      </div>

      {loading ? (
        <div className="py-12 text-center">
          <div className={`${spinnerClass} mb-2`}></div>
          <p className="text-sm font-bold text-slate-500">Đang tải danh sách lớp học...</p>
        </div>
      ) : myClasses.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {myClasses.map((cls, idx) => (
            <div
              key={cls.classId || idx}
              className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-5 transition-colors hover:bg-slate-100/80"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="rounded-md border border-red-100 bg-red-50 px-2.5 py-0.5 text-xs font-black uppercase text-[#e31b23]">
                    {cls.sportName || 'Thể thao'}
                  </span>
                  <h3 className="mt-1.5 text-base font-black text-slate-900">{cls.className || cls.courseName}</h3>
                </div>

                <span className="whitespace-nowrap rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700">
                  Đã ghi danh
                </span>
              </div>

              <dl className="space-y-1.5 border-t border-slate-200/60 pt-2 text-sm text-slate-600">
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">HLV phụ trách</dt>
                  <dd className="font-bold text-slate-800">{cls.coachName || 'Đang cập nhật'}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Thời gian học</dt>
                  <dd className="font-bold text-slate-800 tabular-nums">
                    {cls.startDate} ~ {cls.endDate}
                  </dd>
                </div>
              </dl>
            </div>
          ))}
        </div>
      ) : (
        <div className={`${emptyBox} mx-auto max-w-md space-y-4 px-4 py-10`}>
          <div>
            <h3 className="text-base font-black text-slate-900">Bạn chưa đăng ký lớp học nào</h3>
            <p className="mt-1 text-sm text-slate-500">
              Hãy khám phá danh sách các khóa học thể thao tại AnhDuy Sport để bắt đầu rèn luyện.
            </p>
          </div>

          <Link to="/tuyen-sinh" className={btnPrimary}>
            Khám phá các khóa học →
          </Link>
        </div>
      )}
    </section>
  );
}
