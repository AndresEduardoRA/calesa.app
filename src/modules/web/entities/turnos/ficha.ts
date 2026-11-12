import type { Resultado } from '@/shared/lib/errores'

// «Tu ficha en la web» (8.05-2): lo que cada asesor cuenta de sí para la web pública y para recibir turnos. Las columnas son de `perfiles`
// (`handle`, `cargo_web`, `whatsapp_web`, `bio_web`, `especialidades`, `publico_web`). La base repite el formato del WhatsApp (check) y la
// unicidad del identificador; el resto de las reglas (largos, formato del identificador) son de esta capa y se pueden aflojar sin migración.

export const HANDLE_MIN = 3
export const HANDLE_MAX = 30
export const CARGO_MAX = 80
export const PRESENTACION_MAX = 500
export const ESPECIALIDADES_MAX = 8
export const ESPECIALIDAD_MAX = 30

// Espejo del check `perfiles_whatsapp_web_check` de la base: `+`, un dígito 1-9 y de 6 a 14 más.
const WHATSAPP = /^\+[1-9][0-9]{6,14}$/
// Minúsculas, números y `. _ -`; empieza y termina con letra o número.
const HANDLE = /^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/

export const MENSAJE_WHATSAPP = 'El WhatsApp va con el código de país, por ejemplo +59170000000.'
export const MENSAJE_HANDLE = `El identificador lleva de ${HANDLE_MIN} a ${HANDLE_MAX} caracteres: minúsculas, números y . _ - (empieza y termina con letra o número).`
export const MENSAJE_SIN_WHATSAPP = 'Para aparecer en la web necesitas tu WhatsApp.'

export function esWhatsapp(valor: string): boolean {
  return WHATSAPP.test(valor)
}

export function esHandle(valor: string): boolean {
  return valor.length >= HANDLE_MIN && valor.length <= HANDLE_MAX && HANDLE.test(valor)
}

// Las especialidades se escriben separadas por coma: sin vacías, sin repetidas (sin distinguir mayúsculas) y en el orden en que se escribieron.
export function especialidadesDeTexto(texto: string): string[] {
  const vistas = new Set<string>()
  const salida: string[] = []
  for (const parte of texto.split(',')) {
    const limpia = parte.trim().replace(/\s+/g, ' ')
    const llave = limpia.toLowerCase()
    if (limpia !== '' && !vistas.has(llave)) {
      vistas.add(llave)
      salida.push(limpia)
    }
  }
  return salida
}

export function textoDeEspecialidades(especialidades: readonly string[]): string {
  return especialidades.join(', ')
}

// Lo que se lee de la persona: su lugar en la cola y su ficha. `habilitado` lo decide quien administra la cola; `disponible`, la propia persona.
export type MiFichaEnLaWeb = {
  habilitado: boolean
  disponible: boolean
  handle: string | null
  cargo: string | null
  whatsapp: string | null
  presentacion: string | null
  especialidades: string[]
  publicoWeb: boolean
  // ISO: la versión de su perfil al leer (`perfiles.actualizado_en`).
  actualizadoEn: string
}

export type LectorDeMiFichaEnLaWeb = () => Promise<Resultado<MiFichaEnLaWeb | null>>
