export const auth = {
  login: {
    title: 'Inicia sesión',
    subtitle: 'Accede con tu correo y contraseña para ver tus productos.',
    emailLabel: 'Correo electrónico',
    emailPlaceholder: 'tu@email.com',
    passwordLabel: 'Contraseña',
    passwordPlaceholder: '••••••••',
    submit: 'Entrar',
    submitting: 'Iniciando sesión...',
  },
  errors: {
    invalidToken: 'No se recibió un token válido desde la API.',
    invalidCredentials: 'Correo o contraseña inválidos.',
    loginFailed: 'No se pudo iniciar sesión.',
    generic: 'No se pudieron cargar los productos.',
  },
} as const
