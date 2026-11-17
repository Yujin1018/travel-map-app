import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { FillButton } from '@/components/action-button';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { pickBackupFile, saveBackupFile } from '@/lib/backup-file';
import { createBackup, readBackupEnvelope } from '@/lib/itinerary-storage';
import { parseItinerary } from '@/state/parse-itinerary';
import type { Itinerary } from '@/types/itinerary';

export function ItineraryBackup({
  itinerary,
  onReplace,
}: {
  itinerary: Itinerary;
  onReplace: (next: Itinerary) => 'replaced' | 'invalid';
}) {
  const theme = useTheme();
  const [pending, setPending] = useState<Itinerary | null>(null);
  const [message, setMessage] = useState('');
  const [tone, setTone] = useState<'info' | 'danger'>('info');
  const [busy, setBusy] = useState(false);

  async function exportBackup() {
    setBusy(true);
    setPending(null);
    try {
      const result = await saveBackupFile('travel-map-itinerary.json', createBackup(itinerary));
      setTone(result === 'saved' ? 'info' : 'danger');
      setMessage(
        result === 'saved'
          ? '已准备好备份文件。搜索得到的坐标不在里面；手填坐标和示例坐标会保留。'
          : '这台设备暂时不能导出文件。',
      );
    } catch {
      setTone('danger');
      setMessage('导出没有成功。');
    } finally {
      setBusy(false);
    }
  }

  async function chooseImport() {
    setBusy(true);
    try {
      const raw = await pickBackupFile();
      if (!raw) {
        setBusy(false);
        return;
      }
      const envelope = readBackupEnvelope(raw);
      const next = envelope ? parseItinerary(JSON.stringify(envelope)) : null;
      if (!next) {
        setTone('danger');
        setMessage('这个文件不是本应用的行程备份。');
        setPending(null);
        setBusy(false);
        return;
      }
      setPending(next);
      setTone('info');
      setMessage(`备份里有 ${next.days.length} 天。确认后会替换这台设备上现在的行程。`);
    } catch {
      setTone('danger');
      setMessage('读取备份没有成功。');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
      <ThemedText type="smallBold">备份到文件</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        浏览器里的行程不会自动出现在手机上。可以导出一个 JSON 文件，再在另一台设备导入。导入前会再确认一次。
      </ThemedText>
      <View style={styles.actions}>
        <FillButton label="导出备份" tone="secondary" disabled={busy} onPress={() => void exportBackup()} />
        <FillButton label="选择备份文件" tone="secondary" disabled={busy} onPress={() => void chooseImport()} />
      </View>
      {pending ? (
        <View style={styles.actions}>
          <FillButton
            label="确认替换当前行程"
            tone="danger"
            disabled={busy}
            onPress={() => {
              const result = onReplace(pending);
              setPending(null);
              setTone(result === 'replaced' ? 'info' : 'danger');
              setMessage(result === 'replaced' ? '已用备份替换当前行程。' : '这份备份没法使用。');
            }}
          />
          <FillButton label="取消" tone="secondary" disabled={busy} onPress={() => setPending(null)} />
        </View>
      ) : null}
      {message ? (
        <ThemedText type="small" accessibilityLiveRegion="polite" style={{ color: tone === 'danger' ? theme.danger : theme.textSecondary }}>
          {message}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    gap: Spacing.two,
    padding: Spacing.three,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
});
