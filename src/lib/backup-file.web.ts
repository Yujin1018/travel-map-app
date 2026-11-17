type DownloadLink = {
  href: string;
  download: string;
  click: () => void;
};

type FileInput = {
  type: string;
  accept: string;
  files: FileList | null;
  onchange: (() => void) | null;
  click: () => void;
};

export async function saveBackupFile(filename: string, contents: string): Promise<'saved' | 'unavailable'> {
  const documentRef = globalThis.document;
  const urlApi = globalThis.URL;
  if (!documentRef || !urlApi) {
    return 'unavailable';
  }
  const blob = new Blob([contents], { type: 'application/json' });
  const url = urlApi.createObjectURL(blob);
  const anchor = documentRef.createElement('a') as DownloadLink;
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  urlApi.revokeObjectURL(url);
  return 'saved';
}

export function pickBackupFile(): Promise<string | null> {
  const documentRef = globalThis.document;
  if (!documentRef) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    const input = documentRef.createElement('input') as FileInput;
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsText(file);
    };
    input.click();
  });
}
