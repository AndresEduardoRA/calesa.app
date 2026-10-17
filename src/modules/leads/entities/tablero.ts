// El kanban de un embudo (`/leads?vista=embudo&embudo=<id>`): una columna por etapa con sus tarjetas
// (las oportunidades de quien mira, abiertas y cerradas: una ganada o perdida se queda en su columna
// final). Cada columna trae hasta `TAMANO_DE_COLUMNA` y «Ver más» pide las siguientes. Sin arrastrar:
// se mueve con «Mover a…» (docs/UX.md).
import { CAMPOS_DE_NUMEROS, numerosDesde, type NumerosDeLead } from '@/shared/lib/numeros-de-lead'
import { z } from 'zod'
import { conteoConCambio, type ConteoAcotado } from '@/shared/lib/conteo'
import { TOPE_DE_LO_CARGADO } from '@/shared/lib/paginacion'
import { esquemaEtapa, etapaDesde, type EtapaGuardada } from './embudo'
import { ESTADOS_DE_OPORTUNIDAD, type EstadoDeOportunidad } from './oportunidad'

// Cuántas trae cada pedido («Ver más» suma otras tantas: `TAMANO_DE_COLUMNA`, de `shared/lib/paginacion`) y hasta
// cuántas se dibujan en una columna: más allá se avisa y las demás siguen en la ficha de cada lead
// (`.claude/rules/escala.md`).
export const TOPE_DE_COLUMNA = TOPE_DE_LO_CARGADO

// La vista y lo elegido en ella, en la URL de `/leads`.
export const CLAVE_DE_VISTA = 'vista'
export const VISTA_EMBUDO = 'embudo'
export const CLAVE_DE_EMBUDO = 'embudo'
// La etapa que se ve en el celular (una por vez, como pestañas).
export const CLAVE_DE_ETAPA = 'etapa'

export type LeadDeTarjeta = { id: string; numeros: NumerosDeLead; nombre: string }

export type Tarjeta = {
  id: string
  etapaId: string
  estado: EstadoDeOportunidad
  titulo: string
  monto: number | null
  moneda: string
  motivoPerdida: string | null
  enEtapaDesde: string
  actualizadoEn: string
  lead: LeadDeTarjeta
  vehiculo: { id: string; titulo: string; numero: number } | null
}

export type Columna = {
  etapa: EtapaGuardada
  // Cuántas hay en la etapa, hasta `TOPE_DE_COLUMNA`: nunca el total exacto (una columna puede tener miles).
  total: ConteoAcotado
  // Hay más que las cargadas.
  hayMas: boolean
  tarjetas: Tarjeta[]
}

export type Tablero = {
  embudo: { id: string; nombre: string; esDefault: boolean; actualizadoEn: string }
  columnas: Columna[]
}

const numero = z.union([z.number(), z.string()]).transform((v) => Number(v))

const esquemaTarjeta = z.object({
  id: z.guid(),
  etapa_id: z.guid(),
  estado: z.enum(ESTADOS_DE_OPORTUNIDAD),
  titulo: z.string().min(1),
  monto_estimado: numero.nullable(),
  moneda: z.string().length(3),
  motivo_perdida: z.string().nullable(),
  ultima_actividad_en: z.string().min(1),
  actualizado_en: z.string().min(1),
  lead: z.object({ id: z.guid(), ...CAMPOS_DE_NUMEROS, nombre: z.string() }),
  vehiculo: z.object({ id: z.guid(), titulo: z.string(), numero: z.number() }).nullable(),
})

function tarjetaDesdeFila(f: z.infer<typeof esquemaTarjeta>): Tarjeta {
  return {
    id: f.id,
    etapaId: f.etapa_id,
    estado: f.estado,
    titulo: f.titulo,
    monto: f.monto_estimado,
    moneda: f.moneda,
    motivoPerdida: f.motivo_perdida,
    enEtapaDesde: f.ultima_actividad_en,
    actualizadoEn: f.actualizado_en,
    lead: { id: f.lead.id, numeros: numerosDesde(f.lead), nombre: f.lead.nombre },
    vehiculo: f.vehiculo,
  }
}

// Una lista de tarjetas: la que no cumple la forma se descarta (no tumba la columna).
function tarjetasDesde(crudo: unknown): Tarjeta[] {
  return Array.isArray(crudo)
    ? crudo.flatMap((una) => {
        const leida = esquemaTarjeta.safeParse(una)
        return leida.success ? [tarjetaDesdeFila(leida.data)] : []
      })
    : []
}

const esquemaTablero = z.object({
  embudo: z.object({
    id: z.guid(),
    nombre: z.string().min(1),
    es_default: z.boolean(),
    actualizado_en: z.string().min(1),
  }),
  columnas: z.array(
    z.object({
      etapa: esquemaEtapa,
      total: z.number().int().nonnegative(),
      total_hay_mas: z.boolean().default(false),
      hay_mas: z.boolean(),
      tarjetas: z.array(z.unknown()),
    }),
  ),
})

// Lo que entrega `embudo_tablero()`. Nulo (un embudo que no es de quien mira) o roto: `null`.
export function tableroDesde(crudo: unknown): Tablero | null {
  const leido = esquemaTablero.safeParse(crudo)
  if (!leido.success) {
    return null
  }
  const { embudo, columnas } = leido.data
  return {
    embudo: {
      id: embudo.id,
      nombre: embudo.nombre,
      esDefault: embudo.es_default,
      actualizadoEn: embudo.actualizado_en,
    },
    columnas: columnas.map((c) => ({
      etapa: etapaDesde(c.etapa),
      total: { n: c.total, hayMas: c.total_hay_mas },
      hayMas: c.hay_mas,
      tarjetas: tarjetasDesde(c.tarjetas),
    })),
  }
}

// «Ver más» (`embudo_etapa_pagina()`).
export function paginaDeEtapaDesde(
  crudo: unknown,
): { tarjetas: Tarjeta[]; hayMas: boolean } | null {
  const leida = z.object({ tarjetas: z.array(z.unknown()), hay_mas: z.boolean() }).safeParse(crudo)
  return leida.success
    ? { tarjetas: tarjetasDesde(leida.data.tarjetas), hayMas: leida.data.hay_mas }
    : null
}

// La columna dibuja ya todo lo que dibuja: «Ver más» deja su lugar al aviso del tope.
export function columnaEnElTope(columna: Pick<Columna, 'tarjetas'>): boolean {
  return columna.tarjetas.length >= TOPE_DE_COLUMNA
}

// Desde dónde sigue una columna: la última que trae.
export function cursorDeColumna(columna: Columna): { antesEn: string; antesId: string } | null {
  const ultima = columna.tarjetas.at(-1)
  return ultima ? { antesEn: ultima.enEtapaDesde, antesId: ultima.id } : null
}

// Suma una página al final de su columna (sin repetir las que ya estaban).
export function conPagina(
  tablero: Tablero,
  etapaId: string,
  pagina: { tarjetas: Tarjeta[]; hayMas: boolean },
): Tablero {
  return {
    ...tablero,
    columnas: tablero.columnas.map((c) => {
      if (c.etapa.id !== etapaId) {
        return c
      }
      const ya = new Set(c.tarjetas.map((t) => t.id))
      return {
        ...c,
        hayMas: pagina.hayMas,
        tarjetas: [...c.tarjetas, ...pagina.tarjetas.filter((t) => !ya.has(t.id))].slice(
          0,
          TOPE_DE_COLUMNA,
        ),
      }
    }),
  }
}

export function estadoDeLaEtapa(
  etapa: Pick<EtapaGuardada, 'esGanada' | 'esPerdida'>,
): EstadoDeOportunidad {
  if (etapa.esGanada) {
    return 'ganada'
  }
  return etapa.esPerdida ? 'perdida' : 'abierta'
}

// Lo que se ve mientras viaja «Mover a…»: sale de su columna y entra primera en la otra, con el estado
// de la etapa. Lo que confirma la base (`movida`) reemplaza a lo supuesto.
export function conMovida(
  tablero: Tablero,
  tarjetaId: string,
  etapaId: string,
  movida?: Partial<Pick<Tarjeta, 'estado' | 'motivoPerdida' | 'enEtapaDesde' | 'actualizadoEn'>>,
): Tablero {
  const origen = tablero.columnas.find((c) => c.tarjetas.some((t) => t.id === tarjetaId))
  const destino = tablero.columnas.find((c) => c.etapa.id === etapaId)
  const tarjeta = origen?.tarjetas.find((t) => t.id === tarjetaId)
  if (!origen || !destino || !tarjeta) {
    return tablero
  }
  const nueva: Tarjeta = {
    ...tarjeta,
    etapaId,
    estado: estadoDeLaEtapa(destino.etapa),
    motivoPerdida: destino.etapa.esPerdida ? tarjeta.motivoPerdida : null,
    ...movida,
  }
  if (origen === destino) {
    return {
      ...tablero,
      columnas: tablero.columnas.map((c) =>
        c === origen
          ? { ...c, tarjetas: c.tarjetas.map((t) => (t.id === tarjetaId ? nueva : t)) }
          : c,
      ),
    }
  }
  return {
    ...tablero,
    columnas: tablero.columnas.map((c) => {
      if (c === origen) {
        return {
          ...c,
          total: conteoConCambio(c.total, -1, TOPE_DE_COLUMNA),
          tarjetas: c.tarjetas.filter((t) => t.id !== tarjetaId),
        }
      }
      if (c === destino) {
        // Entra primera; si la columna ya dibuja el tope, la última sale (sigue en su ficha).
        return {
          ...c,
          total: conteoConCambio(c.total, 1, TOPE_DE_COLUMNA),
          tarjetas: [nueva, ...c.tarjetas].slice(0, TOPE_DE_COLUMNA),
        }
      }
      return c
    }),
  }
}

// Una firma de lo que trajo el servidor: cuando cambia, lo local se vuelve a sembrar.
export function firmaDelTablero(tablero: Tablero): string {
  return [
    tablero.embudo.id,
    tablero.embudo.actualizadoEn,
    ...tablero.columnas.map(
      (c) =>
        `${c.etapa.id}:${String(c.total.n)}${c.total.hayMas ? '+' : ''}:${c.tarjetas.map((t) => t.actualizadoEn).join(',')}`,
    ),
  ].join('|')
}

// En el celular se ve una etapa por vez: la de la URL si es de este embudo; si no, la inicial.
export function etapaElegida(tablero: Tablero, deLaUrl: string | null): string | null {
  const columnas = tablero.columnas
  if (deLaUrl && columnas.some((c) => c.etapa.id === deLaUrl)) {
    return deLaUrl
  }
  return (columnas.find((c) => c.etapa.esInicial) ?? columnas[0])?.etapa.id ?? null
}

// Cuántas hay en todo el embudo (para decir «Todavía no tienes oportunidades en este embudo»).
export function totalDelTablero(tablero: Tablero): number {
  return tablero.columnas.reduce((suma, c) => suma + c.total.n, 0)
}
