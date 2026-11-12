// Los ajustes del sitio (8.01-4): lo que la pestaña «Ajustes» de Configuración › Sitio web lee de `ajustes_web` y lo que manda a
// `web_ajustes_guardar(versión, cambios)`. Las claves ausentes no cambian; esta pestaña manda todas las del sitio que edita y nunca
// `legales` (pestaña «Legales», 8.03) ni la política de la cola (`/configuracion/cola-web`, 8.04).
import { z } from 'zod'
import { conteoEnFrase, type ConteoAcotado } from '@/shared/lib/conteo'
import type { Tables } from '@/shared/types/database.types'

// Las redes que admite la base (`_web_ajustes_validar`), en su orden.
export const REDES_DEL_SITIO = [
  'facebook',
  'instagram',
  'tiktok',
  'youtube',
  'x',
  'linkedin',
] as const
export type RedDelSitio = (typeof REDES_DEL_SITIO)[number]

export type AjustesDelSitio = {
  nombreSitio: string | null
  lema: string | null
  whatsappRespaldo: string | null
  horario: string | null
  direccionPublica: string | null
  redes: Partial<Record<RedDelSitio, string>>
  seo: { titulo?: string; descripcion?: string }
  mostrarMonedaSecundaria: boolean
  origenesVisibles: string[]
  // La versión tal como la dio la base (con sus microsegundos): nunca pasa por `Date`.
  actualizadoEn: string
}

// El tope del aviso «dejan de verse en la web N vehículos»: se lee `tope + 1` (`.claude/rules/escala.md`).
export const TOPE_DE_VEHICULOS_QUE_DEJAN_DE_VERSE = 50

export const MOTIVO_SIN_PERMISO_AJUSTES_DEL_SITIO =
  'No tienes permiso para cambiar los ajustes de la web.'

export type FilaDeAjustesDelSitio = Pick<
  Tables<'ajustes_web'>,
  | 'nombre_sitio'
  | 'lema'
  | 'whatsapp_respaldo'
  | 'horario'
  | 'direccion_publica'
  | 'redes'
  | 'seo'
  | 'mostrar_moneda_secundaria'
  | 'origenes_visibles'
  | 'actualizado_en'
>

// Tolerante: lo que no es texto o no es una clave conocida se ignora (la base ya lo valida al escribir).
const texto = z.string().optional().catch(undefined)
const esquemaRedes = z
  .object(Object.fromEntries(REDES_DEL_SITIO.map((red) => [red, texto])))
  .catch({})
const esquemaSeo = z.object({ titulo: texto, descripcion: texto }).catch({})

function sinVacios<T extends Record<string, string | undefined>>(objeto: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(objeto).filter(([, valor]) => typeof valor === 'string' && valor !== ''),
  ) as Partial<T>
}

export function ajustesDelSitioDesde(fila: FilaDeAjustesDelSitio): AjustesDelSitio {
  return {
    nombreSitio: fila.nombre_sitio,
    lema: fila.lema,
    whatsappRespaldo: fila.whatsapp_respaldo,
    horario: fila.horario,
    direccionPublica: fila.direccion_publica,
    redes: sinVacios(esquemaRedes.parse(fila.redes) as Record<RedDelSitio, string | undefined>),
    seo: sinVacios(esquemaSeo.parse(fila.seo)),
    mostrarMonedaSecundaria: fila.mostrar_moneda_secundaria,
    origenesVisibles: fila.origenes_visibles,
    actualizadoEn: fila.actualizado_en,
  }
}

// Lo que escribe la persona: los textos tal como están en el formulario, el interruptor y los orígenes ya resueltos (`origenesAGuardar`).
export type EntradaDeCambios = Record<
  | 'nombreSitio'
  | 'lema'
  | 'direccionPublica'
  | 'whatsappRespaldo'
  | 'horario'
  | RedDelSitio
  | 'seoTitulo'
  | 'seoDescripcion',
  string
> & { mostrarMonedaSecundaria: boolean; origenesVisibles: readonly string[] }

export type CambiosDeAjustes = {
  nombre_sitio: string | null
  lema: string | null
  direccion_publica: string | null
  whatsapp_respaldo: string | null
  horario: string | null
  redes: Partial<Record<RedDelSitio, string>>
  seo: { titulo?: string; descripcion?: string }
  mostrar_moneda_secundaria: boolean
  origenes_visibles: string[]
}

const recortado = (valor: string): string | null => valor.trim() || null

// El `p_cambios` de `web_ajustes_guardar`: las claves del sitio que edita la pestaña, con un texto vacío como `null`, y `redes` y `seo`
// (que la base reemplaza enteras) sin las claves vacías. Nunca `legales` ni las claves de la cola.
export function cambiosDeAjustes(entrada: EntradaDeCambios): CambiosDeAjustes {
  const redes = sinVacios(
    Object.fromEntries(REDES_DEL_SITIO.map((red) => [red, entrada[red].trim()])) as Record<
      RedDelSitio,
      string
    >,
  )
  return {
    nombre_sitio: recortado(entrada.nombreSitio),
    lema: recortado(entrada.lema),
    direccion_publica: recortado(entrada.direccionPublica),
    whatsapp_respaldo: recortado(entrada.whatsappRespaldo),
    horario: recortado(entrada.horario),
    redes,
    seo: sinVacios({
      titulo: entrada.seoTitulo.trim(),
      descripcion: entrada.seoDescripcion.trim(),
    }),
    mostrar_moneda_secundaria: entrada.mostrarMonedaSecundaria,
    origenes_visibles: [...entrada.origenesVisibles],
  }
}

// Los orígenes que se guardan: los guardados que la lista no muestra (un origen inactivo no se cae de la web sin que nadie lo vea) más los
// tildados, sin repetir, en el orden de los guardados y después el de la lista.
export function origenesAGuardar(
  guardados: readonly string[],
  mostrados: readonly string[],
  tildados: readonly string[],
): string[] {
  const visibles = new Set(mostrados)
  const marcados = new Set(tildados)
  const siguen = guardados.filter((id) => !visibles.has(id) || marcados.has(id))
  return [...new Set([...siguen, ...mostrados.filter((id) => marcados.has(id))])]
}

// El aviso bajo un origen que se destilda y hoy se ve: cuántos vehículos publicados dejan de verse (acotado). Sin conteo (no se pudo
// leer), avisa sin número; con cero, no avisa.
export function avisoDeOrigenApagado(nombre: string, conteo: ConteoAcotado | null): string | null {
  if (conteo === null) {
    return `Al guardar, los vehículos publicados de ${nombre} dejan de verse en la web.`
  }
  if (conteo.n === 0 && !conteo.hayMas) {
    return null
  }
  if (conteo.n === 1 && !conteo.hayMas) {
    return `Al guardar, deja de verse en la web 1 vehículo publicado de ${nombre}.`
  }
  return `Al guardar, dejan de verse en la web ${conteoEnFrase(conteo)} vehículos publicados de ${nombre}.`
}
