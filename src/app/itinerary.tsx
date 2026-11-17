import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { FillButton } from '@/components/action-button';
import { AutoPlan } from '@/components/auto-plan';
import { ItineraryBackup } from '@/components/itinerary-backup';
import { DaySwitcher } from '@/components/day-switcher';
import { PlaceSearch } from '@/components/place-search';
import { PostImport } from '@/components/post-import';
import { Screen } from '@/components/screen';
import { StopList } from '@/components/stop-list';
import { ThemedText } from '@/components/themed-text';
import { WishlistList } from '@/components/wishlist-list';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { averageCoordinate, uniquePlaces } from '@/lib/places';
import { useItinerary } from '@/state/itinerary-context';
import type { DayPlan } from '@/types/itinerary';

function parseCoordinate(value: string): number | null {
  const cleaned = value.trim().replace(/，/g, '.').replace(/。/g, '.').replace(/\s/g, '');
  if (!/^[-+]?\d+(\.\d+)?$/.test(cleaned)) {
    return null;
  }
  const number = Number(cleaned);
  return Number.isFinite(number) ? number : null;
}

export default function ItineraryScreen() {
  const theme = useTheme();
  const {
    activeDay,
    itinerary,
    wishlist,
    ready,
    selectDay,
    addDay,
    removeDay,
    renameDay,
    addToWishlist,
    addToDay,
    addManyToWishlist,
    addManyToDay,
    removeStop,
    moveStop,
    moveStopToDay,
    moveStopToWishlist,
    removeWishlistPlace,
    moveWishlistToDay,
    applyPlan,
    replaceItinerary,
    resetToSample,
  } = useItinerary();
  const [name, setName] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [manualMessage, setManualMessage] = useState('');
  const [manualTone, setManualTone] = useState<'info' | 'danger'>('danger');
  const [dayMessage, setDayMessage] = useState('');
  const [editMessage, setEditMessage] = useState('');
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    setConfirmRemove(false);
    setEditMessage('');
  }, [activeDay?.id]);

  const planningPlaces = useMemo(
    () => uniquePlaces([...(itinerary?.wishlist ?? []), ...(itinerary?.days.flatMap((day) => day.stops) ?? [])]),
    [itinerary],
  );
  const proximity = useMemo(() => averageCoordinate(planningPlaces), [planningPlaces]);

  function handleAddDay() {
    const result = addDay();
    setDayMessage(result === 'too-many' ? '最多添加到 14 天。' : '');
    setConfirmRemove(false);
  }

  function handleRemoveDay() {
    if (!activeDay) {
      return;
    }
    const result = removeDay(activeDay.id);
    if (result === 'last-day') {
      setDayMessage('至少保留一天。');
      return;
    }
    setDayMessage(result === 'removed' ? '这一天已删除，里面的地点回到了想去列表。' : '');
    setConfirmRemove(false);
  }

  function handleManualAdd(destination: 'wishlist' | 'day') {
    if (!activeDay) {
      return;
    }
    const trimmedName = name.trim();
    const parsedLatitude = parseCoordinate(latitude);
    const parsedLongitude = parseCoordinate(longitude);
    if (!trimmedName) {
      setManualTone('danger');
      setManualMessage('请填写地点名称。');
      return;
    }
    if (parsedLatitude === null || parsedLatitude < -90 || parsedLatitude > 90) {
      setManualTone('danger');
      setManualMessage('纬度要写成数字，范围是 -90 到 90。');
      return;
    }
    if (parsedLongitude === null || parsedLongitude < -180 || parsedLongitude > 180) {
      setManualTone('danger');
      setManualMessage('经度要写成数字，范围是 -180 到 180。');
      return;
    }
    const draft = { name: trimmedName, latitude: parsedLatitude, longitude: parsedLongitude };
    const result = destination === 'wishlist' ? addToWishlist(draft) : addToDay(activeDay.id, draft);
    if (result === 'duplicate') {
      setManualTone('danger');
      setManualMessage(`「${trimmedName}」已经在行程或想去列表里。`);
      return;
    }
    if (result !== 'added') {
      setManualTone('danger');
      setManualMessage('没有加进去，请检查名称和坐标。');
      return;
    }
    setName('');
    setLatitude('');
    setLongitude('');
    setManualTone('info');
    setManualMessage(destination === 'wishlist' ? `已把${trimmedName}加入想去的地点。` : `已把${trimmedName}加到${activeDay.dateLabel}。`);
  }

  return (
    <Screen scroll>
      <View style={styles.header}>
        <ThemedText type="subtitle" style={styles.title}>
          行程
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          先收集想去的地点，再按远近分成几天。也可以直接加到当前这一天。地图跟着选中的那一天更新。
        </ThemedText>
      </View>

      {!ready || !activeDay || !itinerary ? (
        <ThemedText type="small" themeColor="textSecondary">
          正在读取行程…
        </ThemedText>
      ) : (
        <>
          <View style={styles.header}>
            <ThemedText type="smallBold">
              {itinerary.title} · {activeDay.stops.length} 个地点
            </ThemedText>
            <DaySwitcher days={itinerary.days} activeDayId={activeDay.id} onSelect={selectDay} onAdd={handleAddDay} />
            {dayMessage ? (
              <ThemedText type="small" themeColor="textSecondary">
                {dayMessage}
              </ThemedText>
            ) : null}
          </View>

          <DayTitleField day={activeDay} onRename={(title) => renameDay(activeDay.id, title)} />

          <StopList
            day={activeDay}
            otherDays={itinerary.days
              .filter((day) => day.id !== activeDay.id)
              .map((day) => ({ id: day.id, dateLabel: day.dateLabel }))}
            emptyHint="可以在下面搜索、从帖子导入，或把想去的地点加到这一天。"
            onMove={(stopId, direction) => {
              setEditMessage('');
              moveStop(activeDay.id, stopId, direction);
            }}
            onRemove={(stopId) => {
              setEditMessage('');
              removeStop(activeDay.id, stopId);
            }}
            onMoveToDay={(stopId, dayId) => {
              const result = moveStopToDay(activeDay.id, stopId, dayId);
              setEditMessage(result === 'duplicate' ? '那一天已经有这个地点。' : '');
            }}
            onMoveToWishlist={(stopId) => {
              const result = moveStopToWishlist(activeDay.id, stopId);
              setEditMessage(result === 'duplicate' ? '想去列表里已经有这个地点，所以没有移走。' : '');
            }}
            proximity={proximity}
            onAttachSession={(place) => addToDay(activeDay.id, place)}
          />
          {editMessage ? (
            <ThemedText type="small" style={{ color: theme.danger }}>
              {editMessage}
            </ThemedText>
          ) : null}

          {confirmRemove ? (
            <View style={[styles.form, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="smallBold">删除{activeDay.dateLabel}？</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {activeDay.stops.length > 0
                  ? '这一天的地点会回到想去列表，不会直接丢掉。'
                  : '这一天是空的，删除后不能恢复这个标题。'}
              </ThemedText>
              <View style={styles.confirmRow}>
                <FillButton label="取消" tone="secondary" onPress={() => setConfirmRemove(false)} />
                <FillButton label="确认删除" tone="danger" onPress={handleRemoveDay} />
              </View>
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                if (itinerary.days.length <= 1) {
                  setDayMessage('至少保留一天。');
                  return;
                }
                setConfirmRemove(true);
              }}
              style={styles.reset}>
              <ThemedText type="smallBold" style={{ color: theme.danger }}>
                删除这一天
              </ThemedText>
            </Pressable>
          )}

          <PlaceSearch
            dayLabel={activeDay.dateLabel}
            proximity={proximity}
            onAddToWishlist={addToWishlist}
            onAddToDay={(place) => addToDay(activeDay.id, place)}
          />
          <PostImport
            dayLabel={activeDay.dateLabel}
            proximity={proximity}
            onAddToWishlist={addManyToWishlist}
            onAddToDay={(places) => addManyToDay(activeDay.id, places)}
          />
          <WishlistList
            places={wishlist}
            days={itinerary.days.map((day) => ({ id: day.id, dateLabel: day.dateLabel }))}
            onMoveToDay={moveWishlistToDay}
            onRemove={removeWishlistPlace}
            proximity={proximity}
            onAttachSession={addToWishlist}
          />
          <AutoPlan places={planningPlaces} onApply={applyPlan} />
          <ItineraryBackup itinerary={itinerary} onReplace={replaceItinerary} />

          <View style={[styles.form, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="smallBold">手动填写坐标</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              搜索没有结果，或还没配置令牌时，可以直接填写名称和经纬度。手填的坐标会保存在这台设备上。
            </ThemedText>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="名称，例如 浅草寺"
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
            />
            <TextInput
              value={latitude}
              onChangeText={setLatitude}
              placeholder="纬度，例如 35.7148"
              placeholderTextColor={theme.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="numbers-and-punctuation"
              style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
            />
            <TextInput
              value={longitude}
              onChangeText={setLongitude}
              placeholder="经度，例如 139.7967"
              placeholderTextColor={theme.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="numbers-and-punctuation"
              style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
            />
            {manualMessage ? (
              <ThemedText type="small" style={{ color: manualTone === 'danger' ? theme.danger : theme.text }}>
                {manualMessage}
              </ThemedText>
            ) : null}
            <View style={styles.confirmRow}>
              <FillButton label="加入想去" onPress={() => handleManualAdd('wishlist')} />
              <FillButton label="加到当天" tone="secondary" onPress={() => handleManualAdd('day')} />
            </View>
          </View>

          {confirmReset ? (
            <View style={[styles.form, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="smallBold">恢复示例行程？</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                现在的每一天和想去列表会被示例替换。示例是京都的三个地点。
              </ThemedText>
              <View style={styles.confirmRow}>
                <FillButton label="取消" tone="secondary" onPress={() => setConfirmReset(false)} />
                <FillButton
                  label="确认恢复"
                  tone="danger"
                  onPress={() => {
                    resetToSample();
                    setConfirmReset(false);
                    setDayMessage('');
                    setEditMessage('');
                  }}
                />
              </View>
            </View>
          ) : (
            <Pressable accessibilityRole="button" onPress={() => setConfirmReset(true)} style={styles.reset}>
              <ThemedText type="smallBold" style={{ color: theme.danger }}>
                恢复示例行程
              </ThemedText>
            </Pressable>
          )}
          <ThemedText type="small" themeColor="textSecondary">
            行程保存在这台设备上。没有保存过时才会看到示例。已经改过的内容不会被示例盖掉。
          </ThemedText>
        </>
      )}
    </Screen>
  );
}

function DayTitleField({ day, onRename }: { day: DayPlan; onRename: (title: string) => void }) {
  const theme = useTheme();
  const [value, setValue] = useState(day.title);

  useEffect(() => {
    setValue(day.title);
  }, [day.id, day.title]);

  return (
    <View style={styles.header}>
      <ThemedText type="small" themeColor="textSecondary">
        {day.dateLabel}的名称
      </ThemedText>
      <TextInput
        value={value}
        onChangeText={setValue}
        onBlur={() => onRename(value)}
        onSubmitEditing={() => onRename(value)}
        placeholder="例如 京都东边"
        placeholderTextColor={theme.textSecondary}
        style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected, backgroundColor: theme.backgroundElement }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: Spacing.one,
  },
  title: {
    fontSize: 32,
    lineHeight: 40,
  },
  form: {
    borderRadius: 16,
    gap: Spacing.two,
    padding: Spacing.three,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  reset: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
});
