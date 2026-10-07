import { FontAwesome6, Ionicons } from '@expo/vector-icons';
import MaskedView from '@react-native-masked-view/masked-view';
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useNavigation } from 'expo-router';
import { type ComponentProps, type ReactNode, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Platform,
  Pressable,
  type PressableProps,
  Switch as RNSwitch,
  Text as RNText,
  StyleSheet,
  TextInput,
  type TextProps,
  View,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import Animated, {
  FadeInUp,
  FadeOutUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PLATFORMS } from '@/platforms';
import { dismissToast, useStore } from '@/lib/store';
import { BRAND, BRAND_END, BRAND_START, type Colors, useColors, useScheme } from '@/lib/theme';
import type { PlatformId, PostStatus } from '@/models';

/* ───────────── Text & icons ───────────── */

// Display variants use Sora; never add font-weight classes to them (iOS would fall back to the system font).
const VARIANTS = {
  hero: 'font-display-heavy text-hero',
  display: 'font-display-heavy text-display',
  title: 'font-display text-title',
  headline: 'font-display-semi text-headline',
  body: 'text-body',
  callout: 'text-callout',
  footnote: 'text-footnote',
  caption: 'text-caption',
  micro: 'text-micro',
};

export type Tone = 'fg' | 'muted' | 'subtle' | 'accent' | 'success' | 'danger' | 'warning' | 'info' | 'inverse' | 'white';

const TEXT_TONE: Record<Tone, string> = {
  fg: 'text-fg',
  muted: 'text-muted',
  subtle: 'text-subtle',
  accent: 'text-accent',
  success: 'text-success',
  danger: 'text-danger',
  warning: 'text-warning',
  info: 'text-info',
  inverse: 'text-bg',
  white: 'text-white',
};

export const toneColor = (c: Colors, tone: Tone) => (tone === 'white' ? '#FFFFFF' : tone === 'inverse' ? c.bg : c[tone]);

export type TextVariant = keyof typeof VARIANTS;

export function Text({
  variant = 'body',
  tone = 'fg',
  className = '',
  ...props
}: TextProps & { variant?: TextVariant; tone?: Tone }) {
  return <RNText className={`${VARIANTS[variant]} ${TEXT_TONE[tone]} ${className}`} {...props} />;
}

export type IconName = ComponentProps<typeof Ionicons>['name'];

export function Icon({ name, size = 20, tone = 'fg', color }: { name: IconName; size?: number; tone?: Tone; color?: string }) {
  const c = useColors();
  return <Ionicons name={name} size={size} color={color ?? toneColor(c, tone)} />;
}

/** The brand gradient as a plain view background. */
export function Gradient({ style, children, horizontal }: { style?: ViewStyle; children?: ReactNode; horizontal?: boolean }) {
  return (
    <LinearGradient colors={BRAND} start={BRAND_START} end={horizontal ? { x: 1, y: 0 } : BRAND_END} style={style}>
      {children}
    </LinearGradient>
  );
}

export function GradientIcon({ name, size = 22 }: { name: IconName; size?: number }) {
  return (
    <MaskedView style={{ width: size, height: size }} maskElement={<Ionicons name={name} size={size} color="#000" />}>
      <Gradient style={{ flex: 1 }} />
    </MaskedView>
  );
}

export function GradientText({
  variant = 'display',
  className = '',
  children,
}: {
  variant?: TextVariant;
  className?: string;
  children: ReactNode;
}) {
  return (
    <MaskedView
      maskElement={
        <Text variant={variant} className={className}>
          {children}
        </Text>
      }>
      <Gradient horizontal>
        <Text variant={variant} className={`${className} opacity-0`}>
          {children}
        </Text>
      </Gradient>
    </MaskedView>
  );
}

/** Aurora light leak behind the top of a screen: orange from the left, pink from the right. */
export function Glow({ height = 420 }: { height?: number }) {
  const dark = useScheme() === 'dark';
  const a = dark ? 1 : 0.55;
  const fill = { position: 'absolute', top: 0, left: 0, right: 0, height } as const;
  return (
    <View pointerEvents="none" style={fill}>
      {/* Both sweeps fade out by 0.6 along an axis that reaches every bottom corner past 0.8: no seam. */}
      <LinearGradient
        colors={[`rgba(255,138,30,${0.24 * a})`, `rgba(255,138,30,${0.07 * a})`, 'rgba(255,138,30,0)']}
        locations={[0, 0.3, 0.6]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={[`rgba(255,45,122,${0.2 * a})`, `rgba(255,45,122,${0.06 * a})`, 'rgba(255,45,122,0)']}
        locations={[0, 0.3, 0.6]}
        start={{ x: 1, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

/**
 * Frosted surface: Liquid Glass on iOS 26+, a blur on older iOS, a solid card elsewhere.
 * Children render on top; give it a borderRadius through `style`.
 */
export function Glass({ style, children }: { style?: ViewStyle; children?: ReactNode }) {
  const dark = useScheme() === 'dark';
  const c = useColors();
  if (Platform.OS === 'ios' && isLiquidGlassAvailable()) {
    return (
      <GlassView style={[{ overflow: 'hidden' }, style]} colorScheme={dark ? 'dark' : 'light'}>
        {children}
      </GlassView>
    );
  }
  return (
    <View style={[{ overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: c.line }, style]}>
      {Platform.OS === 'ios' ? (
        <BlurView tint={dark ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight'} intensity={90} style={StyleSheet.absoluteFill} />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: c.card }]} />
      )}
      {children}
    </View>
  );
}

/* ───────────── Pressables ───────────── */

export type PressProps = PressableProps & { haptic?: boolean };

/** Base for every tappable surface: dims while pressed, optional selection haptic. */
export function Press({ haptic, onPress, className = '', ...props }: PressProps) {
  return (
    <Pressable
      {...props}
      className={`active:scale-[0.97] active:opacity-80 ${className}`}
      onPress={(e) => {
        if (haptic) Haptics.selectionAsync();
        onPress?.(e);
      }}
    />
  );
}

const SIZE = { lg: 'h-[54px] px-6', md: 'h-11 px-5', sm: 'h-9 px-4' };
const BUTTON = {
  primary: { box: '', tone: 'white' },
  secondary: { box: 'bg-fill', tone: 'fg' },
  ghost: { box: '', tone: 'fg' },
  danger: { box: 'bg-danger/10', tone: 'danger' },
  light: { box: 'bg-white', tone: 'fg' },
} as const;

const GLOW: ViewStyle = { shadowColor: BRAND[1], shadowOpacity: 0.4, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } };

export function Button({
  title,
  icon,
  variant = 'primary',
  size = 'lg',
  loading,
  disabled,
  className = '',
  ...props
}: PressProps & { title: string; icon?: IconName; variant?: keyof typeof BUTTON; size?: keyof typeof SIZE; loading?: boolean }) {
  const { box, tone } = BUTTON[variant];
  const primary = variant === 'primary';
  // "light" buttons sit on photos, so their label is always near-black regardless of theme.
  const color = variant === 'light' ? '#0B0B0D' : undefined;
  return (
    <Press
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      disabled={disabled || loading}
      style={primary && !disabled ? GLOW : undefined}
      className={`flex-row items-center justify-center gap-2 rounded-full ${SIZE[size]} ${box} ${disabled ? 'opacity-35' : ''} ${className}`}
      {...props}>
      {primary ? <Gradient horizontal style={{ ...StyleSheet.absoluteFill, borderRadius: 999 }} /> : null}
      {loading ? (
        <ActivityIndicator size="small" color={primary ? '#fff' : undefined} />
      ) : (
        <>
          {icon ? <Icon name={icon} size={size === 'sm' ? 15 : 18} tone={tone} color={color} /> : null}
          <Text
            variant={size === 'sm' ? 'footnote' : 'callout'}
            tone={tone}
            className="font-semibold"
            numberOfLines={1}
            style={color ? { color } : undefined}>
            {title}
          </Text>
        </>
      )}
    </Press>
  );
}

export function IconButton({
  icon,
  label,
  tone = 'fg',
  filled,
  size = 22,
  className = '',
  ...props
}: PressProps & { icon: IconName; label: string; tone?: Tone; filled?: boolean; size?: number }) {
  return (
    <Press
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      className={`h-10 w-10 items-center justify-center rounded-full ${filled ? 'bg-fill' : ''} ${props.disabled ? 'opacity-30' : ''} ${className}`}
      {...props}>
      <Icon name={icon} size={size} tone={tone} />
    </Press>
  );
}

export function Chip({
  label,
  selected,
  count,
  icon,
  dot,
  onPress,
}: {
  label: string;
  selected?: boolean;
  count?: number;
  icon?: IconName;
  /** Tailwind bg class for a small status dot before the label, e.g. "bg-success". */
  dot?: string;
  onPress?: () => void;
}) {
  return (
    <Press
      haptic
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      style={selected ? CHIP_GLOW : undefined}
      className={`h-10 flex-row items-center gap-2 rounded-full pl-4 ${count != null ? 'pr-1.5' : 'pr-4'} ${selected ? '' : 'border border-line bg-card'}`}>
      {selected ? <Gradient horizontal style={{ ...StyleSheet.absoluteFill, borderRadius: 999 }} /> : null}
      {dot && !selected ? <View className={`h-2 w-2 rounded-full ${dot}`} /> : null}
      {icon ? <Icon name={icon} size={15} tone={selected ? 'white' : 'fg'} /> : null}
      <Text variant="footnote" tone={selected ? 'white' : 'fg'} className="font-semibold">
        {label}
      </Text>
      {count != null ? (
        <View className={`h-7 min-w-[28px] items-center justify-center rounded-full px-2 ${selected ? 'bg-white/25' : 'bg-fill'}`}>
          <Text variant="caption" tone={selected ? 'white' : 'muted'} className="font-bold tabular-nums">
            {count}
          </Text>
        </View>
      ) : null}
    </Press>
  );
}

const CHIP_GLOW: ViewStyle = { shadowColor: BRAND[1], shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } };

/** iOS-style segmented control with a sliding thumb. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  const [width, setWidth] = useState(0);
  const index = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  const segment = width / options.length;
  const x = useSharedValue(0);
  const placed = useRef(false);
  useEffect(() => {
    if (!segment) return;
    x.set(placed.current ? withSpring(index * segment, { damping: 22, stiffness: 280 }) : index * segment);
    placed.current = true;
  }, [index, segment, x]);
  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));
  const c = useColors();
  const dark = useScheme() === 'dark';

  return (
    <View className="flex-row rounded-full bg-fill p-[3px]" onLayout={(e) => setWidth(e.nativeEvent.layout.width - 6)}>
      {segment > 0 ? (
        <Animated.View
          style={[
            {
              position: 'absolute',
              top: 3,
              bottom: 3,
              left: 3,
              width: segment,
              borderRadius: 999,
              backgroundColor: dark ? '#34343C' : c.card,
              shadowColor: '#000',
              shadowOpacity: dark ? 0 : 0.08,
              shadowRadius: 4,
              shadowOffset: { width: 0, height: 1 },
            },
            thumb,
          ]}
        />
      ) : null}
      {options.map((o) => (
        <Pressable
          key={o.value}
          accessibilityRole="button"
          accessibilityState={{ selected: o.value === value }}
          onPress={() => {
            if (o.value === value) return;
            Haptics.selectionAsync();
            onChange(o.value);
          }}
          className="h-8 flex-1 items-center justify-center">
          <Text variant="footnote" tone={o.value === value ? 'fg' : 'muted'} className="font-semibold">
            {o.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export function Switch({ onValueChange, ...props }: ComponentProps<typeof RNSwitch>) {
  const c = useColors();
  return (
    <RNSwitch
      trackColor={{ true: BRAND[1], false: c.fill }}
      ios_backgroundColor={c.fill}
      thumbColor="#FFFFFF"
      onValueChange={(v) => {
        Haptics.selectionAsync();
        onValueChange?.(v);
      }}
      {...props}
    />
  );
}

/* ───────────── Identity ───────────── */

const IG_GRADIENT = ['#FEDA75', '#FA7E1E', '#D62976', '#962FBF', '#4F5BD5'] as const;

export function PlatformIcon({ platform, size = 20, radius }: { platform: PlatformId; size?: number; radius?: number }) {
  const p = PLATFORMS[platform];
  const dark = useScheme() === 'dark';
  const box: ViewStyle = {
    width: size,
    height: size,
    borderRadius: radius ?? size / 2,
    alignItems: 'center',
    justifyContent: 'center',
  };
  const glyph = (
    <FontAwesome6
      name={p.glyph.name}
      brand={p.glyph.brand}
      solid={!p.glyph.brand}
      size={Math.round(size * (platform === 'telegram' ? 0.46 : 0.54))}
      color="#FFFFFF"
      style={platform === 'telegram' ? { marginLeft: -size * 0.06, marginTop: size * 0.03 } : undefined}
    />
  );
  if (platform === 'instagram') {
    return (
      <LinearGradient colors={IG_GRADIENT} start={{ x: 0, y: 1 }} end={{ x: 1, y: 0 }} style={box}>
        {glyph}
      </LinearGradient>
    );
  }
  const outlined = dark && p.color === '#000000';
  return (
    <View style={[box, { backgroundColor: p.color }, outlined && { borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)' }]}>
      {glyph}
    </View>
  );
}

const RING = { bg: 'bg-bg', card: 'bg-card', fill: 'bg-fill' };

export function Avatar({
  uri,
  name,
  size = 40,
  platform,
  ring = 'bg',
  glow,
}: {
  uri?: string;
  name: string;
  size?: number;
  platform?: PlatformId;
  ring?: keyof typeof RING;
  /** Brand gradient ring around the photo. */
  glow?: boolean;
}) {
  const initials = name
    .split(/\s+/)
    .map((w) => w.replace(/[^A-Za-z0-9]/g, '')[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <View style={{ width: size, height: size }}>
      {glow ? (
        <Gradient style={{ position: 'absolute', top: -4, left: -4, right: -4, bottom: -4, borderRadius: 999, padding: 2 }}>
          <View className={`flex-1 rounded-full ${RING[ring]}`} />
        </Gradient>
      ) : null}
      <View
        className="items-center justify-center overflow-hidden bg-fill"
        style={{ width: size, height: size, borderRadius: size / 2 }}>
        <RNText className="font-semibold text-muted" style={{ fontSize: size * 0.36 }}>
          {initials}
        </RNText>
        {uri ? <Image source={uri} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} /> : null}
      </View>
      {platform ? (
        <View className={`absolute rounded-full p-[2px] ${RING[ring]}`} style={{ right: -4, bottom: -4 }}>
          <PlatformIcon platform={platform} size={Math.max(14, Math.round(size * 0.4))} />
        </View>
      ) : null}
    </View>
  );
}

export function PlatformStack({
  platforms,
  size = 18,
  ring = 'bg',
}: {
  platforms: PlatformId[];
  size?: number;
  ring?: keyof typeof RING;
}) {
  return (
    <View className="flex-row">
      {platforms.map((p, i) => (
        <View
          key={p}
          className={`rounded-full p-[1.5px] ${RING[ring]}`}
          style={{ marginLeft: i ? -size * 0.32 : 0, zIndex: platforms.length - i }}>
          <PlatformIcon platform={p} size={size} />
        </View>
      ))}
    </View>
  );
}

/* ───────────── Status ───────────── */

export const STATUS: Record<PostStatus, { label: string; tone: Tone; pill: string; dot: string }> = {
  published: { label: 'Live', tone: 'success', pill: 'bg-success/15', dot: 'bg-success' },
  scheduled: { label: 'Scheduled', tone: 'warning', pill: 'bg-warning/15', dot: 'bg-warning' },
  draft: { label: 'Draft', tone: 'muted', pill: 'bg-fill', dot: 'bg-subtle' },
  publishing: { label: 'Publishing', tone: 'info', pill: 'bg-info/15', dot: 'bg-info' },
  failed: { label: 'Failed', tone: 'danger', pill: 'bg-danger/15', dot: 'bg-danger' },
};

export function StatusPill({ status }: { status: PostStatus }) {
  const s = STATUS[status];
  return (
    <View className={`flex-row items-center gap-1.5 rounded-full px-2.5 py-1 ${s.pill}`}>
      {status === 'publishing' ? (
        <Pulse className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      ) : (
        <View className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      )}
      <Text variant="micro" tone={s.tone} className="font-bold uppercase tracking-wide">
        {s.label}
      </Text>
    </View>
  );
}

/** Gently pulsing view for in-progress states and skeletons. */
export function Pulse({ className, style }: { className?: string; style?: ViewStyle }) {
  const o = useSharedValue(1);
  useEffect(() => {
    o.set(withRepeat(withTiming(0.35, { duration: 700 }), -1, true));
  }, [o]);
  const animated = useAnimatedStyle(() => ({ opacity: o.get() }));
  return (
    <Animated.View style={[style, animated]}>
      <View className={className} />
    </Animated.View>
  );
}

/** Brand-gradient progress bar; pass a tone for status-colored bars. */
export function ProgressBar({
  value,
  tone,
  className = '',
}: {
  value: number;
  tone?: 'success' | 'danger' | 'info';
  className?: string;
}) {
  const c = useColors();
  const w = useSharedValue(value);
  useEffect(() => {
    w.set(withTiming(value, { duration: 260 }));
  }, [value, w]);
  const fill = useAnimatedStyle(() => ({ width: `${Math.min(1, Math.max(0, w.get())) * 100}%` }));
  return (
    <View className={`h-1.5 overflow-hidden rounded-full bg-fill ${className}`}>
      <Animated.View
        style={[{ height: '100%', borderRadius: 999, overflow: 'hidden', backgroundColor: tone ? c[tone] : undefined }, fill]}>
        {tone ? null : <Gradient horizontal style={StyleSheet.absoluteFill} />}
      </Animated.View>
    </View>
  );
}

export function Check({ checked }: { checked: boolean }) {
  if (!checked) return <View className="h-6 w-6 rounded-full border-2 border-subtle/50" />;
  return (
    <Animated.View entering={ZoomIn.duration(140)}>
      <Gradient style={{ width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="checkmark" size={15} color="#fff" />
      </Gradient>
    </Animated.View>
  );
}

/* ───────────── Layout ───────────── */

export function Card({ className = '', ...props }: ViewProps) {
  return <View className={`overflow-hidden rounded-[24px] border border-line/70 bg-card ${className}`} {...props} />;
}

export function Section({
  title,
  action,
  onAction,
  children,
  className = '',
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <View className={`mt-9 ${className}`}>
      <View className="mb-3.5 flex-row items-center justify-between px-5">
        <Text variant="title">{title}</Text>
        {action ? (
          <Press onPress={onAction} hitSlop={10} className="flex-row items-center gap-0.5">
            <Text variant="footnote" tone="muted" className="font-semibold">
              {action}
            </Text>
            <Icon name="chevron-forward" size={13} tone="muted" />
          </Press>
        ) : null}
      </View>
      {children}
    </View>
  );
}

/** Settings-style grouped card with an optional caption above and below. */
export function Group({ title, footer, children }: { title?: string; footer?: string; children: ReactNode }) {
  return (
    <View className="mt-7 px-5">
      {title ? (
        <Text variant="caption" tone="subtle" className="mb-2 ml-1 font-bold uppercase tracking-widest">
          {title}
        </Text>
      ) : null}
      <Card>{children}</Card>
      {footer ? (
        <Text variant="caption" tone="muted" className="ml-1 mt-2">
          {footer}
        </Text>
      ) : null}
    </View>
  );
}

export function Row({
  icon,
  title,
  detail,
  right,
  onPress,
  tone = 'fg',
  last,
}: {
  icon?: IconName;
  title: string;
  detail?: string;
  right?: ReactNode;
  onPress?: () => void;
  tone?: 'fg' | 'danger';
  last?: boolean;
}) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} className={`active:bg-fill ${last ? '' : 'border-b border-line'}`}>
      <View className="min-h-[56px] flex-row items-center gap-3 px-4 py-2.5">
        {icon ? (
          <View className={`h-9 w-9 items-center justify-center rounded-xl ${tone === 'danger' ? 'bg-danger/10' : 'bg-fill'}`}>
            <Icon name={icon} size={18} tone={tone} />
          </View>
        ) : null}
        <Text variant="callout" tone={tone} className="flex-1 font-medium">
          {title}
        </Text>
        {detail ? (
          <Text variant="footnote" tone="muted">
            {detail}
          </Text>
        ) : null}
        {right}
        {onPress && !right ? <Icon name="chevron-forward" size={16} tone="subtle" /> : null}
      </View>
    </Pressable>
  );
}

export function LargeHeader({ title, eyebrow, right }: { title: string; eyebrow?: string; right?: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View className="flex-row items-end justify-between gap-3 px-5 pb-2" style={{ paddingTop: insets.top + 16 }}>
      <View className="flex-1">
        {eyebrow ? (
          <Text variant="caption" tone="muted" className="mb-1.5 font-bold uppercase tracking-widest">
            {eyebrow}
          </Text>
        ) : null}
        <Text variant="display" numberOfLines={2}>
          {title}
        </Text>
      </View>
      {right}
    </View>
  );
}

export function NavHeader({
  title,
  left,
  right,
  floating,
}: {
  title?: string;
  left?: ReactNode;
  right?: ReactNode;
  floating?: boolean;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View
      className="flex-row items-center px-3"
      style={[
        { paddingTop: insets.top, height: insets.top + 52 },
        floating && { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
      ]}>
      <View className="min-w-[88px] flex-row">
        {left === undefined ? (
          <IconButton
            icon="chevron-back"
            label="Back"
            onPress={() => router.back()}
            className={floating ? 'bg-black/45' : ''}
            tone={floating ? 'white' : 'fg'}
          />
        ) : (
          left
        )}
      </View>
      <Text variant="headline" numberOfLines={1} className="flex-1 text-center">
        {title}
      </Text>
      <View className="min-w-[88px] flex-row justify-end">{right}</View>
    </View>
  );
}

export function SheetHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <View className="flex-row items-center justify-between gap-3 px-5 pb-4 pt-7">
      <View className="flex-1">
        <Text variant="display">{title}</Text>
        {subtitle ? (
          <Text variant="footnote" tone="muted" className="mt-1">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}

/** Closes the whole composer modal from any screen or sheet inside it. */
export function useCloseComposer() {
  const navigation = useNavigation();
  return () => navigation.getParent()?.goBack();
}

export function useKeyboardVisible() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const ios = Platform.OS === 'ios';
    const show = Keyboard.addListener(ios ? 'keyboardWillShow' : 'keyboardDidShow', () => setVisible(true));
    const hide = Keyboard.addListener(ios ? 'keyboardWillHide' : 'keyboardDidHide', () => setVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return visible;
}

/** Bottom action bar; sits above the home indicator, or right on the keyboard when it's open. */
export function Footer({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardVisible();
  return (
    <View
      className="border-t border-line bg-bg px-5 pt-3"
      style={{ paddingBottom: keyboard ? 10 : Math.max(insets.bottom, 12) + 4 }}>
      {children}
    </View>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
  onAction,
}: {
  icon: IconName;
  title: string;
  body?: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View className="items-center px-10 py-12">
      <View className="mb-5 h-[72px] w-[72px] items-center justify-center rounded-[24px] border border-line bg-card">
        <View className="absolute inset-0 overflow-hidden rounded-[24px] opacity-15">
          <Gradient style={StyleSheet.absoluteFill} />
        </View>
        <GradientIcon name={icon} size={30} />
      </View>
      <Text variant="title" className="text-center">
        {title}
      </Text>
      {body ? (
        <Text variant="footnote" tone="muted" className="mt-2 text-center">
          {body}
        </Text>
      ) : null}
      {action ? <Button title={action} onPress={onAction} size="md" className="mt-6" /> : null}
    </View>
  );
}

/* ───────────── Toast ───────────── */

export function Toaster() {
  const toast = useStore((s) => s.toast);
  const insets = useSafeAreaInsets();
  const c = useColors();
  const dark = useScheme() === 'dark';
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(dismissToast, 3800);
    return () => clearTimeout(t);
  }, [toast]);
  if (!toast) return null;
  const icon: IconName =
    toast.tone === 'success' ? 'checkmark-circle' : toast.tone === 'error' ? 'alert-circle' : 'information-circle';
  const color = toast.tone === 'success' ? c.success : toast.tone === 'error' ? c.danger : BRAND[0];
  return (
    <Animated.View
      key={toast.id}
      entering={FadeInUp.springify().damping(18)}
      exiting={FadeOutUp.duration(160)}
      pointerEvents="box-none"
      style={{ position: 'absolute', left: 16, right: 16, top: insets.top + 6 }}>
      <Pressable
        accessibilityRole="alert"
        onPress={() => {
          dismissToast();
          toast.onPress?.();
        }}
        style={{
          backgroundColor: dark ? '#1E1E23' : '#0B0B0D',
          shadowColor: '#000',
          shadowOpacity: 0.3,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 8 },
        }}
        className="flex-row items-center gap-3 rounded-2xl border border-white/10 py-3.5 pl-3.5 pr-4">
        <Icon name={icon} size={20} color={color} />
        <Text variant="footnote" tone="white" className="flex-1 font-semibold" numberOfLines={2}>
          {toast.message}
        </Text>
        {toast.action ? (
          <Text variant="footnote" className="font-bold" style={{ color: BRAND[0] }}>
            {toast.action}
          </Text>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

/* ───────────── Data & input ───────────── */

/** Bottom padding for scroll content on tab screens, so it clears the floating tab bar. */
export function useTabSpace() {
  return Math.max(useSafeAreaInsets().bottom, 12) + 96;
}

export function SearchField({
  value,
  onChangeText,
  placeholder = 'Search',
  className = '',
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const c = useColors();
  const [focused, setFocused] = useState(false);
  return (
    <View
      className={`h-12 flex-row items-center gap-2.5 rounded-full border bg-card pl-4 pr-1.5 ${focused ? 'border-accent/60' : 'border-line'} ${className}`}>
      {focused || value ? <GradientIcon name="search" size={18} /> : <Icon name="search" size={18} tone="muted" />}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        placeholderTextColor={c.subtle}
        selectionColor={c.accent}
        autoCorrect={false}
        returnKeyType="search"
        className="h-full flex-1 text-[16px] text-fg"
      />
      {value ? (
        <IconButton icon="close-circle" label="Clear search" tone="subtle" size={20} onPress={() => onChangeText('')} className="h-9 w-9" />
      ) : null}
    </View>
  );
}

/** Minimal bar chart: gradient bars, the highlighted one (default: tallest) at full strength, optional labels below. */
export function Bars({
  values,
  labels,
  height = 64,
  highlight = values.indexOf(Math.max(...values)),
}: {
  values: number[];
  labels?: string[];
  height?: number;
  highlight?: number;
}) {
  const max = Math.max(1, ...values);
  return (
    <View>
      <View className="flex-row items-end gap-1.5" style={{ height }}>
        {values.map((v, i) => (
          <View
            key={i}
            className={`flex-1 overflow-hidden rounded-[6px] ${v ? '' : 'bg-fill'}`}
            style={{ height: Math.max(4, (v / max) * height), opacity: v && i !== highlight ? 0.5 : 1 }}>
            {v ? <Gradient style={StyleSheet.absoluteFill} /> : null}
          </View>
        ))}
      </View>
      {labels ? (
        <View className="mt-2 flex-row gap-1.5">
          {labels.map((l, i) => (
            <Text key={i} variant="micro" tone={i === highlight ? 'fg' : 'subtle'} className="flex-1 text-center font-semibold">
              {l}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

/** Horizontal share bar, e.g. reach per platform. */
export function Meter({ value, color }: { value: number; color?: string }) {
  return (
    <View className="h-2 flex-1 overflow-hidden rounded-full bg-fill">
      <View style={{ width: `${Math.min(1, Math.max(0, value)) * 100}%`, height: '100%', borderRadius: 999, backgroundColor: color }}>
        {color ? null : <Gradient horizontal style={{ ...StyleSheet.absoluteFill, borderRadius: 999 }} />}
      </View>
    </View>
  );
}

/** Square-ish metric tile for bento grids. */
export function StatTile({
  icon,
  value,
  label,
  hint,
  className = '',
}: {
  icon: IconName;
  value: string;
  label: string;
  hint?: string;
  className?: string;
}) {
  return (
    <Card className={`flex-1 gap-3 p-4 ${className}`}>
      <View className="h-9 w-9 items-center justify-center rounded-xl bg-fill">
        <GradientIcon name={icon} size={18} />
      </View>
      <View>
        <Text variant="display" numberOfLines={1}>
          {value}
        </Text>
        <Text variant="caption" tone="muted" className="mt-0.5 font-semibold" numberOfLines={1}>
          {label}
        </Text>
        {hint ? (
          <Text variant="micro" tone="subtle" className="mt-1" numberOfLines={1}>
            {hint}
          </Text>
        ) : null}
      </View>
    </Card>
  );
}
