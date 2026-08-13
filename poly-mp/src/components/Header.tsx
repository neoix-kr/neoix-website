import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, type ThemeColors } from '../theme/ThemeContext';
import GlassIconButton from './GlassIconButton';

interface HeaderProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  showLive?: boolean;
  onLive?: () => void;
  showNotification?: boolean;
  onNotification?: () => void;
  rightElement?: React.ReactNode;
}

export default function Header({
  title = '폴리',
  showBack, onBack,
  showLive, onLive,
  showNotification = false,
  onNotification,
  rightElement,
}: HeaderProps) {
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <View style={styles.row}>
        {showBack ? (
          <GlassIconButton
            icon="chevron-back"
            onPress={onBack}
            size={40}
            iconSize={24}
            iconColor={COLORS.grey900}
            fallbackVariant="plain"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          />
        ) : (
          <Text style={styles.title}>{title}</Text>
        )}

        {showBack && <Text style={styles.titleCenter}>{title}</Text>}

        <View style={styles.rightContainer}>
          {showLive && (
            <GlassIconButton
              icon="radio-outline"
              onPress={onLive}
              size={40}
              iconSize={22}
              iconColor={COLORS.grey700}
              fallbackVariant="plain"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <View style={styles.liveDotSmall} />
            </GlassIconButton>
          )}
          {showNotification && (
            <GlassIconButton
              icon="notifications-outline"
              onPress={onNotification}
              size={40}
              iconSize={22}
              iconColor={COLORS.grey700}
              fallbackVariant="plain"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            />
          )}
          {rightElement}
        </View>
      </View>
    </View>
  );
}

const makeStyles = (COLORS: ThemeColors) => StyleSheet.create({
  container: {
    // 토스식 크롬 — 회색 캔버스와 한 몸, 카드가 떠 보이게
    backgroundColor: COLORS.background,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.grey900,
    letterSpacing: -0.4,
  },
  titleCenter: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.grey900,
    flex: 1,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 'auto',
  },
  liveDotSmall: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.liveRed,
    borderWidth: 1.5,
    borderColor: COLORS.headerBg,
  },
});
