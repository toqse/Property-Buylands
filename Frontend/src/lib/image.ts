type ImageImport = string | { src: string };

export function imageSrc(value: ImageImport): string {
  if (typeof value === "string") return value;
  return value?.src ?? "";
}
