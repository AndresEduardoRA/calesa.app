// Las carreras de los niveles de acceso (paso 4.09, prompt 1): dos `nivel_crear` con la misma clave, eliminar un nivel mientras otra persona publica un diseño que
// lo nombra (en los dos órdenes) y eliminar contra retirar y renombrar. Cada una abre una transacción de A y deja a B esperando un lock (el arnés de
// `scripts/carreras.mjs`): si B no espera, la carrera no se probó. Trabaja en niveles y orígenes propios (prefijo «Carreras»).
// Después de cada una vale el invariante: ninguna versión publicada o archivada nombra un nivel que no existe.
import { PERSONAS, PREFIJO, comoPersona } from './terreno.mjs'

const { configura: persona } = PERSONAS

// Una fórmula mínima (cuatro entradas) y el diseño que pone `n` de ellas en una sección del nivel `clave`.
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
const disenoCon = (clave) => ({
  cabecera: { modos: [], ver_total_bs: false },
  secciones: [
    {
      id: 'del_nivel',
      presentacion: 'principal',
      nivel_ver: clave,
      nivel_editar: clave,
      items: [celda('a'), celda('b')],
    },
    { id: 'abierta', presentacion: 'principal', items: [celda('c'), celda('d')] },
  ],
  tarjeta_total: { nodo: 'total', secundarios: [] },
})

let numero = 0
// Un nivel con sus dos permisos (en una sola sentencia: el trigger diferido los exige al cerrar) y un origen propio.
async function terreno(db, etiqueta) {
  numero += 1
  const nombre = `${PREFIJO} ${etiqueta} ${numero}`
  const clave = `carreras_${etiqueta}_${numero}`
  const {
    rows: [nivel],
  } = await db.query(
    `with n as (insert into public.cotizaciones_niveles (clave, nombre) values ($1, $2) returning id, clave, actualizado_en)
     select n.id, n.clave, n.actualizado_en::text as v, public._nivel_permisos_crear(n.clave, $2, true) from n`,
    [clave, nombre],
  )
  const {
    rows: [origen],
  } = await db.query(`insert into public.origenes (clave, nombre) values ($1, $2) returning id`, [
    `carreras_${etiqueta}_${numero}`,
    nombre,
  ])
  return { id: nivel.id, clave, v: nivel.v, origen: origen.id }
}

const publica = (t, nota) => ({
  persona,
  consulta: `with g as (select public.formula_guardar_borrador($1, $2::jsonb, '{}'::jsonb, $3::jsonb) as id)
             select public.formula_publicar($1, $4) as r from g`,
  args: [t.origen, JSON.stringify(definicion), JSON.stringify(disenoCon(t.clave)), nota],
})

// El invariante de 4.09: ninguna versión publicada o archivada nombra, en su diseño o su visibilidad, un nivel que no existe.
async function invariante(db) {
  const {
    rows: [r],
  } = await db.query(
    `select count(*)::int as n from public.formulas f
      cross join lateral (select x from jsonb_array_elements_text(public._niveles_del_diseno(f.diseno)) x
                           union all
                          select y from jsonb_each(f.visibilidad) e, unnest(array[e.value ->> 'ver', e.value ->> 'editar']) y where y is not null) u (nivel)
      where f.estado <> 'borrador' and u.nivel <> 'todos'
        and not exists (select 1 from public.cotizaciones_niveles c where c.clave = u.nivel)`,
  )
  return r.n === 0
}

const existe = async (db, clave) =>
  (await db.query(`select 1 from public.cotizaciones_niveles where clave = $1`, [clave])).rowCount >
  0
const permisos = async (db, clave) =>
  Number(
    (await db.query(`select count(*) as n from public.permisos where nivel_clave = $1`, [clave]))
      .rows[0].n,
  )
const versiones = async (db, origen) =>
  Number(
    (
      await db.query(
        `select count(*) as n from public.formulas where origen_id = $1 and estado <> 'borrador'`,
        [origen],
      )
    ).rows[0].n,
  )

export async function carrerasDeNiveles({ orquesta, carrera, espero, conectar, esperarBloqueo }) {
  console.log('Dos nivel_crear con la misma clave')
  {
    // «Carreras Gerencia» y «Carreras  Gerencia!» son nombres distintos con la misma clave: gana uno, el otro se rechaza sin dejar un nivel sin permisos.
    const nombre = `${PREFIJO} Gerencia ${++numero}`
    const r = await carrera(orquesta, {
      a: { persona, sql: 'public.nivel_crear(gen_random_uuid(), $1)', args: [nombre] },
      b: {
        persona,
        sql: 'public.nivel_crear(gen_random_uuid(), $1)',
        args: [nombre.replace(' ', '  ') + '!'],
      },
    })
    const clave = `carreras_gerencia_${numero}`
    const {
      rows: [n],
    } = await orquesta.query(
      `select count(*)::int as n from public.cotizaciones_niveles where clave = $1`,
      [clave],
    )
    espero(
      'uno gana y el otro se rechaza limpio (23505, con el mensaje de la clave): un nivel y sus dos permisos',
      r.a.ok &&
        r.b.codigo === '23505' &&
        /con la clave/.test(r.b.mensaje ?? '') &&
        n.n === 1 &&
        (await permisos(orquesta, clave)) === 2,
      { a: r.a, b: r.b, n },
    )
  }

  console.log('Dos nivel_crear con el mismo intento')
  {
    const id = '00000000-0000-4000-8000-0000000c0e01'
    const nombre = `${PREFIJO} Intento ${++numero}`
    const r = await carrera(orquesta, {
      a: { persona, sql: 'public.nivel_crear($1::uuid, $2)', args: [id, nombre] },
      b: { persona, sql: 'public.nivel_crear($1::uuid, $2)', args: [id, nombre] },
    })
    espero(
      'el reintento no duplica: el segundo responde «repetido»',
      r.a.ok && r.b.ok && r.b.valor?.repetido === true,
      { a: r.a, b: r.b },
    )
  }

  console.log('Eliminar un nivel mientras se publica un diseño que lo nombra')
  {
    const t = await terreno(orquesta, 'elimina')
    const r = await carrera(orquesta, {
      a: { persona, sql: 'public.nivel_eliminar($1, $2::timestamptz)', args: [t.id, t.v] },
      b: publica(t, 'Con el nivel'),
    })
    // Nadie lo nombraba cuando A miró: A lo elimina. B esperaba la fila (publicar toma el nivel `for key share`) y, al llegar, el nivel ya no existe.
    espero(
      'elimina primero: publicar da nivel_inexistente (22023) y no queda versión, ni nivel, ni permisos',
      r.a.ok &&
        r.b.codigo === '22023' &&
        !(await existe(orquesta, t.clave)) &&
        (await permisos(orquesta, t.clave)) === 0 &&
        (await versiones(orquesta, t.origen)) === 0 &&
        (await invariante(orquesta)),
      { a: r.a, b: r.b },
    )
  }

  console.log('Publicar un diseño que nombra un nivel mientras se lo elimina')
  {
    const t = await terreno(orquesta, 'publicaelimina')
    const r = await carrera(orquesta, {
      a: publica(t, 'Primero publica'),
      b: { persona, sql: 'public.nivel_eliminar($1, $2::timestamptz)', args: [t.id, t.v] },
    })
    // A tomó el nivel y publicó; B esperaba su fila y, al llegar, mira el uso con la versión ya confirmada: no se elimina.
    espero(
      'publica primero: eliminar da nivel_en_uso (23503) y el nivel, sus permisos y la versión siguen',
      r.a.ok &&
        r.b.codigo === '23503' &&
        (await existe(orquesta, t.clave)) &&
        (await permisos(orquesta, t.clave)) === 2 &&
        (await versiones(orquesta, t.origen)) === 1 &&
        (await invariante(orquesta)),
      { a: r.a, b: r.b },
    )
  }

  console.log('Crear un nivel y renombrar otro al mismo nombre')
  {
    const t = await terreno(orquesta, 'choque')
    const nombre = `${PREFIJO} Destino ${numero}`
    const r = await carrera(orquesta, {
      a: { persona, sql: 'public.nivel_crear(gen_random_uuid(), $1)', args: [nombre] },
      b: {
        persona,
        sql: 'public.nivel_renombrar($1, $2::timestamptz, $3)',
        args: [t.id, t.v, nombre],
      },
    })
    // Sin el candado de la tabla en renombrar, B pasa su chequeo de nombre y cae después en el índice único, con su texto técnico.
    espero(
      'el segundo se rechaza con el mensaje del nombre repetido (23505), no con el del índice',
      r.a.ok && r.b.codigo === '23505' && /^Ya hay un nivel «/.test(r.b.mensaje ?? ''),
      { a: r.a, b: r.b },
    )
  }

  console.log('Eliminar un nivel mientras otra edición borra el rol que lo tiene concedido')
  {
    // `rbac_eliminar_rol` toma el rol `for update` y después borra sus concesiones; eliminar un nivel borra las mismas concesiones y después toca el rol
    // (`_rol_tocar`). Si no pidiera los roles antes de borrar, cada uno esperaría lo que tiene el otro (40P01). A toma el rol y B empieza; cuando B espera,
    // A sigue y borra el rol: tienen que terminar los dos.
    const t = await terreno(orquesta, 'rol')
    const {
      rows: [rol],
    } = await orquesta.query(
      `insert into public.roles (clave, nombre) values ($1, $2) returning id, actualizado_en::text as v`,
      [`carreras_rol_${numero}`, `${PREFIJO} rol ${numero}`],
    )
    await orquesta.query(
      `insert into public.roles_permisos (rol_id, permiso_clave, alcance) values ($1, $2, 'todos')`,
      [rol.id, `cotizaciones.nivel.${t.clave}.ver`],
    )
    const [ca, cb] = [await conectar(), await conectar()]
    try {
      await comoPersona(cb, persona)
      await ca.query('begin')
      await ca.query(`select public._rol_para_editar($1, $2::timestamptz)`, [rol.id, rol.v])
      const pidB = (await cb.query('select pg_backend_pid() as pid')).rows[0].pid
      const b = cb
        .query(`select public.nivel_eliminar($1, $2::timestamptz) as r`, [t.id, t.v])
        .then(
          () => ({ ok: true }),
          (e) => ({ ok: false, codigo: e.code, mensaje: e.message }),
        )
      await esperarBloqueo(orquesta, pidB)
      const a = ca.query(`delete from public.roles where id = $1`, [rol.id]).then(
        () => ({ ok: true }),
        (e) => ({ ok: false, codigo: e.code, mensaje: e.message }),
      )
      const resultadoA = await a
      await ca.query(resultadoA.ok ? 'commit' : 'rollback')
      const resultadoB = await b
      espero(
        'terminan los dos, sin bloqueo mutuo (40P01): el rol se fue y el nivel también',
        resultadoA.ok &&
          resultadoB.ok &&
          !(await existe(orquesta, t.clave)) &&
          (await permisos(orquesta, t.clave)) === 0,
        { a: resultadoA, b: resultadoB },
      )
    } finally {
      await ca.end()
      await cb.end()
    }
  }

  for (const [nombre, primero, segundo, esperado] of [
    ['retirar', 'nivel_retirar', 'nivel_eliminar', 'retira primero: eliminar da conflicto (PT409)'],
    [
      'eliminar',
      'nivel_eliminar',
      'nivel_retirar',
      'elimina primero: retirar da conflicto (PT409)',
    ],
  ]) {
    console.log(`${nombre === 'retirar' ? 'Retirar' : 'Eliminar'} un nivel y, a la vez, lo otro`)
    const t = await terreno(orquesta, nombre)
    const r = await carrera(orquesta, {
      a: { persona, sql: `public.${primero}($1, $2::timestamptz)`, args: [t.id, t.v] },
      b: { persona, sql: `public.${segundo}($1, $2::timestamptz)`, args: [t.id, t.v] },
    })
    espero(esperado, r.a.ok && r.b.codigo === 'PT409' && (await invariante(orquesta)), {
      a: r.a,
      b: r.b,
    })
  }

  for (const [nombre, primero, segundo] of [
    ['renombrar y eliminar', 'renombrar', 'eliminar'],
    ['eliminar y renombrar', 'eliminar', 'renombrar'],
  ]) {
    console.log(`Carrera: ${nombre}`)
    const t = await terreno(orquesta, nombre.replace(/ /g, ''))
    const llamada = (cual) =>
      cual === 'renombrar'
        ? {
            persona,
            sql: 'public.nivel_renombrar($1, $2::timestamptz, $3)',
            args: [t.id, t.v, `${PREFIJO} Otro ${numero}`],
          }
        : { persona, sql: 'public.nivel_eliminar($1, $2::timestamptz)', args: [t.id, t.v] }
    const r = await carrera(orquesta, { a: llamada(primero), b: llamada(segundo) })
    espero(`${nombre}: el segundo da conflicto (PT409)`, r.a.ok && r.b.codigo === 'PT409', {
      a: r.a,
      b: r.b,
    })
  }
}
