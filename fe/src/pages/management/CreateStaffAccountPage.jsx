import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ManagementShell from '../../components/management/ManagementShell';
import { DiagramCaption } from '../../components/management/ManagementBits';
import { useAccountManagement } from '../../context/AccountManagementContext';
import { getSports } from '../../api/managementApi';

export default function CreateStaffAccountPage() {
  const navigate = useNavigate();
  const { createStaffAccount } = useAccountManagement();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    roleId: 'RECEPTIONIST', // Mặc định Lễ tân
    sportIds: [],
  });
  const [sports, setSports] = useState([]);

  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState({ type: '', msg: '' });
  const [createdUser, setCreatedUser] = useState(null);

  useEffect(() => {
    document.title = 'Tạo tài khoản Nhân viên / HLV · AnhDuy Sport';
    getSports('1').then((data) => setSports(Array.isArray(data) ? data : [])).catch(() => setSports([]));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      sportIds: name === 'roleId' && value !== 'COACH' ? [] : prev.sportIds,
    }));
  };

  const toggleSport = (sportId) => {
    setFormData((prev) => ({
      ...prev,
      sportIds: prev.sportIds.includes(sportId)
        ? prev.sportIds.filter((id) => id !== sportId)
        : [...prev.sportIds, sportId],
    }));
  };

  // Validation mật khẩu: Tối thiểu 6 ký tự và phải chứa @, # hoặc !
  const validatePassword = (pass) => {
    if (pass.length < 6) {
      return 'Mật khẩu phải chứa ít nhất 6 ký tự.';
    }
    if (!/[@#!]/.test(pass)) {
      return 'Mật khẩu phải chứa ít nhất một trong các ký tự đặc biệt: @, # hoặc !';
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setNotice({ type: '', msg: '' });
    setCreatedUser(null);

    // Kiểm tra mật khẩu
    const passwordError = validatePassword(formData.password);
    if (passwordError) {
      setNotice({ type: 'error', msg: passwordError });
      return;
    }

    if (formData.roleId === 'COACH' && formData.sportIds.length === 0) {
      setNotice({ type: 'error', msg: 'Chọn ít nhất một môn cho huấn luyện viên. Một HLV có thể dạy nhiều môn.' });
      return;
    }

    setLoading(true);
    try {
      const created = await createStaffAccount({
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        password: formData.password,
        roleId: formData.roleId,
        sportIds: formData.roleId === 'COACH' ? formData.sportIds : [],
      });

      setNotice({
        type: 'success',
        msg: `Tạo tài khoản ${formData.roleId === 'RECEPTIONIST' ? 'Lễ tân' : 'Huấn luyện viên'} thành công!`,
      });

      if (created) {
        setCreatedUser(created);
      }

      // Reset form
      setFormData({
        fullName: '',
        email: '',
        phone: '',
        password: '',
        roleId: 'RECEPTIONIST',
        sportIds: [],
      });
    } catch (err) {
      setNotice({
        type: 'error',
        msg: err.message || 'Không thể tạo tài khoản. Vui lòng thử lại.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ManagementShell
      breadcrumb={[
        { label: 'Bảng điều khiển', to: '/quan-ly' },
        { label: 'Quản lý tài khoản', to: '/quan-ly/tai-khoan' },
        { label: 'Tạo nhân viên / HLV' },
      ]}
    >
      <div className="space-y-6">
        
        {/* HEADER */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="inline-block bg-[#e31b23]/10 text-[#e31b23] text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full mb-1">
              Trung tâm quản trị
            </span>
            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
              TẠO TÀI KHOẢN MỚI
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Khởi tạo tài khoản truy cập cho Lễ tân cơ sở hoặc Huấn luyện viên bộ môn.
            </p>
            <DiagramCaption>Create Staff or Coach Account</DiagramCaption>
          </div>

          <button
            onClick={() => navigate('/quan-ly/tai-khoan')}
            className="self-start sm:self-auto text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-xl transition-all cursor-pointer"
          >
            ← Danh sách tài khoản
          </button>
        </div>

        {/* THÔNG BÁO ALERTS */}
        {notice.msg && (
          <div
            className={`p-4 rounded-2xl text-xs font-bold border flex items-center justify-between animate-fadeIn ${
              notice.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-red-50 text-red-800 border-red-200'
            }`}
          >
            <span>{notice.msg}</span>
            <button
              onClick={() => setNotice({ type: '', msg: '' })}
              className="font-bold text-sm cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* THÔNG TIN TÀI KHOẢN VỪA TẠO */}
        {createdUser && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-6 text-xs space-y-2 animate-fadeIn">
            <h3 className="text-sm font-black text-emerald-950 uppercase">
              🎉 THÔNG TIN TÀI KHOẢN VỪA TẠO:
            </h3>
            <div className="grid grid-cols-2 gap-2 text-emerald-900 font-medium">
              <p>Mã tài khoản: <strong className="font-mono text-emerald-950">{createdUser.code || createdUser.id}</strong></p>
              <p>Họ và tên: <strong>{createdUser.fullName}</strong></p>
              <p>Email: <strong>{createdUser.email}</strong></p>
              <p>Số điện thoại: <strong>{createdUser.phone}</strong></p>
              <p>Vai trò: <strong>{createdUser.roleId === 'RECEPTIONIST' ? 'Lễ tân' : 'Huấn luyện viên'}</strong></p>
              {createdUser.roleId === 'COACH' && (
                <p className="col-span-2">Môn dạy: <strong>{(createdUser.sports || []).map((sport) => sport.name).join(', ') || 'Chưa gán'}</strong></p>
              )}
              <p>Trạng thái: <span className="bg-emerald-200 text-emerald-900 font-bold px-2 py-0.5 rounded text-[10px] uppercase">{createdUser.status || 'Active'}</span></p>
            </div>
          </div>
        )}

        {/* FORM TẠO TÀI KHOẢN */}
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-xs space-y-6">
          
          {/* CHỌN VAI TRÒ */}
          <div>
            <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-2">
              Vai trò tài khoản (Role) *
            </label>
            <div className="grid grid-cols-2 gap-4">
              <label
                className={`flex items-center justify-center gap-2 p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                  formData.roleId === 'RECEPTIONIST'
                    ? 'border-[#e31b23] bg-red-50/50 text-[#e31b23]'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <input
                  type="radio"
                  name="roleId"
                  value="RECEPTIONIST"
                  checked={formData.roleId === 'RECEPTIONIST'}
                  onChange={handleChange}
                  className="hidden"
                />
                <span className="text-lg">🎧</span>
                <div className="text-left">
                  <strong className="block text-xs uppercase font-black">Lễ tân (RECEPTIONIST)</strong>
                  <span className="text-[10px] text-slate-500 font-normal">Quản lý hỗ trợ & check-in</span>
                </div>
              </label>

              <label
                className={`flex items-center justify-center gap-2 p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                  formData.roleId === 'COACH'
                    ? 'border-[#e31b23] bg-red-50/50 text-[#e31b23]'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <input
                  type="radio"
                  name="roleId"
                  value="COACH"
                  checked={formData.roleId === 'COACH'}
                  onChange={handleChange}
                  className="hidden"
                />
                <span className="text-lg">🏋️</span>
                <div className="text-left">
                  <strong className="block text-xs uppercase font-black">Huấn luyện viên (COACH)</strong>
                  <span className="text-[10px] text-slate-500 font-normal">Phụ trách lớp học thể thao</span>
                </div>
              </label>
            </div>
          </div>

          {formData.roleId === 'COACH' && (
            <div>
              <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-2">
                Môn huấn luyện *
              </label>
              <p className="text-[11px] text-slate-500 font-medium mb-3">
                Một huấn luyện viên có thể dạy nhiều môn. Chỉ những môn được chọn mới hiện khi đổi HLV của lớp.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {sports.map((sport) => {
                  const sportId = String(sport.id);
                  const selected = formData.sportIds.includes(sportId);
                  return (
                    <label
                      key={sportId}
                      className={`flex items-center justify-between gap-3 rounded-2xl border-2 px-4 py-3 cursor-pointer ${
                        selected ? 'border-[#e31b23] bg-red-50/50 text-[#e31b23]' : 'border-slate-200 bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span className="text-xs font-black uppercase">{sport.name}</span>
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleSport(sportId)}
                        className="h-4 w-4 accent-[#e31b23]"
                      />
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* HỌ VÀ TÊN */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Họ và tên *
            </label>
            <input
              type="text"
              name="fullName"
              required
              placeholder="Ví dụ: Nguyễn Văn A"
              value={formData.fullName}
              onChange={handleChange}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-xs text-slate-800 font-medium outline-none focus:border-[#e31b23]"
            />
          </div>

          {/* EMAIL & SỐ ĐIỆN THOẠI */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Địa chỉ Email *
              </label>
              <input
                type="email"
                name="email"
                required
                placeholder="letan@anhduysport.vn"
                value={formData.email}
                onChange={handleChange}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-xs text-slate-800 font-medium outline-none focus:border-[#e31b23]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Số điện thoại *
              </label>
              <input
                type="tel"
                name="phone"
                required
                placeholder="0912345678"
                value={formData.phone}
                onChange={handleChange}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-xs text-slate-800 font-medium outline-none focus:border-[#e31b23]"
              />
            </div>
          </div>

          {/* MẬT KHẨU */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Mật khẩu truy cập *
            </label>
            <input
              type="password"
              name="password"
              required
              placeholder="Nhập mật khẩu (Tối thiểu 6 ký tự, gồm @, # hoặc !)"
              value={formData.password}
              onChange={handleChange}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-xs text-slate-800 font-medium outline-none focus:border-[#e31b23]"
            />
            <p className="text-[11px] text-slate-400 font-medium mt-1">
              ⚠️ Yêu cầu mật khẩu: Từ 6 ký tự trở lên và bắt buộc chứa ít nhất 1 ký tự đặc biệt (<code className="text-[#e31b23] font-bold">@</code>, <code className="text-[#e31b23] font-bold">#</code> hoặc <code className="text-[#e31b23] font-bold">!</code>).
            </p>
          </div>

          {/* NÚT TẠO TÀI KHOẢN */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#e31b23] hover:bg-[#c4131a] text-white font-black uppercase text-xs tracking-wider py-4 rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? 'ĐANG TẠO TÀI KHOẢN...' : '➕ TẠO TÀI KHOẢN NGAY'}
            </button>
          </div>

        </form>
      </div>
    </ManagementShell>
  );
}