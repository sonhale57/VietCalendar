import { StyleSheet, Text, TextInput, type TextInputProps, type TextProps } from 'react-native';

const fontFamilies: Record<string, string> = {
  '400': 'NunitoSans_400Regular',
  '500': 'NunitoSans_400Regular',
  '600': 'NunitoSans_600SemiBold',
  '700': 'NunitoSans_700Bold',
  '800': 'NunitoSans_800ExtraBold',
  '900': 'NunitoSans_800ExtraBold',
};

export function AppText({ style, ...props }: TextProps) {
  const fontWeight = String(StyleSheet.flatten(style)?.fontWeight ?? '400');
  return <Text {...props} style={[{ fontFamily: fontFamilies[fontWeight] ?? fontFamilies['400'] }, style]} />;
}

export function AppTextInput({ style, ...props }: TextInputProps) {
  return <TextInput {...props} style={[{ fontFamily: fontFamilies['400'] }, style]} />;
}
