// Dòng HLV của một buổi học. Buổi do HLV khác dạy thay (isSubstituteCoach) thì ghi rõ là HLV thay thế.
export default function SessionCoachLine({ session, className = 'text-xs text-gray-500' }) {
  if (!session.isSubstituteCoach) {
    return <p className={className}>{session.coachName}</p>;
  }

  return (
    <p className={className}>
      <span className="mr-1 inline-block rounded border border-amber-300 bg-amber-50 px-1.5 py-px align-middle text-[10px] font-bold uppercase text-amber-800">
        HLV thay thế
      </span>
      {session.coachName}
      {session.classCoachName && (
        <span className="block text-[11px] text-gray-400">Thay HLV {session.classCoachName}</span>
      )}
    </p>
  );
}
