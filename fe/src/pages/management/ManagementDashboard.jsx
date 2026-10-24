import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import ManagementShell from '../../components/management/ManagementShell';
import MemberTokenUsageTable from '../../components/management/MemberTokenUsageTable';
import { DiagramCaption, StatusBadge } from '../../components/management/ManagementBits';
import { useAccountManagement } from '../../context/AccountManagementContext';
import { formatDateTime, formatFee, getRole } from '../../data/accountManagement';
import { getEscalatedSupportRequests, processSupportRequestDecision } from '../../api/managementApi';

export default function ManagementDashboard() {
  const { users, packages, logs, loading, error } = useAccountManagement();
  const location = useLocation();
  const highlightId = location.state?.logId;
  const highlightedLog = logs.find((log) => log.id === highlightId);

  // ---------- STATE QUẢN LÝ ĐƠN HỖ TRỢ (ADMIN) ----------
  const [escalatedRequests, setEscalatedRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [selectedReq, setSelectedReq] = useState(null);
  const [decisionNote, setDecisionNote] = useState('');
  const [submittingDecision, setSubmittingDecision] = useState(false);
  const [actionNotice, setActionNotice] = useState({ type: '', msg: '' });

  // Tải danh sách đơn Lễ tân chuyển lên
  const fetchEscalatedRequests = async () => {
    try {
      setLoadingRequests(true);
      const data = await getEscalatedSupportRequests().catch(() => []);
      setEscalatedRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Lỗi tải danh sách đơn hỗ trợ:', err);
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    document.title = 'Bảng điều khiển quản lý · AnhDuy Sport';
    fetchEscalatedRequests();
  }, []);

  useEffect(() => {
    if (!highlightId) return undefined;
    const row = document.getElementById(`log-${highlightId}`);
    if (row) row.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return undefined;
  }, [highlightId]);

  // Xử lý Phê duyệt / Từ chối đơn
  const handleDecision = async (decision) => {
    if (!selectedReq) return;
    setSubmittingDecision(true);
    setActionNotice({ type: '', msg: '' });

    try {
      const res = await processSupportRequestDecision(selectedReq.id, {
        decision: decision, // 'approved' hoặc 'rejected'
        note: decisionNote.trim(),
      });

      setActionNotice({
        type: 'success',
        msg: `Đã ${decision === 'approved' ? 'Phê duyệt' : 'Từ chối'} yêu cầu thành công! Hệ thống đã gửi email thông báo cho học viên.`,
      });

      setSelectedReq(null);
      setDecisionNote('');
      fetchEscalatedRequests();
    } catch (err) {
      setActionNotice({ type: 'error', msg: err.message || 'Xử lý yêu cầu thất bại.' });
    } finally {
      setSubmittingDecision(false);
    }
  };

  const activeCount = users.filter((user) => user.status === 'active').length;
  const inactiveCount = users.length - activeCount;

  return (
    <ManagementShell breadcrumb={[{ label: 'Bảng điều khiển' }]}>
      {/* BANNER HEADER */}
      <section className="relative overflow-hidden rounded-3xl bg-[#12141d] px-6 py-8 text-white sm:px-8">
        <div
          className="pointer-events-none absolute inset-y-0 right-0 hidden w-[46%] bg-[#e31b23] sm:block"
          style={{ clipPath: 'polygon(22% 0, 100% 0, 100% 100%, 0 100%)' }}
        />
        <div className="relative max-w-xl">
          <span className="inline-block bg-[#e31b23] px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-white -skew-x-12">
            <span className="inline-block skew-x-12">Center Manager</span>
          </span>
          <h1 className="mt-4 text-3xl font-black uppercase italic leading-none tracking-tight sm:text-5xl">
            Quản lý tài khoản
            <br />
            và trung tâm
          </h1>
          <p className="mt-4 max-w-md text-sm leading-6 text-white/75 sm:text-base">
            Quản lý tài khoản, các gói hội viên, danh mục lớp học thể thao và duyệt các yêu cầu hỗ trợ chuyển lên.
          </p>
          <DiagramCaption>
            <span className="text-white/40">Access Management Dashboard</span>
          </DiagramCaption>
        </div>
      </section>

      {/* THÔNG BÁO KHI CÓ HÀNH ĐỘNG XỬ LÝ */}
      {actionNotice.msg && (
        <div
          className={`mt-4 p-4 rounded-2xl text-xs font-bold border flex items-center justify-between ${
            actionNotice.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}
        >
          <span>{actionNotice.msg}</span>
          <button
            onClick={() => setActionNotice({ type: '', msg: '' })}
            className="font-bold text-sm cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {highlightedLog && (
        <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-700">
            View Updated Management Dashboard
          </p>
          <p className="mt-1 text-base font-black text-emerald-950">Bảng điều khiển đã được cập nhật</p>
          <p className="mt-1 text-sm text-emerald-900">
            {highlightedLog.summary}. {highlightedLog.detail}.
          </p>
          {highlightedLog.email && (
            <p className="mt-1 text-sm text-emerald-900">
              Người dùng đã nhận email tại {highlightedLog.email.to}.
            </p>
          )}
        </div>
      )}

      {/* DANH MỤC QUẢN LÝ (3 CỘT NẰM NGANG CÂN ĐỐI) */}
      <section className="mt-6">
        <div className="mb-3">
          <h2 className="text-lg font-black">Chọn danh mục quản lý</h2>
          <DiagramCaption>Select Management Category</DiagramCaption>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {/* 1. QUẢN LÝ TÀI KHOẢN */}
          <Link
            to="/quan-ly/tai-khoan"
            className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#e31b23]/40 hover:shadow-md flex flex-col justify-between"
          >
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#e31b23]">
                User Accounts
              </p>
              <h3 className="mt-2 text-xl font-black text-slate-900">Quản lý tài khoản</h3>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                Đổi vai trò, phân quyền hoặc kích hoạt / vô hiệu hóa tài khoản người dùng.
              </p>
            </div>
            <p className="mt-4 text-sm font-bold text-[#e31b23]">
              Vào danh sách tài khoản
              <span className="ml-1 inline-block transition group-hover:translate-x-1">→</span>
            </p>
          </Link>

          {/* 2. GÓI HỘI VIÊN */}
          <Link
            to="/quan-ly/goi"
            className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#e31b23]/40 hover:shadow-md flex flex-col justify-between"
          >
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#e31b23]">
                Membership Packages
              </p>
              <h3 className="mt-2 text-xl font-black text-slate-900">Gói hội viên</h3>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                Tạo mới hoặc sửa phí, thời hạn sử dụng và đặc quyền của từng gói hội viên.
              </p>
            </div>
            <p className="mt-4 text-sm font-bold text-[#e31b23]">
              Vào danh sách gói
              <span className="ml-1 inline-block transition group-hover:translate-x-1">→</span>
            </p>
          </Link>

          <Link
            to="/quan-ly/han-muc-ai"
            className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#e31b23]/40 hover:shadow-md flex flex-col justify-between"
          >
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#e31b23]">
                AI quota
              </p>
              <h3 className="mt-2 text-xl font-black text-slate-900">Hạn mức AI</h3>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                Xem token đã dùng và sửa số lượt tạo lại, hạn mức token của từng gói hội viên.
              </p>
            </div>
            <p className="mt-4 text-sm font-bold text-[#e31b23]">
              Xem và chỉnh hạn mức
              <span className="ml-1 inline-block transition group-hover:translate-x-1">→</span>
            </p>
          </Link>

          {/* 3. LỚP HỌC THỂ THAO */}
          <Link
            to="/quan-ly/lop-hoc"
            className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#e31b23]/40 hover:shadow-md flex flex-col justify-between"
          >
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#e31b23]">
                Class & Schedules
              </p>
              <h3 className="mt-2 text-xl font-black text-slate-900">Lớp học thể thao</h3>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                Theo dõi các lớp học theo bộ môn, Huấn luyện viên, sĩ số và lịch học chi tiết.
              </p>
            </div>
            <p className="mt-4 text-sm font-bold text-[#e31b23]">
              Vào quản lý lớp học
              <span className="ml-1 inline-block transition group-hover:translate-x-1">→</span>
            </p>
          </Link>
        </div>
      </section>

      <MemberTokenUsageTable />

      {/* KHỐI: DANH SÁCH YÊU CẦU HỖ TRỢ DO LỄ TÂN CHUYỂN LÊN */}
      <section className="mt-8 rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <span className="inline-block bg-[#e31b23]/10 text-[#e31b23] text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full mb-1">
              Trung tâm phê duyệt
            </span>
            <h2 className="text-lg font-black text-slate-900">Yêu cầu hỗ trợ cần Quản trị quyết định</h2>
            <DiagramCaption>Escalated Support Requests</DiagramCaption>
          </div>
          <button
            onClick={fetchEscalatedRequests}
            className="text-xs font-bold bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl cursor-pointer"
          >
            🔄 Làm mới
          </button>
        </div>

        <div className="overflow-x-auto">
          {loadingRequests ? (
            <div className="py-8 text-center text-xs font-bold text-gray-400">Đang tải danh sách đơn...</div>
          ) : escalatedRequests.length > 0 ? (
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-gray-400 border-b border-gray-100">
                <tr>
                  <th className="px-5 py-3 font-bold">Học viên</th>
                  <th className="px-5 py-3 font-bold">Tiêu đề / Lý do chuyển</th>
                  <th className="px-5 py-3 font-bold">Trạng thái</th>
                  <th className="px-5 py-3 font-bold text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {escalatedRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3 align-top">
                      <p className="font-bold text-slate-900">{req.memberName || 'Học viên'}</p>
                      <p className="text-xs text-slate-400">{req.memberEmail || 'N/A'}</p>
                    </td>

                    <td className="px-5 py-3 align-top">
                      <p className="font-bold text-slate-800">{req.title || 'Yêu cầu hỗ trợ'}</p>
                      <p className="text-xs text-slate-600 italic mt-0.5">"{req.description || req.content}"</p>
                      {req.classificationReason && (
                        <p className="text-[11px] text-amber-700 font-semibold bg-amber-50 p-1 rounded mt-1">
                          Lý do Lễ tân chuyển: {req.classificationReason}
                        </p>
                      )}
                      {req.resolutionNote && (
                        <p className="mt-1 whitespace-pre-line text-[11px] font-semibold text-emerald-700 bg-emerald-50 p-1.5 rounded">
                          Kết quả xử lý: {req.resolutionNote}
                        </p>
                      )}
                    </td>

                    <td className="px-5 py-3 align-top">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${
                          req.status === 'APPROVED' || req.decision === 'approved'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : req.status === 'REJECTED' || req.decision === 'rejected'
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {req.status === 'APPROVED' || req.decision === 'approved'
                          ? '✓ Đã phê duyệt'
                          : req.status === 'REJECTED' || req.decision === 'rejected'
                          ? '✕ Đã từ chối'
                          : '⏳ Chờ QTTT quyết định'}
                      </span>
                    </td>

                    <td className="px-5 py-3 align-top text-right whitespace-nowrap">
                      {req.status === 'pending_manager' ? (
                        <button
                          onClick={() => {
                            setSelectedReq(req);
                            setDecisionNote('');
                          }}
                          className="bg-[#e31b23] hover:bg-[#c4131a] text-white text-xs font-bold px-3 py-1.5 rounded-xl cursor-pointer"
                        >
                          ⚖️ Ra quyết định
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Đã xử lý</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-8 text-center text-xs font-bold text-gray-400">
              Không có yêu cầu nào đang chờ phê duyệt.
            </div>
          )}
        </div>
      </section>

      <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Tổng tài khoản" value={users.length} />
        <Stat label="Đang hoạt động" value={activeCount} />
        <Stat label="Ngưng hoạt động" value={inactiveCount} />
        <Stat label="Gói hội viên" value={packages.length} />
      </section>

      {/* MODAL PHÊ DUYỆT / TỪ CHỐI CỦA ADMIN */}
      {selectedReq && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-900 uppercase">
                XỬ LÝ YÊU CẦU: #{selectedReq.id?.slice(0, 8)}
              </h3>
              <button
                onClick={() => setSelectedReq(null)}
                className="text-slate-400 hover:text-slate-700 font-bold text-base p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-2xl text-xs space-y-1">
              <p><strong>Học viên:</strong> {selectedReq.memberName} ({selectedReq.memberEmail})</p>
              <p><strong>Tiêu đề:</strong> {selectedReq.title}</p>
              <p className="italic text-slate-600">"{selectedReq.description || selectedReq.content}"</p>
            </div>

            <div className="space-y-2 text-xs">
              <label className="block font-bold text-slate-700">Ghi chú quyết định / Lý do *</label>
              <textarea
                rows={3}
                placeholder="Nhập ghi chú phản hồi cho học viên..."
                value={decisionNote}
                onChange={(e) => setDecisionNote(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 outline-none resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                disabled={submittingDecision || !decisionNote.trim()}
                onClick={() => handleDecision('approved')}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs py-3 rounded-xl uppercase tracking-wider cursor-pointer disabled:opacity-50"
              >
                ✓ Phê duyệt (Approve)
              </button>

              <button
                type="button"
                disabled={submittingDecision || !decisionNote.trim()}
                onClick={() => handleDecision('rejected')}
                className="bg-red-600 hover:bg-red-700 text-white font-black text-xs py-3 rounded-xl uppercase tracking-wider cursor-pointer disabled:opacity-50"
              >
                ✕ Từ chối (Reject)
              </button>
            </div>
          </div>
        </div>
      )}
    </ManagementShell>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4">
      <p className="text-3xl font-black tabular-nums">{value}</p>
      <p className="mt-1 text-sm font-semibold text-gray-500">{label}</p>
    </div>
  );
}