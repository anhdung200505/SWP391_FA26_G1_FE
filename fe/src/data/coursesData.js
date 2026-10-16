// Import ảnh nền Hero từ thư mục assets/page course/
import swimmingImg from '../assets/page course/swimming.webp';
import tabletennisImg from '../assets/page course/facility-tabletennis-1024x683.webp';
import soccerImg from '../assets/page course/soccer-768x1024.webp';
import basketballImg from '../assets/page course/basketball-683x1024.webp';
import badmintonImg from '../assets/page course/badminton-1-1024x678.webp';
import golfSimImg from '../assets/page course/facility-golf-sim-1024x683.webp';
import tennisImg from '../assets/page course/tennis-1.webp';
import taekwondoImg from '../assets/page course/taekwondo-1-1024x683.webp';

export const fontDetails = {
  'bong-ban': {
    slug: 'bong-ban',
    title: 'KHÓA HỌC BÓNG BÀN',
    subtitle: 'Table Tennis Excellence',
    heroBg: tabletennisImg,
    category: 'CÁ NHÂN',
    level: 'BEGINNER & ADVANCED',
    age: '7-17 Tuổi',
    desc: 'Chương trình đào tạo bóng bàn giúp học viên rèn luyện phản xạ nhanh, kiểm soát độ xoáy của bóng, bộ chân di chuyển linh hoạt và chiến thuật thi đấu tốc độ cao.',
    stats: [
      { value: '60P', label: 'THỜI LƯỢNG BUỔI HỌC' },
      { value: '7+', label: 'ĐỘ TUỔI BẮT ĐẦU' },
      { value: 'CHUẨN', label: 'BÀN THI ĐẤU QUỐC TẾ' },
      { value: '100%', label: 'HLV CHUYÊN NGHIỆP' },
    ],
  },
  'boi-loi': {
    slug: 'boi-loi',
    title: 'KHÓA HỌC BƠI LỘI',
    subtitle: 'Swimming & Aquatics',
    heroBg: swimmingImg,
    category: 'CÁ NHÂN',
    level: 'EVERY LEVEL',
    age: '6+ Tuổi',
    desc: 'Đào tạo kỹ năng sinh tồn dưới nước, hoàn thiện 4 kỹ thuật bơi chuẩn Olympic trong môi trường hồ bơi 50m an toàn trang bị hệ thống lọc UV + Ozone.',
    stats: [
      { value: '50M', label: 'HỒ BƠI OLYMPIC' },
      { value: '6+', label: 'ĐỘ TUỔI HỌC VIÊN' },
      { value: 'UV+', label: 'LỌC NƯỚC AN TOÀN' },
      { value: '100%', label: 'CAM KẾT BIẾT BƠI' },
    ],
  },
  'bong-ro': {
    slug: 'bong-ro',
    title: 'KHÓA HỌC BÓNG RỔ',
    subtitle: 'Basketball Academy',
    heroBg: basketballImg,
    category: 'ĐỒNG ĐỘI',
    level: 'INTERMEDIATE',
    age: '8-17 Tuổi',
    desc: 'Rèn luyện kỹ năng kiểm soát bóng, ném rổ, phòng thủ và tư duy chiến thuật đồng đội trong môi trường thi đấu đạt tiêu chuẩn FIBA.',
    stats: [
      { value: 'FIBA', label: 'SÂN ĐẠT CHUẨN' },
      { value: '8-17', label: 'LỨA TUỔI ĐÀO TẠO' },
      { value: 'PRO', label: 'GIÁO TRÌNH SAIGON HEAT' },
      { value: '2L', label: 'MÔI TRƯỜNG SONG NGỮ' },
    ],
  },
  'bong-da': {
    slug: 'bong-da',
    title: 'KHÓA HỌC BÓNG ĐÁ',
    subtitle: 'Football Junior',
    heroBg: soccerImg,
    category: 'ĐỒNG ĐỘI',
    level: 'MỌI CẤP ĐỘ',
    age: '6-17 Tuổi',
    desc: 'Huấn luyện kỹ thuật cá nhân, chuyền bóng, sút bóng, phối hợp đội hình và xây dựng tinh thần đồng đội kết hợp đào tạo EQ.',
    stats: [
      { value: 'HFF', label: 'BẰNG HLV CẤP' },
      { value: '6-17', label: 'ĐỘ TUỔI THAM GIA' },
      { value: 'EQ', label: 'ĐÀO TẠO CẢM XÚC' },
      { value: '5+', label: 'NĂM KINH NGHIỆM' },
    ],
  },
  'cau-long': {
    slug: 'cau-long',
    title: 'KHÓA HỌC CẦU LÔNG',
    subtitle: 'Badminton Excellence',
    heroBg: badmintonImg,
    category: 'RACKET',
    level: 'MỌI CẤP ĐỘ',
    age: '7-17 Tuổi',
    desc: 'Nâng cao tốc độ di chuyển, kỹ thuật đập/phông cầu chuyên sâu và khả năng phối hợp chiến thuật đánh đơn hoặc đánh đôi.',
    stats: [
      { value: 'BWF', label: 'CHUẨN HUẤN LUYỆN' },
      { value: '7-17', label: 'ĐỘ TUỔI HỌC VIÊN' },
      { value: 'INDOOR', label: 'SÂN THẢM TẬP CHUYÊN DỤNG' },
      { value: '100%', label: 'PHẢN XẠ NÂNG CAO' },
    ],
  },
  'golf-3d': {
    slug: 'golf-3d',
    title: 'KHÓA HỌC GOLF 3D',
    subtitle: 'Golf Simulator & Green',
    heroBg: golfSimImg,
    category: 'CÁ NHÂN',
    level: 'INTERMEDIATE',
    age: '8-17 Tuổi',
    desc: 'Làm chủ tư thế swing, kiểm soát lực đánh chính xác bằng hệ thống mô phỏng XSwing 3D hiện đại kết hợp tập luyện gạt bóng trên sân Putting Green.',
    stats: [
      { value: '3D', label: 'MÔ PHỎNG XSWING' },
      { value: 'LPGA', label: 'HLV HẠNG A' },
      { value: 'GREEN', label: 'PUTTING NGOÀI TRỜI' },
      { value: 'PRO', label: 'PHÂN TÍCH SWING' },
    ],
  },
  'quan-vot': {
    slug: 'quan-vot',
    title: 'KHÓA HỌC QUẦN VỢT',
    subtitle: 'Tennis Academy',
    heroBg: tennisImg,
    category: 'RACKET',
    level: 'INTERMEDIATE',
    age: '8-17 Tuổi',
    desc: 'Tập trung vào di chuyển bộ chân (footwork), cú đánh ổn định, phản xạ và tư duy thi đấu trên mặt sân Acrylic chuyên nghiệp.',
    stats: [
      { value: 'ITF', label: 'HLV CHỨNG CHỈ QUỐC TẾ' },
      { value: 'ACRYLIC', label: 'MẶT SÂN THI ĐẤU' },
      { value: '8-17', label: 'LỨA TUỔI ĐÀO TẠO' },
      { value: '20+', label: 'NĂM KINH NGHIỆM' },
    ],
  },
  'taekwondo': {
    slug: 'taekwondo',
    title: 'KHÓA HỌC TAEKWONDO',
    subtitle: 'Martial Arts & Discipline',
    heroBg: taekwondoImg,
    category: 'VÕ THUẬT',
    level: 'FOUNDATION',
    age: '6-17 Tuổi',
    desc: 'Rèn luyện tính kỷ luật, thể lực, độ linh hoạt, kỹ năng tự vệ và tinh thần thượng võ trong phòng tập Studio tường gương trang bị thảm giảm chấn.',
    stats: [
      { value: '6 ĐẲNG', label: 'HLV ĐAI ĐEN' },
      { value: 'WT', label: 'KUKKIWON CÔNG NHẬN' },
      { value: 'Studio', label: 'PHÒNG GƯƠNG THẢM TẬP' },
      { value: '100%', label: 'TỰ VỆ AN TOÀN' },
    ],
  },
};