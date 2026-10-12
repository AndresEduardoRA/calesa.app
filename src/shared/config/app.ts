// Identidad por defecto del despliegue, hasta que la empresa cargue la suya en
// Configuración › Empresa. Producto white-label: acá no va ninguna marca real.

// Mismo valor que el default de `ajustes_empresa.nombre`.
export const NOMBRE_POR_DEFECTO = 'Mi importadora'

export const DESCRIPCION_APP =
  'Sistema interno de la importadora: equipo, inventario, leads y logística.'

// El manifest, la barra del navegador y el cálculo de la marca no leen variables CSS: estos
// valores son copia de design/tokens.css (un test los compara): `--color-primario`,
// `--color-paper` en claro y en oscuro, `--color-ink` en claro y `--color-surface` en oscuro.
export const COLOR_TEMA = '#3b5bdb'
export const COLOR_FONDO_CLARO = '#f6f7f9'
export const COLOR_FONDO_OSCURO = '#12161f'
export const COLOR_TINTA = '#1b2130'
export const COLOR_SUPERFICIE_OSCURA = '#1d2330'
