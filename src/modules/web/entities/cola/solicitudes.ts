// Las solicitudes «Sin asignar» del tablero de la cola web (8.04-2): lo que devuelve `cola_web_solicitudes` con `p_estado = 'sin_asignar'` y el cursor de
// «Ver más». Puro: la respuesta es un `jsonb` sin tipo, así que se **parsea** (Zod en todo límite).
import { z } from 'zod'
import { conteoAcotado, type ConteoAcotado } from '@/shared/lib/conteo'
import { TAMANO_DE_VER_MAS } from '@/shared/lib/paginacion'

export type SolicitudSinAsignar = {
  id: string
  codigo: string
  // Texto libre que mandó la web (8.04-1, D12): se dibuja tal cual, nunca como enlace.
  fuente: string
  ruta: string | null
  vehiculoId: string | null
  // Nulo si no hubo vehículo o si dejó de verse en la web.
  vehiculoTitulo: string | null
  // Tal como vino de la base (con su precisión): el cursor lo devuelve intacto.
  creadoEn: string
}

export type PaginaDeSolicitudes = { solicitudes: SolicitudSinAsignar[]; hayMas: boolean }

// Desde dónde sigue la lista: la última fila leída `(creado_en, id)`.
export type CursorDeSolicitudes = { creadoEn: string; id: string }

const fecha = z.iso.datetime({ offset: true })

const esquema = z.object({
  filas: z.array(
    z.object({
      id: z.guid(),
      codigo: z.string(),
      estado: z.string(),
      fuente: z.string(),
      ruta: z.string().nullable(),
      vehiculo_id: z.guid().nullable(),
      vehiculo_titulo: z.string().nullable(),
      usuario_id: z.guid().nullable(),
      usuario_nombre: z.string().nullable(),
      intento: z.number().int(),
      asignada_en: fecha,
      vence_en: fecha.nullable(),
      creado_en: fecha,
    }),
  ),
  hay_mas: z.boolean(),
})

// De lo que devolvió la RPC a la página, o `null` si no tiene la forma esperada.
export function paginaDeSolicitudes(datos: unknown): PaginaDeSolicitudes | null {
  const leido = esquema.safeParse(datos)
  if (!leido.success) {
    return null
  }
  return {
    solicitudes: leido.data.filas.map((s) => ({
      id: s.id,
      codigo: s.codigo,
      fuente: s.fuente,
      ruta: s.ruta,
      vehiculoId: s.vehiculo_id,
      vehiculoTitulo: s.vehiculo_titulo,
      creadoEn: s.creado_en,
    })),
    hayMas: leido.data.hay_mas,
  }
}

// El cursor de la página que sigue: la última fila de lo cargado (nulo si no hay nada cargado).
export function cursorDeSolicitudes(
  solicitudes: readonly SolicitudSinAsignar[],
): CursorDeSolicitudes | null {
  const ultima = solicitudes.at(-1)
  return ultima ? { creadoEn: ultima.creadoEn, id: ultima.id } : null
}

// La firma de una primera página: si cambia al «Actualizar», la lista vuelve a empezar y descarta lo traído con «Ver más».
export function firmaDePagina(pagina: PaginaDeSolicitudes): string {
  return `${pagina.solicitudes.map((s) => s.id).join(',')}|${String(pagina.hayMas)}`
}

// «Sin asignar · 7» o «más de 20»: de la primera página (`TAMANO_DE_VER_MAS + 1` filas), nunca un `count(*)` de una tabla que crece.
export function conteoDeSinAsignar(pagina: PaginaDeSolicitudes): ConteoAcotado {
  return conteoAcotado(
    pagina.hayMas ? TAMANO_DE_VER_MAS + 1 : pagina.solicitudes.length,
    TAMANO_DE_VER_MAS,
  )
}
