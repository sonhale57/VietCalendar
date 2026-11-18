import { useMemo, useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { AppText as Text } from '@/components/app-text';
import { CalendarPage, Card, ImperialButton, commonStyles } from '@/components/calendar-ui';
import { calendarThemes } from '@/constants/calendar-themes';
import { useCalendarSettings } from '@/contexts/calendar-settings';
import {
  Activity,
  AlertCircle,
  Baby,
  BookOpen,
  CalendarDays,
  Clock,
  Heart,
  Leaf,
  Moon,
  Shield,
  ShieldAlert,
  Sparkles,
  Sun,
  Wind,
} from 'lucide-react-native';
import { evaluateLongevityBadges } from '@/utils/destiny-engine';
import { getSeasonalAvoidanceNotes, getVietnameseLunarDate, getVietnameseLunarMonthLength } from '@/utils/vietnamese-lunar';
import {
  khauNghiepData,
  tamKyData,
  thaiGiaoData,
  thoKhangSourceUrl,
  tonTuMaoData,
} from '@/utils/tho-khang-guidance';

type SubTab = 'fasting' | 'wellness';
type HandbookSection = 'tamKy' | 'tonTuMao' | 'thaiGiao' | 'khauNghiep';

export default function FastingScreen() {
  const router = useRouter();
  const { themeIndex, lunarCalendarAdvice, lunarCalendarAdviceError } = useCalendarSettings();
  const theme = calendarThemes[themeIndex] ?? calendarThemes[0];
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('wellness');
  const [handbookSection, setHandbookSection] = useState<HandbookSection>('tamKy');
  const [today] = useState(() => new Date());
  const [sourceError, setSourceError] = useState<string | null>(null);

  const lunar = useMemo(() => getVietnameseLunarDate(today), [today]);
  const lunarMonthLength = useMemo(() => getVietnameseLunarMonthLength(today), [today]);
  const longevity = useMemo(
    () =>
      evaluateLongevityBadges(
        lunar.day,
        lunar.month,
        lunar.isLeapMonth,
        lunarMonthLength === 29,
        getSeasonalAvoidanceNotes(today),
        lunarCalendarAdvice,
      ),
    [lunar.day, lunar.month, lunar.isLeapMonth, lunarMonthLength, today, lunarCalendarAdvice],
  );

  // Month advice schedule from lunarCalendarAdvice document
  const currentMonthAdvice = useMemo(() => {
    return lunarCalendarAdvice?.months.find((m) => m.month === lunar.month);
  }, [lunarCalendarAdvice, lunar.month]);

  const monthSchedule = useMemo(() => {
    return currentMonthAdvice?.tkbg_days ?? [];
  }, [currentMonthAdvice]);

  const todayAdviceItem = useMemo(() => {
    return monthSchedule.find((item) => item.day === lunar.day);
  }, [monthSchedule, lunar.day]);

  return (
    <CalendarPage>
      <View>
        <Text style={[styles.eyebrow, { color: theme.accent }]}>DƯỠNG SINH · ĐIỀU ĐỘ THÂN TÂM</Text>
        <Text style={[styles.title, { color: theme.text }]}>Bảo Thọ & Tiết Dục</Text>
        <Text style={[commonStyles.muted, { color: theme.muted }]}>
          Thuận theo y học cổ truyền và lời dạy cổ nhân để bảo tồn nguyên khí, an lạc thân tâm.
        </Text>
        {lunarCalendarAdviceError && (
          <Text style={[commonStyles.muted, { color: '#A15C54', marginTop: 6 }]}>{lunarCalendarAdviceError}</Text>
        )}
      </View>

      <View style={[styles.segment, { backgroundColor: theme.card }]}>
        <SubTabButton
          label="Bảo thọ, Tiết dục"
          icon={Activity}
          active={activeSubTab === 'wellness'}
          theme={theme}
          onPress={() => setActiveSubTab('wellness')}
        />
        <SubTabButton
          label="Thanh trai"
          icon={Leaf}
          active={activeSubTab === 'fasting'}
          theme={theme}
          onPress={() => setActiveSubTab('fasting')}
        />
      </View>

      {activeSubTab === 'fasting' ? (
        <FastingSubView longevity={longevity} lunar={lunar} theme={theme} />
      ) : (
        <>
          {/* KHỐI 1: THẺ NHẮC DƯỠNG SINH HÔM NAY */}
          {longevity.isDaiKy || todayAdviceItem ? (
            <Card
              style={{
                ...styles.longevityPanel,
                borderLeftColor:
                  longevity.daiKyLevel === 'CRITICAL' || todayAdviceItem?.level === 'HIGH' ? '#A15C54' : '#A17A32',
              }}>
              <View style={styles.sectionHeading}>
                {longevity.daiKyLevel === 'CRITICAL' || todayAdviceItem?.level === 'HIGH' ? (
                  <ShieldAlert size={18} color="#A15C54" />
                ) : (
                  <Moon size={18} color="#A17A32" />
                )}
                <Text style={[styles.sectionHeadingText, { color: theme.text }]}>Nhịp Dưỡng Sinh Hôm Nay</Text>
              </View>

              <View style={styles.badgeRow}>
                <Text
                  style={[
                    styles.ruleBadge,
                    {
                      color:
                        longevity.daiKyLevel === 'CRITICAL' || todayAdviceItem?.level === 'HIGH'
                          ? '#A15C54'
                          : '#A17A32',
                    },
                  ]}>
                  {longevity.daiKyLevel === 'CRITICAL' || todayAdviceItem?.level === 'HIGH'
                    ? '⚠️ ĐẠI KỴ NHIẾP TINH'
                    : '🌙 NGÀY TỊNH DƯỠNG'}
                </Text>
                <Text style={[styles.dateSubBadge, { color: theme.muted }]}>
                  Ngày {lunar.day}/{lunar.month} Âm lịch{lunar.isLeapMonth ? ' (Nhuận)' : ''}
                </Text>
              </View>

              <Text style={[styles.cardTitle, { color: theme.text }]}>
                {todayAdviceItem?.title ?? longevity.daiKyReason ?? 'Ngày khí tiết biến động'}
              </Text>

              <Text style={[commonStyles.body, { color: theme.text, marginTop: 4 }]}>
                {todayAdviceItem?.advice ?? longevity.daiKyAdvice}
              </Text>

              <View style={[styles.ancientQuoteBox, { backgroundColor: theme.background }]}>
                <Text style={[styles.quoteText, { color: theme.text }]}>
                  "Vào ngày khí tiết âm dương giao tranh, cổ nhân khuyên nên bế tinh tàng khí, giữ tâm an định, nghỉ ngơi
                  sớm trước 23h để dưỡng tạng Thận và Can."
                </Text>
                <Text style={[styles.quoteAuthor, { color: theme.accent }]}>— Lời dạy của cổ nhân dưỡng sinh</Text>
              </View>
            </Card>
          ) : (
            <Card style={{ ...styles.longevityPanel, borderLeftColor: '#2D7A5C' }}>
              <View style={styles.sectionHeading}>
                <Sun size={18} color="#2D7A5C" />
                <Text style={[styles.sectionHeadingText, { color: theme.text }]}>Nhịp Dưỡng Sinh Hôm Nay</Text>
              </View>

              <View style={styles.badgeRow}>
                <Text style={[styles.ruleBadge, { color: '#2D7A5C' }]}>🌿 NGÀY BÌNH HÒA · ÂM DƯƠNG THUẬN HÒA</Text>
                <Text style={[styles.dateSubBadge, { color: theme.muted }]}>
                  Ngày {lunar.day}/{lunar.month} Âm lịch{lunar.isLeapMonth ? ' (Nhuận)' : ''}
                </Text>
              </View>

              <Text style={[styles.cardTitle, { color: theme.text }]}>Khí tiết trời đất bình ổn</Text>

              <Text style={[commonStyles.body, { color: theme.text, marginTop: 4 }]}>
                Hôm nay khí âm dương điều hòa, thuận lợi cho lao động và sinh hoạt thường nhật. Cổ nhân khuyên duy trì nếp
                sống điều độ, tâm thế an vui, ăn uống thanh đạm, tránh lao lực quá sức để bồi dưỡng nguyên khí bền lâu.
              </Text>

              <View style={[styles.ancientQuoteBox, { backgroundColor: theme.background }]}>
                <Text style={[styles.quoteText, { color: theme.text }]}>
                  "Bình hòa là gốc của trường thọ. Tâm bình thì khí hòa, khí hòa thì thần định, trăm mạch tự nhiên lưu
                  thông thông suốt."
                </Text>
                <Text style={[styles.quoteAuthor, { color: theme.accent }]}>— Hoàng Đế Nội Kinh</Text>
              </View>
            </Card>
          )}

          {/* BANNER THÁNG 5 CỬU ĐỘC HOẶC LƯU Ý THÁNG */}
          {lunar.month === 5 ? (
            <View style={[styles.seasonCard, { backgroundColor: '#FDF1E7', borderColor: '#E8A77E', borderWidth: 1 }]}>
              <View style={styles.bannerHeading}>
                <AlertCircle size={18} color="#B5512B" />
                <Text style={[styles.bannerTitle, { color: '#B5512B' }]}>Tháng Năm Âm Lịch · Tháng Cửu Độc</Text>
              </View>
              <Text style={[styles.bannerBody, { color: '#764B32' }]}>
                Theo Đông y cổ truyền, tháng Năm đầu hạ là lúc dương khí bốc mạnh ra ngoài bề mặt cơ thể, lỗ chân lông giãn
                nở, nhưng âm hàn lại tiềm phục bên trong khiến tạng phủ dễ hư tổn. Cổ nhân khuyên nên tiết chế dục sự tối đa
                suốt tháng, đặc biệt kiêng kỵ vào 9 ngày Cửu Độc (Mùng 5, 6, 7; 15, 16, 17; 25, 26, 27) để giữ vững chân
                dương.
              </Text>
            </View>
          ) : currentMonthAdvice?.month_theme ? (
            <View style={[styles.seasonCard, { backgroundColor: '#F3EFEA', borderColor: '#D7CDC1', borderWidth: 1 }]}>
              <View style={styles.bannerHeading}>
                <Wind size={18} color={theme.accent} />
                <Text style={[styles.bannerTitle, { color: theme.text }]}>
                  {currentMonthAdvice.month_name} · Khí Tiết Dưỡng Sinh
                </Text>
              </View>
              <Text style={[styles.bannerBody, { color: theme.muted }]}>{currentMonthAdvice.month_theme}</Text>
            </View>
          ) : null}

          {/* KHỐI 2: LỊCH NHẮC DƯỠNG SINH THÁNG NÀY */}
          <Card style={styles.scheduleCard}>
            <View style={styles.scheduleHeaderRow}>
              <View style={styles.sectionHeading}>
                <CalendarDays size={18} color={theme.accent} />
                <Text style={[styles.sectionHeadingText, { color: theme.text }]}>
                  Lịch Nhắc Dưỡng Sinh Tháng {lunar.month} Âm Lịch
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/calendar')}
                style={({ pressed }) => [styles.viewCalendarBtn, pressed && { opacity: 0.7 }]}>
                <Text style={[styles.viewCalendarText, { color: theme.accent }]}>Xem Lịch Tháng ›</Text>
              </Pressable>
            </View>

            <Text style={[commonStyles.muted, { color: theme.muted }]}>
              Tổng hợp các mốc ngày âm dương giao chuyển trong tháng theo lịch Thọ Khang Bảo Giám và lời dạy cổ nhân.
            </Text>

            {monthSchedule.length > 0 ? (
              <View style={styles.scheduleList}>
                {monthSchedule.map((item) => {
                  const isToday = item.day === lunar.day;
                  const isCritical = item.level === 'HIGH';
                  return (
                    <View
                      key={item.day}
                      style={[
                        styles.scheduleItem,
                        { backgroundColor: isToday ? `${theme.accent}12` : theme.background },
                        isToday && { borderColor: theme.accent, borderWidth: 1 },
                      ]}>
                      <View style={styles.scheduleItemLeft}>
                        <View
                          style={[
                            styles.dayCircle,
                            { backgroundColor: isCritical ? '#FCE8E6' : '#FEF3D6' },
                          ]}>
                          <Text style={[styles.dayCircleText, { color: isCritical ? '#A15C54' : '#A17A32' }]}>
                            {item.day}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.scheduleItemRight}>
                        <View style={styles.scheduleTitleRow}>
                          <Text style={[styles.scheduleItemTitle, { color: theme.text }]}>{item.title}</Text>
                          {isToday && (
                            <View style={[styles.todayTag, { backgroundColor: theme.accent }]}>
                              <Text style={styles.todayTagText}>Hôm nay</Text>
                            </View>
                          )}
                        </View>
                        <Text style={[styles.scheduleItemAdvice, { color: theme.muted }]}>{item.advice}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : (
              <Text style={[commonStyles.muted, { color: theme.muted, fontStyle: 'italic', marginTop: 8 }]}>
                Đang cập nhật danh mục ngày dưỡng sinh của tháng này.
              </Text>
            )}

            <ImperialButton
              title="Mở Lịch Vạn Niên Chi Tiết"
              onPress={() => router.push('/calendar')}
              style={{ marginTop: 14 }}
            />
          </Card>

          {/* KHỐI 3: CẨM NANG DƯỠNG SINH CỦA CỔ NHÂN */}
          <Card style={styles.handbookCard}>
            <View style={styles.sectionHeading}>
              <BookOpen size={18} color={theme.accent} />
              <Text style={[styles.sectionHeadingText, { color: theme.text }]}>Cẩm Nang Dưỡng Sinh & Cổ Huấn</Text>
            </View>

            <Text style={[commonStyles.muted, { color: theme.muted }]}>
              Lời dạy quý báu của các bậc danh y và hiền triết phương Đông về bảo tồn sinh lực và đạo làm cha mẹ.
            </Text>

            {/* Handbook Navigation Pills */}
            <View style={styles.handbookPillsRow}>
              <HandbookPill
                label="Tam Kỵ"
                icon={Shield}
                active={handbookSection === 'tamKy'}
                theme={theme}
                onPress={() => setHandbookSection('tamKy')}
              />
              <HandbookPill
                label="Tôn Tư Mạo"
                icon={Clock}
                active={handbookSection === 'tonTuMao'}
                theme={theme}
                onPress={() => setHandbookSection('tonTuMao')}
              />
              <HandbookPill
                label="Thai Giáo"
                icon={Baby}
                active={handbookSection === 'thaiGiao'}
                theme={theme}
                onPress={() => setHandbookSection('thaiGiao')}
              />
              <HandbookPill
                label="Thanh Tâm"
                icon={Heart}
                active={handbookSection === 'khauNghiep'}
                theme={theme}
                onPress={() => setHandbookSection('khauNghiep')}
              />
            </View>

            {/* Handbook Content */}
            {handbookSection === 'tamKy' && <TamKyView theme={theme} />}
            {handbookSection === 'tonTuMao' && <TonTuMaoView theme={theme} />}
            {handbookSection === 'thaiGiao' && <ThaiGiaoView theme={theme} />}
            {handbookSection === 'khauNghiep' && <KhauNghiepView theme={theme} />}

            {/* Nguồn tài liệu & Disclaimer */}
            <View style={[styles.sourceBox, { borderTopColor: `${theme.muted}25` }]}>
              <Pressable
                accessibilityRole="link"
                onPress={() => {
                  setSourceError(null);
                  void Linking.openURL(thoKhangSourceUrl).catch(() => {
                    setSourceError('Không mở được trang nguồn trên thiết bị này.');
                  });
                }}>
                <Text style={[styles.sourceLink, { color: theme.accent }]}>
                  Đọc nguyên tác Thọ Khang Bảo Giám (Phần 3) · niempha.net ↗
                </Text>
              </Pressable>
              {sourceError && <Text style={[styles.note, { color: '#A15C54' }]}>{sourceError}</Text>}
              <Text style={[styles.disclaimerText, { color: theme.muted }]}>
                * Nội dung được biên soạn trên tinh thần y học dưỡng sinh cổ truyền và lời khuyên đạo đức gia đình của
                cổ nhân; mang tính định hướng nếp sống thanh lành, điều độ, không thay thế chẩn đoán y khoa hiện đại.
              </Text>
            </View>
          </Card>
        </>
      )}
    </CalendarPage>
  );
}

// -----------------------------------------------------------------------------
// SUB-VIEWS & COMPONENTS
// -----------------------------------------------------------------------------

function FastingSubView({
  longevity,
  lunar,
  theme,
}: {
  longevity: ReturnType<typeof evaluateLongevityBadges>;
  lunar: { day: number; month: number; isLeapMonth: boolean };
  theme: (typeof calendarThemes)[number];
}) {
  return (
    <>
      {longevity.isThapTrai ? (
        <Card style={{ ...styles.longevityPanel, borderLeftColor: '#39724C' }}>
          <View style={styles.sectionHeading}>
            <Leaf size={17} color="#39724C" />
            <Text style={[styles.sectionHeadingText, { color: theme.text }]}>Ngày Thập Trai Thanh Tịnh</Text>
          </View>
          <Text style={[styles.ruleBadge, { color: '#39724C' }]}>
            Ngày {lunar.day}/{lunar.month} Âm lịch{lunar.isLeapMonth ? ' (Nhuận)' : ''}
          </Text>
          <Text style={[commonStyles.body, { color: theme.text }]}>{longevity.thapTraiAdvice}</Text>
          <View style={[styles.ancientQuoteBox, { backgroundColor: theme.background }]}>
            <Text style={[styles.quoteText, { color: theme.text }]}>
              "Thanh trai là dịp để thanh lọc cơ thể bằng thực phẩm thực vật thanh đạm, nuôi dưỡng lòng từ bi, phóng sinh hộ
              mạng và giữ tâm ý thanh thản."
            </Text>
            <Text style={[styles.quoteAuthor, { color: theme.accent }]}>— Thực hành Thập Trai</Text>
          </View>
        </Card>
      ) : (
        <Card style={{ ...styles.longevityPanel, borderLeftColor: '#39724C' }}>
          <View style={styles.sectionHeading}>
            <Leaf size={17} color="#39724C" />
            <Text style={[styles.sectionHeadingText, { color: theme.text }]}>Hôm Nay Không Thuộc Thập Trai</Text>
          </View>
          <Text style={[styles.ruleBadge, { color: '#39724C' }]}>
            Ngày {lunar.day}/{lunar.month} Âm lịch{lunar.isLeapMonth ? ' (Nhuận)' : ''}
          </Text>
          <Text style={[commonStyles.body, { color: theme.text }]}>
            Hôm nay là ngày sinh hoạt bình thường. Bạn có thể tùy tâm chọn thực đơn thanh đạm, ăn nhiều rau quả tươi mát để
            hỗ trợ hệ tiêu hóa và nuôi dưỡng sự an lạc.
          </Text>
        </Card>
      )}

      <Card style={styles.handbookCard}>
        <View style={styles.sectionHeading}>
          <Sparkles size={17} color={theme.accent} />
          <Text style={[styles.sectionHeadingText, { color: theme.text }]}>Ý Nghĩa Của Nếp Sống Thanh Trai</Text>
        </View>
        <Text style={[commonStyles.body, { color: theme.muted }]}>
          Theo truyền thống Á Đông, 10 ngày trai trong tháng (Mùng 1, 8, 14, 15, 18, 23, 24, 28, 29, 30) là dịp để con
          người sống chậm lại, hướng tâm về sự thiện lành, hạn chế sát sinh và cho cơ quan tiêu hóa cơ hội nghỉ ngơi.
        </Text>
      </Card>
    </>
  );
}

function TamKyView({ theme }: { theme: (typeof calendarThemes)[number] }) {
  const { thienKy, diaKy, nhanKy } = tamKyData;
  return (
    <View style={styles.handbookContentContainer}>
      <HandbookSectionItem item={thienKy} theme={theme} badgeColor="#A15C54" />
      <HandbookSectionItem item={diaKy} theme={theme} badgeColor="#A17A32" />
      <HandbookSectionItem item={nhanKy} theme={theme} badgeColor="#845A36" />
    </View>
  );
}

function TonTuMaoView({ theme }: { theme: (typeof calendarThemes)[number] }) {
  const { title, author, description, ageTable, seasonalWisdom } = tonTuMaoData;
  return (
    <View style={styles.handbookContentContainer}>
      <View style={[styles.handbookItemBox, { backgroundColor: theme.background }]}>
        <Text style={[styles.handbookItemTitle, { color: theme.text }]}>{title}</Text>
        <Text style={[styles.handbookItemAuthor, { color: theme.accent }]}>Lời dạy của {author}</Text>
        <Text style={[styles.handbookItemDesc, { color: theme.text }]}>{description}</Text>

        <Text style={[styles.subSectionTitle, { color: theme.text, marginTop: 14 }]}>
          Bảng tần suất điều độ tham khảo theo độ tuổi:
        </Text>

        <View style={styles.tableBox}>
          {ageTable.map((row, idx) => (
            <View
              key={row.age}
              style={[
                styles.tableRow,
                { borderBottomColor: `${theme.muted}20` },
                idx === ageTable.length - 1 && { borderBottomWidth: 0 },
              ]}>
              <View style={styles.tableAgeCol}>
                <Text style={[styles.tableAgeText, { color: theme.accent }]}>{row.age}</Text>
              </View>
              <View style={styles.tableContentCol}>
                <Text style={[styles.tableIntervalText, { color: theme.text }]}>{row.interval}</Text>
                <Text style={[styles.tableNoteText, { color: theme.muted }]}>{row.note}</Text>
              </View>
            </View>
          ))}
        </View>

        <Text style={[styles.subSectionTitle, { color: theme.text, marginTop: 16 }]}>
          Quy luật bế tàng tinh khí 4 Mùa:
        </Text>

        <View style={styles.seasonalList}>
          {seasonalWisdom.map((item) => (
            <View key={item.season} style={styles.seasonBullet}>
              <Text style={[styles.seasonBulletTitle, { color: theme.accent }]}>• {item.season}:</Text>
              <Text style={[styles.seasonBulletDesc, { color: theme.muted }]}>{item.advice}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

function ThaiGiaoView({ theme }: { theme: (typeof calendarThemes)[number] }) {
  const { title, author, sections } = thaiGiaoData;
  return (
    <View style={styles.handbookContentContainer}>
      <View style={[styles.handbookItemBox, { backgroundColor: theme.background }]}>
        <Text style={[styles.handbookItemTitle, { color: theme.text }]}>{title}</Text>
        <Text style={[styles.handbookItemAuthor, { color: theme.accent }]}>Lời luận của {author}</Text>

        {sections.map((sec) => (
          <View key={sec.heading} style={styles.thaiGiaoSection}>
            <Text style={[styles.subSectionTitle, { color: theme.text }]}>{sec.heading}</Text>
            <Text style={[styles.handbookItemDesc, { color: theme.muted, marginTop: 4 }]}>{sec.body}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function KhauNghiepView({ theme }: { theme: (typeof calendarThemes)[number] }) {
  const { title, summary, details } = khauNghiepData;
  return (
    <View style={styles.handbookContentContainer}>
      <View style={[styles.handbookItemBox, { backgroundColor: theme.background }]}>
        <Text style={[styles.handbookItemTitle, { color: theme.text }]}>{title}</Text>
        <Text style={[styles.handbookItemDesc, { color: theme.text, fontStyle: 'italic', marginBottom: 12 }]}>
          "{summary}"
        </Text>

        {details.map((detail, index) => (
          <View key={index} style={styles.detailRow}>
            <Text style={[styles.detailBullet, { color: theme.accent }]}>—</Text>
            <Text style={[styles.detailText, { color: theme.muted }]}>{detail}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function HandbookSectionItem({
  item,
  theme,
  badgeColor,
}: {
  item: typeof tamKyData.thienKy;
  theme: (typeof calendarThemes)[number];
  badgeColor: string;
}) {
  return (
    <View style={[styles.handbookItemBox, { backgroundColor: theme.background }]}>
      <View style={styles.handbookItemHeader}>
        <View style={[styles.itemDot, { backgroundColor: badgeColor }]} />
        <Text style={[styles.handbookItemTitle, { color: theme.text }]}>{item.title}</Text>
      </View>
      <Text style={[styles.handbookItemDesc, { color: theme.muted }]}>{item.summary}</Text>

      {item.quote && (
        <View style={[styles.miniQuoteBox, { borderLeftColor: badgeColor }]}>
          <Text style={[styles.miniQuoteText, { color: theme.text }]}>"{item.quote}"</Text>
        </View>
      )}

      <View style={styles.detailList}>
        {item.details.map((d, idx) => (
          <View key={idx} style={styles.detailRow}>
            <Text style={[styles.detailBullet, { color: badgeColor }]}>•</Text>
            <Text style={[styles.detailText, { color: theme.text }]}>{d}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function SubTabButton({
  label,
  icon: Icon,
  active,
  theme,
  onPress,
}: {
  label: string;
  icon: typeof Leaf;
  active: boolean;
  theme: (typeof calendarThemes)[number];
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.subTab, active && { backgroundColor: theme.background }]}>
      <Icon size={16} color={active ? theme.accent : theme.muted} strokeWidth={2} />
      <Text style={[styles.subTabText, { color: active ? theme.accent : theme.muted }]}>{label}</Text>
    </Pressable>
  );
}

function HandbookPill({
  label,
  icon: Icon,
  active,
  theme,
  onPress,
}: {
  label: string;
  icon: typeof Shield;
  active: boolean;
  theme: (typeof calendarThemes)[number];
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[
        styles.handbookPill,
        {
          backgroundColor: active ? theme.accent : theme.background,
          borderColor: active ? theme.accent : `${theme.muted}30`,
        },
      ]}>
      <Icon size={13} color={active ? '#FFFFFF' : theme.muted} strokeWidth={2} />
      <Text style={[styles.handbookPillText, { color: active ? '#FFFFFF' : theme.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  eyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 1.4 },
  title: { fontSize: 26, fontWeight: '700', marginTop: 3 },
  segment: { flexDirection: 'row', borderRadius: 8, padding: 4, marginTop: 4 },
  subTab: {
    minHeight: 42,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: 8,
  },
  subTabText: { fontSize: 12, fontWeight: '700' },
  longevityPanel: { borderLeftWidth: 4, paddingLeft: 14, gap: 6 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  sectionHeadingText: { fontSize: 15, fontWeight: '700' },
  badgeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 },
  ruleBadge: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  dateSubBadge: { fontSize: 11, fontWeight: '600' },
  cardTitle: { fontSize: 15, fontWeight: '700', lineHeight: 21 },
  ancientQuoteBox: { borderRadius: 8, padding: 12, marginTop: 8, gap: 4 },
  quoteText: { fontSize: 12, fontStyle: 'italic', lineHeight: 18 },
  quoteAuthor: { fontSize: 11, fontWeight: '700', textAlign: 'right' },
  seasonCard: { borderRadius: 8, padding: 14, gap: 6 },
  bannerHeading: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bannerTitle: { fontSize: 13, fontWeight: '700' },
  bannerBody: { fontSize: 12, lineHeight: 18 },
  scheduleCard: { gap: 10 },
  scheduleHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  viewCalendarBtn: { paddingVertical: 4, paddingHorizontal: 8 },
  viewCalendarText: { fontSize: 12, fontWeight: '700' },
  scheduleList: { gap: 8, marginTop: 4 },
  scheduleItem: { flexDirection: 'row', borderRadius: 8, padding: 10, gap: 10, alignItems: 'flex-start' },
  scheduleItemLeft: { paddingTop: 2 },
  dayCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  dayCircleText: { fontSize: 13, fontWeight: '800' },
  scheduleItemRight: { flex: 1, gap: 2 },
  scheduleTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  scheduleItemTitle: { fontSize: 13, fontWeight: '700' },
  todayTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  todayTagText: { color: '#FFFFFF', fontSize: 9, fontWeight: '800' },
  scheduleItemAdvice: { fontSize: 11, lineHeight: 16 },
  handbookCard: { gap: 12 },
  handbookPillsRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  handbookPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  handbookPillText: { fontSize: 11, fontWeight: '700' },
  handbookContentContainer: { gap: 10, marginTop: 4 },
  handbookItemBox: { borderRadius: 8, padding: 14, gap: 6 },
  handbookItemHeader: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  itemDot: { width: 8, height: 8, borderRadius: 4 },
  handbookItemTitle: { fontSize: 14, fontWeight: '700' },
  handbookItemAuthor: { fontSize: 11, fontWeight: '600', fontStyle: 'italic' },
  handbookItemDesc: { fontSize: 12, lineHeight: 18 },
  miniQuoteBox: { borderLeftWidth: 3, paddingLeft: 10, marginVertical: 6 },
  miniQuoteText: { fontSize: 11, fontStyle: 'italic', lineHeight: 17 },
  detailList: { gap: 6, marginTop: 6 },
  detailRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  detailBullet: { fontSize: 13, fontWeight: '700', lineHeight: 18 },
  detailText: { fontSize: 12, lineHeight: 18, flex: 1 },
  subSectionTitle: { fontSize: 12, fontWeight: '700' },
  tableBox: { borderRadius: 6, borderWidth: 1, borderColor: '#00000010', marginTop: 6, overflow: 'hidden' },
  tableRow: { flexDirection: 'row', padding: 8, borderBottomWidth: 1 },
  tableAgeCol: { width: 85, justifyContent: 'center' },
  tableAgeText: { fontSize: 12, fontWeight: '700' },
  tableContentCol: { flex: 1, gap: 2 },
  tableIntervalText: { fontSize: 12, fontWeight: '700' },
  tableNoteText: { fontSize: 10, lineHeight: 15 },
  seasonalList: { gap: 6, marginTop: 6 },
  seasonBullet: { gap: 1 },
  seasonBulletTitle: { fontSize: 12, fontWeight: '700' },
  seasonBulletDesc: { fontSize: 11, lineHeight: 16, paddingLeft: 10 },
  thaiGiaoSection: { marginTop: 10, gap: 2 },
  sourceBox: { borderTopWidth: 1, paddingTop: 12, gap: 6 },
  sourceLink: { fontSize: 12, fontWeight: '700', textDecorationLine: 'underline' },
  disclaimerText: { fontSize: 10, lineHeight: 15, fontStyle: 'italic' },
  note: { fontSize: 11, lineHeight: 17 },
});
