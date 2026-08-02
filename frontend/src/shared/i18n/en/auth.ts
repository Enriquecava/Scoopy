export const auth = {
  login: {
    title: 'Sign in',
    subtitle: 'Use your email and password to view your products.',
    emailLabel: 'Email address',
    emailPlaceholder: 'you@email.com',
    passwordLabel: 'Password',
    passwordPlaceholder: '••••••••',
    submit: 'Sign in',
    submitting: 'Signing in...',
  },
  errors: {
    invalidToken: 'No valid token was received from the API.',
    invalidCredentials: 'Invalid email or password.',
    loginFailed: 'Could not sign in.',
    generic: 'The products could not be loaded.',
  },
} as const
