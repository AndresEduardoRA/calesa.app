// Los filtros de `/actividad` y el pedido que arman para `actividad_listar`. La base toma un actor y una tabla (no varios): por eso persona y
// entidad son de una sola opción, con «Todas» por defecto. `?registro=` no es un control: lo trae el «Ver actividad» de una ficha y sólo vale
// junto a `?entidad=` (sin ella la base da 22023).
import type { EsquemaDeFiltros, ValoresDeFiltros } from '@/shared/lib/filtros'
import {
  diaEnZona,
  diaSiguiente,
  formatearFecha,
  inicioDelDia,
  sumarDias,
} from '@/shared/lib/fechas'
import type { FilaDeActividad } from './actividad'

export const TODAS = 'todas'
export const CLAVE_DE_PERSONA = 'persona'
export const CLAVE_DE_ENTIDAD = 'entidad'
export const CLAVE_DE_REGISTRO = 'registro'
const LARGO_MAXIMO_DEL_REGISTRO = 100

export type PersonaDeLaActividad = { id: string; nombre: string }

export type PedidoDeActividad = {
  actor: string | null
  tabla: string | null
  registro: string | null
  // El cursor: el id de la última fila cargada («Ver más»).
  antesId: number | null
  // El instante exclusivo de «Ir a una fecha» (`hastaDeUnDia()`).
  hasta: string | null
}

export function esquemaDeFiltrosDeActividad({
  personas,
  entidades,
}: {
  personas: readonly PersonaDeLaActividad[]
  entidades: Readonly<Record<string, string>>
}): EsquemaDeFiltros {
  return {
    busqueda: null,
    filtros: [
      {
        tipo: 'eleccion',
        clave: CLAVE_DE_PERSONA,
        etiqueta: 'Persona',
        porDefecto: TODAS,
        opciones: [
          { valor: TODAS, etiqueta: 'Todas' },
          ...personas.map((p) => ({ valor: p.id, etiqueta: p.nombre })),
        ],
      },
      {
        tipo: 'eleccion',
        clave: CLAVE_DE_ENTIDAD,
        etiqueta: 'Entidad',
        porDefecto: TODAS,
        opciones: [
          { valor: TODAS, etiqueta: 'Todas' },
          ...Object.entries(entidades)
            .map(([valor, etiqueta]) => ({ valor, etiqueta }))
            .sort((a, b) => a.etiqueta.localeCompare(b.etiqueta, 'es')),
        ],
      },
    ],
  }
}

function eleccion(valores: ValoresDeFiltros, clave: string): string | null {
  const valor = valores.porClave[clave]
  return valor?.tipo === 'eleccion' && valor.valor !== TODAS ? valor.valor : null
}

// El pedido de la primera página: sin cursor ni fecha. El registro sólo con su entidad y si no está vacío.
export function pedidoDeActividad(
  valores: ValoresDeFiltros,
  registro: string | null,
): PedidoDeActividad {
  const tabla = eleccion(valores, CLAVE_DE_ENTIDAD)
  const texto = registro?.trim() ?? ''
  return {
    actor: eleccion(valores, CLAVE_DE_PERSONA),
    tabla,
    registro:
      tabla !== null && texto !== '' && texto.length <= LARGO_MAXIMO_DEL_REGISTRO ? texto : null,
    antesId: null,
    hasta: null,
  }
}

// Lo que identifica a los filtros de una carga: con otra, lo cargado se descarta (la `key` del listado).
export function claveDelPedido(pedido: PedidoDeActividad): string {
  return `${pedido.actor ?? ''}|${pedido.tabla ?? ''}|${pedido.registro ?? ''}`
}

// El borde de «Ir a una fecha»: todo lo de ese día (en la zona de la empresa) y lo anterior = el inicio del día siguiente, exclusivo. Nulo si
// `dia` no es un `YYYY-MM-DD` que exista. Las tres líneas son las de `cotizaciones/entities/revisiones.ts` a propósito: subirlas a
// `shared/lib` es del carril del núcleo.
export function hastaDeUnDia(dia: string, zona: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia) || Number.isNaN(Date.parse(`${dia}T00:00:00Z`))) {
    return null
  }
  return inicioDelDia(diaSiguiente(dia), { zona })
}

export type DiaDeActividad = { dia: string; titulo: string; filas: FilaDeActividad[] }

// Las filas (de la más nueva a la más vieja) agrupadas por su día en la zona de la empresa. `hoy` lo calcula el servidor (`YYYY-MM-DD`).
export function agruparPorDia(
  filas: readonly FilaDeActividad[],
  zona: string,
  hoy: string,
): DiaDeActividad[] {
  const ayer = sumarDias(hoy, -1)
  const grupos: DiaDeActividad[] = []
  for (const fila of filas) {
    const dia = diaEnZona(fila.creadoEn, { zona })
    let grupo = grupos.at(-1)
    if (grupo?.dia !== dia) {
      const titulo =
        dia === hoy ? 'Hoy' : dia === ayer ? 'Ayer' : formatearFecha(fila.creadoEn, { zona })
      grupo = { dia, titulo, filas: [] }
      grupos.push(grupo)
    }
    grupo.filas.push(fila)
  }
  return grupos
}
