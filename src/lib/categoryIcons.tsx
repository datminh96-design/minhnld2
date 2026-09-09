import React from 'react';
import {
  Briefcase,
  Award,
  Clock,
  TrendingUp,
  PieChart,
  PlusCircle,
  Utensils,
  Home,
  Car,
  Fuel,
  Zap,
  ShoppingBag,
  Film,
  HeartPulse,
  Users,
  Laptop,
  Coins,
  MoreHorizontal,
  HelpCircle,
  Coffee,
  Plane,
  Cigarette,
  Flame,
  Smartphone,
  Wifi,
  Stethoscope,
  Heart,
  GraduationCap,
  PiggyBank,
  BookOpen,
  DollarSign,
  Gift,
  Building2,
  Tv,
  Gamepad2,
  Shirt,
  Baby,
  Dog,
  ShieldAlert,
  CreditCard,
  Building
} from 'lucide-react';

export interface CategoryIconMeta {
  Icon: React.ElementType;
  color: string;
  bgColor: string;
  darkBgColor: string;
  textColor: string;
}

// Map of explicit icon names
export const ICON_NAME_MAP: Record<string, React.ElementType> = {
  Briefcase,
  Award,
  Clock,
  TrendingUp,
  PieChart,
  PlusCircle,
  Utensils,
  Home,
  Car,
  Fuel,
  Zap,
  ShoppingBag,
  Film,
  HeartPulse,
  Users,
  Laptop,
  Coins,
  MoreHorizontal,
  HelpCircle,
  Coffee,
  Plane,
  Cigarette,
  Flame,
  Smartphone,
  Wifi,
  Stethoscope,
  Heart,
  GraduationCap,
  PiggyBank,
  BookOpen,
  DollarSign,
  Gift,
  Building2,
  Tv,
  Gamepad2,
  Shirt,
  Baby,
  Dog,
  CreditCard,
  Building,
};

// Available icons for user selection when creating a category
export const AVAILABLE_CATEGORY_ICONS = [
  { name: 'Utensils', label: 'Ăn uống', Icon: Utensils },
  { name: 'Coffee', label: 'Cà phê', Icon: Coffee },
  { name: 'Car', label: 'Xe cộ', Icon: Car },
  { name: 'Fuel', label: 'Xăng xe', Icon: Fuel },
  { name: 'Home', label: 'Nhà ở', Icon: Home },
  { name: 'Zap', label: 'Điện nước', Icon: Zap },
  { name: 'ShoppingBag', label: 'Mua sắm', Icon: ShoppingBag },
  { name: 'Shirt', label: 'Quần áo', Icon: Shirt },
  { name: 'Film', label: 'Giải trí', Icon: Film },
  { name: 'Gamepad2', label: 'Game', Icon: Gamepad2 },
  { name: 'HeartPulse', label: 'Y tế / Thuốc', Icon: HeartPulse },
  { name: 'Users', label: 'Gia đình', Icon: Users },
  { name: 'Baby', label: 'Con cái', Icon: Baby },
  { name: 'Dog', label: 'Thú cưng', Icon: Dog },
  { name: 'GraduationCap', label: 'Học tập', Icon: GraduationCap },
  { name: 'Briefcase', label: 'Công việc / Lương', Icon: Briefcase },
  { name: 'Award', label: 'Thưởng', Icon: Award },
  { name: 'TrendingUp', label: 'Đầu tư', Icon: TrendingUp },
  { name: 'PiggyBank', label: 'Tiết kiệm', Icon: PiggyBank },
  { name: 'Coins', label: 'Tiền bạc', Icon: Coins },
  { name: 'Plane', label: 'Du lịch', Icon: Plane },
  { name: 'Cigarette', label: 'Thuốc lá', Icon: Cigarette },
  { name: 'Smartphone', label: 'Thiết bị / ĐT', Icon: Smartphone },
  { name: 'CreditCard', label: 'Thẻ / Trả góp', Icon: CreditCard },
  { name: 'MoreHorizontal', label: 'Khác', Icon: MoreHorizontal },
];

/**
 * Intelligent helper that extracts or infers the most accurate Icon & Color palette for any category
 */
export function getCategoryIconMeta(categoryName: string, iconName?: string, customColor?: string): CategoryIconMeta {
  const norm = (categoryName || '').toLowerCase().trim();

  // 1. If explicit iconName matches our icon map
  if (iconName && ICON_NAME_MAP[iconName]) {
    const IconComp = ICON_NAME_MAP[iconName];
    const color = customColor || getAutoColorForCategory(norm);
    return {
      Icon: IconComp,
      color,
      bgColor: `${color}15`,
      darkBgColor: `${color}25`,
      textColor: color,
    };
  }

  // 2. Intelligent semantic matching based on category name
  let MatchedIcon: React.ElementType = HelpCircle;

  if (norm.includes('lương') || norm.includes('salary')) {
    MatchedIcon = Briefcase;
  } else if (norm.includes('thưởng') || norm.includes('bonus') || norm.includes('kpi')) {
    MatchedIcon = Award;
  } else if (norm.includes('làm thêm') || norm.includes('ot') || norm.includes('overtime')) {
    MatchedIcon = Clock;
  } else if (norm.includes('kinh doanh') || norm.includes('bán hàng') || norm.includes('business')) {
    MatchedIcon = Building2;
  } else if (norm.includes('đầu tư') || norm.includes('cổ tức') || norm.includes('invest') || norm.includes('chứng khoán')) {
    MatchedIcon = TrendingUp;
  } else if (norm.includes('tiết kiệm') || norm.includes('tích lũy') || norm.includes('saving')) {
    MatchedIcon = PiggyBank;
  } else if (norm.includes('ăn uống') || norm.includes('ẩm thực') || norm.includes('cơm') || norm.includes('food')) {
    MatchedIcon = Utensils;
  } else if (norm.includes('cà phê') || norm.includes('cafe') || norm.includes('coffee') || norm.includes('trà')) {
    MatchedIcon = Coffee;
  } else if (norm.includes('xăng')) {
    MatchedIcon = Fuel;
  } else if (norm.includes('đi lại') || norm.includes('xe cộ') || norm.includes('xe') || norm.includes('transport') || norm.includes('grab')) {
    MatchedIcon = Car;
  } else if (norm.includes('nhà ở') || norm.includes('tiền nhà') || norm.includes('thuê nhà') || norm.includes('home')) {
    MatchedIcon = Home;
  } else if (norm.includes('điện nước') || norm.includes('điện') || norm.includes('hóa đơn') || norm.includes('bill') || norm.includes('internet') || norm.includes('wifi')) {
    MatchedIcon = Zap;
  } else if (norm.includes('mua sắm') || norm.includes('thiết bị') || norm.includes('shopping') || norm.includes('shopee') || norm.includes('lazada')) {
    MatchedIcon = ShoppingBag;
  } else if (norm.includes('quần áo') || norm.includes('thời trang') || norm.includes('clothes')) {
    MatchedIcon = Shirt;
  } else if (norm.includes('giải trí') || norm.includes('du lịch') || norm.includes('phim') || norm.includes('cinema') || norm.includes('travel')) {
    MatchedIcon = Film;
  } else if (norm.includes('game') || norm.includes('chơi')) {
    MatchedIcon = Gamepad2;
  } else if (norm.includes('y tế') || norm.includes('sức khỏe') || norm.includes('thuốc men') || norm.includes('bác sĩ') || norm.includes('khám') || norm.includes('health')) {
    MatchedIcon = HeartPulse;
  } else if (norm.includes('thuốc lá') || norm.includes('hút thuốc') || norm.includes('vape') || norm.includes('tobacco') || norm.includes('cigarette')) {
    MatchedIcon = Cigarette;
  } else if (norm.includes('gia đình') || norm.includes('hiếu hỷ') || norm.includes('cưới') || norm.includes('bố mẹ') || norm.includes('family')) {
    MatchedIcon = Users;
  } else if (norm.includes('học tập') || norm.includes('học phí') || norm.includes('sách') || norm.includes('khóa học') || norm.includes('education')) {
    MatchedIcon = GraduationCap;
  } else if (norm.includes('công việc') || norm.includes('văn phòng') || norm.includes('work')) {
    MatchedIcon = Laptop;
  } else if (norm.includes('thú cưng') || norm.includes('chó') || norm.includes('mèo') || norm.includes('pet')) {
    MatchedIcon = Dog;
  } else if (norm.includes('con cái') || norm.includes('em bé') || norm.includes('bỉm sữa') || norm.includes('baby')) {
    MatchedIcon = Baby;
  } else if (norm.includes('trả góp') || norm.includes('khoản nợ') || norm.includes('vay') || norm.includes('thẻ tín dụng') || norm.includes('credit')) {
    MatchedIcon = CreditCard;
  } else if (norm.includes('khác') || norm.includes('other')) {
    MatchedIcon = MoreHorizontal;
  }

  const color = customColor || getAutoColorForCategory(norm);

  return {
    Icon: MatchedIcon,
    color,
    bgColor: `${color}15`,
    darkBgColor: `${color}25`,
    textColor: color,
  };
}

function getAutoColorForCategory(norm: string): string {
  if (norm.includes('lương')) return '#10B981';
  if (norm.includes('thưởng')) return '#F59E0B';
  if (norm.includes('làm thêm')) return '#06B6D4';
  if (norm.includes('kinh doanh')) return '#6366F1';
  if (norm.includes('đầu tư') || norm.includes('cổ tức')) return '#8B5CF6';
  if (norm.includes('thu nhập khác')) return '#14B8A6';
  
  if (norm.includes('ăn uống') || norm.includes('cơm') || norm.includes('food')) return '#EF4444';
  if (norm.includes('cà phê') || norm.includes('cafe')) return '#B45309';
  if (norm.includes('nhà ở')) return '#F97316';
  if (norm.includes('đi lại') || norm.includes('xe cộ')) return '#F59E0B';
  if (norm.includes('xăng')) return '#EAB308';
  if (norm.includes('điện nước') || norm.includes('internet')) return '#3B82F6';
  if (norm.includes('mua sắm') || norm.includes('thiết bị')) return '#EC4899';
  if (norm.includes('giải trí') || norm.includes('du lịch')) return '#8B5CF6';
  if (norm.includes('y tế') || norm.includes('sức khỏe')) return '#10B981';
  if (norm.includes('gia đình') || norm.includes('hiếu hỷ')) return '#F43F5E';
  if (norm.includes('công việc') || norm.includes('học tập')) return '#0284C7';
  if (norm.includes('tích lũy') || norm.includes('tiết kiệm')) return '#06B6D4';
  if (norm.includes('thuốc lá')) return '#78716C';
  return '#64748B';
}
