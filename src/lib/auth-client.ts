"use client";

import { createAuthClient } from "better-auth/react";

/**
 * Client better-auth untuk komponen client (form login/registrasi, logout).
 * baseURL tidak di-set: otomatis memakai origin yang sama.
 */
export const authClient = createAuthClient();

export const { signIn, signUp, signOut, useSession } = authClient;
