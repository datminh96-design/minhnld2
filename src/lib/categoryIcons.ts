import React from 'react';
import {
  Utensils,
  Coffee,
  ShoppingBag,
  ShoppingCart,
  Shirt,
  Home,
  Zap,
  Wifi,
  Car,
  Fuel,
  Bus,
  Plane,
  Film,
  Music,
  Gamepad2,
  Tv,
  HeartPulse,
  Stethoscope,
  Pill,
  Briefcase,
  Award,
  Clock,
  TrendingUp,
  TrendingDown,
  PieChart,
  Coins,
  DollarSign,
  Wallet,
  PiggyBank,
  GraduationCap,
  BookOpen,
  Laptop,
  Smartphone,
  Users,
  Baby,
  Gift,
  Heart,
  Dumbbell,
  Trophy,
  Scissors,
  Sparkles,
  Shield,
  FileText,
  CreditCard,
  Building,
  Key,
  Truck,
  PlusCircle,
  MoreHorizontal,
  LucideIcon
} from 'lucide-react';

export interface CategoryIconOption {
  name: string;
  label: string;
  category: string;
  Icon: LucideIcon;
  defaultColor: string;
}

export const AVAILABLE_CATEGORY_ICONS: CategoryIconOption[] = [
  // Ăn uống & Tiêu dùng
  { name: 'Utensils', label: 'Ăn uống', category: 'F&B', Icon: Utensils, defaultColor: '#EF4444' },
  { name: 'Coffee', label: 'Cà phê & Trà', category: 'F&B', Icon: Coffee, defaultColor: '#B45309' },
  { name: 'ShoppingCart', label: 'Đi chợ & Siêu thị', category: 'F&B', Icon: ShoppingCart, defaultColor: '#10B981' },
  { name: 'ShoppingBag', label: 'Mua sắm', category: 'Shopping', Icon: ShoppingBag, defaultColor: '#06B6D4' },
  { name: 'Shirt', label: 'Quần áo & Thời trang', category: 'Shopping', Icon: Shirt, defaultColor: '#EC4899' },
  
  // Nhà cửa & Tiện ích
  { name: 'Home', label: 'Nhà ở & Tiền thuê', category: 'Housing', Icon: Home, defaultColor: '#F97316' },
  { name: 'Zap', label: 'Điện nước & Năng lượng', category: 'Housing', Icon: Zap, defaultColor: '#EAB308' },
  { name: 'Wifi', label: 'Internet & Truyền hình', category: 'Housing', Icon: Wifi, defaultColor: '#3B82F6' },
  { name: 'Building', label: 'Căn hộ & Dịch vụ', category: 'Housing', Icon: Building, defaultColor: '#64748B' },
  { name: 'Key', label: 'Bảo trì & Sửa chữa', category: 'Housing', Icon: Key, defaultColor: '#78716C' },

  // Đi lại & Di chuyển
  { name: 'Car', label: 'Xe cộ & Đi lại', category: 'Transport', Icon: Car, defaultColor: '#F59E0B' },
  { name: 'Fuel', label: 'Xăng dầu & Trạm sạc', category: 'Transport', Icon: Fuel, defaultColor: '#D97706' },
  { name: 'Bus', label: 'Xe buýt & Công cộng', category: 'Transport', Icon: Bus, defaultColor: '#84CC16' },
  { name: 'Plane', label: 'Vé máy bay & Du lịch', category: 'Transport', Icon: Plane, defaultColor: '#0EA5E9' },
  { name: 'Truck', label: 'Vận chuyển & Ship hàng', category: 'Transport', Icon: Truck, defaultColor: '#6366F1' },

  // Sức khỏe & Thể thao
  { name: 'HeartPulse', label: 'Y tế & Sức khỏe', category: 'Health', Icon: HeartPulse, defaultColor: '#F43F5E' },
  { name: 'Stethoscope', label: 'Khám chữa bệnh', category: 'Health', Icon: Stethoscope, defaultColor: '#E11D48' },
  { name: 'Pill', label: 'Thuốc men & Dược phẩm', category: 'Health', Icon: Pill, defaultColor: '#FB7185' },
  { name: 'Dumbbell', label: 'Gym & Thể dục', category: 'Health', Icon: Dumbbell, defaultColor: '#10B981' },
  { name: 'Trophy', label: 'Thể thao & Giải đấu', category: 'Health', Icon: Trophy, defaultColor: '#F59E0B' },

  // Giải trí & Đời sống
  { name: 'Film', label: 'Xem phim & Giải trí', category: 'Entertainment', Icon: Film, defaultColor: '#8B5CF6' },
  { name: 'Music', label: 'Âm nhạc & Show diễn', category: 'Entertainment', Icon: Music, defaultColor: '#A855F7' },
  { name: 'Gamepad2', label: 'Game & Nạp thẻ', category: 'Entertainment', Icon: Gamepad2, defaultColor: '#6366F1' },
  { name: 'Scissors', label: 'Cắt tóc & Làm đẹp', category: 'Lifestyle', Icon: Scissors, defaultColor: '#D946EF' },
  { name: 'Sparkles', label: 'Spa & Chăm sóc', category: 'Lifestyle', Icon: Sparkles, defaultColor: '#EC4899' },
  { name: 'Gift', label: 'Quà tặng & Sinh nhật', category: 'Social', Icon: Gift, defaultColor: '#FB7185' },
  { name: 'Heart', label: 'Hiếu hỷ & Đám cưới', category: 'Social', Icon: Heart, defaultColor: '#E11D48' },
  { name: 'Users', label: 'Gia đình & Người thân', category: 'Social', Icon: Users, defaultColor: '#8B5CF6' },
  { name: 'Baby', label: 'Con cái & Trẻ nhỏ', category: 'Social', Icon: Baby, defaultColor: '#F472B6' },

  // Công việc & Học tập
  { name: 'Laptop', label: 'Công nghệ & Thiết bị', category: 'Work', Icon: Laptop, defaultColor: '#3B82F6' },
  { name: 'Smartphone', label: 'Điện thoại & 4G/5G', category: 'Work', Icon: Smartphone, defaultColor: '#0284C7' },
  { name: 'GraduationCap', label: 'Học phí & Khóa học', category: 'Education', Icon: GraduationCap, defaultColor: '#2563EB' },
  { name: 'BookOpen', label: 'Sách & Giáo trình', category: 'Education', Icon: BookOpen, defaultColor: '#4F46E5' },
  { name: 'FileText', label: 'Hồ sơ & Giấy tờ', category: 'Work', Icon: FileText, defaultColor: '#64748B' },

  // Thu nhập & Tài chính
  { name: 'Briefcase', label: 'Lương chính thức', category: 'Income', Icon: Briefcase, defaultColor: '#10B981' },
  { name: 'Award', label: 'Thưởng & Hoa hồng', category: 'Income', Icon: Award, defaultColor: '#059669' },
  { name: 'Clock', label: 'Làm thêm & Tăng ca', category: 'Income', Icon: Clock, defaultColor: '#34D399' },
  { name: 'TrendingUp', label: 'Kinh doanh & Lợi nhuận', category: 'Income', Icon: TrendingUp, defaultColor: '#10B981' },
  { name: 'PieChart', label: 'Đầu tư & Cổ tức', category: 'Investment', Icon: PieChart, defaultColor: '#14B8A6' },
  { name: 'Coins', label: 'Tài sản & Tiền tệ', category: 'Investment', Icon: Coins, defaultColor: '#0EA5E9' },
  { name: 'PiggyBank', label: 'Tiết kiệm & Tích lũy', category: 'Finance', Icon: PiggyBank, defaultColor: '#06B6D4' },
  { name: 'CreditCard', label: 'Thẻ tín dụng & Trả góp', category: 'Finance', Icon: CreditCard, defaultColor: '#9333EA' },
  { name: 'Shield', label: 'Bảo hiểm & An toàn', category: 'Finance', Icon: Shield, defaultColor: '#059669' },
  { name: 'MoreHorizontal', label: 'Khác', category: 'General', Icon: MoreHorizontal, defaultColor: '#94A3B8' },
];

const ICON_LOOKUP: Record<string, LucideIcon> = {};
AVAILABLE_CATEGORY_ICONS.forEach((item) => {
  ICON_LOOKUP[item.name] = item.Icon;
});

// Automatic keyword matcher for smart icon & color detection
export function getCategoryIconMeta(
  name: string = '',
  iconName?: string,
  customColor?: string
): {
  Icon: LucideIcon;
  color: string;
  bgColor: string;
  iconName: string;
} {
  const cleanName = (name || '').toLowerCase().trim();

  // 1. Explicit Icon Name provided
  if (iconName && ICON_LOOKUP[iconName]) {
    const color = customColor || '#10B981';
    return {
      Icon: ICON_LOOKUP[iconName],
      color,
      bgColor: getSoftBgColor(color),
      iconName,
    };
  }

  // 2. Keyword based automatic resolution
  let detectedIcon: LucideIcon = MoreHorizontal;
  let detectedName = 'MoreHorizontal';
  let detectedColor = customColor || '#64748B';

  if (/ăn|uống|cơm|phở|bún|bánh|lẩu|nướng|nhậu|trưa|tối|sáng|restaurant|food/i.test(cleanName)) {
    detectedIcon = Utensils;
    detectedName = 'Utensils';
    detectedColor = customColor || '#EF4444';
  } else if (/cafe|cà phê|trà|milk tea|sinh tố|nước ép|coffee/i.test(cleanName)) {
    detectedIcon = Coffee;
    detectedName = 'Coffee';
    detectedColor = customColor || '#B45309';
  } else if (/chợ|siêu thị|bách hóa|mart|rau|thịt|cá|tạp hóa/i.test(cleanName)) {
    detectedIcon = ShoppingCart;
    detectedName = 'ShoppingCart';
    detectedColor = customColor || '#10B981';
  } else if (/mua sắm|shopee|tiki|lazada|shopping|đồ dùng|thiết bị/i.test(cleanName)) {
    detectedIcon = ShoppingBag;
    detectedName = 'ShoppingBag';
    detectedColor = customColor || '#06B6D4';
  } else if (/quần áo|váy|giày|dép|túi|thời trang|fashion/i.test(cleanName)) {
    detectedIcon = Shirt;
    detectedName = 'Shirt';
    detectedColor = customColor || '#EC4899';
  } else if (/nhà|thuê|trọ|chung cư|tiện ích|housing|rent/i.test(cleanName)) {
    detectedIcon = Home;
    detectedName = 'Home';
    detectedColor = customColor || '#F97316';
  } else if (/điện|nước|rác|năng lượng|electric/i.test(cleanName)) {
    detectedIcon = Zap;
    detectedName = 'Zap';
    detectedColor = customColor || '#EAB308';
  } else if (/internet|wifi|mạng|cáp|truyền hình/i.test(cleanName)) {
    detectedIcon = Wifi;
    detectedName = 'Wifi';
    detectedColor = customColor || '#3B82F6';
  } else if (/xăng|dầu|nhiên liệu|gas/i.test(cleanName)) {
    detectedIcon = Fuel;
    detectedName = 'Fuel';
    detectedColor = customColor || '#EAB308';
  } else if (/xe|đi lại|grab|be|taxi|bảo dưỡng|gửi xe|transport/i.test(cleanName)) {
    detectedIcon = Car;
    detectedName = 'Car';
    detectedColor = customColor || '#F59E0B';
  } else if (/máy bay|du lịch|travel|tour|khách sạn|flight/i.test(cleanName)) {
    detectedIcon = Plane;
    detectedName = 'Plane';
    detectedColor = customColor || '#0EA5E9';
  } else if (/thuốc|y tế|sức khỏe|khám|bệnh|nha khoa|bác sĩ|health|pharmacy/i.test(cleanName)) {
    detectedIcon = HeartPulse;
    detectedName = 'HeartPulse';
    detectedColor = customColor || '#F43F5E';
  } else if (/gym|thể thao|bóng đá|cầu lông|fitness|workout/i.test(cleanName)) {
    detectedIcon = Dumbbell;
    detectedName = 'Dumbbell';
    detectedColor = customColor || '#10B981';
  } else if (/phim|rạp|netflix|cinema|giải trí|entertainment/i.test(cleanName)) {
    detectedIcon = Film;
    detectedName = 'Film';
    detectedColor = customColor || '#8B5CF6';
  } else if (/game|nạp thẻ|steam|playstation/i.test(cleanName)) {
    detectedIcon = Gamepad2;
    detectedName = 'Gamepad2';
    detectedColor = customColor || '#6366F1';
  } else if (/tóc|spa|làm đẹp|mỹ phẩm|beauty|skincare/i.test(cleanName)) {
    detectedIcon = Scissors;
    detectedName = 'Scissors';
    detectedColor = customColor || '#D946EF';
  } else if (/học|sách|khóa học|course|education|trường/i.test(cleanName)) {
    detectedIcon = GraduationCap;
    detectedName = 'GraduationCap';
    detectedColor = customColor || '#2563EB';
  } else if (/lương|salary|wage/i.test(cleanName)) {
    detectedIcon = Briefcase;
    detectedName = 'Briefcase';
    detectedColor = customColor || '#10B981';
  } else if (/thưởng|bonus|kpi|hoa hồng/i.test(cleanName)) {
    detectedIcon = Award;
    detectedName = 'Award';
    detectedColor = customColor || '#059669';
  } else if (/đầu tư|cổ phiếu|chứng khoán|crypto|bitcoin|invest/i.test(cleanName)) {
    detectedIcon = TrendingUp;
    detectedName = 'TrendingUp';
    detectedColor = customColor || '#10B981';
  } else if (/tiết kiệm|saving|heo đất/i.test(cleanName)) {
    detectedIcon = PiggyBank;
    detectedName = 'PiggyBank';
    detectedColor = customColor || '#06B6D4';
  } else if (/bảo hiểm|insurance/i.test(cleanName)) {
    detectedIcon = Shield;
    detectedName = 'Shield';
    detectedColor = customColor || '#059669';
  } else if (/quà|biếu|tặng|sinh nhật|gift/i.test(cleanName)) {
    detectedIcon = Gift;
    detectedName = 'Gift';
    detectedColor = customColor || '#FB7185';
  } else if (/gia đình|hiếu hỷ|đám cưới|ma chay|family/i.test(cleanName)) {
    detectedIcon = Users;
    detectedName = 'Users';
    detectedColor = customColor || '#8B5CF6';
  } else if (/điện thoại|4g|5g|sim|nạp tiền/i.test(cleanName)) {
    detectedIcon = Smartphone;
    detectedName = 'Smartphone';
    detectedColor = customColor || '#0284C7';
  }

  return {
    Icon: detectedIcon,
    color: detectedColor,
    bgColor: getSoftBgColor(detectedColor),
    iconName: detectedName,
  };
}

function getSoftBgColor(hexColor: string): string {
  if (!hexColor || !hexColor.startsWith('#')) return 'rgba(148, 163, 184, 0.15)';
  // Convert 6-digit hex to rgba with 12% opacity
  if (hexColor.length === 7) {
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, 0.14)`;
  }
  return hexColor + '20';
}
