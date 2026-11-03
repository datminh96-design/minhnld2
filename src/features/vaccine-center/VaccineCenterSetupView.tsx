import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  Thermometer,
  ShieldCheck,
  FileSpreadsheet,
  ArrowLeft,
  Eye,
  Clock,
  Building2,
  UserCheck,
  MapPin,
  RotateCcw,
  ChevronRight,
  Lock,
  Unlock,
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
  DEFAULT_CHECKLIST_ITEMS,
  DEFAULT_TASKFORCE_JOBS,
  DEFAULT_FRIDGE_LOGS,
  CsvcHandoverRow,
  DEFAULT_CSVC_SIGNAGE_ROWS,
  DEFAULT_CSVC_TECH_ROWS,
  DEFAULT_INJECTION_ROOM_ROWS,
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

export interface VaccineCenterRecord {
  id: string;
  status: 'in_progress' | 'completed';
  createdAt: string;
  completedAt?: string;
  centerInfo: CenterInfo;
  handoverParty: HandoverPartyInfo;
  equipmentList: EquipmentItem[];
  csvcSignageRows?: CsvcHandoverRow[];
  csvcTechRows?: CsvcHandoverRow[];
  injectionRoomRows?: CsvcHandoverRow[];
  checklistItems: ChecklistItem[];
  taskforceJobs: TaskforceJobItem[];
  fridgeLogs: FridgeValidationLog[];
  reportPhotos: ReportPhotoItem[];
  excelFileName: string;
  lastSavedTime: string;
}

const CENTERS_LIST_STORAGE_KEY = 'tttc_centers_list_v1';
const LEGACY_SINGLE_STORAGE_KEY = 'tttc_setup_state_v3';

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
    'Bàn giao danh mục cơ sở vật chất lần đầu do Taskforce nhận tại shop mới Trung tâm tiêm chủng Long Châu',
  handoverDate: '',
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

function getHandoverItemNoteDisplay(item: EquipmentItem): string {
  if (item.note && item.note.trim() !== '') {
    return item.note.trim();
  }
  const st = getItemStatus(item);
  if (st === 'enough') return 'Đủ';
  if (st === 'shortage') return `Thiếu ${item.requiredQty - (item.actualQty ?? 0)}`;
  if (st === 'surplus') return `Dư ${(item.actualQty ?? 0) - item.requiredQty}`;
  return 'Chưa nhập';
}

function formatHandoverDatePrintLine(dateStr?: string): string {
  const raw = (dateStr || '').trim();
  if (!raw) {
    return 'Ngày ...... Tháng ...... năm ..........';
  }
  const slashParts = raw.split(/[/-]/);
  if (slashParts.length === 3) {
    if (slashParts[0].length === 4) {
      const [yyyy, mm, dd] = slashParts;
      return `Ngày ${dd.padStart(2, '0')} Tháng ${mm.padStart(2, '0')} năm ${yyyy}`;
    }
    const [dd, mm, yyyy] = slashParts;
    if (dd && mm && yyyy) {
      return `Ngày ${dd.padStart(2, '0')} Tháng ${mm.padStart(2, '0')} năm ${yyyy}`;
    }
  }
  return `Ngày ${raw}`;
}

function createBlankCenterRecord(initialInfo?: Partial<CenterInfo>): VaccineCenterRecord {
  const mergedInfo: CenterInfo = {
    ...EMPTY_CENTER_INFO,
    ...initialInfo,
  };
  return {
    id: `tttc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    status: 'in_progress',
    createdAt: formatNowVi(),
    centerInfo: mergedInfo,
    handoverParty: {
      ...EMPTY_HANDOVER_PARTY,
      delivererName: mergedInfo.leader || '',
      handoverDate: '',
    },
    equipmentList: [],
    csvcSignageRows: DEFAULT_CSVC_SIGNAGE_ROWS.map((r) => ({ ...r })),
    csvcTechRows: DEFAULT_CSVC_TECH_ROWS.map((r) => ({ ...r })),
    injectionRoomRows: DEFAULT_INJECTION_ROOM_ROWS.map((r) => ({ ...r })),
    checklistItems: DEFAULT_CHECKLIST_ITEMS.map((i) => ({ ...i })),
    taskforceJobs: DEFAULT_TASKFORCE_JOBS.map((j) => ({ ...j })),
    fridgeLogs: DEFAULT_FRIDGE_LOGS.map((l) => ({ ...l })),
    reportPhotos: [],
    excelFileName: '',
    lastSavedTime: '',
  };
}

export const VaccineCenterSetupView: React.FC = () => {
  const { addToast } = useData();

  // Load list of centers (migrating any existing single-center data from tttc_setup_state_v3)
  const [centers, setCenters] = useState<VaccineCenterRecord[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const rawList = localStorage.getItem(CENTERS_LIST_STORAGE_KEY);
        if (rawList) {
          const parsedList = JSON.parse(rawList);
          if (Array.isArray(parsedList)) {
            return parsedList;
          }
        }

        // Check legacy single-center state so user doesn't lose what they already typed
        const rawLegacy = localStorage.getItem(LEGACY_SINGLE_STORAGE_KEY);
        if (rawLegacy) {
          const parsedLegacy = JSON.parse(rawLegacy);
          if (
            parsedLegacy &&
            parsedLegacy.centerInfo &&
            (parsedLegacy.centerInfo.code ||
              parsedLegacy.centerInfo.address ||
              parsedLegacy.centerInfo.leader ||
              (Array.isArray(parsedLegacy.equipmentList) &&
                parsedLegacy.equipmentList.length > 0))
          ) {
            const migratedRecord: VaccineCenterRecord = {
              id: `tttc_migrated_${Date.now()}`,
              status: 'in_progress',
              createdAt: parsedLegacy.lastSavedTime || formatNowVi(),
              centerInfo: parsedLegacy.centerInfo || EMPTY_CENTER_INFO,
              handoverParty: parsedLegacy.handoverParty || EMPTY_HANDOVER_PARTY,
              equipmentList: Array.isArray(parsedLegacy.equipmentList)
                ? parsedLegacy.equipmentList
                : [],
              checklistItems: Array.isArray(parsedLegacy.checklistItems)
                ? parsedLegacy.checklistItems
                : DEFAULT_CHECKLIST_ITEMS,
              taskforceJobs: Array.isArray(parsedLegacy.taskforceJobs)
                ? parsedLegacy.taskforceJobs
                : DEFAULT_TASKFORCE_JOBS,
              fridgeLogs: Array.isArray(parsedLegacy.fridgeLogs)
                ? parsedLegacy.fridgeLogs
                : DEFAULT_FRIDGE_LOGS,
              reportPhotos: Array.isArray(parsedLegacy.reportPhotos)
                ? parsedLegacy.reportPhotos
                : [],
              excelFileName: parsedLegacy.excelFileName || '',
              lastSavedTime: parsedLegacy.lastSavedTime || formatNowVi(),
            };
            return [migratedRecord];
          }
        }
      } catch {
        // ignore storage errors
      }
    }
    return [];
  });

  // selectedCenterId === null means we are on the Directory List view (Đang khai trương / Đã hoàn thành)
  const [selectedCenterId, setSelectedCenterId] = useState<string | null>(null);
  const [listSearchQuery, setListSearchQuery] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newCenterForm, setNewCenterForm] = useState<CenterInfo>(EMPTY_CENTER_INFO);

  // Active 7-tab inside a selected center
  const [activeMainTab, setActiveMainTab] = useState<SetupMainTab>('center_info');

  // Persist centers list to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(CENTERS_LIST_STORAGE_KEY, JSON.stringify(centers));
    } catch {
      // ignore quota error
    }
  }, [centers]);

  const selectedCenter = useMemo(
    () => centers.find((c) => c.id === selectedCenterId) || null,
    [centers, selectedCenterId]
  );

  const isReadOnlyReview = selectedCenter?.status === 'completed';

  // Helper to update currently selected center record
  const updateSelectedCenter = (
    updater: (prev: VaccineCenterRecord) => VaccineCenterRecord
  ) => {
    if (!selectedCenterId) return;
    setCenters((prev) =>
      prev.map((c) => (c.id === selectedCenterId ? updater(c) : c))
    );
  };

  // Directory filtered lists
  const filteredCenters = useMemo(() => {
    if (!listSearchQuery.trim()) return centers;
    const q = listSearchQuery.toLowerCase().trim();
    return centers.filter(
      (c) =>
        c.centerInfo.code.toLowerCase().includes(q) ||
        c.centerInfo.address.toLowerCase().includes(q) ||
        c.centerInfo.leader.toLowerCase().includes(q) ||
        c.centerInfo.asm.toLowerCase().includes(q)
    );
  }, [centers, listSearchQuery]);

  const inProgressCenters = useMemo(
    () => filteredCenters.filter((c) => c.status === 'in_progress'),
    [filteredCenters]
  );

  const completedCenters = useMemo(
    () => filteredCenters.filter((c) => c.status === 'completed'),
    [filteredCenters]
  );

  // Directory actions
  const handleCreateNewCenter = (e: React.FormEvent) => {
    e.preventDefault();
    const record = createBlankCenterRecord(newCenterForm);
    setCenters((prev) => [record, ...prev]);
    setNewCenterForm(EMPTY_CENTER_INFO);
    setShowCreateModal(false);
    setSelectedCenterId(record.id);
    setActiveMainTab('center_info');
    addToast(
      `Đã tạo hồ sơ khai trương TTTC ${record.centerInfo.code || 'mới'}!`,
      'success'
    );
  };

  const handleQuickStartEmptyCenter = () => {
    const record = createBlankCenterRecord();
    setCenters((prev) => [record, ...prev]);
    setSelectedCenterId(record.id);
    setActiveMainTab('center_info');
  };

  const handleMarkCenterCompleted = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const nowStr = formatNowVi();
    setCenters((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              status: 'completed',
              completedAt: nowStr,
              lastSavedTime: nowStr,
            }
          : c
      )
    );
    addToast(
      'Đã chuyển TTTC sang danh sách Đã hoàn thành khai trương!',
      'success'
    );
  };

  const handleReopenCenter = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCenters((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              status: 'in_progress',
              completedAt: undefined,
            }
          : c
      )
    );
    addToast('Đã chuyển TTTC về danh sách Đang khai trương để chỉnh sửa.', 'info');
  };

  const handleDeleteCenter = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCenters((prev) => prev.filter((c) => c.id !== id));
    if (selectedCenterId === id) {
      setSelectedCenterId(null);
    }
    addToast('Đã xóa hồ sơ TTTC khỏi danh sách.', 'info');
  };

  // ============================================================================
  // Detail View State & Handlers (for selectedCenter)
  // ============================================================================
  const centerInfo = selectedCenter?.centerInfo || EMPTY_CENTER_INFO;
  const handoverParty = selectedCenter?.handoverParty || EMPTY_HANDOVER_PARTY;
  const equipmentList = selectedCenter?.equipmentList || [];
  const csvcSignageRows = useMemo(
    () =>
      selectedCenter?.csvcSignageRows && selectedCenter.csvcSignageRows.length > 0
        ? selectedCenter.csvcSignageRows
        : DEFAULT_CSVC_SIGNAGE_ROWS,
    [selectedCenter?.csvcSignageRows]
  );
  const csvcTechRows = useMemo(
    () =>
      selectedCenter?.csvcTechRows && selectedCenter.csvcTechRows.length > 0
        ? selectedCenter.csvcTechRows
        : DEFAULT_CSVC_TECH_ROWS,
    [selectedCenter?.csvcTechRows]
  );
  const injectionRoomRows = useMemo(
    () =>
      selectedCenter?.injectionRoomRows && selectedCenter.injectionRoomRows.length > 0
        ? selectedCenter.injectionRoomRows
        : DEFAULT_INJECTION_ROOM_ROWS,
    [selectedCenter?.injectionRoomRows]
  );
  const checklistItems = selectedCenter?.checklistItems || [];
  const taskforceJobs = selectedCenter?.taskforceJobs || [];
  const fridgeLogs = selectedCenter?.fridgeLogs || [];
  const reportPhotos = selectedCenter?.reportPhotos || [];
  const excelFileName = selectedCenter?.excelFileName || '';
  const lastSavedTime = selectedCenter?.lastSavedTime || '';

  // Tab 2 (Equipment) filters & sub-tabs
  const [equipmentSubTab, setEquipmentSubTab] = useState<EquipmentCategoryTab>('admin');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [handlerFilter, setHandlerFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<EquipmentStatusFilter>('all');

  // Tab 3 (Checklist) filter & new item state
  const [checklistAreaFilter] = useState<string>('ALL');
  const [newChecklistTitle, setNewChecklistTitle] = useState<string>('');
  const [newChecklistArea, setNewChecklistArea] = useState<string>('1. Mặt tiền & Biển bảng POSM');

  // Tab 4 (Tasks) new job state
  const [newJobTitle, setNewJobTitle] = useState<string>('');
  const [newJobPhase, setNewJobPhase] = useState<string>('Giai đoạn 5: Bàn giao & Khai trương (T-0)');
  const [newJobAssignee, setNewJobAssignee] = useState<string>('');
  const [newJobDueDate, setNewJobDueDate] = useState<string>('');

  // Tab 6 (Photo report) upload state
  const [photoCategory, setPhotoCategory] = useState<string>('Mặt tiền & Biển hiệu');
  const [photoTitle, setPhotoTitle] = useState<string>('');
  const [photoNote, setPhotoNote] = useState<string>('');

  // Tab 7 (Handover) sub-tab
  const [handoverSubTab, setHandoverSubTab] = useState<HandoverSubTab>('csvc');

  // Hidden file input refs
  const excelInputRef = useRef<HTMLInputElement | null>(null);
  const progressJsonInputRef = useRef<HTMLInputElement | null>(null);
  const photoUploadInputRef = useRef<HTMLInputElement | null>(null);

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
    if (handoverSubTab === 'medicine') {
      return equipmentList.filter((item) => item.tab === 'medicine');
    }
    if (handoverSubTab === 'injection_room') {
      return equipmentList.filter((item) => {
        if (item.tab !== 'admin') return false;
        const t = (item.type || '').toLowerCase();
        return t.includes('phòng tiêm') || t.includes('phong tiem');
      });
    }
    if (handoverSubTab === 'equipment') {
      return equipmentList.filter((item) => {
        if (item.tab !== 'admin') return false;
        const t = (item.type || '').toLowerCase();
        return !t.includes('phòng tiêm') && !t.includes('phong tiem');
      });
    }
    return [];
  }, [equipmentList, handoverSubTab]);

  // Handlers for Tab 1: Thông tin trung tâm
  const updateCenterField = (field: keyof CenterInfo, value: string) => {
    if (isReadOnlyReview) return;
    updateSelectedCenter((prev) => {
      const updatedInfo = { ...prev.centerInfo, [field]: value };
      return {
        ...prev,
        centerInfo: updatedInfo,
        handoverParty:
          field === 'leader'
            ? { ...prev.handoverParty, delivererName: value }
            : prev.handoverParty,
      };
    });
  };

  const handleSaveCenterInfo = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnlyReview) return;
    const nowStr = formatNowVi();
    updateSelectedCenter((prev) => ({
      ...prev,
      lastSavedTime: nowStr,
      handoverParty: {
        ...prev.handoverParty,
        delivererName: prev.centerInfo.leader || prev.handoverParty.delivererName,
      },
    }));
    addToast('Đã lưu thông tin Trung Tâm Tiêm Chủng thành công!', 'success');
  };

  const handleClearCenterInfo = () => {
    if (isReadOnlyReview) return;
    updateSelectedCenter((prev) => ({
      ...prev,
      centerInfo: EMPTY_CENTER_INFO,
      handoverParty: {
        ...prev.handoverParty,
        delivererName: '',
      },
    }));
    addToast('Đã xóa trống dữ liệu thông tin trung tâm.', 'info');
  };

  // Handlers for Tab 2: Trang thiết bị
  const handleToggleItemEnough = (id: string, checked: boolean) => {
    if (isReadOnlyReview) return;
    const nowStr = formatNowVi();
    updateSelectedCenter((prev) => ({
      ...prev,
      lastSavedTime: nowStr,
      equipmentList: prev.equipmentList.map((item) =>
        item.id === id
          ? {
              ...item,
              actualQty: checked ? item.requiredQty : null,
            }
          : item
      ),
    }));
  };

  const handleActualQtyChange = (id: string, valueStr: string) => {
    if (isReadOnlyReview) return;
    const parsed = valueStr.trim() === '' ? null : Math.max(0, Number(valueStr));
    const nowStr = formatNowVi();
    updateSelectedCenter((prev) => ({
      ...prev,
      lastSavedTime: nowStr,
      equipmentList: prev.equipmentList.map((item) =>
        item.id === id
          ? {
              ...item,
              actualQty: Number.isNaN(parsed as number) ? null : parsed,
            }
          : item
      ),
    }));
  };

  const handleItemNoteChange = (id: string, note: string) => {
    if (isReadOnlyReview) return;
    const nowStr = formatNowVi();
    updateSelectedCenter((prev) => ({
      ...prev,
      lastSavedTime: nowStr,
      equipmentList: prev.equipmentList.map((item) =>
        item.id === id ? { ...item, note } : item
      ),
    }));
  };

  const handleClearEnteredQuantities = () => {
    if (isReadOnlyReview) return;
    const nowStr = formatNowVi();
    updateSelectedCenter((prev) => ({
      ...prev,
      lastSavedTime: nowStr,
      equipmentList: prev.equipmentList.map((item) =>
        item.tab === equipmentSubTab ? { ...item, actualQty: null } : item
      ),
    }));
    addToast(
      `Đã xoá số lượng đã nhập của ${
        equipmentSubTab === 'admin' ? 'Danh mục hành chính' : 'Danh mục thuốc'
      }.`,
      'info'
    );
  };

  const handleResetAndUploadNew = () => {
    if (isReadOnlyReview) return;
    updateSelectedCenter((prev) => ({
      ...prev,
      equipmentList: [],
      excelFileName: '',
      lastSavedTime: '',
    }));
    addToast('Đã xoá toàn bộ dữ liệu trang thiết bị. Vui lòng chọn file Excel mới.', 'info');
    if (excelInputRef.current) {
      excelInputRef.current.value = '';
      excelInputRef.current.click();
    }
  };

  const handleExcelFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || isReadOnlyReview) return;

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

          let headerRowIdx = -1;
          const colMap = {
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
              const candidates = row
                .map((c, idx) => ({ text: String(c ?? '').trim(), idx }))
                .filter((x) => x.text.length > 2 && Number.isNaN(Number(x.text)));
              if (candidates.length > 0) {
                nameVal = candidates.sort((a, b) => b.text.length - a.text.length)[0].text;
              }
            }

            if (!nameVal) continue;
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
              typeLower.includes('phong tiem')
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
          const nowStr = formatNowVi();
          updateSelectedCenter((prev) => ({
            ...prev,
            equipmentList: importedItems,
            excelFileName: file.name,
            lastSavedTime: nowStr,
          }));
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
    if (!selectedCenter) return;
    const nowStr = formatNowVi();
    const updatedRecord: VaccineCenterRecord = {
      ...selectedCenter,
      lastSavedTime: nowStr,
    };
    updateSelectedCenter(() => updatedRecord);
    const blob = new Blob([JSON.stringify(updatedRecord, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Tien_Do_Khai_Truong_TT_${centerInfo.code || 'Moi'}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addToast('Đã lưu tiến độ vào hệ thống & tải file sao lưu tiến độ!', 'success');
  };

  const handleLoadProgressJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || isReadOnlyReview) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(String(evt.target?.result || '{}'));
        const nowStr = formatNowVi();
        updateSelectedCenter((prev) => ({
          ...prev,
          centerInfo: parsed.centerInfo || prev.centerInfo,
          handoverParty: parsed.handoverParty || prev.handoverParty,
          equipmentList: Array.isArray(parsed.equipmentList)
            ? parsed.equipmentList
            : prev.equipmentList,
          checklistItems: Array.isArray(parsed.checklistItems)
            ? parsed.checklistItems
            : prev.checklistItems,
          taskforceJobs: Array.isArray(parsed.taskforceJobs)
            ? parsed.taskforceJobs
            : prev.taskforceJobs,
          fridgeLogs: Array.isArray(parsed.fridgeLogs)
            ? parsed.fridgeLogs
            : prev.fridgeLogs,
          reportPhotos: Array.isArray(parsed.reportPhotos)
            ? parsed.reportPhotos
            : prev.reportPhotos,
          excelFileName: parsed.excelFileName || prev.excelFileName,
          lastSavedTime: nowStr,
        }));
        addToast('Đã tải tiến độ khai trương lên thành công!', 'success');
      } catch {
        addToast('File tiến độ không hợp lệ.', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || isReadOnlyReview) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const dataUrl = String(evt.target?.result || '');
      if (!dataUrl) return;
      const newPhoto: ReportPhotoItem = {
        id: `pho_${Date.now()}`,
        category: photoCategory,
        title: photoTitle.trim() || `${photoCategory} — TT ${centerInfo.code || ''}`,
        imageUrl: dataUrl,
        capturedAt: formatNowVi(),
        uploader: centerInfo.leader || 'Taskforce',
        note: photoNote.trim() || 'Đã nghiệm thu thực tế tại trung tâm',
      };
      updateSelectedCenter((prev) => ({
        ...prev,
        reportPhotos: [newPhoto, ...prev.reportPhotos],
        lastSavedTime: formatNowVi(),
      }));
      setPhotoTitle('');
      setPhotoNote('');
      addToast('Đã thêm hình ảnh báo cáo khai trương!', 'success');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handlePrintHandoverA4 = () => {
    window.print();
  };

  const getHandoverTitle = (sub: HandoverSubTab) => {
    switch (sub) {
      case 'equipment':
        return 'BIÊN BẢN BÀN GIAO TRANG THIẾT BỊ';
      case 'medicine':
        return 'BIÊN BẢN BÀN GIAO DANH MỤC THUỐC';
      case 'injection_room':
        return 'BIÊN BẢN BÀN GIAO THIẾT BỊ PHÒNG TIÊM';
      case 'csvc':
        return 'BIÊN BẢN BÀN GIAO CƠ SỞ VẬT CHẤT';
    }
  };

  const getHandoverNoteText = (sub: HandoverSubTab) => {
    switch (sub) {
      case 'csvc':
        return 'Bàn giao danh mục cơ sở vật chất lần đầu do Taskforce nhận tại shop mới Trung tâm tiêm chủng Long Châu';
      case 'injection_room':
        return 'Bàn giao danh mục thiết bị phòng tiêm lần đầu do Taskforce nhận tại shop mới Trung tâm tiêm chủng Long Châu';
      case 'medicine':
        return 'Bàn giao danh mục thuốc & vật tư y tế lần đầu do Taskforce nhận tại shop mới Trung tâm tiêm chủng Long Châu';
      case 'equipment':
      default:
        return 'Bàn giao trang thiết bị lần đầu do Taskforce nhận tại shop mới Trung tâm tiêm chủng Long Châu';
    }
  };

  // Handlers for CSVC Signage / Tech / Injection Room editable rows
  const handleUpdateCsvcRow = (
    listKey: 'csvcSignageRows' | 'csvcTechRows' | 'injectionRoomRows',
    rowId: string,
    field: keyof CsvcHandoverRow,
    value: string | number
  ) => {
    if (isReadOnlyReview) return;
    updateSelectedCenter((prev) => {
      const currentList =
        listKey === 'csvcSignageRows'
          ? prev.csvcSignageRows || DEFAULT_CSVC_SIGNAGE_ROWS
          : listKey === 'csvcTechRows'
          ? prev.csvcTechRows || DEFAULT_CSVC_TECH_ROWS
          : prev.injectionRoomRows || DEFAULT_INJECTION_ROOM_ROWS;

      return {
        ...prev,
        lastSavedTime: formatNowVi(),
        [listKey]: currentList.map((r) =>
          r.id === rowId ? { ...r, [field]: value } : r
        ),
      };
    });
  };

  const handleAddCsvcRow = (
    listKey: 'csvcSignageRows' | 'csvcTechRows' | 'injectionRoomRows'
  ) => {
    if (isReadOnlyReview) return;
    updateSelectedCenter((prev) => {
      const currentList =
        listKey === 'csvcSignageRows'
          ? prev.csvcSignageRows || DEFAULT_CSVC_SIGNAGE_ROWS
          : listKey === 'csvcTechRows'
          ? prev.csvcTechRows || DEFAULT_CSVC_TECH_ROWS
          : prev.injectionRoomRows || DEFAULT_INJECTION_ROOM_ROWS;

      const newRow: CsvcHandoverRow = {
        id: `${listKey}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: '',
        qty: 1,
        unit: 'Cái',
        note: '',
      };

      return {
        ...prev,
        lastSavedTime: formatNowVi(),
        [listKey]: [...currentList, newRow],
      };
    });
  };

  const handleDeleteCsvcRow = (
    listKey: 'csvcSignageRows' | 'csvcTechRows' | 'injectionRoomRows',
    rowId: string
  ) => {
    if (isReadOnlyReview) return;
    updateSelectedCenter((prev) => {
      const currentList =
        listKey === 'csvcSignageRows'
          ? prev.csvcSignageRows || DEFAULT_CSVC_SIGNAGE_ROWS
          : listKey === 'csvcTechRows'
          ? prev.csvcTechRows || DEFAULT_CSVC_TECH_ROWS
          : prev.injectionRoomRows || DEFAULT_INJECTION_ROOM_ROWS;

      return {
        ...prev,
        lastSavedTime: formatNowVi(),
        [listKey]: currentList.filter((r) => r.id !== rowId),
      };
    });
  };

  // ============================================================================
  // VIEW 1: DANH SÁCH TTTC ĐANG KHAI TRƯƠNG & ĐÃ HOÀN THÀNH KHAI TRƯƠNG
  // ============================================================================
  if (!selectedCenter) {
    return (
      <div className="space-y-6 pb-12">
        {/* Top Directory Banner */}
        <div className="rounded-2xl bg-gradient-to-r from-[#0d9488] via-[#0ea599] to-[#10b2a5] text-white p-5 sm:p-6 shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                Quản Lý Khai Trương Trung Tâm Tiêm Chủng (TTTC)
              </h1>
              <p className="text-xs sm:text-sm text-white/90 mt-1 font-medium">
                Danh sách TTTC đang khai trương & lưu trữ hồ sơ các TTTC đã hoàn thành khai trương
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2.5 rounded-xl bg-[#0f1e36] hover:bg-slate-900 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-colors shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Thêm TTTC Đang Khai Trương
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t border-white/25">
            <div className="bg-white/15 backdrop-blur-xs rounded-xl px-3.5 py-2.5">
              <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-white/80">
                Tổng Số TTTC
              </p>
              <p className="text-lg sm:text-2xl font-extrabold text-white tabular-nums mt-0.5">
                {centers.length}
              </p>
            </div>

            <div className="bg-white text-slate-900 rounded-xl px-3.5 py-2.5 shadow-xs">
              <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#0d9488]">
                Đang Khai Trương
              </p>
              <p className="text-lg sm:text-2xl font-extrabold text-slate-900 tabular-nums mt-0.5">
                {centers.filter((c) => c.status === 'in_progress').length}
              </p>
            </div>

            <div className="bg-white text-slate-900 rounded-xl px-3.5 py-2.5 shadow-xs">
              <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-600">
                Đã Hoàn Thành
              </p>
              <p className="text-lg sm:text-2xl font-extrabold text-emerald-700 tabular-nums mt-0.5">
                {centers.filter((c) => c.status === 'completed').length}
              </p>
            </div>
          </div>
        </div>

        {/* Create New TTTC Modal / Inline Card */}
        {showCreateModal && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 border-2 border-[#0d9488] shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                  Tạo Mới TTTC Đang Khai Trương
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Nhập thông tin cơ bản (hoặc tạo trống để điền sau trong phần Thông tin trung tâm)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                Đóng ✕
              </button>
            </div>

            <form onSubmit={handleCreateNewCenter} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Mã trung tâm
                  </label>
                  <input
                    type="text"
                    value={newCenterForm.code}
                    onChange={(e) =>
                      setNewCenterForm({ ...newCenterForm, code: e.target.value })
                    }
                    placeholder="VD: 58270"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Leader phụ trách
                  </label>
                  <input
                    type="text"
                    value={newCenterForm.leader}
                    onChange={(e) =>
                      setNewCenterForm({ ...newCenterForm, leader: e.target.value })
                    }
                    placeholder="VD: Nguyễn Lê Đạt Minh"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-1">
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Địa chỉ trung tâm
                  </label>
                  <input
                    type="text"
                    value={newCenterForm.address}
                    onChange={(e) =>
                      setNewCenterForm({ ...newCenterForm, address: e.target.value })
                    }
                    placeholder="VD: 288b Võ Thị Sáu, P. Trấn Biên"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Ngày khai trương
                  </label>
                  <input
                    type="text"
                    value={newCenterForm.openingDate}
                    onChange={(e) =>
                      setNewCenterForm({
                        ...newCenterForm,
                        openingDate: e.target.value,
                      })
                    }
                    placeholder="DD/MM/YYYY"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    ASM phụ trách
                  </label>
                  <input
                    type="text"
                    value={newCenterForm.asm}
                    onChange={(e) =>
                      setNewCenterForm({ ...newCenterForm, asm: e.target.value })
                    }
                    placeholder="VD: Nguyễn Chí Quang"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#0d9488] hover:bg-[#0b7a70] text-white text-xs sm:text-sm font-bold cursor-pointer"
                >
                  Tạo & Mở Checklist Khai Trương →
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Search Bar */}
        {centers.length > 0 && (
          <div className="relative">
            <input
              type="text"
              value={listSearchQuery}
              onChange={(e) => setListSearchQuery(e.target.value)}
              placeholder="Tìm kiếm TTTC theo Mã TT, Địa chỉ, Leader, ASM..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs sm:text-sm text-slate-900 dark:text-slate-100 shadow-xs focus:outline-none focus:ring-2 focus:ring-[#0d9488]"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          </div>
        )}

        {/* SECTION 1: DANH SÁCH ĐANG KHAI TRƯƠNG */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#0d9488] animate-pulse" />
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                1. Danh Sách TTTC Đang Khai Trương ({inProgressCenters.length})
              </h2>
            </div>
            <button
              type="button"
              onClick={handleQuickStartEmptyCenter}
              className="text-xs font-bold text-[#0d9488] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Tạo nhanh TTTC mới
            </button>
          </div>

          {inProgressCenters.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-dashed border-slate-300 dark:border-slate-800 text-center space-y-3">
              <Building2 className="w-10 h-10 text-teal-500 mx-auto opacity-80" />
              <div>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Chưa có TTTC nào trong danh sách Đang khai trương
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Nhấn nút bên dưới để bắt đầu thiết lập Checklist Setup Trung Tâm Tiêm Chủng mới.
                </p>
              </div>
              <button
                type="button"
                onClick={handleQuickStartEmptyCenter}
                className="px-5 py-2.5 rounded-xl bg-[#0d9488] hover:bg-[#0b7a70] text-white font-bold text-xs sm:text-sm inline-flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Bắt đầu Khai Trương TTTC Mới
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {inProgressCenters.map((center) => {
                const chkDone = center.checklistItems.filter((i) => i.completed).length;
                const chkPct =
                  center.checklistItems.length > 0
                    ? Math.round((chkDone / center.checklistItems.length) * 100)
                    : 0;
                const jobDone = center.taskforceJobs.filter((j) => j.completed).length;
                const jobPct =
                  center.taskforceJobs.length > 0
                    ? Math.round((jobDone / center.taskforceJobs.length) * 100)
                    : 0;

                return (
                  <div
                    key={center.id}
                    onClick={() => {
                      setSelectedCenterId(center.id);
                      setActiveMainTab('center_info');
                    }}
                    className="group bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/90 dark:border-slate-800 hover:border-[#0d9488] shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between gap-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2.5 py-1 rounded-lg bg-[#0d9488]/10 text-[#0d9488] dark:text-teal-300 font-extrabold text-xs tabular-nums">
                            MÃ TT: {center.centerInfo.code || 'Chưa nhập'}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                            <Clock className="w-3 h-3" /> Đang khai trương
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => handleDeleteCenter(center.id, e)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                          title="Xóa TTTC này"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div>
                        <h3 className="text-base font-extrabold text-slate-900 dark:text-white group-hover:text-[#0d9488] transition-colors flex items-center gap-1.5">
                          <MapPin className="w-4 h-4 text-[#0d9488] shrink-0" />
                          <span>
                            {center.centerInfo.address || 'Chưa nhập địa chỉ trung tâm'}
                          </span>
                        </h3>
                      </div>

                      <div className="grid grid-cols-3 gap-2 pt-1 text-xs">
                        <div className="bg-slate-50 dark:bg-slate-800/70 rounded-xl p-2.5">
                          <p className="text-[10px] font-bold uppercase text-slate-400">
                            LEADER
                          </p>
                          <p className="font-bold text-slate-800 dark:text-slate-200 truncate mt-0.5">
                            {center.centerInfo.leader || '—'}
                          </p>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-800/70 rounded-xl p-2.5">
                          <p className="text-[10px] font-bold uppercase text-slate-400">
                            KHAI TRƯƠNG
                          </p>
                          <p className="font-bold text-slate-800 dark:text-slate-200 tabular-nums truncate mt-0.5">
                            {center.centerInfo.openingDate || '—'}
                          </p>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-800/70 rounded-xl p-2.5">
                          <p className="text-[10px] font-bold uppercase text-slate-400">
                            ASM
                          </p>
                          <p className="font-bold text-slate-800 dark:text-slate-200 truncate mt-0.5">
                            {center.centerInfo.asm || '—'}
                          </p>
                        </div>
                      </div>

                      {/* Mini Progress Pills */}
                      <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-bold">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 tabular-nums">
                          Thiết bị: {center.equipmentList.length} mục
                        </span>
                        <span className="px-2.5 py-1 rounded-lg bg-[#d2f4ee] text-[#0c6b63] tabular-nums">
                          Hạng mục: {chkPct}%
                        </span>
                        <span className="px-2.5 py-1 rounded-lg bg-[#d2f4ee] text-[#0c6b63] tabular-nums">
                          Công việc: {jobPct}%
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={(e) => handleMarkCenterCompleted(center.id, e)}
                        className="px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Hoàn thành khai trương
                      </button>

                      <span className="px-3.5 py-2 rounded-xl bg-[#0f1e36] text-white font-bold text-xs inline-flex items-center gap-1 group-hover:bg-[#0d9488] transition-colors">
                        Vào Checklist Setup <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* SECTION 2: DANH SÁCH ĐÃ HOÀN THÀNH KHAI TRƯƠNG */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
              2. Danh Sách TTTC Đã Hoàn Thành Khai Trương ({completedCenters.length})
            </h2>
          </div>

          {completedCenters.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 text-center text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Chưa có TTTC nào hoàn thành khai trương. Khi một TTTC đang khai trương hoàn tất, nhấn &ldquo;Hoàn thành khai trương&rdquo; để lưu vào danh sách này để xem lại bất cứ lúc nào.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {completedCenters.map((center) => {
                const chkDone = center.checklistItems.filter((i) => i.completed).length;
                const chkPct =
                  center.checklistItems.length > 0
                    ? Math.round((chkDone / center.checklistItems.length) * 100)
                    : 0;
                const jobDone = center.taskforceJobs.filter((j) => j.completed).length;
                const jobPct =
                  center.taskforceJobs.length > 0
                    ? Math.round((jobDone / center.taskforceJobs.length) * 100)
                    : 0;

                return (
                  <div
                    key={center.id}
                    onClick={() => {
                      setSelectedCenterId(center.id);
                      setActiveMainTab('center_info');
                    }}
                    className="group bg-white dark:bg-slate-900 rounded-2xl p-5 border border-emerald-500/30 hover:border-emerald-500 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between gap-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-extrabold text-xs tabular-nums">
                            MÃ TT: {center.centerInfo.code || '—'}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                            <CheckCircle2 className="w-3 h-3" /> Đã hoàn thành
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => handleDeleteCenter(center.id, e)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                          title="Xóa hồ sơ này"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div>
                        <h3 className="text-base font-extrabold text-slate-900 dark:text-white group-hover:text-emerald-600 transition-colors flex items-center gap-1.5">
                          <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>
                            {center.centerInfo.address || 'Chưa nhập địa chỉ trung tâm'}
                          </span>
                        </h3>
                        {center.completedAt && (
                          <p className="text-[11px] text-slate-400 mt-0.5 tabular-nums">
                            Hoàn thành lúc: {center.completedAt}
                          </p>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-2 pt-1 text-xs">
                        <div className="bg-slate-50 dark:bg-slate-800/70 rounded-xl p-2.5">
                          <p className="text-[10px] font-bold uppercase text-slate-400">
                            LEADER
                          </p>
                          <p className="font-bold text-slate-800 dark:text-slate-200 truncate mt-0.5">
                            {center.centerInfo.leader || '—'}
                          </p>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-800/70 rounded-xl p-2.5">
                          <p className="text-[10px] font-bold uppercase text-slate-400">
                            KHAI TRƯƠNG
                          </p>
                          <p className="font-bold text-slate-800 dark:text-slate-200 tabular-nums truncate mt-0.5">
                            {center.centerInfo.openingDate || '—'}
                          </p>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-800/70 rounded-xl p-2.5">
                          <p className="text-[10px] font-bold uppercase text-slate-400">
                            ASM
                          </p>
                          <p className="font-bold text-slate-800 dark:text-slate-200 truncate mt-0.5">
                            {center.centerInfo.asm || '—'}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-bold">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 tabular-nums">
                          Thiết bị: {center.equipmentList.length} mục
                        </span>
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 tabular-nums">
                          Hạng mục: {chkPct}%
                        </span>
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 tabular-nums">
                          Công việc: {jobPct}%
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={(e) => handleReopenCenter(center.id, e)}
                        className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Chuyển về Đang khai trương
                      </button>

                      <span className="px-3.5 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs inline-flex items-center gap-1.5 group-hover:bg-emerald-700 transition-colors">
                        <Eye className="w-3.5 h-3.5" /> Xem lại hồ sơ
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ============================================================================
  // VIEW 2: CHI TIẾT CHECKLIST SETUP TRUNG TÂM TIÊM CHỦNG (Matches User Screenshot)
  // ============================================================================
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

      {/* Top Back Bar & Status Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-white dark:bg-slate-900 px-4 py-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs print:hidden">
        <button
          type="button"
          onClick={() => setSelectedCenterId(null)}
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-extrabold text-slate-700 dark:text-slate-200 hover:text-[#0d9488] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Quay lại danh sách TTTC
        </button>

        <div className="flex flex-wrap items-center gap-2">
          {selectedCenter.status === 'in_progress' ? (
            <>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                <Clock className="w-3.5 h-3.5" /> Đang khai trương
              </span>
              <button
                type="button"
                onClick={() => handleMarkCenterCompleted(selectedCenter.id)}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Hoàn thành khai trương
              </button>
            </>
          ) : (
            <>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                <Lock className="w-3.5 h-3.5" /> Chế độ Xem lại (Đã hoàn thành{' '}
                {selectedCenter.completedAt ? `lúc ${selectedCenter.completedAt}` : ''})
              </span>
              <button
                type="button"
                onClick={() => handleReopenCenter(selectedCenter.id)}
                className="px-3.5 py-1.5 rounded-xl bg-[#0f1e36] hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Unlock className="w-3.5 h-3.5" /> Mở khóa chỉnh sửa
              </button>
            </>
          )}
        </div>
      </div>

      {/* TOP TEAL BANNER (Matches Screenshot) */}
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

      {/* 7-TAB NAVIGATION BAR (Matches Screenshot IMG_0762) */}
      <div className="bg-[#efede6] dark:bg-slate-800/95 p-1.5 sm:p-2 rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-700 grid grid-cols-7 gap-1 sm:gap-2 print:hidden">
        <button
          type="button"
          onClick={() => setActiveMainTab('center_info')}
          className={`min-h-[60px] sm:min-h-[54px] px-1 sm:px-3 py-2 rounded-xl text-[10px] sm:text-xs md:text-sm font-bold leading-tight transition-all flex flex-col items-center justify-center text-center cursor-pointer ${
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
          className={`min-h-[60px] sm:min-h-[54px] px-1 sm:px-3 py-2 rounded-xl text-[10px] sm:text-xs md:text-sm font-bold leading-tight transition-all flex flex-col items-center justify-center text-center cursor-pointer ${
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
          className={`min-h-[60px] sm:min-h-[54px] px-1 sm:px-3 py-1.5 rounded-xl text-[10px] sm:text-xs md:text-sm font-bold leading-tight transition-all flex flex-col items-center justify-center text-center gap-1 cursor-pointer ${
            activeMainTab === 'checklist'
              ? 'bg-[#0f1e36] text-white shadow-sm'
              : 'bg-white dark:bg-slate-900 text-[#0f1e36] dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-700'
          }`}
        >
          <span>Check các hạng mục</span>
          <span className="inline-block px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-extrabold bg-[#d2f4ee] text-[#0c6b63] tabular-nums">
            {checklistProgress}%
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMainTab('tasks')}
          className={`min-h-[60px] sm:min-h-[54px] px-1 sm:px-3 py-1.5 rounded-xl text-[10px] sm:text-xs md:text-sm font-bold leading-tight transition-all flex flex-col items-center justify-center text-center gap-1 cursor-pointer ${
            activeMainTab === 'tasks'
              ? 'bg-[#0f1e36] text-white shadow-sm'
              : 'bg-white dark:bg-slate-900 text-[#0f1e36] dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-700'
          }`}
        >
          <span>Công việc</span>
          <span className="inline-block px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-extrabold bg-[#d2f4ee] text-[#0c6b63] tabular-nums">
            {jobsProgress}%
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMainTab('fridge_guide')}
          className={`min-h-[60px] sm:min-h-[54px] px-1 sm:px-3 py-2 rounded-xl text-[10px] sm:text-xs md:text-sm font-bold leading-tight transition-all flex flex-col items-center justify-center text-center cursor-pointer ${
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
          className={`min-h-[60px] sm:min-h-[54px] px-1 sm:px-3 py-2 rounded-xl text-[10px] sm:text-xs md:text-sm font-bold leading-tight transition-all flex flex-col items-center justify-center text-center cursor-pointer ${
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
          className={`min-h-[60px] sm:min-h-[54px] px-1 sm:px-3 py-2 rounded-xl text-[10px] sm:text-xs md:text-sm font-bold leading-tight transition-all flex flex-col items-center justify-center text-center cursor-pointer ${
            activeMainTab === 'handover'
              ? 'bg-[#0f1e36] text-white shadow-sm'
              : 'bg-white dark:bg-slate-900 text-[#0f1e36] dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-700'
          }`}
        >
          <span>Biên bản bàn giao</span>
        </button>
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: THÔNG TIN TRUNG TÂM                                             */}
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
                    readOnly={isReadOnlyReview}
                    value={centerInfo.code}
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
                    readOnly={isReadOnlyReview}
                    value={centerInfo.leader}
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
                  readOnly={isReadOnlyReview}
                  value={centerInfo.address}
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
                    readOnly={isReadOnlyReview}
                    value={centerInfo.openingDate}
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
                  readOnly={isReadOnlyReview}
                  value={centerInfo.asm}
                  onChange={(e) => updateCenterField('asm', e.target.value)}
                  placeholder="Nhập họ tên ASM phụ trách..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0d9488]"
                />
              </div>

              {!isReadOnlyReview && (
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
              )}
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: TRANG THIẾT BỊ                                                 */}
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
              {!isReadOnlyReview && (
                <button
                  type="button"
                  onClick={() => excelInputRef.current?.click()}
                  className="px-4 py-2.5 rounded-xl bg-[#0d7377] hover:bg-[#0a5c5f] text-white font-bold text-xs sm:text-sm shadow-xs transition-colors cursor-pointer"
                >
                  ⬆ Tải file Excel
                </button>
              )}

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

              {!isReadOnlyReview && (
                <>
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
                </>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleSaveProgressJson}
                className="px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-[#0d7377] text-[#0d7377] dark:text-teal-400 hover:bg-teal-50/50 font-bold text-xs sm:text-sm transition-colors cursor-pointer"
              >
                💾 Lưu tiến độ
              </button>

              {!isReadOnlyReview && (
                <button
                  type="button"
                  onClick={() => progressJsonInputRef.current?.click()}
                  className="px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-dashed border-[#0d7377] text-[#0d7377] dark:text-teal-400 hover:bg-teal-50/50 font-bold text-xs sm:text-sm transition-colors cursor-pointer"
                >
                  📁 Tải tiến độ lên
                </button>
              )}
            </div>
          </div>

          {/* Sub-tabs: Danh mục hành chính | Danh mục thuốc */}
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
                            {!isReadOnlyReview && (
                              <button
                                type="button"
                                onClick={() => excelInputRef.current?.click()}
                                className="mt-1 px-4 py-2 rounded-xl bg-[#0d7377] hover:bg-[#0a5c5f] text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                              >
                                ⬆ Tải file Excel ngay
                              </button>
                            )}
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
                              disabled={isReadOnlyReview}
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
                              readOnly={isReadOnlyReview}
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

            {!isReadOnlyReview && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    updateSelectedCenter((prev) => ({
                      ...prev,
                      checklistItems: prev.checklistItems.map((i) => ({
                        ...i,
                        completed: true,
                      })),
                    }));
                    addToast('Đã đánh dấu hoàn thành 100% các hạng mục!', 'success');
                  }}
                  className="px-4 py-2 rounded-xl bg-[#0d9488] hover:bg-[#0b7a70] text-white text-xs font-bold cursor-pointer"
                >
                  ✓ Đánh dấu đạt 100%
                </button>
              </div>
            )}
          </div>

          {!isReadOnlyReview && (
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
                  updateSelectedCenter((prev) => ({
                    ...prev,
                    checklistItems: [
                      ...prev.checklistItems,
                      {
                        id: `chk_${Date.now()}`,
                        area: newChecklistArea,
                        title: newChecklistTitle.trim(),
                        standard: 'Đạt tiêu chuẩn SOP Trung tâm tiêm chủng Long Châu',
                        completed: true,
                        verifier: centerInfo.leader || 'Taskforce',
                        note: 'Đã kiểm tra',
                      },
                    ],
                  }));
                  setNewChecklistTitle('');
                  addToast('Đã thêm hạng mục kiểm tra mới!', 'success');
                }}
                className="px-4 py-2 rounded-xl bg-[#0f1e36] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Thêm hạng mục
              </button>
            </div>
          )}

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#0f1e36] text-white text-xs uppercase font-bold">
                  <tr>
                    <th className="py-3 px-4 w-14 text-center">Đạt</th>
                    <th className="py-3 px-4 w-56">Khu vực</th>
                    <th className="py-3 px-4">Nội dung hạng mục kiểm tra</th>
                    <th className="py-3 px-4 w-64">Tiêu chuẩn nghiệm thu</th>
                    <th className="py-3 px-4 w-44">Người kiểm tra</th>
                    {!isReadOnlyReview && <th className="py-3 px-4 w-12"></th>}
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
                            disabled={isReadOnlyReview}
                            checked={item.completed}
                            onChange={(e) =>
                              updateSelectedCenter((prev) => ({
                                ...prev,
                                checklistItems: prev.checklistItems.map((x) =>
                                  x.id === item.id
                                    ? { ...x, completed: e.target.checked }
                                    : x
                                ),
                              }))
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
                        {!isReadOnlyReview && (
                          <td className="py-3 px-4 text-center">
                            <button
                              type="button"
                              onClick={() =>
                                updateSelectedCenter((prev) => ({
                                  ...prev,
                                  checklistItems: prev.checklistItems.filter(
                                    (x) => x.id !== item.id
                                  ),
                                }))
                              }
                              className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
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

            {!isReadOnlyReview && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    updateSelectedCenter((prev) => ({
                      ...prev,
                      taskforceJobs: prev.taskforceJobs.map((j) => ({
                        ...j,
                        completed: true,
                      })),
                    }));
                    addToast('Đã hoàn tất 100% đầu việc Taskforce!', 'success');
                  }}
                  className="px-4 py-2 rounded-xl bg-[#0d9488] hover:bg-[#0b7a70] text-white text-xs font-bold cursor-pointer"
                >
                  ✓ Hoàn tất 100% công việc
                </button>
              </div>
            )}
          </div>

          {!isReadOnlyReview && (
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
                  updateSelectedCenter((prev) => ({
                    ...prev,
                    taskforceJobs: [
                      ...prev.taskforceJobs,
                      {
                        id: `job_${Date.now()}`,
                        phase: newJobPhase,
                        title: newJobTitle.trim(),
                        assignee: newJobAssignee || centerInfo.leader || 'Taskforce',
                        dueDate: newJobDueDate || centerInfo.openingDate || '',
                        priority: 'Cao',
                        completed: true,
                        note: 'Hoàn thành đúng tiến độ',
                      },
                    ],
                  }));
                  setNewJobTitle('');
                  addToast('Đã thêm công việc mới!', 'success');
                }}
                className="px-4 py-2 rounded-xl bg-[#0f1e36] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Thêm việc
              </button>
            </div>
          )}

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#0f1e36] text-white text-xs uppercase font-bold">
                  <tr>
                    <th className="py-3 px-4 w-14 text-center">Xong</th>
                    <th className="py-3 px-4 w-64">Giai đoạn</th>
                    <th className="py-3 px-4">Nội dung công việc</th>
                    <th className="py-3 px-4 w-44">Phụ trách</th>
                    <th className="py-3 px-4 w-28 text-center">Hạn chót</th>
                    <th className="py-3 px-4 w-24 text-center">Ưu tiên</th>
                    {!isReadOnlyReview && <th className="py-3 px-4 w-12"></th>}
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
                          disabled={isReadOnlyReview}
                          checked={job.completed}
                          onChange={(e) =>
                            updateSelectedCenter((prev) => ({
                              ...prev,
                              taskforceJobs: prev.taskforceJobs.map((x) =>
                                x.id === job.id
                                  ? { ...x, completed: e.target.checked }
                                  : x
                              ),
                            }))
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
                      {!isReadOnlyReview && (
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() =>
                              updateSelectedCenter((prev) => ({
                                ...prev,
                                taskforceJobs: prev.taskforceJobs.filter(
                                  (x) => x.id !== job.id
                                ),
                              }))
                            }
                            className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
                <li>Đặt đầu dò glycol chính giữa tâm tủ bảo quản, không chạm thành lạnh.</li>
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

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                Nhật Ký Nghiệm Thu Thẩm Định Tủ Thực Tế — Mã TT: {centerInfo.code || '—'}
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

              {!isReadOnlyReview && (
                <button
                  type="button"
                  onClick={() => photoUploadInputRef.current?.click()}
                  className="px-4 py-2.5 rounded-xl bg-[#0d9488] hover:bg-[#0b7a70] text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-xs cursor-pointer"
                >
                  <Camera className="w-4 h-4" /> Chụp / Tải ảnh báo cáo lên
                </button>
              )}
            </div>

            {!isReadOnlyReview && (
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
            )}
          </div>

          {reportPhotos.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-10 border border-slate-200/80 dark:border-slate-800 text-center text-xs sm:text-sm text-slate-500">
              Chưa có hình ảnh báo cáo nào được tải lên cho trung tâm này.
            </div>
          ) : (
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
                        {!isReadOnlyReview && (
                          <button
                            type="button"
                            onClick={() =>
                              updateSelectedCenter((prev) => ({
                                ...prev,
                                reportPhotos: prev.reportPhotos.filter(
                                  (p) => p.id !== photo.id
                                ),
                              }))
                            }
                            className="text-slate-400 hover:text-rose-600 cursor-pointer"
                            title="Xóa ảnh"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 7: BIÊN BẢN BÀN GIAO (Matches IMG_0759, IMG_0760, IMG_0761, IMG_0762) */}
      {/* ===================================================================== */}
      {activeMainTab === 'handover' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-6 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-4">
          {/* 4 Sub-tabs in a single 4-column row */}
          <div className="grid grid-cols-4 gap-2 sm:gap-3 print:hidden">
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
                className={`min-h-[54px] py-2 px-2 sm:px-4 rounded-xl text-xs sm:text-sm font-bold leading-snug transition-all flex items-center justify-center text-center cursor-pointer ${
                  handoverSubTab === tab.id
                    ? 'bg-[#136f72] text-white shadow-xs'
                    : 'bg-white dark:bg-slate-900 text-[#0f1e36] dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex justify-end print:hidden">
            <button
              type="button"
              onClick={handlePrintHandoverA4}
              className="px-4 py-2 rounded-xl bg-[#b85d27] hover:bg-[#9e4e1f] text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" /> Xuất PDF A4
            </button>
          </div>

          {/* Printable Handover Card */}
          <div className="bg-[#f7f6f1] text-slate-900 rounded-2xl p-4 sm:p-8 border border-slate-300/90 space-y-4">
            {/* Document Header with FPT Retail & Long Châu Logo + Title (Matches IMG_0817) */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pt-1 pb-2">
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-0.5">
                    <span className="inline-block w-3 h-2.5 rounded-[2px] bg-[#00529b] -skew-x-12" />
                    <span className="inline-block w-3 h-2.5 rounded-[2px] bg-[#f37021] -skew-x-12" />
                    <span className="inline-block w-3 h-2.5 rounded-[2px] bg-[#50b848] -skew-x-12" />
                  </div>
                  <span className="text-[8px] font-extrabold text-[#00529b] tracking-tight mt-0.5">
                    FPT Retail
                  </span>
                </div>
                <div className="leading-none">
                  <p className="text-[9px] font-extrabold text-[#00529b] tracking-tight uppercase">
                    TRUNG TÂM TIÊM CHỦNG
                  </p>
                  <p className="text-sm sm:text-base font-black text-[#00529b] tracking-tight uppercase">
                    LONG CHÂU
                  </p>
                </div>
              </div>

              <div className="text-center flex-1">
                <h2 className="text-base sm:text-xl font-extrabold text-[#111827] uppercase tracking-tight">
                  {getHandoverTitle(handoverSubTab)}
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  {centerInfo.code || centerInfo.address
                    ? `${centerInfo.code ? `Mã TT: ${centerInfo.code}` : ''}${
                        centerInfo.code && centerInfo.address ? ' — ' : ''
                      }${centerInfo.address ? `Địa chỉ: ${centerInfo.address}` : ''}`
                    : 'Mã Trung tâm, địa chỉ Trung tâm'}
                </p>
              </div>

              <div className="hidden sm:block w-36 shrink-0" />
            </div>

            {/* 1. BÊN BÀN GIAO */}
            <div className="space-y-2.5">
              <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wide text-[#111827]">
                1. BÊN BÀN GIAO
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm text-slate-700 shrink-0">
                    Họ và tên:
                  </span>
                  <input
                    type="text"
                    readOnly={isReadOnlyReview}
                    value={handoverParty.delivererName}
                    onChange={(e) =>
                      updateSelectedCenter((prev) => ({
                        ...prev,
                        handoverParty: {
                          ...prev.handoverParty,
                          delivererName: e.target.value,
                        },
                      }))
                    }
                    placeholder="..........................."
                    className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#136f72]"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm text-slate-700 shrink-0">
                    Số điện thoại:
                  </span>
                  <input
                    type="text"
                    readOnly={isReadOnlyReview}
                    value={handoverParty.delivererPhone}
                    onChange={(e) =>
                      updateSelectedCenter((prev) => ({
                        ...prev,
                        handoverParty: {
                          ...prev.handoverParty,
                          delivererPhone: e.target.value,
                        },
                      }))
                    }
                    placeholder="..........................."
                    className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs sm:text-sm font-medium text-slate-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-[#136f72]"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm text-slate-700 shrink-0">
                  Bộ phận:
                </span>
                <span className="inline-block px-2.5 py-1 rounded-lg bg-[#ecebe4] text-slate-900 text-xs sm:text-sm font-medium">
                  {handoverParty.delivererDept || 'Taskforce Vacxin Long Châu'}
                </span>
              </div>
            </div>

            {/* 2. BÊN NHẬN BÀN GIAO */}
            <div className="space-y-2.5">
              <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wide text-[#111827]">
                2. BÊN NHẬN BÀN GIAO
              </h3>

              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-xs sm:text-sm text-slate-700">Bộ phận:</span>
                <select
                  disabled={isReadOnlyReview}
                  value={handoverParty.receiverDept}
                  onChange={(e) =>
                    updateSelectedCenter((prev) => ({
                      ...prev,
                      handoverParty: {
                        ...prev.handoverParty,
                        receiverDept: e.target.value,
                      },
                    }))
                  }
                  className="px-3 py-1.5 rounded-lg bg-white text-slate-900 text-xs sm:text-sm font-medium border border-slate-300"
                >
                  <option value="Bác sĩ">Bác sĩ</option>
                  <option value="Điều dưỡng trưởng">Điều dưỡng trưởng</option>
                  <option value="Dược sĩ">Dược sĩ</option>
                  <option value="Quản lý trung tâm">Quản lý trung tâm</option>
                </select>

                <span className="text-xs sm:text-sm text-slate-700 ml-1">
                  Họ và tên:
                </span>
                <input
                  type="text"
                  readOnly={isReadOnlyReview}
                  value={handoverParty.receiverName}
                  onChange={(e) =>
                    updateSelectedCenter((prev) => ({
                      ...prev,
                      handoverParty: {
                        ...prev.handoverParty,
                        receiverName: e.target.value,
                      },
                    }))
                  }
                  placeholder="..........................."
                  className="flex-1 min-w-[160px] px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#136f72]"
                />

                <span className="text-xs sm:text-sm text-slate-700">
                  Số điện thoại:
                </span>
                <input
                  type="text"
                  readOnly={isReadOnlyReview}
                  value={handoverParty.receiverPhone}
                  onChange={(e) =>
                    updateSelectedCenter((prev) => ({
                      ...prev,
                      handoverParty: {
                        ...prev.handoverParty,
                        receiverPhone: e.target.value,
                      },
                    }))
                  }
                  placeholder="..........................."
                  className="w-full sm:w-auto flex-1 min-w-[160px] px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs sm:text-sm font-medium text-slate-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-[#136f72]"
                />
              </div>
            </div>

            {/* Nội dung bàn giao */}
            <div className="text-xs sm:text-sm text-slate-900 leading-relaxed pt-1">
              <span className="font-extrabold">Nội dung bàn giao: </span>
              <span>{getHandoverNoteText(handoverSubTab)}</span>
            </div>

            {/* =============================================================== */}
            {/* SUB-TAB: CSVC (2 TABLES: Các bảng biểu & Dịch vụ kĩ thuật)       */}
            {/* =============================================================== */}
            {handoverSubTab === 'csvc' && (
              <div className="space-y-6">
                {/* TABLE 1: Các bảng biểu trong trung tâm */}
                <div className="space-y-2.5">
                  <h4 className="text-sm sm:text-base font-extrabold text-[#0f1e36]">
                    Các bảng biểu trong trung tâm
                  </h4>

                  <div className="overflow-x-auto border border-slate-400">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-[#e6e5df] text-slate-900 text-xs font-extrabold">
                        <tr>
                          <th className="py-2 px-2 w-10 text-center border border-slate-400">
                            STT
                          </th>
                          <th className="py-2 px-2.5 border border-slate-400">
                            Tên sản phẩm
                          </th>
                          <th className="py-2 px-2 w-16 text-center border border-slate-400">
                            SL
                          </th>
                          <th className="py-2 px-2 w-16 text-center border border-slate-400">
                            ĐVT
                          </th>
                          <th className="py-2 px-2.5 w-28 border border-slate-400">
                            Ghi chú
                          </th>
                          {!isReadOnlyReview && (
                            <th className="py-2 px-2 w-9 text-center border border-slate-400 print:hidden"></th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="text-xs sm:text-sm">
                        {csvcSignageRows.map((row, idx) => (
                          <tr key={row.id} className="hover:bg-white/60">
                            <td className="py-2 px-2 text-center text-slate-800 font-medium tabular-nums border border-slate-400">
                              {idx + 1}
                            </td>
                            <td className="py-1.5 px-2 border border-slate-400">
                              <input
                                type="text"
                                readOnly={isReadOnlyReview}
                                value={row.name}
                                onChange={(e) =>
                                  handleUpdateCsvcRow(
                                    'csvcSignageRows',
                                    row.id,
                                    'name',
                                    e.target.value
                                  )
                                }
                                placeholder="Nhập tên bảng biểu..."
                                className="w-full bg-transparent text-slate-900 font-medium focus:outline-none focus:bg-white rounded px-1 py-0.5"
                              />
                            </td>
                            <td className="py-1.5 px-1.5 text-center border border-slate-400">
                              <input
                                type="number"
                                min={0}
                                readOnly={isReadOnlyReview}
                                value={row.qty}
                                onChange={(e) =>
                                  handleUpdateCsvcRow(
                                    'csvcSignageRows',
                                    row.id,
                                    'qty',
                                    e.target.value === '' ? 0 : Number(e.target.value)
                                  )
                                }
                                className="w-12 px-1 py-0.5 text-center rounded border border-slate-300 bg-white text-slate-900 font-semibold tabular-nums"
                              />
                            </td>
                            <td className="py-1.5 px-1.5 text-center border border-slate-400">
                              <input
                                type="text"
                                readOnly={isReadOnlyReview}
                                value={row.unit}
                                onChange={(e) =>
                                  handleUpdateCsvcRow(
                                    'csvcSignageRows',
                                    row.id,
                                    'unit',
                                    e.target.value
                                  )
                                }
                                className="w-14 px-1 py-0.5 text-center rounded bg-transparent text-slate-800 focus:outline-none"
                              />
                            </td>
                            <td className="py-1.5 px-2 border border-slate-400">
                              <input
                                type="text"
                                readOnly={isReadOnlyReview}
                                value={row.note}
                                onChange={(e) =>
                                  handleUpdateCsvcRow(
                                    'csvcSignageRows',
                                    row.id,
                                    'note',
                                    e.target.value
                                  )
                                }
                                placeholder="Ghi chú"
                                className="w-full px-1.5 py-0.5 rounded bg-transparent text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white"
                              />
                            </td>
                            {!isReadOnlyReview && (
                              <td className="py-1.5 px-1.5 text-center border border-slate-400 print:hidden">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleDeleteCsvcRow('csvcSignageRows', row.id)
                                  }
                                  className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                                  title="Xóa dòng"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {!isReadOnlyReview && (
                    <button
                      type="button"
                      onClick={() => handleAddCsvcRow('csvcSignageRows')}
                      className="px-3.5 py-1.5 rounded-lg border border-dashed border-[#0d7377] text-[#0d7377] hover:bg-teal-50/50 text-xs font-bold transition-colors cursor-pointer print:hidden"
                    >
                      + Thêm dòng
                    </button>
                  )}
                </div>

                {/* TABLE 2: Dịch vụ kĩ thuật */}
                <div className="space-y-2.5">
                  <h4 className="text-sm sm:text-base font-extrabold text-[#0f1e36]">
                    Dịch vụ kĩ thuật
                  </h4>

                  <div className="overflow-x-auto border border-slate-400">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-[#e6e5df] text-slate-900 text-xs font-extrabold">
                        <tr>
                          <th className="py-2 px-2 w-10 text-center border border-slate-400">
                            STT
                          </th>
                          <th className="py-2 px-2.5 border border-slate-400">
                            Tên sản phẩm
                          </th>
                          <th className="py-2 px-2 w-16 text-center border border-slate-400">
                            SL
                          </th>
                          <th className="py-2 px-2 w-16 text-center border border-slate-400">
                            ĐVT
                          </th>
                          <th className="py-2 px-2.5 w-28 border border-slate-400">
                            Ghi chú
                          </th>
                          {!isReadOnlyReview && (
                            <th className="py-2 px-2 w-9 text-center border border-slate-400 print:hidden"></th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="text-xs sm:text-sm">
                        {csvcTechRows.map((row, idx) => (
                          <tr key={row.id} className="hover:bg-white/60">
                            <td className="py-2 px-2 text-center text-slate-800 font-medium tabular-nums border border-slate-400">
                              {idx + 1}
                            </td>
                            <td className="py-1.5 px-2 border border-slate-400">
                              <input
                                type="text"
                                readOnly={isReadOnlyReview}
                                value={row.name}
                                onChange={(e) =>
                                  handleUpdateCsvcRow(
                                    'csvcTechRows',
                                    row.id,
                                    'name',
                                    e.target.value
                                  )
                                }
                                placeholder="Nhập tên thiết bị kĩ thuật..."
                                className="w-full bg-transparent text-slate-900 font-medium focus:outline-none focus:bg-white rounded px-1 py-0.5"
                              />
                            </td>
                            <td className="py-1.5 px-1.5 text-center border border-slate-400">
                              <input
                                type="number"
                                min={0}
                                readOnly={isReadOnlyReview}
                                value={row.qty}
                                onChange={(e) =>
                                  handleUpdateCsvcRow(
                                    'csvcTechRows',
                                    row.id,
                                    'qty',
                                    e.target.value === '' ? 0 : Number(e.target.value)
                                  )
                                }
                                className="w-12 px-1 py-0.5 text-center rounded border border-slate-300 bg-white text-slate-900 font-semibold tabular-nums"
                              />
                            </td>
                            <td className="py-1.5 px-1.5 text-center border border-slate-400">
                              <input
                                type="text"
                                readOnly={isReadOnlyReview}
                                value={row.unit}
                                onChange={(e) =>
                                  handleUpdateCsvcRow(
                                    'csvcTechRows',
                                    row.id,
                                    'unit',
                                    e.target.value
                                  )
                                }
                                className="w-14 px-1 py-0.5 text-center rounded bg-transparent text-slate-800 focus:outline-none"
                              />
                            </td>
                            <td className="py-1.5 px-2 border border-slate-400">
                              <input
                                type="text"
                                readOnly={isReadOnlyReview}
                                value={row.note}
                                onChange={(e) =>
                                  handleUpdateCsvcRow(
                                    'csvcTechRows',
                                    row.id,
                                    'note',
                                    e.target.value
                                  )
                                }
                                placeholder="Ghi chú"
                                className="w-full px-1.5 py-0.5 rounded bg-transparent text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white"
                              />
                            </td>
                            {!isReadOnlyReview && (
                              <td className="py-1.5 px-1.5 text-center border border-slate-400 print:hidden">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleDeleteCsvcRow('csvcTechRows', row.id)
                                  }
                                  className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                                  title="Xóa dòng"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {!isReadOnlyReview && (
                    <button
                      type="button"
                      onClick={() => handleAddCsvcRow('csvcTechRows')}
                      className="px-3.5 py-1.5 rounded-lg border border-dashed border-[#0d7377] text-[#0d7377] hover:bg-teal-50/50 text-xs font-bold transition-colors cursor-pointer print:hidden"
                    >
                      + Thêm dòng
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* =============================================================== */}
            {/* SUB-TAB: THIẾT BỊ PHÒNG TIÊM                                    */}
            {/* =============================================================== */}
            {handoverSubTab === 'injection_room' && (
              <div className="space-y-2.5">
                {handoverItems.length > 0 ? (
                  <div className="overflow-x-auto border border-slate-400">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-[#e6e5df] text-slate-900 text-xs font-extrabold">
                        <tr>
                          <th className="py-2 px-2 w-10 text-center border border-slate-400">
                            STT
                          </th>
                          <th className="py-2 px-2 w-28 border border-slate-400">
                            Loại
                          </th>
                          <th className="py-2 px-2.5 border border-slate-400">
                            Tên sản phẩm
                          </th>
                          <th className="py-2 px-2 w-14 text-center border border-slate-400">
                            ĐVT
                          </th>
                          <th className="py-2 px-2 w-14 text-center border border-slate-400">
                            SL cấp
                          </th>
                          <th className="py-2 px-2 w-16 text-center border border-slate-400">
                            SL nhận
                          </th>
                          <th className="py-2 px-2 w-24 border border-slate-400">
                            Ghi chú
                          </th>
                        </tr>
                      </thead>
                      <tbody className="text-xs sm:text-sm">
                        {handoverItems.map((item, idx) => (
                          <tr key={item.id} className="hover:bg-white/60">
                            <td className="py-2 px-2 text-center font-medium text-slate-800 tabular-nums border border-slate-400">
                              {idx + 1}
                            </td>
                            <td className="py-2 px-2 text-slate-800 border border-slate-400">
                              {item.type}
                            </td>
                            <td className="py-2 px-2.5 font-medium text-slate-900 border border-slate-400">
                              {item.name}
                            </td>
                            <td className="py-2 px-1.5 text-center text-slate-800 border border-slate-400">
                              {item.unit}
                            </td>
                            <td className="py-2 px-1.5 text-center font-medium text-slate-900 tabular-nums border border-slate-400">
                              {item.requiredQty}
                            </td>
                            <td className="py-1.5 px-1.5 text-center border border-slate-400">
                              <input
                                type="number"
                                min={0}
                                readOnly={isReadOnlyReview}
                                value={item.actualQty === null ? '' : item.actualQty}
                                onChange={(e) =>
                                  handleActualQtyChange(item.id, e.target.value)
                                }
                                className="w-12 px-1 py-0.5 text-center rounded border border-slate-300 bg-white font-semibold text-slate-900 tabular-nums"
                              />
                            </td>
                            <td className="py-1.5 px-2 border border-slate-400">
                              <input
                                type="text"
                                readOnly={isReadOnlyReview}
                                value={item.note}
                                onChange={(e) =>
                                  handleItemNoteChange(item.id, e.target.value)
                                }
                                placeholder={getHandoverItemNoteDisplay(item)}
                                className="w-full px-1 py-0.5 bg-transparent text-xs text-slate-800 placeholder:text-slate-700 focus:outline-none focus:bg-white"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto border border-slate-400">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-[#e6e5df] text-slate-900 text-xs font-extrabold">
                          <tr>
                            <th className="py-2 px-2 w-10 text-center border border-slate-400">
                              STT
                            </th>
                            <th className="py-2 px-2.5 border border-slate-400">
                              Tên sản phẩm
                            </th>
                            <th className="py-2 px-2 w-16 text-center border border-slate-400">
                              SL
                            </th>
                            <th className="py-2 px-2 w-16 text-center border border-slate-400">
                              ĐVT
                            </th>
                            <th className="py-2 px-2.5 w-28 border border-slate-400">
                              Ghi chú
                            </th>
                            {!isReadOnlyReview && (
                              <th className="py-2 px-2 w-9 text-center border border-slate-400 print:hidden"></th>
                            )}
                          </tr>
                        </thead>
                        <tbody className="text-xs sm:text-sm">
                          {injectionRoomRows.map((row, idx) => (
                            <tr key={row.id} className="hover:bg-white/60">
                              <td className="py-2 px-2 text-center text-slate-800 font-medium tabular-nums border border-slate-400">
                                {idx + 1}
                              </td>
                              <td className="py-1.5 px-2 border border-slate-400">
                                <input
                                  type="text"
                                  readOnly={isReadOnlyReview}
                                  value={row.name}
                                  onChange={(e) =>
                                    handleUpdateCsvcRow(
                                      'injectionRoomRows',
                                      row.id,
                                      'name',
                                      e.target.value
                                    )
                                  }
                                  placeholder="Nhập tên thiết bị phòng tiêm..."
                                  className="w-full bg-transparent text-slate-900 font-medium focus:outline-none focus:bg-white rounded px-1 py-0.5"
                                />
                              </td>
                              <td className="py-1.5 px-1.5 text-center border border-slate-400">
                                <input
                                  type="number"
                                  min={0}
                                  readOnly={isReadOnlyReview}
                                  value={row.qty}
                                  onChange={(e) =>
                                    handleUpdateCsvcRow(
                                      'injectionRoomRows',
                                      row.id,
                                      'qty',
                                      e.target.value === '' ? 0 : Number(e.target.value)
                                    )
                                  }
                                  className="w-12 px-1 py-0.5 text-center rounded border border-slate-300 bg-white text-slate-900 font-semibold tabular-nums"
                                />
                              </td>
                              <td className="py-1.5 px-1.5 text-center border border-slate-400">
                                <input
                                  type="text"
                                  readOnly={isReadOnlyReview}
                                  value={row.unit}
                                  onChange={(e) =>
                                    handleUpdateCsvcRow(
                                      'injectionRoomRows',
                                      row.id,
                                      'unit',
                                      e.target.value
                                    )
                                  }
                                  className="w-14 px-1 py-0.5 text-center rounded bg-transparent text-slate-800 focus:outline-none"
                                />
                              </td>
                              <td className="py-1.5 px-2 border border-slate-400">
                                <input
                                  type="text"
                                  readOnly={isReadOnlyReview}
                                  value={row.note}
                                  onChange={(e) =>
                                    handleUpdateCsvcRow(
                                      'injectionRoomRows',
                                      row.id,
                                      'note',
                                      e.target.value
                                    )
                                  }
                                  placeholder="Ghi chú"
                                  className="w-full px-1.5 py-0.5 rounded bg-transparent text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white"
                                />
                              </td>
                              {!isReadOnlyReview && (
                                <td className="py-1.5 px-1.5 text-center border border-slate-400 print:hidden">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleDeleteCsvcRow('injectionRoomRows', row.id)
                                    }
                                    className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                                    title="Xóa dòng"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {!isReadOnlyReview && (
                      <button
                        type="button"
                        onClick={() => handleAddCsvcRow('injectionRoomRows')}
                        className="px-3.5 py-1.5 rounded-lg border border-dashed border-[#0d7377] text-[#0d7377] hover:bg-teal-50/50 text-xs font-bold transition-colors cursor-pointer print:hidden"
                      >
                        + Thêm dòng
                      </button>
                    )}
                  </>
                )}
              </div>
            )}

            {/* =============================================================== */}
            {/* SUB-TABS: TRANG THIẾT BỊ & DANH MỤC THUỐC (MATCHES IMG_0817)    */}
            {/* =============================================================== */}
            {(handoverSubTab === 'equipment' || handoverSubTab === 'medicine') && (
              <div className="overflow-x-auto border border-slate-400">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-[#e6e5df] text-slate-900 text-xs font-extrabold">
                    <tr>
                      <th className="py-2 px-2 w-10 text-center border border-slate-400">
                        STT
                      </th>
                      <th className="py-2 px-2 w-28 border border-slate-400">
                        Loại
                      </th>
                      <th className="py-2 px-2.5 border border-slate-400">
                        Tên sản phẩm
                      </th>
                      <th className="py-2 px-2 w-14 text-center border border-slate-400">
                        ĐVT
                      </th>
                      <th className="py-2 px-2 w-14 text-center border border-slate-400">
                        SL cấp
                      </th>
                      <th className="py-2 px-2 w-16 text-center border border-slate-400">
                        SL nhận
                      </th>
                      <th className="py-2 px-2 w-24 border border-slate-400">
                        Ghi chú
                      </th>
                    </tr>
                  </thead>
                  <tbody className="text-xs sm:text-sm">
                    {handoverItems.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="py-10 px-4 text-center text-slate-500 italic border border-slate-400"
                        >
                          Chưa có dữ liệu bàn giao — dữ liệu sẽ tự động hiển thị sau khi tải file Excel tại mục &ldquo;Trang thiết bị&rdquo;.
                        </td>
                      </tr>
                    ) : (
                      handoverItems.map((item, idx) => (
                        <tr key={item.id} className="hover:bg-white/60">
                          <td className="py-2 px-2 text-center font-medium text-slate-800 tabular-nums border border-slate-400">
                            {idx + 1}
                          </td>
                          <td className="py-2 px-2 text-slate-800 border border-slate-400">
                            {item.type}
                          </td>
                          <td className="py-2 px-2.5 font-medium text-slate-900 border border-slate-400">
                            {item.name}
                          </td>
                          <td className="py-2 px-1.5 text-center text-slate-800 border border-slate-400">
                            {item.unit}
                          </td>
                          <td className="py-2 px-1.5 text-center font-medium text-slate-900 tabular-nums border border-slate-400">
                            {item.requiredQty}
                          </td>
                          <td className="py-1.5 px-1.5 text-center border border-slate-400">
                            <input
                              type="number"
                              min={0}
                              readOnly={isReadOnlyReview}
                              value={item.actualQty === null ? '' : item.actualQty}
                              onChange={(e) =>
                                handleActualQtyChange(item.id, e.target.value)
                              }
                              className="w-12 px-1 py-0.5 text-center rounded border border-slate-300 bg-white font-semibold text-slate-900 tabular-nums"
                            />
                          </td>
                          <td className="py-1.5 px-2 border border-slate-400">
                            <input
                              type="text"
                              readOnly={isReadOnlyReview}
                              value={item.note}
                              onChange={(e) =>
                                handleItemNoteChange(item.id, e.target.value)
                              }
                              placeholder={getHandoverItemNoteDisplay(item)}
                              className="w-full px-1 py-0.5 bg-transparent text-xs text-slate-800 placeholder:text-slate-800 focus:outline-none focus:bg-white"
                            />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* =============================================================== */}
            {/* HANDOVER FOOTER: NOTE, DATE & 4-PARTY SIGNATURE ROW (IMG_0819)  */}
            {/* =============================================================== */}
            <div className="pt-2 space-y-3">
              <p className="text-xs sm:text-sm italic text-slate-700 leading-relaxed">
                Người xác nhận phải bàn giao đầy đủ các hạng mục nếu có trường hợp chuyển shop hoặc thay đổi công việc
              </p>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 print:hidden">
                  <span className="text-xs sm:text-sm text-slate-600">
                    Ngày lập biên bản:
                  </span>
                  <div className="relative">
                    <input
                      type="text"
                      readOnly={isReadOnlyReview}
                      value={handoverParty.handoverDate ?? ''}
                      onChange={(e) =>
                        updateSelectedCenter((prev) => ({
                          ...prev,
                          handoverParty: {
                            ...prev.handoverParty,
                            handoverDate: e.target.value,
                          },
                        }))
                      }
                      placeholder="dd/mm/yyyy"
                      className="w-36 px-3 py-1 pr-8 rounded-lg border border-slate-300 bg-white text-xs sm:text-sm font-medium text-slate-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-[#136f72]"
                    />
                    <Calendar className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-slate-800 ml-auto">
                  {formatHandoverDatePrintLine(handoverParty.handoverDate)}
                </p>
              </div>

              {/* 4-Column Signature Row matching IMG_0819 */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-3 pb-8 text-center">
                <div>
                  <p className="text-xs sm:text-sm font-extrabold text-[#111827]">
                    Bên bàn giao
                  </p>
                  <p className="text-[11px] sm:text-xs italic text-slate-500 mt-0.5">
                    Ký và ghi rõ họ tên
                  </p>
                  <div className="h-14" />
                  <p className="text-xs font-bold text-slate-900">
                    {handoverParty.delivererName}
                  </p>
                </div>

                <div>
                  <p className="text-xs sm:text-sm font-extrabold text-[#111827]">
                    Bác sĩ TTTC Long Châu
                  </p>
                  <p className="text-[11px] sm:text-xs italic text-slate-500 mt-0.5">
                    Ký và ghi rõ họ tên
                  </p>
                  <div className="h-14" />
                </div>

                <div>
                  <p className="text-xs sm:text-sm font-extrabold text-[#111827]">
                    ASM
                  </p>
                  <p className="text-[11px] sm:text-xs italic text-slate-500 mt-0.5">
                    Ký và ghi rõ họ tên
                  </p>
                  <div className="h-14" />
                  <p className="text-xs font-bold text-slate-900">
                    {centerInfo.asm}
                  </p>
                </div>

                <div>
                  <p className="text-xs sm:text-sm font-extrabold text-[#111827]">
                    Bên nhận bàn giao
                  </p>
                  <p className="text-[11px] sm:text-xs italic text-slate-500 mt-0.5">
                    Ký và ghi rõ họ tên
                  </p>
                  <div className="h-14" />
                  <p className="text-xs font-bold text-slate-900">
                    {handoverParty.receiverName}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* DEDICATED A4 PRINT PORTAL (Matches IMG_0817 & IMG_0819 100%)          */}
      {/* ===================================================================== */}
      {typeof document !== 'undefined' &&
        createPortal(
          <>
            <style>{`
              @media screen {
                #tttc-a4-print-portal {
                  display: none !important;
                }
              }
              @media print {
                @page {
                  size: A4 portrait;
                  margin: 10mm 10mm 12mm 10mm;
                }
                html, body {
                  background: #f6f5ef !important;
                  color: #1f2937 !important;
                  margin: 0 !important;
                  padding: 0 !important;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
                #root {
                  display: none !important;
                }
                #tttc-a4-print-portal {
                  display: block !important;
                  width: 100% !important;
                  background: #f6f5ef !important;
                  color: #1f2937 !important;
                  padding: 6px 8px !important;
                  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
                  font-size: 12px !important;
                  line-height: 1.4 !important;
                }
                #tttc-a4-print-portal table {
                  width: 100% !important;
                  border-collapse: collapse !important;
                  page-break-inside: auto !important;
                }
                #tttc-a4-print-portal thead {
                  display: table-header-group !important;
                }
                #tttc-a4-print-portal tr {
                  page-break-inside: avoid !important;
                  page-break-after: auto !important;
                }
                #tttc-a4-print-portal th,
                #tttc-a4-print-portal td {
                  border: 1px solid #9ca3af !important;
                  padding: 6px 7px !important;
                  vertical-align: middle !important;
                  font-size: 11px !important;
                  color: #1f2937 !important;
                }
                #tttc-a4-print-portal th {
                  background-color: #e6e5df !important;
                  font-weight: 700 !important;
                  text-align: left !important;
                }
              }
            `}</style>

            <div id="tttc-a4-print-portal">
              {/* Top A4 Header: FPT Retail + Long Châu Logo on Left, Title Centered */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  marginBottom: '14px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    width: '175px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                    }}
                  >
                    <div style={{ display: 'flex', gap: '2px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          width: '10px',
                          height: '8px',
                          backgroundColor: '#00529b',
                          borderRadius: '1px',
                          transform: 'skewX(-12deg)',
                        }}
                      />
                      <span
                        style={{
                          display: 'inline-block',
                          width: '10px',
                          height: '8px',
                          backgroundColor: '#f37021',
                          borderRadius: '1px',
                          transform: 'skewX(-12deg)',
                        }}
                      />
                      <span
                        style={{
                          display: 'inline-block',
                          width: '10px',
                          height: '8px',
                          backgroundColor: '#50b848',
                          borderRadius: '1px',
                          transform: 'skewX(-12deg)',
                        }}
                      />
                    </div>
                    <span
                      style={{
                        fontSize: '7px',
                        fontWeight: 800,
                        color: '#00529b',
                        marginTop: '2px',
                      }}
                    >
                      FPT Retail
                    </span>
                  </div>
                  <div style={{ lineHeight: 1.05 }}>
                    <div
                      style={{
                        fontSize: '8px',
                        fontWeight: 800,
                        color: '#00529b',
                        textTransform: 'uppercase',
                      }}
                    >
                      TRUNG TÂM TIÊM CHỦNG
                    </div>
                    <div
                      style={{
                        fontSize: '14px',
                        fontWeight: 900,
                        color: '#00529b',
                        textTransform: 'uppercase',
                      }}
                    >
                      LONG CHÂU
                    </div>
                  </div>
                </div>

                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div
                    style={{
                      fontSize: '16px',
                      fontWeight: 800,
                      color: '#111827',
                      textTransform: 'uppercase',
                      letterSpacing: '-0.01em',
                    }}
                  >
                    {getHandoverTitle(handoverSubTab)}
                  </div>
                  <div
                    style={{
                      fontSize: '11.5px',
                      color: '#6b7280',
                      marginTop: '2px',
                    }}
                  >
                    {centerInfo.code || centerInfo.address
                      ? `${centerInfo.code ? `Mã TT: ${centerInfo.code}` : ''}${
                          centerInfo.code && centerInfo.address ? ' — ' : ''
                        }${centerInfo.address ? `Địa chỉ: ${centerInfo.address}` : ''}`
                      : 'Mã Trung tâm, địa chỉ Trung tâm'}
                  </div>
                </div>

                <div style={{ width: '90px' }} />
              </div>

              {/* 1. BÊN BÀN GIAO */}
              <div style={{ marginBottom: '10px' }}>
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: 800,
                    color: '#111827',
                    marginBottom: '6px',
                  }}
                >
                  1. BÊN BÀN GIAO
                </div>
                <div
                  style={{
                    fontSize: '12.5px',
                    color: '#1f2937',
                    marginBottom: '6px',
                  }}
                >
                  <span>
                    Họ và tên:{' '}
                    {handoverParty.delivererName?.trim()
                      ? handoverParty.delivererName
                      : '...........................'}
                  </span>
                  <span style={{ marginLeft: '24px' }}>
                    Số điện thoại:{' '}
                    {handoverParty.delivererPhone?.trim()
                      ? handoverParty.delivererPhone
                      : '...........................'}
                  </span>
                </div>
                <div style={{ fontSize: '12.5px', color: '#1f2937' }}>
                  Bộ phận: {handoverParty.delivererDept || 'Taskforce Vacxin Long Châu'}
                </div>
              </div>

              {/* 2. BÊN NHẬN BÀN GIAO */}
              <div style={{ marginBottom: '10px' }}>
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: 800,
                    color: '#111827',
                    marginBottom: '6px',
                  }}
                >
                  2. BÊN NHẬN BÀN GIAO
                </div>
                <div style={{ fontSize: '12.5px', color: '#1f2937' }}>
                  <span>Bộ phận: {handoverParty.receiverDept || 'Bác sĩ'}</span>
                  <span style={{ marginLeft: '16px' }}>
                    Họ và tên:{' '}
                    {handoverParty.receiverName?.trim()
                      ? handoverParty.receiverName
                      : '...........................'}
                  </span>
                  <span style={{ marginLeft: '16px' }}>
                    Số điện thoại:{' '}
                    {handoverParty.receiverPhone?.trim()
                      ? handoverParty.receiverPhone
                      : '...........................'}
                  </span>
                </div>
              </div>

              {/* Nội dung bàn giao */}
              <div
                style={{
                  fontSize: '12.5px',
                  color: '#1f2937',
                  marginBottom: '10px',
                  lineHeight: 1.45,
                }}
              >
                <strong style={{ fontWeight: 800 }}>Nội dung bàn giao: </strong>
                <span>{getHandoverNoteText(handoverSubTab)}</span>
              </div>

              {/* A4 Tables by Sub-Tab */}
              {handoverSubTab === 'csvc' ? (
                <div>
                  <div
                    style={{
                      fontSize: '13px',
                      fontWeight: 800,
                      color: '#111827',
                      margin: '8px 0 6px 0',
                    }}
                  >
                    Các bảng biểu trong trung tâm
                  </div>
                  <table style={{ marginBottom: '14px' }}>
                    <thead>
                      <tr>
                        <th style={{ width: '34px' }}>STT</th>
                        <th>Tên sản phẩm</th>
                        <th style={{ width: '44px' }}>SL</th>
                        <th style={{ width: '50px' }}>ĐVT</th>
                        <th style={{ width: '90px' }}>Ghi chú</th>
                      </tr>
                    </thead>
                    <tbody>
                      {csvcSignageRows.map((row, idx) => (
                        <tr key={row.id}>
                          <td>{idx + 1}</td>
                          <td>{row.name}</td>
                          <td>{row.qty}</td>
                          <td>{row.unit}</td>
                          <td>{row.note || ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div
                    style={{
                      fontSize: '13px',
                      fontWeight: 800,
                      color: '#111827',
                      margin: '10px 0 6px 0',
                    }}
                  >
                    Dịch vụ kĩ thuật
                  </div>
                  <table>
                    <thead>
                      <tr>
                        <th style={{ width: '34px' }}>STT</th>
                        <th>Tên sản phẩm</th>
                        <th style={{ width: '44px' }}>SL</th>
                        <th style={{ width: '50px' }}>ĐVT</th>
                        <th style={{ width: '90px' }}>Ghi chú</th>
                      </tr>
                    </thead>
                    <tbody>
                      {csvcTechRows.map((row, idx) => (
                        <tr key={row.id}>
                          <td>{idx + 1}</td>
                          <td>{row.name}</td>
                          <td>{row.qty}</td>
                          <td>{row.unit}</td>
                          <td>{row.note || ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : handoverSubTab === 'injection_room' && handoverItems.length === 0 ? (
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: '34px' }}>STT</th>
                      <th>Tên sản phẩm</th>
                      <th style={{ width: '44px' }}>SL</th>
                      <th style={{ width: '50px' }}>ĐVT</th>
                      <th style={{ width: '90px' }}>Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody>
                    {injectionRoomRows.map((row, idx) => (
                      <tr key={row.id}>
                        <td>{idx + 1}</td>
                        <td>{row.name}</td>
                        <td>{row.qty}</td>
                        <td>{row.unit}</td>
                        <td>{row.note || ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: '32px' }}>STT</th>
                      <th style={{ width: '92px' }}>Loại</th>
                      <th>Tên sản phẩm</th>
                      <th style={{ width: '42px' }}>ĐVT</th>
                      <th style={{ width: '40px' }}>SL cấp</th>
                      <th style={{ width: '44px' }}>SL nhận</th>
                      <th style={{ width: '58px' }}>Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody>
                    {handoverItems.map((item, idx) => (
                      <tr key={item.id}>
                        <td>{idx + 1}</td>
                        <td>{item.type}</td>
                        <td>{item.name}</td>
                        <td>{item.unit}</td>
                        <td>{item.requiredQty}</td>
                        <td>
                          {item.actualQty !== null && item.actualQty !== undefined
                            ? item.actualQty
                            : ''}
                        </td>
                        <td>{getHandoverItemNoteDisplay(item)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* Footer matching IMG_0819 */}
              <div style={{ pageBreakInside: 'avoid', marginTop: '10px' }}>
                <div
                  style={{
                    fontStyle: 'italic',
                    fontSize: '11.5px',
                    color: '#374151',
                    marginBottom: '10px',
                  }}
                >
                  Người xác nhận phải bàn giao đầy đủ các hạng mục nếu có trường hợp chuyển shop hoặc thay đổi công việc
                </div>

                <div
                  style={{
                    textAlign: 'right',
                    fontSize: '13px',
                    color: '#1f2937',
                    marginBottom: '14px',
                  }}
                >
                  {formatHandoverDatePrintLine(handoverParty.handoverDate)}
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '8px',
                    textAlign: 'center',
                    paddingBottom: '48px',
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: '11.5px',
                        fontWeight: 800,
                        color: '#111827',
                      }}
                    >
                      Bên bàn giao
                    </div>
                    <div
                      style={{
                        fontSize: '10px',
                        fontStyle: 'italic',
                        color: '#6b7280',
                        marginTop: '2px',
                      }}
                    >
                      Ký và ghi rõ họ tên
                    </div>
                  </div>

                  <div>
                    <div
                      style={{
                        fontSize: '11.5px',
                        fontWeight: 800,
                        color: '#111827',
                      }}
                    >
                      Bác sĩ TTTC Long Châu
                    </div>
                    <div
                      style={{
                        fontSize: '10px',
                        fontStyle: 'italic',
                        color: '#6b7280',
                        marginTop: '2px',
                      }}
                    >
                      Ký và ghi rõ họ tên
                    </div>
                  </div>

                  <div>
                    <div
                      style={{
                        fontSize: '11.5px',
                        fontWeight: 800,
                        color: '#111827',
                      }}
                    >
                      ASM
                    </div>
                    <div
                      style={{
                        fontSize: '10px',
                        fontStyle: 'italic',
                        color: '#6b7280',
                        marginTop: '2px',
                      }}
                    >
                      Ký và ghi rõ họ tên
                    </div>
                  </div>

                  <div>
                    <div
                      style={{
                        fontSize: '11.5px',
                        fontWeight: 800,
                        color: '#111827',
                      }}
                    >
                      Bên nhận bàn giao
                    </div>
                    <div
                      style={{
                        fontSize: '10px',
                        fontStyle: 'italic',
                        color: '#6b7280',
                        marginTop: '2px',
                      }}
                    >
                      Ký và ghi rõ họ tên
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>,
          document.body
        )}
    </div>
  );
};
