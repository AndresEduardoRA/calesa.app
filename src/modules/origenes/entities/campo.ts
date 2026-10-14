// El layout de campos de un origen: qué datos tiene un vehículo de ese origen y cómo se ven. Los
// datos comunes (marca, modelo, año, VIN, lote, precio) son columnas de `vehiculos`; lo demás vive
// en `vehiculos.atributos` y se describe acá.
import { z } from 'zod'
import {
  TIPOS_DE_VEHICULO,
  claveDeCampo as claveDeCampoGenerica,
  type CampoBase,
  type GrupoDeCampos as GrupoGenerico,
  type TipoDeVehiculo,
} from '@/shared/lib/campos'
import { ESTILO_DE_CLAVE } from './nombre'

// El motor (tipos, orden, grupos) es de `shared`: los leads usan el mismo. Acá se reexporta para que
// `index.ts`, `client.ts` y los otros módulos sigan importándolo de `origenes`.
export {
  ETIQUETA_DE_TIPO_DE_CAMPO,
  agruparCampos,
  destinoDeMovimiento,
  nombresDeGrupo,
  tieneOpciones,
  type OpcionDeCampo,
  type Sentido,
  type ValorDefecto,
} from '@/shared/lib/campos'

// El layout de un origen sólo ofrece los tipos de un vehículo: el correo y el documento son de los
// leads (la base lo cuida con un `check`).
export const TIPOS_DE_CAMPO = TIPOS_DE_VEHICULO
export type TipoDeCampo = TipoDeVehiculo

// Son columnas de `vehiculos`: un campo propio con esa clave se prestaría a confusión. Espejo de
// `_origen_clave_reservada()`; la base lo vuelve a comprobar.
export const CLAVES_RESERVADAS: readonly string[] = [
  'marca',
  'modelo',
  'anio',
  'vin',
  'lote',
  'precio',
  'precio_negociable',
  'acepta_permuta',
  'placado',
  'kilometraje',
  'titulo',
  'plataforma',
  'url_origen',
  'categoria_id',
  'atributos',
]

export type CampoDeLayout = CampoBase<TipoDeCampo> & {
  origenId: string
  enTarjeta: boolean
  filtrable: boolean
  publicoWeb: boolean
  claveApibara: string | null
}

const esquemaOpciones = z.array(z.object({ clave: z.string(), etiqueta: z.string() })).catch([])

const esquemaValorDefectoDeFila = z
  .union([z.string(), z.number(), z.boolean(), z.array(z.string())])
  .nullable()
  .catch(null)

const esquemaCampos = z.array(
  z.object({
    id: z.guid(),
    origen_id: z.guid(),
    clave: z.string(),
    etiqueta: z.string(),
    tipo: z.enum(TIPOS_DE_CAMPO),
    opciones: esquemaOpciones,
    requerido: z.boolean(),
    valor_defecto: esquemaValorDefectoDeFila,
    grupo: z.string().nullable(),
    orden: z.number(),
    en_tarjeta: z.boolean(),
    filtrable: z.boolean(),
    publico_web: z.boolean(),
    clave_apibara: z.string().nullable(),
    es_sistema: z.boolean(),
    activo: z.boolean(),
    actualizado_en: z.string(),
  }),
)

// En el orden del layout: `orden`, y a igualdad la clave (como la base).
export function camposDesde(filas: unknown): CampoDeLayout[] {
  return esquemaCampos
    .parse(filas)
    .map((fila) => ({
      id: fila.id,
      origenId: fila.origen_id,
      clave: fila.clave,
      etiqueta: fila.etiqueta,
      tipo: fila.tipo,
      opciones: fila.opciones,
      requerido: fila.requerido,
      valorDefecto: fila.valor_defecto,
      grupo: fila.grupo,
      orden: fila.orden,
      enTarjeta: fila.en_tarjeta,
      filtrable: fila.filtrable,
      publicoWeb: fila.publico_web,
      claveApibara: fila.clave_apibara,
      esSistema: fila.es_sistema,
      activo: fila.activo,
      actualizadoEn: fila.actualizado_en,
    }))
    .sort((a, b) => a.orden - b.orden || a.clave.localeCompare(b.clave))
}

export type GrupoDeCampos = GrupoGenerico<CampoDeLayout>

// La clave de un campo nuevo sale de su etiqueta; si choca con una columna de `vehiculos` o con
// otro campo del origen se le agrega un sufijo.
export function claveDeCampo(etiqueta: string, existentes: readonly string[]): string {
  return claveDeCampoGenerica(etiqueta, existentes, CLAVES_RESERVADAS, ESTILO_DE_CLAVE)
}
