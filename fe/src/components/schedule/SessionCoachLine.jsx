// Dòng HLV của một buổi học. coachChange: substitute = HLV dạy thay riêng buổi này, permanent = đổi HLV vĩnh viễn cho lớp.
// Chi tiết (lý do, HLV cũ) nằm trong ghi chú của buổi, hiện khi rê chuột vào nhãn.
const LABELS = {
  substitute: 'Dạy thay',
  permanent: 'Đổi HLV',
};

export default function SessionCoachLine({ session, className = 'text-xs text-gray-500' }) {
  const label = LABELS[session.coachChange];
  // classCoachName là HLV phụ trách hiện tại của lớp, chỉ đúng là "HLV được thay" với buổi chưa diễn ra.
  const upcoming = String(session.date || session.sessionDate || '').slice(0, 10) >= new Date().toLocaleDateString('sv-SE');
  if (!label) {
    return <p className={className}>{session.coachName}</p>;
  }

  return (
    <p className={className}>
      <span
        title={session.note || undefined}
        className="mr-1 inline-block rounded border border-amber-300 bg-amber-50 px-1.5 py-px align-middle text-[10px] font-bold uppercase text-amber-800"
      >
        {label}
      </span>
      {session.coachName}
      {session.coachChange === 'substitute' && upcoming && session.classCoachName && (
        <span className="block text-[11px] text-gray-400">Thay HLV {session.classCoachName}</span>
      )}
    </p>
  );
}
