"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircleIcon } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { useForm, type FieldError } from "react-hook-form";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { loginAction } from "~/modules/auth/actions";
import {
  LOGIN_MESSAGES,
  loginSchema,
  type LoginField,
  type LoginFormValues,
  type LoginInput,
} from "~/modules/auth/schema";

import { AuthAlert, type AuthAlertVariant } from "./auth-alert";
import { PasswordInput } from "./password-input";

export type LoginNotice = "logout" | "registered";

type LoginFormProps = {
  /** Path tujuan setelah login (sudah disanitasi di server). */
  callbackUrl: string;
  /** Banner awal dari query `?logout=1` / `?registered=1`. */
  notice?: LoginNotice | null;
};

type Alert = { variant: AuthAlertVariant; message: string };

const NOTICES: Record<LoginNotice, Alert> = {
  logout: { variant: "success", message: LOGIN_MESSAGES.loggedOut },
  registered: { variant: "success", message: LOGIN_MESSAGES.registered },
};

function isLoginField(field: string): field is LoginField {
  return field === "email" || field === "password";
}

function ErrorMessage({ id, error }: { id: string; error?: FieldError }) {
  if (!error?.message) return null;
  return (
    <p
      id={id}
      data-testid={id}
      role="alert"
      className="text-sm text-destructive"
    >
      {error.message}
    </p>
  );
}

/** Form login (E01-US02, UX-01…UX-05). */
export function LoginForm({ callbackUrl, notice }: LoginFormProps) {
  const [pending, setPending] = useState(false);
  const [alert, setAlert] = useState<Alert | null>(
    notice ? NOTICES[notice] : null,
  );
  // Guard sinkron agar klik ganda cepat tidak mengirim 2 request (AC 12).
  const submittingRef = useRef(false);

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    setFocus,
    formState: { errors },
  } = useForm<LoginFormValues, unknown, LoginInput>({
    resolver: zodResolver(loginSchema),
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: { email: "", password: "" },
  });

  function failWith(message: string) {
    setAlert({ variant: "error", message });
    // AC 5: email tetap, password dikosongkan.
    setValue("password", "");
    setFocus("password");
  }

  async function onSubmit(values: LoginInput) {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setPending(true);
    setAlert(null);

    let result: Awaited<ReturnType<typeof loginAction>> | undefined;
    try {
      result = await loginAction({ ...values, callbackUrl });
    } catch {
      // Koneksi terputus / server tidak merespons (AC 12).
      submittingRef.current = false;
      setPending(false);
      failWith(LOGIN_MESSAGES.systemError);
      return;
    }

    // Berhasil → Server Action me-redirect; tetap loading sampai pindah halaman.
    if (!result || result.success) return;

    submittingRef.current = false;
    setPending(false);

    const { error } = result;
    if (error.code === "VALIDATION_ERROR" && error.details?.length) {
      for (const detail of error.details) {
        if (isLoginField(detail.field)) {
          setError(detail.field, { type: "server", message: detail.message });
        }
      }
      return;
    }
    failWith(error.message || LOGIN_MESSAGES.systemError);
  }

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
      data-testid="login-form"
      aria-busy={pending}
    >
      <fieldset disabled={pending} className="flex flex-col gap-4">
        {alert ? (
          <AuthAlert variant={alert.variant} message={alert.message} />
        ) : null}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="login-email">Email</Label>
          <Input
            id="login-email"
            data-testid="login-email-input"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            autoFocus
            className="h-10"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "login-email-error" : undefined}
            {...register("email")}
          />
          <ErrorMessage id="login-email-error" error={errors.email} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="login-password">Password</Label>
          <PasswordInput
            id="login-password"
            data-testid="login-password-input"
            toggleTestId="login-password-toggle"
            autoComplete="current-password"
            aria-invalid={!!errors.password}
            aria-describedby={
              errors.password ? "login-password-error" : undefined
            }
            {...register("password")}
          />
          <ErrorMessage id="login-password-error" error={errors.password} />
        </div>

        <Button
          type="submit"
          size="lg"
          data-testid="login-submit-button"
          className="h-10 w-full"
          disabled={pending}
        >
          {pending ? (
            <>
              <LoaderCircleIcon className="animate-spin" aria-hidden />
              Masuk...
            </>
          ) : (
            "Masuk"
          )}
        </Button>
      </fieldset>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Belum punya akun?{" "}
        <Link
          href="/register"
          data-testid="login-register-link"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Daftar
        </Link>
      </p>
    </form>
  );
}
