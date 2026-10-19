// A local file ({ uri }) as base64 (no "data:" prefix), e.g. to send a photo
// to the AI. Resolves to null when it can't be read.
export const fileToBase64 = async file => {
  try {
    const uri = file.uri.startsWith('/') ? `file://${file.uri}` : file.uri;
    const blob = await (await fetch(uri)).blob();
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('unreadable'));
      reader.readAsDataURL(blob);
    });
    return String(dataUrl).split(';base64,')[1] || null;
  } catch {
    return null;
  }
};
