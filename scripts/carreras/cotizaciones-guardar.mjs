// Las carreras de `cotizacion_guardar` (paso 4.10, prompt 3), con dos conexiones reales a la base del Supabase LOCAL (el arnés de `scripts/carreras.mjs`: A abre una transacción y actúa,
// B lanza su llamada, el orquestador espera a que B esté esperando un lock y A confirma; si B no espera, la carrera no se probó y el script falla). Las que NO tienen que esperar (guardar contra publicar,
// contra transferir el lead o contra un cambio de permisos, y quien no puede editar) se miden aparte: B lleva un `statement_timeout` de 2 s y su respuesta tiene que ser inmediata. En todas, ningún
// interbloqueo (40P01). El orden de candados que prueban está comentado en `…008700_cotizacion_guardar.sql`: vehículo(s) en orden de id → cotización; ni el lead ni la fórmula.
import { PERSONAS, comoPersona } from './terreno.mjs'
import {
  crear,
  cuantas,
  insertaCotizacion,
  nuevoVehiculo,
  publica,
  terreno,
} from './cotizaciones.mjs'

const { duena, destino, soloEdita, sinVehiculos } = PERSONAS

let contador = 0
const nuevoId = () =>
  `00000000-0000-4000-8000-0000000c${String(2000 + ++contador).padStart(4, '0')}`
const consultaDe = (lado) => lado.consulta ?? `select ${lado.sql} as r`
const version = async (db, id) =>
  (await db.query(`select actualizado_en::text as v from public.cotizaciones where id = $1`, [id]))
    .rows[0].v
const revisiones = async (db, id, extra = '') =>
  Number(
    (
      await db.query(
        `select count(*) as n from public.cotizaciones_revisiones where cotizacion_id = $1 ${extra}`,
        [id],
      )
    ).rows[0].n,
  )
const fila = async (db, id) =>
  (
    await db.query(
      `select clase, titulo, vehiculo_id, eliminado_en is not null as en_papelera, valores ->> 'a' as a from public.cotizaciones where id = $1`,
      [id],
    )
  ).rows[0]

// Un guardado: la persona, la cotización, la versión que tenía en pantalla y lo que cambia (por omisión, el input `a` y un título).
const guarda = (
  persona,
  t,
  c,
  v,
  { intento = nuevoId(), a = 11, titulo = 'T', vehiculo = t.vehiculo } = {},
) => ({
  persona,
  sql: 'public.cotizacion_guardar($1, $2, $3::timestamptz, $4::jsonb, null, $5, null, $6)',
  args: [c, intento, v, JSON.stringify({ inputs: { a } }), titulo, vehiculo],
})

export async function carrerasDeGuardar({ orquesta, carrera, espero, conectar, esperarBloqueo }) {
  const sinInterbloqueo = (...rs) => rs.every((r) => r.codigo !== '40P01')

  // A actúa sin confirmar; B lanza su llamada con un corte de 2 s y tiene que responder sin esperar a A. Después A se deshace o confirma.
  async function sinEspera({ a, b, confirmar = false }) {
    const [ca, cb] = [await conectar(), await conectar()]
    try {
      for (const [c, lado] of [
        [ca, a],
        [cb, b],
      ]) {
        if (lado.rol) await c.query(`set role ${lado.rol}`)
        else await comoPersona(c, lado.persona)
      }
      await ca.query('begin')
      await ca.query(consultaDe(a), a.args)
      await cb.query('set statement_timeout = 2000')
      const rb = await cb.query(consultaDe(b), b.args).then(
        (r) => ({ ok: true, valor: r.rows[0]?.r ?? null }),
        (e) => ({ ok: false, codigo: e.code, mensaje: e.message }),
      )
      await ca.query(confirmar ? 'commit' : 'rollback')
      return rb
    } finally {
      await ca.end()
      await cb.end()
    }
  }

  // Una llamada sola, en su propia conexión y confirmada.
  async function llamar(lado) {
    const c = await conectar()
    try {
      if (lado.rol) await c.query(`set role ${lado.rol}`)
      else await comoPersona(c, lado.persona)
      return await c.query(consultaDe(lado), lado.args).then(
        (r) => ({ ok: true, valor: r.rows[0]?.r ?? null }),
        (e) => ({ ok: false, codigo: e.code, mensaje: e.message }),
      )
    } finally {
      await c.end()
    }
  }

  console.log('Dos guardados con la misma versión')
  {
    const t = await terreno(orquesta, 'g1')
    const c = nuevoId()
    await insertaCotizacion(orquesta, t, c)
    const v = await version(orquesta, c)
    const r = await carrera(orquesta, {
      a: guarda(duena, t, c, v, { a: 11, titulo: 'A' }),
      b: guarda(duena, t, c, v, { a: 12, titulo: 'B' }),
    })
    const f = await fila(orquesta, c)
    espero(
      'gana el primero; el segundo espera la fila y recibe el conflicto (PT409) sin pisar nada',
      r.a.ok &&
        r.b.codigo === 'PT409' &&
        f.titulo === 'A' &&
        f.a === '11' &&
        (await revisiones(orquesta, c)) === 1,
      { a: r.a, b: r.b, f },
    )
  }

  console.log('El mismo intento de guardar a la vez')
  {
    const t = await terreno(orquesta, 'g2')
    const c = nuevoId()
    await insertaCotizacion(orquesta, t, c)
    const v = await version(orquesta, c)
    const intento = nuevoId()
    const r = await carrera(orquesta, {
      a: guarda(duena, t, c, v, { intento }),
      b: guarda(duena, t, c, v, { intento }),
    })
    espero(
      'el segundo espera, ve el intento ya guardado y devuelve lo mismo con repetido: true (no PT409): una sola revisión',
      r.a.ok &&
        r.b.ok &&
        r.a.valor?.repetido === false &&
        r.b.valor?.repetido === true &&
        (await revisiones(orquesta, c, `and intento = '${intento}'`)) === 1,
      { a: r.a, b: r.b },
    )
  }

  console.log('El mismo intento con otros datos a la vez')
  {
    const t = await terreno(orquesta, 'g3')
    const c = nuevoId()
    await insertaCotizacion(orquesta, t, c)
    const v = await version(orquesta, c)
    const intento = nuevoId()
    const r = await carrera(orquesta, {
      a: guarda(duena, t, c, v, { intento, a: 11 }),
      b: guarda(duena, t, c, v, { intento, a: 12 }),
    })
    espero(
      'el segundo recibe «ya se hizo con otros datos» (22023) y no lo guardado en silencio',
      r.a.ok &&
        r.b.codigo === '22023' &&
        /otros datos/.test(r.b.mensaje ?? '') &&
        (await fila(orquesta, c)).a === '11',
      { a: r.a, b: r.b },
    )
  }

  console.log('Guardar mientras otra persona publica una versión nueva')
  {
    const t = await terreno(orquesta, 'g4')
    const c = nuevoId()
    await insertaCotizacion(orquesta, t, c)
    // Sin esperarse: la cotización usa SU versión y publicar no la espera ni ella a publicar.
    const rb = await sinEspera({
      a: publica(t, 'v2 sin confirmar'),
      b: guarda(duena, t, c, await version(orquesta, c)),
    })
    const { rows } = await orquesta.query(
      `select f.version from public.cotizaciones c join public.formulas f on f.id = c.formula_id where c.id = $1`,
      [c],
    )
    espero(
      'guardar no espera a quien publica (ni el corte de 2 s) y termina con la v1',
      rb.ok && rows[0].version === 1 && (await fila(orquesta, c)).a === '11',
      { rb, rows },
    )
    // Ya publicada la v2 (confirmada): guardar sigue con la v1.
    const rp = await llamar(publica(t, 'v2 confirmada'))
    const rg = await llamar(
      guarda(duena, t, c, await version(orquesta, c), { a: 14, titulo: 'tras publicar' }),
    )
    const { rows: rows2 } = await orquesta.query(
      `select f.version, c.valores ->> 'a' as a from public.cotizaciones c join public.formulas f on f.id = c.formula_id where c.id = $1`,
      [c],
    )
    espero(
      'con la v2 ya publicada, la cotización guarda con la v1 que tiene',
      rp.ok && rg.ok && rows2[0].version === 1 && rows2[0].a === '14',
      { rp, rg, rows2 },
    )
  }

  console.log('Guardar mientras se manda la cotización a la papelera')
  {
    const t = await terreno(orquesta, 'g5a')
    const c = nuevoId()
    await insertaCotizacion(orquesta, t, c)
    const papelera = (persona) => ({
      persona,
      sql: `public.papelera_enviar('cotizaciones', $1::uuid[])`,
      args: [[c]],
    })
    const r = await carrera(orquesta, {
      a: papelera(duena),
      b: guarda(duena, t, c, await version(orquesta, c)),
    })
    espero(
      'la papelera primero: guardar espera, ya no la ve (42501, como una que no existe) y no escribe',
      r.a.ok &&
        r.b.codigo === '42501' &&
        r.b.mensaje === 'No tienes acceso a esta cotización.' &&
        (await fila(orquesta, c)).titulo === null,
      { a: r.a, b: r.b },
    )
    const t2 = await terreno(orquesta, 'g5b')
    const c2 = nuevoId()
    await insertaCotizacion(orquesta, t2, c2)
    const r2 = await carrera(orquesta, {
      a: guarda(duena, t2, c2, await version(orquesta, c2), { titulo: 'antes de la papelera' }),
      b: {
        persona: duena,
        sql: `public.papelera_enviar('cotizaciones', $1::uuid[])`,
        args: [[c2]],
      },
    })
    const f2 = await fila(orquesta, c2)
    espero(
      'guardar primero: la papelera espera y se lleva la cotización ya guardada',
      r2.a.ok && r2.b.ok && f2.en_papelera && f2.titulo === 'antes de la papelera',
      { a: r2.a, b: r2.b, f2 },
    )
  }

  console.log('Guardar cambiando de vehículo mientras los vehículos van a la papelera')
  {
    const t = await terreno(orquesta, 'g6a')
    const v2 = await nuevoVehiculo(orquesta, t.origen, 'cot veh g6a nuevo')
    const c = nuevoId()
    await insertaCotizacion(orquesta, t, c)
    const lote = async (ids) =>
      JSON.stringify(
        await Promise.all(
          ids.map(async (id) => ({
            id,
            actualizado_en: (
              await orquesta.query(
                `select actualizado_en::text as v from public.vehiculos where id = $1`,
                [id],
              )
            ).rows[0].v,
          })),
        ),
      )
    const papelera = async (ids) => ({
      persona: duena,
      sql: 'public.vehiculos_papelera_enviar($1::jsonb)',
      args: [await lote(ids)],
    })
    const r = await carrera(orquesta, {
      a: await papelera([t.vehiculo, v2]),
      b: guarda(duena, t, c, await version(orquesta, c), { vehiculo: v2 }),
    })
    espero(
      'los vehículos a la papelera primero: guardar espera, ya no ve el nuevo (42501) y no escribe',
      r.a.ok &&
        r.b.codigo === '42501' &&
        /vehículo/.test(r.b.mensaje ?? '') &&
        (await fila(orquesta, c)).vehiculo_id === t.vehiculo,
      { a: r.a, b: r.b },
    )
    const t2 = await terreno(orquesta, 'g6b')
    const w2 = await nuevoVehiculo(orquesta, t2.origen, 'cot veh g6b nuevo')
    const c2 = nuevoId()
    await insertaCotizacion(orquesta, t2, c2)
    const r2 = await carrera(orquesta, {
      a: guarda(duena, t2, c2, await version(orquesta, c2), { vehiculo: w2 }),
      b: await papelera2(t2.vehiculo, w2),
    })
    const f2 = await fila(orquesta, c2)
    espero(
      'guardar primero: la papelera de los dos vehículos espera, sin interbloqueo, y se lleva la cotización con su vehículo nuevo',
      r2.a.ok && r2.b.ok && sinInterbloqueo(r2.a, r2.b) && f2.en_papelera && f2.vehiculo_id === w2,
      { a: r2.a, b: r2.b, f2 },
    )

    async function papelera2(x, y) {
      return papelera([x, y])
    }
  }

  console.log('Guardar sin cambiar de vehículo mientras su vehículo va a la papelera')
  {
    const t = await terreno(orquesta, 'g7a')
    const c = nuevoId()
    await insertaCotizacion(orquesta, t, c)
    const enviar = async (tt) => ({
      persona: duena,
      sql: 'public.vehiculos_papelera_enviar($1::jsonb)',
      args: [
        JSON.stringify([
          {
            id: tt.vehiculo,
            actualizado_en: (
              await orquesta.query(
                `select actualizado_en::text as v from public.vehiculos where id = $1`,
                [tt.vehiculo],
              )
            ).rows[0].v,
          },
        ]),
      ],
    })
    const r = await carrera(orquesta, {
      a: await enviar(t),
      b: guarda(duena, t, c, await version(orquesta, c)),
    })
    espero(
      'la papelera primero: guardar espera la cotización (que viaja con su vehículo) y responde 42501',
      r.a.ok && r.b.codigo === '42501' && (await fila(orquesta, c)).en_papelera,
      { a: r.a, b: r.b },
    )
    const t2 = await terreno(orquesta, 'g7b')
    const c2 = nuevoId()
    await insertaCotizacion(orquesta, t2, c2)
    const r2 = await carrera(orquesta, {
      a: guarda(duena, t2, c2, await version(orquesta, c2), { titulo: 'antes' }),
      b: await enviar(t2),
    })
    const f2 = await fila(orquesta, c2)
    espero(
      'guardar primero: la papelera del vehículo espera a la cotización, sin interbloqueo, y se la lleva guardada',
      r2.a.ok && r2.b.ok && sinInterbloqueo(r2.a, r2.b) && f2.en_papelera && f2.titulo === 'antes',
      { a: r2.a, b: r2.b, f2 },
    )
  }

  console.log('Guardar mientras se transfiere el lead de la cotización')
  {
    const t = await terreno(orquesta, 'g8')
    const c = nuevoId()
    await insertaCotizacion(orquesta, t, c)
    const rb = await sinEspera({
      a: {
        persona: duena,
        sql: 'public.lead_transferir($1, $2, $3)',
        args: [t.lead, destino, duena],
      },
      b: guarda(duena, t, c, await version(orquesta, c)),
    })
    espero(
      'guardar no toma el lead: no espera a quien lo transfiere (ni el corte de 2 s)',
      rb.ok && (await fila(orquesta, c)).a === '11',
      { rb },
    )
  }

  console.log('Guardar mientras se le quita a quien guarda el permiso de editar')
  {
    const t = await terreno(orquesta, 'g9')
    const c = nuevoId()
    await insertaCotizacion(orquesta, t, c)
    const revocar = {
      rol: 'service_role',
      consulta: `with d as (delete from public.roles_permisos where permiso_clave = 'cotizaciones.editar' and rol_id = (select id from public.roles where clave = 'carreras_cotiza') returning 1) select count(*) as r from d`,
      args: [],
    }
    const rb = await sinEspera({ a: revocar, b: guarda(duena, t, c, await version(orquesta, c)) })
    espero(
      'sin confirmar, guardar no espera (ve el permiso de antes) y guarda',
      rb.ok && (await fila(orquesta, c)).a === '11',
      { rb },
    )
    // Confirmada la revocación, el siguiente guardado ya no puede; el permiso se restituye al terminar.
    await llamar(revocar)
    const rc = await llamar(guarda(duena, t, c, await version(orquesta, c), { a: 13 }))
    await orquesta.query(
      `insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance) select id, 'cotizaciones.editar', null, 'todos' from public.roles where clave = 'carreras_cotiza'`,
    )
    espero(
      'con el permiso revocado y confirmado, guardar da 42501 (el de una que no existe) y no escribe',
      rc.codigo === '42501' &&
        rc.mensaje === 'No tienes acceso a esta cotización.' &&
        (await fila(orquesta, c)).a === '11',
      { rc },
    )
  }

  console.log(
    'Guardar cambiando de vehículo mientras un lote toma los vehículos de a uno (el orden de candados)',
  )
  {
    // Lo que hace la papelera de vehículos, paso a paso (cada vehículo `for update` y después sus cotizaciones), con A a mitad de camino cuando B llega: B tiene que esperar el PRIMER
    // vehículo (el de menor id), no tomar el segundo y quedarse esperando la cotización, que sería un interbloqueo cuando A pida el segundo.
    const t = await terreno(orquesta, 'g13')
    const otro = await nuevoVehiculo(orquesta, t.origen, 'cot veh g13 nuevo')
    const [bajo, alto] = [t.vehiculo, otro].sort()
    const c = nuevoId()
    await insertaCotizacion(orquesta, t, c, { vehiculo: bajo })
    const lado = guarda(duena, t, c, await version(orquesta, c), { vehiculo: alto })
    const [a, b] = [await conectar(), await conectar()]
    let ra
    let rb
    try {
      await a.query('begin')
      await a.query('select 1 from public.vehiculos where id = $1 for update', [bajo])
      await a.query('update public.cotizaciones set eliminado_en = now() where vehiculo_id = $1', [
        bajo,
      ])
      await comoPersona(b, duena)
      const pid = (await b.query('select pg_backend_pid() as pid')).rows[0].pid
      const llamada = b.query(consultaDe(lado), lado.args).then(
        () => ({ ok: true }),
        (e) => ({ ok: false, codigo: e.code, mensaje: e.message }),
      )
      await esperarBloqueo(orquesta, pid)
      ra = await a.query('select 1 from public.vehiculos where id = $1 for update', [alto]).then(
        () => ({ ok: true }),
        (e) => ({ ok: false, codigo: e.code, mensaje: e.message }),
      )
      await a.query(ra.ok ? 'commit' : 'rollback')
      rb = await llamada
    } finally {
      await a.end()
      await b.end()
    }
    espero(
      'B espera el primer vehículo, el lote sigue con el segundo sin interbloqueo y B responde que la cotización ya no está (42501)',
      ra.ok && sinInterbloqueo(ra, rb) && rb.codigo === '42501',
      { ra, rb },
    )
  }

  console.log('Guardar mientras la cotización se vuelve final y quien guarda no gestiona finales')
  {
    const t = await terreno(orquesta, 'g14')
    const c = nuevoId()
    await insertaCotizacion(orquesta, t, c)
    const r = await carrera(orquesta, {
      a: { persona: duena, sql: 'public.cotizacion_marcar_final($1)', args: [c] },
      b: guarda(soloEdita, t, c, await version(orquesta, c)),
    })
    espero(
      'B espera, vuelve a mirar el permiso con la cotización ya final y recibe el 42501 de una que no existe (no el conflicto de versión)',
      r.a.ok && r.b.codigo === '42501' && r.b.mensaje === 'No tienes acceso a esta cotización.',
      { a: r.a, b: r.b },
    )
  }

  console.log('Quien no puede editar no queda esperando el candado de la cotización')
  {
    const t = await terreno(orquesta, 'g10')
    const c = nuevoId()
    await insertaCotizacion(orquesta, t, c)
    const rb = await sinEspera({
      a: guarda(duena, t, c, await version(orquesta, c)),
      b: guarda(destino, t, c, await version(orquesta, c), { a: 12 }),
    })
    espero(
      'quien sólo cotiza recibe el error de una cotización que no existe (42501) sin esperar a A (no el corte por tiempo 57014)',
      rb.codigo === '42501' && rb.mensaje === 'No tienes acceso a esta cotización.',
      { rb },
    )
  }

  console.log('Quien no ve el vehículo nuevo no queda esperando su candado')
  {
    const t = await terreno(orquesta, 'g15')
    const otro = await nuevoVehiculo(orquesta, t.origen, 'cot veh g15 nuevo')
    const c = nuevoId()
    await insertaCotizacion(orquesta, t, c)
    const { rows } = await orquesta.query(
      `select actualizado_en::text as v from public.vehiculos where id = $1`,
      [otro],
    )
    const rb = await sinEspera({
      a: {
        persona: duena,
        sql: 'public.vehiculos_papelera_enviar($1::jsonb)',
        args: [JSON.stringify([{ id: otro, actualizado_en: rows[0].v }])],
      },
      b: guarda(sinVehiculos, t, c, await version(orquesta, c), { vehiculo: otro }),
    })
    espero(
      'quien edita pero no ve vehículos recibe el error de uno que no existe (42501) sin esperar a A (no el corte por tiempo 57014)',
      rb.codigo === '42501' && rb.mensaje === 'No tienes acceso a este vehículo.',
      { rb },
    )
  }

  console.log('Guardar y marcar como final a la vez')
  {
    const t = await terreno(orquesta, 'g11a')
    const c = nuevoId()
    await insertaCotizacion(orquesta, t, c)
    const marcar = (id) => ({
      persona: duena,
      sql: 'public.cotizacion_marcar_final($1)',
      args: [id],
    })
    const r = await carrera(orquesta, {
      a: marcar(c),
      b: guarda(duena, t, c, await version(orquesta, c)),
    })
    espero(
      'marcar primero: guardar espera, ve la versión nueva y recibe el conflicto (PT409)',
      r.a.ok && r.b.codigo === 'PT409' && (await fila(orquesta, c)).clase === 'final',
      { a: r.a, b: r.b },
    )
    const t2 = await terreno(orquesta, 'g11b')
    const c2 = nuevoId()
    await insertaCotizacion(orquesta, t2, c2)
    const r2 = await carrera(orquesta, {
      a: guarda(duena, t2, c2, await version(orquesta, c2), { titulo: 'guardada' }),
      b: marcar(c2),
    })
    const f2 = await fila(orquesta, c2)
    espero(
      'guardar primero: marcar como final espera y la deja final con lo guardado',
      r2.a.ok &&
        r2.b.ok &&
        sinInterbloqueo(r2.a, r2.b) &&
        f2.clase === 'final' &&
        f2.titulo === 'guardada',
      { a: r2.a, b: r2.b, f2 },
    )
    // Una hermana (otra preventa del mismo vehículo).
    const t3 = await terreno(orquesta, 'g11c')
    const c3 = nuevoId()
    const h3 = nuevoId()
    await insertaCotizacion(orquesta, t3, c3)
    await insertaCotizacion(orquesta, t3, h3)
    const r3 = await carrera(orquesta, {
      a: guarda(duena, t3, h3, await version(orquesta, h3), { titulo: 'hermana guardada' }),
      b: marcar(c3),
    })
    const fh = await fila(orquesta, h3)
    espero(
      'guardar la hermana primero: marcar espera y la manda a la papelera con lo guardado',
      r3.a.ok &&
        r3.b.ok &&
        sinInterbloqueo(r3.a, r3.b) &&
        fh.en_papelera &&
        fh.titulo === 'hermana guardada',
      { a: r3.a, b: r3.b, fh },
    )
    // Una hermana que guardar mueve a otro vehículo no se va a la papelera.
    const t4 = await terreno(orquesta, 'g11d')
    const v4 = await nuevoVehiculo(orquesta, t4.origen, 'cot veh g11d nuevo')
    const c4 = nuevoId()
    const h4 = nuevoId()
    await insertaCotizacion(orquesta, t4, c4)
    await insertaCotizacion(orquesta, t4, h4)
    const r4 = await carrera(orquesta, {
      a: guarda(duena, t4, h4, await version(orquesta, h4), { vehiculo: v4 }),
      b: marcar(c4),
    })
    const fh4 = await fila(orquesta, h4)
    espero(
      'la hermana que guardar mueve a otro vehículo sigue viva; la final queda en el suyo',
      r4.a.ok &&
        r4.b.ok &&
        sinInterbloqueo(r4.a, r4.b) &&
        !fh4.en_papelera &&
        fh4.vehiculo_id === v4 &&
        (await fila(orquesta, c4)).clase === 'final',
      { a: r4.a, b: r4.b, fh4 },
    )
  }

  console.log('Crear mientras cambia un tipo de cambio (sin esperarse)')
  {
    const t = await terreno(orquesta, 'g12')
    const rb = await sinEspera({
      a: {
        rol: 'service_role',
        consulta: `with u as (update public.tipos_cambio set valor = valor where clave = 'oficial' returning 1) select count(*) as r from u`,
        args: [],
      },
      b: crear(duena, t, nuevoId()),
    })
    espero(
      'crear no toma ningún candado sobre los tipos de cambio: no espera (ni el corte de 2 s) y crea',
      rb.ok && (await cuantas(orquesta, t.origen)) === 1,
      { rb },
    )
  }

  console.log('Los privilegios de lo nuevo, en la base real, y el orden en bytes de un nodo')
  {
    const llamables = [
      'public.cotizacion_guardar(uuid,uuid,timestamptz,jsonb,text,text,text,uuid)',
      'public.cotizacion_crear(uuid,uuid,uuid,jsonb,uuid,timestamptz,uuid,jsonb,text,clase_cotizacion,boolean)',
      'public.cotizacion_hoja(uuid)',
      'public.cotizacion_evaluar(jsonb,uuid,uuid,uuid,jsonb,text)',
    ]
    const internas = [
      'public._cotizacion_conservar(jsonb,jsonb,jsonb,jsonb)',
      'public._cotizacion_entradas_de(jsonb,jsonb,jsonb)',
      'public._cotizacion_abierta(uuid,uuid,timestamptz)',
      'public._cotizacion_vehiculo(uuid)',
      'public._cotizacion_modo(uuid,text)',
      'public._cotizacion_guardable(jsonb,jsonb)',
      'public._cotizacion_tipeado(jsonb,jsonb,jsonb,jsonb,boolean)',
      'public._cotizacion_armar(jsonb,uuid,uuid,uuid,uuid,timestamptz,boolean)',
      'public.cotizacion_version()',
      'public._cotizacion_hoja(uuid,uuid)',
      'public._hoja_estado(jsonb,boolean,boolean,text,text,boolean,boolean)',
      'public._hoja_chips(uuid,jsonb,jsonb,text,integer)',
    ]
    const mal = []
    for (const f of llamables) {
      const { rows } = await orquesta.query(
        `select has_function_privilege('authenticated', $1::regprocedure, 'execute') as auth, has_function_privilege('anon', $1::regprocedure, 'execute') as anon,
                exists (select 1 from pg_proc p, aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) x where p.oid = $1::regprocedure and x.grantee = 0) as publico`,
        [f],
      )
      if (!rows[0].auth || rows[0].anon || rows[0].publico)
        mal.push(`${f}: ${JSON.stringify(rows[0])}`)
    }
    for (const f of internas) {
      const { rows } = await orquesta.query(
        `select has_function_privilege('authenticated', $1::regprocedure, 'execute') as auth, has_function_privilege('anon', $1::regprocedure, 'execute') as anon,
                exists (select 1 from pg_proc p, aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) x where p.oid = $1::regprocedure and x.grantee = 0) as publico`,
        [f],
      )
      if (rows[0].auth || rows[0].anon || rows[0].publico)
        mal.push(`${f}: ${JSON.stringify(rows[0])}`)
    }
    for (const col of ['intento', 'huella']) {
      for (const rol of ['authenticated', 'anon']) {
        const { rows } = await orquesta.query(
          `select has_column_privilege($1, 'public.cotizaciones_revisiones', $2, 'select') as puede`,
          [rol, col],
        )
        if (rows[0].puede) mal.push(`${rol} lee cotizaciones_revisiones.${col}`)
      }
    }
    espero(
      'guardar sólo para authenticated, los ayudantes de nadie y el intento y la huella sin lectura',
      mal.length === 0,
      { mal },
    )

    // En la base de verdad la colación por omisión no es la de bytes: «B_x» va antes que «a_x» sólo con `collate "C"` (PGlite no lo distingue).
    let hint = null
    try {
      await orquesta.query(
        `select public._cotizacion_conservar('{"nodos":[{"id":"B_x","tipo":"input"},{"id":"a_x","tipo":"input"}]}', '{"inputs":{"B_x":1,"a_x":1},"banderas":{},"overrides":{}}', '{}', '{"valores":{},"fuentes":{}}')`,
      )
    } catch (e) {
      hint = e.hint
    }
    espero(
      'de dos nodos no editables, el primer error es el menor por id EN BYTES («B_x» antes que «a_x»)',
      hint === 'B_x',
      { hint },
    )
  }
}
