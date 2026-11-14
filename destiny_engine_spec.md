# DESTINY & LONGEVITY ENGINE SPECIFICATION
### Tài Liệu Thiết Kế Kỹ Thuật & Hướng Dẫn Triển Khai (Technical Specification)

---

## 1. MÔ HÌNH DỮ LIỆU CỐT LÕI (CORE CONSTANTS & LOOKUPS)

```typescript
// 10 Thiên Can (Index 0..9)
export const CAN_LIST = ["Giáp", "Ất", "Bính", "Đinh", "Mậu", "Kỷ", "Canh", "Tân", "Nhâm", "Quý"];

// 12 Địa Chi (Index 0..11)
export const CHI_LIST = ["Tý", "Sửu", "Dần", "Mão", "Thìn", "Tỵ", "Ngọ", "Mùi", "Thân", "Dậu", "Tuất", "Hợi"];

// Ngũ Hành
export type ElementType = "KIM" | "THỦY" | "MỘC" | "HỎA" | "THỔ";

// Quan hệ tương sinh: Kim -> Thủy -> Mộc -> Hỏa -> Thổ -> Kim
export const ELEMENT_SINH: Record<ElementType, ElementType> = {
  "KIM": "THỦY", "THỦY": "MỘC", "MỘC": "HỎA", "HỎA": "THỔ", "THỔ": "KIM"
};

// Quan hệ tương khắc: Kim -> Mộc -> Thổ -> Thủy -> Hỏa -> Kim
export const ELEMENT_KHAC: Record<ElementType, ElementType> = {
  "KIM": "MỘC", "MỘC": "THỔ", "THỔ": "THỦY", "THỦY": "HỎA", "HỎA": "KIM"
};

// Bảng Lục Hợp Địa Chi (Index to Index)
export const LUC_HOP: Record<number, number> = { 
  0: 1, 1: 0, 2: 11, 11: 2, 3: 10, 10: 3, 4: 9, 9: 4, 5: 8, 8: 5, 6: 7, 7: 6 
};

// Bảng Lục Xung Địa Chi (Index to Index)
export const LUC_XUNG: Record<number, number> = { 
  0: 6, 6: 0, 1: 7, 7: 1, 2: 8, 8: 2, 3: 9, 9: 3, 4: 10, 10: 4, 5: 11, 11: 5 
};

// Bảng Tương Hại Địa Chi (Index to Index)
export const TUONG_HAI: Record<number, number> = { 
  0: 7, 7: 0, 1: 6, 6: 1, 2: 5, 5: 2, 3: 4, 4: 3, 8: 11, 11: 8, 9: 10, 10: 9 
};

// Nhóm Tam Hợp (Chi Indices)
export const TAM_HOP_GROUPS: number[][] = [
  [8, 0, 4],  // Thân - Tý - Thìn
  [2, 6, 10], // Dần - Ngọ - Tuất
  [11, 3, 7], // Hợi - Mão - Mùi
  [5, 9, 1]   // Tỵ - Dậu - Sửu
];

// Bảng Nạp Âm 60 Hoa Giáp
export const NAP_AM_TABLE: Record<string, ElementType> = {
  "Giáp Tý": "KIM", "Ất Sửu": "KIM", "Bính Dần": "HỎA", "Đinh Mão": "HỎA",
  "Mậu Thìn": "MỘC", "Kỷ Tỵ": "MỘC", "Canh Ngọ": "THỔ", "Tân Mùi": "THỔ",
  "Nhâm Thân": "KIM", "Quý Dậu": "KIM", "Giáp Tuất": "HỎA", "Ất Hợi": "HỎA",
  "Bính Tý": "THỦY", "Đinh Sửu": "THỦY", "Mậu Dần": "THỔ", "Kỷ Mão": "THỔ",
  "Canh Thìn": "KIM", "Tân Tỵ": "KIM", "Nhâm Ngọ": "MỘC", "Quý Mùi": "MỘC",
  "Giáp Thân": "THỦY", "Ất Dậu": "THỦY", "Bính Tuất": "THỔ", "Đinh Hợi": "THỔ",
  "Mậu Tý": "HỎA", "Kỷ Sửu": "HỎA", "Canh Dần": "MỘC", "Tân Mão": "MỘC",
  "Nhâm Thìn": "THỦY", "Quý Tỵ": "THỦY", "Giáp Ngọ": "KIM", "Ất Mùi": "KIM",
  "Bính Thân": "HỎA", "Đinh Dậu": "HỎA", "Mậu Tuất": "MỘC", "Kỷ Hợi": "MỘC",
  "Canh Tý": "THỔ", "Tân Sửu": "THỔ", "Nhâm Dần": "KIM", "Quý Mão": "KIM",
  "Giáp Thìn": "HỎA", "Ất Tỵ": "HỎA", "Bính Ngọ": "THỦY", "Đinh Mùi": "THỦY",
  "Mậu Thân": "THỔ", "Kỷ Dậu": "THỔ", "Canh Tuất": "KIM", "Tân Hợi": "KIM",
  "Nhâm Tý": "MỘC", "Quý Sửu": "MỘC", "Giáp Dần": "THỦY", "Ất Mão": "THỦY",
  "Bính Thìn": "THỔ", "Đinh Tỵ": "THỔ", "Mậu Ngọ": "HỎA", "Kỷ Mùi": "HỎA",
  "Canh Thân": "MỘC", "Tân Dậu": "MỘC", "Nhâm Tuất": "THỦY", "Quý Hợi": "THỦY"
};
```

---

## 2. THUẬT TOÁN ĐỔI NGÀY & GIỜ HOÀNG ĐẠO (PHỔ QUÁT CHO GUEST & LOGGED-IN)

### 2.1. Tính Julian Day Number (JD) & Can Chi Ngày
```typescript
export function getJulianDay(d: number, m: number, y: number): number {
  let a = Math.floor((14 - m) / 12);
  let y_adj = y + 4800 - a;
  let m_adj = m + 12 * a - 3;
  return d + Math.floor((153 * m_adj + 2) / 5) + 365 * y_adj + 
         Math.floor(y_adj / 4) - Math.floor(y_adj / 100) + Math.floor(y_adj / 400) - 32045;
}

export function getCanChiDay(d: number, m: number, y: number) {
  const jd = getJulianDay(d, m, y);
  const canIndex = (jd + 9) % 10;
  const chiIndex = (jd + 1) % 12;
  const canName = CAN_LIST[canIndex];
  const chiName = CHI_LIST[chiIndex];
  const fullName = `${canName} ${chiName}`;
  const element = NAP_AM_TABLE[fullName] || "KIM";

  return { canIndex, chiIndex, canName, chiName, fullName, element };
}

export function getCanChiYear(lunarYear: number) {
  const canIndex = (lunarYear + 6) % 10;
  const chiIndex = (lunarYear + 8) % 12;
  const canName = CAN_LIST[canIndex];
  const chiName = CHI_LIST[chiIndex];
  const fullName = `${canName} ${chiName}`;
  const element = NAP_AM_TABLE[fullName] || "KIM";

  return { canIndex, chiIndex, canName, chiName, fullName, element };
}
```

### 2.2. Thuật toán 12 Canh Giờ Hoàng Đạo / Hắc Đạo
* 12 Thần Sát của giờ theo chu kỳ:
  `[Thanh Long (HĐ), Minh Đường (HĐ), Thiên Hình (HĐa), Chu Tước (HĐa), Kim Quỹ (HĐ), Kim Đường (HĐ), Bạch Hổ (HĐa), Ngọc Đường (HĐ), Thiên Lao (HĐa), Huyền Vũ (HĐa), Tư Mệnh (HĐ), Câu Trận (HĐa)]`
* Điểm bắt đầu (Thanh Long) tính theo Chi của ngày:
  * Chi ngày là Dần (2), Thân (8) $\to$ Bắt đầu từ giờ Tý (0).
  * Chi ngày là Mão (3), Dậu (9) $\to$ Bắt đầu từ giờ Dần (2).
  * Chi ngày là Thìn (4), Tuất (10) $\to$ Bắt đầu từ giờ Thìn (4).
  * Chi ngày là Tỵ (5), Hợi (11) $\to$ Bắt đầu từ giờ Ngọ (6).
  * Chi ngày là Tý (0), Ngọ (6) $\to$ Bắt đầu từ giờ Thân (8).
  * Chi ngày là Sửu (1), Mùi (7) $\to$ Bắt đầu từ giờ Tuất (10).

```typescript
export interface HourInfo {
  chiIndex: number;
  chiName: string;
  timeRange: string;
  isHoangDao: boolean;
  starName: string;
}

const STAR_NAMES = [
  "Thanh Long", "Minh Đường", "Thiên Hình", "Chu Tước", "Kim Quỹ", "Kim Đường",
  "Bạch Hổ", "Ngọc Đường", "Thiên Lao", "Huyền Vũ", "Tư Mệnh", "Câu Trận"
];
const HOANG_DAO_STARS = [0, 1, 4, 5, 7, 10]; // Các index là Hoàng Đạo

const TIME_RANGES = [
  "23:00 - 01:00", "01:00 - 03:00", "03:00 - 05:00", "05:00 - 07:00",
  "07:00 - 09:00", "09:00 - 11:00", "11:00 - 13:00", "13:00 - 15:00",
  "15:00 - 17:00", "17:00 - 19:00", "19:00 - 21:00", "21:00 - 23:00"
];

export function get12Hours(dayChiIndex: number): HourInfo[] {
  let startOffset = 0;
  if ([2, 8].includes(dayChiIndex)) startOffset = 0;
  else if ([3, 9].includes(dayChiIndex)) startOffset = 2;
  else if ([4, 10].includes(dayChiIndex)) startOffset = 4;
  else if ([5, 11].includes(dayChiIndex)) startOffset = 6;
  else if ([0, 6].includes(dayChiIndex)) startOffset = 8;
  else if ([1, 7].includes(dayChiIndex)) startOffset = 10;

  const result: HourInfo[] = [];
  for (let i = 0; i < 12; i++) {
    const starIndex = (i - startOffset + 12) % 12;
    result.push({
      chiIndex: i,
      chiName: CHI_LIST[i],
      timeRange: TIME_RANGES[i],
      isHoangDao: HOANG_DAO_STARS.includes(starIndex),
      starName: STAR_NAMES[starIndex]
    });
  }
  return result;
}
```

---

## 3. QUY TẮC DƯỠNG SINH THỌ KHANG BẢO GIÁM

```typescript
export interface ThoKhangRule {
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "NONE";
  badge: string;
  advice: string;
}

export function evaluateThoKhang(lunarDay: number, lunarMonth: number): ThoKhangRule {
  // 1. Cửu Độc chi Nguyệt (Tháng 5 Âm lịch)
  const cuuDocDays = [5, 6, 7, 15, 16, 17, 25, 26, 27];
  if (lunarMonth === 5 && cuuDocDays.includes(lunarDay)) {
    return {
      severity: "CRITICAL",
      badge: "Ngày Cửu Độc",
      advice: "Khí độc và thấp nhiệt trời đất cực thịnh. Tuyệt đối kiêng phòng sự, thanh lọc cơ thể, giữ tâm trong sạch."
    };
  }

  // 2. Ngày Sóc (Mùng 1), Vọng (Rằm 15)
  if (lunarDay === 1 || lunarDay === 15) {
    return {
      severity: "HIGH",
      badge: lunarDay === 1 ? "Ngày Sóc (Mùng Một)" : "Ngày Vọng (Rằm)",
      advice: "Chu kỳ triều cường khí huyết đạt đỉnh. Nên ăn chay, giữ thân thanh tịnh, kiêng sinh hoạt vợ chồng để bảo tồn nguyên khí."
    };
  }

  // 3. Ngày Hối (Cuối tháng: 29 hoặc 30)
  if (lunarDay >= 29) {
    return {
      severity: "MEDIUM",
      badge: "Ngày Hối (Cuối Tháng)",
      advice: "Dương khí chuẩn bị chuyển giao. Nên ngủ sớm trước 23h, bồi bổ tinh thần."
    };
  }

  // 4. Ngày Thượng / Hạ huyền (Mùng 8, 23)
  if (lunarDay === 8 || lunarDay === 23) {
    return {
      severity: "LOW",
      badge: "Trăng Bán Nguyệt",
      advice: "Âm dương trong cơ thể nửa đầy nửa vơi. Tránh làm việc kiệt sức về đêm."
    };
  }

  return {
    severity: "NONE",
    badge: "Bình Hòa",
    advice: "Duy trì lối sống điều độ theo nhịp sinh học tự nhiên."
  };
}
```

---

## 4. MA TRẬN SO KHỚP CÁ NHÂN HÓA THEO TUỔI (PERSONALIZED ENGINE)

### 4.1. Hàm Tính Toán Toàn Diện
Áp dụng công thức tính điểm (Thang 100):
$$\text{DestinyScore} = 50 + \Delta_{\text{Địa Chi}} + \Delta_{\text{Ngũ Hành}} + \Delta_{\text{Hoàng Đạo}}$$

```typescript
export interface UserProfile {
  birthSolarDay: number;
  birthSolarMonth: number;
  birthSolarYear: number;
  birthLunarYear: number;
}

export interface DayTarget {
  solarDay: number;
  solarMonth: number;
  solarYear: number;
  lunarDay: number;
  lunarMonth: number;
  isHoangDao?: boolean;
}

export function calculateDailyEvaluation(target: DayTarget, user: UserProfile | null) {
  const dayCanChi = getCanChiDay(target.solarDay, target.solarMonth, target.solarYear);
  const thoKhang = evaluateThoKhang(target.lunarDay, target.lunarMonth);
  const hours = get12Hours(dayCanChi.chiIndex);

  // -------------------------------------------------------------
  // TRƯỜNG HỢP 1: NGƯỜI DÙNG CHƯA ĐĂNG NHẬP (GUEST VIEW)
  // -------------------------------------------------------------
  if (!user) {
    const isGoodGeneral = (target.isHoangDao ?? true) && thoKhang.severity !== "CRITICAL";
    return {
      isPersonalized: false,
      dayInfo: {
        solar: `${target.solarDay}/${target.solarMonth}/${target.solarYear}`,
        lunar: `${target.lunarDay}/${target.lunarMonth}`,
        canChiDay: dayCanChi.fullName,
        element: dayCanChi.element,
        isHoangDao: target.isHoangDao ?? true
      },
      thoKhang,
      hoursList: hours.map(h => ({ ...h, isPersonalFavorable: false })),
      generalStatus: isGoodGeneral ? "NGÀY LÀNH THÔNG THƯỜNG" : "NGÀY NÊN THẬN TRỌNG",
      recommendations: {
        dos: ["Thực hiện các công việc định kỳ", "Làm việc thiện, giữ tâm an", "Nghỉ ngơi đúng nhịp sinh học"],
        donts: thoKhang.severity !== "NONE" ? ["Hao tổn thận tinh", "Thức khuya sau 23h"] : ["Nóng giận, tranh chấp"]
      }
    };
  }

  // -------------------------------------------------------------
  // TRƯỜNG HỢP 2: ĐÃ ĐĂNG NHẬP (CÁ NHÂN HÓA THEO BẢN MỆNH)
  // -------------------------------------------------------------
  const userCanChi = getCanChiYear(user.birthLunarYear);
  let score = 50;
  const analysis: string[] = [];
  const dos: string[] = [];
  const donts: string[] = [];

  // 1. Phân tích Địa Chi (Trọng số 25 - 30đ)
  if (LUC_HOP[userCanChi.chiIndex] === dayCanChi.chiIndex) {
    score += 25;
    analysis.push(`Địa chi ngày (${dayCanChi.chiName}) Lục Hợp với tuổi (${userCanChi.chiName})`);
    dos.push("Ký kết hợp đồng", "Gặp gỡ quý nhân", "Khai trương");
  } else if (TAM_HOP_GROUPS.some(g => g.includes(userCanChi.chiIndex) && g.includes(dayCanChi.chiIndex))) {
    score += 20;
    analysis.push(`Địa chi ngày (${dayCanChi.chiName}) Tam Hợp với tuổi (${userCanChi.chiName})`);
    dos.push("Hợp tác dự án mới", "Bắt đầu kế hoạch quan trọng");
  } else if (LUC_XUNG[userCanChi.chiIndex] === dayCanChi.chiIndex) {
    score -= 30;
    analysis.push(`Địa chi ngày (${dayCanChi.chiName}) Lục Xung kỵ với tuổi (${userCanChi.chiName})`);
    donts.push("Hạn chế xuất hành xa", "Tránh tranh cãi đối đầu", "Không chi tiền lớn");
  } else if (TUONG_HAI[userCanChi.chiIndex] === dayCanChi.chiIndex) {
    score -= 20;
    analysis.push(`Địa chi ngày (${dayCanChi.chiName}) Tương Hại với tuổi (${userCanChi.chiName})`);
    donts.push("Cẩn trọng lời ăn tiếng nói", "Đề phòng thị phi");
  }

  // 2. Phân tích Ngũ Hành Nạp Âm (Trọng số 10 - 20đ)
  if (ELEMENT_SINH[dayCanChi.element] === userCanChi.element) {
    score += 20;
    analysis.push(`Mệnh ngày (${dayCanChi.element}) tương sinh bản mệnh (${userCanChi.element})`);
  } else if (dayCanChi.element === userCanChi.element) {
    score += 10;
    analysis.push(`Mệnh ngày (${dayCanChi.element}) đồng hành bản mệnh (${userCanChi.element})`);
  } else if (ELEMENT_KHAC[dayCanChi.element] === userCanChi.element) {
    score -= 20;
    analysis.push(`Mệnh ngày (${dayCanChi.element}) tương khắc bản mệnh (${userCanChi.element})`);
    donts.push("Tránh làm việc kiệt sức", "Giữ tinh thần điềm tĩnh");
  }

  // 3. Phụ gia Hoàng đạo
  if (target.isHoangDao) score += 5;

  // Giới hạn điểm [0 .. 100]
  score = Math.max(0, Math.min(100, score));

  // Xếp loại
  let classification = "BÌNH HÒA";
  if (score >= 75) classification = "ĐẠI CÁT";
  else if (score < 50) classification = "XUNG TUỔI / NÊN CẨN TRỌNG";

  // Cá nhân hóa danh sách 12 giờ (Đánh dấu Giờ Vàng Bản Mệnh)
  const personalizedHours = hours.map(h => {
    const isLucHopHour = LUC_HOP[userCanChi.chiIndex] === h.chiIndex;
    const isTamHopHour = TAM_HOP_GROUPS.some(g => g.includes(userCanChi.chiIndex) && g.includes(h.chiIndex));
    const isPersonalFavorable = h.isHoangDao && (isLucHopHour || isTamHopHour);
    return {
      ...h,
      isPersonalFavorable,
      badge: isPersonalFavorable ? "Giờ Vàng Bản Mệnh" : (h.isHoangDao ? "Hoàng Đạo" : "Hắc Đạo")
    };
  });

  return {
    isPersonalized: true,
    userProfile: {
      canChiYear: userCanChi.fullName,
      element: userCanChi.element
    },
    dayInfo: {
      solar: `${target.solarDay}/${target.solarMonth}/${target.solarYear}`,
      lunar: `${target.lunarDay}/${target.lunarMonth}`,
      canChiDay: dayCanChi.fullName,
      element: dayCanChi.element,
      isHoangDao: target.isHoangDao ?? true
    },
    destinyScore: score,
    classification,
    analysis,
    thoKhang,
    hoursList: personalizedHours,
    recommendations: {
      dos: dos.length > 0 ? dos : ["Tiến hành công việc bình thường", "Giữ hòa khí"],
      donts: donts.length > 0 ? donts : ["Tránh hấp tấp vội vã"]
    }
  };
}
```

---

## 5. HƯỚNG DẪN TÍCH HỢP CHO CLIENT AGENTS

1. **Client Storage:** 
   * Lưu trữ `UserProfile` tại local (ví dụ: `AsyncStorage` hoặc `MMKV`).
   * Khi `userProfile == null` $\implies$ hiển thị giao diện mặc định, không render các badge % tương hợp.
2. **Tab Bảo Thọ:**
   * Sử dụng sub-tab hoặc Segmented Control (`Ăn Chay` & `Dưỡng Sinh Thọ Khang`).
   * Kết nối hàm `evaluateThoKhang(lunarDay, lunarMonth)` để đổi màu cảnh báo (Xanh $\to$ Vàng $\to$ Đỏ).
3. **Tab Lịch (Month View):**
   * Tính toán hàng loạt 30 ngày trong tháng khi chuyển tháng.
   * Nếu user đã đăng nhập, gắn icon ⭐ cho ngày `score >= 75` và icon ❌ cho ngày `score < 50`.