// La papelera de vehículos: lo que se envía sale del inventario para todos y se puede restaurar
// hasta que se purga. Un envío es un lote (`lotes_papelera`), de 1 a 200, y el lote es lo que se
// restaura o se purga, entero o por partes. Las reglas las aplica la base (`vehiculos_papelera_*`);
// acá se lee lo que responde y se lo pone en palabras.
import { z } from 'zod'
import type { CodigoError, ErrorApp } from '@/shared/lib/errores'
import { puede, type Permisos } from '@/shared/lib/permisos'

export const MAXIMO_POR_LOTE = 200

export type VehiculoEnPapelera = {
  id: string
  numero: number
  titulo: string
  origenId: string
  // La miniatura de su portada (ruta en el bucket `vehiculos`); null = sin fotos.
  miniatura: string | null
  fotos: number
  // Por qué no se purga (algo cambió mientras estaba adentro); null = se puede.
  motivoDeBloqueo: string | null
}

export type LoteDePapelera = {
  id: string
  // La versión del lote: restaurar y purgar la mandan.
  actualizadoEn: string
  creadoEn: string
  // Quién lo envió; null si esa persona ya no tiene nombre que mostrar.
  creadoPorNombre: string | null
  esMio: boolean
  // Lo armó la limpieza automática: no tiene autor, y restaurar sus vehículos los deja conservados.
  esLimpieza: boolean
  // Cuándo lo purga el job si nadie lo restaura: `creado_en + papelera_dias`.
  purgaEl: string
  // Cuántos se enviaron; los que quedan son `vehiculos`.
  enviados: number
  vehiculos: VehiculoEnPapelera[]
}

const esquemaLotes = z.array(
  z.object({
    id: z.guid(),
    actualizado_en: z.string(),
    creado_en: z.string(),
    creado_por_nombre: z.string().nullable(),
    es_mio: z.boolean(),
    es_limpieza: z.boolean().catch(false),
    purga_el: z.string(),
    enviados: z.number(),
    vehiculos: z.array(
      z.object({
        id: z.guid(),
        numero: z.number(),
        titulo: z.string(),
        origen_id: z.guid(),
        miniatura: z.string().nullable(),
        fotos: z.number(),
        motivo_de_bloqueo: z.string().nullable(),
      }),
    ),
  }),
)

// La respuesta de `vehiculos_papelera_listar()`: los lotes que todavía tienen algo adentro, del
// más nuevo al más viejo.
export function lotesDesde(dato: unknown): LoteDePapelera[] {
  return esquemaLotes.parse(dato).map((lote) => ({
    id: lote.id,
    actualizadoEn: lote.actualizado_en,
    creadoEn: lote.creado_en,
    creadoPorNombre: lote.creado_por_nombre,
    esMio: lote.es_mio,
    esLimpieza: lote.es_limpieza,
    purgaEl: lote.purga_el,
    enviados: lote.enviados,
    vehiculos: lote.vehiculos.map((vehiculo) => ({
      id: vehiculo.id,
      numero: vehiculo.numero,
      titulo: vehiculo.titulo,
      origenId: vehiculo.origen_id,
      miniatura: vehiculo.miniatura,
      fotos: vehiculo.fotos,
      motivoDeBloqueo: vehiculo.motivo_de_bloqueo,
    })),
  }))
}

// ---------------------------------------------------------------------------
// Lo que responde cada operación: siempre un resultado parcial
// ---------------------------------------------------------------------------

type Hecho = { id: string; titulo: string }
// Lo que no se hizo, con el motivo que dio la base. Sin título cuando quien llama no lo ve.
type NoHecho = { id: string; titulo: string | null; motivo: string }

export type ResultadoDeEnvio = {
  // null = no se envió ninguno: no quedó lote.
  lote: string | null
  actualizadoEn: string | null
  enviados: (Hecho & { despublicado: boolean })[]
  rechazados: (NoHecho & { codigo: string })[]
}

const esquemaEnvio = z.object({
  lote: z.guid().nullable(),
  actualizado_en: z.string().nullable(),
  enviados: z.array(z.object({ id: z.guid(), titulo: z.string(), despublicado: z.boolean() })),
  rechazados: z.array(
    z.object({
      id: z.guid(),
      titulo: z.string().nullable(),
      codigo: z.string(),
      motivo: z.string(),
    }),
  ),
})

export function envioDesde(dato: unknown): ResultadoDeEnvio {
  const fila = esquemaEnvio.parse(dato)
  return {
    lote: fila.lote,
    actualizadoEn: fila.actualizado_en,
    enviados: fila.enviados,
    rechazados: fila.rechazados,
  }
}

export type ResultadoDeRestaurar = {
  actualizadoEn: string
  restaurados: Hecho[]
  // Chocan con un VIN o un lote de subasta que ya tomó otro: siguen en la papelera.
  pendientes: NoHecho[]
  quedan: number
}

export type ResultadoDePurgar = {
  actualizadoEn: string
  purgados: Hecho[]
  bloqueados: NoHecho[]
  quedan: number
}

const hecho = z.object({ id: z.guid(), titulo: z.string() })
const noHecho = z.object({ id: z.guid(), titulo: z.string().nullable(), motivo: z.string() })
const esquemaRestauracion = z.object({
  actualizado_en: z.string(),
  restaurados: z.array(hecho),
  pendientes: z.array(noHecho),
  quedan: z.number(),
})
const esquemaPurga = z.object({
  actualizado_en: z.string(),
  purgados: z.array(hecho),
  bloqueados: z.array(noHecho),
  quedan: z.number(),
})

export function restauracionDesde(dato: unknown): ResultadoDeRestaurar {
  const fila = esquemaRestauracion.parse(dato)
  return {
    actualizadoEn: fila.actualizado_en,
    restaurados: fila.restaurados,
    pendientes: fila.pendientes,
    quedan: fila.quedan,
  }
}

export function purgaDesde(dato: unknown): ResultadoDePurgar {
  const fila = esquemaPurga.parse(dato)
  return {
    actualizadoEn: fila.actualizado_en,
    purgados: fila.purgados,
    bloqueados: fila.bloqueados,
    quedan: fila.quedan,
  }
}

// ---------------------------------------------------------------------------
// El resultado, dicho entero
// ---------------------------------------------------------------------------

// Cuántos motivos se escriben antes de resumir el resto.
const MOTIVOS_A_LA_VISTA = 3

const nombrar = (titulo: string | null) => (titulo ? `«${titulo}»` : 'Uno que no ves')

type Palabras = {
  // ««X» se envió a la papelera.»
  uno: (titulo: string) => string
  // «Se enviaron 7», «Se envió 1»: sin el punto, para sumarle «de 9».
  varios: (cantidad: number) => string
  // «a la papelera»: lo que sigue a la cuenta.
  cola: string
  // «No se envió»
  noSeHizo: string
}

function resumir(hechos: readonly Hecho[], noHechos: readonly NoHecho[], palabras: Palabras) {
  const total = hechos.length + noHechos.length
  const frases: string[] = []
  const [unico] = hechos
  if (total === 1 && unico) {
    frases.push(palabras.uno(unico.titulo))
  } else if (hechos.length > 0) {
    const cuenta = palabras.varios(hechos.length)
    frases.push(`${cuenta}${noHechos.length > 0 ? ` de ${String(total)}` : ''}${palabras.cola}.`)
  } else if (total > 1) {
    frases.push(`${palabras.noSeHizo} ninguno.`)
  }
  for (const uno of noHechos.slice(0, MOTIVOS_A_LA_VISTA)) {
    frases.push(`${palabras.noSeHizo} ${nombrar(uno.titulo)}: ${uno.motivo}`)
  }
  const resto = noHechos.length - MOTIVOS_A_LA_VISTA
  if (resto > 0) {
    frases.push(`Y ${String(resto)} más.`)
  }
  return frases.join(' ')
}

const plural = (cantidad: number, uno: string, varios: string) =>
  `${cantidad === 1 ? uno : varios} ${String(cantidad)}`

export function resumenDeEnvio(envio: ResultadoDeEnvio): string {
  const base = resumir(envio.enviados, envio.rechazados, {
    uno: (titulo) => `«${titulo}» se envió a la papelera.`,
    varios: (cantidad) => plural(cantidad, 'Se envió', 'Se enviaron'),
    cola: ' a la papelera',
    noSeHizo: 'No se envió',
  })
  const despublicados = envio.enviados.filter((uno) => uno.despublicado).length
  if (despublicados === 0) {
    return base
  }
  return `${base} ${despublicados === 1 && envio.enviados.length === 1 ? 'Se quitó de la web.' : `${plural(despublicados, 'Se quitó', 'Se quitaron')} de la web.`}`
}

export function resumenDeRestauracion(restauracion: ResultadoDeRestaurar): string {
  return resumir(restauracion.restaurados, restauracion.pendientes, {
    uno: (titulo) => `«${titulo}» volvió al inventario.`,
    varios: (cantidad) => plural(cantidad, 'Se restauró', 'Se restauraron'),
    cola: '',
    noSeHizo: 'No se restauró',
  })
}

export function resumenDePurga(purga: ResultadoDePurgar): string {
  return resumir(purga.purgados, purga.bloqueados, {
    uno: (titulo) => `«${titulo}» se purgó.`,
    varios: (cantidad) => plural(cantidad, 'Se purgó', 'Se purgaron'),
    cola: '',
    noSeHizo: 'No se purgó',
  })
}

const CODIGO_POR_RECHAZO: Record<string, CodigoError> = {
  PT409: 'conflicto',
  '42501': 'sin_permiso',
}

// Cuando no se envió ninguno, el resultado es un error: si era uno solo y otra persona lo cambió,
// es un conflicto (y ofrece «Recargar»).
export function errorDeEnvio(envio: ResultadoDeEnvio): ErrorApp {
  const [unico, ...mas] = envio.rechazados
  const codigo = unico && mas.length === 0 ? CODIGO_POR_RECHAZO[unico.codigo] : undefined
  return { codigo: codigo ?? 'regla', mensaje: resumenDeEnvio(envio) }
}

// ---------------------------------------------------------------------------
// Cuándo se purga
// ---------------------------------------------------------------------------

const UN_DIA = 86_400_000

// Días enteros que faltan; cero = ya venció y lo toma la próxima pasada del job.
export function diasParaLaPurga(purgaEl: string, ahora: string): number {
  const faltan = (new Date(purgaEl).getTime() - new Date(ahora).getTime()) / UN_DIA
  return faltan > 0 ? Math.ceil(faltan) : 0
}

export function textoDePurga(dias: number): string {
  if (dias <= 0) {
    return 'Se purga en la próxima pasada'
  }
  return dias === 1 ? 'Se purga mañana' : `Se purga en ${String(dias)} días`
}

// Lo que hay que tipear para purgar un lote de varios: ata la confirmación a su tamaño.
export function palabraDePurga(cantidad: number): string {
  return `purgar ${String(cantidad)}`
}

// ---------------------------------------------------------------------------
// Quién envía, y qué se sabe de antemano que no va
// ---------------------------------------------------------------------------

// Lo que la base va a rechazar y la pantalla ya sabe: se dice antes de intentar. Los textos son
// los de `_vehiculo_motivo_de_bloqueo()`; lo demás (dinero, aduana, repuestos) lo dice ella.
export function motivoParaNoEnviar(
  vehiculo: { leadId: string | null; faseId: string | null },
  fase: { nombre: string; esInicial: boolean } | null,
): string | null {
  if (vehiculo.leadId !== null) {
    return 'Está vinculado a un lead. Quita el vínculo antes.'
  }
  if (vehiculo.faseId !== null && fase && !fase.esInicial) {
    return `Está en «${fase.nombre}». Sólo va a la papelera lo que sigue en su fase inicial.`
  }
  return null
}

export type PermisoDePapelera =
  // Sin `vehiculos.eliminar` sobre ese vehículo la acción no existe.
  { estado: 'oculto' } | { estado: 'deshabilitado'; motivo: string } | { estado: 'habilitado' }

export function permisoDePapelera(
  puedeEliminar: boolean,
  motivo: string | null,
): PermisoDePapelera {
  if (!puedeEliminar) {
    return { estado: 'oculto' }
  }
  return motivo === null ? { estado: 'habilitado' } : { estado: 'deshabilitado', motivo }
}

// La papelera la abre quien envía en algún origen (ve lo suyo) o quien puede vaciarla (ve todo).
export function puedeAbrirLaPapelera(permisos: Permisos): boolean {
  return puede(permisos, 'vehiculos.eliminar') || puede(permisos, 'vehiculos.papelera.purgar')
}

export function puedePurgar(permisos: Permisos): boolean {
  return puede(permisos, 'vehiculos.papelera.purgar')
}

// Lo que ya debía haberse borrado de Storage y sigue ahí: señal de que la limpieza no corre.
export type LimpiezaPendiente = { objetos: number; desde: string }

const esquemaPendiente = z.object({ objetos: z.number(), desde: z.string().nullable() })

export function limpiezaPendienteDesde(dato: unknown): LimpiezaPendiente | null {
  if (dato === null || dato === undefined) {
    return null
  }
  const fila = esquemaPendiente.parse(dato)
  return fila.objetos > 0 && fila.desde ? { objetos: fila.objetos, desde: fila.desde } : null
}
