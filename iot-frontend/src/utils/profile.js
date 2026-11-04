// Thông tin trang Profile — cập nhật các placeholder trước khi nộp bài
export const PROFILE = {
  fullName: 'Hoàng Mạnh Hiệp',
  studentId: 'B23DCCN292',
  className: 'IoT và ứng dụng',
  topic: 'Hệ thống giám sát môi trường & điều khiển đèn ESP8266',
  avatarUrl: '/avatar.jpg'
}

export const DELIVERABLES = [
  { icon: '🗂️', title: 'GitHub Repository', text: 'github/....', url: '' },
  {
    icon: '🎨',
    title: 'Figma UI/UX',
    text: 'figma.com/design/ZMBZDNyG6Ddktflemuibn2',
    url: 'https://www.figma.com/design/ZMBZDNyG6Ddktflemuibn2'
  },
  {
    icon: '📮',
    title: 'Postman API Documentation',
    text: 'IoT_Monitor.postman_collection.json (16 request — import vào Postman)',
    // file nằm ở iot-frontend/public/postman, bản gốc ở iot-backend/postman
    url: '/postman/IoT_Monitor.postman_collection.json'
  },
  { icon: '📄', title: 'PDF Project Report', text: '(đính kèm khi nộp báo cáo)', url: '' }
]
