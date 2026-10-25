// Las carreras de `cotizacion_crear` y la escritura directa cerrada (paso 4.10, prompt 2), con dos conexiones reales a la base del Supabase LOCAL (el arnés de
// `scripts/carreras.mjs`: A abre una transacción y actúa, B lanza su llamada, el orquestador espera a que B esté esperando un lock y A confirma; si B no espera, la carrera
// no se probó y el script falla). Primero, lo que PGlite no distingue: los privilegios de verdad (la base real trae los de Supabase por omisión). Después, cada carrera con su
// origen, su fórmula, su lead y su vehículo propios (prefijo «Carreras»): el mismo id a la vez, crear contra publicar una versión nueva, crear contra transferir el lead,
// crear contra mandar el vehículo a la papelera (los dos órdenes de cada una) y dos finales del mismo vehículo. Nunca toca un origen de la semilla: el e2e corre después.
import { PERSONAS, PREFIJO, comoPersona, leadDeLaDuena } from './terreno.mjs'

const { duena, supervision, destino, configura, sinVehiculos } = PERSONAS

// Una fórmula de cuatro entradas y un total (la de `niveles.mjs`), sin niveles: lo que cualquiera con `cotizaciones.crear` puede tipear.
const definicion = {
  nodos: [
    { id: 'tc', tipo: 'tipo_cambio', clave: 'oficial', etiqueta: 'TC', formato: 'raw' },
    ...['a', 'b', 'c', 'd'].map((id) => ({
      id,
      tipo: 'input',
      etiqueta: id.toUpperCase(),
      bucket: 'origen',
    })),
    {
      id: 'total',
      tipo: 'calculo',
      op: 'suma',
      de: ['a', 'b', 'c', 'd'],
      etiqueta: 'Total',
      salida: 'total',
      bucket: 'origen',
    },
  ],
  buckets: { origen: 'tc' },
}
const celda = (nodo) => ({ tipo: 'celda', nodo, ancho: 'completo' })
const diseno = {
  cabecera: { modos: [], ver_total_bs: false },
  secciones: [{ id: 'abierta', presentacion: 'principal', items: ['a', 'b', 'c', 'd'].map(celda) }],
  tarjeta_total: { nodo: 'total', secundarios: [] },
}
// Lo que compila publicar: todos ven y editan todo, salvo el total (que no se edita).
const visibilidad = Object.fromEntries(
  [...definicion.nodos.map((n) => n.id)].map((id) => [
    id,
    { ver: 'todos', editar: id === 'total' ? null : 'todos' },
  ]),
)
const ENTRADAS = JSON.stringify({ inputs: { a: 10 } })

let numero = 0
// Un origen con su fórmula publicada, un vehículo y un lead de la dueña.
async function terreno(db, etiqueta, { compartidoCon } = {}) {
  numero += 1
  const {
    rows: [origen],
  } = await db.query(`insert into public.origenes (clave, nombre) values ($1, $2) returning id`, [
    `carreras_cot_${etiqueta}_${numero}`,
    `${PREFIJO} cot ${etiqueta} ${numero}`,
  ])
  const {
    rows: [v1],
  } = await db.query(
    `insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad, nota)
     values ($1, 1, 'publicada', $2::jsonb, '{}'::jsonb, $3::jsonb, $4::jsonb, 'v1') returning id`,
    [origen.id, JSON.stringify(definicion), JSON.stringify(diseno), JSON.stringify(visibilidad)],
  )
  const vehiculo = await nuevoVehiculo(db, origen.id, `cot veh ${etiqueta} ${numero}`)
  const lead = await leadDeLaDuena(db, `cot lead ${etiqueta} ${numero}`, { compartidoCon })
  return { origen: origen.id, v1: v1.id, vehiculo, lead }
}

async function nuevoVehiculo(db, origen, titulo) {
  const {
    rows: [fila],
  } = await db.query(
    `insert into public.vehiculos (origen_id, titulo, creado_por) values ($1, $2, $3) returning id`,
    [origen, `${PREFIJO} ${titulo}`, duena],
  )
  return fila.id
}

const crear = (
  persona,
  t,
  id,
  {
    clase = 'preventa',
    vehiculo = t.vehiculo,
    nuevo = null,
    formula = null,
    conLaAbierta = false,
  } = {},
) => ({
  persona,
  sql: 'public.cotizacion_crear($1, $2, $3, $4::jsonb, $5, now(), $6, $7::jsonb, null, $8::public.clase_cotizacion, $9)',
  args: [id, t.origen, t.lead, ENTRADAS, formula ?? t.v1, vehiculo, nuevo, clase, conLaAbierta],
})

// Publicar una versión nueva (guardar el borrador y publicarlo).
const publica = (t, nota) => ({
  persona: configura,
  consulta: `with g as (select public.formula_guardar_borrador($1, $2::jsonb, '{}'::jsonb, $3::jsonb) as id)
             select public.formula_publicar($1, $4) as r from g`,
  args: [t.origen, JSON.stringify(definicion), JSON.stringify(diseno), nota],
})

// Una cotización escrita directo (como la base, sin pasar por ninguna RPC) sobre la fórmula v1 del terreno: sirve de fixture a las carreras que no son de crear.
async function insertaCotizacion(db, t, id, { vehiculo = t.vehiculo, clase = 'preventa' } = {}) {
  await db.query(
    `insert into public.cotizaciones (id, origen_id, lead_id, vehiculo_id, creado_por, clase, formula_id, valores, fuentes, tipos_cambio, totales, total_base)
     values ($1, $2, $3, $4, $5, $6::public.clase_cotizacion, $7, '{"a": 10, "total": 10}'::jsonb, '{"a": "input"}'::jsonb, '{"oficial": 6.96}'::jsonb, '{"usd": 10}'::jsonb, 10)`,
    [id, t.origen, t.lead, vehiculo, duena, clase, t.v1],
  )
}

const cuantas = async (db, origen, extra = '') =>
  Number(
    (
      await db.query(
        `select count(*) as n from public.cotizaciones where origen_id = $1 ${extra}`,
        [origen],
      )
    ).rows[0].n,
  )

// Lo que `authenticated`, `anon` y PUBLIC pueden escribir de las dos tablas en la base real, por tabla y por columna, y que un insert, un update y un delete directos dan 42501.
async function privilegios(db, espero) {
  const tablas = ['cotizaciones', 'cotizaciones_revisiones']
  const roles = ['authenticated', 'anon', 'public']
  const sobran = []
  for (const tabla of tablas) {
    const { rows: columnas } = await db.query(
      `select attname, attnum from pg_attribute where attrelid = $1::regclass and attnum > 0 and not attisdropped`,
      [`public.${tabla}`],
    )
    for (const rol of roles) {
      for (const privilegio of [
        'INSERT',
        'UPDATE',
        'DELETE',
        'TRUNCATE',
        'REFERENCES',
        'TRIGGER',
      ]) {
        const {
          rows: [r],
        } = await db.query(`select has_table_privilege($1, $2, $3) as t`, [
          rol,
          `public.${tabla}`,
          privilegio,
        ])
        if (r.t) sobran.push(`${rol} ${privilegio} ${tabla}`)
      }
      for (const { attname } of columnas) {
        for (const privilegio of ['INSERT', 'UPDATE', 'REFERENCES']) {
          const {
            rows: [r],
          } = await db.query(`select has_column_privilege($1, $2, $3, $4) as t`, [
            rol,
            `public.${tabla}`,
            attname,
            privilegio,
          ])
          if (r.t) sobran.push(`${rol} ${privilegio} ${tabla}.${attname}`)
        }
      }
    }
  }
  espero(
    'authenticated, anon y PUBLIC no escriben cotizaciones ni sus revisiones, por tabla y por columna',
    sobran.length === 0,
    { sobran: sobran.slice(0, 10) },
  )

  const fallos = []
  for (const rol of ['authenticated', 'anon']) {
    if (rol === 'authenticated') await comoPersona(db, duena)
    else await db.query('set role anon')
    for (const sentencia of [
      `insert into public.cotizaciones (notas) values ('x')`,
      `update public.cotizaciones set valores = '{}'::jsonb where false`,
      `update public.cotizaciones set notas = 'x' where false`,
      `delete from public.cotizaciones where false`,
      `insert into public.cotizaciones_revisiones (cotizacion_id, diff) values (gen_random_uuid(), '{}'::jsonb)`,
      `delete from public.cotizaciones_revisiones where false`,
    ]) {
      const codigo = await db.query(sentencia).then(
        () => 'sin error',
        (e) => e.code,
      )
      if (codigo !== '42501') fallos.push(`${rol}: ${sentencia} dio ${codigo}`)
    }
    await db.query('reset role')
  }
  espero(
    'el insert, el update y el delete directos dan 42501 (authenticated y anon)',
    fallos.length === 0,
    { fallos },
  )
  const {
    rows: [propio],
  } = await db.query(
    `select has_table_privilege('service_role', 'public.cotizaciones', 'INSERT') and has_table_privilege('service_role', 'public.cotizaciones', 'UPDATE')
        and has_table_privilege('service_role', 'public.cotizaciones', 'DELETE') as ok`,
  )
  espero('service_role conserva lo suyo', propio.ok === true, propio)
}

export async function carrerasDeCotizaciones({ orquesta, carrera, espero, conectar }) {
  console.log('Privilegios de las cotizaciones (la base real)')
  await privilegios(orquesta, espero)

  console.log('El mismo intento de cotizacion_crear a la vez')
  {
    const t = await terreno(orquesta, 'mismo')
    const id = '00000000-0000-4000-8000-0000000c1c01'
    const llamada = crear(duena, t, id)
    const r = await carrera(orquesta, { a: llamada, b: llamada })
    espero(
      'una sola cotización: la segunda espera y devuelve la misma (repetido)',
      r.a.ok &&
        r.b.ok &&
        r.a.valor.repetido === false &&
        r.b.valor.repetido === true &&
        r.b.valor.cotizacion.id === id &&
        (await cuantas(orquesta, t.origen)) === 1,
      { a: r.a, b: r.b },
    )
  }

  console.log('El mismo intento a la vez, cargando el vehículo a mano')
  {
    const t = await terreno(orquesta, 'mano')
    const id = '00000000-0000-4000-8000-0000000c1c02'
    const vid = '00000000-0000-4000-8000-0000000c1c03'
    const nuevo = JSON.stringify({ id: vid, datos: { titulo: `${PREFIJO} a mano` } })
    const llamada = crear(duena, t, id, { vehiculo: null, nuevo })
    const r = await carrera(orquesta, { a: llamada, b: llamada })
    const {
      rows: [n],
    } = await orquesta.query(
      `select count(*)::int as n from public.vehiculos where id = $1 and origen_id = $2`,
      [vid, t.origen],
    )
    espero(
      'una cotización y un vehículo: la segunda devuelve la misma',
      r.a.ok &&
        r.b.ok &&
        r.b.valor.repetido === true &&
        n.n === 1 &&
        (await cuantas(orquesta, t.origen)) === 1,
      { a: r.a, b: r.b, vehiculos: n.n },
    )
  }

  console.log('Crear mientras otra persona publica una versión nueva (crear primero)')
  {
    const t = await terreno(orquesta, 'pub1')
    const id = '00000000-0000-4000-8000-0000000c1c04'
    const r = await carrera(orquesta, { a: crear(duena, t, id), b: publica(t, 'v2 de B') })
    const {
      rows: [c],
    } = await orquesta.query(
      `select c.formula_id, f.version, c.valores ->> 'a' as a from public.cotizaciones c join public.formulas f on f.id = c.formula_id where c.id = $1`,
      [id],
    )
    const {
      rows: [pub],
    } = await orquesta.query(
      `select version from public.formulas where origen_id = $1 and estado = 'publicada'`,
      [t.origen],
    )
    espero(
      'la cotización nace de la v1 (la que estaba publicada), publicar espera y termina en la v2',
      r.a.ok &&
        r.b.ok &&
        c?.formula_id === t.v1 &&
        c.version === 1 &&
        Number(c.a) === 10 &&
        pub?.version === 2,
      { a: r.a, b: r.b, c, pub },
    )
  }

  console.log('Crear mientras otra persona publica una versión nueva (publicar primero)')
  {
    // La hoja se abrió sobre la v1 y A publica la v2: B espera la fila de la v1, ve la v2 y avisa que la hoja está desactualizada (D2) sin guardar nada.
    const t = await terreno(orquesta, 'pub2')
    const id = '00000000-0000-4000-8000-0000000c1c05'
    const r = await carrera(orquesta, { a: publica(t, 'v2 de A'), b: crear(duena, t, id) })
    espero(
      'crear espera, ve la v2 y responde desactualizada (PT409) sin crear nada, ni la rechazada por la fórmula archivada (23514)',
      r.a.ok &&
        r.b.codigo === 'PT409' &&
        /Se publicó la versión 2 de la hoja/.test(r.b.mensaje ?? '') &&
        (await cuantas(orquesta, t.origen)) === 0,
      { a: r.a, b: r.b },
    )
  }

  console.log('Crear con «Guardar con la N» mientras otra persona publica (publicar primero)')
  {
    // Lo mismo, pero quien cotiza elige «Guardar con la N»: nace de la v1, ya archivada, que el trigger deja nacer.
    const t = await terreno(orquesta, 'pub3')
    const id = '00000000-0000-4000-8000-0000000c1c16'
    const r = await carrera(orquesta, {
      a: publica(t, 'v2 de A'),
      b: crear(duena, t, id, { conLaAbierta: true }),
    })
    const {
      rows: [c],
    } = await orquesta.query(
      `select c.formula_id, f.version, f.estado from public.cotizaciones c join public.formulas f on f.id = c.formula_id where c.id = $1`,
      [id],
    )
    espero(
      'la cotización nace de la v1 (archivada) que se abrió, aunque la publicada sea la v2',
      r.a.ok && r.b.ok && c?.formula_id === t.v1 && c.version === 1 && c.estado === 'archivada',
      { a: r.a, b: r.b, c },
    )
  }

  console.log('Crear mientras se transfiere el lead (crear primero)')
  {
    const t = await terreno(orquesta, 'tra1')
    const id = '00000000-0000-4000-8000-0000000c1c06'
    const r = await carrera(orquesta, {
      a: crear(supervision, t, id),
      b: {
        persona: duena,
        sql: 'public.lead_transferir($1, $2, $3)',
        args: [t.lead, destino, duena],
      },
    })
    const {
      rows: [d],
    } = await orquesta.query(
      `select usuario_id from public.leads_asesores where lead_id = $1 and tipo_acceso = 'dueno' and revocado_en is null`,
      [t.lead],
    )
    espero(
      'la cotización queda creada y el lead pasa a su destino, sin que una frene la otra para siempre',
      r.a.ok && r.b.ok && (await cuantas(orquesta, t.origen)) === 1 && d?.usuario_id === destino,
      { a: r.a, b: r.b, dueno: d },
    )
  }

  console.log('Crear mientras se transfiere el lead (transferir primero)')
  {
    const t = await terreno(orquesta, 'tra2')
    const id = '00000000-0000-4000-8000-0000000c1c07'
    const r = await carrera(orquesta, {
      a: {
        persona: duena,
        sql: 'public.lead_transferir($1, $2, $3)',
        args: [t.lead, destino, duena],
      },
      b: crear(supervision, t, id),
    })
    espero(
      'crear espera a la transferencia y después se crea (quien cotiza sigue viendo el lead)',
      r.a.ok && r.b.ok && (await cuantas(orquesta, t.origen)) === 1,
      { a: r.a, b: r.b },
    )
  }

  console.log('Quien no ve el lead no queda esperando su candado')
  {
    // A tiene el lead tomado (transferir, sin confirmar); B cotiza sin verlo: la respuesta es inmediata (42501), no una espera: sin confirmar nada, se corta a los 2 s.
    const t = await terreno(orquesta, 'nove')
    const a = await conectar()
    const b = await conectar()
    let rb
    try {
      await comoPersona(a, duena)
      await a.query('begin')
      await a.query('select public.lead_transferir($1, $2, $3)', [t.lead, supervision, duena])
      await comoPersona(b, destino)
      await b.query('set statement_timeout = 2000')
      rb = await b
        .query('select public.cotizacion_crear($1, $2, $3, $4::jsonb, $6, now(), $5) as r', [
          '00000000-0000-4000-8000-0000000c1c0c',
          t.origen,
          t.lead,
          ENTRADAS,
          t.vehiculo,
          t.v1,
        ])
        .then(
          () => ({ ok: true }),
          (e) => ({ ok: false, codigo: e.code, mensaje: e.message }),
        )
    } finally {
      await a.query('rollback').catch(() => undefined)
      await a.end()
      await b.end()
    }
    espero(
      'B recibe el error de un lead que no existe sin esperar a A (42501, no el corte por tiempo 57014)',
      rb.codigo === '42501' &&
        /lead/.test(rb.mensaje ?? '') &&
        (await cuantas(orquesta, t.origen)) === 0,
      { b: rb },
    )
  }

  console.log('Crear mientras se le quita a quien cotiza el acceso al lead')
  {
    const t = await terreno(orquesta, 'rev', { compartidoCon: destino })
    const id = '00000000-0000-4000-8000-0000000c1c0d'
    const r = await carrera(orquesta, {
      a: { persona: duena, sql: 'public.lead_revocar_acceso($1, $2)', args: [t.lead, destino] },
      b: crear(destino, t, id),
    })
    espero(
      'crear espera, vuelve a mirar el lead tras el candado, ya no lo ve (42501) y no deja ninguna cotización',
      r.a.ok && r.b.codigo === '42501' && (await cuantas(orquesta, t.origen)) === 0,
      { a: r.a, b: r.b },
    )
  }

  console.log('Crear mientras se manda el vehículo a la papelera (crear primero)')
  {
    const t = await terreno(orquesta, 've1')
    const id = '00000000-0000-4000-8000-0000000c1c08'
    const version = (
      await orquesta.query(`select actualizado_en::text as v from public.vehiculos where id = $1`, [
        t.vehiculo,
      ])
    ).rows[0].v
    const r = await carrera(orquesta, {
      a: crear(duena, t, id),
      b: {
        persona: duena,
        sql: 'public.vehiculos_papelera_enviar($1::jsonb)',
        args: [JSON.stringify([{ id: t.vehiculo, actualizado_en: version }])],
      },
    })
    const {
      rows: [vivas],
    } = await orquesta.query(
      `select count(*)::int as n from public.cotizaciones c join public.vehiculos v on v.id = c.vehiculo_id
        where c.origen_id = $1 and c.eliminado_en is null and v.eliminado_en is not null`,
      [t.origen],
    )
    espero(
      'ninguna cotización viva con el vehículo en la papelera (la papelera se lleva también la recién creada)',
      r.a.ok && r.b.ok && vivas.n === 0 && (await cuantas(orquesta, t.origen)) === 1,
      { a: r.a, b: r.b, vivas },
    )
  }

  console.log('Crear mientras se manda el vehículo a la papelera (la papelera primero)')
  {
    const t = await terreno(orquesta, 've2')
    const id = '00000000-0000-4000-8000-0000000c1c09'
    const version = (
      await orquesta.query(`select actualizado_en::text as v from public.vehiculos where id = $1`, [
        t.vehiculo,
      ])
    ).rows[0].v
    const r = await carrera(orquesta, {
      a: {
        persona: duena,
        sql: 'public.vehiculos_papelera_enviar($1::jsonb)',
        args: [JSON.stringify([{ id: t.vehiculo, actualizado_en: version }])],
      },
      b: crear(duena, t, id),
    })
    espero(
      'crear espera, ya no ve el vehículo (42501, el de uno que no existe) y no deja ninguna cotización',
      r.a.ok &&
        r.b.codigo === '42501' &&
        /vehículo/.test(r.b.mensaje ?? '') &&
        (await cuantas(orquesta, t.origen)) === 0,
      { a: r.a, b: r.b },
    )
  }

  console.log('Dos finales del mismo vehículo a la vez')
  {
    const t = await terreno(orquesta, 'fin')
    const r = await carrera(orquesta, {
      a: crear(duena, t, '00000000-0000-4000-8000-0000000c1c0a', { clase: 'final' }),
      b: crear(duena, t, '00000000-0000-4000-8000-0000000c1c0b', { clase: 'final' }),
    })
    espero(
      'gana la primera; la segunda espera al índice y recibe el error claro (23505, «ya tiene una cotización final activa»)',
      r.a.ok &&
        r.b.codigo === '23505' &&
        /ya tiene una cotización final activa/.test(r.b.mensaje ?? '') &&
        (await cuantas(orquesta, t.origen, `and clase = 'final'`)) === 1,
      { a: r.a, b: r.b },
    )
  }

  console.log('Marcar una cotización como final mientras otra persona le cambia el vehículo')
  {
    // A le cambia el vehículo (sin confirmar); B la marca como final. B espera la fila, la vuelve a leer y trabaja con el vehículo de ahora: el viejo no recibe el lead ni pierde sus preventas.
    const t = await terreno(orquesta, 'fin2')
    const v2 = await nuevoVehiculo(orquesta, t.origen, 'cot veh fin2 nuevo')
    const c = '00000000-0000-4000-8000-0000000c1c10'
    const hermana = '00000000-0000-4000-8000-0000000c1c11'
    await insertaCotizacion(orquesta, t, c)
    await insertaCotizacion(orquesta, t, hermana)
    const r = await carrera(orquesta, {
      a: {
        rol: 'service_role',
        consulta:
          'with u as (update public.cotizaciones set vehiculo_id = $2 where id = $1 returning 1) select count(*) as r from u',
        args: [c, v2],
      },
      b: { persona: duena, sql: 'public.cotizacion_marcar_final($1)', args: [c] },
    })
    const {
      rows: [fila],
    } = await orquesta.query(
      `select c.clase, c.vehiculo_id, (select eliminado_en is not null from public.cotizaciones where id = $2) as hermana_a_papelera,
              (select lead_id from public.vehiculos where id = $3) as lead_del_viejo, (select lead_id from public.vehiculos where id = $4) as lead_del_nuevo
         from public.cotizaciones c where c.id = $1`,
      [c, hermana, t.vehiculo, v2],
    )
    espero(
      'queda final en el vehículo nuevo, el lead se vincula al nuevo y la preventa del viejo sigue viva',
      r.a.ok &&
        r.b.ok &&
        fila.clase === 'final' &&
        fila.vehiculo_id === v2 &&
        fila.hermana_a_papelera === false &&
        fila.lead_del_viejo === null &&
        fila.lead_del_nuevo === t.lead,
      { a: r.a, b: r.b, fila },
    )
  }

  console.log('Marcar como final mientras otra persona mueve una preventa del vehículo a otro')
  {
    // A mueve una preventa hermana al otro vehículo (sin confirmar); B marca la suya como final. B espera a la hermana, vuelve a mirar su vehículo y la deja: la papelera sólo se lleva las que siguen ahí.
    const t = await terreno(orquesta, 'fin3')
    const v2 = await nuevoVehiculo(orquesta, t.origen, 'cot veh fin3 nuevo')
    const c = '00000000-0000-4000-8000-0000000c1c12'
    const hermana = '00000000-0000-4000-8000-0000000c1c13'
    const otra = '00000000-0000-4000-8000-0000000c1c14'
    await insertaCotizacion(orquesta, t, c)
    await insertaCotizacion(orquesta, t, hermana)
    await insertaCotizacion(orquesta, t, otra)
    const r = await carrera(orquesta, {
      a: {
        rol: 'service_role',
        consulta:
          'with u as (update public.cotizaciones set vehiculo_id = $2 where id = $1 returning 1) select count(*) as r from u',
        args: [hermana, v2],
      },
      b: { persona: duena, sql: 'public.cotizacion_marcar_final($1)', args: [c] },
    })
    const {
      rows: [fila],
    } = await orquesta.query(
      `select (select clase from public.cotizaciones where id = $1) as clase, (select eliminado_en is not null from public.cotizaciones where id = $2) as movida_a_papelera,
              (select eliminado_en is not null from public.cotizaciones where id = $3) as otra_a_papelera`,
      [c, hermana, otra],
    )
    espero(
      'la preventa que se movió de vehículo sigue viva; la que se quedó va a la papelera',
      r.a.ok &&
        r.b.ok &&
        fila.clase === 'final' &&
        fila.movida_a_papelera === false &&
        fila.otra_a_papelera === true,
      { a: r.a, b: r.b, fila },
    )
  }

  console.log('Quien no ve el vehículo no queda esperando su candado')
  {
    // A tiene el vehículo tomado (a la papelera, sin confirmar); B cotiza sin verlo: la respuesta es inmediata (42501), no una espera: se corta a los 2 s.
    const t = await terreno(orquesta, 'noveveh')
    const version = (
      await orquesta.query(`select actualizado_en::text as v from public.vehiculos where id = $1`, [
        t.vehiculo,
      ])
    ).rows[0].v
    const a = await conectar()
    const b = await conectar()
    let rb
    try {
      await comoPersona(a, duena)
      await a.query('begin')
      await a.query('select public.vehiculos_papelera_enviar($1::jsonb)', [
        JSON.stringify([{ id: t.vehiculo, actualizado_en: version }]),
      ])
      await comoPersona(b, sinVehiculos)
      await b.query('set statement_timeout = 2000')
      rb = await b
        .query('select public.cotizacion_crear($1, $2, $3, $4::jsonb, $6, now(), $5) as r', [
          '00000000-0000-4000-8000-0000000c1c15',
          t.origen,
          t.lead,
          ENTRADAS,
          t.vehiculo,
          t.v1,
        ])
        .then(
          () => ({ ok: true }),
          (e) => ({ ok: false, codigo: e.code, mensaje: e.message }),
        )
    } finally {
      await a.query('rollback').catch(() => undefined)
      await a.end()
      await b.end()
    }
    espero(
      'B recibe el error de un vehículo que no ve sin esperar a A (42501, no el corte por tiempo 57014)',
      rb.codigo === '42501' &&
        /vehículo/.test(rb.mensaje ?? '') &&
        (await cuantas(orquesta, t.origen)) === 0,
      { b: rb },
    )
  }
}
