// El terreno de `e2e/vehiculos-inventario-postgrest.spec.ts` (4.16-2a, C9): el inventario de hoy (PostgREST sobre la tabla) contra
// `vehiculos_inventario()`. Un origen de `prepararInventario` (Corea, con sus 3 vehículos) y 32 más sembrados por SQL que cubren los
// bordes de cada filtro, y un origen de subasta para «Se limpiará pronto» (`limpieza_el` sólo existe ahí) y la situación real. Dos personas: la dueña (ve
// todo: ruta `origen`) y Pía Inv («propios» en los dos orígenes: ruta `propios`), con 9 vehículos suyos en Corea y 2 leads suyos con
// 4 vehículos (3 de otros y 1 suyo).
import { PREFIJO_ROL_E2E, admin, correoDePrueba, crearPersona, darRolDePrueba } from './base'
import { borrarFotosDe } from './fotos'
import { CLAVE, limpiarInventario, prepararInventario } from './inventario'
import { borrarLeadsDePrueba, crearLead, exigir, idDe, vincular } from './leads'
import { telefonoAlAzar } from './leads-alta'
import { PREFIJO_CLAVE_E2E, crearOrigenDePrueba } from './origenes'
import { literal, sql } from './sql'
import { borrarVehiculosDe } from './vehiculos'
import { sembrarFotos } from './vehiculos-resumen'
import { borrarFasesDe, crearFaseInterna, crearFaseQuePublica } from './vitrina'

// Claves de atributo fuera del layout de Corea: la base no les mira el tipo (`_atributos_validar` sólo revisa las del layout), así que
// una misma clave lleva un número, un texto que parece número, un booleano o un arreglo. Son las de `COREA`.
export const ATRIBUTO = {
  numero: 'e2e_num',
  texto: 'e2e_txt',
  fecha: 'e2e_fecha',
  lista: 'e2e_lista',
  llave: 'e2e_llave',
  opcion: 'e2e_op',
} as const
// El `antesDe` de los casos de `atributo_rango_texto`: «Nissan a_b» tiene justo esa fecha (no entra: es exclusivo; M21).
export const ANTES_DE = '2026-04-01'

const SUBASTA = 'subasta_inv_pg'
const CLAVE_DE_SUBASTA = `${PREFIJO_CLAVE_E2E}${SUBASTA}`
const CLAVE_DE_COREA = `${PREFIJO_CLAVE_E2E}corea_inv`

type Ajustes = { limpieza_automatica: boolean; limpieza_dias_gracia: number }

export type TerrenoPostgrest = {
  duena: string
  pia: string
  corea: string
  subasta: string
  fases: { publica: string; interna: string }
  categorias: { a: string; b: string }
  // El día de «Se limpiará pronto»: la `limpieza_el` de «Subasta media» (el borde `<=` entra).
  hasta: string
  // Los ids que Pía tiene que ver en Corea: los 9 suyos y los 3 de otros en sus leads.
  dePia: string[]
  ajustesAntes: Ajustes
}

// Los vehículos de Corea. `min`: minutos antes del instante base (iguales = el mismo `creado_en`: el corte de página cae adentro del
// empate y desempata el id). `fase` :pub (publica) | :int (no publica); `cat` :a | :b; `de` :pia | :duena | null (sin creador).
// VIN no admite texto hostil (`vehiculos_vin_check`): ahí los bordes son el nulo y las mayúsculas. «Nissan a_b» está publicado sin
// fase (M17); «BMW X1» está en la papelera y nadie lo ve.
const COREA = String.raw`
  ('TOYOTA HILUX 4x4', 1, 2021, 'JTDBR32E720123456', 'L-100', :pub, :a, true, :duena,
     '{"e2e_num":5,"e2e_txt":"abc","e2e_fecha":"2026-03-01","e2e_lista":["rojo"],"e2e_llave":true,"e2e_op":"nafta"}', false),
  ('toyota corolla minúscula', 2, 2015, null, null, :int, :b, true, :duena,
     '{"e2e_num":12.5,"e2e_txt":"ABC","e2e_fecha":"2026-03-15","e2e_lista":["rojo","azul"],"e2e_op":"diesel"}', false),
  ('Nissan a_b', 3, 2010, null, 'lote_1', null, :a, true, :duena, '{"e2e_num":"12","e2e_txt":"a_b","e2e_fecha":"2026-04-01"}', false),
  ('Nissan aXb', 4, 2018, null, null, :pub, null, false, :pia,
     '{"e2e_num":true,"e2e_txt":"aXb","e2e_fecha":"2026-04-01T10:00:00Z","e2e_lista":["azul"]}', false),
  ('Mazda x*y', 4, 2019, null, 'x*y', :pub, :b, true, :pia, '{"e2e_num":[1,2],"e2e_txt":"x*y","e2e_llave":false}', false),
  ('Mazda xzy', 4, 2020, null, null, null, null, false, :duena, '{"e2e_num":0,"e2e_txt":"xzy","e2e_op":"nafta"}', false),
  ('Ford barra \ invertida', 4, 2012, null, 'L\9', :int, null, false, null,
     '{"e2e_num":-3,"e2e_txt":"\\","e2e_fecha":"2026-02-28"}', false),
  ('Chevrolet "comillas"', 5, 2016, null, 'lote"q', null, :a, false, :pia, '{"e2e_num":100,"e2e_txt":"say \"hi\"","e2e_lista":[]}', false),
  ('Kia coma, y punto.', 6, null, null, 'lote,coma', :pub, null, true, :duena,
     '{"e2e_num":50,"e2e_txt":"a%b","e2e_op":"diesel","e2e_llave":true}', false),
  ('Honda (paréntesis)', 7, 2005, null, 'lote(1)', :int, :b, false, :pia,
     '{"e2e_num":7,"e2e_txt":"ñandú","e2e_fecha":"2026-03-31"}', false),
  ('Peugeot Ñandú', 8, 2022, 'KMHCT41DAEU123456', null, null, null, false, :pia,
     '{"e2e_txt":"Ñ","e2e_fecha":"2026-01-10","e2e_op":"nafta","e2e_lista":["verde"]}', false),
  ('Citroën ÁRBOL', 9, 2017, null, null, :pub, :a, true, :duena, '{"e2e_num":42,"e2e_txt":42,"e2e_llave":false}', false),
  ('Toyota 50% off', 10, 2014, null, 'L-50%', null, null, false, :pia, '{"e2e_num":49.99,"e2e_txt":"50%"}', false),
  ('Toyota 50 off', 11, 2013, null, 'L-50', null, null, false, :duena, '{"e2e_num":51,"e2e_txt":"50"}', false),
  ('Suzuki sin nada', 12, null, null, null, null, null, false, :duena, '{}', false),
  ('Suzuki Swift ñ', 13, 2023, 'JS2ZC21S0A5123456', null, :pub, :b, true, :pia, '{"e2e_op":"diesel","e2e_lista":["rojo"]}', false),
  ('Renault Duster', 14, 2011, null, null, null, null, false, :duena, '{"e2e_num":5,"e2e_fecha":"2026-03-01T00:00:00Z"}', false),
  ('BMW X1 toyota en la papelera', 15, 2020, null, null, null, null, false, :pia, '{"e2e_num":5}', true),
  ('Volvo XC40', 16, 2019, null, null, :int, :a, false, :pia, '{"e2e_llave":true,"e2e_lista":["azul","verde"]}', false),
  ('Audi A3 TOYOTA motor', 17, 2009, null, null, :pub, null, false, :duena, '{"e2e_num":10}', false),
  ('Jeep (Renegade), "full"', 18, 2018, null, '(a),"b"', null, :b, false, :duena, '{"e2e_txt":"(x),\"y\""}', false),
  ('Fiat Uno', 19, 1995, null, null, :int, null, true, :duena, '{"e2e_op":"nafta"}', false),
  ('Mitsubishi L200 \%', 20, 2016, null, null, null, null, false, :duena, '{"e2e_txt":"\\%"}', false),
  ('Subaru Forester', 21, 2020, null, null, :pub, :a, true, :duena, '{"e2e_fecha":"2026-03-20","e2e_num":20}', false),
  ('Isuzu D-Max', 22, 2021, 'MPATFS86JGT123456', null, null, null, false, :duena, '{"e2e_llave":false,"e2e_op":"diesel"}', false),
  ('Lexus RX', 23, 2008, null, null, null, null, false, :duena, '{"e2e_num":5.5,"e2e_txt":"abcd"}', false),
  ('Dodge Ram', 24, 2017, null, null, :int, null, false, :duena, '{"e2e_num":30,"e2e_lista":["rojo"]}', false),
  ('Ram 1500 toyota', 24, 2022, null, null, null, :b, false, :duena, '{"e2e_fecha":"2026-03-02"}', false),
  ('Great Wall', 24, null, null, null, :pub, null, true, :duena, '{"e2e_op":"diesel","e2e_llave":true}', false),
  ('Changan CS35', 24, 2018, null, null, null, null, false, :pia, '{"e2e_num":15,"e2e_txt":"abc","e2e_fecha":"2026-03-10"}', false),
  ('Geely Coolray', 25, 2024, null, null, :pub, null, false, :duena, '{"e2e_lista":["azul"]}', false),
  ('JAC T8', 26, 2019, null, null, null, :a, false, :duena, '{"e2e_num":8,"e2e_txt":"ABCD"}', false)`

// 3 portadas («TOYOTA HILUX» con 2 fotos: la portada es la primera) y los vehículos en los leads de Pía (uno suyo: sale una vez; uno
// sin creador: sale por su lead).
const FOTOS: [string, number][] = [
  ['TOYOTA HILUX 4x4', 2],
  ['Mazda x*y', 1],
  ['Kia coma, y punto.', 1],
]
const EN_LEADS: [string, 0 | 1][] = [
  ['Mazda xzy', 0],
  ['Ford barra \\ invertida', 0],
  ['Kia coma, y punto.', 1],
  ['Honda (paréntesis)', 1],
]

// La subasta: lejana (vence ya: la próxima corrida), media (en ~2 días), reciente (en ~6), una anclada por la vitrina, una manual, una
// que todavía no terminó y la de Pía (como la media). (título, días desde que terminó, importado, publicado, de).
const SUBASTAS = `
  ('Subasta lejana', 0, 40, true, false, :duena),
  ('Subasta media', 1, 5, true, false, :duena),
  ('Subasta reciente', 2, 1, true, false, :duena),
  ('Subasta en vitrina', 3, 5, true, true, :duena),
  ('Subasta manual', 4, 5, false, false, :duena),
  ('Subasta futura', 5, -3, true, false, :duena),
  ('Subasta de Pía', 6, 5, true, false, :pia)`

// La situación real: con «Inv subasta» (la fase de subasta) el origen tiene tramo, y estas cuatro terminaron sin fase: dos sin resolver
// y dos no ganadas, de la dueña y de Pía. No son importadas: la limpieza no las mira. (título, min, de, no ganada).
const SITUACIONES = `
  ('Subasta sin resolver', 7, :duena, false),
  ('Subasta no ganada', 8, :duena, true),
  ('Subasta sin resolver de Pía', 9, :pia, false),
  ('Subasta no ganada de Pía', 10, :pia, true)`

// Los vehículos y las fotos de los dos orígenes (de una corrida anterior o de ésta), los leads y lo de `limpiarInventario`. Un origen con
// vehículos no se borra y `borrarOrigenes` barre todo `e2e_%`: el de subasta se vacía antes.
export async function limpiarInventarioPostgrest(ajustesAntes?: Ajustes): Promise<void> {
  try {
    if (ajustesAntes) {
      const { error } = await admin().from('ajustes_empresa').update(ajustesAntes).eq('id', 1)
      exigir(error, 'restaurar los ajustes de la empresa')
    }
    const ids =
      sql(`select v.id from public.vehiculos v join public.origenes o on o.id = v.origen_id
      where o.clave in (${literal(CLAVE_DE_SUBASTA)}, ${literal(CLAVE_DE_COREA)})`)
    await borrarFotosDe(ids.split('\n').filter(Boolean))
    await borrarVehiculosDe([CLAVE_DE_SUBASTA])
    await borrarFasesDe([CLAVE_DE_SUBASTA])
    await borrarLeadsDePrueba()
  } finally {
    await limpiarInventario()
  }
}

// Reemplaza `:nombre` por su uuid (o `null`) y devuelve el id de cada título (inserta como `postgres`, sin RLS).
function sembrar(consulta: string, ids: Record<string, string>): Map<string, string> {
  const texto = consulta.replace(/:([a-z]+)\b/g, (todo: string, nombre: string) => {
    const id = ids[nombre]
    return id === undefined ? todo : `${literal(id)}::uuid`
  })
  return new Map(
    sql(texto)
      .split('\n')
      .map((linea) => {
        const corte = linea.indexOf('|')
        return [linea.slice(corte + 1), linea.slice(0, corte)] as const
      }),
  )
}

function crearCategoria(origen: string, nombre: string): string {
  return sql(`insert into public.categorias (origen_id, nombre)
    values (${literal(origen)}, ${literal(nombre)}) returning id`)
}

async function encenderLimpieza(): Promise<Ajustes> {
  const cliente = admin()
  const antes = await cliente
    .from('ajustes_empresa')
    .select('limpieza_automatica, limpieza_dias_gracia')
    .eq('id', 1)
    .single<Ajustes>()
  exigir(antes.error, 'leer los ajustes de la empresa')
  const encendida = { limpieza_automatica: true, limpieza_dias_gracia: 7 }
  exigir(
    (await cliente.from('ajustes_empresa').update(encendida).eq('id', 1)).error,
    'encender la limpieza',
  )
  return antes.data ?? encendida
}

// Los vehículos de Corea, sus leads y sus fotos. `ids`: lo que reemplaza cada `:nombre` del SQL.
async function sembrarCorea(ids: Record<string, string>, pia: string, proyecto: string) {
  const enCorea = sembrar(
    `insert into public.vehiculos (origen_id, titulo, anio, vin, lote, fase_id, categoria_id, publicado_web, creado_por,
       atributos, creado_en, eliminado_en)
     select :corea, t.titulo, t.anio, t.vin, t.lote, t.fase, t.cat, t.pub, t.de, t.atr::jsonb,
       timestamptz '2026-10-01 12:00:00.123456+00' - make_interval(mins => t.min), case when t.borrado then now() end
     from (values ${COREA}) t (titulo, min, anio, vin, lote, fase, cat, pub, de, atr, borrado)
     returning id, titulo`,
    ids,
  )
  const id = (titulo: string): string => {
    const uno = enCorea.get(titulo)
    if (!uno) {
      throw new Error(`No se sembró «${titulo}».`)
    }
    return uno
  }
  const leads: string[] = []
  for (const cual of ['uno', 'dos']) {
    const nombre = `Inv Pía ${cual} ${proyecto}`
    leads.push(await crearLead({ nombre, telefono: telefonoAlAzar(), deQuien: pia }))
  }
  for (const [titulo, lead] of EN_LEADS) {
    await vincular(id(titulo), leads[lead] ?? null)
  }
  for (const [titulo, cuantas] of FOTOS) {
    await sembrarFotos(id(titulo), cuantas)
  }
}

// Los vehículos de la subasta; devuelve el día de «Se limpiará pronto».
function sembrarSubasta(ids: Record<string, string>): string {
  const enSubasta = sembrar(
    `insert into public.vehiculos (origen_id, titulo, publicado_web, creado_por, creado_en, importado_apibara, subasta_en)
     select :subasta, t.titulo, t.pub, t.de, timestamptz '2026-10-01 12:00:00+00' - make_interval(mins => t.min), t.importado,
       now() - make_interval(days => t.dias)
     from (values ${SUBASTAS}) t (titulo, min, dias, importado, pub, de)
     returning id, titulo`,
    ids,
  )
  const media = literal(enSubasta.get('Subasta media') ?? '')
  const hasta = sql(`select public.limpieza_el(v) from public.vehiculos v where v.id = ${media}`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(hasta)) {
    throw new Error(`«Subasta media» no tiene fecha de limpieza («${hasta}»): ¿está apagada?`)
  }
  return hasta
}

function sembrarSituaciones(ids: Record<string, string>): void {
  sql(`insert into public.fases (flujo_id, nombre, orden, es_subasta)
    select id, 'Inv subasta', 90, true from public.flujos where origen_id = ${literal(ids['subasta'] ?? '')}`)
  sembrar(
    `insert into public.vehiculos (origen_id, titulo, creado_por, creado_en, estado_subasta, subasta_en, subasta_resultado, subasta_resuelta_en)
     select :subasta, t.titulo, t.de, timestamptz '2026-10-01 12:00:00+00' - make_interval(mins => t.min), 'terminada', now() - interval '3 days',
       case when t.no then 'no_ganada' end, case when t.no then now() end
     from (values ${SITUACIONES}) t (titulo, min, de, no)
     returning id, titulo`,
    ids,
  )
}

export async function prepararInventarioPostgrest(proyecto: string): Promise<TerrenoPostgrest> {
  await limpiarInventarioPostgrest()
  const { duena, corea } = await prepararInventario(proyecto)
  const pia = correoDePrueba(`pia-inv-${proyecto}`)
  await crearPersona({ email: pia, contrasena: CLAVE, nombre: 'Pía Inv', invitada: true })
  const subasta = await crearOrigenDePrueba('Subasta Inv', SUBASTA, {
    tipo: 'subasta',
    plataformas: ['copart'],
  })
  await darRolDePrueba({
    email: pia,
    rol: { nombre: `${PREFIJO_ROL_E2E}Pía Inv ${proyecto}`, clave: `e2e_pia_inv_${proyecto}` },
    permisos: [corea.id, subasta.id].map((origenId) => ({
      clave: 'vehiculos.ver',
      origenId,
      alcance: 'propios' as const,
    })),
  })
  const ajustesAntes = await encenderLimpieza()
  const fases = {
    publica: await crearFaseQuePublica(corea.id, 'Inv publica'),
    interna: await crearFaseInterna(corea.id, 'Inv interna'),
  }
  const categorias = { a: crearCategoria(corea.id, 'Inv A'), b: crearCategoria(corea.id, 'Inv B') }
  const quien = { pia: await idDe(pia), duena: await idDe(duena) }
  const ids = { ...quien, ...categorias, corea: corea.id, subasta: subasta.id }
  await sembrarCorea({ ...ids, pub: fases.publica, int: fases.interna }, pia, proyecto)
  const hasta = sembrarSubasta(ids)
  sembrarSituaciones(ids)

  const dePia = sql(`select v.id from public.vehiculos v where v.origen_id = ${literal(corea.id)}
    and v.eliminado_en is null and (v.creado_por = ${literal(quien.pia)} or v.lead_id is not null)`)
    .split('\n')
    .filter(Boolean)
  if (dePia.length !== 12) {
    throw new Error(`Pía tendría que ver 12 vehículos en Corea y el terreno le da ${dePia.length}.`)
  }
  const origenes = { corea: corea.id, subasta: subasta.id }
  return { duena, pia, ...origenes, fases, categorias, hasta, dePia, ajustesAntes }
}
