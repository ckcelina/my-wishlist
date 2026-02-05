
import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Dimensions,
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/IconSymbol';
import { BlurView } from 'expo-blur';
import { useAppTheme } from '@/contexts/ThemeContext';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolate,
} from 'react-native-reanimated';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Href } from 'expo-router';
import { createColors } from '@/styles/designSystem';
import { ComponentSpacing } from '@/styles/spacing';

const { width: screenWidth } = Dimensions.get('window');

export interface TabBarItem {
  name: string;
  route: Href;
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  emphasized?: boolean;
}

interface FloatingTabBarProps {
  tabs: TabBarItem[];
  containerWidth?: number;
  borderRadius?: number;
  bottomMargin?: number;
}

export default function FloatingTabBar({
  tabs,
  containerWidth = screenWidth * 0.85,
  borderRadius = 35,
  bottomMargin
}: FloatingTabBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, isDark } = useAppTheme();
  const colors = useMemo(() => createColors(theme), [theme]);
  const animatedValue = useSharedValue(0);
  const insets = useSafeAreaInsets();

  const activeTabIndex = useMemo(() => {
    let bestMatch = -1;
    let bestMatchScore = 0;

    tabs.forEach((tab, index) => {
      let score = 0;

      if (pathname === tab.route) {
        score = 100;
      } else if (pathname.startsWith(tab.route as string)) {
        score = 80;
      } else if (pathname.includes(tab.name)) {
        score = 60;
      } else if (tab.route.includes('/(tabs)/') && pathname.includes(tab.route.split('/(tabs)/')[1])) {
        score = 40;
      }

      if (score > bestMatchScore) {
        bestMatchScore = score;
        bestMatch = index;
      }
    });

    return bestMatch >= 0 ? bestMatch : 0;
  }, [pathname, tabs]);

  React.useEffect(() => {
    if (activeTabIndex >= 0) {
      animatedValue.value = withSpring(activeTabIndex, {
        damping: 20,
        stiffness: 120,
        mass: 1,
      });
    }
  }, [activeTabIndex, animatedValue]);

  const handleTabPress = (route: Href) => {
    router.push(route);
  };

  const tabWidthPercent = ((100 / tabs.length) - 1).toFixed(2);

  const indicatorStyle = useAnimatedStyle(() => {
    const tabWidth = (containerWidth - 8) / tabs.length;
    return {
      transform: [
        {
          translateX: interpolate(
            animatedValue.value,
            [0, tabs.length - 1],
            [0, tabWidth * (tabs.length - 1)]
          ),
        },
      ],
    };
  });

  // Calculate bottom margin with safe area
  const calculatedBottomMargin = bottomMargin ?? Math.max(insets.bottom, ComponentSpacing.tabBarBottomMargin);

  const dynamicStyles = useMemo(() => ({
    container: {
      ...styles.container,
      width: containerWidth,
      marginBottom: calculatedBottomMargin,
    },
    blurContainer: {
      ...styles.blurContainer,
      borderWidth: 1.2,
      borderColor: colors.border,
      borderRadius,
      ...Platform.select({
        ios: {
          backgroundColor: isDark
            ? 'rgba(118, 89, 67, 0.85)'
            : 'rgba(237, 232, 227, 0.85)',
        },
        android: {
          backgroundColor: isDark
            ? 'rgba(118, 89, 67, 0.95)'
            : 'rgba(237, 232, 227, 0.95)',
        },
        web: {
          backgroundColor: isDark
            ? 'rgba(118, 89, 67, 0.95)'
            : 'rgba(237, 232, 227, 0.95)',
          backdropFilter: 'blur(10px)',
        },
      }),
    },
    background: {
      ...styles.background,
    },
    indicator: {
      ...styles.indicator,
      backgroundColor: colors.surface2,
      width: `${tabWidthPercent}%` as `${number}%`,
    },
  }), [colors, isDark, containerWidth, calculatedBottomMargin, borderRadius, tabWidthPercent]);

  return (
    <View style={[styles.safeArea, { paddingBottom: insets.bottom }]}>
      <View style={dynamicStyles.container}>
        <BlurView
          intensity={80}
          style={dynamicStyles.blurContainer}
        >
          <View style={dynamicStyles.background} />
          <Animated.View style={[dynamicStyles.indicator, indicatorStyle]} />
          <View style={styles.tabsContainer}>
            {tabs.map((tab, index) => {
              const isActive = activeTabIndex === index;
              const isEmphasized = tab.emphasized === true;

              const iconSize = isEmphasized ? 28 : 24;
              const iconColor = isActive ? colors.textPrimary : colors.textSecondary;

              return (
                <TouchableOpacity
                  key={`tab-${tab.name}-${index}`}
                  style={styles.tab}
                  onPress={() => handleTabPress(tab.route)}
                  activeOpacity={0.7}
                >
                  <View style={styles.tabContent}>
                    <IconSymbol
                      android_material_icon_name={tab.icon}
                      ios_icon_name={tab.icon}
                      size={iconSize}
                      color={iconColor}
                    />
                    <Text
                      style={[
                        styles.tabLabel,
                        { color: isActive ? colors.textPrimary : colors.textSecondary },
                        isActive && { fontWeight: '600' },
                      ]}
                    >
                      {tab.label}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </BlurView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    alignItems: 'center',
  },
  container: {
    marginHorizontal: 20,
    alignSelf: 'center',
  },
  blurContainer: {
    overflow: 'hidden',
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  indicator: {
    position: 'absolute',
    top: 4,
    left: 2,
    bottom: 4,
    borderRadius: 27,
    width: `${(100 / 2) - 1}%`,
  },
  tabsContainer: {
    flexDirection: 'row',
    height: ComponentSpacing.tabBarHeight,
    alignItems: 'center',
    paddingHorizontal: ComponentSpacing.tabBarPadding,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },
});
