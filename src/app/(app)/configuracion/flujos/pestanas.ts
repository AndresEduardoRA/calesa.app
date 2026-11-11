// Las pestañas de Configuración › Flujos. Cuál está abierta vive en la URL (`?seccion=`). Hoy hay una sola, «Fases»; cada área suma las suyas en su carpeta
// (`fases/`, `requisitos/`, `documentos/` y `reglas/`: `PESTANAS_DE_<ÁREA>`, vacías hasta que su paso las llena) y se juntan abajo, así este archivo no se vuelve a editar.
// Una pestaña no existe hasta que su paso la llena: nunca un botón muerto. Con una sola visible, la barra no se dibuja.
import type { ReactNode } from 'react'
import { puede, type ClavePermiso, type Permisos } from '@/shared/lib/permisos'
import type { AlMenosUna } from '../empresa/pestanas'
import { PESTANAS_DE_DOCUMENTOS } from './documentos/pestanas'
import { PESTANAS_DE_FASES } from './fases/pestanas'
import { PESTANAS_DE_REGLAS } from './reglas/pestanas'
import { PESTANAS_DE_REQUISITOS } from './requisitos/pestanas'

export type PestanaDeFlujos = {
  clave: string
  titulo: string
  permisos: readonly ClavePermiso[]
}

// Lo que cada pestaña recibe de la página para dibujar su sección.
export type PedidoDeFlujos = {
  permisos: Permisos
  // `?origen=` y `?ambito=`: el flujo que pide la URL.
  origenPedido: string | undefined
  ambitoPedido: string | undefined
}

export type SeccionDeFlujos = (pedido: PedidoDeFlujos) => ReactNode

export const PESTANAS: readonly PestanaDeFlujos[] = [
  { clave: 'fases', titulo: 'Fases', permisos: ['flujos.configurar', 'repuestos.configurar'] },
  ...PESTANAS_DE_FASES,
  ...PESTANAS_DE_REQUISITOS,
  ...PESTANAS_DE_DOCUMENTOS,
  ...PESTANAS_DE_REGLAS,
]

// Las pestañas que esta persona puede abrir, en su orden.
export function pestanasVisibles(permisos: Permisos): PestanaDeFlujos[] {
  return PESTANAS.filter((pestana) => pestana.permisos.some((clave) => puede(permisos, clave)))
}

// Lo que viene en la URL lo puede escribir cualquiera: lo que no es una pestaña visible abre la primera visible.
export function pestanaDe(
  valor: string | undefined,
  visibles: AlMenosUna<{ clave: string }>,
): string {
  return visibles.find((pestana) => pestana.clave === valor)?.clave ?? visibles[0].clave
}
