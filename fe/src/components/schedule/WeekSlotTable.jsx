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

  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-4 sm:p-6">
      <div className="flex flex-col gap-4 border-b border-gray-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-black text-balance text-gray-900">Thời khóa biểu tuần</h2>
          <p className="mt-1 text-sm text-gray-500 tabular-nums">
            Tuần ({shortDate(days[0].date)} – {shortDate(days[6].date)})
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onWeekStart(addDays(weekStart, -7))}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Tuần trước
          </button>
          <button
            type="button"
            onClick={() => onWeekStart(mondayOf(new Date()))}
            disabled={isThisWeek}
            className="rounded-lg bg-[#12141d] px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            Tuần này
          </button>
          <button
            type="button"
            onClick={() => onWeekStart(addDays(weekStart, 7))}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Tuần sau
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="py-10 text-sm text-pretty text-gray-500">Đang tải khung giờ.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[960px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500">
                <th className="w-28 px-3 py-3 font-semibold">Slot</th>
                {days.map(({ name, date }) => {
                  const iso = toIso(date);
                  const today = iso === todayIso;
                  return (
                    <th key={iso} className={`px-3 py-3 font-semibold ${today ? 'text-[#e31b23]' : 'text-gray-700'}`}>
                      <span className="block">{name}</span>
                      <span className="block text-xs font-medium tabular-nums text-gray-400">{shortDate(date)}</span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key} className="border-b border-gray-100 align-top">
                  <th className="px-3 py-3 font-semibold text-gray-900">
                    {row.number ? <span className="block tabular-nums">{row.number}</span> : null}
                    <span className="block text-xs font-medium text-gray-500 tabular-nums">
                      {formatClock(row.startTime)}–{formatClock(row.endTime)}
                    </span>
                  </th>
                  {days.map(({ date }) => {
                    const iso = toIso(date);
                    const items = weekSessions.filter(
                      (session) => String(session.date).slice(0, 10) === iso && slotKey(session.startTime, session.endTime) === row.key,
                    );
                    return (
                      <td key={`${row.key}-${iso}`} className="px-3 py-3">
                        {items.length === 0 ? (
                          <span className="text-gray-300">—</span>
                        ) : (
                          <div className="space-y-3">
                            {items.map((session) => (
                              <div key={session.id}>{renderCell(session)}</div>
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
