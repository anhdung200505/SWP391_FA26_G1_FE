import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import ManagementShell from '../../components/management/ManagementShell';
import { DiagramCaption, FlowTrail } from '../../components/management/ManagementBits';
import { useAccountManagement } from '../../context/AccountManagementContext';
import { formatFee } from '../../data/accountManagement';

const PACKAGE_FLOW = ['Bảng điều khiển', 'Danh sách gói', 'Tạo hoặc sửa gói', 'Hệ thống ghi nhận'];

export default function PackageEditorPage({ mode }) {
  const isCreate = mode === 'create';
  const { packageId } = useParams();
  const navigate = useNavigate();
  const { packages, loading, error, createPackage, updatePackageSetting } = useAccountManagement();
  const existing = packages.find((item) => item.id === packageId);

  const [name, setName] = useState('');
  const [fee, setFee] = useState('');
  const [validityMonths, setValidityMonths] = useState('1');
  const [benefits, setBenefits] = useState(['']);
  const [formPackageId, setFormPackageId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState('');
  const [phase, setPhase] = useState('form');
  const [steps, setSteps] = useState([]);
  const [shown, setShown] = useState(0);
  const [logId, setLogId] = useState(null);

  useEffect(() => {
    document.title = isCreate ? 'Tạo gói hội viên · AnhDuy Sport' : 'Sửa gói hội viên · AnhDuy Sport';
  }, [isCreate]);

  if (!isCreate && existing && formPackageId !== existing.id) {
    setFormPackageId(existing.id);
    setName(existing.name);
    setFee(String(existing.fee));
    setValidityMonths(String(existing.validityMonths));
    setBenefits(existing.benefits.length ? existing.benefits : ['']);
  }

  useEffect(() => {
    if (phase !== 'system' || shown >= steps.length) return undefined;
    const timer = window.setTimeout(() => setShown((count) => count + 1), 700);
    return () => window.clearTimeout(timer);
  }, [phase, shown, steps.length]);

  const breadcrumb = [
    { label: 'Bảng điều khiển', to: '/quan-ly' },
    { label: 'Gói hội viên', to: '/quan-ly/goi' },
    { label: isCreate ? 'Tạo gói mới' : existing?.name || 'Sửa gói' },
  ];

  if (!isCreate && !loading && !existing) {
    return (
      <ManagementShell breadcrumb={breadcrumb}>
        <h1 className="text-2xl font-black">Không tìm thấy gói</h1>
        <Link to="/quan-ly/goi" className="mt-3 inline-flex text-sm font-bold text-[#e31b23]">
          Quay lại danh sách gói
        </Link>
      </ManagementShell>
    );
  }

  const cleanedBenefits = benefits.map((item) => item.trim()).filter(Boolean);
  const feeNumber = Number(fee);
  const monthsNumber = Number(validityMonths);
  const formInvalid = !fee || !Number.isFinite(feeNumber) || feeNumber <= 0 || monthsNumber < 1 || cleanedBenefits.length === 0 || (isCreate && !name.trim());

  const startSystem = (nextSteps, id) => {
    setSteps(nextSteps);
    setShown(1);
    setLogId(id);
    setPhase('system');
  };

  const submit = async () => {
    if (formInvalid || saving) return;
    setSaving(true);
    setActionError('');
    const payload = {
      fee: feeNumber,
      validityMonths: monthsNumber,
      benefits: cleanedBenefits,
    };
    try {
      const log = isCreate
        ? await createPackage({ ...payload, name: name.trim() })
        : await updatePackageSetting(existing.id, payload);
      const title = isCreate ? 'Lưu gói mới' : 'Lưu thiết lập gói hội viên';
      const diagram = isCreate ? 'Save New Package' : 'Save Membership Package Setting';
      startSystem(
        [
          {
            id: 'save',
            lane: 'Hệ thống',
            diagram,
            title,
            detail: log.detail,
          },
          {
            id: 'record-log',
            lane: 'Hệ thống',
            diagram: 'Record Log',
            title: 'Ghi nhật ký',
            detail: `${log.actor} đã ${isCreate ? 'tạo' : 'cập nhật'} gói. ${log.summary}.`,
          },
        ],
        log.id,
      );
    } catch (requestError) {
      setActionError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ManagementShell breadcrumb={breadcrumb}>
      <FlowTrail step={phase === 'system' ? 3 : 2} steps={PACKAGE_FLOW} />

      {phase === 'form' && (
        <section className="mt-5 rounded-3xl border border-gray-200 bg-white p-5 sm:p-6">
          <h1 className="text-2xl font-black">{isCreate ? 'Nhập thông tin gói' : 'Sửa phí, thời hạn và quyền lợi'}</h1>
          <DiagramCaption>{isCreate ? 'Enter Package Information' : 'Edit Fees, Validity & Benefits'}</DiagramCaption>
          {!isCreate && existing && (
            <p className="mt-3 text-sm text-gray-600">
              Đã chọn {existing.code} · {existing.name}. Phí hiện tại {formatFee(existing.fee)}, thời hạn {existing.validityMonths} tháng.
            </p>
          )}
          {(loading || error) && !formPackageId && !isCreate && (
            <p className="mt-3 text-sm font-semibold text-gray-500">{error || 'Đang tải gói từ máy chủ...'}</p>
          )}

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {isCreate && (
              <label className="block text-sm font-bold text-gray-700 sm:col-span-2">
                Tên gói
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 font-medium outline-none ring-[#e31b23] focus:ring-2"
                  placeholder="Ví dụ: Gói Học viên"
                />
              </label>
            )}
            <label className="block text-sm font-bold text-gray-700">
              Phí (đồng)
              <input
                inputMode="numeric"
                value={fee}
                onChange={(event) => setFee(event.target.value.replace(/\D/g, ''))}
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 font-medium outline-none ring-[#e31b23] focus:ring-2"
                placeholder="500000"
              />
            </label>
            <label className="block text-sm font-bold text-gray-700">
              Thời hạn (tháng)
              <input
                inputMode="numeric"
                value={validityMonths}
                onChange={(event) => setValidityMonths(event.target.value.replace(/\D/g, '').slice(0, 2))}
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 font-medium outline-none ring-[#e31b23] focus:ring-2"
              />
            </label>
          </div>

          <fieldset className="mt-5">
            <legend className="text-sm font-bold text-gray-700">Quyền lợi</legend>
            <div className="mt-2 space-y-2">
              {benefits.map((benefit, index) => (
                <div key={`${index}-${benefits.length}`} className="flex gap-2">
                  <input
                    value={benefit}
                    onChange={(event) => {
                      const next = benefits.map((item, itemIndex) => (itemIndex === index ? event.target.value : item));
                      setBenefits(next);
                    }}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-medium outline-none ring-[#e31b23] focus:ring-2"
                    placeholder="Mô tả quyền lợi"
                  />
                  <button
                    type="button"
                    disabled={benefits.length === 1}
                    onClick={() => setBenefits(benefits.filter((_, itemIndex) => itemIndex !== index))}
                    className="rounded-xl px-3 text-sm font-bold text-gray-500 disabled:text-gray-300"
                  >
                    Xóa
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setBenefits([...benefits, ''])}
              className="mt-3 text-sm font-bold text-[#e31b23]"
            >
              Thêm quyền lợi
            </button>
          </fieldset>

          {actionError && <p className="mt-4 text-sm font-semibold text-[#b1131a]">{actionError}</p>}

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={formInvalid || saving}
              onClick={submit}
              className="rounded-xl bg-[#e31b23] px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {saving ? 'Đang lưu...' : isCreate ? 'Lưu gói mới' : 'Lưu thiết lập gói'}
            </button>
            <Link to="/quan-ly/goi" className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-bold">
              Quay lại
            </Link>
          </div>
        </section>
      )}

      {phase === 'system' && (
        <section className="mt-5 rounded-3xl border border-gray-200 bg-white p-5 sm:p-6" aria-live="polite">
          <h2 className="text-lg font-black">Hệ thống đang ghi nhận</h2>
          <DiagramCaption>System lane</DiagramCaption>
          <ol className="mt-5 space-y-4 border-l-2 border-gray-200 pl-5">
            {steps.slice(0, shown).map((step) => (
              <li key={step.id} className="animate-step-in">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#e31b23]">
                  {step.lane} · {step.diagram}
                </p>
                <p className="mt-1 font-black">{step.title}</p>
                <p className="mt-1 text-sm leading-6 text-gray-600">{step.detail}</p>
              </li>
            ))}
          </ol>
          {shown < steps.length ? (
            <p className="mt-4 text-sm font-semibold text-gray-500">Đang xử lý bước tiếp theo...</p>
          ) : (
            <button
              type="button"
              onClick={() => navigate('/quan-ly', { state: { logId } })}
              className="mt-6 rounded-xl bg-[#e31b23] px-4 py-2.5 text-sm font-bold text-white"
            >
              Xem bảng điều khiển đã cập nhật
            </button>
          )}
        </section>
      )}
    </ManagementShell>
  );
}
