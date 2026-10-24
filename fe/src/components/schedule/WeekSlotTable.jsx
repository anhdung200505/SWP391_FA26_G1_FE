import { useEffect, useState } from 'react';
import { getTimeSlots } from '../../api/managementApi';

const DAY_NAMES = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];

const pad = (value) => String(value).padStart(2, '0');

export function toIso(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function mondayOf(date) {
  const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  copy.setDate(copy.getDate() - ((copy.getDay() + 6) % 7));
  return copy;
}

export function addDays(date, days) {
  const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function formatClock(value) {
  return String(value || '').slice(0, 5);
}

function shortDate(date) {
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}`;
}

function slotKey(startTime, endTime) {
  return `${formatClock(startTime)}-${formatClock(endTime)}`;
}

export function weekContaining(isoDates) {
  const today = toIso(new Date());
  const dates = (isoDates || []).filter(Boolean).sort();
  const target = dates.find((date) => date >= today) || dates.at(-1);
  if (!target) return mondayOf(new Date());
  const [year, month, day] = target.split('-').map(Number);
  return mondayOf(new Date(year, month - 1, day));
}

export default function WeekSlotTable({ weekStart, onWeekStart, sessions = [], renderCell }) {
  const [slots, setSlots] = useState([]);

  useEffect(() => {
    let ignore = false;
    getTimeSlots('group')
      .then((data) => {
        if (!ignore) setSlots(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!ignore) setSlots([]);
      });
    return () => {
      ignore = true;
    };
  }, []);

  const days = DAY_NAMES.map((name, index) => ({ name, date: addDays(weekStart, index) }));
  const firstIso = toIso(days[0].date);
  const lastIso = toIso(days[6].date);
  const todayIso = toIso(new Date());
  const isThisWeek = firstIso === toIso(mondayOf(new Date()));

  const weekSessions = sessions.filter((session) => {
    const date = String(session.date || '').slice(0, 10);
    return date >= firstIso && date <= lastIso;
  });

  const rows = (() => {
    const catalog = slots.map((slot) => ({
      key: slotKey(slot.startTime, slot.endTime),
      number: slot.id,
      startTime: slot.startTime,
      endTime: slot.endTime,
    }));
    const seen = new Set(catalog.map((row) => row.key));
    const extras = [];
    weekSessions.forEach((session) => {
      const key = slotKey(session.startTime, session.endTime);
      if (seen.has(key)) return;
      seen.add(key);
      extras.push({ key, number: '', startTime: session.startTime, endTime: session.endTime });
    });
    return [...catalog, ...extras].sort((left, right) => formatClock(left.startTime).localeCompare(formatClock(right.startTime)));
  })();

  const navButton =
    'rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50 cursor-pointer';

  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-4 shadow-xs sm:p-6">
      <div className="flex flex-col gap-4 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-black uppercase text-balance text-slate-900">Thời khóa biểu tuần</h2>
          <p className="mt-1 text-xs font-bold text-slate-400 tabular-nums">
            Tuần {shortDate(days[0].date)} – {shortDate(days[6].date)}/{days[6].date.getFullYear()} · {weekSessions.length} buổi
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => onWeekStart(addDays(weekStart, -7))} className={navButton}>
            ← Tuần trước
          </button>
          <button
            type="button"
            onClick={() => onWeekStart(mondayOf(new Date()))}
            disabled={isThisWeek}
            className="rounded-xl bg-[#12141d] px-3.5 py-2 text-xs font-bold text-white transition-colors hover:bg-[#e31b23] disabled:bg-slate-300 disabled:cursor-default cursor-pointer"
          >
            Tuần này
          </button>
          <button type="button" onClick={() => onWeekStart(addDays(weekStart, 7))} className={navButton}>
            Tuần sau →
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-pretty text-gray-500">Đang tải khung giờ.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full min-w-[980px] table-fixed border-collapse text-left text-sm">
            <colgroup>
              <col className="w-28" />
              {days.map(({ date }) => (
                <col key={toIso(date)} />
              ))}
            </colgroup>
            <thead>
              <tr className="bg-slate-50">
                <th className="border-b border-slate-200 px-3 py-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  Khung giờ
                </th>
                {days.map(({ name, date }) => {
                  const iso = toIso(date);
                  const today = iso === todayIso;
                  return (
                    <th
                      key={iso}
                      className={`border-b border-l border-slate-200 px-3 py-3 ${today ? 'bg-red-50 text-[#e31b23]' : 'text-slate-700'}`}
                    >
                      <span className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wide">
                        {name}
                        {today && (
                          <span className="rounded-full bg-[#e31b23] px-1.5 py-0.5 text-[9px] font-black normal-case tracking-normal text-white">
                            Hôm nay
                          </span>
                        )}
                      </span>
                      <span className={`block text-[11px] font-bold tabular-nums ${today ? 'text-[#e31b23]/70' : 'text-slate-400'}`}>
                        {shortDate(date)}
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key} className="align-top">
                  <th className="border-t border-slate-100 bg-slate-50/60 px-3 py-3">
                    {row.number ? (
                      <span className="inline-flex size-6 items-center justify-center rounded-lg bg-[#12141d] text-[11px] font-black tabular-nums text-white">
                        {row.number}
                      </span>
                    ) : null}
                    <span className="mt-1.5 block text-xs font-bold text-slate-600 tabular-nums">
                      {formatClock(row.startTime)}
                    </span>
                    <span className="block text-[11px] font-semibold text-slate-400 tabular-nums">{formatClock(row.endTime)}</span>
                  </th>
                  {days.map(({ date }) => {
                    const iso = toIso(date);
                    const today = iso === todayIso;
                    const items = weekSessions.filter(
                      (session) => String(session.date).slice(0, 10) === iso && slotKey(session.startTime, session.endTime) === row.key,
                    );
                    return (
                      <td
                        key={`${row.key}-${iso}`}
                        className={`h-24 border-t border-l border-slate-100 p-2 ${today ? 'bg-red-50/40' : ''}`}
                      >
                        {items.length > 0 && (
                          <div className="space-y-2">
                            {items.map((session) => (
                              <div
                                key={session.id}
                                className={`rounded-xl border border-l-4 p-2.5 text-xs shadow-xs ${
                                  session.status === 'cancelled'
                                    ? 'border-slate-200 border-l-slate-300 bg-slate-50'
                                    : 'border-slate-200 border-l-[#e31b23] bg-white'
                                }`}
                              >
                                {renderCell(session)}
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
