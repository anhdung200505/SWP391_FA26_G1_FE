export function readSupportRequestType(reason) {
  const text = String(reason || '').replace(/\r/g, '');
  const line = text.split('\n').find((row) => row.startsWith('Loại:'));
  if (!line) {
    const older = text.match(/Học viên chọn loại\s+(.+?)\./);
    return older ? older[1].trim() : '';
  }
  return line.slice('Loại:'.length).trim();
}

export function readEscalationReason(reason) {
  const text = String(reason || '');
  const marker = 'Lễ tân chuyển lên vì ngoài phạm vi:';
  const index = text.indexOf(marker);
  return index >= 0 ? text.slice(index + marker.length).trim() : '';
}
