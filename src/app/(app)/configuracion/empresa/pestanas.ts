// Las pestañas de Configuración › Empresa. Cuál está abierta vive en la URL (`?seccion=`).
//
// Una pestaña de Empresa es de la empresa (las tres de abajo) o de un área: la lista del área vive en su carpeta
// (`comprobantes/pestanas.ts`) y se suma al final de `PESTANAS`. Reglas de una pestaña de un área:
// - sólo pide claves de la entrada «Configuración» de `NAVEGACION` (`secciones.test.ts` lo vigila por `PERMISOS_DE_EMPRESA`);
// - su estado de URL propio va en `?panel=` (la barra lo limpia al cambiar de pestaña) y su sección lo lee de `parametros`;
//   un parámetro nuevo se suma a la barra (4-89);
// - quién la ve sin los permisos de Empresa se decide al sumarla (4-89).
import { puede, type ClavePermiso, type Permisos } from '@/shared/lib/permisos'
import { PESTANAS_DE_COMPROBANTES } from './comprobantes/pestanas'

export type PestanaDeEmpresa = {
  clave: string
  titulo: string
  permisos: readonly ClavePermiso[]
}

// Una lista que nunca está vacía: `lista[0]` es un `T` y no hace falta un `!` ni un valor por defecto.
export type AlMenosUna<T> = readonly [T, ...T[]]

// Entra a Empresa quien tiene alguno de estos dos permisos, y con cualquiera ve las tres pestañas.
const PERMISOS_DE_LA_EMPRESA = [
  'empresa.ajustes.gestionar',
  'empresa.tipos_cambio.gestionar',
] as const satisfies readonly ClavePermiso[]

export const PESTANAS_DE_LA_EMPRESA: AlMenosUna<PestanaDeEmpresa> = [
  { clave: 'empresa', titulo: 'Empresa', permisos: PERMISOS_DE_LA_EMPRESA },
  { clave: 'monedas', titulo: 'Monedas', permisos: PERMISOS_DE_LA_EMPRESA },
  { clave: 'integraciones', titulo: 'Integraciones', permisos: PERMISOS_DE_LA_EMPRESA },
]

export const PESTANAS: AlMenosUna<PestanaDeEmpresa> = [
  ...PESTANAS_DE_LA_EMPRESA,
  ...PESTANAS_DE_COMPROBANTES,
]

// Los permisos de todas las pestañas, sin repetir y en orden.
export function permisosDeLasPestanas(pestanas: readonly PestanaDeEmpresa[]): ClavePermiso[] {
  return [...new Set(pestanas.flatMap((pestana) => pestana.permisos))]
}

// Con cualquiera de ellos se entra a Empresa.
export const PERMISOS_DE_EMPRESA = permisosDeLasPestanas(PESTANAS)

// Las pestañas que esta persona puede abrir, en su orden.
export function pestanasVisibles(
  permisos: Permisos,
  pestanas: readonly PestanaDeEmpresa[] = PESTANAS,
): PestanaDeEmpresa[] {
  return pestanas.filter((pestana) => pestana.permisos.some((clave) => puede(permisos, clave)))
}

export function alMenosUna<T>(lista: readonly T[]): AlMenosUna<T> | null {
  const [primera, ...resto] = lista
  return primera === undefined ? null : [primera, ...resto]
}

// Lo que viene en la URL lo puede escribir cualquiera: lo que no es una pestaña visible abre la primera visible.
export function pestanaDe(
  valor: string | undefined,
  visibles: AlMenosUna<{ clave: string }>,
): string {
  return visibles.find((pestana) => pestana.clave === valor)?.clave ?? visibles[0].clave
}

export function esPestanaDeUnArea(clave: string): boolean {
  return PESTANAS_DE_COMPROBANTES.some((pestana) => pestana.clave === clave)
}
