// Tipos en inglés (los consumen las herramientas de changelog y semver).
// Descripción en español, infinitivo, minúscula.
const ERROR = 2 // severidad de commitlint: 0 apagada, 1 aviso, 2 error

const config = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'subject-case': [ERROR, 'always', 'lower-case'],
    'subject-empty': [ERROR, 'never'],
    'subject-full-stop': [ERROR, 'never', '.'],
    'header-max-length': [ERROR, 'always', 72],
    'scope-enum': [
      ERROR,
      'always',
      [
        'equipo',
        'empresa',
        'origenes',
        'vehiculos',
        'leads',
        'cotizaciones',
        'flujos',
        'logistica',
        'repuestos',
        'agenda',
        'chat',
        'notificaciones',
        'actividad',
        'web',
        'buscador',
        'tablero',
        'datos',
        'shared',
        'app',
        'db',
        'ci',
        'deps',
        'config',
        'docs',
      ],
    ],
  },
}

export default config
