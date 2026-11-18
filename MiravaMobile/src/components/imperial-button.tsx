import { useRef, type ReactNode } from 'react';
import {
  Animated,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type GestureResponderEvent,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { AppText as Text } from '@/components/app-text';

export interface ImperialButtonProps {
  title: string;
  onPress?: (event: GestureResponderEvent) => void;
  icon?: ReactNode;
  subtitle?: string;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  size?: 'small' | 'medium' | 'large';
  variant?: 'primary' | 'gold' | 'compact';
}

const LEFT_BRACKET = require('@/assets/images/imperial-btn-left.png');
const RIGHT_BRACKET = require('@/assets/images/imperial-btn-right.png');

/**
 * ImperialButton: Nút bấm phong cách hoành phi / bảng hiệu cung đình hoàng tộc
 * Mô phỏng chuẩn xác mẫu thiết kế cung đình: 
 * - Hai đầu ngoàm viền vàng hoa văn như ý / phù vân cung đình
 * - Thân nút sơn mài huyết dụ sang trọng, nẹp chỉ vàng kim trên dưới
 * - Chữ chạm khắc vàng kim rực rỡ nổi khối
 */
export function ImperialButton({
  title,
  onPress,
  icon,
  subtitle,
  disabled = false,
  style,
  textStyle,
  size = 'medium',
}: ImperialButtonProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: Platform.OS !== 'web',
      speed: 40,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: Platform.OS !== 'web',
      speed: 30,
      bounciness: 6,
    }).start();
  };

  const height = size === 'small' ? 38 : size === 'large' ? 52 : 44;
  const endCapWidth = Math.round(height * (23 / 20));
  const fontSize = size === 'small' ? 12 : size === 'large' ? 15 : 13.5;

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }], opacity: disabled ? 0.6 : 1 }, style]}>
      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.container, { height }]}>
        {/* 1. Đầu ngoàm hoa văn vàng bên trái */}
        <Image
          source={LEFT_BRACKET}
          resizeMode="stretch"
          style={{ width: endCapWidth, height }}
        />

        {/* 2. Thân hoành phi sơn mài huyết dụ ở giữa */}
        <View style={[styles.centerBar, { height }]}>
          {/* Nẹp viền vàng kim trên và dưới */}
          <View style={styles.goldBorderTop} />
          <View style={styles.innerHighlight} />

          {/* Nội dung nút bấm: Icon + Chữ vàng hoàng kim */}
          <View style={styles.contentRow}>
            {icon && <View style={styles.iconContainer}>{icon}</View>}
            <View style={styles.textContainer}>
              <Text style={[styles.buttonText, { fontSize }, textStyle]} numberOfLines={1}>
                {title}
              </Text>
              {subtitle ? <Text style={styles.subtitleText}>{subtitle}</Text> : null}
            </View>
          </View>

          <View style={styles.goldBorderBottom} />
        </View>

        {/* 3. Đầu ngoàm hoa văn vàng bên phải */}
        <Image
          source={RIGHT_BRACKET}
          resizeMode="stretch"
          style={{ width: endCapWidth, height }}
        />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    minWidth: 160,
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
    shadowColor: '#58020A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  centerBar: {
    flex: 1,
    backgroundColor: '#7A0E18', // Sơn mài huyết dụ hoàng gia
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    paddingHorizontal: 8,
    marginHorizontal: -2,
  },
  goldBorderTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2.5,
    backgroundColor: '#DDB357', // Chỉ vàng kim viền trên
  },
  goldBorderBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2.5,
    backgroundColor: '#B88B2A', // Chỉ đồng cổ viền dưới
  },
  innerHighlight: {
    position: 'absolute',
    top: 2.5,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 230, 160, 0.28)',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    zIndex: 2,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFF2D1', // Vàng hoàng kim ánh sáng
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(40, 2, 5, 0.9)',
    textShadowOffset: { width: 0, height: 1.5 },
    textShadowRadius: 3,
  },
  subtitleText: {
    color: '#E8C57A',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 1,
    letterSpacing: 0.3,
  },
});
