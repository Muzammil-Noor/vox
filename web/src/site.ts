export const LINKS = {
  github: 'https://github.com/Muzammil-Noor/vox',
  journal: 'https://chaotiz.vercel.app/journal/vox',
} as const;

export const JAVA_RESULTS_URL: string =
  import.meta.env.VITE_JAVA_RESULTS_URL ??
  'https://raw.githubusercontent.com/Muzammil-Noor/vox/refs/heads/test-results/latest.json';
