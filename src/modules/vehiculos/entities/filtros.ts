// Los filtros del inventario: unos pocos fijos, que la tabla justifica con una columna o un
// índice, y los que salen de los campos «filtrables» del layout del origen. De acá sale el esquema
// que dibuja `FilterShell` y las condiciones que `infra/` le pasa a la base.
import {
  camposFiltrables,
  condicionDeCampo,
  filtroDeCampo,
  type CondicionDeAtributo,
  type DefFiltro,
  type EsquemaDeFiltros,
  type ValorDeFiltro,
  type ValoresDeFiltros,
} from '@/shared/lib/filtros'
import {
  PREFIJO_DE_ATRIBUTO,
  type CampoDeVehiculo,
  type CategoriaDeVehiculo,
  type FaseDeVehiculo,
} from './campo'
import { VITRINA_CERRADA, vitrinaAbierta, type VitrinaDelOrigen } from './vitrina'

// Las claves de URL de los fijos. Las de los campos del layout van con el prefijo `a.`: una clave
// de campo no lleva punto, así que nunca choca con `origen`, `panel`, `cursor` ni con un fijo.
export const FILTRO_FASE = 'fase'
export const FILTRO_CATEGORIA = 'categoria'
export const FILTRO_ANIO = 'anio'
// Sí = se ve hoy en la web pública; no = todo lo demás (sin publicar, o publicado y no visible).
export const FILTRO_VITRINA = 'vitrina'
// Sí = la limpieza automática lo va a mandar a la papelera en los próximos días (la ventana y la
// regla son de la base y de `entities/limpieza.ts`); no = todo lo demás. Sólo existe en un origen de
// subasta con la limpieza encendida.
export const FILTRO_LIMPIEZA = 'limpieza'
// En el filtro de fase: lo que todavía no entró al flujo.
export const SIN_FASE = 'ninguna'

const BUSQUEDA = {
  clave: 'q',
  etiqueta: 'Buscar por título, VIN o lote',
  marcador: 'Título, VIN o lote',
}

type Fuentes = {
  campos: readonly CampoDeVehiculo[]
  fases: readonly FaseDeVehiculo[]
  categorias: readonly CategoriaDeVehiculo[]
  // La limpieza automática de este origen: con `activa` el filtro «Se limpiará pronto» existe. La
  // página lo resuelve (sólo un origen de subasta con el interruptor encendido).
  limpieza?: { activa: boolean }
}

// Los campos del layout que hoy se pueden filtrar.
export { camposFiltrables }

function filtrosFijos({ fases, categorias, limpieza }: Fuentes): DefFiltro[] {
  const fijos: DefFiltro[] = []
  if (fases.length > 0) {
    fijos.push({
      tipo: 'opciones',
      clave: FILTRO_FASE,
      etiqueta: 'Fase',
      opciones: [
        ...fases.map((fase) => ({ valor: fase.id, etiqueta: fase.nombre, color: fase.color })),
        { valor: SIN_FASE, etiqueta: 'Sin fase' },
      ],
    })
  }
  const activas = categorias.filter((categoria) => categoria.activa)
  if (activas.length > 0) {
    fijos.push({
      tipo: 'opciones',
      clave: FILTRO_CATEGORIA,
      etiqueta: 'Categoría',
      opciones: activas.map((categoria) => ({ valor: categoria.id, etiqueta: categoria.nombre })),
    })
  }
  fijos.push({
    tipo: 'rango_numero',
    clave: FILTRO_ANIO,
    etiqueta: 'Año',
    // Lo que admite la columna (`anio between 1900 and 2100`).
    minimo: 1900,
    maximo: 2100,
    entero: true,
    sinMiles: true,
  })
  fijos.push({ tipo: 'booleano', clave: FILTRO_VITRINA, etiqueta: 'En vitrina' })
  if (limpieza?.activa) {
    fijos.push({ tipo: 'booleano', clave: FILTRO_LIMPIEZA, etiqueta: 'Se limpiará pronto' })
  }
  return fijos
}

export function esquemaDeFiltros(fuentes: Fuentes): EsquemaDeFiltros {
  const delLayout = camposFiltrables(fuentes.campos).flatMap(
    (campo) => filtroDeCampo(campo, PREFIJO_DE_ATRIBUTO) ?? [],
  )
  return { busqueda: BUSQUEDA, filtros: [...filtrosFijos(fuentes), ...delLayout] }
}

// Lo que se le pide a la base, sin decir cómo: `infra/queries/condiciones.ts` lo traduce.
export type Condicion =
  // Contiene el texto en el título, el VIN o el lote.
  | { tipo: 'busqueda'; texto: string }
  // La columna vale alguno de esos; `incluirNulo` suma «o no tiene».
  | {
      tipo: 'columna_en'
      columna: 'fase_id' | 'categoria_id'
      valores: string[]
      incluirNulo: boolean
    }
  | { tipo: 'columna_rango'; columna: 'anio'; min: number | null; max: number | null }
  // Publicado y en una de estas fases (las que hoy publican; ninguna si el origen no se ve), o
  // lo contrario. La regla es de la base (`vitrina_del_origen`): acá sólo llega resuelta.
  | { tipo: 'en_vitrina'; valor: boolean; fases: string[] }
  // La limpieza automática lo va a mandar a la papelera hasta ese día (`YYYY-MM-DD`, inclusive), o
  // lo contrario. El día llega calculado por la página con la zona de la empresa; la fecha de cada
  // vehículo (`limpieza_el`) la calcula la base: nada de esto copia la regla.
  | { tipo: 'por_limpiar'; valor: boolean; hasta: string }
  | CondicionDeAtributo

function condicionFija(
  clave: string,
  valor: ValorDeFiltro,
  vitrina: VitrinaDelOrigen,
  limpieza: { hasta: string } | undefined,
): Condicion | null {
  if (clave === FILTRO_ANIO && valor.tipo === 'rango_numero') {
    return { tipo: 'columna_rango', columna: 'anio', min: valor.min, max: valor.max }
  }
  if (clave === FILTRO_VITRINA && valor.tipo === 'booleano') {
    return {
      tipo: 'en_vitrina',
      valor: valor.valor,
      fases: vitrinaAbierta(vitrina) ? [...vitrina.fasesQuePublican] : [],
    }
  }
  if (clave === FILTRO_LIMPIEZA && valor.tipo === 'booleano') {
    // Sin la limpieza encendida el filtro ni existe en el esquema: una URL vieja no filtra nada.
    return limpieza ? { tipo: 'por_limpiar', valor: valor.valor, hasta: limpieza.hasta } : null
  }
  if (valor.tipo !== 'opciones') {
    return null
  }
  if (clave === FILTRO_FASE) {
    return {
      tipo: 'columna_en',
      columna: 'fase_id',
      valores: valor.valores.filter((fase) => fase !== SIN_FASE),
      incluirNulo: valor.valores.includes(SIN_FASE),
    }
  }
  if (clave === FILTRO_CATEGORIA) {
    return {
      tipo: 'columna_en',
      columna: 'categoria_id',
      valores: valor.valores,
      incluirNulo: false,
    }
  }
  return null
}

// Las condiciones de lo que la persona filtró. La clave de un atributo sale siempre del layout
// (nunca de la URL): un filtro de un campo que ya no es filtrable se ignora.
export function condicionesDe(
  campos: readonly CampoDeVehiculo[],
  valores: ValoresDeFiltros,
  opciones: { zona?: string; vitrina?: VitrinaDelOrigen; limpieza?: { hasta: string } } = {},
): Condicion[] {
  const condiciones: Condicion[] = []
  if (valores.busqueda !== '') {
    condiciones.push({ tipo: 'busqueda', texto: valores.busqueda })
  }
  const porClave = new Map(
    camposFiltrables(campos).map((campo) => [PREFIJO_DE_ATRIBUTO + campo.clave, campo]),
  )
  for (const [clave, valor] of Object.entries(valores.porClave)) {
    const campo = porClave.get(clave)
    const condicion = campo
      ? condicionDeCampo(campo, valor, opciones.zona)
      : condicionFija(clave, valor, opciones.vitrina ?? VITRINA_CERRADA, opciones.limpieza)
    if (condicion) {
      condiciones.push(condicion)
    }
  }
  return condiciones
}
