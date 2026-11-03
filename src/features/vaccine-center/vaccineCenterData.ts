export interface CenterInfo {
  code: string;
  address: string;
  leader: string;
  openingDate: string;
  asm: string;
}

export interface HandoverPartyInfo {
  delivererName: string;
  delivererPhone: string;
  delivererDept: string;
  receiverDept: string;
  receiverName: string;
  receiverPhone: string;
  handoverNote: string;
  handoverDate?: string;
}

export interface CsvcHandoverRow {
  id: string;
  name: string;
  qty: number | string;
  unit: string;
  note: string;
}

export const DEFAULT_CSVC_SIGNAGE_ROWS: CsvcHandoverRow[] = [
  { id: 'sig_1', name: 'A1_Bang thong tin TTTC', qty: 2, unit: 'Cai', note: '' },
  { id: 'sig_2', name: 'Bang gia niem yet vac xin', qty: 2, unit: 'Cai', note: '' },
  { id: 'sig_3', name: 'Bang huong dan quy trinh tiem chung', qty: 2, unit: 'Cai', note: '' },
  { id: 'sig_4', name: 'Bang noi quy trung tam tiem chung', qty: 1, unit: 'Cai', note: '' },
  { id: 'sig_5', name: 'Bang phac do cap cuu soc phan ve', qty: 2, unit: 'Cai', note: '' },
  { id: 'sig_6', name: 'Bang theo doi nhiet do tu lanh', qty: 2, unit: 'Cai', note: '' },
  { id: 'sig_7', name: 'Bang ten phong kham sang loc', qty: 2, unit: 'Cai', note: '' },
  { id: 'sig_8', name: 'Bang ten phong tiem chung', qty: 2, unit: 'Cai', note: '' },
  { id: 'sig_9', name: 'Bang ten khu vuc theo doi sau tiem', qty: 1, unit: 'Cai', note: '' },
  { id: 'sig_10', name: 'Bang ten phong cho me va be', qty: 1, unit: 'Cai', note: '' },
  { id: 'sig_11', name: 'Bang chi dan nha ve sinh (WC)', qty: 2, unit: 'Cai', note: '' },
  { id: 'sig_12', name: 'Bang phan loai chat thai y te', qty: 4, unit: 'Cai', note: '' },
  { id: 'sig_13', name: 'Quy trinh rua tay thuong quy', qty: 3, unit: 'Cai', note: '' },
  { id: 'sig_14', name: 'Hotline cap cuu', qty: 1, unit: 'Cai', note: '' },
  { id: 'sig_15', name: 'Luu y (ba me cho con bu)', qty: 1, unit: 'Cai', note: '' },
  { id: 'sig_16', name: 'Khu vuc luu tru rac y te', qty: 1, unit: 'Cai', note: '' },
  { id: 'sig_17', name: 'Cam quay phim chup hinh', qty: 4, unit: 'Cai', note: '' },
];

export const DEFAULT_CSVC_TECH_ROWS: CsvcHandoverRow[] = [
  { id: 'tech_1', name: 'Camera Hikvision (Trong nha)', qty: 12, unit: 'Cai', note: '' },
  { id: 'tech_2', name: 'Camera quan sat (Ngoai troi)', qty: 7, unit: 'Cai', note: '' },
  { id: 'tech_3', name: 'Camera Hikvision (Thu ngan)', qty: 1, unit: 'Cai', note: '' },
  { id: 'tech_4', name: 'Ghi am ReSpeaker', qty: 0, unit: 'Cai', note: '' },
  { id: 'tech_5', name: 'May tinh xach tay', qty: 2, unit: 'Cai', note: '' },
  { id: 'tech_6', name: 'May tinh de ban', qty: 6, unit: 'Bo', note: '' },
  { id: 'tech_7', name: 'Ban phim Rapoo', qty: 6, unit: 'Cai', note: '' },
  { id: 'tech_8', name: 'Chuot Rapoo', qty: 8, unit: 'Cai', note: '' },
  { id: 'tech_9', name: 'May in Barcode', qty: 1, unit: 'Cai', note: '' },
  { id: 'tech_10', name: 'May in Bill (Epson)', qty: 1, unit: 'Cai', note: '' },
  { id: 'tech_11', name: 'May in Canon', qty: 4, unit: 'Cai', note: '' },
];

export const DEFAULT_INJECTION_ROOM_ROWS: CsvcHandoverRow[] = [
  { id: 'inj_1', name: 'Tủ lạnh chuyên dụng bảo quản vắc xin Haier', qty: 2, unit: 'Cái', note: '' },
  { id: 'inj_2', name: 'Nhiệt kế tự ghi LogTag kèm đầu dò', qty: 4, unit: 'Bộ', note: '' },
  { id: 'inj_3', name: 'Hòm lạnh bảo quản vắc xin di động', qty: 4, unit: 'Cái', note: '' },
  { id: 'inj_4', name: 'Xe tiêm inox 3 tầng có bánh xe', qty: 3, unit: 'Cái', note: '' },
  { id: 'inj_5', name: 'Giường khám & tiêm chủng nệm y tế', qty: 4, unit: 'Cái', note: '' },
  { id: 'inj_6', name: 'Tủ thuốc cấp cứu phản vệ inox', qty: 2, unit: 'Cái', note: '' },
  { id: 'inj_7', name: 'Bình oxy y tế 10L kèm đồng hồ thở', qty: 2, unit: 'Bộ', note: '' },
  { id: 'inj_8', name: 'Máy đo huyết áp tự động Omron', qty: 3, unit: 'Cái', note: '' },
  { id: 'inj_9', name: 'Nhiệt kế hồng ngoại đo trán Microlife', qty: 4, unit: 'Cái', note: '' },
  { id: 'inj_10', name: 'Cân điện tử đo chiều cao cân nặng', qty: 2, unit: 'Cái', note: '' },
];

export type EquipmentCategoryTab = 'admin' | 'medicine';
export type HandoverSubTab = 'equipment' | 'medicine' | 'injection_room' | 'csvc';

export interface EquipmentItem {
  id: string;
  stt: number;
  handler: string;
  type: string;
  name: string;
  unit: string;
  requiredQty: number;
  actualQty: number | null;
  note: string;
  tab: EquipmentCategoryTab;
  handoverGroup: HandoverSubTab;
}

export interface ChecklistItem {
  id: string;
  area: string;
  title: string;
  standard: string;
  completed: boolean;
  verifier: string;
  note: string;
}

export interface TaskforceJobItem {
  id: string;
  phase: string;
  title: string;
  assignee: string;
  dueDate: string;
  priority: 'Cao' | 'Trung bình' | 'Thấp';
  completed: boolean;
  note: string;
}

export interface FridgeValidationLog {
  id: string;
  fridgeCode: string;
  model: string;
  sensorSerial: string;
  stepName: string;
  targetTemp: string;
  measuredTemp: string;
  alarmStatus: 'Đạt' | 'Chưa đạt';
  checkedAt: string;
  inspector: string;
  note: string;
}

export interface ReportPhotoItem {
  id: string;
  category: string;
  title: string;
  imageUrl: string;
  capturedAt: string;
  uploader: string;
  note: string;
}

export const DEFAULT_CENTER_INFO: CenterInfo = {
  code: '58267',
  address: '32-34 Trần Quý Cáp, P. Ninh Hòa',
  leader: 'Nguyễn Lê Đạt Minh',
  openingDate: '30/10/2026',
  asm: 'Trần Gia Thái',
};

export const DEFAULT_HANDOVER_PARTY: HandoverPartyInfo = {
  delivererName: 'Nguyễn Lê Đạt Minh',
  delivererPhone: '0775026207',
  delivererDept: 'Taskforce Vacxin Long Châu',
  receiverDept: 'Bác sĩ',
  receiverName: 'Nguyễn Văn Bách',
  receiverPhone: '0933098202',
  handoverNote: 'Bàn giao trang thiết bị lần đầu do Taskforce nhận tại shop mới Trung tâm tiêm chủng Long Châu',
};

// Base realistic administrative, injection room, and CSVC items to generate exactly 205 items
// with 199 "Đủ", 2 "Dư", 4 "Thiếu", 0 "Chưa nhập" matching the user's screenshot
const BASE_ADMIN_CATALOG: Array<{
  handler: string;
  type: string;
  name: string;
  unit: string;
  requiredQty: number;
  group: HandoverSubTab;
}> = [
  // Thiết bị phòng tiêm (Injection room equipment)
  { handler: 'Taskforce', type: 'Thiết bị phòng tiêm', name: 'Tủ lạnh chuyên dụng bảo quản vắc xin Haier HBC-260', unit: 'Cái', requiredQty: 2, group: 'injection_room' },
  { handler: 'Taskforce', type: 'Thiết bị phòng tiêm', name: 'Nhiệt kế tự ghi LogTag UTRED30-WiFi kèm đầu dò', unit: 'Bộ', requiredQty: 4, group: 'injection_room' },
  { handler: 'Taskforce', type: 'Thiết bị phòng tiêm', name: 'Hòm lạnh bảo quản vắc xin di động 12L', unit: 'Cái', requiredQty: 4, group: 'injection_room' },
  { handler: 'Taskforce', type: 'Thiết bị phòng tiêm', name: 'Bình tích lạnh (Ice pack) tiêu chuẩn GSP 0.4L', unit: 'Cái', requiredQty: 32, group: 'injection_room' },
  { handler: 'Taskforce', type: 'Thiết bị phòng tiêm', name: 'Xe tiêm inox 3 tầng có bánh xe khóa hãm', unit: 'Cái', requiredQty: 3, group: 'injection_room' },
  { handler: 'Taskforce', type: 'Thiết bị phòng tiêm', name: 'Giường khám & tiêm chủng nệm da y tế', unit: 'Cái', requiredQty: 4, group: 'injection_room' },
  { handler: 'Taskforce', type: 'Thiết bị phòng tiêm', name: 'Tủ thuốc cấp cứu phản vệ inox 2 cánh kính', unit: 'Cái', requiredQty: 2, group: 'injection_room' },
  { handler: 'Taskforce', type: 'Thiết bị phòng tiêm', name: 'Bình oxy y tế 10 lít kèm đồng hồ thở & mặt nạ', unit: 'Bộ', requiredQty: 2, group: 'injection_room' },
  { handler: 'Taskforce', type: 'Thiết bị phòng tiêm', name: 'Bóng Ambu bóp tay người lớn & trẻ em silicon', unit: 'Bộ', requiredQty: 2, group: 'injection_room' },
  { handler: 'Taskforce', type: 'Thiết bị phòng tiêm', name: 'Máy hút dịch đờm dãi y tế 2 bình Yuwell', unit: 'Cái', requiredQty: 1, group: 'injection_room' },
  { handler: 'Bác sĩ', type: 'Thiết bị phòng tiêm', name: 'Máy đo huyết áp bắp tay tự động Omron HEM-7156', unit: 'Cái', requiredQty: 3, group: 'injection_room' },
  { handler: 'Bác sĩ', type: 'Thiết bị phòng tiêm', name: 'Huyết áp kế cơ kèm ống nghe Littmann trẻ em & người lớn', unit: 'Bộ', requiredQty: 2, group: 'injection_room' },
  { handler: 'Bác sĩ', type: 'Thiết bị phòng tiêm', name: 'Nhiệt kế hồng ngoại đo trán Microlife FR1MF1', unit: 'Cái', requiredQty: 4, group: 'injection_room' },
  { handler: 'Bác sĩ', type: 'Thiết bị phòng tiêm', name: 'Máy đo nồng độ oxy máu SpO2 kẹp ngón tay', unit: 'Cái', requiredQty: 3, group: 'injection_room' },
  { handler: 'Bác sĩ', type: 'Thiết bị phòng tiêm', name: 'Cân điện tử đo chiều cao cân nặng trẻ sơ sinh & người lớn', unit: 'Cái', requiredQty: 2, group: 'injection_room' },
  { handler: 'Điều dưỡng', type: 'Thiết bị phòng tiêm', name: 'Khay quả đậu inox 304 cỡ trung', unit: 'Cái', requiredQty: 10, group: 'injection_room' },
  { handler: 'Điều dưỡng', type: 'Thiết bị phòng tiêm', name: 'Hộp inox đựng bông cồn có nắp đậy 8x8cm', unit: 'Cái', requiredQty: 8, group: 'injection_room' },
  { handler: 'Điều dưỡng', type: 'Thiết bị phòng tiêm', name: 'Panh kẹp y tế inox không mấu 18cm', unit: 'Cái', requiredQty: 8, group: 'injection_room' },
  { handler: 'Điều dưỡng', type: 'Thiết bị phòng tiêm', name: 'Kéo y tế đầu tù inox 16cm', unit: 'Cái', requiredQty: 6, group: 'injection_room' },
  { handler: 'Điều dưỡng', type: 'Thiết bị phòng tiêm', name: 'Hộp an toàn đựng bơm kim tiêm sắc nhọn 5L', unit: 'Hộp', requiredQty: 25, group: 'injection_room' },
  { handler: 'Điều dưỡng', type: 'Thiết bị phòng tiêm', name: 'Thùng rác y tế đạp chân 20L màu vàng (Lây nhiễm)', unit: 'Cái', requiredQty: 8, group: 'injection_room' },
  { handler: 'Điều dưỡng', type: 'Thiết bị phòng tiêm', name: 'Thùng rác y tế đạp chân 20L màu xanh (Sinh hoạt)', unit: 'Cái', requiredQty: 10, group: 'injection_room' },
  { handler: 'Điều dưỡng', type: 'Thiết bị phòng tiêm', name: 'Thùng rác y tế đạp chân 20L màu trắng (Tái chế)', unit: 'Cái', requiredQty: 6, group: 'injection_room' },
  { handler: 'Điều dưỡng', type: 'Thiết bị phòng tiêm', name: 'Thùng rác y tế đạp chân 20L màu đen (Nguy hại)', unit: 'Cái', requiredQty: 4, group: 'injection_room' },
  { handler: 'Điều dưỡng', type: 'Thiết bị phòng tiêm', name: 'Garô cao su y tế cầm máu tự khóa', unit: 'Cái', requiredQty: 6, group: 'injection_room' },
  { handler: 'Điều dưỡng', type: 'Thiết bị phòng tiêm', name: 'Đèn gù khám bệnh LED cổ ngỗng có bánh xe', unit: 'Cái', requiredQty: 2, group: 'injection_room' },
  { handler: 'Điều dưỡng', type: 'Thiết bị phòng tiêm', name: 'Đèn pin khám họng y tế ánh sáng vàng', unit: 'Cái', requiredQty: 4, group: 'injection_room' },
  { handler: 'Điều dưỡng', type: 'Thiết bị phòng tiêm', name: 'Đồng hồ bấm giờ đếm ngược theo dõi phản vệ', unit: 'Cái', requiredQty: 4, group: 'injection_room' },
  { handler: 'Điều dưỡng', type: 'Thiết bị phòng tiêm', name: 'Giá treo truyền dịch inox 2 móc điều chỉnh độ cao', unit: 'Cái', requiredQty: 3, group: 'injection_room' },
  { handler: 'Điều dưỡng', type: 'Thiết bị phòng tiêm', name: 'Băng ca cứu thương gấp gọn hợp kim nhôm', unit: 'Cái', requiredQty: 1, group: 'injection_room' },

  // CSVC (Facility & Furniture)
  { handler: 'Taskforce', type: 'CSVC', name: 'Quầy lễ tân & thu ngân tiêu chuẩn TTTC Long Châu', unit: 'Bộ', requiredQty: 1, group: 'csvc' },
  { handler: 'Taskforce', type: 'CSVC', name: 'Bàn làm việc bác sĩ khám sàng lọc 1m2 kèm hộc tủ', unit: 'Bộ', requiredQty: 3, group: 'csvc' },
  { handler: 'Taskforce', type: 'CSVC', name: 'Ghế xoay văn phòng lưng lưới cho Bác sĩ / Điều dưỡng', unit: 'Cái', requiredQty: 10, group: 'csvc' },
  { handler: 'Taskforce', type: 'CSVC', name: 'Ghế chân quỳ cho khách hàng tại phòng khám & phòng tiêm', unit: 'Cái', requiredQty: 12, group: 'csvc' },
  { handler: 'Taskforce', type: 'CSVC', name: 'Băng ghế chờ inox 4 chỗ có đệm bọc da khu sảnh & sau tiêm', unit: 'Băng', requiredQty: 8, group: 'csvc' },
  { handler: 'Taskforce', type: 'CSVC', name: 'Khu vui chơi trẻ em (Cầu trượt, thảm xốp EVA, thú nhún)', unit: 'Bộ', requiredQty: 1, group: 'csvc' },
  { handler: 'Taskforce', type: 'CSVC', name: 'Bàn thay tã & ghế cho bé bú khu vực mẹ và bé', unit: 'Bộ', requiredQty: 2, group: 'csvc' },
  { handler: 'Taskforce', type: 'CSVC', name: 'Tủ locker sắt 12 ngăn đựng đồ nhân viên & khách hàng', unit: 'Cái', requiredQty: 2, group: 'csvc' },
  { handler: 'Taskforce', type: 'CSVC', name: 'Tủ hồ sơ sắt 2 cánh kính lưu trữ phiếu khám sàng lọc', unit: 'Cái', requiredQty: 2, group: 'csvc' },
  { handler: 'Taskforce', type: 'CSVC', name: 'Kệ sắt V lỗ 5 tầng kho vật tư hành chính & tiêu hao', unit: 'Bộ', requiredQty: 4, group: 'csvc' },
  { handler: 'Taskforce', type: 'CSVC', name: 'Máy lạnh Inverter 2.0 HP Daikin/Panasonic các phòng chức năng', unit: 'Bộ', requiredQty: 6, group: 'csvc' },
  { handler: 'Taskforce', type: 'CSVC', name: 'Quạt chắn gió điều hòa (Air Curtain) cửa chính 1m2', unit: 'Cái', requiredQty: 2, group: 'csvc' },
  { handler: 'Taskforce', type: 'CSVC', name: 'Cây nước nóng lạnh Toshiba kèm bình úp 20L', unit: 'Cái', requiredQty: 2, group: 'csvc' },
  { handler: 'Taskforce', type: 'CSVC', name: 'Máy phát điện dự phòng 10kVA kèm tủ ATS tự động chuyển nguồn', unit: 'Bộ', requiredQty: 1, group: 'csvc' },
  { handler: 'Taskforce', type: 'CSVC', name: 'Bộ lưu điện UPS Santak 3kVA chuyên dụng cho tủ vắc xin', unit: 'Bộ', requiredQty: 2, group: 'csvc' },
  { handler: 'Taskforce', type: 'CSVC', name: 'Bình chữa cháy bột ABC MFZ4 4kg & bình khí CO2 MT3', unit: 'Bình', requiredQty: 6, group: 'csvc' },
  { handler: 'Taskforce', type: 'CSVC', name: 'Bộ tiêu lệnh PCCC, đèn sự cố & đèn Exit thoát hiểm', unit: 'Bộ', requiredQty: 4, group: 'csvc' },
  { handler: 'Taskforce', type: 'CSVC', name: 'Bảng tên các phòng chức năng Mica (Khám, Tiêm, Sau tiêm, Kho)', unit: 'Bộ', requiredQty: 12, group: 'csvc' },
  { handler: 'Taskforce', type: 'CSVC', name: 'Bảng phác đồ xử trí phản vệ Bộ Y Tế khổ A1 đóng khung', unit: 'Bảng', requiredQty: 4, group: 'csvc' },
  { handler: 'Taskforce', type: 'CSVC', name: 'Rèm y tế kháng khuẩn ngăn giường phòng tiêm & cấp cứu', unit: 'Bộ', requiredQty: 4, group: 'csvc' },

  // Thiết bị CNTT & Hành chính (Equipment & Admin)
  { handler: 'IT', type: 'Thiết bị CNTT', name: 'Bộ máy tính bàn PC Dell Vostro + Màn hình 21.5 inch', unit: 'Bộ', requiredQty: 6, group: 'equipment' },
  { handler: 'IT', type: 'Thiết bị CNTT', name: 'Máy in laser trắng đen Canon LBP 2900 / HP 107w', unit: 'Cái', requiredQty: 4, group: 'equipment' },
  { handler: 'IT', type: 'Thiết bị CNTT', name: 'Máy in hóa đơn nhiệt Epson TM-T82III cổng LAN/USB', unit: 'Cái', requiredQty: 2, group: 'equipment' },
  { handler: 'IT', type: 'Thiết bị CNTT', name: 'Máy in tem nhãn mã vạch Zebra ZD230 cho ống vắc xin', unit: 'Cái', requiredQty: 2, group: 'equipment' },
  { handler: 'IT', type: 'Thiết bị CNTT', name: 'Máy quét mã vạch 2D Honeywell đọc QR CCCD & sổ tiêm', unit: 'Cái', requiredQty: 5, group: 'equipment' },
  { handler: 'IT', type: 'Thiết bị CNTT', name: 'Màn hình Smart TV Samsung 55 inch hiển thị gọi số thứ tự', unit: 'Cái', requiredQty: 2, group: 'equipment' },
  { handler: 'IT', type: 'Thiết bị CNTT', name: 'Hệ thống loa âm ly & micro cổ ngỗng gọi tên khách hàng', unit: 'Bộ', requiredQty: 3, group: 'equipment' },
  { handler: 'IT', type: 'Thiết bị CNTT', name: 'Máy lấy số thứ tự cảm ứng kèm máy in phiếu tự động', unit: 'Bộ', requiredQty: 1, group: 'equipment' },
  { handler: 'IT', type: 'Thiết bị CNTT', name: 'Máy POS quẹt thẻ ngân hàng & khung QR PayOS để bàn', unit: 'Bộ', requiredQty: 2, group: 'equipment' },
  { handler: 'IT', type: 'Thiết bị CNTT', name: 'Điện thoại bàn IP Phone + Smartphone hotline trung tâm', unit: 'Bộ', requiredQty: 2, group: 'equipment' },
  { handler: 'Taskforce', type: 'Hành chính', name: 'Sổ tiêm chủng cá nhân Long Châu in màu bìa cứng', unit: 'Cuốn', requiredQty: 500, group: 'equipment' },
  { handler: 'Taskforce', type: 'Hành chính', name: 'Phiếu khám sàng lọc trước tiêm chủng trẻ em & người lớn', unit: 'Xấp', requiredQty: 20, group: 'equipment' },
  { handler: 'Taskforce', type: 'Hành chính', name: 'Giấy in nhiệt K80x45mm dùng cho máy in bill & số thứ tự', unit: 'Cuộn', requiredQty: 50, group: 'equipment' },
  { handler: 'Taskforce', type: 'Hành chính', name: 'Giấy in A4 Double A 80gsm dùng cho phòng khám & hành chính', unit: 'Ream', requiredQty: 15, group: 'equipment' },
  { handler: 'Taskforce', type: 'Hành chính', name: 'Con dấu tên trung tâm, dấu Đã Thu Tiền, dấu Bác sĩ', unit: 'Cái', requiredQty: 6, group: 'equipment' },
];

export function generateDefaultEquipmentList(): EquipmentItem[] {
  const items: EquipmentItem[] = [];

  // 1. Generate 205 items in 'admin' tab
  for (let i = 1; i <= 205; i++) {
    const template = BASE_ADMIN_CATALOG[(i - 1) % BASE_ADMIN_CATALOG.length];
    const batchNum = Math.floor((i - 1) / BASE_ADMIN_CATALOG.length) + 1;
    const suffix = batchNum > 1 ? ` (Khu vực ${batchNum})` : '';
    const reqQty = template.requiredQty;

    // Make 4 items "Thiếu", 2 items "Dư", and 199 items "Đủ" (Total = 205, matching screenshot KPI 205 / 0 / 199 Đủ - Dư 2 / 4 Thiếu)
    let actualQty: number | null = reqQty;
    let note = '';
    if (i === 4 || i === 12 || i === 28 || i === 45) {
      actualQty = Math.max(0, reqQty - 1);
      note = 'Đang chờ kho tổng giao bổ sung đợt 2';
    } else if (i === 8 || i === 19) {
      actualQty = reqQty + 1;
      note = 'Kho cấp dư dự phòng khai trương';
    }

    items.push({
      id: `adm_${i}`,
      stt: i,
      handler: template.handler,
      type: template.type,
      name: `${template.name}${suffix}`,
      unit: template.unit,
      requiredQty: reqQty,
      actualQty,
      note,
      tab: 'admin',
      handoverGroup: template.group,
    });
  }

  // 2. Generate 55 items in 'medicine' tab (Danh mục thuốc & Vật tư y tế cấp cứu)
  const MEDICINE_CATALOG: Array<{
    handler: string;
    type: string;
    name: string;
    unit: string;
    requiredQty: number;
  }> = [
    { handler: 'Dược sĩ', type: 'Thuốc cấp cứu', name: 'Adrenalin 1mg/1ml (Ống tiêm xử trí phản vệ đầu tay)', unit: 'Ống', requiredQty: 20 },
    { handler: 'Dược sĩ', type: 'Thuốc cấp cứu', name: 'Methylprednisolon 40mg (Lọ bột pha tiêm tĩnh mạch)', unit: 'Lọ', requiredQty: 10 },
    { handler: 'Dược sĩ', type: 'Thuốc cấp cứu', name: 'Diphenhydramin 10mg/1ml (Ống tiêm kháng Histamin)', unit: 'Ống', requiredQty: 15 },
    { handler: 'Dược sĩ', type: 'Thuốc cấp cứu', name: 'Salbutamol 2.5mg/2.5ml (Ống khí dung giãn phế quản)', unit: 'Ống', requiredQty: 20 },
    { handler: 'Dược sĩ', type: 'Thuốc cấp cứu', name: 'Salbutamol 100mcg/liều (Bình xịt định liều Ventolin)', unit: 'Bình', requiredQty: 2 },
    { handler: 'Dược sĩ', type: 'Thuốc cấp cứu', name: 'Dịch truyền Natri Clorid 0.9% 500ml (Chai nhựa mềm)', unit: 'Chai', requiredQty: 20 },
    { handler: 'Dược sĩ', type: 'Thuốc cấp cứu', name: 'Dịch truyền Ringer Lactate 500ml', unit: 'Chai', requiredQty: 10 },
    { handler: 'Dược sĩ', type: 'Thuốc cấp cứu', name: 'Dịch truyền Glucose 5% 500ml', unit: 'Chai', requiredQty: 10 },
    { handler: 'Dược sĩ', type: 'Thuốc cấp cứu', name: 'Nước cất pha tiêm 5ml tiệt trùng', unit: 'Ống', requiredQty: 50 },
    { handler: 'Dược sĩ', type: 'Thuốc cấp cứu', name: 'Paracetamol 150mg gói bột sủi hạ sốt trẻ em', unit: 'Gói', requiredQty: 30 },
    { handler: 'Dược sĩ', type: 'Thuốc cấp cứu', name: 'Paracetamol 250mg gói bột sủi hạ sốt trẻ em', unit: 'Gói', requiredQty: 30 },
    { handler: 'Dược sĩ', type: 'Thuốc cấp cứu', name: 'Paracetamol 500mg viên nén hạ sốt người lớn', unit: 'Viên', requiredQty: 50 },
    { handler: 'Dược sĩ', type: 'Thuốc cấp cứu', name: 'Viên đặt hậu môn hạ sốt Efferalgan 80mg / 150mg', unit: 'Viên', requiredQty: 20 },
    { handler: 'Điều dưỡng', type: 'Vật tư tiêu hao', name: 'Bơm kim tiêm tự khóa 0.5ml chuyên dụng tiêm vắc xin', unit: 'Cái', requiredQty: 500 },
    { handler: 'Điều dưỡng', type: 'Vật tư tiêu hao', name: 'Bơm kim tiêm nhựa 1ml (Kim 26G) dùng lấy thuốc & tiêm', unit: 'Cái', requiredQty: 300 },
    { handler: 'Điều dưỡng', type: 'Vật tư tiêu hao', name: 'Bơm kim tiêm nhựa 3ml (Kim 23G/25G) Vinahankook', unit: 'Cái', requiredQty: 300 },
    { handler: 'Điều dưỡng', type: 'Vật tư tiêu hao', name: 'Bơm kim tiêm nhựa 5ml & 10ml pha hồi chỉnh', unit: 'Cái', requiredQty: 200 },
    { handler: 'Điều dưỡng', type: 'Vật tư tiêu hao', name: 'Kim lấy thuốc 18G vô trùng', unit: 'Hộp', requiredQty: 5 },
    { handler: 'Điều dưỡng', type: 'Vật tư tiêu hao', name: 'Kim luồn tĩnh mạch (Catheter) số 22G, 24G, 26G', unit: 'Cái', requiredQty: 30 },
    { handler: 'Điều dưỡng', type: 'Vật tư tiêu hao', name: 'Dây truyền dịch vô trùng có khóa điều chỉnh giọt', unit: 'Bộ', requiredQty: 20 },
    { handler: 'Điều dưỡng', type: 'Vật tư tiêu hao', name: 'Dây thở oxy 2 nhánh người lớn & trẻ em', unit: 'Bộ', requiredQty: 10 },
    { handler: 'Điều dưỡng', type: 'Vật tư tiêu hao', name: 'Mặt nạ thở oxy có túi dự trữ người lớn & nhi khoa', unit: 'Cái', requiredQty: 6 },
    { handler: 'Điều dưỡng', type: 'Vật tư tiêu hao', name: 'Bông viên y tế tiệt trùng 0.5g gói 100g', unit: 'Gói', requiredQty: 30 },
    { handler: 'Điều dưỡng', type: 'Vật tư tiêu hao', name: 'Cồn y tế 70 độ sát khuẩn da chai 500ml', unit: 'Chai', requiredQty: 24 },
    { handler: 'Điều dưỡng', type: 'Vật tư tiêu hao', name: 'Dung dịch sát khuẩn tay nhanh Aniosgel 85 NPC 500ml', unit: 'Chai', requiredQty: 20 },
    { handler: 'Điều dưỡng', type: 'Vật tư tiêu hao', name: 'Băng cá nhân Urgo tròn dán vết tiêm họa tiết trẻ em', unit: 'Hộp', requiredQty: 20 },
    { handler: 'Điều dưỡng', type: 'Vật tư tiêu hao', name: 'Băng keo lụa y tế Ugopore 1.25cm x 5m', unit: 'Cuộn', requiredQty: 24 },
    { handler: 'Điều dưỡng', type: 'Vật tư tiêu hao', name: 'Găng tay y tế không bột Nitrile (Size S, M)', unit: 'Hộp', requiredQty: 20 },
  ];

  for (let i = 1; i <= 55; i++) {
    const template = MEDICINE_CATALOG[(i - 1) % MEDICINE_CATALOG.length];
    const batchNum = Math.floor((i - 1) / MEDICINE_CATALOG.length) + 1;
    const suffix = batchNum > 1 ? ` - Lô chuẩn bị #${batchNum}` : '';
    items.push({
      id: `med_${i}`,
      stt: i,
      handler: template.handler,
      type: template.type,
      name: `${template.name}${suffix}`,
      unit: template.unit,
      requiredQty: template.requiredQty,
      actualQty: template.requiredQty,
      note: 'Đạt chuẩn GSP / Hạn dùng > 24 tháng',
      tab: 'medicine',
      handoverGroup: 'medicine',
    });
  }

  return items;
}

export const DEFAULT_CHECKLIST_ITEMS: ChecklistItem[] = [
  {
    id: 'chk_1',
    area: '1. Mặt tiền & Biển bảng POSM',
    title: 'Bảng hiệu chính Trung Tâm Tiêm Chủng Long Châu, đèn LED mặt tiền và hộp đèn vẫy hoạt động 100%',
    standard: 'Đúng thiết kế nhận diện thương hiệu, sáng đều không chập chờn',
    completed: true,
    verifier: 'Nguyễn Lê Đạt Minh',
    note: 'Đã nghiệm thu cùng nhà thầu quảng cáo',
  },
  {
    id: 'chk_2',
    area: '1. Mặt tiền & Biển bảng POSM',
    title: 'Standee, băng rôn khai trương, bảng giá niêm yết vắc xin tại sảnh tiếp đón',
    standard: 'Đặt đúng vị trí quy định, thông tin giá khớp hệ thống',
    completed: true,
    verifier: 'Nguyễn Lê Đạt Minh',
    note: 'Hoàn tất 100%',
  },
  {
    id: 'chk_3',
    area: '2. Quầy Lễ Tân & Sảnh Tiếp Đón',
    title: 'Máy lấy số thứ tự, màn hình TV gọi số, máy quét QR CCCD và máy in bill hoạt động ổn định',
    standard: 'Kết nối mạng LAN/WiFi thông suốt, in thử phiếu rõ nét',
    completed: true,
    verifier: 'Nguyễn Lê Đạt Minh',
    note: 'IT đã cấu hình đồng bộ',
  },
  {
    id: 'chk_4',
    area: '2. Quầy Lễ Tân & Sảnh Tiếp Đón',
    title: 'Khu vui chơi trẻ em, phòng cho bé bú & thay tã được vệ sinh khử khuẩn sạch sẽ',
    standard: 'Thảm xốp phẳng, đầy đủ nước rửa tay & khăn giấy',
    completed: true,
    verifier: 'Nguyễn Lê Đạt Minh',
    note: 'Đạt chuẩn an toàn nhi khoa',
  },
  {
    id: 'chk_5',
    area: '3. Phòng Khám Sàng Lọc',
    title: 'Bàn khám bác sĩ, máy đo huyết áp, nhiệt kế hồng ngoại, ống nghe, cân đo chiều cao cân nặng',
    standard: 'Thiết bị đã dán tem hiệu chuẩn, hoạt động chính xác',
    completed: true,
    verifier: 'Nguyễn Văn Bách',
    note: 'Bác sĩ trưởng đã kiểm tra',
  },
  {
    id: 'chk_6',
    area: '4. Phòng Tiêm Chủng & Cấp Cứu',
    title: 'Tủ lạnh vắc xin đạt 2°C - 8°C liên tục 48h, thiết bị LogTag cảnh báo nhiệt độ hoạt động tốt',
    standard: 'Đạt chuẩn GSP Bộ Y Tế, có UPS dự phòng & máy phát điện',
    completed: true,
    verifier: 'Nguyễn Lê Đạt Minh',
    note: 'Biên bản thẩm định tủ đạt 100%',
  },
  {
    id: 'chk_7',
    area: '4. Phòng Tiêm Chủng & Cấp Cứu',
    title: 'Hộp thuốc cấp cứu chống sốc phản vệ, bình Oxy y tế, bóng Ambu, máy hút đờm sẵn sàng tại chỗ',
    standard: 'Đầy đủ cơ số Adrenalin theo Thông tư 51/2017/TT-BYT',
    completed: true,
    verifier: 'Nguyễn Văn Bách',
    note: 'Niêm phong & treo bảng phác đồ phản vệ',
  },
  {
    id: 'chk_8',
    area: '5. Khu Vực Theo Dõi Sau Tiêm 30 Phút',
    title: 'Đầy đủ ghế ngồi chờ, đồng hồ đếm thời gian, bảng hướng dẫn theo dõi dấu hiệu sau tiêm',
    standard: 'Camera quan sát góc rộng & điều dưỡng trực theo dõi',
    completed: true,
    verifier: 'Nguyễn Lê Đạt Minh',
    note: 'Đạt chuẩn',
  },
  {
    id: 'chk_9',
    area: '6. Pháp Lý, PCCC & Vệ Sinh Môi Trường',
    title: 'Hồ sơ công bố đủ điều kiện tiêm chủng, hợp đồng thu gom rác thải y tế nguy hại, bình PCCC',
    standard: 'Đủ hồ sơ pháp lý bản cứng tại trung tâm phục vụ đoàn thẩm định Sở Y Tế',
    completed: true,
    verifier: 'Trần Gia Thái',
    note: 'ASM đã phê duyệt',
  },
];

export const DEFAULT_TASKFORCE_JOBS: TaskforceJobItem[] = [
  {
    id: 'job_1',
    phase: 'Giai đoạn 1: Nhận mặt bằng & Hạ tầng (T-7)',
    title: 'Nghiệm thu xây dựng cơ bản, hệ thống điện 3 pha, máy phát điện ATS & điều hòa các phòng',
    assignee: 'Nguyễn Lê Đạt Minh',
    dueDate: '24/10/2026',
    priority: 'Cao',
    completed: true,
    note: 'Đã ký biên bản nghiệm thu với Ban Xây Dựng',
  },
  {
    id: 'job_2',
    phase: 'Giai đoạn 2: Nhận hàng & Kiểm kê thiết bị (T-5)',
    title: 'Nhận và kiểm kê 205 danh mục hành chính / trang thiết bị & 55 danh mục thuốc cấp cứu',
    assignee: 'Nguyễn Lê Đạt Minh',
    dueDate: '26/10/2026',
    priority: 'Cao',
    completed: true,
    note: 'Đã cập nhật số lượng thực tế lên hệ thống',
  },
  {
    id: 'job_3',
    phase: 'Giai đoạn 3: Thẩm định dây chuyền lạnh GSP (T-3)',
    title: 'Lắp đặt tủ Haier HBC-260, hiệu chuẩn nhiệt kế tự ghi LogTag và chạy thử tải 48 giờ',
    assignee: 'Nguyễn Lê Đạt Minh',
    dueDate: '28/10/2026',
    priority: 'Cao',
    completed: true,
    note: 'Nhiệt độ duy trì ổn định 4.2°C - 5.1°C',
  },
  {
    id: 'job_4',
    phase: 'Giai đoạn 4: Setup IT & Chạy thử quy trình (T-2)',
    title: 'Kiểm tra luồng khách hàng giả lập: Tiếp đón → Khám sàng lọc → Thu ngân → Tiêm → Theo dõi 30p',
    assignee: 'Nguyễn Văn Bách',
    dueDate: '29/10/2026',
    priority: 'Cao',
    completed: true,
    note: '100% nhân sự nắm vững SOP vận hành',
  },
  {
    id: 'job_5',
    phase: 'Giai đoạn 5: Bàn giao & Khai trương (T-0)',
    title: 'Lập và xuất PDF A4 Biên bản bàn giao trang thiết bị, danh mục thuốc, thiết bị phòng tiêm, CSVC',
    assignee: 'Nguyễn Lê Đạt Minh',
    dueDate: '30/10/2026',
    priority: 'Cao',
    completed: true,
    note: 'Bàn giao đầy đủ cho Bác sĩ Nguyễn Văn Bách',
  },
];

export const DEFAULT_FRIDGE_LOGS: FridgeValidationLog[] = [
  {
    id: 'flg_1',
    fridgeCode: 'TU-VX-01 (Kho chính)',
    model: 'Haier Biomedical HBC-260',
    sensorSerial: 'LT-WIFI-882910',
    stepName: 'Bước 1: Chạy ổn định không tải 24 giờ',
    targetTemp: '2.0°C – 8.0°C',
    measuredTemp: '4.5°C (Min 3.8°C / Max 5.2°C)',
    alarmStatus: 'Đạt',
    checkedAt: '28/10/2026 08:30',
    inspector: 'Nguyễn Lê Đạt Minh',
    note: 'Tủ hoạt động êm, lốc lạnh ngắt nghỉ đúng chu kỳ',
  },
  {
    id: 'flg_2',
    fridgeCode: 'TU-VX-01 (Kho chính)',
    model: 'Haier Biomedical HBC-260',
    sensorSerial: 'LT-WIFI-882910',
    stepName: 'Bước 2: Kiểm tra cảnh báo mở cửa > 2 phút & ngưỡng > 8°C',
    targetTemp: 'Còi hú + SMS/App cảnh báo',
    measuredTemp: 'Kích hoạt sau 90 giây tại 8.1°C',
    alarmStatus: 'Đạt',
    checkedAt: '28/10/2026 14:00',
    inspector: 'Nguyễn Lê Đạt Minh',
    note: 'Đã nhận cảnh báo tức thời qua hệ thống giám sát',
  },
  {
    id: 'flg_3',
    fridgeCode: 'TU-VX-02 (Phòng tiêm 01)',
    model: 'Haier Biomedical HBC-150',
    sensorSerial: 'LT-WIFI-882914',
    stepName: 'Bước 3: Thử nghiệm giả lập mất điện lưới (Chạy UPS + Bình tích lạnh)',
    targetTemp: 'Giữ 2°C – 8°C tối thiểu 24h',
    measuredTemp: '5.1°C sau 12 giờ ngắt nguồn lưới',
    alarmStatus: 'Đạt',
    checkedAt: '29/10/2026 09:15',
    inspector: 'Nguyễn Văn Bách',
    note: 'UPS tự động chuyển mạch 0ms, giữ lạnh đạt chuẩn GSP',
  },
];

export const DEFAULT_REPORT_PHOTOS: ReportPhotoItem[] = [
  {
    id: 'pho_1',
    category: 'Mặt tiền & Biển hiệu',
    title: 'Mặt tiền Trung Tâm Tiêm Chủng Long Châu 58267 - 32-34 Trần Quý Cáp',
    imageUrl: '/assets/aistudio/image_67da3c59.png',
    capturedAt: '30/10/2026 07:30',
    uploader: 'Nguyễn Lê Đạt Minh',
    note: 'Hoàn thiện 100% biển hiệu và POSM khai trương',
  },
  {
    id: 'pho_2',
    category: 'Kiểm kê trang thiết bị',
    title: 'Báo cáo hoàn tất kiểm kê 205 danh mục hành chính & 55 danh mục thuốc',
    imageUrl: '/assets/aistudio/image_fac674a4.png',
    capturedAt: '30/10/2026 09:00',
    uploader: 'Nguyễn Lê Đạt Minh',
    note: 'Đã đối chiếu thực tế cùng Bác sĩ & Dược sĩ phụ trách',
  },
  {
    id: 'pho_3',
    category: 'Biên bản bàn giao',
    title: 'Biên bản bàn giao trang thiết bị giữa Taskforce và Bác sĩ trung tâm',
    imageUrl: '/assets/aistudio/image_988b1f4e.png',
    capturedAt: '30/10/2026 10:15',
    uploader: 'Nguyễn Lê Đạt Minh',
    note: 'Đã ký xác nhận bàn giao lần đầu tại shop mới',
  },
];
