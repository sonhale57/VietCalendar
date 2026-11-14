# Lịch Việt

Ứng dụng lịch âm-dương nguyên bản, tham khảo các tính năng được mô tả công khai trên trang cửa hàng của **Lịch Vạn Niên 2026 & Lịch Việt**. Đây không phải bản sao mã nguồn, giao diện, nội dung hay thương hiệu của ứng dụng đó.

## Nghiên cứu REA qua thông tin công khai

Trang App Store và Google Play mô tả các nhóm tính năng tương đồng: lịch ngày/tháng âm-dương, can chi và giờ tốt, ghi chú/sự kiện, nội dung văn hóa Việt, đổi ngày, thời tiết và cá nhân hóa hình nền. Các ghi chú cập nhật iOS gần đây còn nhắc tới sự kiện cá nhân và Apple Watch. Nội dung cửa hàng không đủ để xác nhận chính xác luồng màn hình, thuật toán, cơ chế báo thức hoặc khả năng widget của ứng dụng tham chiếu; vì vậy những phần đó được thiết kế độc lập trong MVP này.

- [App Store: Lịch Vạn Niên 2026 & Lịch Việt](https://apps.apple.com/vn/app/l%E1%BB%8Bch-v%E1%BA%A1n-ni%C3%AAn-2026-l%E1%BB%8Bch-vi%E1%BB%87t/id1071624317)
- [Google Play: Lịch Vạn Niên 2026 - Lịch Việt](https://play.google.com/store/apps/details?id=app.licham.android.lichvannien)

## Thành phần

- `backend/VietCalendar.Api`: ASP.NET Core Web API trên .NET 8; tính lịch âm Việt Nam theo UTC+7, cung cấp API ngày/tháng và nội dung ngày lễ từ SQL Server.
- `database/sqlserver-2008`: DDL dùng cú pháp tương thích SQL Server 2008.
- `android`: ứng dụng Kotlin/Jetpack Compose; lịch tháng, chi tiết ngày, ghi chú cục bộ, tùy chỉnh nền, báo thức và notification hằng ngày.
- `ios`: ứng dụng SwiftUI; lịch tháng/ngày, ghi chú cục bộ, cá nhân hóa, nhắc hằng ngày và widget WidgetKit cho màn hình chính/màn hình khóa.
- `MiravaMobile`: Expo/React Native thử nghiệm trên iPhone qua Expo Go; lịch âm được tính offline. Widget native không khả dụng trong Expo Go.

Ghi chú, màu nền và báo thức hiện được lưu trên thiết bị; MVP chưa đồng bộ dữ liệu cá nhân lên máy chủ. API không có xác thực và chỉ cung cấp dữ liệu lịch/nội dung công khai. Không đưa dữ liệu cá nhân vào các endpoint công khai này.

## Chạy backend

Yêu cầu .NET SDK 8.0. Từ thư mục gốc:

```powershell
dotnet test VietCalendar.sln
dotnet run --project backend\VietCalendar.Api -- --urls http://0.0.0.0:5000
```

For email/password authentication and Expo Go over Wi-Fi, run `.\backend\VietCalendar.Api\run-local.ps1`. It loads the protected `appsettings.Production.json` and listens on port 5062.

Kiểm tra:

- `GET http://localhost:5000/api/v1/calendar/day?date=2024-02-10`
- `GET http://localhost:5000/api/v1/calendar/month?year=2024&month=2`
- `GET http://localhost:5000/api/v1/content/holidays?month=1` (cần cấu hình SQL Server)

### Cấu hình SQL Server

Chuỗi kết nối mặc định trong `appsettings.json` dùng SQL Server Express cục bộ với Windows Authentication: `Server=.\SQLEXPRESS;Initial Catalog=VietCalendar;Integrated Security=True;Encrypt=False;TrustServerCertificate=True`. Tạo database và bảng lần đầu bằng:

```powershell
sqlcmd -S ".\SQLEXPRESS" -E -i database\sqlserver-2008\000-create-database.sql
sqlcmd -S ".\SQLEXPRESS" -E -d VietCalendar -i database\sqlserver-2008\001-calendar-content.sql
```

Trên Windows Server, cấu hình trong `backend\VietCalendar.Api\appsettings.Production.json` và cấp quyền database cho tài khoản chạy dịch vụ/IIS. File chứa secrets không được commit; giới hạn quyền đọc cho tài khoản dịch vụ và quản trị viên. Backend không đọc cấu hình từ `.env`.

Nếu dùng SQL Server/database khác với SQLEXPRESS mặc định, cập nhật `ConnectionStrings:CalendarDb` trong `backend\VietCalendar.Api\appsettings.Production.json`. Bảo vệ file này và không lưu mật khẩu trong settings được commit hoặc mã nguồn.

`TrustServerCertificate=True` chỉ phù hợp môi trường kiểm thử có kiểm soát; triển khai thực tế nên dùng chứng thư hợp lệ. SQL Server 2008 đã hết hỗ trợ và có thể không thương lượng được TLS an toàn với cấu hình hiện đại. Nên nâng cấp SQL Server trước khi đưa dịch vụ ra Internet.

### Đóng gói cho Windows Server

Trên máy build có .NET 8 SDK:

```powershell
dotnet publish backend\VietCalendar.Api\VietCalendar.Api.csproj -c Release -r win-x64 --self-contained false -o publish\win-x64
```

Triển khai thư mục publish lên Windows Server có .NET 8 Hosting Bundle. Đưa file `appsettings.Production.json` đã cấu hình vào thư mục API (hoặc thư mục publish) và bảo vệ ACL để chỉ tài khoản dịch vụ cùng quản trị viên đọc được. .NET mặc định dùng môi trường `Production` nếu `ASPNETCORE_ENVIRONMENT` chưa được đặt; nếu IIS/service đang đặt môi trường khác, đổi nó trong cấu hình host để .NET nạp `appsettings.Production.json`. Giữ `GoogleAuth:DataProtectionKeysPath` ở thư mục bền vững riêng, cấp quyền ghi cho tài khoản dịch vụ và giữ key ring qua các lần deploy. Chạy sau IIS hoặc reverse proxy HTTPS; không mở Kestrel HTTP trực tiếp ra Internet.

Không sao chép `.env` lên Windows Server và không lưu production secrets trong `appsettings.json` được commit. `appsettings.Production.json` chứa mật khẩu database, SMTP, Google OAuth và OTP pepper; bảo vệ file chặt chẽ. `TrustServerCertificate=True` chỉ phù hợp môi trường kiểm thử có kiểm soát; triển khai thực tế nên dùng chứng thư hợp lệ.

## Chạy Android

Yêu cầu Android Studio, JDK 17 và Android SDK Platform 35. Mở thư mục `android` trong Android Studio và chạy cấu hình `app`. Mặc định API URL là `http://10.0.2.2:5000` cho Android Emulator; để dùng thiết bị thật, thay `API_BASE_URL` trong `android/app/build.gradle.kts` bằng địa chỉ HTTPS của máy chủ. HTTP được bật chỉ cho build debug để thử trên máy cục bộ.

Ứng dụng xin quyền notification khi người dùng bật báo thức; Android 12+ cũng yêu cầu quyền báo thức chính xác. Nếu bị từ chối, màn hình báo lý do và mở phần cài đặt quyền của hệ thống.

## Chạy iOS và widget

Yêu cầu macOS, Xcode 15+ và XcodeGen. Từ thư mục `ios` trên máy Mac:

```sh
xcodegen generate
open VietCalendar.xcodeproj
```

Chạy scheme `VietCalendar` trên simulator hoặc thiết bị. `CalendarAPI.swift` mặc định dùng `http://127.0.0.1:5000` cho iOS Simulator; trước khi chạy trên thiết bị hoặc phát hành, đổi `baseURL` sang API HTTPS có thể truy cập được. Chọn target extension `VietCalendarWidget` trong cấu hình scheme khi cần debug widget. Widget hỗ trợ kích thước nhỏ và các kiểu phụ kiện màn hình khóa của iOS 16 trở lên; nội dung âm lịch cần kết nối API.

### Thử nhanh bằng Expo Go trên iPhone

Từ thư mục `MiravaMobile`, cấu hình `EXPO_PUBLIC_API_BASE_URL` thành URL API có thể truy cập từ thiết bị (không dùng `localhost` trên điện thoại; dùng IP LAN hoặc HTTPS domain), rồi chạy `npx expo start --go --lan`. Quét QR trên terminal bằng camera iPhone và mở bằng Expo Go; điện thoại và máy tính cần ở cùng mạng Wi-Fi. Expo Go chạy bản giao diện Expo/React Native, không phải target SwiftUI; widget iOS và báo thức native cần development build. Chi tiết lệnh PowerShell và cấu hình API nằm trong `MiravaMobile/README.md`.

## Phạm vi MVP

MVP hiện chưa bao gồm thời tiết, tử vi/phong thủy, giờ hoàng đạo, nội dung văn hóa biên tập, Apple Watch, tài khoản, đồng bộ đám mây hay phát hành lên store. Những nội dung mang tính tín ngưỡng/lịch tham khảo cần được thẩm định riêng trước khi bổ sung.
