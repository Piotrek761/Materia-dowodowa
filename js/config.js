// ============================================
// KONFIGURACJA PROJEKTU
// ============================================
// Token GitHub NIE jest przechowywany tutaj — jest ustawiony
// jako zmienna środowiskowa GITHUB_TOKEN w Vercel.
//
// Wymagane zmienne env w Vercel:
//   GITHUB_TOKEN  — Personal Access Token (classic) z zakresem 'public_repo'
//   GITHUB_REPO   — np. 'username/nazwa-repo'
// ============================================

var FORUM_CONFIG = {
    // Nazwa repozytorium (używana tylko jako fallback — główna wartość w Vercel env)
    repo: 'OWNER/REPO',

    // Ścieżka do pliku z tematami forum
    filePath: 'forum/topics.json',

    // Gałąź
    branch: 'main'
};
