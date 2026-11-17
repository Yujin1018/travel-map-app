import * as DocumentPicker from 'expo-document-picker';
import { cacheDirectory, readAsStringAsync, writeAsStringAsync } from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

export async function saveBackupFile(filename: string, contents: string): Promise<'saved' | 'unavailable'> {
  if (!cacheDirectory) {
    return 'unavailable';
  }
  const uri = `${cacheDirectory}${filename}`;
  await writeAsStringAsync(uri, contents);
  const available = await Sharing.isAvailableAsync();
  if (!available) {
    return 'unavailable';
  }
  await Sharing.shareAsync(uri, {
    mimeType: 'application/json',
    UTI: 'public.json',
    dialogTitle: '导出行程备份',
  });
  return 'saved';
}

export async function pickBackupFile(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/json',
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled || !result.assets[0]) {
    return null;
  }
  return readAsStringAsync(result.assets[0].uri);
}
