export const thoKhangSourceUrl = 'https://www.niemphat.net/Luan/thokhang/thokhangbaogiam3.htm';

export interface GuidanceCardItem {
  id: string;
  title: string;
  summary: string;
  details: string[];
  quote?: string;
  author?: string;
}

export const tamKyData: {
  thienKy: GuidanceCardItem;
  diaKy: GuidanceCardItem;
  nhanKy: GuidanceCardItem;
} = {
  thienKy: {
    id: 'thien-ky',
    title: 'Thiên Kỵ · Thời tiết & Tiết khí',
    summary: 'Tránh thời điểm âm dương trời đất biến loạn hoặc khí hậu cực đoan làm tổn thương nguyên khí.',
    quote: 'Khí huyết trong thân người vốn tương ứng với tiết khí của trời đất. Hành phòng không đúng thời sẽ hao tổn nguyên thần.',
    author: 'Cổ nhân huấn thị',
    details: [
      'Tứ Ly & Tứ Tuyệt: Các mốc Xuân Phân, Thu Phân, Hạ Chí, Đông Chí (đặc biệt 3 ngày trước và 3 ngày sau). Đây là lúc âm dương phân tranh dữ dội, cổ nhân khuyên nên bế tinh tàng khí.',
      'Khí tượng dị thường: Khi có sấm sét, dông tố, mưa bão lớn, nhật thực, nguyệt thực. Khí trường trời đất xáo trộn mạnh, dễ làm kinh sợ tâm thần, hao tổn thận khí.',
      'Thời tiết khắc nghiệt: Những ngày nắng gắt như thiêu đốt hoặc giá rét buốt thấu xương. Tạng phủ khó giữ cân bằng nhiệt độ, sinh hoạt dễ gây ngoại cảm.',
      'Thời khắc kỵ: Tránh sinh hoạt ban ngày lộ thiên, dưới ánh trăng sao, trước nơi thờ tự, hoặc lúc nửa đêm về sáng (canh năm dương khí mới manh nha).',
    ],
  },
  diaKy: {
    id: 'dia-ky',
    title: 'Địa Kỵ · Không gian & Nơi chốn',
    summary: 'Không gian phòng the cần kín gió, sạch sẽ, trang nghiêm và ấm áp để bảo vệ vệ khí của cơ thể.',
    quote: 'Nơi chốn ẩm uất, uế tạp hoặc gió lùa đều là mầm mống dẫn tà khí xâm nhập tạng phủ.',
    author: 'Dưỡng sinh cổ huấn',
    details: [
      'Nơi tôn nghiêm: Điện thờ, chùa miếu, phòng thờ gia tiên. Giữ sự thành kính và trang nghiêm cho tâm hồn.',
      'Nơi u uế, ẩm thấp: Cạnh giếng nước lạnh, cạnh bếp lửa đang đun, nhà tiêu, nơi hoang phế. Khí ẩm thấp và uế khí dễ tích tụ làm tổn hại thận thủy.',
      'Phòng ngủ có gió lùa: Cửa sổ hay vách ngăn có gió lọt qua khe. Sau khi sinh hoạt, lỗ chân lông giãn nở rộng, gió lùa nhẹ cũng có thể gây chứng trúng phong hoặc quyết âm tứ chi buốt lạnh.',
      'Nơi quạt máy hay điều hòa thổi thẳng: Không để quạt thốc thẳng vào người hoặc phòng quá lạnh ngay sau khi vừa sinh hoạt.',
    ],
  },
  nhanKy: {
    id: 'nhan-ky',
    title: 'Nhân Kỵ · Thể trạng & Cảm xúc',
    summary: 'Thân tâm phải an định, tinh thần thanh thản, thể lực sung mãn; tuyệt đối không sinh hoạt khi thân tâm đang kiệt quệ.',
    quote: 'Đại nộ hại Can, say rượu hại Tạng, lao lực hại Thần. Lúc ấy mà hành phòng thì trăm thứ tật bệnh đều khởi sinh.',
    author: 'Dược Vương Tôn Tư Mạo',
    details: [
      'Cảm xúc cực đoan: Lúc đang nổi cơn thịnh nộ (hại Can), ưu sầu phiền muộn quá độ, hoặc đang hoảng sợ, lo lắng kiệt cùng.',
      'Khi ăn no, say rượu, hoặc đói lả: Say rượu hành phòng làm ngũ tạng đảo lộn; ăn quá no làm hại dạ dày và lá lách; bụng đói cồn cào làm tổn hại nguyên thần.',
      'Vừa đi đường xa hoặc lao lực nặng: Vừa vượt đường xa trên trăm dặm, làm việc quá sức mệt mỏi, cơ bắp và khí huyết chưa kịp hồi phục.',
      'Người đang có bệnh hoặc mới ốm dậy: Người mắc bệnh hư lao (cần kiêng kỵ bảo tồn 1 năm); người bị chấn thương gãy xương gân cốt (cần tĩnh dưỡng 100-180 ngày).',
      'Thói quen xấu sau phòng sự: Tuyệt đối không uống nước đá lạnh, không tắm nước lạnh ngay, không nằm chiếu tre buốt lạnh vì dễ nhiễm hàn tà thấu xương.',
    ],
  },
};

export const tonTuMaoData = {
  title: 'Thuyết Thất Nhật Lai Phục & Nhịp 4 Mùa',
  author: 'Dược Vương Tôn Tư Mạo (581 – 682)',
  description:
    'Danh y Tôn Tư Mạo chỉ ra rằng khí huyết con người vận hành tuần hoàn qua Lục Kinh (Thái Dương, Dương Minh, Thiếu Dương, Thái Âm, Thiếu Âm, Quyết Âm). Mỗi ngày qua một kinh, đủ 6 ngày trọn vòng và cần tối thiểu 7 ngày để khí huyết phục hồi trọn vẹn tại kinh lạc đó ("Thất nhật lai phục").',
  ageTable: [
    { age: '20 tuổi', interval: '7 – 14 ngày / lần', note: 'Khí huyết đang thịnh nhưng chớ buông lung, giữ gìn gốc rễ nguyên tinh.' },
    { age: '30 tuổi', interval: '14 – 28 ngày / lần', note: 'Giai đoạn lập thân lập nghiệp, cần giữ thận khí vững bền để nuôi dưỡng trí lực.' },
    { age: '40 tuổi', interval: '28 – 45 ngày / lần', note: 'Âm khí bắt đầu suy giảm theo tự nhiên, chú trọng bồi đắp và tàng trữ sinh lực.' },
    { age: '50 tuổi', interval: '45 – 60 ngày / lần', note: 'Khí huyết giảm sút, mùa Hạ tiết chế tối đa, mùa Đông tuyệt đối bế tinh.' },
    { age: '60 tuổi+', interval: 'Thanh tâm đoạn dục', note: 'Thiên quý đã cạn, cổ nhân khuyên dứt hẳn phòng sự để bồi dưỡng tủy não và trường thọ.' },
  ],
  seasonalWisdom: [
    { season: 'Mùa Xuân (Dưỡng Can)', advice: 'Dương khí mới sinh còn non yếu, giữ tâm hồn thư thái, sinh hoạt ôn hòa, không tiêu hao quá độ.' },
    { season: 'Mùa Hạ (Tiết Chế Hỏa)', advice: 'Nhiệt khí bên ngoài cực thịnh làm lỗ chân lông mở to, chân dương dễ tiết tán; cần giảm thiểu tần suất tối đa.' },
    { season: 'Mùa Thu (Thu Liễm Khí)', advice: 'Khí trời se lạnh, vạn vật gom góp thu liễm; nên giữ gìn tinh tủy, tránh gió sương lạnh buốt.' },
    { season: 'Mùa Đông (Bế Tinh Tàng Khí)', advice: 'Trời đất phong bế kín mít. Mùa đông bế tinh tích khí là cội nguồn giúp mùa xuân tới cơ thể tràn đầy sinh lực.' },
  ],
};

export const thaiGiaoData = {
  title: 'Bảo Thân Quảng Tự & Đạo Dưỡng Thai',
  author: 'Chử Thượng Thư & Trương Cảnh Nhạc',
  sections: [
    {
      heading: 'Tích Tinh Thụ Thai (Sinh Con Khỏe Mạnh)',
      body: 'Cổ nhân dạy: "Ít ham muốn thì sinh nhiều con trai". Người cha tích trữ tinh khí sung mãn trong vài tháng trước khi thụ thai thì bẩm thụ khí tiên thiên mạnh mẽ, con sinh ra thông minh, ngũ tạng kiện toàn, tính tình đoan chính, suốt đời ít ốm đau.',
    },
    {
      heading: 'Tuyệt Dục Trong Thai Kỳ (Bảo Vệ Thai Nhi)',
      body: 'Sau khi người vợ biết mình mang thai, vợ chồng nên ngủ riêng giường, giữ trọn sự thanh tịnh. Việc này giúp ngăn ngừa nguy cơ sảy thai sớm (đặc biệt trong 1–3 tháng đầu do can mạch tổn thương), đồng thời tránh truyền "thai độc" khiến trẻ sơ sinh dễ mắc các chứng kinh phong, sốt phát ban hay cam tích.',
    },
    {
      heading: 'Kiêng Cữ Giai Đoạn Hậu Sản (Bảo Vệ Người Mẹ)',
      body: 'Mười ngày đầu sau sinh tuyệt đối cấm kỵ phòng sự để tránh băng huyết và nhiễm khuẩn nguy hiểm. Trong 100 ngày đầu ở cữ, cổ nhân khuyên giữ gìn trọn vẹn để tử cung, buồng trứng và khí huyết người mẹ phục hồi hoàn toàn.',
    },
  ],
};

export const khauNghiepData = {
  title: 'Khẩu Nghiệt Giới & Giữ Gìn Tâm Ý',
  summary: 'Không lấy chuyện buồng the làm trò cười cợt, bảo vệ phẩm giá của người khác chính là bồi đắp đại âm đức.',
  details: [
    'Lời răn của cổ nhân: Người đời hay vui miệng đem chuyện thầm kín buồng the của người khác ra bàn tán, châm chọc hay thêu dệt. Đó là điều tổn hao phúc đức và gieo mầm khẩu nghiệp sâu nặng.',
    'Giữ tâm thuần chính: Người biết tự trọng và tôn trọng người khác sẽ nghiêm mặt ngăn lời bàn tiếu dâm dật, giữ cho gia phong và xã hội được trong sạch, lành mạnh.',
    'Thanh tâm giải tỏa: Khi tâm khởi dục niệm bồn chồn, hãy tĩnh tâm hít thở sâu, hướng sự chú ý vào lao động, học tập hay đọc sách dưỡng sinh để chuyển hóa năng lượng.',
  ],
};

export const thoKhangGuidance = [
  {
    title: 'Lịch Âm và Tiết Khí Dưỡng Sinh',
    body: 'Theo Đông y, khí huyết con người đồng điệu với nhịp biến chuyển của tự nhiên. Các mốc Sóc, Vọng, Hối, Tứ Ly, Tứ Tuyệt là thời điểm âm dương giao hoán mạnh mẽ, cần tiết chế để dưỡng thân.',
  },
  {
    title: 'Tam Kỵ (Thiên - Địa - Nhân)',
    body: 'Lời dạy của cổ nhân bao quát cả điều kiện thời tiết (Thiên kỵ), môi trường sống (Địa kỵ) và thể trạng thân tâm (Nhân kỵ) nhằm phòng tránh tà khí xâm nhập cơ thể khi phòng sự.',
  },
  {
    title: 'Chủ Động Tiết Chế & Tự Nhiên',
    body: 'Mục đích tối thượng của tiết dục dưỡng sinh là bảo tồn nguyên tinh, nuôi dưỡng tạng Thận và tủy não để sống trường thọ, trí tuệ sáng suốt, gia đạo thuận hòa.',
  },
] as const;
