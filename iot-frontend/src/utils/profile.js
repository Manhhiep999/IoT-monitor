// Thông tin trang Profile — cập nhật các placeholder trước khi nộp bài
export const PROFILE = {
  fullName: 'Hoàng Mạnh Hiệp',
  studentId: 'B23DCCN292',
  className: 'IoT và ứng dụng',
  topic: 'Hệ thống giám sát môi trường & điều khiển đèn ESP32',
  avatarUrl: '/avatar.jpg'
}

export const DELIVERABLES = [
  {
    icon: '🗂️',
    title: 'GitHub Repository',
    text: 'github.com/Manhhiep999/IoT-monitor',
    url: 'https://github.com/Manhhiep999/IoT-monitor'
  },
  {
    icon: '🎨',
    title: 'Figma UI/UX',
    text: 'IoT Monitor ESP32 — giao diện 5 màn hình (Figma)',
    url: 'https://www.figma.com/design/ufDP7Iim4cvtFkWa1jmYy6/IoT-Monitor-ESP32---B23DCCN292'
  },
  {
    icon: '📮',
    title: 'Postman API Documentation',
    text: 'IoT Monitor ESP32 — 16 request (Postman workspace)',
    // bản JSON để import vẫn có ở iot-backend/postman
    url: "https://manhhiep999-1463843.postman.co/workspace/manhhiep's-Workspace~dd448ac3-50a9-40e7-877a-098dfcca75d0/collection/51925456-f6f78f3f-c13f-4309-b75e-280e751784fa?action=share&source=copy-link&creator=51925456"
  },
  {
    icon: '📄',
    title: 'PDF Project Report',
    text: 'BAO_CAO_IOT_B23DCCN292.pdf — báo cáo đồ án (62 trang)',
    // bản sao của D:/IoT/BAO_CAO_IOT_v4.pdf, phục vụ tĩnh từ public/
    url: '/BAO_CAO_IOT_B23DCCN292.pdf'
  }
]
