export const AVATAR_SIZE = 256;

export class NotImageError extends Error {}

export function isImageFile(file: File): boolean {
  return file.type.startsWith("image/");
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("decode failed"));
    img.src = url;
  });
}

/** 가운데를 정사각형으로 잘라 256x256 JPEG 데이터 URL 로 만든다. */
export async function fileToAvatar(file: File): Promise<string> {
  if (!isImageFile(file)) throw new NotImageError("not an image");
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const sx = (img.naturalWidth - side) / 2;
    const sy = (img.naturalHeight - side) / 2;
    const canvas = document.createElement("canvas");
    canvas.width = AVATAR_SIZE;
    canvas.height = AVATAR_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no canvas");
    ctx.fillStyle = "#1a1919";
    ctx.fillRect(0, 0, AVATAR_SIZE, AVATAR_SIZE);
    ctx.drawImage(img, sx, sy, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
    return canvas.toDataURL("image/jpeg", 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}
