// Las carreras de `leads_asesores.lead_reciente_en` (4.14-3a): la copia de lo reciente del lead (`coalesce(ultimo_seguimiento_en, creado_en)`) en TODAS las filas de su cartera
// aguanta dos pedidos a la vez sobre el mismo lead. A retiene el lock del lead dentro de su transacción y B espera (si B no llega a esperar, la carrera no se probó):
// - entra alguien a la cartera mientras otra persona anota (en los dos órdenes): la fila nueva se llena en el `before insert` leyendo el lead con `for no key update`, y si el
//   seguimiento llega primero, el trigger del lead la alcanza después; el alta, entonces, lee lo que el otro ya confirmó;
// - dos seguimientos a la vez con `ocurrido_en` distintos: la copia queda en el mayor, llegue primero el que llegue;
// - se revoca a un co-asesor (o él sale) mientras otra persona anota: la fila revocada también queda al día.
// Todo seguimiento lleva un `ocurrido_en` explícito, en el pasado y distinto del alta del lead, para que un valor que cae en `now()` no pase por bueno.
import { PERSONAS, leadDeLaDuena } from './terreno.mjs'

const { duena, compartido, destino } = PERSONAS

const ALTA = '2020-01-01T00:00:00Z'
const FEB = '2020-02-01T00:00:00Z'
const MAR = '2020-03-01T00:00:00Z'

const anotar = (persona, lead, ocurrido) => ({
  persona,
  sql: `public.seguimiento_crear(gen_random_uuid(), $1, jsonb_build_object('tipo_id',
    (select id from public.tipos_seguimiento where activo order by orden limit 1), 'titulo', 'Carreras', 'ocurrido_en', $2::text))`,
  args: [lead, ocurrido],
})

// Un lead de la dueña con el alta en el pasado y `compartido` en su cartera.
async function leadConCartera(orquesta, nombre) {
  const lead = await leadDeLaDuena(orquesta, nombre, { compartidoCon: compartido })
  await orquesta.query(`update public.leads set creado_en = $2 where id = $1`, [lead, ALTA])
  return lead
}

// Cuántas filas hay en la cartera del lead (también las revocadas) y cuántas valen `esperado`.
async function cuenta(db, lead, esperado) {
  const {
    rows: [fila],
  } = await db.query(
    `select count(*)::int as filas, count(*) filter (where lead_reciente_en = $2::timestamptz)::int as bien
       from public.leads_asesores where lead_id = $1`,
    [lead, esperado],
  )
  return fila
}

export async function carrerasDeLoReciente({ orquesta, carrera, espero }) {
  console.log('Entra alguien a la cartera mientras otra persona anota (K1, en los dos órdenes)')
  {
    const lead = await leadConCartera(orquesta, 'reciente compartir primero')
    const r = await carrera(orquesta, {
      a: {
        persona: duena,
        sql: 'public.lead_compartir($1, $2)',
        args: [lead, destino],
      },
      b: anotar(compartido, lead, MAR),
    })
    const c = await cuenta(orquesta, lead, MAR)
    espero(
      'comparte primero y la anotación espera: las tres filas, la nueva también, quedan en el seguimiento',
      r.a.ok && r.b.ok && c.filas === 3 && c.bien === 3,
      { r, c },
    )
  }
  {
    const lead = await leadConCartera(orquesta, 'reciente anotar primero')
    const r = await carrera(orquesta, {
      a: anotar(compartido, lead, MAR),
      b: { persona: duena, sql: 'public.lead_compartir($1, $2)', args: [lead, destino] },
    })
    const c = await cuenta(orquesta, lead, MAR)
    espero(
      'anota primero y compartir espera: la fila nueva lee el seguimiento ya confirmado, no el alta',
      r.a.ok && r.b.ok && c.filas === 3 && c.bien === 3,
      { r, c },
    )
  }

  console.log('Dos seguimientos a la vez con distinta fecha (K2): la copia queda en el mayor')
  for (const [primero, segundo] of [
    [FEB, MAR],
    [MAR, FEB],
  ]) {
    const lead = await leadConCartera(orquesta, `reciente dos seguimientos ${primero.slice(5, 7)}`)
    const r = await carrera(orquesta, {
      a: anotar(duena, lead, primero),
      b: anotar(compartido, lead, segundo),
    })
    const c = await cuenta(orquesta, lead, MAR)
    espero(
      `primero el de ${primero.slice(0, 7)} y después el de ${segundo.slice(0, 7)}: las dos filas en marzo`,
      r.a.ok && r.b.ok && c.filas === 2 && c.bien === 2,
      { r, c },
    )
  }

  console.log('Revocar a un co-asesor o que salga mientras otra persona anota (K3)')
  {
    const lead = await leadConCartera(orquesta, 'reciente revocar primero')
    await orquesta.query(
      `insert into public.leads_asesores (lead_id, usuario_id, tipo_acceso, compartido_por) values ($1, $2, 'compartido', $3)`,
      [lead, destino, duena],
    )
    const r = await carrera(orquesta, {
      a: { persona: duena, sql: 'public.lead_revocar_acceso($1, $2)', args: [lead, compartido] },
      b: anotar(destino, lead, MAR),
    })
    const c = await cuenta(orquesta, lead, MAR)
    espero(
      'revoca primero y la anotación espera: la fila revocada también queda en el seguimiento',
      r.a.ok && r.b.ok && c.filas === 3 && c.bien === 3,
      { r, c },
    )
  }
  {
    const lead = await leadConCartera(orquesta, 'reciente anotar y revocar')
    await orquesta.query(
      `insert into public.leads_asesores (lead_id, usuario_id, tipo_acceso, compartido_por) values ($1, $2, 'compartido', $3)`,
      [lead, destino, duena],
    )
    const r = await carrera(orquesta, {
      a: anotar(destino, lead, MAR),
      b: { persona: duena, sql: 'public.lead_revocar_acceso($1, $2)', args: [lead, compartido] },
    })
    const c = await cuenta(orquesta, lead, MAR)
    espero(
      'anota primero y revocar espera: la fila revocada trae el seguimiento',
      r.a.ok && r.b.ok && c.filas === 3 && c.bien === 3,
      { r, c },
    )
  }
  {
    const lead = await leadConCartera(orquesta, 'reciente salir')
    const r = await carrera(orquesta, {
      a: { persona: compartido, sql: 'public.lead_salir($1)', args: [lead] },
      b: anotar(duena, lead, MAR),
    })
    const c = await cuenta(orquesta, lead, MAR)
    espero(
      'sale primero y la anotación espera: la fila de quien salió también queda al día',
      r.a.ok && r.b.ok && c.filas === 2 && c.bien === 2,
      { r, c },
    )
  }
}
