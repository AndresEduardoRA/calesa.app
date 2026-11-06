import type { CalculoDeLaTarjeta } from '../calculo-de-la-tarjeta'
import type { LecturaDeLaTarjeta, TarjetaLista } from './lectura-de-la-tarjeta'

// El modelo de vista de la tarjeta de una cotización (4.18-2): puro, sin DOM ni lectura. Lo dibuja `<TarjetaDeCotizacion>` y lo usará el PDF del 4.18-3. Toma las filas, las
// etiquetas y el total de lo que **la lectura nombra** (lo del nivel «todos»); de la hoja de quien mira sólo llegan números por el id de un nodo (C9).

// Lo de la página que la lectura no sabe: ya formateado o leído por quien arma la página.
export type PaginaDeLaTarjeta = {
  // «6 nov 2026»: el día de hoy en la hoja nueva y el del último guardado en una guardada (P3).
  fecha: string
  // El título del vehículo si quien mira lo ve; sin vehículo no hay banda.
  vehiculo: string | null
  asesor: string | null
  // El número de una guardada; nulo en la hoja nueva.
  numero: number | null
  vencida: boolean
  // El logo de la empresa, si tiene uno.
  logo: { nombre: string; url: string } | null
}

export type FilaDeTarjeta = {
  nodo: string
  etiqueta: string
  leyenda: string | null
  usd: number | null
}

export type GrupoDeTarjeta = {
  id: string
  etiqueta: string
  tono: string | null
  // Nulo: la plantilla no lleva esa columna. `{ valor: null }`: la lleva y no hay qué decir («—»).
  tipoDeCambio: { valor: string | null } | null
  plazo: { valor: string | null } | null
  filas: readonly FilaDeTarjeta[]
}

export type TotalDeTarjeta = {
  etiqueta: string
  leyenda: string | null
  usd: number | null
  // Sólo si se pidió «Ver total Bs», hay moneda y los dos números existen.
  bs: { valor: number; moneda: string } | null
}

export type ModeloDeTarjeta = {
  // Sin plantilla publicada que sirva: sólo el total, con la etiqueta «Total».
  porOmision: boolean
  encabezado: {
    // El título de la opción elegida de la variante; nulo si no hay variante o clave.
    titulo: string | null
    fecha: string
    asesor: string | null
    numero: number | null
    vencida: boolean
  }
  logo: { nombre: string; url: string } | null
  vehiculo: string | null
  grupos: readonly GrupoDeTarjeta[]
  total: TotalDeTarjeta
  aparte: readonly { nodo: string; etiqueta: string; usd: number }[]
  nota: string | null
  // Los tonos que usan los grupos, para `<EstiloDeTonos>`.
  tonos: TarjetaLista['tonos']
}

type Entrada = {
  lectura: LecturaDeLaTarjeta
  calculo: CalculoDeLaTarjeta
  monedaBs: string | null
  pagina: PaginaDeLaTarjeta
}

const ETIQUETA_POR_OMISION = 'Total'

const numeroONulo = (valor: number | string | null | undefined) =>
  typeof valor === 'number' ? valor : null

function activo(calculo: CalculoDeLaTarjeta, nodo: string): boolean {
  return calculo.estados?.get(nodo) === 'activo'
}

function tituloDeLaVariante(lectura: TarjetaLista, calculo: CalculoDeLaTarjeta): string | null {
  const variante = lectura.variante
  if (variante === null) {
    return null
  }
  const clave = calculo.valores.get(variante.nodo)
  return variante.opciones.find((o) => o.clave === clave)?.titulo ?? null
}

function encabezado(
  lectura: LecturaDeLaTarjeta,
  calculo: CalculoDeLaTarjeta,
  pagina: PaginaDeLaTarjeta,
): ModeloDeTarjeta['encabezado'] {
  return {
    titulo: lectura.estado === 'lista' ? tituloDeLaVariante(lectura, calculo) : null,
    fecha: pagina.fecha,
    asesor: pagina.asesor,
    numero: pagina.numero,
    vencida: pagina.vencida,
  }
}

// El nombre del tipo de cambio del grupo en el modo elegido; sin modo (o uno que la lectura no nombra), el de siempre del bucket. Sin bucket o sin nombre, nulo.
function tipoDeCambioDelGrupo(
  lectura: TarjetaLista,
  modoTc: string | null,
  bucket: string | null,
): string | null {
  if (bucket === null) {
    return null
  }
  const delModo = modoTc === null ? undefined : lectura.tiposDeCambio.modos.get(modoTc)
  const nombres = delModo ?? lectura.tiposDeCambio.buckets
  return nombres.get(bucket) ?? null
}

// Los grupos en el orden de la lectura, con sólo las filas de estado `activo`; un grupo sin ninguna fila que dibujar no se dibuja. Las celdas combinadas (tipo de cambio y plazo)
// van una vez por grupo y sólo si la plantilla lleva la columna.
function grupos(lectura: TarjetaLista, calculo: CalculoDeLaTarjeta): GrupoDeTarjeta[] {
  return lectura.grupos.flatMap((g) => {
    const filas = g.filas
      .filter((f) => activo(calculo, f.nodo))
      .map((f) => ({
        nodo: f.nodo,
        etiqueta: f.etiqueta,
        leyenda: lectura.columnas.leyenda ? f.leyenda : null,
        usd: numeroONulo(calculo.valores.get(f.nodo)),
      }))
    if (filas.length === 0) {
      return []
    }
    return [
      {
        id: g.id,
        etiqueta: g.etiqueta,
        tono: g.tono,
        tipoDeCambio: lectura.columnas.tipoDeCambio
          ? { valor: tipoDeCambioDelGrupo(lectura, calculo.modoTc, g.bucket) }
          : null,
        plazo: lectura.columnas.plazo ? { valor: g.plazo } : null,
        filas,
      },
    ]
  })
}

function totalEnBs(calculo: CalculoDeLaTarjeta, monedaBs: string | null): TotalDeTarjeta['bs'] {
  const bs = calculo.totales.bs
  if (!calculo.verTotalBs || monedaBs === null || bs === null || calculo.totales.usd === null) {
    return null
  }
  return { valor: bs, moneda: monedaBs }
}

// Lo aparte (lo que el diseño suma bajo el total) sólo con estado `activo` y valor: la garantía con su interruptor apagado no sale.
function aparte(lectura: TarjetaLista, calculo: CalculoDeLaTarjeta): ModeloDeTarjeta['aparte'] {
  return lectura.secundarios.flatMap((s) => {
    const valor = numeroONulo(calculo.valores.get(s.nodo))
    return activo(calculo, s.nodo) && valor !== null
      ? [{ nodo: s.nodo, etiqueta: s.etiqueta, usd: valor }]
      : []
  })
}

function total(
  etiqueta: string,
  leyenda: string | null,
  { calculo, monedaBs }: Entrada,
): TotalDeTarjeta {
  return { etiqueta, leyenda, usd: calculo.totales.usd, bs: totalEnBs(calculo, monedaBs) }
}

// La tarjeta «por omisión», o la de una plantilla sin cálculo con qué elegir filas: encabezado, banda del vehículo, logo y sólo el total (P4 a). Con una plantilla, la etiqueta es la suya.
function soloElTotal(entrada: Entrada): ModeloDeTarjeta {
  const { lectura, calculo, pagina } = entrada
  const lista = lectura.estado === 'lista' ? lectura : null
  return {
    porOmision: lista === null,
    encabezado: encabezado(lectura, calculo, pagina),
    logo: lista === null || lista.logo ? pagina.logo : null,
    vehiculo: pagina.vehiculo,
    grupos: [],
    total: total(
      lista?.total.etiqueta ?? ETIQUETA_POR_OMISION,
      lista?.total.leyenda ?? null,
      entrada,
    ),
    aparte: [],
    nota: null,
    tonos: [],
  }
}

// La tarjeta de una cotización: pura. Con la plantilla, sus grupos con las filas activas, el total, lo aparte y la nota; sin plantilla (`sin_plantilla`) o sin estados, sólo el total.
export function modeloDeLaTarjeta(entrada: Entrada): ModeloDeTarjeta {
  const { lectura, calculo, pagina } = entrada
  if (lectura.estado !== 'lista' || calculo.estados === null) {
    return soloElTotal(entrada)
  }
  const dibujados = grupos(lectura, calculo)
  const usados = new Set(dibujados.flatMap((g) => (g.tono === null ? [] : [g.tono])))
  return {
    porOmision: false,
    encabezado: encabezado(lectura, calculo, pagina),
    logo: lectura.logo ? pagina.logo : null,
    vehiculo: pagina.vehiculo,
    grupos: dibujados,
    total: total(lectura.total.etiqueta, lectura.total.leyenda, entrada),
    aparte: aparte(lectura, calculo),
    nota: lectura.nota,
    tonos: lectura.tonos.filter((t) => usados.has(t.clave)),
  }
}
