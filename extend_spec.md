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

* 12 Thần Sát của giờ:
  `[Thanh Long (HĐ), Minh Đường (HĐ), Thiên Hình (HĐa), Chu Tước (HĐa), Kim Quỹ (HĐ), Kim Đường (HĐ), Bạch Hổ (HĐa), Ngọc Đường (HĐ), Thiên Lao (HĐa), Huyền Vũ (HĐa), Tư Mệnh (HĐ), Câu Trận (HĐa)]`

* Quy tắc điểm bắt đầu (Thanh Long) theo Chi ngày:
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

## 3. THUẬT TOÁN GẮN NHÃN BẢO THỌ: ĐẠI KỴ DƯỠNG TINH & THẬP TRAI HỘ SINH

Phần này triển khai trực tiếp 2 tinh thần của sách **Thọ Khang Bảo Giám**:
1. **Giới Dâm (Dưỡng Tinh / Nhiếp Sinh):** Gắn nhãn các ngày đại kỵ phòng sự để giữ thận khí, tích thọ.
2. **Giới Sát (Hộ Sinh / Trai Giới):** Gắn nhãn 10 ngày Trai giới Phật giáo (Thập Trai) để ăn chay, phóng sinh, dưỡng tâm từ bi.

### 3.1. Quy tắc Thập Trai (Phật Giáo - Hộ Sinh)
10 ngày âm lịch cố định mỗi tháng:
* **Tháng đủ (30 ngày):** Mùng 1, 8, 14, 15, 18, 23, 24, 28, 29, 30.
* **Tháng thiếu (29 ngày):** Ngày 28 chuyển thành ngày 27, ngày 29 chuyển thành 28, ngày 30 chuyển thành 29 (tức là 27, 28, 29).

### 3.2. Quy tắc Ngày Đại Kỵ Thọ Khang Bảo Giám (Dưỡng Tinh)
* **Mức CRITICAL (Đại Kỵ Tuyệt Đối):**
  * Tháng 5 Âm lịch (Tháng Cửu Độc): Mùng 5, 6, 7; 15, 16, 17; 25, 26, 27.
* **Mức HIGH (Cảnh Báo Cao):**
  * Ngày Sóc (Mùng 1), Ngày Vọng (Rằm 15), Ngày Hối (29/30 âm lịch).
  * Ngày 14 và 16 âm lịch (Giáp trước và sau Rằm).
* **Mức MEDIUM (Cẩn Trọng):**
  * Ngày Mùng 8 (Thượng huyền), 23 (Hạ huyền).

### 3.3. Implementation Hàm Gắn Nhãn Độc Lập

```typescript
export interface LongevityBadgeInfo {
  // Nhóm Giới Sát / Trai Giới
  isThapTrai: boolean;
  thapTraiBadge: string | null;      // "Ngày Thập Trai" | null
  thapTraiAdvice: string | null;     // Khuyến nghị ăn chay, phóng sinh

  // Nhóm Giới Dâm / Đại Kỵ Phòng Sự
  isDaiKy: boolean;
  daiKyLevel: "CRITICAL" | "HIGH" | "MEDIUM" | "NONE";
  daiKyBadge: string | null;         // "Đại Kỵ Phòng Sự" | "Kỵ Phòng Sự" | null
  daiKyReason: string | null;        // Lý do theo Thọ Khang Bảo Giám
  daiKyAdvice: string | null;        // Khuyên giữ thân thanh tịnh, dưỡng tinh
}

export function evaluateLongevityBadges(
  lunarDay: number,
  lunarMonth: number,
  isLeapMonth: boolean = false,
  isMonthTotal29Days: boolean = false
): LongevityBadgeInfo {
  // ---------------------------------------------------------
  // 1. TÍNH TOÁN NGÀY THẬP TRAI (GIỚI SÁT / ĂN CHAY)
  // ---------------------------------------------------------
  let thapTraiDays = [1, 8, 14, 15, 18, 23, 24, 28, 29, 30];
  if (isMonthTotal29Days) {
    // Nếu tháng thiếu 29 ngày, 3 ngày cuối dồn về 27, 28, 29
    thapTraiDays = [1, 8, 14, 15, 18, 23, 24, 27, 28, 29];
  }

  const isThapTrai = thapTraiDays.includes(lunarDay);
  const thapTraiBadge = isThapTrai ? "Ngày Thập Trai" : null;
  const thapTraiAdvice = isThapTrai 
    ? "Hôm nay là ngày Thập Trai: Nên ăn chay, phóng sinh cứu vật, dưỡng tâm từ bi tích phúc." 
    : null;

  // ---------------------------------------------------------
  // 2. TÍNH TOÁN NGÀY ĐẠI KỴ DƯỠNG TINH (GIỚI DÂM / THỌ KHANG BẢO GIÁM)
  // ---------------------------------------------------------
  const cuuDocDays = [5, 6, 7, 15, 16, 17, 25, 26, 27];
  
  // A. Trường hợp Cực Độc: Tháng 5 Âm lịch
  if (lunarMonth === 5 && cuuDocDays.includes(lunarDay)) {
    return {
      isThapTrai,
      thapTraiBadge,
      thapTraiAdvice,
      isDaiKy: true,
      daiKyLevel: "CRITICAL",
      daiKyBadge: "Đại Kỵ Cửu Độc",
      daiKyReason: "Ngày cực độc trong tháng 5 Âm lịch, thấp nhiệt và độc khí trời đất thịnh nhất năm.",
      daiKyAdvice: "Tuyệt đối kiêng cữ phòng sự để bảo toàn thọ mạng; thanh lọc cơ thể và giữ tâm an định."
    };
  }

  // B. Trường hợp Ngày Sóc (1), Ngày Vọng (15), Ngày Hối (29/30)
  if (lunarDay === 1 || lunarDay === 15) {
    return {
      isThapTrai,
      thapTraiBadge,
      thapTraiAdvice,
      isDaiKy: true,
      daiKyLevel: "HIGH",
      daiKyBadge: "Đại Kỵ Phòng Sự",
      daiKyReason: lunarDay === 1 
        ? "Ngày Sóc (Mùng 1): Khí huyết biến chuyển giao hòa giữa trời đất." 
        : "Ngày Vọng (Rằm 15): Lực triều cường đạt cực đại, khí huyết xung động.",
      daiKyAdvice: "Nghiêm cẩn kiêng phòng sự; nên ăn chay, dưỡng thận khí, tránh hao tổn nguyên tinh."
    };
  }

  // Giáp Rằm (14 và 16)
  if (lunarDay === 14 || lunarDay === 16) {
    return {
      isThapTrai,
      thapTraiBadge,
      thapTraiAdvice,
      isDaiKy: true,
      daiKyLevel: "HIGH",
      daiKyBadge: "Kỵ Phòng Sự (Giáp Rằm)",
      daiKyReason: "Ngày trước và sau Rằm, từ trường âm dương vẫn trong pha biến động mạnh.",
      daiKyAdvice: "Hạn chế phòng sự, giữ thân thể thanh tịnh và đi ngủ trước 23h."
    };
  }

  // Cuối tháng (29 hoặc 30)
  if (lunarDay === 30 || (isMonthTotal29Days && lunarDay === 29)) {
    return {
      isThapTrai,
      thapTraiBadge,
      thapTraiAdvice,
      isDaiKy: true,
      daiKyLevel: "HIGH",
      daiKyBadge: "Kỵ Phòng Sự (Cuối Tháng)",
      daiKyReason: "Ngày Hối (tàn tháng): Dương khí suy vi, sinh khí bắt đầu chuyển giao.",
      daiKyAdvice: "Nghỉ ngơi sớm, tránh thức khuya và hao tổn tinh lực."
    };
  }

  // C. Trường hợp Bán Nguyệt (Mùng 8, 23)
  if (lunarDay === 8 || lunarDay === 23) {
    return {
      isThapTrai,
      thapTraiBadge,
      thapTraiAdvice,
      isDaiKy: true,
      daiKyLevel: "MEDIUM",
      daiKyBadge: "Nên Kiêng Dục",
      daiKyReason: "Trăng bán nguyệt (Thượng/Hạ huyền): Khí âm dương chưa cân bằng.",
      daiKyAdvice: "Hạn chế lao lực và sinh hoạt quá độ về đêm."
    };
  }

  // D. Ngày Bình Thường
  return {
    isThapTrai,
    thapTraiBadge,
    thapTraiAdvice,
    isDaiKy: false,
    daiKyLevel: "NONE",
    daiKyBadge: null,
    daiKyReason: null,
    daiKyAdvice: "Sinh hoạt và nghỉ ngơi điều độ theo nhịp sinh học tự nhiên."
  };
}
```

---

## 4. MA TRẬN SO KHỚP CÁ NHÂN HÓA THEO TUỔI (PERSONALIZED ENGINE)

Áp dụng công thức tính điểm (Thang 100):
$$
\text{DestinyScore} = 50 + \Delta_{\text{Địa Chi}} + \Delta_{\text{Ngũ Hành}} + \Delta_{\text{Hoàng Đạo}}
$$

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
  isLeapMonth?: boolean;
  isMonthTotal29Days?: boolean;
  isHoangDao?: boolean;
}

export function calculateDailyEvaluation(target: DayTarget, user: UserProfile | null) {
  const dayCanChi = getCanChiDay(target.solarDay, target.solarMonth, target.solarYear);
  const longevityBadges = evaluateLongevityBadges(
    target.lunarDay, 
    target.lunarMonth, 
    target.isLeapMonth ?? false, 
    target.isMonthTotal29Days ?? false
  );
  const hours = get12Hours(dayCanChi.chiIndex);

  // -------------------------------------------------------------
  // TRƯỜNG HỢP 1: NGƯỜI DÙNG CHƯA ĐĂNG NHẬP (GUEST VIEW)
  // -------------------------------------------------------------
  if (!user) {
    const isGoodGeneral = (target.isHoangDao ?? true) && longevityBadges.daiKyLevel !== "CRITICAL";
    return {
      isPersonalized: false,
      dayInfo: {
        solar: `${target.solarDay}/${target.solarMonth}/${target.solarYear}`,
        lunar: `${target.lunarDay}/${target.lunarMonth}`,
        canChiDay: dayCanChi.fullName,
        element: dayCanChi.element,
        isHoangDao: target.isHoangDao ?? true
      },
      longevity: longevityBadges,
      hoursList: hours.map(h => ({ ...h, isPersonalFavorable: false, badge: h.isHoangDao ? "Hoàng Đạo" : "Hắc Đạo" })),
      generalStatus: isGoodGeneral ? "NGÀY LÀNH THÔNG THƯỜNG" : "NGÀY NÊN THẬN TRỌNG",
      recommendations: {
        dos: [
          longevityBadges.isThapTrai ? "Nên ăn chay, phóng sinh" : "Làm việc định kỳ",
          "Giữ tâm thái hòa nhã",
          "Nghỉ ngơi đúng giờ"
        ],
        donts: [
          longevityBadges.isDaiKy ? "Tránh quan hệ phòng sự" : "Hạn chế thức khuya",
          "Tránh to tiếng bất hòa"
        ]
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

  // 1. Phân tích Địa Chi
  if (LUC_HOP[userCanChi.chiIndex] === dayCanChi.chiIndex) {
    score += 25;
    analysis.push(`Địa chi ngày (${dayCanChi.chiName}) Lục Hợp với tuổi (${userCanChi.chiName})`);
    dos.push("Ký kết hợp đồng", "Gặp gỡ quý nhân", "Khai trương");
  } else if (TAM_HOP_GROUPS.some(g => g.includes(userCanChi.chiIndex) && g.includes(dayCanChi.chiIndex))) {
    score += 20;
    analysis.push(`Địa chi ngày (${dayCanChi.chiName}) Tam Hợp với tuổi (${userCanChi.chiName})`);
    dos.push("Bắt đầu kế hoạch mới", "Xuất hành");
  } else if (LUC_XUNG[userCanChi.chiIndex] === dayCanChi.chiIndex) {
    score -= 30;
    analysis.push(`Địa chi ngày (${dayCanChi.chiName}) Lục Xung kỵ với tuổi (${userCanChi.chiName})`);
    donts.push("Hạn chế xuất hành xa", "Tránh tranh cãi đối đầu", "Không chi tiền lớn");
  } else if (TUONG_HAI[userCanChi.chiIndex] === dayCanChi.chiIndex) {
    score -= 20;
    analysis.push(`Địa chi ngày (${dayCanChi.chiName}) Tương Hại với tuổi (${userCanChi.chiName})`);
    donts.push("Cẩn trọng lời ăn tiếng nói", "Đề phòng thị phi");
  }

  // 2. Phân tích Ngũ Hành Nạp Âm
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

  // Bổ sung lời khuyên Thập Trai & Đại Kỵ vào list Dos / Donts của User
  if (longevityBadges.isThapTrai) dos.unshift("Ăn chay thanh tịnh (Thập Trai)");
  if (longevityBadges.isDaiKy) donts.unshift(longevityBadges.daiKyBadge ?? "Kiêng kỵ phòng sự");

  // Giờ Vàng Bản Mệnh
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
    longevity: longevityBadges,
    hoursList: personalizedHours,
    recommendations: {
      dos: dos.length > 0 ? dos : ["Tiến hành công việc bình thường", "Giữ hòa khí"],
      donts: donts.length > 0 ? donts : ["Tránh hấp tấp vội vã"]
    }
  };
}
```

---

## 5. ĐẶC TẢ HIỂN THỊ BADGE TRÊN GIAO DIỆN (UI BADGE MAPPING)

| Nhãn Dữ Liệu (`longevity`) | Vị Trí Hiển Thị | Màu Sắc Khuyến Nghị | Biểu Tượng Gợi Ý |
| :--- | :--- | :--- | :---: |
| `thapTraiBadge`: "Ngày Thập Trai" | Ô ngày Lịch tháng & Thẻ đầu Tab Hôm Nay | Xanh Lá Nhạt (Emerald / Green) | 🪷 (Hoa sen) |
| `daiKyBadge`: "Đại Kỵ Cửu Độc" | Banner Cảnh Báo Tab Hôm Nay & Tab Bảo Thọ | Đỏ Đậm / Cam Cháy (Crimson / Amber) | ⚠️ (Cảnh báo) |
| `daiKyBadge`: "Đại Kỵ Phòng Sự" | Ô ngày Lịch tháng & Thẻ Bảo Thọ | Cam Đỏ (Amber) | 🛑 (Giọt sương / Khiên) |
| `daiKyBadge`: "Nên Kiêng Dục" | Thẻ Bảo Thọ | Vàng Nhạt (Muted Gold) | 🌙 (Trăng khuyết) |

### Ghi chú tích hợp Client:
1. Khi render **Tab Lịch (Month View)**:
   * Nếu `longevity.isThapTrai === true` $\implies$ hiển thị chấm xanh `green-dot`.
   * Nếu `longevity.isDaiKy === true` và `daiKyLevel === 'CRITICAL' | 'HIGH'` $\implies$ hiển thị chấm cam `orange-dot`.
2. Khi chạm vào chi tiết ngày: Hiển thị 2 box riêng biệt:
   * **Box Ăn Chay & Phóng Sinh:** Render nội dung từ `thapTraiBadge` & `thapTraiAdvice`.
   * **Box Dưỡng Tinh & Kiêng Kỵ:** Render nội dung từ `daiKyBadge`, `daiKyReason` & `daiKyAdvice`.