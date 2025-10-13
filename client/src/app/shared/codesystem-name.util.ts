// Centralized mapping and helper for codesystem display names

// Mapping table for codesystem names to user-friendly labels
export const codesystemNameMap: Record<string, string> = {
  '300': 'Vista 300/S',
};

// Return mapped display name if available, otherwise the original value
export function getCodesystemDisplayName(name: string | number | null | undefined): string {
  if (name === null || name === undefined) return '';
  const key = String(name);
  return codesystemNameMap[key] ?? key;
}
