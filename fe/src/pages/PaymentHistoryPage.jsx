import { useEffect } from 'react';
import PaymentHistory from '../components/member/PaymentHistory';

// Trang riêng để học viên nào cũng xem được lịch sử thanh toán, kể cả khi chưa có gói hay lớp.
export default function PaymentHistoryPage() {
  useEffect(() => {
    document.title = 'Lịch sử thanh toán · AnhDuy Sport';
  }, []);

  return <PaymentHistory />;
}
