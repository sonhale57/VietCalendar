export interface JobConfig {
  code: string;
  name: string;
  icon: 'file-text' | 'plane' | 'store' | 'car-front' | 'house' | 'heart' | 'scissors' | 'coins';
  goodTruc: number[];
  badTruc: number[];
  badFixedFlags: string[];
}

export const TRUC_NAMES = [
  'Kiến', 'Trừ', 'Mãn', 'Bình', 'Định', 'Chấp',
  'Phá', 'Nguy', 'Thành', 'Thâu', 'Khai', 'Bế',
] as const;

export const JOB_CATEGORIES: Record<string, JobConfig> = {
  KY_KET: {
    code: 'KY_KET',
    name: 'Ký hợp đồng, Giao dịch',
    icon: 'file-text',
    goodTruc: [8, 10, 2],
    badTruc: [6, 7, 11],
    badFixedFlags: ['TAM_NUONG', 'NGUYET_KY', 'DAI_HAO'],
  },
  XUAT_HANH: {
    code: 'XUAT_HANH',
    name: 'Xuất hành, Đi xa, Du lịch',
    icon: 'plane',
    goodTruc: [0, 4, 10],
    badTruc: [6, 11],
    badFixedFlags: ['TAM_NUONG', 'VANG_VONG', 'THIEN_TAC'],
  },
  KHAI_TRUONG: {
    code: 'KHAI_TRUONG',
    name: 'Khai trương, Mở hàng',
    icon: 'store',
    goodTruc: [10, 8, 2],
    badTruc: [1, 6, 11],
    badFixedFlags: ['TAM_NUONG', 'NGUYET_KY', 'SAT_CHU', 'THU_TU'],
  },
  MUA_XE: {
    code: 'MUA_XE',
    name: 'Mua xe, Nhận xe mới',
    icon: 'car-front',
    goodTruc: [4, 8, 2],
    badTruc: [6, 7],
    badFixedFlags: ['NGUYET_PHA', 'THU_TU', 'KIEP_SAT'],
  },
  DONG_THO: {
    code: 'DONG_THO',
    name: 'Động thổ, Xây dựng, Sửa nhà',
    icon: 'house',
    goodTruc: [4, 8, 3],
    badTruc: [6, 11],
    badFixedFlags: ['TAM_NUONG', 'SAT_CHU', 'DIA_PHA', 'THO_CAM'],
  },
  CUOI_HOI: {
    code: 'CUOI_HOI',
    name: 'Cưới hỏi, Đính hôn, Dạm ngõ',
    icon: 'heart',
    goodTruc: [4, 8, 10],
    badTruc: [6, 7, 11],
    badFixedFlags: ['TAM_NUONG', 'CO_THAN', 'QUA_TU', 'NGUYET_KY'],
  },
  CAT_TOC: {
    code: 'CAT_TOC',
    name: 'Cắt tóc, Dưỡng nhan',
    icon: 'scissors',
    goodTruc: [1, 2],
    badTruc: [7],
    badFixedFlags: ['NGUYET_HINH', 'TAM_DOC'],
  },
  CAU_TAI: {
    code: 'CAU_TAI',
    name: 'Cầu tài lộc, Đầu tư',
    icon: 'coins',
    goodTruc: [8, 10, 2],
    badTruc: [6, 11],
    badFixedFlags: ['TAM_NUONG', 'DAI_HAO', 'TIEU_HAO'],
  },
};

export const FIXED_FLAG_LABELS: Record<string, string> = {
  TAM_NUONG: 'Tam Nương',
  NGUYET_KY: 'Nguyệt Kỵ',
  DAI_HAO: 'Đại Hao',
  VANG_VONG: 'Vãng Vong',
  THIEN_TAC: 'Thiên Tặc',
  SAT_CHU: 'Sát Chủ',
  THU_TU: 'Thụ Tử',
  NGUYET_PHA: 'Nguyệt Phá',
  KIEP_SAT: 'Kiếp Sát',
  DIA_PHA: 'Địa Phá',
  THO_CAM: 'Thổ Cấm',
  CO_THAN: 'Cô Thần',
  QUA_TU: 'Quả Tú',
  NGUYET_HINH: 'Nguyệt Hình',
  TAM_DOC: 'Tam Độc',
  TIEU_HAO: 'Tiểu Hao',
};
