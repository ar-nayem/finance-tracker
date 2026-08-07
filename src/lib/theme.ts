import { cookies } from "next/headers";

export type Theme = "light" | "dark";

const THEME_COOKIE = "theme";

// No cookie yet means dark — preserves the app's original look for
// everyone already using it; light is the opt-in addition.
export async function getTheme(): Promise<Theme> {
  const cookieStore = await cookies();
  return cookieStore.get(THEME_COOKIE)?.value === "light" ? "light" : "dark";
}
