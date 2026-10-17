// Las carreras de la numeración de los leads (parte 9f-2). Lo que une a dos altas del mismo creador es el
// renglón de su contador (`leads_contadores`): el trigger de `leads` lo incrementa con un upsert, y el candado de
// ese renglón ordena a quienes crean a la vez. Un rollback deshace el incremento. Tres creadores importando a la
// vez no se estorban entre sí: cada uno tiene su renglón.
import { PERSONAS, PREFIJO, comoPersona } from './terreno.mjs'

const { duena, compartido, supervision } = PERSONAS

const origen = async (db) =>
  (await db.query(`select id from public.origenes_lead where activo order by orden, id limit 1`))
    .rows[0].id

const alta = (web, nombre, telefono, id = crypto.randomUUID()) => ({
  id,
  sql: 'public.crear_lead($1, $2::jsonb, null)',
  args: [
    id,
    JSON.stringify({
      nombre: `${PREFIJO} ${nombre}`,
      telefono_principal: telefono,
      origen_lead_id: web,
    }),
  ],
})

const propio = async (db, lead) =>
  (await db.query('select numero_propio from public.leads where id = $1', [lead])).rows[0]
    ?.numero_propio
const ultimo = async (db, persona) =>
  (await db.query('select ultimo from public.leads_contadores where usuario_id = $1', [persona]))
    .rows[0]?.ultimo ?? 0

const comoValor = (promesa) =>
  promesa.then(
    (r) => ({ ok: true, valor: r.rows[0]?.r ?? null }),
    (e) => ({ ok: false, codigo: e.code, mensaje: e.message }),
  )

// Una llamada a la RPC de importar como una persona, en una conexión propia.
async function importar(cliente, persona, importacion, filas) {
  await comoPersona(cliente, persona)
  try {
    return await comoValor(
      cliente.query('select public.leads_importar_lote($1, 500, $2::jsonb) as r', [
        importacion,
        JSON.stringify(filas),
      ]),
    )
  } finally {
    await cliente.query('reset role')
  }
}

// Un orden de teléfonos que no es el de las filas: la base inserta en el del teléfono.
const barajar = (lista) => {
  const copia = [...lista]
  for (let i = copia.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copia[i], copia[j]] = [copia[j], copia[i]]
  }
  return copia
}

export async function carrerasDeNumeros({ orquesta, carrera, espero, conectar, esperarBloqueo }) {
  const web = await origen(orquesta)

  console.log('Dos altas del mismo creador a la vez')
  {
    const antes = await ultimo(orquesta, duena)
    const a = alta(web, 'numero a', '77100001')
    const b = alta(web, 'numero b', '77100002')
    const r = await carrera(orquesta, {
      a: { persona: duena, sql: a.sql, args: a.args },
      b: { persona: duena, sql: b.sql, args: b.args },
    })
    const [na, nb] = [await propio(orquesta, a.id), await propio(orquesta, b.id)]
    espero(
      'números distintos y consecutivos: la que esperó toma el siguiente',
      r.a.ok &&
        r.b.ok &&
        na === antes + 1 &&
        nb === antes + 2 &&
        (await ultimo(orquesta, duena)) === antes + 2,
      { antes, na, nb, a: r.a, b: r.b },
    )
  }

  console.log('Un alta que se deshace mientras otra espera su número')
  {
    const antes = await ultimo(orquesta, compartido)
    const a = alta(web, 'numero deshecha', '77100003')
    const b = alta(web, 'numero espera', '77100004')
    const [ca, cb] = [await conectar(), await conectar()]
    try {
      await comoPersona(ca, compartido)
      await comoPersona(cb, compartido)
      await ca.query('begin')
      await ca.query(`select ${a.sql} as r`, a.args)
      const pidB = (await cb.query('select pg_backend_pid() as pid')).rows[0].pid
      const segundo = comoValor(cb.query(`select ${b.sql} as r`, b.args))
      await esperarBloqueo(orquesta, pidB)
      await ca.query('rollback')
      const rb = await segundo
      const nb = await propio(orquesta, b.id)
      const hay = (
        await orquesta.query('select count(*)::int as n from public.leads where id = $1', [a.id])
      ).rows[0].n
      espero(
        'la que esperó toma el número de la deshecha: no queda un hueco',
        rb.ok &&
          hay === 0 &&
          nb === antes + 1 &&
          (await ultimo(orquesta, compartido)) === antes + 1,
        { antes, nb, hay, rb },
      )
    } finally {
      await ca.end()
      await cb.end()
    }
  }

  console.log('Tres creadores importando 500 filas a la vez, y un alta de uno en medio')
  {
    const creadores = [
      { persona: duena, prefijo: '7210' },
      { persona: compartido, prefijo: '7220' },
      { persona: supervision, prefijo: '7230' },
    ]
    const corrida = async ({ persona, prefijo }) => {
      const cliente = await conectar()
      const importacion = crypto.randomUUID()
      const lotes = []
      try {
        for (let lote = 0; lote < 10; lote += 1) {
          const numeros = Array.from({ length: 50 }, (_, i) => lote * 50 + i)
          const telefonos = barajar(numeros).map((n) => `${prefijo}${String(n).padStart(4, '0')}`)
          const filas = numeros.map((n, i) => ({
            id: crypto.randomUUID(),
            fila: n + 2,
            lead: {
              nombre: `${PREFIJO} num imp ${prefijo} ${String(n).padStart(3, '0')}`,
              telefono_principal: telefonos[i],
              origen_lead_id: web,
            },
          }))
          lotes.push({ filas, resultado: await importar(cliente, persona, importacion, filas) })
        }
      } finally {
        await cliente.end()
      }
      return lotes
    }
    // Mientras `compartido` importa, otra conexión suya da de alta leads sueltos.
    const sueltos = (async () => {
      const cliente = await conectar()
      const resultados = []
      try {
        await comoPersona(cliente, compartido)
        for (let n = 0; n < 15; n += 1) {
          const l = alta(web, `numero suelto ${n}`, `7240${String(n).padStart(4, '0')}`)
          resultados.push(await comoValor(cliente.query(`select ${l.sql} as r`, l.args)))
        }
      } finally {
        await cliente.end()
      }
      return resultados
    })()
    const [todas, altas] = [await Promise.all(creadores.map(corrida)), await sueltos]

    espero(
      'ninguna importación falla (sin interbloqueo) y todas las filas se crean',
      todas.every((lotes) =>
        lotes.every(
          (l) =>
            l.resultado.ok &&
            l.resultado.valor.filas.length === 50 &&
            l.resultado.valor.filas.every((f) => f.resultado === 'creado'),
        ),
      ) && altas.every((a) => a.ok),
      {
        errores: todas
          .flat()
          .filter((l) => !l.resultado.ok)
          .map((l) => l.resultado),
      },
    )

    let ordenadas = true
    let contiguos = true
    const detalle = []
    for (const [i, lotes] of todas.entries()) {
      for (const [k, { filas }] of lotes.entries()) {
        const { rows } = await orquesta.query(
          `select numero_propio from public.leads where id = any ($1::uuid[]) order by numero_propio`,
          [filas.map((f) => f.id)],
        )
        const porFila = (
          await orquesta.query(
            `select l.numero_propio from public.leads l
               join unnest($1::uuid[]) with ordinality as t (id, n) on t.id = l.id order by t.n`,
            [filas.map((f) => f.id)],
          )
        ).rows.map((x) => x.numero_propio)
        const numeros = rows.map((x) => x.numero_propio)
        // Un bloque contiguo de 50, repartido por orden de fila: el menor, a la primera.
        const bloque = numeros.length === 50 && numeros[49] - numeros[0] === 49
        const crece = porFila.every((n, j) => j === 0 || n === porFila[j - 1] + 1)
        if (!bloque) contiguos = false
        if (!crece) ordenadas = false
        if (!bloque || !crece) detalle.push({ creador: i, lote: k, numeros: porFila.slice(0, 5) })
      }
    }
    espero('cada lote de 50 lleva un bloque contiguo de números', contiguos, detalle)
    espero(
      'dentro de un lote, el número crece con la fila aunque los teléfonos estén al revés',
      ordenadas,
      detalle,
    )

    const { rows: repetidos } = await orquesta.query(
      `select creado_por, numero_propio from public.leads where creado_por = any ($1::uuid[]) and numero_propio is not null
        group by 1, 2 having count(*) > 1`,
      [[duena, compartido, supervision]],
    )
    const { rows: cuentas } = await orquesta.query(
      `select c.usuario_id, c.ultimo, (select max(l.numero_propio) from public.leads l where l.creado_por = c.usuario_id) as mayor,
              (select count(*)::int from public.leads_numeros_propios p where p.creado_por = c.usuario_id) as copias,
              (select count(*)::int from public.leads l where l.creado_por = c.usuario_id and l.numero_propio is not null) as leads
         from public.leads_contadores c where c.usuario_id = any ($1::uuid[])`,
      [[duena, compartido, supervision]],
    )
    espero(
      'sin números repetidos por creador, el contador al día y las copias que se leen iguales',
      repetidos.length === 0 &&
        cuentas.length === 3 &&
        cuentas.every((c) => c.ultimo >= c.mayor && c.copias === c.leads),
      { repetidos, cuentas },
    )
  }
}
