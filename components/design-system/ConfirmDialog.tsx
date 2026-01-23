
import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { Button } from './Button';
import { colors, typography, spacing, containerStyles } from '@/styles/designSystem';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
  icon?: string;
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  destructive = false,
  icon,
}: ConfirmDialogProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <Pressable style={styles.overlay} onPress={onCancel}>
        <Pressable style={styles.dialog} onPress={(e) => e.stopPropagation()}>
          {icon && (
            <View style={[
              styles.iconContainer,
              destructive && styles.iconContainerDestructive,
            ]}>
              <IconSymbol
                ios_icon_name={icon}
                android_material_icon_name={icon}
                size={32}
                color={destructive ? colors.error : colors.primary}
              />
            </View>
          )}
          
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          
          <View style={styles.buttonContainer}>
            <Button
              title={cancelLabel}
              onPress={onCancel}
              variant="secondary"
              style={styles.button}
            />
            <Button
              title={confirmLabel}
              onPress={onConfirm}
              variant={destructive ? 'destructive' : 'primary'}
              style={styles.button}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialog: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    width: '85%',
    maxWidth: 400,
    ...containerStyles.center,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.infoLight,
    ...containerStyles.center,
    marginBottom: spacing.md,
  },
  iconContainerDestructive: {
    backgroundColor: colors.errorLight,
  },
  title: {
    ...typography.titleMedium,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  message: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
  },
  button: {
    flex: 1,
  },
});
