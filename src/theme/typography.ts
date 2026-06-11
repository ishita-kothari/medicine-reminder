import { TextStyle } from 'react-native';

export const Typography = {
  body: {
    fontSize: 18,
    lineHeight: 27,
    fontWeight: '400' as TextStyle['fontWeight'],
  },
  bodyBold: {
    fontSize: 18,
    lineHeight: 27,
    fontWeight: '700' as TextStyle['fontWeight'],
  },
  large: {
    fontSize: 22,
    lineHeight: 33,
    fontWeight: '400' as TextStyle['fontWeight'],
  },
  largeBold: {
    fontSize: 22,
    lineHeight: 33,
    fontWeight: '700' as TextStyle['fontWeight'],
  },
  heading: {
    fontSize: 28,
    lineHeight: 38,
    fontWeight: '700' as TextStyle['fontWeight'],
  },
  huge: {
    fontSize: 36,
    lineHeight: 48,
    fontWeight: '800' as TextStyle['fontWeight'],
  },
  label: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '500' as TextStyle['fontWeight'],
  },
  caption: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '400' as TextStyle['fontWeight'],
  },
  button: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '700' as TextStyle['fontWeight'],
    letterSpacing: 0.5,
  },
} as const;

export type TypographyKey = keyof typeof Typography;
