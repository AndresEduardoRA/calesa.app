// El selector de la pantalla de flujos: una pestaña por flujo que quien mira puede configurar. Puro; los orígenes los trae `src/app` (el módulo no
// importa `origenes`) y los flujos los filtra `flujosConfigurables()` por permisos.
import type { FlujoConfigurable } from './flujo'

// Lo que el selector necesita de un origen: su nombre y su color vienen de la fila, nunca de un texto fijo.
export type OrigenDelSelector = { id: string; nombre: string; color: string; activo: boolean }

export const CLAVE_DE_REPUESTOS = 'repuestos'

export type EntradaDelSelector = {
  // El id del origen o `repuestos`: lo que se escribe en la URL y el valor de la pestaña.
  clave: string
  titulo: string
  // El de repuestos no tiene color de origen.
  color: string | null
  flujo: FlujoConfigurable
}

// Los orígenes en el orden recibido y, al final, el flujo de repuestos. Un flujo de vehículos cuyo origen no llegó en la lista no se ofrece (D11).
export function armarSelector(
  flujos: readonly FlujoConfigurable[],
  origenes: readonly OrigenDelSelector[],
): EntradaDelSelector[] {
  const entradas: EntradaDelSelector[] = []
  for (const origen of origenes) {
    const flujo = flujos.find((f) => f.ambito === 'vehiculos' && f.origenId === origen.id)
    if (!flujo) continue
    entradas.push({
      clave: origen.id,
      titulo: origen.activo ? origen.nombre : `${origen.nombre} (inactivo)`,
      color: origen.color,
      flujo,
    })
  }
  const repuestos = flujos.find((f) => f.ambito === 'repuestos')
  if (repuestos) {
    entradas.push({
      clave: CLAVE_DE_REPUESTOS,
      titulo: repuestos.nombre,
      color: null,
      flujo: repuestos,
    })
  }
  return entradas
}

// Qué pestaña abre la URL (D12): `?ambito=repuestos` si hay flujo de repuestos; si no, `?origen=` si es de los suyos; si no, la primera.
// Una URL escrita a mano nunca es un error.
export function elegirEntrada(
  entradas: readonly EntradaDelSelector[],
  pedido: { origen: string | null; ambito: string | null },
): EntradaDelSelector | null {
  if (pedido.ambito === CLAVE_DE_REPUESTOS) {
    const repuestos = entradas.find((e) => e.clave === CLAVE_DE_REPUESTOS)
    if (repuestos) return repuestos
  }
  if (pedido.origen) {
    const origen = entradas.find((e) => e.clave === pedido.origen && e.clave !== CLAVE_DE_REPUESTOS)
    if (origen) return origen
  }
  return entradas[0] ?? null
}
