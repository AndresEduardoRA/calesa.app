// Los recordatorios de quien mira sobre un lead: lo que entrega la base (`recordatorios_vista` y
// las RPC `recordatorio_*`), cómo se lee y en qué orden se muestran. Son personales: sólo los ve y
// los toca su dueño. Si pierde el lead, el recordatorio sigue y llega sin él.
import { z } from 'zod'
import {
  cambioDeVehiculo,
  valorDeVehiculo,
  vehiculoAlCrear,
  vehiculoDeNotaDesde,
  type VehiculoDeLaNota,
} from './vehiculo-de-nota'

export const LARGO_MAXIMO_DEL_RECORDATORIO = 120
export const MENSAJE_DE_RECORDATORIO_NO_DISPONIBLE = 'No encontramos este recordatorio.'
export const MENSAJE_DE_RECORDATORIO_COMPLETADO =
  'Ese recordatorio está completado: reábrelo para editarlo.'

// Agendar y editar son un modal con su URL: `?panel=agendar-recordatorio` y
// `?panel=editar-recordatorio&recordatorio=<id>`. Comparten `?panel=` con los demás paneles de la ficha.
export const PANEL_AGENDAR_RECORDATORIO = 'agendar-recordatorio'
export const PANEL_EDITAR_RECORDATORIO = 'editar-recordatorio'
export const CLAVE_DE_RECORDATORIO = 'recordatorio'

export type Recordatorio = {
  id: string
  titulo: string
  recordarEn: string
  // Ya avisó (la notificación de su hora, Fase 7).
  notificadoEn: string | null
  completadoEn: string | null
  // Su versión: la manda de vuelta quien edita, completa o elimina.
  actualizadoEn: string
  // Nulos si ya no ve el lead (o si es personal).
  leadId: string | null
  leadNombre: string | null
  leadNumero: number | null
} & VehiculoDeLaNota

export type EstadoDelRecordatorio = 'vencido' | 'pendiente' | 'completado'

// La respuesta de una RPC (`_recordatorio_json`) y una fila de `recordatorios_vista` dicen lo mismo;
// la de la RPC trae además si quedó eliminado.
const esquema = z.object({
  id: z.guid(),
  titulo: z.string(),
  recordar_en: z.string(),
  notificado_en: z.string().nullable(),
  completado_en: z.string().nullable(),
  actualizado_en: z.string(),
  lead_id: z.guid().nullable(),
  lead_nombre: z.string().nullable(),
  lead_numero: z.number().nullable(),
  eliminado: z.boolean().optional(),
})

export function recordatorioDesde(crudo: unknown): (Recordatorio & { eliminado: boolean }) | null {
  const leido = esquema.safeParse(crudo)
  if (!leido.success) {
    return null
  }
  const r = leido.data
  return {
    id: r.id,
    titulo: r.titulo,
    recordarEn: r.recordar_en,
    notificadoEn: r.notificado_en,
    completadoEn: r.completado_en,
    actualizadoEn: r.actualizado_en,
    leadId: r.lead_id,
    leadNombre: r.lead_nombre,
    leadNumero: r.lead_numero,
    ...vehiculoDeNotaDesde(crudo),
    eliminado: r.eliminado ?? false,
  }
}

// Las filas de `recordatorios_vista`: una que no cumple se descarta.
export function recordatoriosDesde(filas: readonly unknown[]): Recordatorio[] {
  return filas.flatMap((fila) => {
    const r = recordatorioDesde(fila)
    if (!r) {
      return []
    }
    const { eliminado: _eliminado, ...recordatorio } = r
    return [recordatorio]
  })
}

export function estadoDelRecordatorio(r: Recordatorio, ahora: string): EstadoDelRecordatorio {
  if (r.completadoEn !== null) {
    return 'completado'
  }
  return Date.parse(r.recordarEn) <= Date.parse(ahora) ? 'vencido' : 'pendiente'
}

const RANGO: Record<EstadoDelRecordatorio, number> = { vencido: 0, pendiente: 1, completado: 2 }

// Primero los vencidos (el más viejo arriba), después los pendientes (el más próximo arriba) y al
// final los completados (el último que se completó arriba).
export function ordenarRecordatorios(
  lista: readonly Recordatorio[],
  ahora: string,
): Recordatorio[] {
  const clave = (r: Recordatorio) => {
    const estado = estadoDelRecordatorio(r, ahora)
    const cuando =
      estado === 'completado' ? -Date.parse(r.completadoEn ?? '') : Date.parse(r.recordarEn)
    return [RANGO[estado], cuando] as const
  }
  return [...lista].sort((a, b) => {
    const [ra, ca] = clave(a)
    const [rb, cb] = clave(b)
    return ra === rb ? ca - cb : ra - rb
  })
}

// Pone (o reemplaza) uno en la lista; uno eliminado sale.
export function conRecordatorio(
  lista: readonly Recordatorio[],
  uno: Recordatorio & { eliminado?: boolean },
): Recordatorio[] {
  const otros = lista.filter((r) => r.id !== uno.id)
  if (uno.eliminado) {
    return otros
  }
  const { eliminado: _eliminado, ...recordatorio } = uno
  return [...otros, recordatorio]
}

export function motivoDelTituloDeRecordatorio(titulo: string): string | null {
  const limpio = titulo.trim()
  if (limpio === '') {
    return 'Escribe de qué es el recordatorio.'
  }
  return limpio.length > LARGO_MAXIMO_DEL_RECORDATORIO
    ? `El recordatorio admite hasta ${String(LARGO_MAXIMO_DEL_RECORDATORIO)} caracteres.`
    : null
}

// --- Qué se manda desde el formulario --------------------------------------------------------------

export type ErroresDelRecordatorio = Partial<Record<'titulo' | 'recordarEn', string>>

export type PedidoDeRecordatorio =
  | { tipo: 'invalido'; errores: ErroresDelRecordatorio }
  | { tipo: 'sin_cambios' }
  | {
      tipo: 'crear'
      pedido: {
        id: string
        leadId: string
        titulo: string
        recordarEn: string
        vehiculoId: string | null
      }
    }
  | {
      tipo: 'guardar'
      pedido: {
        id: string
        actualizadoEnEsperado: string
        cambios: Partial<{ titulo: string; recordarEn: string; vehiculoId: string | null }>
      }
    }

// De lo escrito, lo que se manda. `validarCuando` es la regla de «a futuro, en la zona de la
// empresa» (`validarRecordatorio`). Cambiar sólo el título de uno que ya pasó no pide otra hora.
export function pedidoDeRecordatorio(args: {
  titulo: string
  // `aaaa-mm-ddThh:mm` en la zona de la empresa.
  cuando: string
  // El mismo valor, como lo mostró el formulario al abrir (vacío si es nuevo).
  cuandoOriginal: string
  original: Recordatorio | null
  intento: string
  leadId: string
  // El valor del selector de vehículo (`valorDeVehiculo()`).
  vehiculo: string
  validarCuando: (local: string) => { ok: true; recordarEn: string } | { ok: false; motivo: string }
}): PedidoDeRecordatorio {
  const { titulo, cuando, cuandoOriginal, original, intento, leadId, vehiculo, validarCuando } =
    args
  const limpio = titulo.trim()
  const motivo = motivoDelTituloDeRecordatorio(limpio)
  const mismaHora = original !== null && cuando === cuandoOriginal
  const momento = mismaHora
    ? ({ ok: true, recordarEn: original.recordarEn } as const)
    : validarCuando(cuando)
  if (motivo || !momento.ok) {
    return {
      tipo: 'invalido',
      errores: {
        ...(motivo ? { titulo: motivo } : {}),
        ...(momento.ok ? {} : { recordarEn: momento.motivo }),
      },
    }
  }
  if (!original) {
    return {
      tipo: 'crear',
      pedido: {
        id: intento,
        leadId,
        titulo: limpio,
        recordarEn: momento.recordarEn,
        vehiculoId: vehiculoAlCrear(vehiculo),
      },
    }
  }
  const cambioDelVehiculo = cambioDeVehiculo(vehiculo, original)
  const cambios = {
    ...(limpio === original.titulo ? {} : { titulo: limpio }),
    ...(mismaHora ? {} : { recordarEn: momento.recordarEn }),
    ...(cambioDelVehiculo.cambia ? { vehiculoId: cambioDelVehiculo.vehiculoId } : {}),
  }
  return Object.keys(cambios).length === 0
    ? { tipo: 'sin_cambios' }
    : {
        tipo: 'guardar',
        pedido: { id: original.id, actualizadoEnEsperado: original.actualizadoEn, cambios },
      }
}

export type RecordatorioParaEditar =
  | { tipo: 'editable'; recordatorio: Recordatorio }
  | { tipo: 'completado'; recordatorio: Recordatorio }
  | { tipo: 'no_esta' }

// El de `?recordatorio=<id>` entre los de quien mira. La lista sólo trae los suyos y vivos: uno
// ajeno, eliminado, inventado o mal escrito «no está», todos igual. Uno completado no se edita.
export function recordatorioParaEditar(
  lista: readonly Recordatorio[],
  id: string,
): RecordatorioParaEditar {
  const recordatorio = lista.find((r) => r.id === id)
  if (!recordatorio) {
    return { tipo: 'no_esta' }
  }
  return recordatorio.completadoEn === null
    ? { tipo: 'editable', recordatorio }
    : { tipo: 'completado', recordatorio }
}

// Lo escrito en el modal de un recordatorio.
export type ValoresDelRecordatorio = { titulo: string; cuando: string; vehiculo: string }

// Con qué arranca: vacío al agendar; lo guardado al editar (`cuando` en la zona de la empresa).
export function valoresDelRecordatorio(
  original: Recordatorio | null,
  cuandoOriginal: string,
): ValoresDelRecordatorio {
  return {
    titulo: original?.titulo ?? '',
    cuando: cuandoOriginal,
    vehiculo: valorDeVehiculo(original),
  }
}

// Cerrar ahora perdería algo: se pregunta antes. Los espacios alrededor del título no cuentan (no se
// guardan).
export function hayCambiosEnRecordatorio(
  valores: ValoresDelRecordatorio,
  inicial: ValoresDelRecordatorio,
): boolean {
  return (
    valores.titulo.trim() !== inicial.titulo.trim() ||
    valores.cuando !== inicial.cuando ||
    valores.vehiculo !== inicial.vehiculo
  )
}

// Llegó otra versión del recordatorio (tras «Recargar»): lo que la persona no tocó toma lo nuevo; lo
// que cambió se queda. Así guardar no pisa con lo viejo un campo que cambió la otra ventana.
export function conVersionNueva(
  valores: ValoresDelRecordatorio,
  antes: ValoresDelRecordatorio,
  ahora: ValoresDelRecordatorio,
): ValoresDelRecordatorio {
  const campo = (clave: keyof ValoresDelRecordatorio) =>
    valores[clave] === antes[clave] ? ahora[clave] : valores[clave]
  return { titulo: campo('titulo'), cuando: campo('cuando'), vehiculo: campo('vehiculo') }
}
