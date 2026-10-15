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
