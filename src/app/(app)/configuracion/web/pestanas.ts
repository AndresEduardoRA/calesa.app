// Las pestañas de Configuración › Sitio web (8.01-3). Cuál está abierta vive en la URL (`?seccion=`). Cada una tiene su hueco en `@/modules/web/pantallas/sitio-<pestaña>`,
// nulo hasta su paso: una pestaña nula no se dibuja (ni en la barra ni en el hub). Con una sola visible, la barra no se dibuja. Este archivo no se vuelve a editar al
// llenar una: cambia su hueco.
import { PESTANA_DE_AJUSTES } from '@/modules/web/pantallas/sitio-ajustes'
import { PESTANA_DE_FAQS } from '@/modules/web/pantallas/sitio-faqs'
import { PESTANA_DE_GUIAS } from '@/modules/web/pantallas/sitio-guias'
import { PESTANA_DE_LEGALES } from '@/modules/web/pantallas/sitio-legales'
import { PESTANA_DE_TESTIMONIOS } from '@/modules/web/pantallas/sitio-testimonios'
import { puede, type ClavePermiso, type Permisos } from '@/shared/lib/permisos'
import type { AlMenosUna } from '../empresa/pestanas'

export type Pestana = 'ajustes' | 'legales' | 'guias' | 'faqs' | 'testimonios'

export type PestanaDeWeb = {
  clave: Pestana
  titulo: string
  permisos: readonly ClavePermiso[]
  // Su hueco ya tiene componente.
  llena: boolean
}

const AJUSTES: readonly ClavePermiso[] = ['web.ajustes.gestionar']
const CONTENIDO: readonly ClavePermiso[] = ['web.contenido.gestionar']

export const PESTANAS: readonly PestanaDeWeb[] = [
  { clave: 'ajustes', titulo: 'Ajustes', permisos: AJUSTES, llena: PESTANA_DE_AJUSTES !== null },
  { clave: 'legales', titulo: 'Legales', permisos: AJUSTES, llena: PESTANA_DE_LEGALES !== null },
  { clave: 'guias', titulo: 'Guías', permisos: CONTENIDO, llena: PESTANA_DE_GUIAS !== null },
  {
    clave: 'faqs',
    titulo: 'Preguntas frecuentes',
    permisos: CONTENIDO,
    llena: PESTANA_DE_FAQS !== null,
  },
  {
    clave: 'testimonios',
    titulo: 'Testimonios',
    permisos: CONTENIDO,
    llena: PESTANA_DE_TESTIMONIOS !== null,
  },
]

function tienePermiso(permisos: Permisos, pestana: PestanaDeWeb): boolean {
  return pestana.permisos.some((clave) => puede(permisos, clave))
}

// Las pestañas que la persona podría abrir por su permiso, llenas o no: vacía es «No tienes permiso»; con alguna pero sin visibles, «nada que configurar».
export function pestanasConPermiso(
  permisos: Permisos,
  lista: readonly PestanaDeWeb[] = PESTANAS,
): PestanaDeWeb[] {
  return lista.filter((pestana) => tienePermiso(permisos, pestana))
}

// Las que se dibujan: con permiso (en algún origen: son de la empresa) y llenas, en su orden.
export function pestanasVisibles(
  permisos: Permisos,
  lista: readonly PestanaDeWeb[] = PESTANAS,
): PestanaDeWeb[] {
  return lista.filter((pestana) => pestana.llena && tienePermiso(permisos, pestana))
}

// Las claves que abren la tarjeta del hub: las de las pestañas llenas, sin repetir. Vacía: la sección no figura.
export function permisosDeLasLlenas(lista: readonly PestanaDeWeb[] = PESTANAS): ClavePermiso[] {
  return [...new Set(lista.filter((pestana) => pestana.llena).flatMap((p) => p.permisos))]
}

// Lo que viene en la URL lo puede escribir cualquiera: lo que no es una de sus pestañas visibles abre la primera.
export function pestanaDe(
  valor: string | undefined,
  visibles: AlMenosUna<{ clave: Pestana }>,
): Pestana {
  return visibles.find((pestana) => pestana.clave === valor)?.clave ?? visibles[0].clave
}
