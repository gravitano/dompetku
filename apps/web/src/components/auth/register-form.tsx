"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CircleAlertIcon, LoaderCircleIcon } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { useForm, useWatch, type FieldError } from "react-hook-form";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { registerAction } from "~/modules/auth/actions";
import {
  NAME_MAX_LENGTH,
  REGISTER_MESSAGES,
  registerSchema,
  type RegisterField,
  type RegisterFormValues,
  type RegisterInput,
} from "~/modules/auth/schema";

import { PasswordInput } from "./password-input";
import { PasswordRequirements } from "./password-requirements";

const FIELDS: readonly RegisterField[] = [
  "name",
  "email",
  "password",
  "confirmPassword",
];

function isRegisterField(field: string): field is RegisterField {
  return (FIELDS as readonly string[]).includes(field);
}

function ErrorMessage({
  id,
  testId,
  error,
}: {
  id: string;
  testId: string;
  error?: FieldError;
}) {
  if (!error?.message) return null;
  return (
    <p
      id={id}
      data-testid={testId}
      role="alert"
      className="text-sm text-destructive"
    >
      {error.message}
    </p>
  );
}

/** Form registrasi akun (E01-US01). */
export function RegisterForm() {
  const [pending, setPending] = useState(false);
  const [systemError, setSystemError] = useState<string | null>(null);
  // Guard sinkron agar klik ganda cepat tidak mengirim 2 request (AC 9).
  const submittingRef = useRef(false);

  const form = useForm<RegisterFormValues, unknown, RegisterInput>({
    resolver: zodResolver(registerSchema),
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
  });
  const {
    register,
    handleSubmit,
    setError,
    setValue,
    trigger,
    control,
    formState: { errors },
  } = form;

  const password = useWatch({ control, name: "password" });

  function failWithSystemError(message: string) {
    setSystemError(message);
    // AC 6: password dikosongkan hanya saat gagal karena kesalahan sistem.
    setValue("password", "");
    setValue("confirmPassword", "");
  }

  async function onSubmit(values: RegisterInput) {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setPending(true);
    setSystemError(null);

    let result: Awaited<ReturnType<typeof registerAction>> | undefined;
    try {
      result = await registerAction(values);
    } catch {
      // Koneksi terputus / server tidak merespons (AC 10).
      submittingRef.current = false;
      setPending(false);
      failWithSystemError(REGISTER_MESSAGES.systemError);
      return;
    }

    // Berhasil → Server Action melakukan redirect ke Beranda; tetap loading
    // sampai halaman berpindah agar tombol tidak bisa ditekan lagi.
    if (!result || result.success) return;

    submittingRef.current = false;
    setPending(false);

    const { error } = result;
    if (error.code === "CONFLICT") {
      setError(
        "email",
        { type: "conflict", message: REGISTER_MESSAGES.emailTaken },
        { shouldFocus: true },
      );
      return;
    }
    if (error.code === "VALIDATION_ERROR" && error.details?.length) {
      for (const detail of error.details) {
        if (isRegisterField(detail.field)) {
          setError(detail.field, { type: "server", message: detail.message });
        }
      }
      return;
    }
    failWithSystemError(error.message || REGISTER_MESSAGES.systemError);
  }

  const nameField = register("name");
  const emailField = register("email");
  const confirmField = register("confirmPassword");

  return (
    <form
      noValidate
      onSubmit={(event) => {
        if (submittingRef.current) {
          event.preventDefault();
          return;
        }
        void handleSubmit(onSubmit)(event);
      }}
      data-testid="register-form"
      aria-busy={pending}
    >
      <fieldset disabled={pending} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="register-name">Nama</Label>
          <Input
            id="register-name"
            data-testid="register-name-input"
            autoComplete="name"
            autoFocus
            maxLength={NAME_MAX_LENGTH}
            className="h-10"
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? "register-name-error" : undefined}
            {...nameField}
          />
          <ErrorMessage
            id="register-name-error"
            testId="register-name-error"
            error={errors.name}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="register-email">Email</Label>
          <Input
            id="register-email"
            data-testid="register-email-input"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            className="h-10"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "register-email-error" : undefined}
            {...emailField}
            onBlur={(event) => {
              void emailField.onBlur(event);
              if (event.target.value) void trigger("email");
            }}
          />
          {errors.email?.type === "conflict" ? (
            <p
              id="register-email-error"
              data-testid="register-email-error"
              role="alert"
              className="text-sm text-destructive"
            >
              Email sudah terdaftar. Silakan{" "}
              <Link
                href="/login"
                data-testid="register-email-login-link"
                className="font-medium underline underline-offset-4"
              >
                masuk
              </Link>
              .
            </p>
          ) : (
            <ErrorMessage
              id="register-email-error"
              testId="register-email-error"
              error={errors.email}
            />
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="register-password">Password</Label>
          <PasswordInput
            id="register-password"
            data-testid="register-password-input"
            toggleTestId="register-password-toggle"
            autoComplete="new-password"
            aria-invalid={!!errors.password}
            aria-describedby={
              errors.password
                ? "register-password-error register-password-rules"
                : "register-password-rules"
            }
            {...register("password")}
          />
          <PasswordRequirements
            id="register-password-rules"
            password={password}
          />
          <ErrorMessage
            id="register-password-error"
            testId="register-password-error"
            error={errors.password}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="register-password-confirm">Konfirmasi Password</Label>
          <PasswordInput
            id="register-password-confirm"
            data-testid="register-password-confirm-input"
            toggleTestId="register-password-confirm-toggle"
            autoComplete="new-password"
            aria-invalid={!!errors.confirmPassword}
            aria-describedby={
              errors.confirmPassword
                ? "register-password-confirm-error"
                : undefined
            }
            {...confirmField}
            onBlur={(event) => {
              void confirmField.onBlur(event);
              if (event.target.value) void trigger("confirmPassword");
            }}
          />
          <ErrorMessage
            id="register-password-confirm-error"
            testId="register-password-confirm-error"
            error={errors.confirmPassword}
          />
        </div>

        {systemError ? (
          <div
            role="alert"
            data-testid="register-error-banner"
            className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            <CircleAlertIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>{systemError}</span>
          </div>
        ) : null}

        <Button
          type="submit"
          size="lg"
          data-testid="register-submit-button"
          className="h-10 w-full"
          disabled={pending}
        >
          {pending ? (
            <>
              <LoaderCircleIcon className="animate-spin" aria-hidden />
              Mendaftarkan...
            </>
          ) : (
            "Daftar"
          )}
        </Button>
      </fieldset>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Sudah punya akun?{" "}
        <Link
          href="/login"
          data-testid="register-login-link"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Masuk
        </Link>
      </p>
    </form>
  );
}
