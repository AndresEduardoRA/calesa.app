// El catálogo CERRADO de iconos que una empresa elige para un origen del lead, un tipo de lead y un tipo de seguimiento. Se guarda la
// CLAVE (nunca un nombre libre ni un SVG): una base con una clave que el código no conoce se dibuja con el icono neutro y nada se rompe.
// La lista es la de `_iconos_del_catalogo()` de la base (`supabase/migrations/…004000_configuracion_de_leads.sql`): una guarda de
// `pnpm test` las compara. Genéricos, sin marcas. Un icono nuevo = su clave acá y en la base, y su trazo en `ui/icono-del-catalogo/trazos.tsx`.

export const CLAVES_DE_ICONO = [
  'telefono',
  'celular',
  'mensaje',
  'correo',
  'video',
  'persona',
  'personas',
  'trato',
  'ubicacion',
  'tienda',
  'oficina',
  'web',
  'enlace',
  'compartir',
  'megafono',
  'estrella',
  'etiqueta',
  'calendario',
  'nota',
  'documento',
  'auto',
  'barco',
  'casa',
  'otro',
] as const

export type ClaveDeIcono = (typeof CLAVES_DE_ICONO)[number]

// Cómo se nombra cada uno (el selector lo dice con texto: un icono solo no se lee con un lector de pantalla).
export const NOMBRE_DE_ICONO: Record<ClaveDeIcono, string> = {
  telefono: 'Teléfono',
  celular: 'Celular',
  mensaje: 'Mensaje',
  correo: 'Correo',
  video: 'Video',
  persona: 'Persona',
  personas: 'Personas',
  trato: 'Trato',
  ubicacion: 'Ubicación',
  tienda: 'Tienda',
  oficina: 'Oficina',
  web: 'Web',
  enlace: 'Enlace',
  compartir: 'Compartir',
  megafono: 'Megáfono',
  estrella: 'Estrella',
  etiqueta: 'Etiqueta',
  calendario: 'Calendario',
  nota: 'Nota',
  documento: 'Documento',
  auto: 'Vehículo',
  barco: 'Barco',
  casa: 'Casa',
  otro: 'Otro',
}

export function esClaveDeIcono(valor: unknown): valor is ClaveDeIcono {
  return typeof valor === 'string' && (CLAVES_DE_ICONO as readonly string[]).includes(valor)
}

// Lo que se dibuja para un valor guardado: nada si no hay icono, el suyo si es del catálogo y el neutro si es una clave que no se conoce.
export type IconoADibujar =
  { tipo: 'ninguno' } | { tipo: 'clave'; clave: ClaveDeIcono } | { tipo: 'desconocido' }

export function iconoADibujar(valor: string | null | undefined): IconoADibujar {
  if (valor === null || valor === undefined || valor.trim() === '') {
    return { tipo: 'ninguno' }
  }
  return esClaveDeIcono(valor) ? { tipo: 'clave', clave: valor } : { tipo: 'desconocido' }
}

// El texto que dice qué icono es (para el lector de pantalla de un selector y los avisos): «Sin icono» si no hay.
export function nombreDelIcono(valor: string | null | undefined): string {
  const que = iconoADibujar(valor)
  return que.tipo === 'clave' ? NOMBRE_DE_ICONO[que.clave] : 'Sin icono'
}
