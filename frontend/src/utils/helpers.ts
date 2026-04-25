export const formatBytes = (bytes: number, decimals = 2): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

export const formatNumber = (n: number): string => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'k';
  return n.toString();
};

export const truncate = (str: string, len: number): string =>
  str.length > len ? str.slice(0, len) + '...' : str;

export const getLanguageColor = (lang: string): string => {
  const map: Record<string, string> = {
    TypeScript: '#3178c6', JavaScript: '#f7df1e', Python: '#3572A5',
    Rust: '#dea584', Go: '#00ADD8', Java: '#b07219', 'C++': '#f34b7d',
    C: '#555555', Ruby: '#701516', Swift: '#ffac45', Kotlin: '#A97BFF',
    PHP: '#4F5D95', CSS: '#563d7c', HTML: '#e34c26', Shell: '#89e051',
    Vue: '#41b883', React: '#61dafb', Dart: '#00B4AB',
  };
  return map[lang] || '#8888aa';
};

export const generateContributions = (weeks = 52) =>
  Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => ({
      level: w === 0 && d < 3 ? 0 : Math.floor(Math.random() * 5),
      date: new Date(Date.now() - (weeks - w) * 7 * 86400000 + d * 86400000),
    }))
  );

export const debounce = <T extends (...args: any[]) => any>(
  fn: T, delay: number
): ((...args: Parameters<T>) => void) => {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};

export const classNames = (...classes: (string | undefined | null | false)[]): string =>
  classes.filter(Boolean).join(' ');