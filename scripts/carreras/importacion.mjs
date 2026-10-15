// Las carreras de la importación de leads (parte 8a). Lo que une a dos importaciones es el índice único
// del teléfono (`leads_telefono_unico`) y la fila de `importaciones` que retoma un reintento. La RPC ordena
// cada lote por teléfono: dos lotes que se cruzan toman los candados en el mismo orden y no se bloquean.
import { PERSONAS, PREFIJO, comoPersona } from './terreno.mjs'

const { duena, compartido } = PERSONAS

const ORIGEN = `(select id from public.origenes_lead where clave = 'web')`

async function origen(db) {
  return (await db.query(`select ${ORIGEN} as id`)).rows[0].id
}

const fila = (n, telefono, nombre, origenId) => ({
  id: crypto.randomUUID(),
  fila: n,
  lead: {
    nombre: `${PREFIJO} ${nombre}`,
    telefono_principal: telefono,
    origen_lead_id: origenId,
  },
})

// Una llamada a la RPC como una persona, en una conexión propia; devuelve el valor o el error.
async function importar(cliente, persona, importacion, filas) {
  await comoPersona(cliente, persona)
  try {
    const { rows } = await cliente.query(
      'select public.leads_importar_lote($1, $2, $3::jsonb) as r',
      [importacion, filas.length, JSON.stringify(filas)],
    )
    return { ok: true, valor: rows[0].r }
  } catch (e) {
    return { ok: false, codigo: e.code, mensaje: e.message }
  } finally {
    await cliente.query('reset role')
  }
}

const resultados = (r) => (r.ok ? r.valor.filas.map((f) => f.resultado) : [])

export async function carrerasDeImportacion({ orquesta, carrera, espero, conectar }) {
  const web = await origen(orquesta)

  console.log('Dos personas importan el mismo teléfono a la vez')
  {
    const a = fila(2, '71100001', 'importar a', web)
    const b = fila(2, '71100001', 'importar b', web)
    const r = await carrera(orquesta, {
      a: {
        persona: duena,
        sql: 'public.leads_importar_lote($1, 1, $2::jsonb)',
        args: [crypto.randomUUID(), JSON.stringify([a])],
      },
      b: {
        persona: compartido,
        sql: 'public.leads_importar_lote($1, 1, $2::jsonb)',
        args: [crypto.randomUUID(), JSON.stringify([b])],
      },
    })
    const { rows } = await orquesta.query(
      `select l.nombre, a.usuario_id from public.leads l
         join public.leads_asesores a on a.lead_id = l.id and a.tipo_acceso = 'dueno'
        where l.telefono_principal like '%71100001' and l.eliminado_en is null`,
    )
    espero(
      'una la crea y la otra recibe «ya existe», sin error y sin nombrar a nadie',
      r.a.ok &&
        r.b.ok &&
        r.a.valor.filas[0].resultado === 'creado' &&
        r.b.valor.filas[0].resultado === 'ya_existe' &&
        !JSON.stringify(r.b.valor).includes(PREFIJO) &&
        rows.length === 1 &&
        rows[0].usuario_id === duena,
      { a: r.a, b: r.b, rows },
    )
  }

  console.log('El mismo lote desde dos pestañas (mismo id de importación y mismos ids de fila)')
  {
    const importacion = crypto.randomUUID()
    const filas = [1, 2, 3].map((n) => fila(n + 1, `7120000${n}`, `pestañas ${n}`, web))
    const r = await carrera(orquesta, {
      a: {
        persona: duena,
        sql: 'public.leads_importar_lote($1, 3, $2::jsonb)',
        args: [importacion, JSON.stringify(filas)],
      },
      b: {
        persona: duena,
        sql: 'public.leads_importar_lote($1, 3, $2::jsonb)',
        args: [importacion, JSON.stringify(filas)],
      },
    })
    const {
      rows: [cuenta],
    } = await orquesta.query(
      `select (select count(*)::int from public.leads where telefono_principal like '%7120000_' and eliminado_en is null) as leads,
              (select count(*)::int from public.importaciones_leads where importacion_id = $1) as vinculos`,
      [importacion],
    )
    espero(
      'la que llega segunda ve todo como repetido y nada se duplica',
      r.a.ok &&
        r.b.ok &&
        r.a.valor.filas.every((f) => f.resultado === 'creado' && f.repetido === false) &&
        r.b.valor.filas.every((f) => f.resultado === 'creado' && f.repetido === true) &&
        cuenta.leads === 3 &&
        cuenta.vinculos === 3,
      { a: r.a.valor, b: r.b.valor, cuenta },
    )
  }

  console.log('Dos lotes que se cruzan, en orden contrario, sin interbloqueo')
  for (let ronda = 1; ronda <= 5; ronda += 1) {
    const telefonos = Array.from(
      { length: 20 },
      (_, i) => `7${3 + ronda}${String(i).padStart(6, '0')}`,
    )
    const delA = telefonos.map((t, i) => fila(i + 2, t, `cruce ${ronda} a ${i}`, web))
    const delB = [...telefonos]
      .reverse()
      .map((t, i) => fila(i + 2, t, `cruce ${ronda} b ${i}`, web))
    const [ca, cb] = [await conectar(), await conectar()]
    try {
      const [ra, rb] = await Promise.all([
        importar(ca, duena, crypto.randomUUID(), delA),
        importar(cb, compartido, crypto.randomUUID(), delB),
      ])
      const creadas =
        resultados(ra).filter((x) => x === 'creado').length +
        resultados(rb).filter((x) => x === 'creado').length
      const ya =
        resultados(ra).filter((x) => x === 'ya_existe').length +
        resultados(rb).filter((x) => x === 'ya_existe').length
      const {
        rows: [{ n }],
      } = await orquesta.query(
        `select count(*)::int as n from public.leads where telefono_principal like $1 and eliminado_en is null and nombre like 'Carreras cruce%'`,
        [`%7${3 + ronda}%`],
      )
      espero(
        `ronda ${ronda}: ningún error, cada teléfono entra una sola vez (20 creadas, 20 «ya existe»)`,
        ra.ok && rb.ok && creadas === 20 && ya === 20 && n === 20,
        { ra: ra.ok ? resultados(ra) : ra, rb: rb.ok ? resultados(rb) : rb, creadas, ya, n },
      )
    } finally {
      await ca.end()
      await cb.end()
    }
  }
}

// Deshacer una importación (parte 8b). La RPC toma la fila de `importaciones` (la misma que toma cada lote)
// y después los leads por id, y con todo bloqueado vuelve a mirar cada lead. Teléfonos 7130xxxx.
let siguiente = 0

// Una importación de `n` leads de la dueña, confirmada; `abierta` no la cierra.
async function importacionDeLaDuena({ db, conectar, web }, n, { abierta = false } = {}) {
  const importacion = crypto.randomUUID()
  const filas = Array.from({ length: n }, (_, i) => {
    siguiente += 1
    return fila(i + 2, `7130${String(siguiente).padStart(4, '0')}`, `deshacer ${siguiente}`, web)
  })
  const cliente = await conectar()
  try {
    const r = await importar(cliente, duena, importacion, filas)
    if (!r.ok) throw new Error(`importar para deshacer: ${r.mensaje}`)
    if (!abierta) {
      await comoPersona(cliente, duena)
      await cliente.query('select public.leads_importacion_terminar($1, 0, 0)', [importacion])
      await cliente.query('reset role')
    }
  } finally {
    await cliente.end()
  }
  const { rows } = await db.query(
    `select il.lead_id from public.importaciones_leads il where il.importacion_id = $1 order by il.fila`,
    [importacion],
  )
  return { importacion, leads: rows.map((x) => x.lead_id), filas }
}

const enPapelera = async (db, ids) =>
  (
    await db.query(
      `select count(*)::int as n from public.leads where id = any ($1::uuid[]) and eliminado_en is not null`,
      [ids],
    )
  ).rows[0].n

const version = async (db, lead) =>
  (await db.query(`select actualizado_en::text as v from public.leads where id = $1`, [lead]))
    .rows[0].v

const deshacer = (importacion) => ({
  persona: duena,
  sql: 'public.leads_importacion_deshacer($1)',
  args: [importacion],
})

export async function carrerasDeDeshacer({ orquesta, carrera, espero, conectar }) {
  const terreno = { db: orquesta, conectar, web: await origen(orquesta) }
  const motivos = (r) =>
    Object.fromEntries((r.valor?.quedaron ?? []).map((q) => [q.motivo, q.filas]))

  console.log('Deshacer mientras otra pestaña edita uno de los leads')
  {
    const { importacion, leads } = await importacionDeLaDuena(terreno, 3)
    const r = await carrera(orquesta, {
      a: {
        persona: duena,
        sql: `public.lead_guardar($1, $2, '{"nombre": "Carreras editado al deshacer"}')`,
        args: [leads[0], await version(orquesta, leads[0])],
      },
      b: deshacer(importacion),
    })
    espero(
      'el editado se queda («editado», fila 2) y salen los otros dos',
      r.a.ok &&
        r.b.ok &&
        r.b.valor.movidos === 2 &&
        JSON.stringify(motivos(r.b)) === '{"editado":[2]}' &&
        (await enPapelera(orquesta, leads)) === 2,
      { a: r.a, b: r.b },
    )
  }

  console.log('Editar mientras se deshace: la edición llega tarde')
  {
    const { importacion, leads } = await importacionDeLaDuena(terreno, 2)
    const v = await version(orquesta, leads[0])
    const r = await carrera(orquesta, {
      a: deshacer(importacion),
      b: {
        persona: duena,
        sql: `public.lead_guardar($1, $2, '{"nombre": "Carreras tarde"}')`,
        args: [leads[0], v],
      },
    })
    espero(
      'salen los dos y la edición no escribe sobre un lead que ya está en la papelera',
      r.a.ok && r.a.valor.movidos === 2 && !r.b.ok && (await enPapelera(orquesta, leads)) === 2,
      { a: r.a, b: r.b },
    )
  }

  console.log('Deshacer mientras se transfiere uno de los leads')
  {
    const { importacion, leads } = await importacionDeLaDuena(terreno, 2)
    const r = await carrera(orquesta, {
      a: {
        persona: duena,
        sql: 'public.lead_transferir($1, $2, $3)',
        args: [leads[1], PERSONAS.destino, duena],
      },
      b: deshacer(importacion),
    })
    espero(
      'el transferido se queda («otra_persona», fila 3) y el otro sale',
      r.a.ok &&
        r.b.ok &&
        r.b.valor.movidos === 1 &&
        JSON.stringify(motivos(r.b)) === '{"otra_persona":[3]}',
      { a: r.a, b: r.b },
    )
  }

  console.log('Deshacer mientras el mismo lead va a la papelera a mano')
  {
    const { importacion, leads } = await importacionDeLaDuena(terreno, 2)
    const r = await carrera(orquesta, {
      a: {
        persona: duena,
        sql: 'public.leads_papelera_enviar($1, $2::uuid[])',
        args: [crypto.randomUUID(), [leads[0]]],
      },
      b: deshacer(importacion),
    })
    const {
      rows: [lotes],
    } = await orquesta.query(
      `select count(distinct lote_papelera_id)::int as n from public.leads where id = any ($1::uuid[])`,
      [leads],
    )
    espero(
      'el de la papelera manual se cuenta («papelera», fila 2), el otro sale en otro lote',
      r.a.ok &&
        r.b.ok &&
        r.b.valor.movidos === 1 &&
        JSON.stringify(motivos(r.b)) === '{"papelera":[2]}' &&
        lotes.n === 2,
      { a: r.a, b: r.b, lotes },
    )
  }

  console.log('Deshacer mientras entra el último lote de la misma importación')
  {
    const { importacion, leads } = await importacionDeLaDuena(terreno, 2, { abierta: true })
    siguiente += 1
    const tardia = fila(
      4,
      `7130${String(siguiente).padStart(4, '0')}`,
      `deshacer ${siguiente}`,
      terreno.web,
    )
    const r = await carrera(orquesta, {
      a: {
        persona: duena,
        sql: 'public.leads_importar_lote($1, 3, $2::jsonb)',
        args: [importacion, JSON.stringify([tardia])],
      },
      b: deshacer(importacion),
    })
    espero(
      'el deshacer espera al lote y se lleva también lo que entró en él',
      r.a.ok &&
        r.a.valor.filas[0].resultado === 'creado' &&
        r.b.ok &&
        r.b.valor.movidos === 3 &&
        (await enPapelera(orquesta, [...leads, tardia.id])) === 3,
      { a: r.a, b: r.b },
    )
  }

  console.log('Un lote que llega mientras se deshace')
  {
    const { importacion } = await importacionDeLaDuena(terreno, 2, { abierta: true })
    siguiente += 1
    const tardia = fila(
      4,
      `7130${String(siguiente).padStart(4, '0')}`,
      `deshacer ${siguiente}`,
      terreno.web,
    )
    const r = await carrera(orquesta, {
      a: deshacer(importacion),
      b: {
        persona: duena,
        sql: 'public.leads_importar_lote($1, 3, $2::jsonb)',
        args: [importacion, JSON.stringify([tardia])],
      },
    })
    const {
      rows: [cuenta],
    } = await orquesta.query(`select count(*)::int as n from public.leads where id = $1`, [
      tardia.id,
    ])
    espero(
      'el lote espera y ya no crea nada: «Esta importación ya terminó.»',
      r.a.ok && r.a.valor.movidos === 2 && !r.b.ok && r.b.codigo === '22023' && cuenta.n === 0,
      { a: r.a, b: r.b, cuenta },
    )
  }

  console.log('Dos deshacer a la vez (doble clic, o dos pestañas)')
  {
    const { importacion, leads } = await importacionDeLaDuena(terreno, 3)
    const r = await carrera(orquesta, { a: deshacer(importacion), b: deshacer(importacion) })
    const {
      rows: [cuenta],
    } = await orquesta.query(
      `select (select count(*)::int from public.lotes_papelera where resumen ->> 'importacion' = $1) as lotes,
              (select count(*)::int from public.actividad where accion = 'leads.importacion_deshecha' and registro_id = $1) as constancias`,
      [importacion],
    )
    espero(
      'uno mueve los tres; el otro espera y devuelve lo mismo como repetido, sin otro lote',
      r.a.ok &&
        r.b.ok &&
        r.a.valor.movidos === 3 &&
        r.b.valor.movidos === 3 &&
        r.a.valor.repetido === false &&
        r.b.valor.repetido === true &&
        cuenta.lotes === 1 &&
        cuenta.constancias === 1 &&
        (await enPapelera(orquesta, leads)) === 3,
      { a: r.a, b: r.b, cuenta },
    )
  }
}
