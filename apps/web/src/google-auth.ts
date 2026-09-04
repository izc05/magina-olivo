type SocialSignInResponse = {
  url?: string;
  redirect?: boolean;
  message?: string;
  error?: { message?: string };
};

export type GoogleSignInOptions = {
  callbackURL?: string;
  newUserCallbackURL?: string;
};

export async function startGoogleSignIn(options: GoogleSignInOptions = {}): Promise<void> {
  const response = await fetch('/api/auth/sign-in/social', {
    method: 'POST',
    credentials: 'include',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      provider: 'google',
      callbackURL: options.callbackURL ?? '/',
      newUserCallbackURL: options.newUserCallbackURL ?? '/onboarding',
      errorCallbackURL: '/?auth=google_error',
      disableRedirect: true,
    }),
  });

  let body: SocialSignInResponse | null = null;
  try {
    body = (await response.json()) as SocialSignInResponse;
  } catch {
    // Keep the generic message when a proxy/provider returns non-JSON.
  }

  if (!response.ok) {
    throw new Error(
      body?.error?.message ??
        body?.message ??
        'El acceso con Google no está disponible en este momento.',
    );
  }

  if (!body?.url) {
    throw new Error('Google no ha devuelto una dirección de acceso válida.');
  }

  window.location.assign(body.url);
}
