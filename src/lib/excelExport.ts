import * as XLSX from 'xlsx';
import { WorkLog } from '../types';
import { formatDateVN, getDayOfWeek, formatMinutesToHM } from './utils';

export interface WorkExportSummary {
  totalHours: number;
  totalStandard: number;
  totalOvertime: number;
  totalMissing: number;
  workDaysCount: number;
  leaveDaysCount: number;
  completionRate: number;
  standardDaysInMonth?: number;
}

export interface EmployeeExportInfo {
  name?: string;
  id?: string;
  username?: string;
  standardTargetText?: string;
}

/**
 * Format minutes to H:MM or H:00 string (e.g., 540 mins -> '9:00', 570 mins -> '9:30', 480 mins -> '8:00')
 */
function formatMinutesToHColonM(minutes: number | undefined | null): string {
  if (!minutes || minutes <= 0) return '';
  const mins = Math.round(minutes);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}:${m < 10 ? '0' : ''}${m}`;
}

export function exportWorkLogsToExcel(
  workLogs: WorkLog[],
  month: number,
  year: number,
  summary: WorkExportSummary,
  employeeInfo?: EmployeeExportInfo
) {
  const monthStr = month < 10 ? `0${month}` : `${month}`;
  const fileName = `Bang_Ghi_Gio_Lam_Thang_${monthStr}_${year}.xlsx`;

  const empName = employeeInfo?.name || 'Nguyễn Lê Đạt Minh';
  const empId = employeeInfo?.id || '42157';
  const empUsername = employeeInfo?.username || 'Minhnd2';
  const headerTitle = `${empName} - ${empId} - ${empUsername}`;
  const rightHeader = employeeInfo?.standardTargetText || 'Phút chuẩn làm/ngày: 208';

  // Number of days in selected month
  const daysInMonth = new Date(year, month, 0).getDate();

  // Map of logs indexed by day of month (1..31)
  const logsByDay = new Map<number, WorkLog>();
  workLogs.forEach((log) => {
    if (!log.work_date) return;
    const parts = log.work_date.split('-');
    if (parts.length === 3 && parseInt(parts[0], 10) === year && parseInt(parts[1], 10) === month) {
      const dayNum = parseInt(parts[2], 10);
      logsByDay.set(dayNum, log);
    }
  });

  // ==========================================
  // SHEET 1: BẢNG GHI GIỜ LÀM (CHUẨN GIAO DIỆN ĐƠN GIẢN DỄ NHÌN NHƯ MẪU)
  // ==========================================
  const sheet1Data: (string | number)[][] = [];

  // Row 1: Header (Title Left + Standard Minutes/Days Right)
  sheet1Data.push([
    headerTitle,
    '',
    '',
    '',
    '',
    '',
    '',
    rightHeader,
    ''
  ]);

  // Row 2: Subtitle
  sheet1Data.push([
    'Bảng Ghi Giờ Làm',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    ''
  ]);

  // Row 3: Column Headers
  sheet1Data.push([
    'Ngày',
    'Vào ca sáng',
    'Nghỉ trưa',
    'Vào ca chiều',
    'Hết ca',
    'Tổng số giờ làm',
    'Phút dư/thiếu',
    'Ngày nghỉ',
    'Lý do tăng ca/ nghỉ'
  ]);

  let totalExcessMinutes = 0;
  let totalOffDays = 0;

  // Rows 4 .. (daysInMonth + 3): Daily Rows
  for (let day = 1; day <= daysInMonth; day++) {
    const log = logsByDay.get(day);

    let vaoCaSang: string = '';
    let nghiTrua: string = '';
    let vaoCaChieu: string = '';
    let hetCa: string = '';
    let tongSoGioLam: string = '';
    let phutDuThieu: number | string = '';
    let ngayNghi: number = 0;
    let lyDo: string = '';

    if (log) {
      const status = log.work_status || 'Làm việc';
      const isOff = status === 'Nghỉ phép' || status === 'Nghỉ không lương' || (log.notes && /\b(off|nghỉ không lương|nghỉ phép)\b/i.test(log.notes));
      const isHoliday = status === 'Nghỉ lễ' || (log.notes && /\b(lễ|nghỉ lễ)\b/i.test(log.notes));

      if (isOff) {
        vaoCaSang = 'N';
        vaoCaChieu = 'N';
        ngayNghi = 1;
        totalOffDays += 1;
        lyDo = log.notes || 'Off';
      } else if (isHoliday) {
        vaoCaSang = 'Nghỉ Lễ';
        vaoCaChieu = 'Nghỉ Lễ';
        ngayNghi = 0; // Nghỉ lễ vẫn được hưởng lương hoặc theo mẫu hiển thị 0
        lyDo = log.notes || 'Nghỉ Lễ';
      } else {
        // Working day
        vaoCaSang = log.check_in || '08:00';
        hetCa = log.check_out || '18:00';

        // Break time if split or recorded
        if (log.break_duration_minutes && log.break_duration_minutes > 0 && log.break_start) {
          nghiTrua = log.break_start;
          vaoCaChieu = log.break_end || '';
        }

        const totalMins = log.total_minutes ?? Math.round((log.total_hours || 0) * 60);
        tongSoGioLam = formatMinutesToHColonM(totalMins);

        // Calculate excess minutes relative to 8h (480 mins)
        if (totalMins > 0) {
          const excess = totalMins - 480;
          phutDuThieu = excess;
          if (excess > 0) {
            totalExcessMinutes += excess;
          }
        } else {
          phutDuThieu = 0;
        }

        ngayNghi = 0;
        lyDo = log.notes || (phutDuThieu && typeof phutDuThieu === 'number' && phutDuThieu > 0 ? 'Tăng ca' : '');
      }
    } else {
      // Empty day
      ngayNghi = 0;
    }

    sheet1Data.push([
      day,
      vaoCaSang,
      nghiTrua,
      vaoCaChieu,
      hetCa,
      tongSoGioLam,
      phutDuThieu,
      ngayNghi,
      lyDo
    ]);
  }

  // Bottom Summary Row
  const totalRowIndex = sheet1Data.length;
  sheet1Data.push([
    'TỔNG CỘNG',
    '',
    '',
    '',
    '',
    '',
    totalExcessMinutes,
    totalOffDays,
    ''
  ]);

  const worksheet1 = XLSX.utils.aoa_to_sheet(sheet1Data);

  // Cell merges matching user's template
  worksheet1['!merges'] = [
    // Header Left: A1:G1
    { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
    // Header Right: H1:I1
    { s: { r: 0, c: 7 }, e: { r: 0, c: 8 } },
    // Title Banner: A2:I2
    { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } },
    // Footer "TỔNG CỘNG": A(total):F(total)
    { s: { r: totalRowIndex, c: 0 }, e: { r: totalRowIndex, c: 5 } },
  ];

  // Column widths for pristine spacing
  worksheet1['!cols'] = [
    { wch: 8 },  // Ngày
    { wch: 15 }, // Vào ca sáng
    { wch: 13 }, // Nghỉ trưa
    { wch: 15 }, // Vào ca chiều
    { wch: 13 }, // Hết ca
    { wch: 17 }, // Tổng số giờ làm
    { wch: 15 }, // Phút dư/thiếu
    { wch: 13 }, // Ngày nghỉ
    { wch: 32 }, // Lý do tăng ca/ nghỉ
  ];

  // ==========================================
  // SHEET 2: CHI TIẾT TĂNG CA & TỔNG HỢP NÂNG CAO
  // ==========================================
  const sortedLogs = [...workLogs].sort((a, b) => a.work_date.localeCompare(b.work_date));
  const otLogs = sortedLogs.filter(
    (l) => (l.overtime_minutes && l.overtime_minutes > 0) || (l.overtime_hours && l.overtime_hours > 0)
  );

  const sheet2Data: (string | number)[][] = [
    [`BÁO CÁO TỔNG HỢP & CHI TIẾT TĂNG CA (OT) THÁNG ${monthStr}/${year}`],
    [`Nhân sự: ${headerTitle}`],
    [],
    ['Chỉ Số Tổng Quan', 'Giá Trị', 'Đơn Vị', 'Ghi Chú'],
    ['Tổng số phút làm việc thực tế', summary.totalHours * 60, 'Phút', `${summary.totalHours.toFixed(1)} giờ`],
    ['Tổng phút dư / tăng ca (OT)', totalExcessMinutes, 'Phút', `${(totalExcessMinutes / 60).toFixed(1)} giờ`],
    ['Tổng số ngày nghỉ (Off)', totalOffDays, 'Ngày', 'Nghỉ phép / việc riêng'],
    ['Số ca có làm thêm giờ (OT)', otLogs.length, 'Ca', 'Có phát sinh giờ công vượt chuẩn'],
    [],
    ['DANH SÁCH CHI TIẾT CÁC NGÀY CÓ TĂNG CA (OT):'],
    ['STT', 'Ngày', 'Thứ', 'Vào ca', 'Hết ca', 'Tổng làm', 'Phút OT', 'Giờ OT', 'Diễn giải / Dự án tăng ca']
  ];

  otLogs.forEach((log, index) => {
    const otMins = log.overtime_minutes ?? Math.round((log.overtime_hours || 0) * 60);
    const totalMins = log.total_minutes ?? Math.round((log.total_hours || 0) * 60);
    sheet2Data.push([
      index + 1,
      formatDateVN(log.work_date),
      getDayOfWeek(log.work_date),
      log.check_in || '--:--',
      log.check_out || '--:--',
      formatMinutesToHColonM(totalMins),
      otMins,
      Number((otMins / 60).toFixed(2)),
      log.notes || 'Tăng ca hoàn thành công việc'
    ]);
  });

  const worksheet2 = XLSX.utils.aoa_to_sheet(sheet2Data);
  worksheet2['!cols'] = [
    { wch: 6 },
    { wch: 14 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 14 },
    { wch: 14 },
    { wch: 12 },
    { wch: 38 },
  ];

  // Build Workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet1, `Bang_Ghi_Gio_Lam_${monthStr}_${year}`);
  XLSX.utils.book_append_sheet(workbook, worksheet2, `Chi_Tiet_OT_Thang_${monthStr}`);

  // Write and trigger download
  XLSX.writeFile(workbook, fileName);
}
