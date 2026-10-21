// 1. Import ảnh nền Hero từ thư mục assets/page course/
import swimmingHero from '../assets/page course/swimming.webp';
import tabletennisHero from '../assets/page course/facility-tabletennis-1024x683.webp';
import soccerHero from '../assets/page course/soccer-768x1024.webp';
import basketballHero from '../assets/page course/basketball-683x1024.webp';
import badmintonHero from '../assets/page course/badminton-1-1024x678.webp';
import golfHero from '../assets/page course/facility-golf-sim-1024x683.webp';
import tennisHero from '../assets/page course/tennis-1.webp';
import taekwondoHero from '../assets/page course/taekwondo-1-1024x683.webp';

// 2. Import 8 file ảnh HLV thực tế từ thư mục assets/coachs/
import coachBasketball from '../assets/coachs/coach-basketball.webp';
import coachSwimming from '../assets/coachs/coach-swimming.webp';
import coachGolf from '../assets/coachs/coach-golf.webp';
import coachTennis from '../assets/coachs/coach-tennis-687x1024.webp';
import coachTableTennis from '../assets/coachs/coach-tabletennis-683x1024.webp';
import coachBadminton from '../assets/coachs/coach-badminton.webp';
import coachTaekwondo from '../assets/coachs/coach-taekwondo-683x1024.webp';
import coachSoccer from '../assets/coachs/coach-soccer-683x1024.webp';

// 3. Import 8 file ảnh Cơ sở vật chất thực tế từ thư mục assets/facilities/
import arenaFacility from '../assets/facilities/facility-arena-1024x683.webp';
import basketballFacility from '../assets/facilities/facility-basketball-1024x683.webp';
import poolFacility from '../assets/facilities/facility-pool-1024x682.webp';
import golfSimFacility from '../assets/facilities/facility-golf-sim-1024x683.webp';
import tennisFacility from '../assets/facilities/facility-tennis-1024x576.webp';
import tabletennisFacility from '../assets/facilities/facility-tabletennis-1024x683.webp';
import studioFacility from '../assets/facilities/taekwondo-1-1024x683.webp';

export const fontDetails = {
  'bong-ban': {
    slug: 'bong-ban',
    title: 'KHÓA HỌC BÓNG BÀN',
    subtitle: 'Table Tennis Excellence',
    heroBg: tabletennisHero,
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
    headCoach: {
      name: 'PHAN HOÀNG ĐĂNG',
      role: 'HUẤN LUYỆN VIÊN TRƯỞNG',
      desc: 'Kiện tướng bóng bàn quốc gia với nhiều năm kinh nghiệm thi đấu chuyên nghiệp và đào tạo thế hệ VĐV trẻ.',
      avatar: coachTableTennis,
      achievements: [
        'HCV Giải Bóng bàn Toàn quốc',
        'HLV Chứng chỉ đào tạo trẻ cấp Quốc gia',
      ],
    },
    facility: {
      title: 'PHÒNG TẬP BÓNG BÀN CHUYÊN DỤNG',
      desc: 'Trang bị bàn thi đấu đạt chuẩn ITTF, thảm cao su chuyên dụng chống trượt và hệ thống chiếu sáng tiêu chuẩn chống chói.',
      image: tabletennisFacility,
    },
  },

  'boi-loi': {
    slug: 'boi-loi',
    title: 'KHÓA HỌC BƠI LỘI',
    subtitle: 'Swimming & Aquatics',
    heroBg: swimmingHero,
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
    headCoach: {
      name: 'NGUYỄN THỊ ÁNH VIÊN',
      role: 'HUẤN LUYỆN VIÊN TRƯỞNG',
      desc: 'Kinh ngư quốc gia với 10 năm thi đấu đỉnh cao, truyền cảm hứng và xây dựng nền tảng kỹ thuật bơi an toàn cho học viên AnhDuy Sport.',
      avatar: coachSwimming,
      achievements: [
        '25 HCV SEA Games, 2 HCĐ ASIAD',
        'VĐV bơi Việt Nam dự 3 kỳ Olympic liên tiếp',
      ],
    },
    facility: {
      title: 'KHÔNG GIAN TẬP LUYỆN CHUẨN OLYMPIC',
      desc: 'Hồ bơi tiêu chuẩn 50m với 10 làn bơi, hệ thống lọc nước UV + Ozone hiện đại đảm bảo an toàn tối đa cho học viên.',
      image: poolFacility,
    },
  },

  'bong-ro': {
    slug: 'bong-ro',
    title: 'KHÓA HỌC BÓNG RỔ',
    subtitle: 'Basketball Academy',
    heroBg: basketballHero,
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
    headCoach: {
      name: 'PAUL VILLANOVA',
      role: 'HUẤN LUYỆN VIÊN TRƯỞNG',
      desc: 'Chuyên gia huấn luyện bóng rổ quốc tế giàu kinh nghiệm, cựu HLV đào tạo trẻ phát triển tài năng chuyên nghiệp.',
      avatar: coachBasketball,
      achievements: [
        'Chứng chỉ Huấn luyện viên FIBA Level 2',
        'Hơn 12 năm đào tạo bóng rổ học đường & chuyên nghiệp',
      ],
    },
    facility: {
      title: 'SÂN VẬN ĐỘNG ANHDUY ARENA',
      desc: 'Sân vận động diện tích 1.976m² trang bị sàn gỗ giảm chấn cao cấp, sức chứa lên tới 2.500 chỗ ngồi đạt chuẩn FIBA.',
      image: arenaFacility,
    },
  },

  'bong-da': {
    slug: 'bong-da',
    title: 'KHÓA HỌC BÓNG ĐÁ',
    subtitle: 'Football Junior',
    heroBg: soccerHero,
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
    headCoach: {
      name: 'LÊ ĐÌNH TRỌNG',
      role: 'HUẤN LUYỆN VIÊN TRƯỞNG',
      desc: 'Cựu cầu thủ chuyên nghiệp, giảng viên đào tạo kỹ chiến thuật bóng đá trẻ với phương pháp tiếp cận hiện đại.',
      avatar: coachSoccer,
      achievements: [
        'Bằng Huấn luyện viên VFF / AFC',
        'Chuyên gia phát triển thể lực & chiến thuật bóng đá học đường',
      ],
    },
    facility: {
      title: 'SÂN THI ĐẤU ĐA NĂNG & SÂN CỎ CHUẨN',
      desc: 'Hệ thống sân tập chất lượng cao, trang bị dàn đèn chiếu sáng đạt tiêu chuẩn cho cả các buổi tập luyện tối.',
      image: basketballFacility,
    },
  },

  'cau-long': {
    slug: 'cau-long',
    title: 'KHÓA HỌC CẦU LÔNG',
    subtitle: 'Badminton Excellence',
    heroBg: badmintonHero,
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
    headCoach: {
      name: 'HUỲNH TRÍ THỊNH',
      role: 'HUẤN LUYỆN VIÊN TRƯỞNG',
      desc: 'HLV giàu kinh nghiệm chuyên đào tạo kỹ thuật di chuyển bộ chân, đập cầu uy lực và phản xạ cầu tốc độ cao.',
      avatar: coachBadminton,
      achievements: [
        'Chứng chỉ Huấn luyện viên BWF Level 1',
        'Vô địch giải Cầu lông Thành phố mở rộng',
      ],
    },
    facility: {
      title: 'KHÔNG GIAN SÂN CẦU LÔNG TRONG NHÀ',
      desc: 'Sân thảm chuyên dụng chống chấn thương, thiết kế trần cao và hệ thống đèn chống chói mắt tiêu chuẩn.',
      image: basketballFacility,
    },
  },

  'golf-3d': {
    slug: 'golf-3d',
    title: 'KHÓA HỌC GOLF 3D',
    subtitle: 'Golf Simulator & Green',
    heroBg: golfHero,
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
    headCoach: {
      name: 'NGÔ BẢO NGHI',
      role: 'HUẤN LUYỆN VIÊN TRƯỞNG',
      desc: 'Tay golf nữ hàng đầu Việt Nam, nhiều năm vô địch quốc gia với bằng cấp huấn luyện quốc tế.',
      avatar: coachGolf,
      achievements: [
        '3 Lần Vô địch Golf Nữ Quốc gia',
        'Huấn luyện viên Golf PGA Australia Certificate',
      ],
    },
    facility: {
      title: 'PHÒNG MÔ PHỎNG XSWING – GOLF 3D',
      desc: 'Công nghệ mô phỏng 3D cảm biến hiện đại phân tích chính xác lực đánh, quỹ đạo bóng và độ xoáy tới 99%.',
      image: golfSimFacility,
    },
  },

  'quan-vot': {
    slug: 'quan-vot',
    title: 'KHÓA HỌC QUẦN VỢT',
    subtitle: 'Tennis Academy',
    heroBg: tennisHero,
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
    headCoach: {
      name: 'NGUYỄN TÔN NHUẬN',
      role: 'HUẤN LUYỆN VIÊN TRƯỞNG',
      desc: 'Chuyên gia quần vợt với hơn 15 năm kinh nghiệm thi đấu đỉnh cao và đào tạo các tay vợt trẻ tiềm năng.',
      avatar: coachTennis,
      achievements: [
        'Chứng chỉ Huấn luyện viên ITF Level 2',
        'Cựu VĐV Quốc gia Quần vợt Việt Nam',
      ],
    },
    facility: {
      title: 'SÂN TENNIS NGOÀI TRỜI MẶT SÂN ACRYLIC',
      desc: 'Bề mặt sân Acrylic tiêu chuẩn quốc tế giúp duy trì độ nảy bóng chính xác và chống trơn trượt hiệu quả.',
      image: tennisFacility,
    },
  },

  'taekwondo': {
    slug: 'taekwondo',
    title: 'KHÓA HỌC TAEKWONDO',
    subtitle: 'Martial Arts & Discipline',
    heroBg: taekwondoHero,
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
    headCoach: {
      name: 'PHAN THỊ THÚY HẰNG',
      role: 'HUẤN LUYỆN VIÊN TRƯỞNG',
      desc: 'Võ sư Taekwondo Cao đẳng Quốc tế, giàu tâm huyết trong việc rèn luyện thể chất và bản lĩnh cho học viên.',
      avatar: coachTaekwondo,
      achievements: [
        'Huy chương Vàng Giải Taekwondo Đông Nam Á',
        'Bằng Võ sư Taekwondo Quốc tế Kukkiwon',
      ],
    },
    facility: {
      title: 'PHÒNG TẬP STUDIO CÓ TƯỜNG GƯƠNG TOÀN PHẦN',
      desc: 'Không gian rộng 266m² trang bị thảm võ thuật giảm chấn, tường gương hỗ trợ quan sát và căn chỉnh động tác.',
      image: studioFacility,
    },
  },
};