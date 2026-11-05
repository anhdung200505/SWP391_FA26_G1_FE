// Dòng phòng của một buổi học. Phòng khác phòng mặc định của lớp (roomChanged) thì có nhãn Đổi phòng.
export default function SessionRoomLine({ session, fallback = '', className = 'text-xs text-slate-500' }) {
  return (
    <p className={className}>
      {session.roomChanged && (
        <span
          title={session.note || undefined}
          className="mr-1 inline-block rounded border border-sky-300 bg-sky-50 px-1.5 py-px align-middle text-[10px] font-bold uppercase text-sky-800"
        >
          Đổi phòng
        </span>
      )}
      {session.roomName || fallback}
    </p>
  );
}
