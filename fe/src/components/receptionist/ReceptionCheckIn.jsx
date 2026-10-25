import { useState } from 'react';
import { checkInMember } from '../../api/receptionClassRegistrationApi';

export default function ReceptionCheckIn() {
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const submit = async (event) => {
    event.preventDefault();
    const value = keyword.trim();
    if (!value) {
      setError('Nhập mã học viên hoặc số điện thoại.');
      setResult(null);
      return;
    }

    setLoading(true);
    setError('');
    try {
      setResult(await checkInMember(value));
    } catch (err) {
      setResult(null);
      setError(err.message || 'Không check-in được học viên.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-6">
      <h2 className="text-xl font-black text-balance">Check-in học viên</h2>
      <p className="mt-2 text-sm text-pretty text-gray-500">
        Nhập mã học viên hoặc số điện thoại. Hệ thống ghi có mặt vào buổi đang diễn ra, hoặc buổi sắp tới trong hôm nay.
      </p>
      <form onSubmit={submit} className="mt-5 flex gap-2">
        <label className="sr-only" htmlFor="reception-checkin">
          Mã học viên hoặc số điện thoại
        </label>
        <input
          id="reception-checkin"
          type="text"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder="Mã học viên hoặc số điện thoại"
          className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-[#e31b23]"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-[#e31b23] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {loading ? 'Đang check-in...' : 'Check-in'}
        </button>
      </form>

      {error && (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </p>
      )}

      {result && (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm">
          <p className="font-black text-emerald-800">{result.message}</p>
          <dl className="mt-3 grid gap-2 text-slate-700 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-bold uppercase text-slate-400">Học viên</dt>
              <dd className="font-semibold">{result.fullName}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase text-slate-400">Điện thoại</dt>
              <dd className="font-semibold">{result.phone || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase text-slate-400">Lớp</dt>
              <dd className="font-semibold">{result.className}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase text-slate-400">Buổi học</dt>
              <dd className="font-semibold">{result.sessionLabel}</dd>
            </div>
          </dl>
        </div>
      )}
    </section>
  );
}
