export const LINKS = {
  github: 'https://github.com/Muzammil-Noor/vox',
  journal: 'https://chaotiz.vercel.app/journal/vox',
} as const;

// Java engine results, written by .github/workflows/tests.yml after every run
// on main. It lives on its own branch so publishing never touches main and
// never asks anyone to pull.
export const JAVA_RESULTS_URL: string =
  import.meta.env.VITE_JAVA_RESULTS_URL ??
  'https://raw.githubusercontent.com/Muzammil-Noor/vox/test-results/latest.json';
