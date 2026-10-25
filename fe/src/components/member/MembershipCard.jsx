import React from 'react';
import { Link } from 'react-router-dom';
import goldDragonImg from '../../assets/membership/gold-dragon.jpg';

const TIER_THEMES = {
  bronze: {
    label: 'Bronze Member',
    medal: '🥉',
    cardStyle: {
      background:
        'radial-gradient(120% 140% at 85% 0%, rgba(255,196,150,0.35) 0%, rgba(255,196,150,0) 45%), linear-gradient(135deg, #1a0d05 0%, #4e2810 35%, #8c4f26 55%, #3b1d0b 78%, #120803 100%)',
    },
    border: 'rgba(205,127,50,0.55)',
    titleGradient: 'linear-gradient(90deg, #ffe0c2 0%, #e39a5c 45%, #b8692f 100%)',
    accent: '#f3b07a',
    subText: 'rgba(255,226,200,0.75)',
    buttonStyle: { background: 'linear-gradient(135deg, #f3b07a, #b8692f)', color: '#2a1206' },
  },
  silver: {
    label: 'Silver Member',
    medal: '🥈',
    cardStyle: {
      background:
        'repeating-linear-gradient(100deg, rgba(255,255,255,0.035) 0px, rgba(255,255,255,0.035) 2px, transparent 2px, transparent 6px), radial-gradient(120% 140% at 85% 0%, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0) 45%), linear-gradient(135deg, #111418 0%, #3a4048 38%, #7d8590 56%, #2b3036 80%, #0c0e11 100%)',
    },
    border: 'rgba(209,213,219,0.55)',
    titleGradient: 'linear-gradient(90deg, #ffffff 0%, #d1d5db 45%, #8e959e 100%)',
    accent: '#e5e7eb',
    subText: 'rgba(229,231,235,0.75)',
    buttonStyle: { background: 'linear-gradient(135deg, #f9fafb, #9ca3af)', color: '#111827' },
  },
  gold: {
    label: 'Gold · Black Card',
    medal: '🥇',
    dragon: true,
    cardStyle: {
      background:
        'radial-gradient(90% 120% at 0% 0%, rgba(212,175,55,0.14) 0%, rgba(212,175,55,0) 50%), linear-gradient(135deg, #050505 0%, #111111 55%, #050505 100%)',
    },
    border: 'rgba(212,175,55,0.65)',
    titleGradient: 'linear-gradient(90deg, #fff4c2 0%, #e8c766 40%, #b8892a 100%)',
    accent: '#e8c766',
    subText: 'rgba(240,222,160,0.75)',
    buttonStyle: { background: 'linear-gradient(135deg, #fbe7a1, #c9971f)', color: '#1a1200' },
  },
};

const packageTier = (pkg, fallbackName = '') => {
  const name = (pkg?.name || fallbackName || '').toLowerCase();
  if (pkg?.code === 'PKG-003' || name.includes('vàng')) return 'gold';
  if (pkg?.code === 'PKG-002' || name.includes('bạc')) return 'silver';
  return 'bronze';
};

const packageMedal = (pkg) => TIER_THEMES[packageTier(pkg)].medal;
const planTitle = (name) => String(name || 'Gói Hội Viên').replace(/\s*\(tặng kèm lớp\)\s*$/i, '');
const formatDay = (iso) => (iso ? String(iso).split('-').reverse().join('/') : '—');

export default function MembershipCard({ currentMembership, membershipData, displayName }) {
  if (!currentMembership) return null;

  const packageList = membershipData?.packages || [];
  const highestPackage =
    packageList.find((pkg) => String(pkg.id) === String(membershipData?.highestPackageId)) ||
    packageList.find((pkg) => String(pkg.id) === String(currentMembership?.packageId)) ||
    null;
  const upgradePackages = highestPackage
    ? packageList.filter((pkg) => (pkg.fee || 0) > (highestPackage.fee || 0))
    : [];

  const currentPackage = packageList.find((pkg) => String(pkg.id) === String(currentMembership?.packageId)) || null;
  const cardTheme = TIER_THEMES[packageTier(currentPackage, currentMembership?.planName)];

  const membershipDates = (
    <div
      className={`self-start ${cardTheme.dragon ? '' : 'md:self-center'} rounded-2xl p-4 border backdrop-blur-md flex items-center gap-6`}
      style={{ borderColor: cardTheme.border, background: 'rgba(0,0,0,0.3)' }}
    >
      <div>
        <span className="text-[10px] font-bold uppercase block" style={{ color: cardTheme.subText }}>Ngày bắt đầu</span>
        <span className="text-xs font-bold text-white whitespace-nowrap">{formatDay(currentMembership.startDate)}</span>
      </div>
      <div className="h-8 w-px" style={{ background: cardTheme.border }}></div>
      <div>
        <span className="text-[10px] font-bold uppercase block" style={{ color: cardTheme.subText }}>Hạn sử dụng đến</span>
        <span className="text-xs font-black whitespace-nowrap" style={{ color: cardTheme.accent }}>{formatDay(currentMembership.endDate)}</span>
      </div>
    </div>
  );

  return (
    <section
      className="relative overflow-hidden rounded-3xl p-6 sm:p-8 shadow-2xl border text-white"
      style={{ ...cardTheme.cardStyle, borderColor: cardTheme.border }}
    >
      {cardTheme.dragon && (
        <>
          <img
            src={goldDragonImg}
            alt=""
            className="pointer-events-none select-none absolute inset-y-0 right-0 h-full w-auto max-w-none opacity-90 mix-blend-screen"
          />
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: 'linear-gradient(90deg, #050505 0%, rgba(5,5,5,0.85) 30%, rgba(5,5,5,0) 55%)' }}
          ></div>
        </>
      )}

      <div
        className="pointer-events-none absolute -top-1/2 left-1/4 w-1/3 h-[200%] rotate-[20deg]"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.09), transparent)' }}
      ></div>

      <div className="relative z-10 flex flex-col md:flex-row md:items-stretch justify-between gap-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span
              className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.25em] px-3 py-1 rounded-full border"
              style={{ color: cardTheme.accent, borderColor: cardTheme.border, background: 'rgba(0,0,0,0.25)' }}
            >
              {cardTheme.medal} {cardTheme.label}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color: cardTheme.subText }}>
              AnhDuy Sport
            </span>
          </div>

          <div>
            <h2
              className="text-3xl sm:text-4xl font-black uppercase tracking-wide"
              style={{ backgroundImage: cardTheme.titleGradient, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}
            >
              {planTitle(currentMembership.planName)}
            </h2>
            <p className="mt-2 font-mono text-sm tracking-[0.2em] uppercase" style={{ color: cardTheme.subText }}>
              {displayName}
            </p>
          </div>

          {cardTheme.dragon && membershipDates}
        </div>

        {!cardTheme.dragon && membershipDates}
      </div>

      {highestPackage && (
        <div className="relative z-10 mt-6 flex flex-wrap gap-3">
          <Link
            to={`/dang-ky-khoa-hoc?packageId=${highestPackage.id}&mode=renew`}
            className="font-black text-xs uppercase px-5 py-2.5 rounded-xl shadow-lg transition-transform hover:-translate-y-0.5"
            style={TIER_THEMES[packageTier(highestPackage)].buttonStyle}
          >
            {packageMedal(highestPackage)} Gia hạn {highestPackage.name}
          </Link>
          {upgradePackages.map((pkg) => (
            <Link
              key={pkg.id}
              to={`/dang-ky-khoa-hoc?packageId=${pkg.id}&mode=renew`}
              className="font-black text-xs uppercase px-5 py-2.5 rounded-xl shadow-lg transition-transform hover:-translate-y-0.5"
              style={TIER_THEMES[packageTier(pkg)].buttonStyle}
            >
              {packageMedal(pkg)} Nâng cấp lên {pkg.name}
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}