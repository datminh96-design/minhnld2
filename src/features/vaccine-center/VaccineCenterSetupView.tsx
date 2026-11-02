import React, { useState, useMemo, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import {
  Calendar,
  Check,
  Plus,
  Search,
  Trash2,
  Camera,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Thermometer,
  ShieldCheck,
  Upload,
  FileSpreadsheet,
  RefreshCw,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import {
  CenterInfo,
  HandoverPartyInfo,
  EquipmentCategoryTab,
  HandoverSubTab,
  EquipmentItem,
  ChecklistItem,
  TaskforceJobItem,
  FridgeValidationLog,
  ReportPhotoItem,
  DEFAULT_CENTER_INFO,
  DEFAULT_HANDOVER_PARTY,
  generateDefaultEquipmentList,
  DEFAULT_CHECKLIST_ITEMS,
  DEFAULT_TASKFORCE_JOBS,
  DEFAULT_FRIDGE_LOGS,
  DEFAULT_REPORT_PHOTOS,
} from './vaccineCenterData';

type SetupMainTab =
  | 'center_info'
  | 'equipment'
  | 'checklist'
  | 'tasks'
  | 'fridge_guide'
  | 'photo_report'
  | 'handover';

type EquipmentStatusFilter = 'all' | 'unentered' | 'enough' | 'shortage' | 'surplus';

const STORAGE_KEY = 'tttc_setup_state_v3';

interface PersistedSetupState {
  centerInfo: CenterInfo;
  handoverParty: HandoverPartyInfo;
  equipmentList: EquipmentItem[];
  checklistItems: ChecklistItem[];
  taskforceJobs: TaskforceJobItem[];
  fridgeLogs: FridgeValidationLog[];
  reportPhotos: ReportPhotoItem[];
  excelFileName: string;
  lastSavedTime: string;
}

const EMPTY_CENTER_INFO: CenterInfo = {
  code: '',
  address: '',
  leader: '',
  openingDate: '',
  asm: '',
};

const EMPTY_HANDOVER_PARTY: HandoverPartyInfo = {
  delivererName: '',
  delivererPhone: '',
  delivererDept: 'Taskforce Vacxin Long Châu',
  receiverDept: 'Bác sĩ',
  receiverName: '',
  receiverPhone: '',
  handoverNote:
    'Bàn giao trang thiết bị lần đầu do Taskforce nhận tại shop mới Trung tâm tiêm chủng Long Châu',
};

function formatNowVi(): string {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const mo = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();
  return `${hh}:${mm} ngày ${dd}/${mo}/${yyyy}`;
}

function getItemStatus(item: EquipmentItem): 'unentered' | 'enough' | 'shortage' | 'surplus' {
  if (item.actualQty === null || item.actualQty === undefined || Number.isNaN(item.actualQty)) {
    return 'unentered';
  }
  if (item.actualQty === item.requiredQty) return 'enough';
  if (item.actualQty < item.requiredQty) return 'shortage';
  return 'surplus';
}

export const VaccineCenterSetupView: React.FC = () => {
  const { addToast } = useData();

  // Load initial state from localStorage; starts completely empty until user fills form or uploads Excel
  const initialState = useMemo<PersistedSetupState>(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('tttc_setup_state_v1');
        localStorage.removeItem('tttc_setup_state_v2');
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.centerInfo && Array.isArray(parsed.equipmentList)) {
            return parsed;
          }
        }
      } catch {
        // ignore corrupted storage
      }
    }
    return {
      centerInfo: EMPTY_CENTER_INFO,
      handoverParty: EMPTY_HANDOVER_PARTY,
      equipmentList: [],
      checklistItems: DEFAULT_CHECKLIST_ITEMS,
      taskforceJobs: DEFAULT_TASKFORCE_JOBS,
      fridgeLogs: DEFAULT_FRIDGE_LOGS,
      reportPhotos: [],
      excelFileName: '',
      lastSavedTime: '',
    };
  }, []);

  const [activeMainTab, setActiveMainTab] = useState<SetupMainTab>('center_info');

  // State slices
  const [centerInfo, setCenterInfo] = useState<CenterInfo>(initialState.centerInfo);
  const [draftCenterInfo, setDraftCenterInfo] = useState<CenterInfo>(initialState.centerInfo);
  const [handoverParty, setHandoverParty] = useState<HandoverPartyInfo>(initialState.handoverParty);
  const [equipmentList, setEquipmentList] = useState<EquipmentItem[]>(initialState.equipmentList);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>(initialState.checklistItems);
  const [taskforceJobs, setTaskforceJobs] = useState<TaskforceJobItem[]>(initialState.taskforceJobs);
  const [fridgeLogs, setFridgeLogs] = useState<FridgeValidationLog[]>(initialState.fridgeLogs);
  const [reportPhotos, setReportPhotos] = useState<ReportPhotoItem[]>(initialState.reportPhotos);
  const [excelFileName, setExcelFileName] = useState<string>(initialState.excelFileName);
  const [lastSavedTime, setLastSavedTime] = useState<string>(initialState.lastSavedTime);

  // Tab 2 (Equipment) filters & sub-tabs
  const [equipmentSubTab, setEquipmentSubTab] = useState<EquipmentCategoryTab>('admin');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [handlerFilter, setHandlerFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<EquipmentStatusFilter>('all');

  // Tab 3 (Checklist) filter & new item state
  const [checklistAreaFilter, setChecklistAreaFilter] = useState<string>('ALL');
  const [newChecklistTitle, setNewChecklistTitle] = useState<string>('');
  const [newChecklistArea, setNewChecklistArea] = useState<string>('1. Mặt tiền & Biển bảng POSM');

  // Tab 4 (Tasks) new job state
  const [newJobTitle, setNewJobTitle] = useState<string>('');
  const [newJobPhase, setNewJobPhase] = useState<string>('Giai đoạn 5: Bàn giao & Khai trương (T-0)');
  const [newJobAssignee, setNewJobAssignee] = useState<string>('Nguyễn Lê Đạt Minh');
  const [newJobDueDate, setNewJobDueDate] = useState<string>('30/10/2026');

  // Tab 6 (Photo report) upload state
  const [photoCategory, setPhotoCategory] = useState<string>('Mặt tiền & Biển hiệu');
  const [photoTitle, setPhotoTitle] = useState<string>('');
  const [photoNote, setPhotoNote] = useState<string>('');

  // Tab 7 (Handover) sub-tab
  const [handoverSubTab, setHandoverSubTab] = useState<HandoverSubTab>('equipment');

  // Hidden file input refs
  const excelInputRef = useRef<HTMLInputElement | null>(null);
  const progressJsonInputRef = useRef<HTMLInputElement | null>(null);
  const photoUploadInputRef = useRef<HTMLInputElement | null>(null);

  // Auto-persist to localStorage whenever state changes
  useEffect(() => {
    try {
      const payload: PersistedSetupState = {
        centerInfo,
        handoverParty,
        equipmentList,
        checklistItems,
        taskforceJobs,
        fridgeLogs,
        reportPhotos,
        excelFileName,
        lastSavedTime,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // ignore quota errors
    }
  }, [
    centerInfo,
    handoverParty,
    equipmentList,
    checklistItems,
    taskforceJobs,
    fridgeLogs,
    reportPhotos,
    excelFileName,
    lastSavedTime,
  ]);

  // Calculate progress badges for Tab 3 and Tab 4
  const checklistProgress = useMemo(() => {
    if (checklistItems.length === 0) return 0;
    const done = checklistItems.filter((i) => i.completed).length;
    return Math.round((done / checklistItems.length) * 100);
  }, [checklistItems]);

  const jobsProgress = useMemo(() => {
    if (taskforceJobs.length === 0) return 0;
    const done = taskforceJobs.filter((j) => j.completed).length;
    return Math.round((done / taskforceJobs.length) * 100);
  }, [taskforceJobs]);

  // Equipment counts by sub-tab
  const adminItems = useMemo(
    () => equipmentList.filter((i) => i.tab === 'admin'),
    [equipmentList]
  );
  const medicineItems = useMemo(
    () => equipmentList.filter((i) => i.tab === 'medicine'),
    [equipmentList]
  );

  const activeSubTabItems = equipmentSubTab === 'admin' ? adminItems : medicineItems;

  // KPI metrics for active equipment sub-tab
  const equipmentKpis = useMemo(() => {
    let unentered = 0;
    let enough = 0;
    let surplus = 0;
    let shortage = 0;

    for (const item of activeSubTabItems) {
      const st = getItemStatus(item);
      if (st === 'unentered') unentered++;
      else if (st === 'enough') enough++;
      else if (st === 'surplus') surplus++;
      else if (st === 'shortage') shortage++;
    }

    return {
      total: activeSubTabItems.length,
      unentered,
      enough,
      surplus,
      shortage,
    };
  }, [activeSubTabItems]);

  // Unique handlers for dropdown
  const uniqueHandlers = useMemo(() => {
    const set = new Set<string>();
    activeSubTabItems.forEach((i) => {
      if (i.handler) set.add(i.handler);
    });
    return Array.from(set);
  }, [activeSubTabItems]);

  // Filtered equipment items
  const filteredEquipmentItems = useMemo(() => {
    return activeSubTabItems.filter((item) => {
      if (handlerFilter !== 'ALL' && item.handler !== handlerFilter) return false;
      if (statusFilter !== 'all' && getItemStatus(item) !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = item.name.toLowerCase().includes(q);
        const matchType = item.type.toLowerCase().includes(q);
        const matchHandler = item.handler.toLowerCase().includes(q);
        if (!matchName && !matchType && !matchHandler) return false;
      }
      return true;
    });
  }, [activeSubTabItems, handlerFilter, statusFilter, searchQuery]);

  // Handover items for Tab 7 based on selected sub-tab
  const handoverItems = useMemo(() => {
    return equipmentList.filter((item) => item.handoverGroup === handoverSubTab);
  }, [equipmentList, handoverSubTab]);

  // Handlers for Tab 1: Thông tin trung tâm
  const updateCenterField = (field: keyof CenterInfo, value: string) => {
    const updated = { ...draftCenterInfo, [field]: value };
    setDraftCenterInfo(updated);
    setCenterInfo(updated);
    if (field === 'leader') {
      setHandoverParty((prev) => ({
        ...prev,
        delivererName: value,
      }));
    }
  };

  const handleSaveCenterInfo = (e: React.FormEvent) => {
    e.preventDefault();
    setCenterInfo(draftCenterInfo);
    setHandoverParty((prev) => ({
      ...prev,
      delivererName: draftCenterInfo.leader || prev.delivererName,
    }));
    setLastSavedTime(formatNowVi());
    addToast('Đã lưu thông tin Trung Tâm Tiêm Chủng thành công!', 'success');
  };

  const handleClearCenterInfo = () => {
    setDraftCenterInfo(EMPTY_CENTER_INFO);
    setCenterInfo(EMPTY_CENTER_INFO);
    setHandoverParty((prev) => ({
      ...prev,
      delivererName: '',
    }));
    addToast('Đã xóa trống dữ liệu thông tin trung tâm.', 'info');
  };

  // Handlers for Tab 2: Trang thiết bị
  const handleToggleItemEnough = (id: string, checked: boolean) => {
    setEquipmentList((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              actualQty: checked ? item.requiredQty : null,
            }
          : item
      )
    );
    setLastSavedTime(formatNowVi());
  };

  const handleActualQtyChange = (id: string, valueStr: string) => {
    const parsed = valueStr.trim() === '' ? null : Math.max(0, Number(valueStr));
    setEquipmentList((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              actualQty: Number.isNaN(parsed as number) ? null : parsed,
            }
          : item
      )
    );
    setLastSavedTime(formatNowVi());
  };

  const handleItemNoteChange = (id: string, note: string) => {
    setEquipmentList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, note } : item))
    );
    setLastSavedTime(formatNowVi());
  };

  const handleClearEnteredQuantities = () => {
    setEquipmentList((prev) =>
      prev.map((item) =>
        item.tab === equipmentSubTab ? { ...item, actualQty: null } : item
      )
    );
    setLastSavedTime(formatNowVi());
    addToast(
      `Đã xoá số lượng đã nhập của ${
        equipmentSubTab === 'admin' ? 'Danh mục hành chính' : 'Danh mục thuốc'
      }.`,
      'info'
    );
  };

  const handleResetAndUploadNew = () => {
    setEquipmentList([]);
    setExcelFileName('');
    setLastSavedTime('');
    addToast('Đã xoá toàn bộ dữ liệu trang thiết bị. Vui lòng chọn file Excel mới.', 'info');
    if (excelInputRef.current) {
      excelInputRef.current.value = '';
      excelInputRef.current.click();
    }
  };

  const handleExcelFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const buffer = evt.target?.result;
        const workbook = XLSX.read(buffer, { type: 'array' });
        const importedItems: EquipmentItem[] = [];

        workbook.SheetNames.forEach((sheetName, sheetIdx) => {
          const sheet = workbook.Sheets[sheetName];
          const rawRows = XLSX.utils.sheet_to_json<any[]>(sheet, {
            header: 1,
            defval: '',
          });
          if (!rawRows || rawRows.length === 0) return;

          const sheetLower = sheetName.toLowerCase();
          const isMedicineSheet =
            sheetLower.includes('thuốc') ||
            sheetLower.includes('thuoc') ||
            sheetLower.includes('y tế') ||
            sheetLower.includes('vắc xin') ||
            sheetLower.includes('vacxin') ||
            (workbook.SheetNames.length > 1 && sheetIdx === 1);

          // Find header row within first 20 rows
          let headerRowIdx = -1;
          let colMap = {
            stt: -1,
            handler: -1,
            type: -1,
            name: -1,
            unit: -1,
            reqQty: -1,
            actQty: -1,
            note: -1,
          };

          for (let r = 0; r < Math.min(rawRows.length, 20); r++) {
            const rowCells = (rawRows[r] || []).map((c: any) =>
              String(c ?? '')
                .trim()
                .toLowerCase()
            );
            const hasNameHeader = rowCells.some(
              (val) =>
                val.includes('tên sản phẩm') ||
                val.includes('ten san pham') ||
                val.includes('tên thiết bị') ||
                val.includes('tên thuốc') ||
                val.includes('tên vật tư') ||
                val.includes('tên hàng') ||
                val.includes('sản phẩm') ||
                val.includes('danh mục') ||
                val === 'tên'
            );
            const hasOtherHeader = rowCells.some(
              (val) =>
                val === 'stt' ||
                val.includes('đvt') ||
                val.includes('đơn vị') ||
                val.includes('sl yêu cầu') ||
                val.includes('số lượng') ||
                val.includes('người xử lý') ||
                val.includes('loại')
            );

            if (hasNameHeader || (hasOtherHeader && rowCells.filter(Boolean).length >= 3)) {
              headerRowIdx = r;
              rowCells.forEach((cellText, cIdx) => {
                if (!cellText) return;
                if (colMap.stt === -1 && (cellText === 'stt' || cellText === 'tt' || cellText.includes('số thứ tự'))) {
                  colMap.stt = cIdx;
                } else if (
                  colMap.handler === -1 &&
                  (cellText.includes('người xử lý') ||
                    cellText.includes('nguoi xu ly') ||
                    cellText.includes('phụ trách') ||
                    cellText.includes('bộ phận') ||
                    cellText.includes('đầu mối') ||
                    cellText === 'pic')
                ) {
                  colMap.handler = cIdx;
                } else if (
                  colMap.type === -1 &&
                  (cellText === 'loại' ||
                    cellText === 'loai' ||
                    cellText.includes('phân loại') ||
                    cellText.includes('nhóm') ||
                    cellText.includes('hạng mục'))
                ) {
                  colMap.type = cIdx;
                } else if (
                  colMap.name === -1 &&
                  (cellText.includes('tên sản phẩm') ||
                    cellText.includes('ten san pham') ||
                    cellText.includes('tên thiết bị') ||
                    cellText.includes('tên thuốc') ||
                    cellText.includes('tên vật tư') ||
                    cellText.includes('tên hàng') ||
                    cellText.includes('sản phẩm') ||
                    cellText.includes('danh mục') ||
                    cellText === 'tên')
                ) {
                  colMap.name = cIdx;
                } else if (
                  colMap.unit === -1 &&
                  (cellText.includes('đvt') ||
                    cellText.includes('dvt') ||
                    cellText.includes('đơn vị'))
                ) {
                  colMap.unit = cIdx;
                } else if (
                  colMap.reqQty === -1 &&
                  (cellText.includes('sl yêu cầu') ||
                    cellText.includes('yêu cầu') ||
                    cellText.includes('sl cấp') ||
                    cellText.includes('định mức') ||
                    cellText === 'số lượng' ||
                    cellText === 'sl')
                ) {
                  colMap.reqQty = cIdx;
                } else if (
                  colMap.actQty === -1 &&
                  (cellText.includes('sl thực tế') ||
                    cellText.includes('thực tế') ||
                    cellText.includes('sl nhận') ||
                    cellText.includes('thực nhận') ||
                    cellText.includes('kiểm kê'))
                ) {
                  colMap.actQty = cIdx;
                } else if (
                  colMap.note === -1 &&
                  (cellText.includes('ghi chú') ||
                    cellText.includes('ghi chu') ||
                    cellText.includes('note'))
                ) {
                  colMap.note = cIdx;
                }
              });
              break;
            }
          }

          const startRow = headerRowIdx >= 0 ? headerRowIdx + 1 : 0;

          for (let r = startRow; r < rawRows.length; r++) {
            const row = rawRows[r];
            if (!Array.isArray(row) || row.every((c) => String(c ?? '').trim() === '')) {
              continue;
            }

            let nameVal = '';
            if (colMap.name >= 0) {
              nameVal = String(row[colMap.name] ?? '').trim();
            } else {
              // Fallback: find the longest text cell in the row as product name
              const candidates = row
                .map((c, idx) => ({ text: String(c ?? '').trim(), idx }))
                .filter((x) => x.text.length > 2 && Number.isNaN(Number(x.text)));
              if (candidates.length > 0) {
                nameVal = candidates.sort((a, b) => b.text.length - a.text.length)[0].text;
              }
            }

            if (!nameVal) continue;
            // Skip repeated header rows
            const lowerName = nameVal.toLowerCase();
            if (
              lowerName === 'tên sản phẩm' ||
              lowerName === 'ten san pham' ||
              lowerName === 'tổng cộng' ||
              lowerName === 'tổng'
            ) {
              continue;
            }

            const handlerVal =
              colMap.handler >= 0 && String(row[colMap.handler] ?? '').trim()
                ? String(row[colMap.handler]).trim()
                : isMedicineSheet
                ? 'Dược sĩ'
                : 'Taskforce';

            const typeVal =
              colMap.type >= 0 && String(row[colMap.type] ?? '').trim()
                ? String(row[colMap.type]).trim()
                : isMedicineSheet
                ? 'Danh mục thuốc'
                : 'Hành chính';

            const unitVal =
              colMap.unit >= 0 && String(row[colMap.unit] ?? '').trim()
                ? String(row[colMap.unit]).trim()
                : 'Cái';

            let reqQty = 1;
            if (colMap.reqQty >= 0) {
              const parsedReq = Number(
                String(row[colMap.reqQty] ?? '')
                  .replace(/,/g, '')
                  .trim()
              );
              if (!Number.isNaN(parsedReq) && parsedReq >= 0) {
                reqQty = parsedReq;
              }
            }

            let actualQty: number | null = null;
            if (colMap.actQty >= 0) {
              const rawActStr = String(row[colMap.actQty] ?? '')
                .replace(/,/g, '')
                .trim();
              if (rawActStr !== '') {
                const parsedAct = Number(rawActStr);
                if (!Number.isNaN(parsedAct) && parsedAct >= 0) {
                  actualQty = parsedAct;
                }
              }
            }

            const noteVal =
              colMap.note >= 0 ? String(row[colMap.note] ?? '').trim() : '';

            const typeLower = typeVal.toLowerCase();
            const itemTab: EquipmentCategoryTab =
              isMedicineSheet ||
              typeLower.includes('thuốc') ||
              typeLower.includes('thuoc') ||
              typeLower.includes('vắc xin')
                ? 'medicine'
                : 'admin';

            let handoverGroup: HandoverSubTab =
              itemTab === 'medicine' ? 'medicine' : 'equipment';
            if (
              typeLower.includes('phòng tiêm') ||
              typeLower.includes('phong tiem') ||
              typeLower.includes('y tế')
            ) {
              handoverGroup = 'injection_room';
            } else if (
              typeLower.includes('csvc') ||
              typeLower.includes('cơ sở vật chất') ||
              typeLower.includes('nội thất')
            ) {
              handoverGroup = 'csvc';
            }

            importedItems.push({
              id: `imp_${sheetIdx}_${r}_${Date.now()}`,
              stt: importedItems.length + 1,
              handler: handlerVal,
              type: typeVal,
              name: nameVal,
              unit: unitVal,
              requiredQty: reqQty,
              actualQty,
              note: noteVal,
              tab: itemTab,
              handoverGroup,
            });
          }
        });

        if (importedItems.length > 0) {
          setEquipmentList(importedItems);
          setExcelFileName(file.name);
          setLastSavedTime(formatNowVi());
          const hasAdmin = importedItems.some((i) => i.tab === 'admin');
          const hasMed = importedItems.some((i) => i.tab === 'medicine');
          if (!hasAdmin && hasMed) {
            setEquipmentSubTab('medicine');
          } else {
            setEquipmentSubTab('admin');
          }
          addToast(
            `Đã tải thành công ${importedItems.length} danh mục từ file "${file.name}"!`,
            'success'
          );
        } else {
          addToast(
            'Không tìm thấy dữ liệu sản phẩm trong file Excel. Vui lòng kiểm tra lại nội dung file.',
            'warning'
          );
        }
      } catch {
        addToast('Lỗi đọc file Excel. Vui lòng kiểm tra định dạng .xlsx / .xls.', 'error');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const handleExportExcel = () => {
    const label =
      equipmentSubTab === 'admin' ? 'Danh mục hành chính' : 'Danh mục thuốc';
    const rows = filteredEquipmentItems.map((item, idx) => {
      const st = getItemStatus(item);
      const statusText =
        st === 'enough'
          ? 'Đủ'
          : st === 'shortage'
          ? `Thiếu ${item.requiredQty - (item.actualQty ?? 0)}`
          : st === 'surplus'
          ? `Dư ${(item.actualQty ?? 0) - item.requiredQty}`
          : 'Chưa nhập';
      return {
        STT: idx + 1,
        'NGƯỜI XỬ LÝ': item.handler,
        LOẠI: item.type,
        'TÊN SẢN PHẨM': item.name,
        ĐVT: item.unit,
        'SL YÊU CẦU': item.requiredQty,
        'SL THỰC TẾ': item.actualQty ?? '',
        'TRẠNG THÁI': statusText,
        'GHI CHÚ': item.note,
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, label);
    const safeCode = centerInfo.code || 'TTTC';
    XLSX.writeFile(wb, `Kiem_Ke_${safeCode}_${equipmentSubTab}.xlsx`);
    addToast(`Đã xuất file Excel — ${label} thành công!`, 'success');
  };

  const handleSaveProgressJson = () => {
    const nowStr = formatNowVi();
    setLastSavedTime(nowStr);
    const payload: PersistedSetupState = {
      centerInfo,
      handoverParty,
      equipmentList,
      checklistItems,
      taskforceJobs,
      fridgeLogs,
      reportPhotos,
      excelFileName,
      lastSavedTime: nowStr,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Tien_Do_Khai_Truong_TT_${centerInfo.code || '58267'}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addToast('Đã lưu tiến độ vào hệ thống & tải file sao lưu tiến độ!', 'success');
  };

  const handleLoadProgressJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(String(evt.target?.result || '{}'));
        if (parsed.centerInfo) {
          setCenterInfo(parsed.centerInfo);
          setDraftCenterInfo(parsed.centerInfo);
        }
        if (parsed.handoverParty) setHandoverParty(parsed.handoverParty);
        if (Array.isArray(parsed.equipmentList)) setEquipmentList(parsed.equipmentList);
        if (Array.isArray(parsed.checklistItems)) setChecklistItems(parsed.checklistItems);
        if (Array.isArray(parsed.taskforceJobs)) setTaskforceJobs(parsed.taskforceJobs);
        if (Array.isArray(parsed.fridgeLogs)) setFridgeLogs(parsed.fridgeLogs);
        if (Array.isArray(parsed.reportPhotos)) setReportPhotos(parsed.reportPhotos);
        setLastSavedTime(formatNowVi());
        addToast('Đã tải tiến độ khai trương lên thành công!', 'success');
      } catch {
        addToast('File tiến độ không hợp lệ.', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Photo upload handler (Tab 6)
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const dataUrl = String(evt.target?.result || '');
      if (!dataUrl) return;
      const newPhoto: ReportPhotoItem = {
        id: `pho_${Date.now()}`,
        category: photoCategory,
        title: photoTitle.trim() || `${photoCategory} — TT ${centerInfo.code}`,
        imageUrl: dataUrl,
        capturedAt: formatNowVi(),
        uploader: centerInfo.leader || 'Nguyễn Lê Đạt Minh',
        note: photoNote.trim() || 'Đã nghiệm thu thực tế tại trung tâm',
      };
      setReportPhotos((prev) => [newPhoto, ...prev]);
      setPhotoTitle('');
      setPhotoNote('');
      addToast('Đã thêm hình ảnh báo cáo khai trương!', 'success');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Print A4 PDF Handover Document (Tab 7)
  const handlePrintHandoverA4 = () => {
    window.print();
  };

  const getHandoverTitle = (sub: HandoverSubTab) => {
    switch (sub) {
      case 'equipment':
        return 'BIÊN BẢN BÀN GIAO TRANG THIẾT BỊ';
      case 'medicine':
        return 'BIÊN BẢN BÀN GIAO DANH MỤC THUỐC & VẬT TƯ Y TẾ';
      case 'injection_room':
        return 'BIÊN BẢN BÀN GIAO THIẾT BỊ PHÒNG TIÊM';
      case 'csvc':
        return 'BIÊN BẢN BÀN GIAO CƠ SỞ VẬT CHẤT (CSVC)';
    }
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Hidden File Inputs */}
      <input
        ref={excelInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={handleExcelFileUpload}
      />
      <input
        ref={progressJsonInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleLoadProgressJson}
      />
      <input
        ref={photoUploadInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handlePhotoUpload}
      />

      {/* TOP TEAL BANNER (Matches Screenshot 2 & 4) */}
      <div className="rounded-2xl bg-gradient-to-r from-[#0d9488] via-[#0ea599] to-[#10b2a5] text-white p-5 sm:p-6 shadow-md print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
              Checklist Setup Trung Tâm Tiêm Chủng
            </h1>
            <p className="text-xs sm:text-sm text-white/90 mt-0.5 font-medium">
              Taskforce thị trường — theo dõi tiến độ khai trương
            </p>
          </div>
        </div>

        {(centerInfo.code ||
          centerInfo.address ||
          centerInfo.leader ||
          centerInfo.openingDate ||
          centerInfo.asm) && (
          <>
            <div className="border-t border-white/25 my-4" />

            {/* 5 Info Cards on Banner — displayed when filled in Form 1 */}
            <div className="flex flex-wrap items-stretch gap-2.5 sm:gap-3">
              <div className="bg-white text-slate-900 rounded-xl px-3.5 py-2 shadow-xs min-w-[90px]">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#0d9488]">
                  MÃ TT
                </p>
                <p className="text-xs sm:text-sm font-extrabold text-slate-900 mt-0.5 tabular-nums">
                  {centerInfo.code || '—'}
                </p>
              </div>

              <div className="bg-white text-slate-900 rounded-xl px-3.5 py-2 shadow-xs min-w-[210px]">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#0d9488]">
                  ĐỊA CHỈ
                </p>
                <p className="text-xs sm:text-sm font-extrabold text-slate-900 mt-0.5">
                  {centerInfo.address || '—'}
                </p>
              </div>

              <div className="bg-white text-slate-900 rounded-xl px-3.5 py-2 shadow-xs min-w-[160px]">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#0d9488]">
                  LEADER
                </p>
                <p className="text-xs sm:text-sm font-extrabold text-slate-900 mt-0.5">
                  {centerInfo.leader || '—'}
                </p>
              </div>

              <div className="bg-white text-slate-900 rounded-xl px-3.5 py-2 shadow-xs min-w-[140px]">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#0d9488]">
                  NGÀY KHAI TRƯƠNG
                </p>
                <p className="text-xs sm:text-sm font-extrabold text-slate-900 mt-0.5 tabular-nums">
                  {centerInfo.openingDate || '—'}
                </p>
              </div>

              <div className="bg-white text-slate-900 rounded-xl px-3.5 py-2 shadow-xs min-w-[130px]">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#0d9488]">
                  ASM
                </p>
                <p className="text-xs sm:text-sm font-extrabold text-slate-900 mt-0.5">
                  {centerInfo.asm || '—'}
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* 7-TAB NAVIGATION BAR (Matches Screenshot 2 & 4) */}
      <div className="bg-[#efede6] dark:bg-slate-800/95 p-2 rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-700 grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-2 print:hidden">
        <button
          type="button"
          onClick={() => setActiveMainTab('center_info')}
          className={`min-h-[54px] px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex flex-col items-center justify-center text-center cursor-pointer ${
            activeMainTab === 'center_info'
              ? 'bg-[#0f1e36] text-white shadow-sm'
              : 'bg-white dark:bg-slate-900 text-[#0f1e36] dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-700'
          }`}
        >
          <span>Thông tin trung tâm</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMainTab('equipment')}
          className={`min-h-[54px] px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex flex-col items-center justify-center text-center cursor-pointer ${
            activeMainTab === 'equipment'
              ? 'bg-[#0f1e36] text-white shadow-sm'
              : 'bg-white dark:bg-slate-900 text-[#0f1e36] dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-700'
          }`}
        >
          <span>Trang thiết bị</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMainTab('checklist')}
          className={`min-h-[54px] px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex flex-col items-center justify-center text-center gap-1 cursor-pointer ${
            activeMainTab === 'checklist'
              ? 'bg-[#0f1e36] text-white shadow-sm'
              : 'bg-white dark:bg-slate-900 text-[#0f1e36] dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-700'
          }`}
        >
          <span>Check các hạng mục</span>
          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#d2f4ee] text-[#0c6b63] tabular-nums">
            {checklistProgress}%
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMainTab('tasks')}
          className={`min-h-[54px] px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex flex-col items-center justify-center text-center gap-1 cursor-pointer ${
            activeMainTab === 'tasks'
              ? 'bg-[#0f1e36] text-white shadow-sm'
              : 'bg-white dark:bg-slate-900 text-[#0f1e36] dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-700'
          }`}
        >
          <span>Công việc</span>
          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#d2f4ee] text-[#0c6b63] tabular-nums">
            {jobsProgress}%
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMainTab('fridge_guide')}
          className={`min-h-[54px] px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex flex-col items-center justify-center text-center cursor-pointer ${
            activeMainTab === 'fridge_guide'
              ? 'bg-[#0f1e36] text-white shadow-sm'
              : 'bg-white dark:bg-slate-900 text-[#0f1e36] dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-700'
          }`}
        >
          <span>Hướng dẫn thẩm định tủ</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMainTab('photo_report')}
          className={`min-h-[54px] px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex flex-col items-center justify-center text-center cursor-pointer ${
            activeMainTab === 'photo_report'
              ? 'bg-[#0f1e36] text-white shadow-sm'
              : 'bg-white dark:bg-slate-900 text-[#0f1e36] dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-700'
          }`}
        >
          <span>Chụp hình báo cáo</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMainTab('handover')}
          className={`min-h-[54px] px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex flex-col items-center justify-center text-center cursor-pointer ${
            activeMainTab === 'handover'
              ? 'bg-[#0f1e36] text-white shadow-sm'
              : 'bg-white dark:bg-slate-900 text-[#0f1e36] dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-700'
          }`}
        >
          <span>Biên bản bàn giao</span>
        </button>
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: THÔNG TIN TRUNG TÂM (Matches Screenshot 2)                      */}
      {/* ===================================================================== */}
      {activeMainTab === 'center_info' && (
        <div className="pt-2">
          <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 shadow-xs border border-slate-200/80 dark:border-slate-800">
            <form onSubmit={handleSaveCenterInfo} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                    Mã trung tâm
                  </label>
                  <input
                    type="text"
                    value={draftCenterInfo.code}
                    onChange={(e) => updateCenterField('code', e.target.value)}
                    placeholder="Nhập mã trung tâm..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0d9488]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                    Leader phụ trách
                  </label>
                  <input
                    type="text"
                    value={draftCenterInfo.leader}
                    onChange={(e) => updateCenterField('leader', e.target.value)}
                    placeholder="Nhập họ tên Leader phụ trách..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0d9488]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                  Địa chỉ trung tâm
                </label>
                <input
                  type="text"
                  value={draftCenterInfo.address}
                  onChange={(e) => updateCenterField('address', e.target.value)}
                  placeholder="Nhập địa chỉ trung tâm..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0d9488]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                  Ngày khai trương
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={draftCenterInfo.openingDate}
                    onChange={(e) =>
                      updateCenterField('openingDate', e.target.value)
                    }
                    placeholder="DD/MM/YYYY"
                    className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0d9488]"
                  />
                  <Calendar className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                  ASM phụ trách
                </label>
                <input
                  type="text"
                  value={draftCenterInfo.asm}
                  onChange={(e) => updateCenterField('asm', e.target.value)}
                  placeholder="Nhập họ tên ASM phụ trách..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0d9488]"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-[#136f72] hover:bg-[#0f5a5c] text-white font-bold text-sm shadow-xs transition-colors cursor-pointer"
                >
                  Lưu thông tin
                </button>
                <button
                  type="button"
                  onClick={handleClearCenterInfo}
                  className="px-5 py-2.5 rounded-xl border border-[#c86428] text-[#c86428] hover:bg-orange-50 dark:hover:bg-orange-950/30 font-semibold text-sm transition-colors cursor-pointer"
                >
                  Xóa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: TRANG THIẾT BỊ (Matches Screenshot 3)                           */}
      {/* ===================================================================== */}
      {activeMainTab === 'equipment' && (
        <div className="space-y-4">
          {/* Dark Navy Banner */}
          <div className="bg-[#0f294a] text-white rounded-xl p-5 sm:p-6 shadow-xs">
            <h2 className="text-lg sm:text-xl font-extrabold tracking-tight">
              Kiểm kê trang thiết bị khai trương
            </h2>
            <p className="text-xs sm:text-sm text-slate-200 mt-1">
              Đang dùng dữ liệu:{' '}
              <span className="font-semibold">
                {excelFileName || 'Chưa tải file Excel'}
              </span>
            </p>
            <p className="text-[11px] text-slate-300 mt-0.5">
              {lastSavedTime
                ? `Đã lưu lúc ${lastSavedTime}`
                : 'Chưa có dữ liệu — vui lòng nhấn "⬆ Tải file Excel" để hiển thị danh sách'}
            </p>
          </div>

          {/* Action Toolbar Buttons */}
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => excelInputRef.current?.click()}
                className="px-4 py-2.5 rounded-xl bg-[#0d7377] hover:bg-[#0a5c5f] text-white font-bold text-xs sm:text-sm shadow-xs transition-colors cursor-pointer"
              >
                ⬆ Tải file Excel
              </button>

              <button
                type="button"
                onClick={handleExportExcel}
                className="px-4 py-2.5 rounded-xl bg-[#b84a27] hover:bg-[#9e3e20] text-white font-bold text-xs sm:text-sm shadow-xs transition-colors cursor-pointer"
              >
                ⬇ Xuất Excel —{' '}
                {equipmentSubTab === 'admin'
                  ? 'Danh mục hành chính'
                  : 'Danh mục thuốc'}{' '}
                (Tất cả)
              </button>

              <button
                type="button"
                onClick={handleClearEnteredQuantities}
                className="px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 font-bold text-xs sm:text-sm shadow-xs transition-colors cursor-pointer"
              >
                ↺ Xoá số lượng đã nhập
              </button>

              <button
                type="button"
                onClick={handleResetAndUploadNew}
                className="px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 font-bold text-xs sm:text-sm shadow-xs transition-colors cursor-pointer"
              >
                🗑 Xoá toàn bộ & tải file mới
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleSaveProgressJson}
                className="px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-[#0d7377] text-[#0d7377] dark:text-teal-400 hover:bg-teal-50/50 font-bold text-xs sm:text-sm transition-colors cursor-pointer"
              >
                💾 Lưu tiến độ
              </button>

              <button
                type="button"
                onClick={() => progressJsonInputRef.current?.click()}
                className="px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-dashed border-[#0d7377] text-[#0d7377] dark:text-teal-400 hover:bg-teal-50/50 font-bold text-xs sm:text-sm transition-colors cursor-pointer"
              >
                📁 Tải tiến độ lên
              </button>
            </div>
          </div>

          {/* Sub-tabs: Danh mục hành chính (205) | Danh mục thuốc (55) */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => setEquipmentSubTab('admin')}
              className={`px-5 py-2.5 rounded-t-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                equipmentSubTab === 'admin'
                  ? 'bg-white dark:bg-slate-900 text-[#0f294a] dark:text-white shadow-xs border border-b-0 border-slate-200 dark:border-slate-700'
                  : 'bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              Danh mục hành chính ({adminItems.length})
            </button>

            <button
              type="button"
              onClick={() => setEquipmentSubTab('medicine')}
              className={`px-5 py-2.5 rounded-t-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                equipmentSubTab === 'medicine'
                  ? 'bg-white dark:bg-slate-900 text-[#0f294a] dark:text-white shadow-xs border border-b-0 border-slate-200 dark:border-slate-700'
                  : 'bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              Danh mục thuốc ({medicineItems.length})
            </button>
          </div>

          {/* 4 Summary KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 text-center shadow-xs">
              <p className="text-2xl sm:text-3xl font-extrabold text-[#0f294a] dark:text-white tabular-nums">
                {equipmentKpis.total}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Tổng mục
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 text-center shadow-xs">
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-400 tabular-nums">
                {equipmentKpis.unentered}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Chưa nhập
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 text-center shadow-xs">
              <p className="text-2xl sm:text-3xl font-extrabold text-[#16a34a] tabular-nums">
                {equipmentKpis.enough}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Đủ / Dư {equipmentKpis.surplus}
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 text-center shadow-xs">
              <p className="text-2xl sm:text-3xl font-extrabold text-[#b84a27] tabular-nums">
                {equipmentKpis.shortage}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Thiếu
              </p>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-3.5 border border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center gap-3 shadow-xs">
            <div className="relative flex-1 min-w-[220px]">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm theo tên sản phẩm..."
                className="w-full pl-3.5 pr-9 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0d7377]"
              />
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            </div>

            <select
              value={handlerFilter}
              onChange={(e) => setHandlerFilter(e.target.value)}
              className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200"
            >
              <option value="ALL">Tất cả người xử lý</option>
              {uniqueHandlers.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>

            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { id: 'all', label: 'Tất cả' },
                  { id: 'unentered', label: 'Chưa nhập' },
                  { id: 'enough', label: 'Đủ' },
                  { id: 'shortage', label: 'Thiếu' },
                  { id: 'surplus', label: 'Dư' },
                ] as Array<{ id: EquipmentStatusFilter; label: string }>
              ).map((pill) => (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => setStatusFilter(pill.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors cursor-pointer ${
                    statusFilter === pill.id
                      ? 'bg-[#0f294a] text-white'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>
          </div>

          {/* Equipment Data Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="overflow-x-auto max-h-[600px]">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800/95 border-b border-slate-200 dark:border-slate-700 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="py-3.5 px-3 w-12 text-center">STT</th>
                    <th className="py-3.5 px-3 w-32">NGƯỜI XỬ LÝ</th>
                    <th className="py-3.5 px-3 w-40">LOẠI</th>
                    <th className="py-3.5 px-3 min-w-[260px]">TÊN SẢN PHẨM</th>
                    <th className="py-3.5 px-3 w-20 text-center">ĐVT</th>
                    <th className="py-3.5 px-3 w-24 text-center">SL YÊU CẦU</th>
                    <th className="py-3.5 px-3 w-16 text-center">ĐỦ</th>
                    <th className="py-3.5 px-3 w-28 text-center">SL THỰC TẾ</th>
                    <th className="py-3.5 px-3 w-32 text-center">TRẠNG THÁI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs sm:text-sm">
                  {filteredEquipmentItems.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="py-14 px-4 text-center text-slate-500 dark:text-slate-400"
                      >
                        {equipmentList.length === 0 ? (
                          <div className="flex flex-col items-center justify-center gap-3">
                            <FileSpreadsheet className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                            <div>
                              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                Chưa có dữ liệu trang thiết bị
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                Vui lòng nhấn nút &ldquo;⬆ Tải file Excel&rdquo; ở trên để tải danh sách trang thiết bị khai trương lên hệ thống.
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => excelInputRef.current?.click()}
                              className="mt-1 px-4 py-2 rounded-xl bg-[#0d7377] hover:bg-[#0a5c5f] text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                            >
                              ⬆ Tải file Excel ngay
                            </button>
                          </div>
                        ) : (
                          <span>Không tìm thấy sản phẩm phù hợp với bộ lọc hiện tại.</span>
                        )}
                      </td>
                    </tr>
                  ) : (
                    filteredEquipmentItems.map((item, idx) => {
                      const st = getItemStatus(item);
                      const isEnoughChecked =
                        item.actualQty !== null && item.actualQty === item.requiredQty;

                      return (
                        <tr
                          key={item.id}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                        >
                          <td className="py-2.5 px-3 text-center font-semibold text-slate-500 tabular-nums">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-700 dark:text-slate-300">
                            {item.handler}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="inline-block px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium">
                              {item.type}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100">
                            {item.name}
                          </td>
                          <td className="py-2.5 px-3 text-center text-slate-600 dark:text-slate-400">
                            {item.unit}
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold text-slate-800 dark:text-slate-200 tabular-nums">
                            {item.requiredQty}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={isEnoughChecked}
                              onChange={(e) =>
                                handleToggleItemEnough(item.id, e.target.checked)
                              }
                              className="w-4 h-4 rounded accent-[#0d7377] cursor-pointer"
                            />
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <input
                              type="number"
                              min={0}
                              value={item.actualQty === null ? '' : item.actualQty}
                              onChange={(e) =>
                                handleActualQtyChange(item.id, e.target.value)
                              }
                              placeholder="—"
                              className="w-20 px-2.5 py-1 text-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-slate-900 dark:text-white tabular-nums focus:outline-none focus:ring-2 focus:ring-[#0d7377]"
                            />
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {st === 'enough' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                                <Check className="w-3 h-3" /> Đủ
                              </span>
                            )}
                            {st === 'shortage' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-orange-100 text-[#b84a27] dark:bg-orange-950/60 dark:text-orange-300 tabular-nums">
                                Thiếu {item.requiredQty - (item.actualQty ?? 0)}
                              </span>
                            )}
                            {st === 'surplus' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 tabular-nums">
                                Dư {(item.actualQty ?? 0) - item.requiredQty}
                              </span>
                            )}
                            {st === 'unentered' && (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                Chưa nhập
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 3: CHECK CÁC HẠNG MỤC                                             */}
      {/* ===================================================================== */}
      {activeMainTab === 'checklist' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 shadow-xs">
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                Nghiệm thu các hạng mục chuẩn bị Khai Trương ({checklistProgress}%)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Kiểm tra từng phân khu: Mặt tiền, Lễ tân, Phòng khám, Phòng tiêm, Dây chuyền lạnh GSP & Hồ sơ pháp lý
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setChecklistItems((prev) =>
                    prev.map((i) => ({ ...i, completed: true }))
                  );
                  addToast('Đã đánh dấu hoàn thành 100% các hạng mục!', 'success');
                }}
                className="px-4 py-2 rounded-xl bg-[#0d9488] hover:bg-[#0b7a70] text-white text-xs font-bold cursor-pointer"
              >
                ✓ Đánh dấu đạt 100%
              </button>
            </div>
          </div>

          {/* Add new checklist item */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center gap-3 shadow-xs">
            <select
              value={newChecklistArea}
              onChange={(e) => setNewChecklistArea(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
            >
              <option value="1. Mặt tiền & Biển bảng POSM">1. Mặt tiền & Biển bảng POSM</option>
              <option value="2. Quầy Lễ Tân & Sảnh Tiếp Đón">2. Quầy Lễ Tân & Sảnh Tiếp Đón</option>
              <option value="3. Phòng Khám Sàng Lọc">3. Phòng Khám Sàng Lọc</option>
              <option value="4. Phòng Tiêm Chủng & Cấp Cứu">4. Phòng Tiêm Chủng & Cấp Cứu</option>
              <option value="5. Khu Vực Theo Dõi Sau Tiêm 30 Phút">5. Khu Vực Theo Dõi Sau Tiêm 30 Phút</option>
              <option value="6. Pháp Lý, PCCC & Vệ Sinh Môi Trường">6. Pháp Lý, PCCC & Vệ Sinh Môi Trường</option>
            </select>

            <input
              type="text"
              value={newChecklistTitle}
              onChange={(e) => setNewChecklistTitle(e.target.value)}
              placeholder="Thêm hạng mục kiểm tra mới..."
              className="flex-1 min-w-[220px] px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm"
            />

            <button
              type="button"
              onClick={() => {
                if (!newChecklistTitle.trim()) return;
                setChecklistItems((prev) => [
                  ...prev,
                  {
                    id: `chk_${Date.now()}`,
                    area: newChecklistArea,
                    title: newChecklistTitle.trim(),
                    standard: 'Đạt tiêu chuẩn SOP Trung tâm tiêm chủng Long Châu',
                    completed: true,
                    verifier: centerInfo.leader || 'Nguyễn Lê Đạt Minh',
                    note: 'Đã kiểm tra',
                  },
                ]);
                setNewChecklistTitle('');
                addToast('Đã thêm hạng mục kiểm tra mới!', 'success');
              }}
              className="px-4 py-2 rounded-xl bg-[#0f1e36] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Thêm hạng mục
            </button>
          </div>

          {/* Checklist items table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#0f1e36] text-white text-xs uppercase font-bold">
                <tr>
                  <th className="py-3 px-4 w-14 text-center">Đạt</th>
                  <th className="py-3 px-4 w-56">Khu vực</th>
                  <th className="py-3 px-4">Nội dung hạng mục kiểm tra</th>
                  <th className="py-3 px-4 w-64">Tiêu chuẩn nghiệm thu</th>
                  <th className="py-3 px-4 w-44">Người kiểm tra</th>
                  <th className="py-3 px-4 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs sm:text-sm">
                {checklistItems
                  .filter(
                    (i) =>
                      checklistAreaFilter === 'ALL' || i.area === checklistAreaFilter
                  )
                  .map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    >
                      <td className="py-3 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={item.completed}
                          onChange={(e) =>
                            setChecklistItems((prev) =>
                              prev.map((x) =>
                                x.id === item.id
                                  ? { ...x, completed: e.target.checked }
                                  : x
                              )
                            )
                          }
                          className="w-4 h-4 rounded accent-[#0d9488] cursor-pointer"
                        />
                      </td>
                      <td className="py-3 px-4 font-bold text-[#0d9488]">
                        {item.area}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                        {item.title}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400 text-xs">
                        {item.standard}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-700 dark:text-slate-300">
                        {item.verifier}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() =>
                            setChecklistItems((prev) =>
                              prev.filter((x) => x.id !== item.id)
                            )
                          }
                          className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 4: CÔNG VIỆC TASKFORCE                                            */}
      {/* ===================================================================== */}
      {activeMainTab === 'tasks' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 shadow-xs">
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                Tiến độ Công Việc Taskforce Khai Trương ({jobsProgress}%)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Quản lý lộ trình công việc từ T-7 đến ngày chính thức khai trương {centerInfo.openingDate}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setTaskforceJobs((prev) =>
                    prev.map((j) => ({ ...j, completed: true }))
                  );
                  addToast('Đã hoàn tất 100% đầu việc Taskforce!', 'success');
                }}
                className="px-4 py-2 rounded-xl bg-[#0d9488] hover:bg-[#0b7a70] text-white text-xs font-bold cursor-pointer"
              >
                ✓ Hoàn tất 100% công việc
              </button>
            </div>
          </div>

          {/* Add new job */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center gap-3 shadow-xs">
            <input
              type="text"
              value={newJobPhase}
              onChange={(e) => setNewJobPhase(e.target.value)}
              placeholder="Giai đoạn..."
              className="w-56 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
            />
            <input
              type="text"
              value={newJobTitle}
              onChange={(e) => setNewJobTitle(e.target.value)}
              placeholder="Nhập tên công việc cần thực hiện..."
              className="flex-1 min-w-[220px] px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm"
            />
            <input
              type="text"
              value={newJobAssignee}
              onChange={(e) => setNewJobAssignee(e.target.value)}
              placeholder="Người phụ trách"
              className="w-44 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
            />
            <input
              type="text"
              value={newJobDueDate}
              onChange={(e) => setNewJobDueDate(e.target.value)}
              placeholder="Hạn hoàn thành"
              className="w-32 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs tabular-nums"
            />
            <button
              type="button"
              onClick={() => {
                if (!newJobTitle.trim()) return;
                setTaskforceJobs((prev) => [
                  ...prev,
                  {
                    id: `job_${Date.now()}`,
                    phase: newJobPhase,
                    title: newJobTitle.trim(),
                    assignee: newJobAssignee,
                    dueDate: newJobDueDate,
                    priority: 'Cao',
                    completed: true,
                    note: 'Hoàn thành đúng tiến độ',
                  },
                ]);
                setNewJobTitle('');
                addToast('Đã thêm công việc mới!', 'success');
              }}
              className="px-4 py-2 rounded-xl bg-[#0f1e36] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Thêm việc
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#0f1e36] text-white text-xs uppercase font-bold">
                <tr>
                  <th className="py-3 px-4 w-14 text-center">Xong</th>
                  <th className="py-3 px-4 w-64">Giai đoạn</th>
                  <th className="py-3 px-4">Nội dung công việc</th>
                  <th className="py-3 px-4 w-44">Phụ trách</th>
                  <th className="py-3 px-4 w-28 text-center">Hạn chót</th>
                  <th className="py-3 px-4 w-24 text-center">Ưu tiên</th>
                  <th className="py-3 px-4 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs sm:text-sm">
                {taskforceJobs.map((job) => (
                  <tr
                    key={job.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <td className="py-3 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={job.completed}
                        onChange={(e) =>
                          setTaskforceJobs((prev) =>
                            prev.map((x) =>
                              x.id === job.id
                                ? { ...x, completed: e.target.checked }
                                : x
                            )
                          )
                        }
                        className="w-4 h-4 rounded accent-[#0d9488] cursor-pointer"
                      />
                    </td>
                    <td className="py-3 px-4 font-bold text-[#136f72]">
                      {job.phase}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                      {job.title}
                      {job.note && (
                        <p className="text-xs font-normal text-slate-500 mt-0.5">
                          Ghi chú: {job.note}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-700 dark:text-slate-300">
                      {job.assignee}
                    </td>
                    <td className="py-3 px-4 text-center font-bold tabular-nums text-slate-700 dark:text-slate-300">
                      {job.dueDate}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                        {job.priority}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() =>
                          setTaskforceJobs((prev) =>
                            prev.filter((x) => x.id !== job.id)
                          )
                        }
                        className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 5: HƯỚNG DẪN THẨM ĐỊNH TỦ VẮC XIN GSP                              */}
      {/* ===================================================================== */}
      {activeMainTab === 'fridge_guide' && (
        <div className="space-y-4">
          <div className="bg-[#0f294a] text-white rounded-2xl p-5 sm:p-6 shadow-xs">
            <div className="flex items-center gap-2.5">
              <Thermometer className="w-6 h-6 text-teal-400" />
              <h2 className="text-lg sm:text-xl font-extrabold">
                Hướng Dẫn Thẩm Định Tủ Bảo Quản Vắc Xin (Chuẩn GSP 2°C – 8°C)
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-200 mt-1">
              Quy trình bắt buộc đối với Taskforce & Dược sĩ trước khi nhập vắc xin về Trung tâm {centerInfo.code}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <div className="text-xs font-extrabold uppercase tracking-wider text-[#0d9488] mb-1">
                Bước 1 • Lắp đặt & Sắp xếp
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">
                Vị trí đặt tủ & Bình tích lạnh
              </h3>
              <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5 list-disc pl-4">
                <li>Đặt tủ nơi khô ráo, cách tường tối thiểu 10–15cm, tránh ánh nắng trực tiếp.</li>
                <li>Cắm nguồn điện ưu tiên qua bộ lưu điện UPS 3kVA và hệ thống máy phát ATS.</li>
                <li>Xếp bình tích lạnh (Ice pack) ở ngăn dưới cùng để ổn định nhiệt khi mất điện.</li>
              </ul>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <div className="text-xs font-extrabold uppercase tracking-wider text-[#0d9488] mb-1">
                Bước 2 • Hiệu chuẩn LogTag
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">
                Đầu dò nhiệt kế tự ghi WiFi
              </h3>
              <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5 list-disc pl-4">
                <li>Đặt đầu dò глиcol chính giữa tâm tủ bảo quản, không chạm thành lạnh.</li>
                <li>Cài đặt chu kỳ ghi 5 phút/lần; ngưỡng báo động dưới 2.0°C và trên 8.0°C.</li>
                <li>Kiểm tra kết nối WiFi gửi cảnh báo tự động về điện thoại Leader & Bác sĩ.</li>
              </ul>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <div className="text-xs font-extrabold uppercase tracking-wider text-[#0d9488] mb-1">
                Bước 3 • Thử tải & Giả lập sự cố
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">
                Chạy thử 48h & Ngắt điện giả lập
              </h3>
              <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5 list-disc pl-4">
                <li>Theo dõi liên tục 24h không tải và 24h có tải giả lập, xuất biểu đồ PDF LogTag.</li>
                <li>Thực hiện bài test mở cửa tủ 2 phút để nghiệm thu còi hú tại chỗ.</li>
                <li>Ngắt nguồn điện lưới kiểm tra thời gian lưu điện UPS & giữ lạnh của tủ.</li>
              </ul>
            </div>
          </div>

          {/* Fridge Validation Log Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                Nhật Ký Nghiệm Thu Thẩm Định Tủ Thực Tế — Mã TT: {centerInfo.code}
              </h3>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                <ShieldCheck className="w-3.5 h-3.5" /> Đạt Chuẩn GSP 100%
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#0f1e36] text-white text-xs uppercase font-bold">
                  <tr>
                    <th className="py-3 px-4">Mã tủ / Vị trí</th>
                    <th className="py-3 px-4">Model & Serial LogTag</th>
                    <th className="py-3 px-4">Bước thẩm định</th>
                    <th className="py-3 px-4">Ngưỡng yêu cầu</th>
                    <th className="py-3 px-4">Kết quả đo</th>
                    <th className="py-3 px-4 text-center">Đánh giá</th>
                    <th className="py-3 px-4">Người thẩm định</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs sm:text-sm">
                  {fridgeLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                        {log.fridgeCode}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                        <div className="font-semibold">{log.model}</div>
                        <div className="text-xs text-slate-400 font-mono">{log.sensorSerial}</div>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">
                        {log.stepName}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-600 dark:text-slate-400">
                        {log.targetTemp}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-[#0d9488]">
                        {log.measuredTemp}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                          {log.alarmStatus}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                        <div className="font-semibold">{log.inspector}</div>
                        <div className="text-[11px] text-slate-400 tabular-nums">{log.checkedAt}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 6: CHỤP HÌNH BÁO CÁO                                              */}
      {/* ===================================================================== */}
      {activeMainTab === 'photo_report' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                  Chụp Hình Báo Cáo Hiện Trường Khai Trương
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Lưu trữ hình ảnh nghiệm thu thực tế các hạng mục tại Trung tâm {centerInfo.code} — {centerInfo.address}
                </p>
              </div>

              <button
                type="button"
                onClick={() => photoUploadInputRef.current?.click()}
                className="px-4 py-2.5 rounded-xl bg-[#0d9488] hover:bg-[#0b7a70] text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <Camera className="w-4 h-4" /> Chụp / Tải ảnh báo cáo lên
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <select
                value={photoCategory}
                onChange={(e) => setPhotoCategory(e.target.value)}
                className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm font-semibold"
              >
                <option value="Mặt tiền & Biển hiệu">Mặt tiền & Biển hiệu</option>
                <option value="Quầy lễ tân & Sảnh chờ">Quầy lễ tân & Sảnh chờ</option>
                <option value="Phòng khám sàng lọc">Phòng khám sàng lọc</option>
                <option value="Phòng tiêm & Tủ cấp cứu">Phòng tiêm & Tủ cấp cứu</option>
                <option value="Tủ vắc xin & Nhiệt kế LogTag">Tủ vắc xin & Nhiệt kế LogTag</option>
                <option value="Kiểm kê trang thiết bị">Kiểm kê trang thiết bị</option>
                <option value="Biên bản bàn giao">Biên bản bàn giao</option>
              </select>

              <input
                type="text"
                value={photoTitle}
                onChange={(e) => setPhotoTitle(e.target.value)}
                placeholder="Tiêu đề ảnh (VD: Tủ lạnh vắc xin đạt 4.5 độ C)..."
                className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm"
              />

              <input
                type="text"
                value={photoNote}
                onChange={(e) => setPhotoNote(e.target.value)}
                placeholder="Ghi chú nghiệm thu..."
                className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {reportPhotos.map((photo) => (
              <div
                key={photo.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs flex flex-col"
              >
                <div className="aspect-video bg-slate-100 dark:bg-slate-800 relative overflow-hidden">
                  <img
                    src={photo.imageUrl}
                    alt={photo.title}
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#0f1e36]/85 text-white backdrop-blur-xs">
                    {photo.category}
                  </span>
                </div>
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {photo.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {photo.note}
                    </p>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400">
                    <span>Người chụp: {photo.uploader}</span>
                    <div className="flex items-center gap-2">
                      <span className="tabular-nums">{photo.capturedAt}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setReportPhotos((prev) =>
                            prev.filter((p) => p.id !== photo.id)
                          )
                        }
                        className="text-slate-400 hover:text-rose-600 cursor-pointer"
                        title="Xóa ảnh"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 7: BIÊN BẢN BÀN GIAO (Matches Screenshot 4)                        */}
      {/* ===================================================================== */}
      {activeMainTab === 'handover' && (
        <div className="space-y-4">
          {/* 4 Sub-tabs Bar (Trang thiết bị | Danh mục thuốc | Thiết bị phòng tiêm | CSVC) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 print:hidden">
            {(
              [
                { id: 'equipment', label: 'Trang thiết bị' },
                { id: 'medicine', label: 'Danh mục thuốc' },
                { id: 'injection_room', label: 'Thiết bị phòng tiêm' },
                { id: 'csvc', label: 'CSVC' },
              ] as Array<{ id: HandoverSubTab; label: string }>
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setHandoverSubTab(tab.id)}
                className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  handoverSubTab === tab.id
                    ? 'bg-[#136f72] text-white shadow-xs'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Right-aligned Export PDF A4 Button */}
          <div className="flex justify-end print:hidden">
            <button
              type="button"
              onClick={handlePrintHandoverA4}
              className="px-4 py-2 rounded-lg bg-[#c86428] hover:bg-[#b05520] text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" /> Xuất PDF A4
            </button>
          </div>

          {/* Official Handover Document Card */}
          <div className="bg-white text-slate-900 rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-xs space-y-5 print:shadow-none print:border-none print:p-0">
            {/* Document Header with FPT Retail Long Châu Vaccine Center Branding */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-100">
              {/* Left Brand Block */}
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-start">
                  <div className="flex items-center gap-1">
                    <span className="px-2 py-0.5 rounded bg-[#00529b] text-white font-extrabold text-xs tracking-tight">
                      FPT
                    </span>
                    <span className="px-2 py-0.5 rounded bg-[#f37021] text-white font-extrabold text-xs tracking-tight">
                      Retail
                    </span>
                  </div>
                  <span className="text-[9px] text-slate-500 font-semibold mt-0.5">
                    FPT Digital Retail JSC
                  </span>
                </div>
                <div className="border-l border-slate-200 pl-3">
                  <p className="text-xs font-extrabold text-[#00529b] tracking-tight leading-tight">
                    TRUNG TÂM TIÊM CHỦNG
                  </p>
                  <p className="text-lg font-black text-[#00529b] tracking-tight leading-none">
                    LONG CHÂU
                  </p>
                </div>
              </div>

              {/* Center Title Block */}
              <div className="md:text-center flex-1">
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900 uppercase tracking-tight">
                  {getHandoverTitle(handoverSubTab)}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">
                  Mã TT: {centerInfo.code} — Địa chỉ: {centerInfo.address}
                </p>
              </div>

              <div className="hidden md:block w-36" />
            </div>

            {/* 1. BÊN BÀN GIAO */}
            <div className="space-y-2.5">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#0f1e36]">
                1. BÊN BÀN GIAO
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-600 w-20 shrink-0">
                    Họ và tên:
                  </span>
                  <input
                    type="text"
                    value={handoverParty.delivererName}
                    onChange={(e) =>
                      setHandoverParty({
                        ...handoverParty,
                        delivererName: e.target.value,
                      })
                    }
                    className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs sm:text-sm font-medium text-slate-900"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-600 w-24 shrink-0">
                    Số điện thoại:
                  </span>
                  <input
                    type="text"
                    value={handoverParty.delivererPhone}
                    onChange={(e) =>
                      setHandoverParty({
                        ...handoverParty,
                        delivererPhone: e.target.value,
                      })
                    }
                    className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs sm:text-sm font-medium text-slate-900 tabular-nums"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-600 w-20 shrink-0">
                  Bộ phận:
                </span>
                <span className="inline-block px-3 py-1 rounded-lg bg-[#f3f2ec] text-slate-800 text-xs font-semibold">
                  {handoverParty.delivererDept}
                </span>
              </div>
            </div>

            {/* 2. BÊN NHẬN BÀN GIAO */}
            <div className="space-y-2.5">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#0f1e36]">
                2. BÊN NHẬN BÀN GIAO
              </h3>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-600">Bộ phận:</span>
                  <select
                    value={handoverParty.receiverDept}
                    onChange={(e) =>
                      setHandoverParty({
                        ...handoverParty,
                        receiverDept: e.target.value,
                      })
                    }
                    className="px-2.5 py-1 rounded-lg bg-[#f3f2ec] text-slate-800 text-xs font-semibold border border-slate-200"
                  >
                    <option value="Bác sĩ">Bác sĩ</option>
                    <option value="Điều dưỡng trưởng">Điều dưỡng trưởng</option>
                    <option value="Dược sĩ">Dược sĩ</option>
                    <option value="Quản lý trung tâm">Quản lý trung tâm</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 flex-1 min-w-[220px]">
                  <span className="text-xs text-slate-600 shrink-0">
                    Họ và tên:
                  </span>
                  <input
                    type="text"
                    value={handoverParty.receiverName}
                    onChange={(e) =>
                      setHandoverParty({
                        ...handoverParty,
                        receiverName: e.target.value,
                      })
                    }
                    className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs sm:text-sm font-medium text-slate-900"
                  />
                </div>

                <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                  <span className="text-xs text-slate-600 shrink-0">
                    Số điện thoại:
                  </span>
                  <input
                    type="text"
                    value={handoverParty.receiverPhone}
                    onChange={(e) =>
                      setHandoverParty({
                        ...handoverParty,
                        receiverPhone: e.target.value,
                      })
                    }
                    className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs sm:text-sm font-medium text-slate-900 tabular-nums"
                  />
                </div>
              </div>
            </div>

            {/* Callout Bar: Nội dung bàn giao */}
            <div className="rounded-xl bg-[#eaf4f4] px-4 py-2.5 text-xs sm:text-sm text-slate-800">
              <span className="font-bold">Nội dung bàn giao: </span>
              <span>{handoverParty.handoverNote}</span>
            </div>

            {/* Handover Table */}
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#0f1e36] text-white text-xs font-bold">
                  <tr>
                    <th className="py-2.5 px-3 w-12 text-center">STT</th>
                    <th className="py-2.5 px-3 w-40">Loại</th>
                    <th className="py-2.5 px-3">Tên sản phẩm</th>
                    <th className="py-2.5 px-3 w-20 text-center">ĐVT</th>
                    <th className="py-2.5 px-3 w-24 text-center">SL cấp</th>
                    <th className="py-2.5 px-3 w-24 text-center">SL nhận</th>
                    <th className="py-2.5 px-3 w-48">Ghi chú</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs sm:text-sm">
                  {handoverItems.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="py-10 px-4 text-center text-slate-400 italic"
                      >
                        Chưa có dữ liệu bàn giao — dữ liệu sẽ tự động hiển thị sau khi tải file Excel tại mục &ldquo;Trang thiết bị&rdquo;.
                      </td>
                    </tr>
                  ) : (
                    handoverItems.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 text-center font-semibold text-slate-600 tabular-nums">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-3 text-slate-700">{item.type}</td>
                        <td className="py-2 px-3 font-semibold text-slate-900">
                          {item.name}
                        </td>
                        <td className="py-2 px-3 text-center text-slate-600">
                          {item.unit}
                        </td>
                        <td className="py-2 px-3 text-center font-bold text-slate-800 tabular-nums">
                          {item.requiredQty}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <input
                            type="number"
                            min={0}
                            value={item.actualQty === null ? '' : item.actualQty}
                            onChange={(e) =>
                              handleActualQtyChange(item.id, e.target.value)
                            }
                            className="w-16 px-2 py-1 text-center rounded border border-slate-200 font-bold text-slate-900 tabular-nums"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={item.note}
                            onChange={(e) =>
                              handleItemNoteChange(item.id, e.target.value)
                            }
                            placeholder="—"
                            className="w-full px-2 py-1 rounded border border-transparent hover:border-slate-200 focus:border-slate-300 text-xs text-slate-700"
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Official Signature Footer */}
            <div className="grid grid-cols-2 gap-6 pt-6 text-center">
              <div>
                <p className="text-xs font-extrabold uppercase text-slate-800">
                  ĐẠI DIỆN BÊN BÀN GIAO
                </p>
                <p className="text-[11px] text-slate-500 italic mt-0.5">
                  (Ký và ghi rõ họ tên)
                </p>
                <div className="h-16" />
                <p className="text-xs font-bold text-slate-900">
                  {handoverParty.delivererName}
                </p>
              </div>

              <div>
                <p className="text-xs font-extrabold uppercase text-slate-800">
                  ĐẠI DIỆN BÊN NHẬN BÀN GIAO
                </p>
                <p className="text-[11px] text-slate-500 italic mt-0.5">
                  (Ký và ghi rõ họ tên)
                </p>
                <div className="h-16" />
                <p className="text-xs font-bold text-slate-900">
                  {handoverParty.receiverName}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
