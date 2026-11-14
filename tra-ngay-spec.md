# KẾ HOẠCH & ĐẶC TẢ TRIỂN KHAI TÍNH NĂNG TRA NGÀY TỐT
*(Tra Ngay Feature Specification - Guest vs. Logged-in Profiles)*

---

## 1. TỔNG QUAN KIẾN TRÚC & PHÂN QUYỀN

Tính năng **Tra ngày tốt** giải quyết 2 bài toán người dùng:
1. **Tìm ngày phù hợp (Smart Search):** Chọn công việc + Khoảng thời gian $\to$ Quét và xếp hạng danh sách ngày tốt nhất.
2. **Xem ngày cụ thể (Day Inspector):** Chọn công việc + Chọn 1 ngày xác định $\to$ Đánh giá mức độ phù hợp, chấm điểm và chỉ ra khung giờ vàng/rủi ro.

### Cơ chế phân quyền:
* **Khách chưa đăng nhập (Guest):** Tra cứu theo hệ quy chiếu Lịch Vạn Niên phổ quát (Hoàng đạo, 12 Trực, Nhị thập bát tú, Thần sát công việc, Thọ Khang Bảo Giám). Không áp dụng Bát Tự bản mệnh.
* **Người dùng đã đăng nhập (Logged-in):** Cho phép chọn chủ thể thực hiện qua thanh cuộn ngang `Profile Selector`:
  * **Bản thân** (Hồ sơ mặc định).
  * **Người thân** (Đã lưu sẵn trong danh sách: Vợ/Chồng, Cha/Mẹ, Con cái...).
  * Hệ thống áp dụng bộ lọc kép: **Tiêu chí công việc $\times$ Tương hợp Bát Tự (Địa Chi, Ngũ Hành, Thiên Can)** của người được chọn.

---

## 2. BẢNG DANH MỤC CÔNG VIỆC CHUẨN (EVENT MATRIX CONFIG)

Hệ thống cung cấp 8 nhóm công việc mặc định, mỗi nhóm gắn với tiêu chí Trực và Thần sát tương ứng:

```typescript
export interface JobConfig {
  code: string;
  name: string;
  icon: string;
  goodTruc: number[];       // Index 12 Trực tốt (0: Kiến, 1: Trừ, 2: Mãn, 3: Bình, 4: Định, 5: Chấp, 6: Phá, 7: Nguy, 8: Thành, 9: Thâu, 10: Khai, 11: Bế)
  badTruc: number[];        // Index Trực xấu cho việc này
  badFixedFlags: string[];  // Danh sách sao xấu/ngày kỵ cần tránh
}

export const JOB_CATEGORIES: Record<string, JobConfig> = {
  "KY_KET": {
    code: "KY_KET",
    name: "Ký hợp đồng, Giao dịch",
    icon: "signature",
    goodTruc: [8, 10, 2],    // Thành, Khai, Mãn
    badTruc: [6, 7, 11],     // Phá, Nguy, Bế
    badFixedFlags: ["TAM_NUONG", "NGUYET_KY", "DAI_HAO"]
  },
  "XUAT_HANH": {
    code: "XUAT_HANH",
    name: "Xuất hành, Đi xa, Du lịch",
    icon: "airplane",
    goodTruc: [0, 4, 10],    // Kiến, Định, Khai
    badTruc: [6, 11],        // Phá, Bế
    badFixedFlags: ["TAM_NUONG", "VANG_VONG", "THIEN_TAC"]
  },
  "KHAI_TRUONG": {
    code: "KHAI_TRUONG",
    name: "Khai trương, Mở hàng",
    icon: "store",
    goodTruc: [10, 8, 2],    // Khai, Thành, Mãn
    badTruc: [1, 6, 11],     // Trừ, Phá, Bế
    badFixedFlags: ["TAM_NUONG", "NGUYET_KY", "SAT_CHU", "THU_TU"]
  },
  "MUA_XE": {
    code: "MUA_XE",
    name: "Mua xe, Nhận xe mới",
    icon: "car",
    goodTruc: [4, 8, 2],     // Định, Thành, Mãn
    badTruc: [6, 7],         // Phá, Nguy
    badFixedFlags: ["NGUYET_PHA", "THU_TU", "KIEP_SAT"]
  },
  "DONG_THO": {
    code: "DONG_THO",
    name: "Động thổ, Xây dựng, Sửa nhà",
    icon: "home",
    goodTruc: [4, 8, 3],     // Định, Thành, Bình
    badTruc: [6, 11],        // Phá, Bế
    badFixedFlags: ["TAM_NUONG", "SAT_CHU", "DIA_PHA", "THO_CAM"]
  },
  "CUOI_HOI": {
    code: "CUOI_HOI",
    name: "Cưới hỏi, Đính hôn, Dạm ngõ",
    icon: "heart",
    goodTruc: [4, 8, 10],    // Định, Thành, Khai
    badTruc: [6, 7, 11],     // Phá, Nguy, Bế
    badFixedFlags: ["TAM_NUONG", "CO_THAN", "QUA_TU", "NGUYET_KY"]
  },
  "CAT_TOC": {
    code: "CAT_TOC",
    name: "Cắt tóc, Dưỡng nhan",
    icon: "scissors",
    goodTruc: [1, 2],        // Trừ, Mãn
    badTruc: [7],            // Nguy
    badFixedFlags: ["NGUYET_HINH", "TAM_DOC"]
  },
  "CAU_TAI": {
    code: "CAU_TAI",
    name: "Cầu tài lộc, Đầu tư",
    icon: "cash",
    goodTruc: [8, 10, 2],    // Thành, Khai, Mãn
    badTruc: [6, 11],        // Phá, Bế
    badFixedFlags: ["TAM_NUONG", "DAI_HAO", "TIEU_HAO"]
  }
};
```

---

## 3. THUẬT TOÁN ĐÁNH GIÁ & CHẤM ĐIỂM (EVALUATION ENGINE)

### 3.1. Điểm Công Việc Chung (Base Job Score - Thang 40đ)
Áp dụng cho mọi đối tượng:
* **Ngày Hoàng Đạo:** `+15đ` | **Hắc Đạo:** `0đ`
* **Trực của ngày:**
  * Thuộc `goodTruc`: `+15đ`
  * Thuộc `badTruc`: `-15đ`
  * Trực trung tính: `+5đ`
* **Cảnh báo ngày kỵ cố định:**
  * Có cờ trùng `badFixedFlags` (Tam Nương, Nguyệt Kỵ...): `-20đ`
  * Cảnh báo Thọ Khang Bảo Giám (`CRITICAL` - Tháng Cửu Độc): `-15đ`

### 3.2. Điểm Bản Mệnh Cá Nhân Hóa (Destiny Match Score - Thang 60đ)
*Chỉ kích hoạt khi có User Profile (Bản thân hoặc Người thân)*:

* **Quan hệ Địa Chi (Trọng số lớn nhất):**
  * **Lục Hợp** với Chi tuổi: `+25đ`
  * **Tam Hợp** với Chi tuổi: `+20đ`
  * **Lục Xung** với Chi tuổi: `-35đ` *(Gắn cờ: `IS_CONFLICT = true`)*
  * **Tương Hại** với Chi tuổi: `-15đ`
* **Quan hệ Ngũ Hành Nạp Âm:**
  * Mệnh ngày sinh Mệnh tuổi (**Sinh Nhập**): `+20đ`
  * Mệnh ngày trùng Mệnh tuổi (**Đồng Hành**): `+10đ`
  * Mệnh ngày khắc Mệnh tuổi (**Khắc Nhập**): `-20đ`
  * Mệnh tuổi khắc Mệnh ngày (**Khắc Xuất**): `-5đ`
* **Quan hệ Thiên Can:**
  * Can ngày hợp Can tuổi: `+10đ`
  * Can ngày phá Can tuổi: `-10đ`

### 3.3. Quy đổi Điểm Tổng & Phân Loại
* **Đối với Guest:**
  $$\text{FinalScore} = \text{JobScore} \times \frac{100}{40}$$
* **Đối với Logged-in:**
  $$\text{FinalScore} = \text{JobScore} + \text{DestinyMatchScore}$$

**Bảng Phân Loại Kết Quả:**
* $\ge 80$ điểm: **ĐẠI CÁT HỢP TUỔI** (Rất nên làm)
* $60 - 79$ điểm: **NGÀY LÀNH / THUẬN LỢI** (Tiến hành tốt)
* $45 - 59$ điểm: **BÌNH HÒA** (Công việc nhỏ có thể làm)
* $< 45$ điểm hoặc `IS_CONFLICT == true`: **KỴ DÙNG / XUNG TUỔI** (Nên hoãn hoặc đổi ngày)

---

## 4. CHI TIẾT TRIỂN KHAI 2 CHẾ ĐỘ TRA CỨU

```
                 MÀN HÌNH TRA NGÀY TỐT
   ┌───────────────────────────────────────────────────┐
   │ [Segmented Control]: [Tìm Ngày Phù Hợp] | [Xem Ngày Cụ Thể] │
   └───────────────────────────────────────────────────┘
   ┌───────────────────────────────────────────────────┐
   │ [Profile Selector]: (Nếu Logged-in)              │
   │  (Tôi)  |  (Vợ - Bính Tý)  |  (Con - Giáp Thìn)   │
   └───────────────────────────────────────────────────┘
   ┌───────────────────────────────────────────────────┐
   │ [Job Selector]: [Ký Hợp Đồng] [Xuất Hành] [Mua Xe]│
   └───────────────────────────────────────────────────┘
```

---

### CHẾ ĐỘ 1: TÌM NGÀY PHÙ HỢP (SMART SEARCH)

#### 1. Luồng Người Dùng (User Flow)
1. Chọn Profile (nếu đã đăng nhập).
2. Chọn Công việc (`job_code`).
3. Chọn Khung thời gian: Button nhanh: `7 ngày tới`, `14 ngày tới`, `30 ngày tới`, hoặc `Custom Range` (tối đa 60 ngày).
4. Bấm **"Tìm Ngày Tốt"**.

#### 2. Kỹ Thuật Xử Lý (Engine Processing)
* Vòng lặp duyệt qua từng ngày trong khoảng thời gian đã chọn:
  * Tính Can Chi, Hoàng Đạo, Trực, Thần sát, Thọ Khang.
  * Nếu là Logged-in: So khớp với Profile đã chọn.
  * Tính `FinalScore`.
* **Tiêu chí lọc kết quả:**
  * Loại bỏ toàn bộ các ngày có `FinalScore < 50` hoặc `IS_CONFLICT == true` (trừ khi cả khoảng tìm kiếm không có ngày nào $\ge 50$ thì hiển thị thông báo khuyên mở rộng khung ngày).
* **Sắp xếp (Sorting):** Sắp xếp theo `FinalScore` giảm dần. Nếu điểm bằng nhau, ưu tiên ngày gần nhất.

#### 3. Output Hiển Thị

##### Giao diện Guest:
* Danh sách thẻ ngày tốt chung:
  * Ngày Dương / Ngày Âm / Can Chi ngày.
  * Trực tốt đại diện cho công việc.
  * 3 Giờ Hoàng đạo chung đẹp nhất.
* Banner cuối danh sách: *"Đăng nhập để tự động loại bỏ ngày xung tuổi và chọn giờ vàng bản mệnh."*

##### Giao diện Logged-in (Bản thân / Người thân):
* Thẻ kết quả nổi bật với Profile: *"Tìm ngày cho: [Tên người thân] ([Can Chi], Mệnh [Ngũ Hành])"*
* Danh sách ngày xếp hạng:
  * Huy hiệu: `ĐẠI CÁT BẢN MỆNH (95đ)` (Viền Vàng) / `RẤT TỐT (80đ)` (Viền Xanh).
  * Dòng phân tích nhanh: *"Ngày Mão Lục Hợp với tuổi Tuất - Mệnh Thổ tương sinh Hỏa"*.
  * **Khung giờ vàng bản mệnh:** Giờ Hoàng đạo vừa là Tam/Lục Hợp với tuổi của người đó.

---

### CHẾ ĐỘ 2: XEM NGÀY CỤ THỂ (DAY INSPECTOR)

#### 1. Luồng Người Dùng (User Flow)
1. Chọn Profile (nếu đã đăng nhập).
2. Chọn Công việc (`job_code`).
3. Chọn 1 ngày cụ thể qua Date Picker.
4. Bấm **"Đánh Giá Ngày"**.

#### 2. Kỹ Thuật Xử Lý (Engine Processing)
* Tính toán chi tiết toàn bộ các chỉ số của ngày đó đối với công việc đã chọn.
* Tạo danh sách 4 trục phân tích:
  1. *Độ hợp công việc:* Đánh giá Trực, Sao, Hoàng/Hắc đạo.
  2. *Độ hợp tuổi (nếu Logged-in):* Đánh giá Địa Chi (Lục Hợp/Xung/Hại), Can hợp/phá.
  3. *Độ trợ lực Ngũ Hành (nếu Logged-in):* Sinh/Khắc với bản mệnh.
  4. *Cảnh báo Thọ Khang:* Nhắc ngày Thập Trai (ăn chay) hoặc ngày Đại Kỵ phòng sự.

#### 3. Output Hiển Thị

##### Giao diện Guest:
* Gauge điểm chung: Ví dụ `75/100 - NGÀY THUẬN LỢI`.
* Khối việc Nên làm / Nên tránh liên quan đến công việc đã chọn.
* Danh sách 12 giờ trong ngày (đánh dấu Hoàng Đạo / Hắc Đạo).

##### Giao diện Logged-in (Bản thân / Người thân):
* Gauge điểm tương thích cá nhân: Ví dụ `92/100 - ĐẠI CÁT HỢP TUỔI`.
* Nếu ngày bị Xung: Hiển thị Banner Đỏ Cảnh Báo: 
  > ⚠️ **Cảnh Báo Xung Tuổi:** *Ngày Thìn Lục Xung với tuổi Tuất của [Tên Profile]. Dù là ngày Hoàng Đạo nhưng gia chủ dễ gặp bất hòa, trục trặc khi ký kết.*
* **Phương án Hóa Giải (Nếu bắt buộc phải làm ngày này):** 
  * Gợi ý khung giờ tốt nhất để thực hiện nhằm áp chế điềm xấu: *"Nên tiến hành vào Giờ Mão (05:00 - 07:00) - Giờ Lục Hợp với tuổi để giảm trừ năng lượng xung hại."*
* Bổ sung ghi chú Thọ Khang: Nếu trùng ngày Thập Trai $\implies$ Khuyên gia chủ nên ăn chay trước khi tiến hành việc lớn để tăng trưởng phước đức.

---

## 5. MÔ TẢ DATA CONTRACT (API / STATE INTERFACE)

```typescript
// Input cho Chế độ Tìm ngày phù hợp
export interface SmartSearchInput {
  jobCode: string;
  startDate: string;  // "YYYY-MM-DD"
  endDate: string;    // "YYYY-MM-DD"
  profileId?: string; // Nếu không truyền => Xử lý theo Guest
}

// Input cho Chế độ Xem ngày cụ thể
export interface DayInspectorInput {
  jobCode: string;
  targetDate: string; // "YYYY-MM-DD"
  profileId?: string; // Nếu không truyền => Xử lý theo Guest
}

// Output Item cho từng ngày được đánh giá
export interface DayEvaluationResult {
  date: string;
  lunarDate: string;
  canChiDay: string;
  elementDay: string;
  isHoangDao: boolean;
  score: number;
  classification: "DAI_CAT" | "THUAN_LOI" | "BINH_HOA" | "KY_DUNG";
  isConflictAge: boolean; // True nếu Lục Xung với Profile
  jobHighlights: {
    trucName: string;
    isTrucGood: boolean;
    fixedBadDays: string[];
  };
  personalizedHighlights?: {
    profileName: string;
    chiRelation: string;
    elementRelation: string;
    favorableHours: string[]; // Khung giờ Hoàng đạo hợp tuổi
  };
  longevityNotes: {
    isThapTrai: boolean;
    daiKyLevel: string;
  };
}
```

---

## 6. KẾ HOẠCH TRIỂN KHAI THEO GIAI ĐOẠN (SPRINT PLAN)

### Sprint 1: Setup Bộ Config & Module Tính Toán Độc Lập
* Tạo file `job_config.ts` chứa bảng ánh xạ 8 công việc, 12 Trực và Thần sát.
* Dựng hàm Pure Function `evaluateDayForJob(targetDate, jobCode, userProfile | null)`.
* Viết Unit Tests bao phủ:
  * Test case Guest tra ngày.
  * Test case Logged-in bị dính Lục Xung (kết quả phải hạ điểm và bật cờ `isConflictAge`).
  * Test case Logged-in được Lục Hợp + Sinh Nhập (kết quả điểm $\ge 90$).

### Sprint 2: Dựng Giao Diện Chế Độ "Xem Ngày Cụ Thể"
* Tích hợp Date Picker và Job Selector.
* Thanh trượt Profile Selector (kết nối với bảng hồ sơ đã lưu của user).
* Component hiển thị điểm Gauge Score + Khối phân tích 4 trục (Công việc, Tuổi, Ngũ hành, Thọ Khang).

### Sprint 3: Dựng Giao Diện Chế Độ "Tìm Ngày Phù Hợp"
* Xây dựng giao diện chọn khoảng ngày (Quick range buttons: 7, 14, 30 ngày).
* Thuật toán vòng lặp quét ngày (On-device loop < 20ms cho 60 ngày).
* Hiển thị Card kết quả dạng danh sách cuộn mượt (FlatList / ListView).
* Bộ lọc phụ (nếu cần): Lọc chỉ lấy ngày $\ge 80$ điểm.