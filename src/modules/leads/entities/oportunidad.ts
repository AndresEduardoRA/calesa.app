// Una oportunidad: un negocio de un lead, de una persona, dentro de uno de sus embudos. Sólo la ve su
// dueña y mientras tenga el lead en su cartera. Crear, editar, mover, eliminar y restaurar piden la
// cartera y `leads.editar` (la base decide). El estado sale de la etapa: una ganada o perdida la
// cierra (y se queda en su columna), una abierta la reabre. `cancelada` la pone la baja de su dueña.
import { z } from 'zod'
import { esquemaEtapa, etapaDesde, type EtapaGuardada } from './embudo'
import {
  cambioDeVehiculo,
  valorDeVehiculo,
  vehiculoAlCrear,
  vehiculoDeNotaDesde,
  type VehiculoDeLaNota,
} from './vehiculo-de-nota'

export const LARGO_MAXIMO_DE_TITULO = 120
export const LARGO_MAXIMO_DE_NOTAS = 2000
export const LARGO_MAXIMO_DE_MOTIVO = 200
// El monto, en la moneda de la empresa: de 0 a menos de un billón, con hasta 2 decimales.
export const MONTO_MAXIMO = 1_000_000_000_000

export const ESTADOS_DE_OPORTUNIDAD = ['abierta', 'ganada', 'perdida', 'cancelada'] as const
export type EstadoDeOportunidad = (typeof ESTADOS_DE_OPORTUNIDAD)[number]

export const ETIQUETA_DEL_ESTADO: Record<EstadoDeOportunidad, string> = {
  abierta: 'Abierta',
  ganada: 'Ganada',
  perdida: 'Perdida',
  cancelada: 'Cancelada',
}

export type Oportunidad = VehiculoDeLaNota & {
  id: string
  leadId: string
  embudoId: string
  etapaId: string
  estado: EstadoDeOportunidad
  titulo: string
  notas: string | null
  monto: number | null
  moneda: string
  motivoPerdida: string | null
  // Cuándo entró a su etapa (lo sella la base al crearla y al moverla).
  enEtapaDesde: string
  actualizadoEn: string
  eliminada: boolean
}

// Con su etapa y su embudo (la sección de la ficha).
export type OportunidadDelLead = Oportunidad & {
  etapa: Pick<EtapaGuardada, 'id' | 'nombre' | 'color' | 'esGanada' | 'esPerdida'>
  embudo: { id: string; nombre: string }
}

const numero = z.union([z.number(), z.string()]).transform((v) => Number(v))

export const esquemaOportunidad = z.object({
  id: z.guid(),
  lead_id: z.guid(),
  embudo_id: z.guid(),
  etapa_id: z.guid(),
  estado: z.enum(ESTADOS_DE_OPORTUNIDAD),
  titulo: z.string().min(1),
  notas: z.string().nullable(),
  monto_estimado: numero.nullable(),
  moneda: z.string().length(3),
  motivo_perdida: z.string().nullable(),
  ultima_actividad_en: z.string().min(1),
  actualizado_en: z.string().min(1),
  eliminado: z.boolean(),
})

// `crudo` es la misma fila: el vehículo lo lee `vehiculoDeNotaDesde` (anidado, como en las notas).
function desdeFila(f: z.infer<typeof esquemaOportunidad>, crudo: unknown): Oportunidad {
  return {
    id: f.id,
    leadId: f.lead_id,
    embudoId: f.embudo_id,
    etapaId: f.etapa_id,
    estado: f.estado,
    titulo: f.titulo,
    notas: f.notas,
    monto: f.monto_estimado,
    moneda: f.moneda,
    motivoPerdida: f.motivo_perdida,
    enEtapaDesde: f.ultima_actividad_en,
    actualizadoEn: f.actualizado_en,
    eliminada: f.eliminado,
    ...vehiculoDeNotaDesde(crudo),
  }
}

// Una oportunidad como la devuelven las RPC (`_oportunidad_json`). Rota: `null`.
export function oportunidadDesde(crudo: unknown): Oportunidad | null {
  const leida = esquemaOportunidad.safeParse(crudo)
  return leida.success ? desdeFila(leida.data, crudo) : null
}

const esquemaDelLead = esquemaOportunidad.extend({
  etapa: esquemaEtapa.pick({
    id: true,
    nombre: true,
    color: true,
    es_ganada: true,
    es_perdida: true,
  }),
  embudo: z.object({ id: z.guid(), nombre: z.string().min(1) }),
})

// Cuántas oportunidades de un lead trae `lead_oportunidades()` (espejo de su `limit 100`): más allá se avisa.
export const TOPE_DE_OPORTUNIDADES_DEL_LEAD = 100

// Lo que entrega `lead_oportunidades()`: las mías sobre ese lead y si puedo crear.
export function oportunidadesDelLeadDesde(
  crudo: unknown,
): { puedoCrear: boolean; hayMas: boolean; oportunidades: OportunidadDelLead[] } | null {
  const leido = z
    .object({
      puedo_crear: z.boolean(),
      hay_mas: z.boolean().default(false),
      oportunidades: z.array(z.unknown()),
    })
    .safeParse(crudo)
  if (!leido.success) {
    return null
  }
  const oportunidades = leido.data.oportunidades.flatMap((una) => {
    const fila = esquemaDelLead.safeParse(una)
    if (!fila.success) {
      return []
    }
    const { etapa, embudo } = fila.data
    const completa = etapaDesde({ ...etapa, es_inicial: false })
    return [
      {
        ...desdeFila(fila.data, una),
        etapa: {
          id: completa.id,
          nombre: completa.nombre,
          color: completa.color,
          esGanada: completa.esGanada,
          esPerdida: completa.esPerdida,
        },
        embudo,
      },
    ]
  })
  return { puedoCrear: leido.data.puedo_crear, hayMas: leido.data.hay_mas, oportunidades }
}

// Lo que se escribe en el formulario de una oportunidad: texto, como en los campos.
export type ValoresDeOportunidad = {
  titulo: string
  monto: string
  notas: string
  // '' (ninguno), el id, o `oculto` (conservar uno que ya no se ve): como en las notas.
  vehiculo: string
}

// El monto tipeado: acepta «25000», «25.000,50» o «25000.5». Vacío es «sin monto».
export function montoDesdeTexto(texto: string): number | null | 'invalido' {
  const limpio = texto.trim().replace(/\s/g, '')
  if (limpio === '') {
    return null
  }
  // El separador decimal es el último «,» o «.» seguido de 1 o 2 dígitos al final; los demás son de miles.
  const decimal = /[.,](\d{1,2})$/.exec(limpio)
  const entero = decimal ? limpio.slice(0, decimal.index) : limpio
  if (!/^\d{1,3}([.,]?\d{3})*$|^\d+$/.test(entero)) {
    return 'invalido'
  }
  const valor = Number(`${entero.replace(/[.,]/g, '')}${decimal ? `.${decimal[1] ?? ''}` : ''}`)
  return Number.isFinite(valor) ? valor : 'invalido'
}

export type ErroresDeOportunidad = Partial<Record<'titulo' | 'monto_estimado' | 'notas', string>>

// Lo que pasa antes de enviar, con el mismo mensaje que la base y por campo.
export function validarOportunidad(valores: ValoresDeOportunidad): ErroresDeOportunidad {
  const errores: ErroresDeOportunidad = {}
  const titulo = valores.titulo.trim()
  if (titulo.length < 1 || titulo.length > LARGO_MAXIMO_DE_TITULO) {
    errores.titulo = `El título lleva entre 1 y ${String(LARGO_MAXIMO_DE_TITULO)} caracteres.`
  }
  const monto = montoDesdeTexto(valores.monto)
  if (monto === 'invalido') {
    errores.monto_estimado = 'Escribe el monto con números, por ejemplo 25000 o 25.000,50.'
  } else if (monto !== null && monto >= MONTO_MAXIMO) {
    errores.monto_estimado = 'El monto es demasiado grande.'
  }
  if (valores.notas.trim().length > LARGO_MAXIMO_DE_NOTAS) {
    errores.notas = `Las notas llevan hasta ${String(LARGO_MAXIMO_DE_NOTAS)} caracteres.`
  }
  return errores
}

// Con qué arranca el formulario: vacío para una nueva, lo guardado para editar.
export function valoresDeOportunidad(oportunidad: Oportunidad | null): ValoresDeOportunidad {
  if (!oportunidad) {
    return { titulo: '', monto: '', notas: '', vehiculo: '' }
  }
  return {
    titulo: oportunidad.titulo,
    monto: oportunidad.monto === null ? '' : String(oportunidad.monto),
    notas: oportunidad.notas ?? '',
    vehiculo: valorDeVehiculo(oportunidad),
  }
}

export type DatosDeOportunidad = {
  titulo: string
  monto_estimado: number | null
  notas: string | null
  vehiculo_id: string | null
}

// Lo que viaja al crear (con los valores ya validados).
export function datosDeOportunidad(valores: ValoresDeOportunidad): DatosDeOportunidad {
  const monto = montoDesdeTexto(valores.monto)
  return {
    titulo: valores.titulo.trim(),
    monto_estimado: typeof monto === 'number' ? monto : null,
    notas: valores.notas.trim() === '' ? null : valores.notas.trim(),
    vehiculo_id: vehiculoAlCrear(valores.vehiculo),
  }
}

// Al editar, sólo lo que cambió. Un vehículo `oculto` que sigue así no viaja (se conserva).
export function cambiosDeOportunidad(
  antes: Oportunidad,
  valores: ValoresDeOportunidad,
): Partial<DatosDeOportunidad> {
  const datos = datosDeOportunidad(valores)
  const cambios: Partial<DatosDeOportunidad> = {}
  if (datos.titulo !== antes.titulo) {
    cambios.titulo = datos.titulo
  }
  if (datos.monto_estimado !== antes.monto) {
    cambios.monto_estimado = datos.monto_estimado
  }
  if (datos.notas !== antes.notas) {
    cambios.notas = datos.notas
  }
  const vehiculo = cambioDeVehiculo(valores.vehiculo, antes)
  if (vehiculo.cambia) {
    cambios.vehiculo_id = vehiculo.vehiculoId
  }
  return cambios
}

// El motivo de pérdida, al mover a una etapa perdida: opcional y corto.
export function validarMotivo(motivo: string): string | null {
  return motivo.trim().length > LARGO_MAXIMO_DE_MOTIVO
    ? `El motivo lleva hasta ${String(LARGO_MAXIMO_DE_MOTIVO)} caracteres.`
    : null
}

// «Nueva oportunidad» y «Editar» en la URL de la ficha.
export const PANEL_NUEVA_OPORTUNIDAD = 'nueva-oportunidad'
export const PANEL_EDITAR_OPORTUNIDAD = 'editar-oportunidad'
export const CLAVE_DE_OPORTUNIDAD = 'oportunidad'

// «Mover a …» una etapa perdida, que pregunta el motivo, en la URL (`?panel=mover-oportunidad&oportunidad=<id>&destino=<id>`).
// Se abre desde el menú «Mover a…» del kanban y de la ficha; la oportunidad es la misma clave que usa «Editar».
export const PANEL_MOVER_OPORTUNIDAD = 'mover-oportunidad'
// No `etapa`: en el celular `?etapa=` es la pestaña elegida del tablero (`CLAVE_DE_ETAPA`) y el modal la pisaría.
export const CLAVE_DE_ETAPA_A_MOVER = 'destino'
export const MENSAJE_DE_OPORTUNIDAD_A_MOVER_NO_DISPONIBLE =
  'Esa oportunidad ya no está en la lista.'

// Por qué `?panel=mover-oportunidad` no abre: la oportunidad no está entre las cargadas (otra persona la eliminó,
// o no se cargó), la etapa no existe en su embudo, ya está en ella o no pide un motivo (sólo las perdidas lo piden;
// las demás se mueven con un clic). Nulo = se puede abrir. Se revisa una vez, al llegar.
export function motivoParaNoMover(
  oportunidad: { etapaId: string } | null,
  etapas: readonly EtapaGuardada[],
  etapaId: string | null,
): string | null {
  if (oportunidad === null) {
    return MENSAJE_DE_OPORTUNIDAD_A_MOVER_NO_DISPONIBLE
  }
  const destino = etapaId === null ? undefined : etapas.find((e) => e.id === etapaId)
  if (!destino) {
    return 'Esa etapa ya no existe en este embudo.'
  }
  if (destino.id === oportunidad.etapaId) {
    return `La oportunidad ya está en «${destino.nombre}».`
  }
  return destino.esPerdida
    ? null
    : `Pasar a «${destino.nombre}» no pide un motivo: se mueve desde «Mover a…».`
}
