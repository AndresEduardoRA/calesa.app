// La vitrina: qué significa que un vehículo esté publicado, cuándo se ve de verdad en la web
// pública y qué se le pide al precio público. La regla la aplica la base
// (`interno.vitrina_vehiculos`); acá sólo se lee lo que ella responde y se lo pone en palabras.
import { z } from 'zod'
import { puede, type Permisos } from '@/shared/lib/permisos'

// Lo que hace falta, además de la marca del vehículo, para que algo de un origen se vea.
export type VitrinaDelOrigen = {
  webActiva: boolean
  origenActivo: boolean
  origenVisible: boolean
  // Las fases activas del flujo del origen que publican.
  fasesQuePublican: readonly string[]
}

// Sin respuesta de la base, nada se da por visible.
export const VITRINA_CERRADA: VitrinaDelOrigen = {
  webActiva: false,
  origenActivo: false,
  origenVisible: false,
  fasesQuePublican: [],
}

const esquemaDelOrigen = z.object({
  web_activa: z.boolean(),
  origen_activo: z.boolean(),
  origen_visible: z.boolean(),
  fases_que_publican: z.array(z.guid()),
})

// La respuesta de `vitrina_del_origen()`. Nulo = quien pregunta no ve vehículos en ese origen.
export function vitrinaDelOrigenDesde(dato: unknown): VitrinaDelOrigen {
  if (dato === null || dato === undefined) {
    return VITRINA_CERRADA
  }
  const fila = esquemaDelOrigen.parse(dato)
  return {
    webActiva: fila.web_activa,
    origenActivo: fila.origen_activo,
    origenVisible: fila.origen_visible,
    fasesQuePublican: fila.fases_que_publican,
  }
}

// ¿Algo de este origen puede verse hoy? Si no, ninguna fila del listado está en vitrina.
export function vitrinaAbierta(vitrina: VitrinaDelOrigen): boolean {
  return vitrina.webActiva && vitrina.origenActivo && vitrina.origenVisible
}

// Por qué un vehículo publicado no se ve. De lo más general a lo más particular.
export type MotivoDeNoVisible =
  'web_apagada' | 'origen_inactivo' | 'origen_no_visible' | 'sin_fase' | 'fase_no_publica'

type Condiciones = {
  webActiva: boolean
  origenActivo: boolean
  origenVisible: boolean
  conFase: boolean
  fasePublica: boolean
}

function motivosDe(condiciones: Condiciones): MotivoDeNoVisible[] {
  const motivos: MotivoDeNoVisible[] = []
  if (!condiciones.webActiva) {
    motivos.push('web_apagada')
  }
  if (!condiciones.origenActivo) {
    motivos.push('origen_inactivo')
  }
  if (!condiciones.origenVisible) {
    motivos.push('origen_no_visible')
  }
  if (!condiciones.conFase) {
    motivos.push('sin_fase')
  } else if (!condiciones.fasePublica) {
    motivos.push('fase_no_publica')
  }
  return motivos
}

// Los motivos de una fila del listado, con lo que el origen dijo de sí mismo.
export function motivosDeNoVisible(
  vehiculo: { faseId: string | null },
  vitrina: VitrinaDelOrigen,
): MotivoDeNoVisible[] {
  return motivosDe({
    ...vitrina,
    conFase: vehiculo.faseId !== null,
    fasePublica: vehiculo.faseId !== null && vitrina.fasesQuePublican.includes(vehiculo.faseId),
  })
}

// «Publicado» es la marca del vehículo; «en vitrina», que hoy se ve (docs/GLOSARIO.md).
export type EstadoDeVitrina = 'sin_publicar' | 'en_vitrina' | 'no_visible'

export function estadoDeVitrina(
  vehiculo: { publicadoWeb: boolean; faseId: string | null },
  vitrina: VitrinaDelOrigen,
): EstadoDeVitrina {
  if (!vehiculo.publicadoWeb) {
    return 'sin_publicar'
  }
  return motivosDeNoVisible(vehiculo, vitrina).length === 0 ? 'en_vitrina' : 'no_visible'
}

// Los nombres salen de las filas (origen, fase): acá no hay ninguno escrito.
export function textoDeMotivo(
  motivo: MotivoDeNoVisible,
  nombres: { origen: string; fase: string | null },
): string {
  switch (motivo) {
    case 'web_apagada':
      return 'La web pública está apagada.'
    case 'origen_inactivo':
      return `${nombres.origen} está desactivado.`
    case 'origen_no_visible':
      return `${nombres.origen} no está entre los orígenes que muestra el sitio.`
    case 'sin_fase':
      return 'Todavía no entró a ninguna fase.'
    case 'fase_no_publica':
      return nombres.fase
        ? `La fase «${nombres.fase}» no publica en la web.`
        : 'Su fase no publica en la web.'
  }
}

// Lo que un visitante ve de un vehículo: la fila de `web.vehiculos`, ni una columna más.
export type TarjetaPublica = {
  titulo: string
  marca: string | null
  modelo: string | null
  anio: number | null
  categoria: string | null
  precio: number | null
  precioHasta: number | null
  precioNota: string | null
  destacado: boolean
  // Sólo los campos del layout marcados como públicos, por su clave.
  atributos: Record<string, unknown>
  // La portada: la completa y su miniatura (rutas del bucket `vehiculos`); null = sin fotos.
  imagen: string | null
  miniatura: string | null
}

export type VistaPreviaDeVitrina = {
  tarjeta: TarjetaPublica
  publicado: boolean
  visible: boolean
  // Por qué no se ve (o no se vería al publicarlo). Vacío = nada lo impide.
  motivos: MotivoDeNoVisible[]
}

const esquemaPrevia = z.object({
  tarjeta: z.object({
    titulo: z.string(),
    marca: z.string().nullable(),
    modelo: z.string().nullable(),
    anio: z.number().nullable(),
    categoria: z.string().nullable(),
    precio: z.number().nullable(),
    precio_hasta: z.number().nullable(),
    precio_nota: z.string().nullable(),
    destacado: z.boolean(),
    atributos: z.record(z.string(), z.unknown()).catch({}),
    imagen: z.string().nullable(),
    miniatura: z.string().nullable(),
  }),
  publicado: z.boolean(),
  visible: z.boolean(),
  con_fase: z.boolean(),
  fase_publica: z.boolean(),
  origen_activo: z.boolean(),
  origen_visible: z.boolean(),
  web_activa: z.boolean(),
})

// La respuesta de `vehiculo_vitrina_previa()`. Nulo = quien pregunta no ve el vehículo.
export function vistaPreviaDesde(dato: unknown): VistaPreviaDeVitrina | null {
  if (dato === null || dato === undefined) {
    return null
  }
  const fila = esquemaPrevia.parse(dato)
  const { tarjeta } = fila
  return {
    tarjeta: {
      titulo: tarjeta.titulo,
      marca: tarjeta.marca,
      modelo: tarjeta.modelo,
      anio: tarjeta.anio,
      categoria: tarjeta.categoria,
      precio: tarjeta.precio,
      precioHasta: tarjeta.precio_hasta,
      precioNota: tarjeta.precio_nota,
      destacado: tarjeta.destacado,
      atributos: tarjeta.atributos,
      imagen: tarjeta.imagen,
      miniatura: tarjeta.miniatura,
    },
    publicado: fila.publicado,
    visible: fila.visible,
    motivos: motivosDe({
      webActiva: fila.web_activa,
      origenActivo: fila.origen_activo,
      origenVisible: fila.origen_visible,
      conFase: fila.con_fase,
      fasePublica: fila.fase_publica,
    }),
  }
}

// ---------------------------------------------------------------------------
// El formulario de publicar
// ---------------------------------------------------------------------------

// Lo que admite la base (`vehiculo_vitrina`).
export const PRECIO_PUBLICO_MAXIMO = 999_999_999_999
export const LARGO_DE_NOTA_DE_PRECIO = 120

// Lo que la persona ve y escribe.
export type ValoresDeVitrina = {
  publicado: boolean
  precio: string
  precioHasta: string
  nota: string
  destacado: boolean
}

// Lo que se guarda. Precio nulo = «Consultar».
export type DatosDeVitrina = {
  publicado: boolean
  precio: number | null
  precioHasta: number | null
  nota: string | null
  destacado: boolean
}

export type CampoDeVitrina = 'precio' | 'precioHasta' | 'nota'

type Publicado = {
  publicadoWeb: boolean
  precioWeb: number | null
  precioWebHasta: number | null
  precioWebNota: string | null
  destacadoWeb: boolean
}

const comoTexto = (numero: number | null) => (numero === null ? '' : String(numero))

export function valoresDeVitrina(vehiculo: Publicado): ValoresDeVitrina {
  return {
    publicado: vehiculo.publicadoWeb,
    precio: comoTexto(vehiculo.precioWeb),
    precioHasta: comoTexto(vehiculo.precioWebHasta),
    nota: vehiculo.precioWebNota ?? '',
    destacado: vehiculo.destacadoWeb,
  }
}

// Acepta la coma decimal: «21500,5» es 21500.5. `undefined` = no es un número.
function precioDe(escrito: string): number | null | undefined {
  const limpio = escrito.trim()
  if (limpio === '') {
    return null
  }
  const numero = Number(limpio.replace(',', '.'))
  return Number.isFinite(numero) && numero >= 0 && numero <= PRECIO_PUBLICO_MAXIMO
    ? Math.round(numero * 100) / 100
    : undefined
}

export type ValidacionDeVitrina =
  | { ok: true; datos: DatosDeVitrina }
  | { ok: false; porCampo: Partial<Record<CampoDeVitrina, string>> }

const NO_ES_PRECIO = 'Tiene que ser un número, de cero para arriba.'

// Lo que no pasa del «hasta», mirando también el precio. `undefined` = no es un número.
function errorDeHasta(
  precio: number | null | undefined,
  precioHasta: number | null | undefined,
): string | undefined {
  if (precioHasta === undefined) {
    return NO_ES_PRECIO
  }
  if (precioHasta === null || precio === undefined) {
    return undefined
  }
  if (precio === null) {
    return 'Para poner un «hasta» falta el precio público.'
  }
  return precioHasta < precio ? 'No puede ser menor que el precio público.' : undefined
}

// Las mismas reglas que la RPC, dichas junto al campo antes de enviar.
export function validarVitrina(valores: ValoresDeVitrina): ValidacionDeVitrina {
  const precio = precioDe(valores.precio)
  const precioHasta = precioDe(valores.precioHasta)
  const nota = valores.nota.trim()
  const errores: [CampoDeVitrina, string | undefined][] = [
    ['precio', precio === undefined ? NO_ES_PRECIO : undefined],
    ['precioHasta', errorDeHasta(precio, precioHasta)],
    [
      'nota',
      nota.length > LARGO_DE_NOTA_DE_PRECIO
        ? `Hasta ${String(LARGO_DE_NOTA_DE_PRECIO)} caracteres.`
        : undefined,
    ],
  ]
  const porCampo = Object.fromEntries(errores.filter(([, error]) => error !== undefined))
  if (precio === undefined || precioHasta === undefined || Object.keys(porCampo).length > 0) {
    return { ok: false, porCampo }
  }
  return {
    ok: true,
    datos: {
      publicado: valores.publicado,
      precio,
      precioHasta,
      nota: nota === '' ? null : nota,
      // Lo que no está publicado no se destaca.
      destacado: valores.publicado && valores.destacado,
    },
  }
}

// ---------------------------------------------------------------------------
// Quién publica
// ---------------------------------------------------------------------------

// Quien ve la ficha espera poder publicar: sin el permiso el botón se ve apagado, con el motivo.
export type PermisoDeVitrina =
  { estado: 'habilitado' } | { estado: 'deshabilitado'; motivo: string }

export function permisoDeVitrina(
  permisos: Permisos,
  origen: { id: string; nombre: string },
): PermisoDeVitrina {
  return puede(permisos, 'vehiculos.vitrina', origen.id)
    ? { estado: 'habilitado' }
    : {
        estado: 'deshabilitado',
        motivo: `No tienes permiso para publicar en la web lo de ${origen.nombre}. Pídeselo a quien administra los roles.`,
      }
}
