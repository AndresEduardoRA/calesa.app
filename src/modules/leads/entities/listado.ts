// El listado de leads: qué trae cada fila, qué columnas pide la tabla y cómo se valida lo que
// vuelve de la base. Las filas salen de `leads_vista`: el teléfono ya viene enmascarado salvo para
// la cartera y los atributos ya vienen recortados, así que nada acá decide quién ve qué.
import { CAMPOS_DE_NUMEROS, numerosDesde, type NumerosDeLead } from '@/shared/lib/numeros-de-lead'
import { z } from 'zod'
import type { CampoDeLead } from './campo'
import { marcasDesde, type MarcasDeLead } from './marcas'

// El máximo de filas por página de este listado (el selector «Ítems por página» ofrece hasta acá): 100, lo más que ofrece
// el selector. Fue 50 hasta la 9h: la policy de `leads` se estimaba en un 0,37 % de la cartera y a 100 filas el planificador
// dejaba `leads_listado_idx` (518 ms la página 1 de la dueña). Con la regla estimable (`_lead_visible_para()`) cuesta ~10 ms
// a cualquier tamaño y profundidad con 50.000 leads; `pnpm db:medir:volumen` lo asserta con este máximo y
// `e2e/listas-por-pagina-volumen.spec.ts` mide los nodos y los bytes (`docs/RENDIMIENTO.md`). El tamaño que se lee sale de
// `tamanoDePagina()` de `shared/lib/paginacion`.
export const MAXIMO_DE_PAGINA_DE_LEADS = 100

// El tipo de un lead es un enum de la base (`tipo_lead`), no un campo configurable.
export const TIPOS_DEL_LEAD = ['prospecto', 'cliente'] as const
export type TipoDelLead = (typeof TIPOS_DEL_LEAD)[number]
export const ETIQUETA_DEL_TIPO: Record<TipoDelLead, string> = {
  prospecto: 'Prospecto',
  cliente: 'Cliente',
}

// Una clave de campo que va a una consulta: lo que la base admite como clave (`leads_campos`). Si
// una no cumple, no se pide: falla cerrada.
const CLAVE_DE_ATRIBUTO = /^[a-z][a-z0-9_]{1,40}$/
// Cada atributo de la tabla vuelve con este prefijo en su alias (`a_ciudad`).
const PREFIJO_DE_ALIAS = 'a_'

export type FilaDeLead = {
  id: string
  // Los números que se ven: la base ya resolvió cuál llega (el global, sólo con el permiso).
  numeros: NumerosDeLead
  nombre: string
  // Como lo entrega la vista: completo para la cartera, enmascarado para el resto.
  telefono: string
  // El lead está en la cartera de quien mira: define «míos» y si los datos privados le llegan.
  enCartera: boolean
  // Quién es su dueño (nulo si no tiene): con ello se sabe si quien mira puede enviarlo a la papelera.
  duenoId: string | null
  tipo: TipoDelLead
  origenId: string | null
  creadoEn: string
  // De la tabla: sólo los campos `en_tabla`. En el drawer, todos los que le llegan.
  atributos: Record<string, unknown>
  // Las de quien mira: favorito, tachado y sus etiquetas (nunca las de otra persona).
  marcas: MarcasDeLead
}

const COLUMNAS_FIJAS = [
  'id',
  'numero',
  'numero_propio',
  'numero_propio_creador',
  'nombre',
  'telefono_principal',
  'en_cartera',
  'dueno_id',
  'tipo',
  'origen_lead_id',
  'creado_en',
  'es_favorito',
  'esta_tachado',
  'etiquetas',
] as const

// Las columnas del listado: `en_tabla` y activas, en el orden del layout.
export function camposDeTabla<Campo extends CampoDeLead>(campos: readonly Campo[]): Campo[] {
  return campos.filter((campo) => campo.activo && campo.enTabla)
}

// Los datos de la tarjeta del celular: hasta `maximo` de los de la tabla, saltando los que este lead
// no tiene (un guion no dice nada en una pantalla angosta). Un privado que no le llega a quien
// mira sí cuenta: se dice que es de la cartera.
export function camposDeLaTarjeta<Campo extends CampoDeLead>(
  campos: readonly Campo[],
  fila: FilaDeLead,
  maximo = 2,
): Campo[] {
  return camposDeTabla(campos)
    .filter(
      (campo) =>
        fila.atributos[campo.clave] !== undefined || (campo.soloCartera && !fila.enCartera),
    )
    .slice(0, maximo)
}

// Sólo las claves que la base admite: la clave de un atributo llega a una consulta.
export function clavesDeTabla(campos: readonly CampoDeLead[]): string[] {
  return camposDeTabla(campos)
    .map((campo) => campo.clave)
    .filter((clave) => CLAVE_DE_ATRIBUTO.test(clave))
}

// La lista de columnas que se le pide a `leads_vista`: las fijas y, de `atributos`, sólo las
// claves de la tabla. Una página no arrastra los campos que no se dibujan (una nota larga).
export function columnasDeLaConsulta(claves: readonly string[]): string {
  const delLayout = claves
    .filter((clave) => CLAVE_DE_ATRIBUTO.test(clave))
    .map((clave) => `${PREFIJO_DE_ALIAS}${clave}:atributos->${clave}`)
  return [...COLUMNAS_FIJAS, ...delLayout].join(',')
}

// Lo que cruza el límite con la base: se valida, no se confía.
const esquemaFila = z
  .object({
    id: z.guid(),
    ...CAMPOS_DE_NUMEROS,
    nombre: z.string(),
    telefono_principal: z.string().nullable(),
    en_cartera: z.boolean().nullable(),
    dueno_id: z.guid().nullable().optional(),
    tipo: z.enum(TIPOS_DEL_LEAD),
    origen_lead_id: z.guid().nullable(),
    creado_en: z.string(),
    es_favorito: z.boolean().nullable().optional(),
    esta_tachado: z.boolean().nullable().optional(),
    etiquetas: z.array(z.guid()).nullable().optional(),
  })
  .catchall(z.unknown())

// Las filas de una página. Una fila que no cumple la forma se descarta: no tumba la lista.
export function filasDeLeadDesde(data: unknown, claves: readonly string[]): FilaDeLead[] {
  if (!Array.isArray(data)) {
    return []
  }
  const pedidas = claves.filter((clave) => CLAVE_DE_ATRIBUTO.test(clave))
  return (data as unknown[]).flatMap((cruda) => {
    const fila = esquemaFila.safeParse(cruda)
    if (!fila.success) {
      return []
    }
    const { data: f } = fila
    const atributos: Record<string, unknown> = {}
    for (const clave of pedidas) {
      const valor = f[`${PREFIJO_DE_ALIAS}${clave}`]
      if (valor !== undefined && valor !== null) {
        atributos[clave] = valor
      }
    }
    return [
      {
        id: f.id,
        numeros: numerosDesde(f),
        nombre: f.nombre,
        telefono: f.telefono_principal ?? '',
        enCartera: f.en_cartera === true,
        duenoId: f.dueno_id ?? null,
        tipo: f.tipo,
        origenId: f.origen_lead_id,
        creadoEn: f.creado_en,
        atributos,
        marcas: marcasDesde(f),
      },
    ]
  })
}

// Un lead completo, con todos los atributos que le llegan a quien mira (el drawer).
const esquemaCompleto = esquemaFila.extend({
  atributos: z.record(z.string(), z.unknown()).nullable(),
})

export const COLUMNAS_DEL_LEAD_COMPLETO = [...COLUMNAS_FIJAS, 'atributos'].join(',')

export function leadCompletoDesde(data: unknown): FilaDeLead | null {
  const fila = esquemaCompleto.safeParse(data)
  if (!fila.success) {
    return null
  }
  const f = fila.data
  return {
    id: f.id,
    numeros: numerosDesde(f),
    nombre: f.nombre,
    telefono: f.telefono_principal ?? '',
    enCartera: f.en_cartera === true,
    duenoId: f.dueno_id ?? null,
    tipo: f.tipo,
    origenId: f.origen_lead_id,
    creadoEn: f.creado_en,
    atributos: f.atributos ?? {},
    marcas: marcasDesde(f),
  }
}
