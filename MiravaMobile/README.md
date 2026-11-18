# Lịch Việt — Expo cho iOS

Ứng dụng lịch âm-dương Việt Nam dùng Expo. Lịch được tính trên thiết bị; đồng bộ tài khoản cần backend .NET 8 và SQL Server.

## Chạy trên iPhone

1. Cài Expo Go trên iPhone và kết nối máy tính, điện thoại vào cùng một mạng Wi-Fi.
2. Từ thư mục `MiravaMobile`, tạo `.env.mobile` từ `.env.mobile.example`; thay IP mẫu bằng IP LAN hiện tại của máy chạy backend nếu cần. Sau đó chạy:

   ```powershell
   npm start
   ```

3. Mở camera iPhone và quét QR trên terminal, sau đó chọn mở trong Expo Go.

`npm start`, `npm run android` và `npm run ios` nạp `.env.mobile`. Trên điện thoại thật, `localhost` trỏ về chính điện thoại, vì vậy URL API phải là IP LAN của máy chạy API hoặc HTTPS domain. Expo nhúng `EXPO_PUBLIC_API_BASE_URL` vào bundle khi khởi động/build; `appsettings.Production.json` chỉ cấu hình backend, không cấu hình URL cho ứng dụng Expo. Giá trị `EXPO_PUBLIC_*` là công khai, không đặt mật khẩu hoặc secret vào đó.

## Chạy giao diện web

Tạo `.env.web` từ `.env.web.example`, rồi chạy trong thư mục `MiravaMobile`:

```powershell
npm run web
```

Web dùng `http://localhost:5062` cho API; Expo Web chạy tại `http://localhost:8081`. Nếu backend chưa chạy, giao diện vẫn mở nhưng các chức năng cần API sẽ không kết nối được.

Nếu kết nối LAN bị chặn, thử `npx expo start --go --tunnel`.
Nếu Expo Go báo tài khoản CLI chưa đăng nhập, chạy `npx expo login` trên máy tính và đăng nhập cùng tài khoản Expo đang dùng trên iPhone, rồi khởi động lại server.

## Các tab và cá nhân hóa

- **Hôm Nay:** lịch âm-dương, can chi, trạng thái ngày chay, giờ tốt và ghi chú riêng cho ngày Thập Trai/kiêng kỵ theo lịch dân gian.
- **Lịch:** lịch tháng song hành âm-dương; chỉ đánh dấu ngày Thập Trai và các ngày kiêng kỵ theo lịch tháng/Thọ Khang Bảo Giám, gồm các mốc tiết khí được hỗ trợ (xác định theo ngày, không theo giờ chuyển tiết chính xác). Hôm nay được nhận biết bằng viền ngày. Chọn ngày để xem ghi chú tương ứng; ngày thường không hiện thẻ.
- **Tra ngày:** chọn một trong 8 nhóm việc, sau đó tìm ngày trong 7/14/30 ngày hoặc khoảng tùy chọn tối đa 60 ngày, hay đánh giá một ngày cụ thể. Điểm xét Hoàng/Hắc đạo, Trực theo việc, các ngày kỵ có dữ liệu, Thọ Khang và (khi có hồ sơ) tương hợp địa chi, ngũ hành, thiên can. Kết quả chỉ mang tính tham khảo; các Thần sát chưa có lịch đối chiếu không được tự suy đoán và được nêu rõ trong chi tiết.
- **Bảo Thọ:** một tab gồm hai nhánh Ăn Chay và Dưỡng Sinh; thẻ ngày Thập Trai chỉ hiện ở nhánh Ăn Chay, thẻ kiêng kỵ chỉ hiện ở nhánh Dưỡng Sinh và chỉ vào ngày có ghi chú. Không hiển thị thẻ chu kỳ thanh trai hoặc các thẻ hướng dẫn dưỡng sinh chung. Lịch ăn chay luôn dùng chu kỳ Thập trai cho mọi người, không có tùy chọn cá nhân.
- Font giao diện: Nunito Sans.
- **Cá nhân:** đăng nhập Google, hồ sơ/người thân, ngày sinh dương hoặc âm lịch, giới tính, tự tính can chi năm, nạp âm ngũ hành, cung phi và màu sắc tham khảo. Theme có thể chọn cả khi chưa đăng nhập.
- Hồ sơ và chu kỳ Thanh Trai được lưu cục bộ; khi đăng nhập Google, thiết lập được đồng bộ với tài khoản. Theme được lưu cục bộ và đồng bộ khi đăng nhập.
- Tùy chọn đồng bộ Google Calendar, widget và thông báo hiện tạm ẩn trong tab Cá nhân.
- Thông tin ngày trên Hôm Nay và Tra ngày chỉ dùng hồ sơ để cá nhân hóa khi đã đăng nhập; khách xem thông tin chung không dựa trên hồ sơ.

## Google sign-in và đồng bộ thiết lập

- Tạo `MiravaMobile/.env.local` từ `.env.example` để cấu hình Google Client ID. URL API được tách riêng: `.env.web` cho web và `.env.mobile` cho iOS/Android; các lệnh npm tương ứng tự nạp đúng file.
- Google Web Client ID hiện đã được điền trong file môi trường local. Thêm Google OAuth Client ID riêng cho iOS và Android vào các biến tương ứng trước khi dùng các nền tảng đó. Backend cần cho phép tất cả Client ID này trong `GoogleAuth:Audiences`.
- Trong Google Cloud Console, cấu hình đúng OAuth client type, authorized JavaScript origin và redirect URI cho URL web đang dùng; redirect URI phải khớp URL AuthSession tạo ra. Với iOS/Android, tạo OAuth client theo bundle/package identifier và cấu hình scheme tương ứng trong development build.
- Khi API khởi động, database được tạo theo `ConnectionStrings:CalendarDb` nếu chưa có và các migration `001`–`009` sẽ tự chạy theo thứ tự. Tài khoản SQL Server cần quyền tạo database khi cần và cập nhật schema; không cần chạy migration thủ công.
- Chạy API tại cổng 5062 (hoặc cập nhật URL trong file môi trường tương ứng); cần cấu hình CORS cho origin Expo Web khi chạy trên trình duyệt.
- Google xác thực ID token ở backend rồi đổi sang token phiên riêng của ứng dụng; mật khẩu và Google ID token không được lưu trên thiết bị. Ứng dụng chỉ lưu token phiên: SecureStore trên iOS/Android, localStorage trên web; phiên có hạn 30 ngày, tạo token mới khi đăng nhập, bị thu hồi khi đăng xuất/đặt lại mật khẩu và các phiên khác bị thu hồi khi đổi mật khẩu. Dữ liệu hồ sơ/theme được lưu vào `dbo.AppUser.SettingsJson`.
- Đăng ký bằng email/mật khẩu và dữ liệu tư vấn Thập Trai/Thọ Khang cũng được tạo/cập nhật tự động từ migration và JSON nhúng khi API khởi động. Cấu hình backend nằm trong `backend/VietCalendar.Api/appsettings.Production.json`; backend không đọc file `.env`. Không đặt SMTP secret trong `.env.local` của Expo. File cấu hình Production không được commit và cần được bảo vệ quyền truy cập. Chạy API local trên Windows từ thư mục gốc:

  ```powershell
  .\backend\VietCalendar.Api\run-local.ps1
  ```

  Script kiểm tra các thiết lập bắt buộc trong `appsettings.Production.json` rồi chạy API ở môi trường Production tại cổng 5062, lắng nghe trên mạng LAN để Expo Go trên điện thoại truy cập được. Dùng SMTP port 587 với STARTTLS; `Email:Username` và `Email:Password` phải đi cùng nhau. `Auth:OtpPepper` phải là secret ổn định, tối thiểu 32 byte; giữ nguyên qua các lần khởi động để OTP đã phát hành còn xác minh được. Trên Windows Server, triển khai file `appsettings.Production.json` đã được cấu hình và bảo vệ ACL cho tài khoản dịch vụ cùng quản trị viên. Nếu thiếu hoặc sai cấu hình, API trả lỗi dịch vụ thay vì báo gửi OTP thành công.
- Đăng ký công khai: người dùng tạo tài khoản bằng email, username và mật khẩu từ 6 ký tự; app đăng nhập ngay, cho phép sử dụng trước khi xác minh email. Có thể yêu cầu mã OTP và xác minh sau trong tab Cá nhân. SMTP chỉ cần hoạt động khi gửi mã xác minh hoặc đặt lại mật khẩu; OTP có hạn 10 phút, giới hạn số lần nhập và thời gian gửi lại. Email/domain allowlist cũ không còn hạn chế đăng ký; tài khoản Google mới cũng có thể đăng ký công khai nhưng email vẫn phải được Google xác minh.
- Tài khoản hỗ trợ đăng nhập bằng username hoặc email, đổi mật khẩu khi đã đăng nhập và đặt lại mật khẩu bằng email OTP. Mật khẩu được băm bằng ASP.NET PasswordHasher; không yêu cầu ký tự đặc biệt hoặc quy tắc phức tạp.
- SMS/Zalo OTP chưa bật: cần nhà cung cấp/gateway và thông tin cấu hình riêng; không có dịch vụ gửi SMS/Zalo OTP miễn phí phổ quát. Hiện tại OTP được gửi qua SMTP.
- Expo Go không hỗ trợ vòng redirect OAuth tùy chỉnh. Đăng nhập Google trên iOS/Android cần development build và cấu hình scheme/Client ID; chạy `npx expo start --dev-client` sau khi tạo build. Expo Web dùng Web Client ID.
- Không đưa Google Client Secret vào ứng dụng. API cần HTTPS khi triển khai ra môi trường thật.

## Google Calendar hai chiều (tạm ẩn trong giao diện)

- Tính năng đồng bộ Calendar vẫn còn trong mã nhưng hiện không được cung cấp từ giao diện. Khi mở lại, người dùng đã đăng nhập có thể kết nối Google Calendar, thêm sự kiện cá nhân và đồng bộ trong 90 ngày tới.
- Google OAuth yêu cầu scope `https://www.googleapis.com/auth/calendar.events`. Đăng ký redirect URI do AuthSession tạo ra cho từng nền tảng trong Google Cloud Console và khai báo chính xác các URI đó trong `GoogleAuth:AllowedRedirectUris`.
- Chạy `../database/sqlserver-2008/003-google-calendar.sql` sau migration tài khoản. Trên Windows Server, cấu hình `GoogleAuth:WebClientId`, `GoogleAuth:ClientSecret`, `GoogleAuth:AllowedRedirectUris` và `GoogleAuth:DataProtectionKeysPath` trong `appsettings.Production.json`; thư mục key ring phải tồn tại, có ACL chỉ cho tài khoản chạy API, và được giữ nguyên qua các lần deploy/khởi động.
- Refresh token chỉ được lưu ở SQL dưới dạng mã hóa bằng ASP.NET Data Protection; token truy cập ngắn hạn chỉ tồn tại trong backend khi gọi Calendar API. Không ghi secret hoặc token vào log/app. Nếu mất key ring, cần người dùng kết nối lại Calendar.
- Client ID web/iOS/Android phải thuộc `GoogleAuth:Audiences`; ID nền tảng cụ thể được lưu cạnh refresh token để gia hạn bằng đúng OAuth client. Với web, secret chỉ được cấu hình phía API, không bao giờ trong `.env.local`.

## Giới hạn bản thử

- Gợi ý ngày hiện dùng quy tắc hợp/xung địa chi đơn giản, không phải lịch vạn niên chuyên sâu. Mệnh, cung và màu sắc dựa trên cách tính ngũ hành dân gian; tất cả chỉ mang tính tham khảo, không phải dự báo chắc chắn.
- Ngày Thập Trai, ngày kiêng kỵ theo lịch tháng và các mốc tiết khí là tư liệu văn hóa/tín ngưỡng, không phải dự báo hay khuyến nghị y khoa; các mốc lịch không đo, dự đoán hoặc chẩn đoán sức khỏe. Ngày 30 trong danh sách chỉ áp dụng nếu tháng âm lịch có ngày 30, không chuyển sang ngày 29 của tháng thiếu.
- Tùy chọn thông báo và widget hiện tạm ẩn trong tab Cá nhân. Thông báo hệ thống và widget iOS cần development build riêng; Expo Go không hỗ trợ các tính năng native này. Mã SwiftUI/WidgetKit độc lập nằm trong `../ios`.
