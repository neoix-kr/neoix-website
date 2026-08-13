import React, { useRef } from 'react';
import { Animated, Pressable, StyleProp, ViewStyle, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

// 토스식 눌림 — 살짝 쪼그라들었다 스프링 복귀 + 가벼운 햅틱
interface PressableScaleProps {
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;        // 시각 스타일 (Animated.View에 적용)
  containerStyle?: StyleProp<ViewStyle>; // 레이아웃 스타일 (flex 등, Pressable에 적용)
  haptic?: boolean;
  scaleTo?: number;
  disabled?: boolean;
  activeOpacity?: number;
  children: React.ReactNode;
}

export default function PressableScale({
  onPress, style, containerStyle, haptic = true, scaleTo = 0.97, disabled, children,
}: PressableScaleProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = () => {
    Animated.spring(scale, { toValue: scaleTo, useNativeDriver: true, speed: 50, bounciness: 0 }).start();
  };
  const pressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 24, bounciness: 7 }).start();
  };
  const handlePress = () => {
    if (haptic && Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    onPress?.();
  };

  return (
    <Pressable
      onPressIn={pressIn}
      onPressOut={pressOut}
      onPress={handlePress}
      disabled={disabled}
      style={containerStyle}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}
