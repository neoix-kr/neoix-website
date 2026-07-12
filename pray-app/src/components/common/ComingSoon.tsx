import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../theme/colors';
import { FONT, SPACING } from '../../theme';

export default function ComingSoon({
  title,
  desc,
  icon,
}: {
  title: string;
  desc: string;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.h1}>{title}</Text>
      </View>
      <View style={styles.center}>
        <View style={styles.iconWrap}>
          <Ionicons name={icon} size={30} color={COLORS.primary} />
        </View>
        <Text style={styles.soon}>곧 만나요</Text>
        <Text style={styles.desc}>{desc}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: SPACING.xl, paddingBottom: SPACING.xl },
  h1: { fontSize: 24, color: COLORS.textStrong, fontFamily: FONT.bold },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, marginTop: -60 },
  iconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.lg },
  soon: { fontSize: 17, color: COLORS.text, fontFamily: FONT.semibold },
  desc: { fontSize: 14, color: COLORS.textSecondary, fontFamily: FONT.regular, textAlign: 'center', marginTop: 8, lineHeight: 21 },
});
