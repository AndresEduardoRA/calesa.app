// El layout de campos de los leads: qué datos tiene un lead además de nombre, teléfono, tipo y
// origen, y quién los ve. Esos cuatro son columnas y no se configuran; lo demás vive en
// `leads.atributos` y se describe acá. Un solo layout para todos los leads, prospectos y clientes.
import { z } from 'zod'
import {
  TIPOS_DE_LEAD,
  claveDeCampo,
  type CampoBase,
  type TipoDeLead,
  type ValorDefecto,
} from '@/shared/lib/campos'

// Son columnas de `leads` o datos fijos: un campo propio con esa clave se prestaría a confusión.
// Espejo de `_lead_clave_reservada()`; la base lo vuelve a comprobar.
export const CLAVES_RESERVADAS_DE_LEAD: readonly string[] = [
  'id',
  'numero',
  'nombre',
  'telefono',
  'telefonos',
  'telefono_cc',
  'telefono_principal',
  'tipo',
  'origen',
  'origen_lead_id',
  'atributos',
  'cartera',
  'dueno',
  'creado_por',
  'creado_en',
  'actualizado_en',
  'eliminado_en',
  'eliminado_por',
  'ultimo_seguimiento_en',
  'lote_papelera_id',
]

// Qué dato de la empresa puede ser el valor por defecto de un campo de texto.
export const DATOS_DE_LA_EMPRESA = ['ciudad', 'pais'] as const
export type DatoDeLaEmpresa = (typeof DATOS_DE_LA_EMPRESA)[number]

export type CampoDeLead = CampoBase<TipoDeLead> & {
  // Es una columna del listado de leads.
  enTabla: boolean
  // Entra al panel de filtros del listado.
  filtrable: boolean
  // Sólo lo recibe quien tiene el lead en su cartera (como el teléfono): se recorta en la base.
  soloCartera: boolean
  // «La de la empresa»: en vez de un valor fijo, trae la ciudad o el país de Configuración › Empresa.
  valorDefectoEmpresa: DatoDeLaEmpresa | null
}

const esquemaOpciones = z.array(z.object({ clave: z.string(), etiqueta: z.string() })).catch([])

const esquemaValorDefecto = z
  .union([z.string(), z.number(), z.boolean(), z.array(z.string())])
  .nullable()
  .catch(null)

const esquemaCampos = z.array(
  z.object({
    id: z.guid(),
    clave: z.string(),
    etiqueta: z.string(),
    tipo: z.enum(TIPOS_DE_LEAD),
    opciones: esquemaOpciones,
    requerido: z.boolean(),
    valor_defecto: esquemaValorDefecto,
    valor_defecto_empresa: z.enum(DATOS_DE_LA_EMPRESA).nullable(),
    grupo: z.string().nullable(),
    orden: z.number(),
    en_tabla: z.boolean(),
    filtrable: z.boolean(),
    solo_cartera: z.boolean(),
    es_sistema: z.boolean(),
    activo: z.boolean(),
    actualizado_en: z.string(),
  }),
)

// En el orden del layout: `orden`, y a igualdad la clave (como la base).
export function camposDeLeadDesde(filas: unknown): CampoDeLead[] {
  return esquemaCampos
    .parse(filas)
    .map((fila) => ({
      id: fila.id,
      clave: fila.clave,
      etiqueta: fila.etiqueta,
      tipo: fila.tipo,
      opciones: fila.opciones,
      requerido: fila.requerido,
      valorDefecto: fila.valor_defecto,
      valorDefectoEmpresa: fila.valor_defecto_empresa,
      grupo: fila.grupo,
      orden: fila.orden,
      enTabla: fila.en_tabla,
      filtrable: fila.filtrable,
      soloCartera: fila.solo_cartera,
      esSistema: fila.es_sistema,
      activo: fila.activo,
      actualizadoEn: fila.actualizado_en,
    }))
    .sort((a, b) => a.orden - b.orden || a.clave.localeCompare(b.clave))
}

// Así se arma la clave de un campo propio: de su etiqueta, sin chocar con un dato fijo.
export function claveDeCampoDeLead(etiqueta: string, existentes: readonly string[]): string {
  return claveDeCampo(etiqueta, existentes, CLAVES_RESERVADAS_DE_LEAD, {
    prefijo: 'c_',
    vacio: 'campo',
  })
}

// Los tipos que suelen ser sensibles nacen «solo la cartera»; el resto, visibles para quien ve el lead.
export function soloCarteraPorTipo(tipo: TipoDeLead): boolean {
  return tipo === 'correo' || tipo === 'documento'
}

export type DatosDeLaEmpresa = { ciudad: string | null; pais: string | null }

// El valor por defecto con el que arranca el formulario de alta: el fijo, o el de la empresa
// resuelto hoy (sigue a la empresa si cambia de ciudad). Sin dato de la empresa, nada.
export function valorDefectoVigente(
  campo: Pick<CampoDeLead, 'valorDefecto' | 'valorDefectoEmpresa'>,
  empresa: DatosDeLaEmpresa,
): ValorDefecto | null {
  if (campo.valorDefectoEmpresa !== null) {
    const dato = empresa[campo.valorDefectoEmpresa]?.trim()
    return dato ? dato : null
  }
  return campo.valorDefecto
}
