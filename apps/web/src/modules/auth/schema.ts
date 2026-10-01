/**
 * Schema validasi registrasi (E01-US01) & login (E01-US02). Isomorfik: dipakai form client
 * (`~/components/auth/register-form.tsx`) dan Server Action (`./actions.ts`).
 */
import { z } from "zod";

export const NAME_MAX_LENGTH = 50;
export const PASSWORD_MIN_LENGTH = 8;
/** Sama dengan `emailAndPassword.maxPasswordLength` di `~/lib/auth`. */
export const PASSWORD_MAX_LENGTH = 128;

export const REGISTER_MESSAGES = {
  nameRequired: "Nama wajib diisi",
  nameTooLong: `Nama maksimal ${NAME_MAX_LENGTH} karakter`,
  emailRequired: "Email wajib diisi",
  emailInvalid: "Format email tidak valid",
  passwordRequired: "Password wajib diisi",
  passwordWeak: "Password belum memenuhi syarat",
  confirmRequired: "Konfirmasi password wajib diisi",
  confirmMismatch: "Konfirmasi password tidak sama",
  emailTaken: "Email sudah terdaftar. Silakan masuk.",
  systemError: "Gagal mendaftar. Periksa koneksi lalu coba lagi.",
  rateLimited: "Terlalu banyak percobaan. Coba lagi dalam 1 menit.",
} as const;

export type PasswordRuleKey = "length" | "mix";

/** Syarat password yang ditampilkan sebagai checklist di bawah field. */
export const PASSWORD_RULES: ReadonlyArray<{
  key: PasswordRuleKey;
  label: string;
  test: (password: string) => boolean;
}> = [
  {
    key: "length",
    label: `Minimal ${PASSWORD_MIN_LENGTH} karakter`,
    test: (password) => password.length >= PASSWORD_MIN_LENGTH,
  },
  {
    key: "mix",
    label: "Mengandung huruf dan angka",
    test: (password) => /\p{L}/u.test(password) && /\d/.test(password),
  },
];

export function isPasswordValid(password: string): boolean {
  return (
    password.length <= PASSWORD_MAX_LENGTH &&
    PASSWORD_RULES.every((rule) => rule.test(password))
  );
}

const registerFields = z.object({
  name: z
    .string()
    .trim()
    .min(1, REGISTER_MESSAGES.nameRequired)
    .max(NAME_MAX_LENGTH, REGISTER_MESSAGES.nameTooLong),
  email: z
    .string()
    .trim()
    .min(1, REGISTER_MESSAGES.emailRequired)
    .pipe(z.email(REGISTER_MESSAGES.emailInvalid))
    .transform((email) => email.toLowerCase()),
  password: z
    .string()
    .min(1, { message: REGISTER_MESSAGES.passwordRequired, abort: true })
    .refine(isPasswordValid, REGISTER_MESSAGES.passwordWeak),
  confirmPassword: z.string().min(1, REGISTER_MESSAGES.confirmRequired),
});

const passwordPair = registerFields.pick({
  password: true,
  confirmPassword: true,
});

export const registerSchema = registerFields.refine(
  (data) => data.password === data.confirmPassword,
  {
    path: ["confirmPassword"],
    message: REGISTER_MESSAGES.confirmMismatch,
    // Tetap cek kecocokan walau field lain (mis. nama) belum valid.
    when: (payload) => passwordPair.safeParse(payload.value).success,
  },
);

/** Nilai form (sebelum transform). */
export type RegisterFormValues = z.input<typeof registerSchema>;
/** Data tervalidasi (nama di-trim, email lowercase). */
export type RegisterInput = z.output<typeof registerSchema>;

export type RegisterField = keyof RegisterFormValues;

// --- Login (E01-US02) --------------------------------------------------------

export const LOGIN_MESSAGES = {
  emailRequired: REGISTER_MESSAGES.emailRequired,
  emailInvalid: REGISTER_MESSAGES.emailInvalid,
  passwordRequired: REGISTER_MESSAGES.passwordRequired,
  /** Generik: tidak membocorkan apakah email terdaftar (AC 3). */
  invalidCredentials: "Email atau password salah",
  /** Penguncian 5x gagal / 15 menit per email (AC 4). */
  locked: "Terlalu banyak percobaan. Coba lagi dalam 15 menit.",
  /** Rate limit per IP pada Server Action (production). */
  rateLimited: "Terlalu banyak percobaan. Coba lagi dalam 1 menit.",
  systemError: "Gagal masuk. Periksa koneksi lalu coba lagi.",
  loggedOut: "Anda telah keluar",
  registered: "Akun berhasil dibuat. Silakan masuk.",
  logoutFailed: "Gagal keluar. Periksa koneksi lalu coba lagi.",
} as const;

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, LOGIN_MESSAGES.emailRequired)
    .pipe(z.email(LOGIN_MESSAGES.emailInvalid))
    .transform((email) => email.toLowerCase()),
  // Tidak memvalidasi aturan password di login agar tidak membocorkan info.
  password: z.string().min(1, LOGIN_MESSAGES.passwordRequired),
});

/** Nilai form login (sebelum transform). */
export type LoginFormValues = z.input<typeof loginSchema>;
/** Data login tervalidasi (email lowercase). */
export type LoginInput = z.output<typeof loginSchema>;
export type LoginField = keyof LoginFormValues;
