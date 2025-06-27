import { Colors } from '@/constants/Colors';
import { useTheme } from '@/context/theme.context';
import { fontSizes } from '@/themes/app.constant';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { scale, verticalScale } from 'react-native-size-matters';

interface LoadingIndicatorProps {
  text?: string;
  size?: 'large' | 'small';
  fullscreen?: boolean;
}

export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ text, size = 'large', fullscreen = false }) => {
  const { theme } = useTheme();
  const color = theme.dark ? Colors.dark.text : Colors.light.text;
  const containerStyle = fullscreen ? [styles.container, styles.fullscreen] : styles.container;

  return (
    <View style={containerStyle}>
      <ActivityIndicator size={size} color={color} />
      {text && <Text style={[styles.text, { color }]}>{text}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: scale(20),
    backgroundColor: 'transparent',
  },
  fullscreen: {
    flex: 1,
  },
  text: {
    marginTop: verticalScale(10),
    fontSize: fontSizes.FONT16,
    fontWeight: '500',
  },
});
