// Load .env for standalone scripts (Next.js loads it for the app itself).
try {
  process.loadEnvFile(".env");
} catch {
  /* no .env file: rely on the real environment */
}
