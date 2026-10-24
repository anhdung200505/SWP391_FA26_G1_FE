import { CLASS_STATUS, formatDate, shortName } from './classUtils';

// Bảng lớp dùng chung cho quản trị và lễ tân. renderAction(item) trả về nút ở cột cuối.
export default function ClassListTable({ classes, renderAction }) {
  const STATUS_STYLES = CLASS_STATUS;
  return (
  <div className="overflow-x-auto">
    <table className="w-full min-w-[960px] text-left text-xs border-collapse">
      <thead>
        <tr className="bg-slate-50 border-b border-gray-100 text-gray-400 font-extrabold uppercase text-[10px] tracking-wider">
          <th className="p-4">Lớp</th>
          <th className="p-4">Môn</th>
          <th className="p-4">Coach</th>
          <th className="p-4">Phòng</th>
          <th className="p-4">Khai giảng</th>
          <th className="p-4">Kết thúc</th>
          <th className="p-4 text-center">Học viên</th>
          <th className="p-4 text-center">Sĩ số</th>
          <th className="p-4">Trạng thái</th>
          <th className="p-4 text-right" />
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100 font-medium text-slate-700">
        {classes.map((item) => {
          const status = STATUS_STYLES[item.status] || STATUS_STYLES.open;
          return (
            <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
              <td className="p-4 min-w-[140px] font-bold text-slate-900 text-sm">{shortName(item.name)}</td>
              <td className="p-4 whitespace-nowrap">
                <span className="inline-block bg-red-50 text-[#e31b23] border border-red-100 font-bold text-[10px] px-2 py-0.5 rounded">
                  {item.sportName}
                </span>
              </td>
              <td className="p-4 whitespace-nowrap font-bold text-slate-800">{item.coachName}</td>
              <td className="p-4 whitespace-nowrap text-slate-600">{item.roomName || 'Chưa xếp phòng'}</td>
              <td className="p-4 whitespace-nowrap">{formatDate(item.startDate)}</td>
              <td className="p-4 whitespace-nowrap">{formatDate(item.endDate)}</td>
              <td className="p-4 text-center font-bold text-slate-900">{item.enrolledCount}</td>
              <td className="p-4 text-center font-bold text-slate-900">{item.capacity ?? '∞'}</td>
              <td className="p-4">
                <span className={`inline-block whitespace-nowrap border text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${status.className}`}>
                  {status.label}
                </span>
              </td>
              <td className="p-4 text-right whitespace-nowrap">
                {renderAction(item)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
  );
}
