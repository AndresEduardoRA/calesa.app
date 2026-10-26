// Lo que los e2e de la hoja de cotizar (paso 4.13-2) preparan y miran en la base del Supabase LOCAL: un origen de prueba con una fórmula publicada que esconde cosas por nivel
// en todas las formas, el vigilante de los recálculos del navegador y el detector de lo que quien mira no tiene que recibir. Todo origen de prueba lleva la clave
// `e2e_4_13_…` (la limpieza borra sólo esos; sus fórmulas caen con ellos).
import { PREFIJO_CLAVE_E2E, crearOrigenDePrueba } from './origenes'
import { literal, sql } from './sql'

const CLAVE_BASE = `${PREFIJO_CLAVE_E2E}4_13_`

// La marca que llevan las etiquetas y los títulos escondidos: nada que no sea esa fórmula la puede contener.
export const MARCA = 'qz4h13'

// Lo que la fórmula de prueba esconde a quien no ve «costos»: la sección del nivel con su título, un tipo de cambio que un modo nombra, un interruptor, una celda con
// su etiqueta y su ayuda, unos atajos con valores centinela, un subtotal y un grupo sólo de nodos del nivel.
export const OCULTO = {
  ids: ['tc_x', 'oculta_b', 'x_celda', 'x_tabla', 'x_sub', 'gx', 'del_nivel'],
  etiquetas: [
    `TCX-${MARCA}`,
    `OCULTAB-${MARCA}`,
    `ETIQ-${MARCA}`,
    `XTAB-${MARCA}`,
    `XSUB-${MARCA}`,
    `GRUPOX-${MARCA}`,
    `SECCION-${MARCA}`,
    `AYUDA-${MARCA}`,
  ],
  numeros: [9191.5, 9192.5, 9193.5, 9194.5],
} as const

// Lo que la fórmula de prueba SÍ muestra a quien no ve «costos», en el orden del diseño.
export const VISIBLE_SIN_COSTOS = [
  'v',
  'activar',
  'tc',
  'pub',
  'dep',
  'cond_oc',
  'con_ayuda',
  'anio',
  'solo_n',
]

const ESTADOS_VACIOS = '[]'

const nodo = (n: Record<string, unknown>) => n

function definicionDePrueba() {
  return {
    nodos: [
      nodo({ id: 'tc', tipo: 'tipo_cambio', clave: 'oficial', etiqueta: 'TC', formato: 'raw' }),
      nodo({
        id: 'tc_x',
        tipo: 'tipo_cambio',
        clave: 'paralelo',
        etiqueta: `TCX-${MARCA}`,
        formato: 'raw',
      }),
      nodo({
        id: 'v',
        tipo: 'opcion',
        etiqueta: 'Variante',
        por_defecto: 'a',
        opciones: [
          { clave: 'a', etiqueta: 'A', titulo: 'TITULO A' },
          { clave: 'b', etiqueta: 'B', titulo: 'TITULO B' },
        ],
      }),
      nodo({ id: 'activar', tipo: 'bandera', etiqueta: 'Activar' }),
      nodo({ id: 'oculta_b', tipo: 'bandera', etiqueta: `OCULTAB-${MARCA}` }),
      nodo({ id: 'anio', tipo: 'campo_vehiculo', campo: 'anio', etiqueta: 'Año', formato: 'raw' }),
      nodo({ id: 'pub', tipo: 'input', etiqueta: 'Pública', grupo: 'gpub', solo_en: ['a'] }),
      nodo({
        id: 'dep',
        tipo: 'input',
        etiqueta: 'Dependiente',
        grupo: 'gpub',
        condicion: 'activar',
      }),
      nodo({
        id: 'cond_oc',
        tipo: 'input',
        etiqueta: 'Condicionada',
        grupo: 'gpub',
        condicion: 'oculta_b',
        requerido_si: 'oculta_b',
      }),
      nodo({ id: 'solo_n', tipo: 'input', etiqueta: 'Sólo editar', grupo: 'gpub' }),
      nodo({ id: 'con_ayuda', tipo: 'constante', etiqueta: 'Con ayuda', grupo: 'gpub' }),
      nodo({ id: 'x_celda', tipo: 'input', etiqueta: `ETIQ-${MARCA}`, grupo: 'gx' }),
      nodo({
        id: 'x_tabla',
        tipo: 'tabla',
        tabla: 'ch_tabla',
        match: { anio: 'anio' },
        columna: 'factor',
        etiqueta: `XTAB-${MARCA}`,
        sobrescribible: true,
      }),
      nodo({
        id: 'x_sub',
        tipo: 'calculo',
        op: 'suma',
        de: ['x_celda'],
        etiqueta: `XSUB-${MARCA}`,
      }),
      nodo({
        id: 'total',
        tipo: 'calculo',
        op: 'suma',
        etiqueta: 'Total',
        salida: 'total',
        de: ['pub', 'dep', 'cond_oc', 'solo_n', 'con_ayuda', 'x_celda'],
      }),
    ],
    buckets: { origen: 'tc', alt: 'tc_x' },
    total_en: 'tc',
    grupos: [
      { id: 'gpub', etiqueta: 'Pública', plazo: '1 día', tono: 'verde', bucket: 'origen' },
      { id: 'gx', etiqueta: `GRUPOX-${MARCA}`, plazo: '2 días', tono: 'naranja', bucket: 'alt' },
    ],
  }
}

function paramsDePrueba() {
  return {
    con_ayuda: 5,
    tablas: {
      ch_tabla: [
        { anio: 2018, factor: 9191.5 },
        { anio: 2019, factor: 9192.5 },
        { anio: 2020, factor: 9193.5 },
        { anio: 2021, factor: 9194.5 },
      ],
    },
  }
}

const celda = (nodo: string, ancho: string, mas: Record<string, unknown> = {}) => ({
  tipo: 'celda',
  nodo,
  ancho,
  ...mas,
})

const CABECERA = {
  ver_total_bs: true,
  modos: [
    {
      clave: 'm1',
      nombre: 'Modo uno',
      total_en: 'tc',
      buckets: [
        { bucket: 'origen', nodo: 'tc' },
        { bucket: 'alt', nodo: 'tc_x' },
      ],
    },
  ],
}

function seccionesDePrueba() {
  return [
    {
      id: 'abierta',
      titulo: 'Abierta',
      presentacion: 'principal',
      items: [
        { tipo: 'variante', nodo: 'v' },
        { tipo: 'interruptor', nodo: 'activar', efecto: 'habilita' },
        celda('tc', 'mitad'),
        celda('pub', 'mitad'),
        celda('dep', 'mitad'),
        celda('cond_oc', 'mitad'),
        celda('con_ayuda', 'mitad', { ayuda: { tabla: 'ch_tabla' } }),
        celda('anio', 'mitad'),
      ],
    },
    {
      id: 'solo_editar',
      titulo: 'Sólo editar',
      presentacion: 'principal',
      nivel_editar: 'costos',
      items: [celda('solo_n', 'completo')],
    },
    {
      id: 'del_nivel',
      titulo: `SECCION-${MARCA}`,
      presentacion: 'principal',
      nivel_ver: 'costos',
      nivel_editar: 'costos',
      items: [
        { tipo: 'interruptor', nodo: 'oculta_b', efecto: 'habilita' },
        celda('tc_x', 'mitad'),
        celda('x_celda', 'mitad', { ayuda: { texto: `AYUDA-${MARCA}` } }),
        { tipo: 'atajos', nodo: 'x_tabla', columna: 'anio', filas: 3 },
        celda('x_tabla', 'mitad'),
        { tipo: 'subtotal', nodo: 'x_sub' },
      ],
    },
  ]
}

function formulaDePrueba() {
  return {
    definicion: definicionDePrueba(),
    params: paramsDePrueba(),
    diseno: {
      cabecera: CABECERA,
      secciones: seccionesDePrueba(),
      tarjeta_total: { nodo: 'total', secundarios: [] },
    },
  }
}

// Publica una fórmula en un origen por el camino de verdad (`_preparar_publicacion()`: la valida y compila su visibilidad con los niveles y los tonos de la base).
export function publicarFormulaDePrueba(origenId: string): void {
  const { definicion, params, diseno } = formulaDePrueba()
  const json = (valor: unknown) => `$e2e$${JSON.stringify(valor)}$e2e$::jsonb`
  sql(`
    do $f$
    declare v_def jsonb := ${json(definicion)}; v_par jsonb := ${json(params)}; v_dis jsonb := ${json(diseno)};
    begin
      insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad, nota, publicado_en)
      values (${literal(origenId)}::uuid, 1, 'publicada', v_def, v_par, v_dis, public._preparar_publicacion(v_def, v_par, v_dis, false), 'E2E 4.13', now());
    end $f$`)
}

// Publica la versión siguiente de la fórmula de prueba de un origen con otro valor de la constante `con_ayuda` (lo que haría `formula_cambiar_constante`, sin pasar por una sesión):
// la anterior queda archivada. Para probar lo que pasa con una hoja que se abrió antes (4-28).
export function publicarLaVersionSiguiente(origenId: string, conAyuda: number): void {
  sql(`
    do $f$
    declare v1 public.formulas;
    begin
      select * into v1 from public.formulas where origen_id = ${literal(origenId)}::uuid and estado = 'publicada';
      update public.formulas set estado = 'archivada' where id = v1.id;
      insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad, nota, publicado_en)
      values (v1.origen_id, v1.version + 1, 'publicada', v1.definicion, jsonb_set(v1.params, '{con_ayuda}', to_jsonb(${conAyuda}::numeric)), v1.diseno, v1.visibilidad, 'E2E 4.13 siguiente', now());
    end $f$`)
}

// Un origen con la fórmula de prueba publicada, o sin ninguna (`conFormula: false`, para «Falta publicar la fórmula»). `proyecto` va en la clave y el nombre: dos proyectos no se pisan.
export async function crearOrigenDeCotizar(
  proyecto: string,
  resto: string,
  conFormula: boolean,
): Promise<{ id: string; nombre: string }> {
  const origen = await crearOrigenDePrueba(
    `E2E 4.13 ${resto} ${proyecto}`,
    `4_13_${resto}_${proyecto}`,
    {
      tipo: 'manual',
    },
  )
  if (conFormula) {
    publicarFormulaDePrueba(origen.id)
  }
  return origen
}

export function borrarOrigenesDeCotizar(): void {
  sql(`delete from public.origenes where clave like '${CLAVE_BASE}%'`)
}

// Los nodos de las secciones de un nivel de una fórmula publicada de un origen de la semilla, con su etiqueta: lo que quien no ve ese nivel no tiene que recibir.
export function ocultoDeUnaFormulaSembrada(
  claveDelOrigen: string,
  nivel: string,
): { ids: string[]; etiquetas: string[]; visibles: string[] } {
  const salida = sql(`
    with f as (select o.clave, x.definicion, x.diseno from public.formulas x join public.origenes o on o.id = x.origen_id where o.clave = ${literal(claveDelOrigen)} and x.estado = 'publicada'),
    its as (select s ->> 'nivel_ver' as nivel, i ->> 'nodo' as nodo, f.definicion
              from f, jsonb_array_elements(f.diseno -> 'secciones') s, jsonb_array_elements(s -> 'items') i),
    con_pct as (select nivel, nodo from its union select nivel, n ->> 'pct' from its, jsonb_array_elements(its.definicion -> 'nodos') n where n ->> 'id' = its.nodo and (n ->> 'pct') is not null),
    ocultos as (select distinct nodo from con_pct where nivel = ${literal(nivel)} and nodo is not null),
    visibles as (select distinct nodo from con_pct where coalesce(nivel, 'todos') <> ${literal(nivel)} and nodo is not null)
    select jsonb_build_object(
      'ids', (select coalesce(jsonb_agg(nodo order by nodo), '[]') from ocultos where nodo not in (select nodo from visibles)),
      'etiquetas', (select coalesce(jsonb_agg(distinct n ->> 'etiqueta'), '[]') from f, jsonb_array_elements(f.definicion -> 'nodos') n
                     where n ->> 'id' in (select nodo from ocultos where nodo not in (select nodo from visibles))
                       and (n ->> 'etiqueta') not in (select n2 ->> 'etiqueta' from f, jsonb_array_elements(f.definicion -> 'nodos') n2 where n2 ->> 'id' in (select nodo from visibles))),
      'visibles', (select coalesce(jsonb_agg(nodo order by nodo), '[]') from visibles))`)
  return JSON.parse(salida || ESTADOS_VACIOS) as {
    ids: string[]
    etiquetas: string[]
    visibles: string[]
  }
}

type ItemDelDiseno = { tipo: string; nodo: string }
type SeccionDelDiseno = { id: string; items: ItemDelDiseno[] }

// El orden que declara el diseño publicado de un origen para quien ve todos los niveles: las secciones y, de cada una, sus ítems (los atajos aparte: llevan `data-atajos`, no
// `data-nodo`). `sin` son nodos que la hoja no dibuja mientras su interruptor de «muestra» está apagado (la garantía).
export function ordenDeclarado(claveDelOrigen: string, sin: readonly string[] = ['garantia']) {
  const diseno = JSON.parse(
    sql(
      `select f.diseno from public.formulas f join public.origenes o on o.id = f.origen_id where o.clave = ${literal(claveDelOrigen)} and f.estado = 'publicada'`,
    ),
  ) as { secciones: SeccionDelDiseno[] }
  const dibujados = diseno.secciones
    .map((s) => ({
      id: s.id,
      items: s.items.filter((i) => !(i.tipo === 'celda' && sin.includes(i.nodo))),
    }))
    .filter((s) => s.items.length > 0)
  return {
    secciones: dibujados.map((s) => s.id),
    nodos: dibujados.flatMap((s) => s.items.filter((i) => i.tipo !== 'atajos').map((i) => i.nodo)),
    atajos: dibujados.flatMap((s) => s.items.filter((i) => i.tipo === 'atajos').map((i) => i.nodo)),
  }
}
