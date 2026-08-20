// Mock dataset and service for Workshops and Registrations
// Conforms to Business Rules BR-01, BR-02, BR-03, BR-08, BR-11

const STORAGE_REGISTRATIONS_KEY = 'tttn_mis_04_registrations';

export const INITIAL_WORKSHOPS = [
  {
    id: 1,
    title: 'UI/UX Design Workshop: Từ Ý Tưởng Đến Prototyping',
    category: 'Design',
    date: '24/08/2026',
    time: '08:30 - 11:30',
    startAt: '2026-08-24T08:30:00',
    endAt: '2026-08-24T11:30:00',
    location: 'Phòng A203, Tòa nhà Trung tâm Công nghệ',
    organizer: 'Phòng Công tác Sinh viên & CLB Thiết kế',
    speaker: {
      name: 'Nguyễn Hải Nam',
      title: 'Senior Product Designer @ Tech Corp',
    },
    quota: 40,
    registered: 32,
    waitlistCount: 0,
    status: 'open', // 'open' | 'full' | 'closed'
    cutoffHours: 24, // BR-11: được hủy trước 24h
    description:
      'Khám phá các nguyên tắc cơ bản trong thiết kế trải nghiệm người dùng (UX) và xây dựng giao diện trực quan (UI) bằng Figma. Workshop tập trung vào quy trình từ User Research, Wireframing đến High-fidelity Interactive Prototype.',
    objectives: [
      'Nắm vững quy trình thiết kế chuẩn Design Thinking',
      'Thành thạo các công cụ Auto-layout, Components và Variants trong Figma',
      'Xây dựng một Interactive Prototype hoàn chỉnh cho dự án thực tế',
      'Được review và nhận góp ý trực tiếp từ chuyên gia trong ngành',
    ],
    agenda: [
      { time: '08:30 - 08:45', activity: 'Đón tiếp & Điểm danh mã QR tại sảnh A203' },
      { time: '08:45 - 09:30', activity: 'Phần 1: Tư duy UX, User Journey & Information Architecture' },
      { time: '09:30 - 10:30', activity: 'Phần 2: Thực hành UI Design trên Figma (Design System, Components)' },
      { time: '10:30 - 11:15', activity: 'Phần 3: Ghép Prototype, Micro-interactions & Usability Testing' },
      { time: '11:15 - 11:30', activity: 'Q&A, Tổng kết và Khảo sát đánh giá nhận chứng nhận' },
    ],
    prerequisites: [
      'Đối tượng tham gia mang theo Laptop cá nhân có kết nối Internet',
      'Đã đăng ký tài khoản Figma miễn phí trước sự kiện',
      'Không yêu cầu kinh nghiệm thiết kế nâng cao',
    ],
  },
  {
    id: 2,
    title: 'Python for Data Analysis & Visualization',
    category: 'Technology',
    date: '27/08/2026',
    time: '13:30 - 16:30',
    startAt: '2026-08-27T13:30:00',
    endAt: '2026-08-27T16:30:00',
    location: 'Lab B302, Khoa Công nghệ Thông tin',
    organizer: 'CLB Công nghệ & Phân tích Dữ liệu',
    speaker: {
      name: 'Trần Minh Tuấn',
      title: 'Lead Data Analyst @ FinTech Asia',
    },
    quota: 35,
    registered: 35,
    waitlistCount: 4,
    status: 'full',
    cutoffHours: 12,
    description:
      'Thực hành phân tích và trực quan hóa dữ liệu thực tế bằng Python, thư viện Pandas, NumPy, Matplotlib và Seaborn. Giải quyết bài toán phân tích hành vi người dùng trong kinh doanh.',
    objectives: [
      'Hiểu rõ quy trình xử lý dữ liệu thô (Data Cleaning & Wrangling)',
      'Sử dụng Pandas để lọc, gom nhóm và tính toán các chỉ số kinh doanh',
      'Trực quan hóa biểu đồ insight chuyên nghiệp bằng Seaborn & Plotly',
      'Xây dựng báo cáo phân tích tổng hợp (Executive Summary)',
    ],
    agenda: [
      { time: '13:30 - 13:45', activity: 'Check-in QR & Khởi động môi trường Jupyter Lab' },
      { time: '13:45 - 14:45', activity: 'Kỹ thuật làm sạch và biến đổi dữ liệu với Pandas' },
      { time: '14:45 - 15:45', activity: 'Trực quan hóa dữ liệu và tìm kiếm Insights ẩn' },
      { time: '15:45 - 16:30', activity: 'Thực chiến Mini-Challenge & Giải đáp thắc mắc' },
    ],
    prerequisites: [
      'Laptop có cài đặt sẵn Python 3.10+ hoặc sử dụng Google Colab',
      'Kiến thức cơ bản về lập trình Python (biến, vòng lặp, hàm)',
    ],
  },
  {
    id: 3,
    title: 'React Advanced: Kiến Trúc Xây Dựng Dự Án Lớn',
    category: 'Technology',
    date: '30/08/2026',
    time: '08:30 - 11:30',
    startAt: '2026-08-30T08:30:00',
    endAt: '2026-08-30T11:30:00',
    location: 'Lab B301, Khoa Công nghệ Thông tin',
    organizer: 'Khoa Công nghệ Thông tin',
    speaker: {
      name: 'Lê Hoàng Long',
      title: 'Senior Frontend Architect',
    },
    quota: 30,
    registered: 18,
    waitlistCount: 0,
    status: 'open',
    cutoffHours: 24,
    description:
      'Tìm hiểu cách tổ chức cấu trúc dự án React quy mô lớn, tối ưu hóa hiệu năng render, quản lý state nâng cao và bảo mật luồng xác thực JWT/RBAC.',
    objectives: [
      'Áp dụng Clean Architecture và Feature-based folder structure',
      'Tối ưu re-render với useMemo, useCallback và React Profiler',
      'Xây dựng luồng xác thực JWT, Refresh Token & Protected Routes vững chắc',
    ],
    agenda: [
      { time: '08:30 - 09:15', activity: 'Tổng quan kiến trúc & Anti-patterns phổ biến trong React' },
      { time: '09:15 - 10:15', activity: 'Thực hành Refactor state management & Custom Hooks' },
      { time: '10:15 - 11:15', activity: 'Tối ưu Bundle size, Code-splitting & Lazy loading' },
      { time: '11:15 - 11:30', activity: 'Hỏi đáp kỹ thuật chuyên sâu' },
    ],
    prerequisites: [
      'Đã có kiến thức nền tảng về React Hooks (useState, useEffect)',
      'Mang theo máy tính đã cài đặt Node.js LTS và VS Code',
    ],
  },
  {
    id: 4,
    title: 'Public Speaking Essentials: Tự Tin Thuyết Trình',
    category: 'Soft Skill',
    date: '02/09/2026',
    time: '18:00 - 20:30',
    startAt: '2026-09-02T18:00:00',
    endAt: '2026-09-02T20:30:00',
    location: 'Hội trường C',
    organizer: 'Trung tâm Hỗ trợ Sinh viên',
    speaker: {
      name: 'ThS. Đặng Bích Phương',
      title: 'Master Trainer & MC Đài Truyền hình',
    },
    quota: 50,
    registered: 21,
    waitlistCount: 0,
    status: 'open',
    cutoffHours: 24,
    description:
      'Rèn luyện kỹ năng làm chủ sân khấu, quản lý nỗi sợ trước đám đông, xây dựng cấu trúc bài nói mạch lạc và thu hút người nghe bằng ngôn ngữ cơ thể.',
    objectives: [
      'Khắc phục tâm lý lo lắng và hồi hộp khi đứng trước đám đông',
      'Nắm bắt công thức cấu trúc bài thuyết trình 3S (Story - Science - Solution)',
      'Thực hành làm chủ giọng nói, ngữ điệu và cử chỉ hình thể',
    ],
    agenda: [
      { time: '18:00 - 18:30', activity: 'Giao lưu khởi động & Check-in' },
      { time: '18:30 - 19:30', activity: 'Bí quyết kiểm soát tâm lý & Kỹ thuật xây dựng câu chuyện' },
      { time: '19:30 - 20:15', activity: 'Thực hành mini-speech 2 phút & Nhận feedback trực tiếp' },
      { time: '20:15 - 20:30', activity: 'Tổng kết và trao quà lưu niệm' },
    ],
    prerequisites: ['Trang phục lịch sự, tinh thần cởi mở sẵn sàng tương tác'],
  },
  {
    id: 5,
    title: 'Digital Marketing Fundamentals & Social Strategy',
    category: 'Marketing',
    date: '05/09/2026',
    time: '08:30 - 11:30',
    startAt: '2026-09-05T08:30:00',
    endAt: '2026-09-05T11:30:00',
    location: 'Phòng A201, Tòa nhà Trung tâm Công nghệ',
    organizer: 'CLB Truyền thông & Marketing',
    speaker: {
      name: 'Vũ Quốc Khánh',
      title: 'Growth Marketing Manager',
    },
    quota: 45,
    registered: 12,
    waitlistCount: 0,
    status: 'open',
    cutoffHours: 24,
    description:
      'Tổng quan về chiến lược tiếp thị số, xây dựng kênh truyền thông đa nền tảng (TikTok, Facebook, LinkedIn), đo lường chỉ số ROI, CAC, LTV và sáng tạo nội dung viral.',
    objectives: [
      'Xây dựng kế hoạch Content Marketing đa kênh hiệu quả',
      'Đọc hiểu các chỉ số hiệu suất tiếp thị cốt lõi (Reach, CTR, Conversion)',
      'Ứng dụng AI (ChatGPT, Midjourney) trong tối ưu quy trình sản xuất nội dung',
    ],
    agenda: [
      { time: '08:30 - 09:30', activity: 'Toàn cảnh Digital Marketing 2026 & Xu hướng Video ngắn' },
      { time: '09:30 - 10:30', activity: 'Xây dựng Phễu chuyển đổi (Marketing Funnel) thực chiến' },
      { time: '10:30 - 11:30', activity: 'Case study viral campaign & Thực hành lập kế hoạch' },
    ],
    prerequisites: ['Có tài khoản mạng xã hội và yêu thích sáng tạo nội dung'],
  },
  {
    id: 6,
    title: 'Career Orientation & CV Masterclass 2026',
    category: 'Career',
    date: '10/09/2026',
    time: '14:00 - 17:00',
    startAt: '2026-09-10T14:00:00',
    endAt: '2026-09-10T17:00:00',
    location: 'Hội trường A, Tầng 1 Tòa nhà Điều hành',
    organizer: 'Phòng Quan hệ Doanh nghiệp',
    speaker: {
      name: 'Ngô Thanh Hương',
      title: 'Head of Talent Acquisition @ Global Corp',
    },
    quota: 100,
    registered: 76,
    waitlistCount: 0,
    status: 'open',
    cutoffHours: 24,
    description:
      'Định hướng lộ trình sự nghiệp ngành CNTT & Kinh tế số, kỹ năng viết CV chuẩn ATS quốc tế, chiến lược phỏng vấn vượt qua vòng HR và Technical Interview.',
    objectives: [
      'Hiểu rõ tiêu chí đánh giá ứng viên của các tập đoàn đa quốc gia',
      'Viết CV chuẩn ATS, làm nổi bật kỹ năng và dự án cá nhân',
      'Kỹ năng trả lời phỏng vấn theo phương pháp STAR',
    ],
    agenda: [
      { time: '14:00 - 15:00', activity: 'Xu hướng thị trường tuyển dụng & Khung năng lực thế hệ mới' },
      { time: '15:00 - 16:00', activity: 'Sửa CV trực tiếp tại chỗ' },
      { time: '16:00 - 17:00', activity: 'Mô phỏng phỏng vấn thử & Hỏi đáp' },
    ],
    prerequisites: ['Chuẩn bị sẵn 01 bản CV dạng PDF trên điện thoại hoặc laptop'],
  },
];

// Helper to get local stored workshops or defaults
export function getWorkshops() {
  const custom = localStorage.getItem('tttn_mis_04_workshops');
  if (custom) {
    try {
      return JSON.parse(custom);
    } catch {
      return INITIAL_WORKSHOPS;
    }
  }
  return INITIAL_WORKSHOPS;
}

export function getWorkshopById(id) {
  const list = getWorkshops();
  return list.find((w) => w.id === Number(id)) || null;
}

// Get all registrations saved in local storage
export function getStoredRegistrations() {
  const data = localStorage.getItem(STORAGE_REGISTRATIONS_KEY);
  if (!data) {
    localStorage.setItem(STORAGE_REGISTRATIONS_KEY, JSON.stringify(DEFAULT_INITIAL_REGISTRATIONS));
    return DEFAULT_INITIAL_REGISTRATIONS;
  }
  try {
    return JSON.parse(data);
  } catch {
    return DEFAULT_INITIAL_REGISTRATIONS;
  }
}

// Get user registration for a specific workshop
export function getUserRegistration(workshopId, userEmail = 'user@workshop.edu.vn') {
  const list = getStoredRegistrations();
  return list.find(
    (reg) => reg.workshopId === Number(workshopId) && reg.email.toLowerCase() === userEmail.toLowerCase() && reg.status !== 'canceled'
  );
}

// Register for workshop (BR-01, BR-02, BR-08)
export async function registerWorkshop({ workshopId, fullName, email, phone, department, note, isWaitlistAccept = false }) {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 650));

  const list = getWorkshops();
  const workshopIndex = list.findIndex((w) => w.id === Number(workshopId));
  if (workshopIndex === -1) {
    throw new Error('Workshop không tồn tại trên hệ thống.');
  }

  const workshop = list[workshopIndex];

  // BR-08: Check status
  if (workshop.status === 'closed' || workshop.status === 'canceled') {
    throw new Error('Sự kiện này hiện đã đóng hoặc không còn mở đăng ký.');
  }

  // BR-01: Anti duplicate registration by email
  const existingRegistrations = getStoredRegistrations();
  const alreadyRegistered = existingRegistrations.find(
    (r) => r.workshopId === Number(workshopId) && r.email.toLowerCase() === email.toLowerCase() && r.status !== 'canceled'
  );

  if (alreadyRegistered) {
    const error = new Error(`Email "${email}" đã có lượt đăng ký (${alreadyRegistered.status === 'confirmed' ? 'Đã xác nhận' : 'Danh sách chờ'}) cho sự kiện này.`);
    error.code = 'DUPLICATE_REGISTRATION';
    error.existingRegistration = alreadyRegistered;
    throw error;
  }

  // BR-02: Quota & Waitlist logic
  const isFull = workshop.registered >= workshop.quota;

  if (isFull && !isWaitlistAccept) {
    const error = new Error('Workshop đã hết chỗ. Bạn có muốn tham gia Danh sách chờ không?');
    error.code = 'WORKSHOP_FULL';
    error.currentWaitlistCount = workshop.waitlistCount || 0;
    throw error;
  }

  const newRegId = 'REG-' + Date.now();
  let registrationResult = null;

  if (isFull && isWaitlistAccept) {
    // Put into Waitlist (BR-02)
    const newWaitlistPosition = (workshop.waitlistCount || 0) + 1;
    workshop.waitlistCount = newWaitlistPosition;

    registrationResult = {
      id: newRegId,
      workshopId: workshop.id,
      workshopTitle: workshop.title,
      fullName,
      email,
      phone,
      department,
      note,
      status: 'waitlist', // 'confirmed' | 'waitlist' | 'canceled'
      waitlistPosition: newWaitlistPosition,
      registeredAt: new Date().toISOString(),
      ticketCode: `WL-${workshop.id}-${Math.floor(1000 + Math.random() * 9000)}`,
    };
  } else {
    // Confirm registration
    workshop.registered += 1;
    if (workshop.registered >= workshop.quota) {
      workshop.status = 'full';
    }

    registrationResult = {
      id: newRegId,
      workshopId: workshop.id,
      workshopTitle: workshop.title,
      fullName,
      email,
      phone,
      department,
      note,
      status: 'confirmed',
      registeredAt: new Date().toISOString(),
      ticketCode: `WS-${workshop.id}-${Math.floor(1000 + Math.random() * 9000)}`,
      qrCodePayload: `TTTN_MIS_04|${workshop.id}|${newRegId}|${email}`,
    };
  }

  // Save updated workshops and registrations
  list[workshopIndex] = workshop;
  localStorage.setItem('tttn_mis_04_workshops', JSON.stringify(list));

  existingRegistrations.push(registrationResult);
  localStorage.setItem(STORAGE_REGISTRATIONS_KEY, JSON.stringify(existingRegistrations));

  return registrationResult;
}

// Cancel registration (BR-03, BR-11)
export async function cancelRegistration(registrationId, reason = '') {
  await new Promise((resolve) => setTimeout(resolve, 500));

  const registrations = getStoredRegistrations();
  const regIndex = registrations.findIndex((r) => r.id === registrationId);
  if (regIndex === -1) {
    throw new Error('Không tìm thấy lượt đăng ký để hủy.');
  }

  const reg = registrations[regIndex];
  const list = getWorkshops();
  const workshopIndex = list.findIndex((w) => w.id === reg.workshopId);

  if (workshopIndex === -1) {
    throw new Error('Workshop không tồn tại.');
  }

  const workshop = list[workshopIndex];

  // BR-11: Check Cutoff time
  const now = new Date();
  const eventStart = new Date(workshop.startAt);
  const cutoffLimit = new Date(eventStart.getTime() - (workshop.cutoffHours || 24) * 60 * 60 * 1000);

  if (now >= cutoffLimit) {
    throw new Error(`Đã quá hạn chót hủy vé (${workshop.cutoffHours || 24} giờ trước khi sự kiện bắt đầu).`);
  }

  reg.status = 'canceled';
  reg.canceledAt = now.toISOString();
  reg.cancelReason = reason;

  // If the cancelled registration was confirmed, promote next waitlist person (BR-03)
  let promotedUser = null;
  if (reg.status === 'canceled' && reg.ticketCode?.startsWith('WS-')) {
    // Decrement confirmed count
    workshop.registered = Math.max(0, workshop.registered - 1);

    // Look for first waitlist user (FIFO)
    const nextWaitlist = registrations.find(
      (r) => r.workshopId === workshop.id && r.status === 'waitlist'
    );

    if (nextWaitlist) {
      nextWaitlist.status = 'confirmed';
      nextWaitlist.promotedAt = now.toISOString();
      nextWaitlist.ticketCode = `WS-${workshop.id}-${Math.floor(1000 + Math.random() * 9000)}`;
      nextWaitlist.qrCodePayload = `TTTN_MIS_04|${workshop.id}|${nextWaitlist.id}|${nextWaitlist.email}`;
      workshop.registered += 1;
      workshop.waitlistCount = Math.max(0, (workshop.waitlistCount || 1) - 1);
      promotedUser = nextWaitlist;
    }

    if (workshop.registered < workshop.quota) {
      workshop.status = 'open';
    }
  }

  localStorage.setItem('tttn_mis_04_workshops', JSON.stringify(list));
  localStorage.setItem(STORAGE_REGISTRATIONS_KEY, JSON.stringify(registrations));

  return { success: true, promotedUser };
}

// Sample default registrations including waitlist and auto-promoted items
export const DEFAULT_INITIAL_REGISTRATIONS = [
  {
    id: 'REG-INIT-01',
    workshopId: 2,
    workshopTitle: 'Python for Data Analysis & Visualization',
    fullName: 'Nguyễn Văn A',
    email: 'sinhvien@workshop.edu.vn',
    phone: '0987654321',
    department: 'Khoa Công nghệ Thông tin',
    status: 'waitlist',
    waitlistPosition: 2,
    registeredAt: '2026-08-19T09:15:00.000Z',
    ticketCode: 'WL-2-1042',
  },
  {
    id: 'REG-INIT-02',
    workshopId: 3,
    workshopTitle: 'React Advanced: Kiến Trúc Xây Dựng Dự Án Lớn',
    fullName: 'Nguyễn Văn A',
    email: 'sinhvien@workshop.edu.vn',
    phone: '0987654321',
    department: 'Khoa Công nghệ Thông tin',
    status: 'confirmed',
    wasPromoted: true,
    promotedAt: '2026-08-20T08:00:00.000Z',
    registeredAt: '2026-08-18T14:20:00.000Z',
    ticketCode: 'WS-3-8821',
    qrCodePayload: 'TTTN_MIS_04|3|REG-INIT-02|sinhvien@workshop.edu.vn',
  },
];

// Get user waitlist and auto-promoted entries
export function getUserWaitlistEntries(userEmail = 'sinhvien@workshop.edu.vn') {
  const registrations = getStoredRegistrations();
  const workshops = getWorkshops();

  const userEntries = registrations.filter(
    (reg) =>
      reg.email.toLowerCase() === userEmail.toLowerCase() &&
      (reg.status === 'waitlist' || (reg.status === 'confirmed' && reg.wasPromoted))
  );

  return userEntries.map((reg) => {
    const workshop = workshops.find((w) => w.id === reg.workshopId) || {};
    return {
      ...reg,
      workshop,
    };
  });
}

// Leave waitlist (Cancel waiting queue position)
export async function leaveWaitlist(registrationId, reason = '') {
  await new Promise((resolve) => setTimeout(resolve, 500));

  const registrations = getStoredRegistrations();
  const regIndex = registrations.findIndex((r) => r.id === registrationId);
  if (regIndex === -1) {
    throw new Error('Không tìm thấy lượt đăng ký danh sách chờ.');
  }

  const reg = registrations[regIndex];
  const list = getWorkshops();
  const workshopIndex = list.findIndex((w) => w.id === reg.workshopId);

  reg.status = 'canceled';
  reg.canceledAt = new Date().toISOString();
  reg.cancelReason = reason;

  if (workshopIndex !== -1) {
    const workshop = list[workshopIndex];
    workshop.waitlistCount = Math.max(0, (workshop.waitlistCount || 1) - 1);
    list[workshopIndex] = workshop;
  }

  // Re-index subsequent waitlist positions for FIFO consistency
  let currentPos = 1;
  registrations.forEach((r) => {
    if (r.workshopId === reg.workshopId && r.status === 'waitlist') {
      r.waitlistPosition = currentPos++;
    }
  });

  localStorage.setItem('tttn_mis_04_workshops', JSON.stringify(list));
  localStorage.setItem(STORAGE_REGISTRATIONS_KEY, JSON.stringify(registrations));

  return { success: true };
}

const STORAGE_ATTENDANCE_KEY = 'tttn_mis_04_attendance';

// Get confirmed registrations for user to display their Ticket Pass QR
export function getConfirmedRegistrations(userEmail = 'sinhvien@workshop.edu.vn') {
  const registrations = getStoredRegistrations();
  const workshops = getWorkshops();

  const userConfirmed = registrations.filter(
    (reg) =>
      reg.email.toLowerCase() === userEmail.toLowerCase() &&
      (reg.status === 'confirmed' || reg.status === 'attended')
  );

  return userConfirmed.map((reg) => {
    const workshop = workshops.find((w) => w.id === reg.workshopId) || {};
    return {
      ...reg,
      workshop,
    };
  });
}

// Get attendance history
export function getAttendanceHistory() {
  const data = localStorage.getItem(STORAGE_ATTENDANCE_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

// Process QR Check-in (BR-04, BR-05, BR-14)
export async function processCheckIn({
  qrPayload = '',
  ticketCode = '',
  targetWorkshopId = null,
  ignoreTimeWindow = false,
}) {
  await new Promise((resolve) => setTimeout(resolve, 600));

  const registrations = getStoredRegistrations();
  const workshops = getWorkshops();

  let matchedReg = null;

  // Search by qrPayload or ticketCode
  if (qrPayload) {
    const parts = qrPayload.split('|');
    if (parts.length >= 3 && parts[0] === 'TTTN_MIS_04') {
      const regId = parts[2];
      matchedReg = registrations.find((r) => r.id === regId);
    } else {
      matchedReg = registrations.find((r) => r.qrCodePayload === qrPayload || r.ticketCode === qrPayload);
    }
  } else if (ticketCode) {
    const cleanCode = ticketCode.trim().toUpperCase();
    matchedReg = registrations.find(
      (r) => r.ticketCode?.toUpperCase() === cleanCode || r.id?.toUpperCase() === cleanCode
    );
  }

  // BR-04: Validate code existence
  if (!matchedReg) {
    const error = new Error('Mã QR hoặc Mã vé không tồn tại trên hệ thống.');
    error.code = 'INVALID_QR_CODE';
    throw error;
  }

  // Check waitlist status
  if (matchedReg.status === 'waitlist') {
    const error = new Error(`Lượt đăng ký này (${matchedReg.ticketCode}) hiện đang ở Danh sách chờ, chưa được cấp vé chính thức để điểm danh.`);
    error.code = 'WAITLIST_NOT_ALLOWED';
    throw error;
  }

  // Check canceled status
  if (matchedReg.status === 'canceled') {
    const error = new Error(`Vé này (${matchedReg.ticketCode}) đã bị hủy trước đó.`);
    error.code = 'TICKET_CANCELED';
    throw error;
  }

  // Check target workshop if specified
  if (targetWorkshopId && Number(matchedReg.workshopId) !== Number(targetWorkshopId)) {
    const error = new Error(`Vé này thuộc Workshop khác (không thuộc Workshop bạn đang chọn điểm danh).`);
    error.code = 'WRONG_WORKSHOP';
    throw error;
  }

  const workshop = workshops.find((w) => w.id === matchedReg.workshopId);
  if (!workshop) {
    throw new Error('Không tìm thấy thông tin Workshop tương ứng.');
  }

  // BR-14: Anti-duplicate check-in (Chống điểm danh trùng)
  if (matchedReg.status === 'attended' && matchedReg.attendedAt) {
    const dateObj = new Date(matchedReg.attendedAt);
    const timeStr = `${dateObj.getHours().toString().padStart(2, '0')}:${dateObj
      .getMinutes()
      .toString()
      .padStart(2, '0')}:${dateObj.getSeconds().toString().padStart(2, '0')} ngày ${dateObj.toLocaleDateString('vi-VN')}`;

    return {
      success: true,
      alreadyAttended: true,
      attendedAt: matchedReg.attendedAt,
      formattedTime: timeStr,
      registration: matchedReg,
      workshop,
      message: `Vé này đã được điểm danh trước đó vào lúc ${timeStr}.`,
    };
  }

  // BR-05: Check-in Time Window verification
  const now = new Date();
  const eventStart = new Date(workshop.startAt);
  // Allowed window: 45 mins before start to 60 mins after start
  const windowOpen = new Date(eventStart.getTime() - 45 * 60 * 1000);
  const windowClose = new Date(eventStart.getTime() + 60 * 60 * 1000);

  if (!ignoreTimeWindow && (now < windowOpen || now > windowClose)) {
    // If strict time checking fails
    const error = new Error(
      `Ngoài khung giờ cho phép điểm danh (Khung giờ mở: 45 phút trước sự kiện đến 60 phút sau khi bắt đầu).`
    );
    error.code = 'OUTSIDE_TIME_WINDOW';
    error.timeWindow = {
      open: windowOpen.toISOString(),
      close: windowClose.toISOString(),
    };
    throw error;
  }

  // Record Attendance
  const nowIso = now.toISOString();
  matchedReg.status = 'attended';
  matchedReg.attendedAt = nowIso;

  // Save to registrations
  const regIndex = registrations.findIndex((r) => r.id === matchedReg.id);
  if (regIndex !== -1) {
    registrations[regIndex] = matchedReg;
    localStorage.setItem(STORAGE_REGISTRATIONS_KEY, JSON.stringify(registrations));
  }

  // Save to Attendance Log
  const attendanceList = getAttendanceHistory();
  const newAttendanceRecord = {
    id: 'ATT-' + Date.now(),
    registrationId: matchedReg.id,
    ticketCode: matchedReg.ticketCode,
    workshopId: workshop.id,
    workshopTitle: workshop.title,
    fullName: matchedReg.fullName,
    email: matchedReg.email,
    department: matchedReg.department,
    attendedAt: nowIso,
    checkinMethod: 'QR_SCAN',
  };
  attendanceList.unshift(newAttendanceRecord);
  localStorage.setItem(STORAGE_ATTENDANCE_KEY, JSON.stringify(attendanceList));

  const dateObj = new Date(nowIso);
  const timeStr = `${dateObj.getHours().toString().padStart(2, '0')}:${dateObj
    .getMinutes()
    .toString()
    .padStart(2, '0')}:${dateObj.getSeconds().toString().padStart(2, '0')} ngày ${dateObj.toLocaleDateString('vi-VN')}`;

  return {
    success: true,
    alreadyAttended: false,
    attendedAt: nowIso,
    formattedTime: timeStr,
    registration: matchedReg,
    workshop,
    message: 'Điểm danh thành công! Trạng thái của bạn đã được cập nhật thành Đã tham dự.',
  };
}
