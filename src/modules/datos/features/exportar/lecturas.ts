import 'server-only'
import type { Resultado } from '@/shared/lib/errores'
import { puede, type Permisos } from '@/shared/lib/permisos'
import { prepararSesion, registrarExportacion, type ClienteDelFlujo } from '../../composicion'
import {
  TOPE_POR_ENTIDAD,
  filtrosDelPedido,
  nombreDelArchivo,
  rangoDelPedido,
  type Pedido,
  type SalidaDeExportacionTotal,
} from '../../entities/exportacion'
import { armarFlujo } from './flujo'
import { fuenteDeCotizaciones } from './fuente-de-cotizaciones'
import { fuenteDeLeads, type Fuente } from './fuente-de-leads'
import { fuenteDeVehiculos } from './fuente-de-vehiculos'

type Entrada = {
  pedido: Pedido
  // Los efectivos de la sesión: si no lo tiene, ni se cuenta. La autoridad es la base (el registrar da 42501 sin el permiso real).
  permisos: Permisos
  zona: string
  codigoDePais: string | null
  // La de los ajustes de la empresa (el encabezado del total de las cotizaciones); nula si no se pudieron leer.
  monedaBase: string | null
  ahora?: () => number
}

type Sesion = { cliente: ClienteDelFlujo; venceEn: number }

const NO_SE_PUDO = 'No pudimos preparar la exportación. Vuelve a intentarlo.'

// Exportar todo (9.05-2, `datos.exportar.todo`). El orden es el contrato: el permiso, la sesión, la fuente de la entidad (su layout y sus
// catálogos), el conteo hasta el tope (con más, o con ninguna, no se registra nada), **la constancia** (`datos_exportacion_registrar`: permiso real
// y 3 por hora) y recién después el flujo. Ningún byte del archivo sale antes de la constancia, nunca se registra dos veces y el archivo no pasa
// las filas registradas. El orden está escrito una sola vez (`seguirCon`): cada entidad sólo trae su fuente.
export async function exportarTodo(entrada: Entrada): Promise<SalidaDeExportacionTotal> {
  const { pedido, permisos, zona, codigoDePais, monedaBase, ahora = Date.now } = entrada
  if (!puede(permisos, 'datos.exportar.todo')) {
    return { tipo: 'sin_permiso' }
  }
  const sesion = await prepararSesion(ahora())
  if (!sesion.ok) {
    return { tipo: 'sesion' }
  }
  const { cliente } = sesion.data
  switch (pedido.entidad) {
    case 'leads':
      return seguirCon(
        await fuenteDeLeads({
          cliente,
          zona,
          codigoDePais,
          conNumeroGlobal: puede(permisos, 'leads.numero_global.ver'),
        }),
        { pedido, sesion: sesion.data, zona, ahora },
      )
    case 'vehiculos':
      return seguirCon(await fuenteDeVehiculos({ cliente, origenId: pedido.origen, zona }), {
        pedido,
        sesion: sesion.data,
        zona,
        ahora,
      })
    case 'cotizaciones':
      return seguirCon(
        await fuenteDeCotizaciones({
          cliente,
          origenId: pedido.origen ?? null,
          zona,
          monedaBase,
          conClientes: puede(permisos, 'leads.ver'),
        }),
        { pedido, sesion: sesion.data, zona, ahora },
      )
  }
}

// Lo común a toda entidad, una vez que su fuente está lista: contar, registrar y armar el flujo.
// Una fuente `null` es un origen que no está: lo mismo que uno donde no se ve nada (no dice si existe), sin contar ni registrar.
async function seguirCon<Fila>(
  fuente: Resultado<Fuente<Fila> | null>,
  {
    pedido,
    sesion,
    zona,
    ahora,
  }: { pedido: Pedido; sesion: Sesion; zona: string; ahora: () => number },
): Promise<SalidaDeExportacionTotal> {
  if (!fuente.ok) {
    return { tipo: 'error', mensaje: NO_SE_PUDO }
  }
  if (fuente.data === null) {
    return { tipo: 'vacia' }
  }
  const corte = new Date(ahora()).toISOString()
  const rango = rangoDelPedido(pedido, zona, corte)
  const tope = TOPE_POR_ENTIDAD[pedido.entidad]

  const { lector, columnas, etiqueta } = fuente.data
  const contadas = await lector.contar(rango, tope)
  if (!contadas.ok) {
    return { tipo: 'error', mensaje: NO_SE_PUDO }
  }
  if (contadas.data.hayMas) {
    return { tipo: 'demasiadas', tope }
  }
  const filas = contadas.data.n
  if (filas === 0) {
    return { tipo: 'vacia' }
  }

  const registro = await registrarExportacion(sesion.cliente)(
    pedido.entidad,
    filas,
    filtrosDelPedido(pedido),
  )
  if (!registro.ok) {
    return registro.error.codigo === 'sin_permiso'
      ? { tipo: 'sin_permiso' }
      : { tipo: 'error', mensaje: NO_SE_PUDO }
  }
  if (!registro.data.ok) {
    return { tipo: 'limite', libreEn: registro.data.libreEn }
  }

  return {
    tipo: 'listo',
    nombre: nombreDelArchivo(pedido.entidad, corte, zona, etiqueta),
    filas,
    flujo: armarFlujo({
      lector,
      columnas,
      rango,
      filas,
      delimitador: pedido.delimitador,
      venceEn: sesion.venceEn,
      ahora,
    }),
  }
}
