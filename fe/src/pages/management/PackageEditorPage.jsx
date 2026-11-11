import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import ManagementShell from '../../components/management/ManagementShell';
import { DiagramCaption, FlowTrail } from '../../components/management/ManagementBits';
import { useAccountManagement } from '../../context/AccountManagementContext';
import { formatFee } from '../../data/accountManagement';

const PACKAGE_FLOW = [
  'Bảng điều khiển',
  'Danh sách gói',
  'Sửa gói hiện tại',
  'Hệ thống ghi nhận',
];

// Danh sách quyền lợi mẫu
const BENEFIT_PRESETS = [
  'Dùng phòng tập đa năng trong giờ mở cửa',
  'Dùng hồ bơi trong giờ thấp điểm',
  'Dùng hồ bơi cả giờ cao điểm',
  'Một buổi tập riêng với huấn luyện viên mỗi tháng',
  'Gồm mọi quyền lợi của Hạng Đồng',
];

// Hai dòng này do hệ thống tự sinh từ ô "Mức giảm" và "Hạn mức AI", không sửa tay để khỏi lệch với thực tế.
const isAutoBenefit = (text) => {
  const value = String(text || '').trim().toLowerCase();
  return (
    value.startsWith('gợi ý tập cá nhân bằng ai:') ||
    (value.startsWith('giảm') && value.includes('phí gói khi nâng hạng'))
  );
};

const AI_BENEFIT_PREFIX = 'Gợi ý tập cá nhân bằng AI:';

const formatVi = (value) => Number(value || 0).toLocaleString('vi-VN');

const buildAiLine = (regenerations, tokens) =>
  `${AI_BENEFIT_PREFIX} ${formatVi(regenerations)} lượt tạo lại và ${formatVi(tokens)} token mỗi kỳ hội viên`;

export default function PackageEditorPage({ mode }) {
  const { packageId } = useParams();
  const navigate = useNavigate();

  const {
    packages = [],
    loading,
    error,
    updatePackageSetting,
  } = useAccountManagement();

  const existing = packages.find(
    (item) => String(item.id) === String(packageId)
  );

  // Form state
  const [fee, setFee] = useState('');
  const [validityMonths, setValidityMonths] = useState('1');
  const [upgradeDiscountPercent, setUpgradeDiscountPercent] = useState('0');
  const [benefits, setBenefits] = useState(['']);
  const [aiRegeneration, setAiRegeneration] = useState('0');
  const [aiTokens, setAiTokens] = useState('0');

  // Thêm quyền lợi
  const [benefitChoice, setBenefitChoice] = useState('');
  const [customBenefit, setCustomBenefit] = useState('');
  const [showCustomBenefit, setShowCustomBenefit] = useState(false);

  // System state
  const [formPackageId, setFormPackageId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState('');
  const [phase, setPhase] = useState('form');
  const [steps, setSteps] = useState([]);
  const [shown, setShown] = useState(0);
  const [logId, setLogId] = useState(null);

  useEffect(() => {
    document.title = 'Sửa gói hội viên · AnhDuy Sport';
  }, []);

  // Đổ dữ liệu gói hiện tại vào form
  useEffect(() => {
    if (existing && formPackageId !== existing.id) {
      setFormPackageId(existing.id);

      setFee(String(existing.fee ?? ''));

      setValidityMonths(
        String(existing.validityMonths ?? '1')
      );

      setUpgradeDiscountPercent(
        String(existing.upgradeDiscountPercent ?? 0)
      );

      setAiRegeneration(String(existing.aiRegenerationLimit ?? 0));
      setAiTokens(String(existing.aiTokenLimit ?? 0));

      const manual = Array.isArray(existing.benefits)
        ? existing.benefits.filter((item) => !isAutoBenefit(item))
        : [];
      setBenefits(manual.length ? manual : ['']);
    }
  }, [existing, formPackageId]);

  // Hiệu ứng ghi nhận hệ thống
  useEffect(() => {
    if (phase !== 'system' || shown >= steps.length) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setShown((count) => count + 1);
    }, 700);

    return () => window.clearTimeout(timer);
  }, [phase, shown, steps.length]);

  const breadcrumb = [
    { label: 'Bảng điều khiển', to: '/quan-ly' },
    { label: 'Gói hội viên', to: '/quan-ly/goi' },
    { label: existing?.name || 'Sửa gói' },
  ];

  // Không cho phép tạo gói mới
  if (mode === 'create') {
    return (
      <ManagementShell breadcrumb={breadcrumb}>
        <h1 className="text-2xl font-black">
          Không hỗ trợ tạo gói mới
        </h1>

        <p className="mt-2 text-sm text-gray-600">
          Hệ thống chỉ cho phép chỉnh sửa 3 gói hội viên hiện tại.
        </p>

        <Link
          to="/quan-ly/goi"
          className="mt-4 inline-flex text-sm font-bold text-[#e31b23]"
        >
          Quay lại danh sách gói
        </Link>
      </ManagementShell>
    );
  }

  // Không tìm thấy gói
  if (!loading && !existing) {
    return (
      <ManagementShell breadcrumb={breadcrumb}>
        <h1 className="text-2xl font-black">
          Không tìm thấy gói
        </h1>

        <Link
          to="/quan-ly/goi"
          className="mt-3 inline-flex text-sm font-bold text-[#e31b23]"
        >
          Quay lại danh sách gói
        </Link>
      </ManagementShell>
    );
  }

  // Chuẩn hóa dữ liệu
  const cleanedBenefits = benefits
    .map((item) => item.trim())
    .filter(Boolean);

  const feeNumber = Number(fee);
  const monthsNumber = Number(validityMonths);
  const discountNumber = Number(upgradeDiscountPercent);

  const aiEligible = Boolean(existing?.aiEligible);
  const regenerationNumber = Number(aiRegeneration);
  const tokenNumber = Number(aiTokens);
  const aiLineInvalid =
    aiRegeneration === '' ||
    aiTokens === '' ||
    !Number.isInteger(regenerationNumber) ||
    !Number.isInteger(tokenNumber) ||
    regenerationNumber < 0 ||
    tokenNumber < 0;

  const formInvalid =
    (aiEligible && aiLineInvalid) ||
    !fee ||
    !Number.isFinite(feeNumber) ||
    feeNumber <= 0 ||
    !validityMonths ||
    !Number.isFinite(monthsNumber) ||
    monthsNumber < 1 ||
    !upgradeDiscountPercent ||
    !Number.isFinite(discountNumber) ||
    discountNumber < 0 ||
    discountNumber > 100 ||
    (cleanedBenefits.length === 0 && !aiEligible && !(discountNumber > 0));

  // Thêm quyền lợi mẫu
  const addPresetBenefit = (value) => {
    if (!value) return;

    setBenefits((current) => {
      const withoutEmpty = current.filter((item) => item.trim());

      // Không thêm trùng quyền lợi
      if (withoutEmpty.includes(value)) {
        return current;
      }

      return [...withoutEmpty, value];
    });

    setBenefitChoice('');
  };

  // Thêm quyền lợi tự nhập
  const addCustomBenefit = () => {
    const value = customBenefit.trim();

    if (!value) return;

    setBenefits((current) => {
      const withoutEmpty = current.filter((item) => item.trim());

      if (withoutEmpty.includes(value)) {
        return current;
      }

      return [...withoutEmpty, value];
    });

    setCustomBenefit('');
    setShowCustomBenefit(false);
    setBenefitChoice('');
  };

  // Hiển thị tiến trình hệ thống
  const startSystem = (nextSteps, id) => {
    setSteps(nextSteps);
    setShown(1);
    setLogId(id);
    setPhase('system');
  };

  // Lưu gói hội viên
  const submit = async () => {
    if (formInvalid || saving) return;

    setSaving(true);
    setActionError('');

    // Payload khớp với API PUT /api/packages/{packageId}
    const payload = {
      fee: feeNumber,
      validityMonths: monthsNumber,
      upgradeDiscountPercent: discountNumber,
      // Dòng AI luôn đứng đầu; hệ thống đồng bộ lại hạn mức theo dòng này.
      benefits: aiEligible
        ? [buildAiLine(regenerationNumber, tokenNumber), ...cleanedBenefits]
        : cleanedBenefits,
      ...(aiEligible
        ? { aiRegenerationLimit: regenerationNumber, aiTokenLimit: tokenNumber }
        : {}),
    };

    try {
      const log = await updatePackageSetting(
        existing.id,
        payload
      );

      startSystem(
        [
          {
            id: 'save',
            lane: 'Hệ thống',
            diagram: 'Save Membership Package Setting',
            title: 'Lưu thiết lập gói hội viên',
            detail:
              log?.detail ||
              'Hệ thống đã lưu thành công.',
          },
          {
            id: 'record-log',
            lane: 'Hệ thống',
            diagram: 'Record Log',
            title: 'Ghi nhật ký',
            detail: `${
              log?.actor || 'Quản trị'
            } đã cập nhật gói hội viên. ${
              log?.summary || ''
            }.`,
          },
        ],
        log?.id
      );
    } catch (requestError) {
      setActionError(
        requestError.message ||
        'Không thể lưu thay đổi. Vui lòng thử lại.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <ManagementShell breadcrumb={breadcrumb}>
      <FlowTrail
        step={phase === 'system' ? 3 : 2}
        steps={PACKAGE_FLOW}
      />

      {/* FORM CHỈNH SỬA */}
      {phase === 'form' && (
        <section className="mt-5 rounded-3xl border border-gray-200 bg-white p-5 sm:p-6">

          <h1 className="text-2xl font-black">
            Chỉnh sửa chi tiết gói hội viên
          </h1>

          <p className="mt-2 max-w-2xl text-sm text-gray-600">
            Cập nhật phí, thời hạn, ưu đãi khi mua kèm khóa học
            và từng quyền lợi của gói. Tên và mã gói được giữ nguyên.
          </p>

          <DiagramCaption>
            Edit Membership Package
          </DiagramCaption>

          {/* THÔNG TIN GÓI */}
          {existing && (
            <div className="mt-4 rounded-2xl bg-gray-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                Gói đang chỉnh sửa
              </p>

              <p className="mt-1 text-lg font-black">
                {existing.name}
              </p>

              <p className="mt-1 text-sm text-gray-600">
                {existing.code}
                {' · '}
                Phí hiện tại {formatFee(existing.fee)}
                {' · '}
                Thời hạn {existing.validityMonths} tháng
              </p>
            </div>
          )}

          {(loading || error) && !formPackageId && (
            <p className="mt-3 text-sm font-semibold text-gray-500">
              {error || 'Đang tải gói từ máy chủ...'}
            </p>
          )}

          {/* PHÍ VÀ THỜI HẠN */}
          <div className="mt-5 grid gap-4 sm:grid-cols-2">

            <label className="block text-sm font-bold text-gray-700">
              Phí hội viên (đồng)

              <input
                inputMode="numeric"
                value={fee}
                onChange={(event) =>
                  setFee(event.target.value.replace(/\D/g, ''))
                }
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 font-medium outline-none ring-[#e31b23] focus:ring-2"
                placeholder="500000"
              />

              <span className="mt-1 block text-xs font-normal text-gray-500">
                Ví dụ: 500000 tương ứng 500.000đ.
              </span>
            </label>

            <label className="block text-sm font-bold text-gray-700">
              Thời hạn gói (tháng)

              <input
                inputMode="numeric"
                value={validityMonths}
                onChange={(event) =>
                  setValidityMonths(
                    event.target.value.replace(/\D/g, '').slice(0, 2)
                  )
                }
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 font-medium outline-none ring-[#e31b23] focus:ring-2"
                placeholder="1"
              />
            </label>

          </div>

          {/* ƯU ĐÃI KHI MUA KÈM KHÓA HỌC */}
          <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/60 p-4">

            <h2 className="font-black text-gray-900">
              Ưu đãi khi mua kèm khóa học
            </h2>

            <p className="mt-1 text-sm text-gray-600">
              Thiết lập phần trăm giảm trên phí gói hội viên
              khi khách hàng đăng ký gói cùng khóa học.
            </p>

            <label className="mt-3 block max-w-xs text-sm font-bold text-gray-700">
              Mức giảm (%)

              <div className="relative mt-1">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={upgradeDiscountPercent}
                  onChange={(event) =>
                    setUpgradeDiscountPercent(event.target.value)
                  }
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 pr-10 font-semibold outline-none ring-[#e31b23] focus:ring-2"
                  placeholder="0"
                />

                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                  %
                </span>
              </div>

              <span className="mt-1 block text-xs font-normal text-gray-500">
                Nhập từ 0 đến 100. Nhập 0 nếu không có ưu đãi.
              </span>
            </label>

            {feeNumber > 0 &&
              Number.isFinite(discountNumber) &&
              discountNumber >= 0 &&
              discountNumber <= 100 && (
                <p className="mt-3 text-sm text-gray-700">
                  Phí sau giảm dự kiến:{' '}
                  <strong>
                    {formatFee(
                      Math.round(
                        feeNumber * (1 - discountNumber / 100)
                      )
                    )}
                  </strong>

                  <span className="text-gray-500">
                    {' '}khi mua kèm khóa học.
                  </span>
                </p>
              )}
          </section>

          {/* QUYỀN LỢI */}
          <fieldset className="mt-6">

            <legend className="text-base font-black text-gray-900">
              Quyền lợi của gói
            </legend>

            <p className="mt-1 text-sm text-gray-600">
              Chọn quyền lợi mẫu để thêm nhanh, hoặc chọn
              “Khác” để tự nhập nội dung. Dòng AI token luôn đứng đầu; dòng giảm giá khi nâng hạng
              được hệ thống tự sinh từ mức giảm ở trên.
            </p>

            {/* DANH SÁCH QUYỀN LỢI ĐANG CÓ */}
            <div className="mt-3 space-y-2">

              {/* QUYỀN LỢI ĐẦU TIÊN: AI TOKEN */}
              {aiEligible && (
                <div className="flex items-start gap-2">
                  <span className="mt-3 text-xs font-bold text-gray-400">1.</span>
                  <div className="w-full">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-2 rounded-xl border border-sky-200 bg-sky-50/60 px-3 py-2 text-sm font-medium text-gray-800">
                      <span>Gợi ý tập cá nhân bằng AI:</span>
                      <input
                        inputMode="numeric"
                        aria-label="Số lượt tạo lại"
                        value={aiRegeneration}
                        onChange={(event) =>
                          setAiRegeneration(event.target.value.replace(/\D/g, '').slice(0, 4))
                        }
                        className="w-20 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-center font-bold outline-none ring-[#e31b23] focus:ring-2"
                      />
                      <span>lượt tạo lại và</span>
                      <input
                        inputMode="numeric"
                        aria-label="Số token"
                        value={aiTokens}
                        onChange={(event) =>
                          setAiTokens(event.target.value.replace(/\D/g, '').slice(0, 9))
                        }
                        className="w-32 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-center font-bold outline-none ring-[#e31b23] focus:ring-2"
                      />
                      <span>token mỗi kỳ hội viên</span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      Chỉ sửa được hai con số: lượt tạo lại và token. Khi lưu,
                      hệ thống áp dụng đúng hạn mức này cho hội viên.
                    </p>
                    {aiLineInvalid && (
                      <p className="mt-1 text-xs font-semibold text-[#b1131a]">
                        Hãy nhập số nguyên không âm cho cả hai ô.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {benefits.map((benefit, index) => (
                <div
                  key={`${index}-${benefits.length}`}
                  className="flex items-start gap-2"
                >
                  <span className="mt-3 text-xs font-bold text-gray-400">
                    {index + 1 + (aiEligible ? 1 : 0)}.
                  </span>

                  <input
                    value={benefit}
                    onChange={(event) => {
                      setBenefits((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index
                            ? event.target.value
                            : item
                        )
                      );
                    }}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-medium outline-none ring-[#e31b23] focus:ring-2"
                    placeholder="Mô tả quyền lợi"
                  />

                  <button
                    type="button"
                    disabled={benefits.length === 1}
                    onClick={() =>
                      setBenefits((current) =>
                        current.filter(
                          (_, itemIndex) => itemIndex !== index
                        )
                      )
                    }
                    className="rounded-xl px-3 py-2.5 text-sm font-bold text-gray-500 hover:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-300"
                  >
                    Xóa
                  </button>
                </div>
              ))}

            </div>

            {/* CHỌN QUYỀN LỢI MẪU */}
            <div className="mt-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">

              <select
                value={benefitChoice}
                onChange={(event) => {
                  const value = event.target.value;

                  setBenefitChoice(value);

                  if (value === '__OTHER__') {
                    setShowCustomBenefit(true);
                  } else if (value) {
                    setShowCustomBenefit(false);
                    addPresetBenefit(value);
                  }
                }}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium outline-none ring-[#e31b23] focus:ring-2"
              >
                <option value="">
                  + Thêm quyền lợi từ danh sách mẫu
                </option>

                {BENEFIT_PRESETS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}

                <option value="__OTHER__">
                  Khác — tự nhập quyền lợi
                </option>
              </select>

              <button
                type="button"
                onClick={() => {
                  setShowCustomBenefit(true);
                  setBenefitChoice('__OTHER__');
                }}
                className="rounded-xl border border-[#e31b23] px-4 py-2.5 text-sm font-bold text-[#e31b23] hover:bg-red-50"
              >
                Nhập quyền lợi khác
              </button>

            </div>

            {/* NHẬP QUYỀN LỢI KHÁC */}
            {showCustomBenefit && (
              <div className="mt-3 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-3">

                <label className="block text-sm font-bold text-gray-700">
                  Nội dung quyền lợi tùy chỉnh

                  <textarea
                    rows={2}
                    value={customBenefit}
                    onChange={(event) =>
                      setCustomBenefit(event.target.value)
                    }
                    className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium outline-none ring-[#e31b23] focus:ring-2"
                    placeholder="Nhập quyền lợi mới của gói..."
                  />
                </label>

                <div className="mt-2 flex flex-wrap gap-2">

                  <button
                    type="button"
                    disabled={!customBenefit.trim()}
                    onClick={addCustomBenefit}
                    className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-gray-300"
                  >
                    Thêm quyền lợi
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowCustomBenefit(false);
                      setCustomBenefit('');
                      setBenefitChoice('');
                    }}
                    className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-bold text-gray-600"
                  >
                    Hủy
                  </button>

                </div>
              </div>
            )}

          </fieldset>

          {/* LỖI */}
          {actionError && (
            <p className="mt-4 text-sm font-semibold text-[#b1131a]">
              {actionError}
            </p>
          )}

          {discountNumber > 100 && (
            <p className="mt-2 text-sm text-[#b1131a]">
              Mức giảm không được vượt quá 100%.
            </p>
          )}

          {discountNumber < 0 && (
            <p className="mt-2 text-sm text-[#b1131a]">
              Mức giảm không được nhỏ hơn 0%.
            </p>
          )}

          {/* NÚT LƯU */}
          <div className="mt-6 flex flex-wrap gap-3">

            <button
              type="button"
              disabled={formInvalid || saving}
              onClick={submit}
              className="rounded-xl bg-[#e31b23] px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {saving ? 'Đang lưu...' : 'Lưu thiết lập gói'}
            </button>

            <Link
              to="/quan-ly/goi"
              className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-bold"
            >
              Quay lại
            </Link>

          </div>

        </section>
      )}

      {/* TIẾN TRÌNH HỆ THỐNG */}
      {phase === 'system' && (
        <section
          className="mt-5 rounded-3xl border border-gray-200 bg-white p-5 sm:p-6"
          aria-live="polite"
        >
          <h2 className="text-lg font-black">
            Hệ thống đang ghi nhận
          </h2>

          <DiagramCaption>
            System lane
          </DiagramCaption>

          <ol className="mt-5 space-y-4 border-l-2 border-gray-200 pl-5">

            {steps.slice(0, shown).map((step) => (
              <li key={step.id} className="animate-step-in">

                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#e31b23]">
                  {step.lane} · {step.diagram}
                </p>

                <p className="mt-1 font-black">
                  {step.title}
                </p>

                <p className="mt-1 text-sm leading-6 text-gray-600">
                  {step.detail}
                </p>

              </li>
            ))}

          </ol>

          {shown < steps.length ? (
            <p className="mt-4 text-sm font-semibold text-gray-500">
              Đang xử lý bước tiếp theo...
            </p>
          ) : (
            <button
              type="button"
              onClick={() =>
                navigate('/quan-ly', { state: { logId } })
              }
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