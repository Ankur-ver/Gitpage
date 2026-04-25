export const LANGUAGE_MAP: Record<string, string> = {
  ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
  py: 'python', rb: 'ruby', go: 'go', rs: 'rust', java: 'java',
  cpp: 'cpp', c: 'c', cs: 'csharp', php: 'php', swift: 'swift',
  kt: 'kotlin', md: 'markdown', json: 'json', yaml: 'yaml', yml: 'yaml',
  html: 'html', css: 'css', scss: 'scss', sh: 'shell', bash: 'shell',
  sql: 'sql', xml: 'xml', toml: 'toml', dockerfile: 'dockerfile',
};

export const getLanguageFromFilename = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  if (filename.toLowerCase() === 'dockerfile') return 'dockerfile';
  return LANGUAGE_MAP[ext] || 'plaintext';
};

export const FILE_ICONS: Record<string, string> = {
  ts: '📘', tsx: '⚛️', js: '📒', jsx: '⚛️', py: '🐍', rb: '💎',
  go: '🐹', rs: '🦀', java: '☕', md: '📝', json: '📦', yaml: '⚙️',
  yml: '⚙️', html: '🌐', css: '🎨', scss: '🎨', sh: '💻', sql: '🗄️',
  dockerfile: '🐳', directory: '📁',
};

export const getFileIcon = (name: string, type: 'file' | 'dir'): string => {
  if (type === 'dir') return FILE_ICONS.directory;
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (name.toLowerCase() === 'dockerfile') return FILE_ICONS.dockerfile;
  return FILE_ICONS[ext] || '📄';
};