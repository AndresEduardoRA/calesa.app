import { z } from 'zod'

// Lo que ofrece el transporte de un flujo y cómo se vuelve el contenido de un selector (6.08-2). La oferta la lee `flujo_oferta(p_flujo)`; es una **copia** de lo que entiende `flujos` (un
// área no importa otra). Lista vacía = se ofrece todo lo activo del catálogo.
export type ElementoDeOferta = { id: string; nombre: string; activo: boolean }

export type OfertaDeTransporte = {
  transporte: boolean
  puertosOrigen: ElementoDeOferta[]
  puertosDestino: ElementoDeOferta[]
  navieras: ElementoDeOferta[]
}

const elemento = z.object({ id: z.guid(), nombre: z.string(), activo: z.boolean() })
const cruda = z.object({
  transporte: z.boolean(),
  puertos_origen: z.array(elemento),
  puertos_destino: z.array(elemento),
  navieras: z.array(elemento),
})

/** Lo que devuelve `flujo_oferta()`; nulo si no tiene la forma esperada. */
export function ofertaDesde(crudo: unknown): OfertaDeTransporte | null {
  const r = cruda.safeParse(crudo)
  return r.success
    ? {
        transporte: r.data.transporte,
        puertosOrigen: r.data.puertos_origen,
        puertosDestino: r.data.puertos_destino,
        navieras: r.data.navieras,
      }
    : null
}

export type OpcionDeTransporte = { valor: string; etiqueta: string }

/**
 * Las opciones de un selector (sin la de «Sin elegir», que pone quien dibuja): lo que ofrece el flujo —o, con la oferta vacía, todo lo activo del catálogo— y **siempre** lo ya guardado,
 * rotulado si ya no se ofrece. Así una desactivación no esconde un dato guardado (la base sólo frena lo nuevo). `femenino` es la concordancia del rótulo («naviera inactiva», «puerto inactivo»).
 */
export function opcionesDeTransporte(args: {
  ofrecidos: readonly ElementoDeOferta[]
  catalogo: readonly ElementoDeOferta[]
  guardado: string | null
  femenino: boolean
}): OpcionDeTransporte[] {
  const { ofrecidos, catalogo, guardado, femenino } = args
  const base = (ofrecidos.length > 0 ? ofrecidos : catalogo).filter((e) => e.activo)
  const vistos = new Set<string>()
  const opciones: OpcionDeTransporte[] = []
  for (const e of [...base].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))) {
    if (!vistos.has(e.id)) {
      vistos.add(e.id)
      opciones.push({ valor: e.id, etiqueta: e.nombre })
    }
  }
  if (guardado !== null && !vistos.has(guardado)) {
    const conocido =
      catalogo.find((e) => e.id === guardado) ?? ofrecidos.find((e) => e.id === guardado)
    const inactivo = femenino ? '(inactiva)' : '(inactivo)'
    const rotulo = conocido
      ? conocido.activo
        ? '(fuera de la oferta)'
        : inactivo
      : '(no disponible)'
    opciones.push({ valor: guardado, etiqueta: `${conocido?.nombre ?? 'Elegido antes'} ${rotulo}` })
  }
  return opciones
}
