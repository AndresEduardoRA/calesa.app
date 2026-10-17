// Las carreras de la cartera en la fila del lead (9h): `leads.cartera` la recalcula un trigger de `leads_asesores`, y dos
// transacciones que cambian quién tiene el mismo lead a la vez no pueden dejarla vieja. Cada una con dos conexiones reales
// (el arnés de `scripts/carreras.mjs`: A actúa y retiene, B espera un lock); al final la cartera es igual a lo que dice
// `leads_asesores`. El relleno con `skip locked` no espera: esa se prueba aparte, con las dos transacciones abiertas.
import { PERSONAS, PREFIJO, comoPersona, leadDeLaDuena } from './terreno.mjs'

const { duena, compartido, supervision, destino } = PERSONAS
// Alguien a quien dar de baja, con un rol que puede hacerlo (las borra `limpiar()` por el correo).
const BAJA = '00000000-0000-4000-8000-0000000c0010'
const OTRA_BAJA = '00000000-0000-4000-8000-0000000c0011'

const carteraDe = async (db, lead) => {
  const {
    rows: [fila],
  } = await db.query(
    `select l.cartera::text as guardada, public._lead_cartera_calcular(l.id)::text as fuente from public.leads l where l.id = $1`,
    [lead],
  )
  return fila
}
const ordenada = (...ids) => `{${[...ids].sort().join(',')}}`

async function personaConLead(db, id, nombre) {
  await db.query(
    `insert into auth.users (id, email, raw_app_meta_data) values ($1, $2, '{"invitado": true}')`,
    [id, `carreras-${nombre}@ejemplo.com`],
  )
  await db.query(
    `update public.perfiles set nombre = $2, invitacion_aceptada_en = now() where id = $1`,
    [id, `${PREFIJO} ${nombre}`],
  )
  await db.query(
    `insert into public.usuarios_roles (usuario_id, rol_id) select $1, id from public.roles where clave = 'carreras_propios'`,
    [id],
  )
  await comoPersona(db, id)
  const {
    rows: [fila],
  } = await db.query(
    `select public.crear_lead(gen_random_uuid(), jsonb_build_object('nombre', $1::text, 'telefono_principal', $2::text,
       'origen_lead_id', (select id from public.origenes_lead where activo order by orden, id limit 1))) as r`,
    [`${PREFIJO} de ${nombre}`, id === BAJA ? '79300001' : '79300002'],
  )
  await db.query('reset role')
  return fila.r.id
}

export async function carrerasDeLaCartera({ orquesta, carrera, espero, conectar }) {
  // La supervisión da de baja: suma `equipo.usuarios.gestionar` con un rol propio de las carreras.
  const {
    rows: [rol],
  } = await orquesta.query(
    `insert into public.roles (clave, nombre) values ('carreras_equipo', $1) returning id`,
    [`${PREFIJO} equipo`],
  )
  await orquesta.query(
    `insert into public.roles_permisos (rol_id, permiso_clave, alcance) values ($1, 'equipo.usuarios.gestionar', 'todos')`,
    [rol.id],
  )
  await orquesta.query(`insert into public.usuarios_roles (usuario_id, rol_id) values ($1, $2)`, [
    supervision,
    rol.id,
  ])

  console.log('La cartera en la fila: la baja de una persona mientras se comparte su lead')
  {
    const lead = await personaConLead(orquesta, BAJA, 'baja')
    const r = await carrera(orquesta, {
      a: { persona: supervision, sql: 'public.equipo_dar_de_baja($1)', args: [BAJA] },
      b: { persona: supervision, sql: 'public.lead_compartir($1, $2)', args: [lead, compartido] },
    })
    const c = await carteraDe(orquesta, lead)
    espero(
      `la baja primero: el lead queda en el limbo y compartirlo ya no lo encuentra (${r.b.codigo ?? 'ok'})`,
      r.a.ok && r.b.codigo === '42501' && c.guardada === '{}' && c.guardada === c.fuente,
      { r, c },
    )
  }
  {
    const lead = await personaConLead(orquesta, OTRA_BAJA, 'otra-baja')
    const r = await carrera(orquesta, {
      a: { persona: supervision, sql: 'public.lead_compartir($1, $2)', args: [lead, compartido] },
      b: { persona: supervision, sql: 'public.equipo_dar_de_baja($1)', args: [OTRA_BAJA] },
    })
    const c = await carteraDe(orquesta, lead)
    espero(
      'compartir primero: la baja espera y la cartera queda con el compartido, sin dueño',
      r.a.ok && r.b.ok && c.guardada === ordenada(compartido) && c.guardada === c.fuente,
      { r, c },
    )
  }

  console.log('La cartera en la fila: transferir mientras otra persona comparte el mismo lead')
  {
    const lead = await leadDeLaDuena(orquesta, 'cartera transferir')
    const r = await carrera(orquesta, {
      a: {
        persona: duena,
        sql: 'public.lead_transferir($1, $2, $3)',
        args: [lead, destino, duena],
      },
      b: { persona: supervision, sql: 'public.lead_compartir($1, $2)', args: [lead, compartido] },
    })
    const c = await carteraDe(orquesta, lead)
    espero(
      'gana la transferencia y el compartir entra después: los tres en la cartera',
      r.a.ok &&
        r.b.ok &&
        c.guardada === ordenada(duena, destino, compartido) &&
        c.guardada === c.fuente,
      { r, c },
    )
  }
  {
    const lead = await leadDeLaDuena(orquesta, 'cartera compartir')
    const r = await carrera(orquesta, {
      a: { persona: supervision, sql: 'public.lead_compartir($1, $2)', args: [lead, compartido] },
      b: {
        persona: duena,
        sql: 'public.lead_transferir($1, $2, $3)',
        args: [lead, destino, duena],
      },
    })
    const c = await carteraDe(orquesta, lead)
    espero(
      'gana el compartir y la transferencia entra después: los tres en la cartera',
      r.a.ok &&
        r.b.ok &&
        c.guardada === ordenada(duena, destino, compartido) &&
        c.guardada === c.fuente,
      { r, c },
    )
  }

  console.log('La cartera en la fila: el relleno y una transferencia a la vez')
  // Una base viva antes de `…001600`: la columna admite nulos (sin calcular). En una base nueva nace `not null`: se le quita
  // mientras duran estas dos carreras y se le vuelve a poner al final, con todo lleno.
  await orquesta.query('alter table public.leads alter column cartera drop not null')
  try {
    await carrerasDelRelleno({ orquesta, carrera, espero, conectar })
  } finally {
    while (
      (await orquesta.query('select public._leads_derivados_rellenar(5000) as n')).rows[0].n > 0
    );
    await orquesta.query('alter table public.leads alter column cartera set not null')
  }
}

async function carrerasDelRelleno({ orquesta, carrera, espero, conectar }) {
  {
    // El relleno toma primero el lead (sin calcular) y la transferencia espera.
    const lead = await leadDeLaDuena(orquesta, 'relleno primero')
    await orquesta.query('update public.leads set cartera = null where id = $1', [lead])
    const r = await carrera(orquesta, {
      a: { rol: 'postgres', sql: 'public._leads_derivados_rellenar(5000)', args: [] },
      b: {
        persona: duena,
        sql: 'public.lead_transferir($1, $2, $3)',
        args: [lead, destino, duena],
      },
    })
    const c = await carteraDe(orquesta, lead)
    espero(
      'el relleno primero: la transferencia espera y la cartera queda con los dos',
      r.a.ok && r.b.ok && c.guardada === ordenada(duena, destino) && c.guardada === c.fuente,
      { r, c },
    )
  }
  {
    // La transferencia toma primero el lead: el relleno lo salta (no espera) y la transferencia lo deja calculado.
    const lead = await leadDeLaDuena(orquesta, 'relleno después')
    await orquesta.query('update public.leads set cartera = null where id = $1', [lead])
    const [ca, cb] = [await conectar(), await conectar()]
    try {
      await comoPersona(ca, duena)
      await ca.query('begin')
      await ca.query('select public.lead_transferir($1, $2, $3)', [lead, destino, duena])
      const {
        rows: [hecho],
      } = await cb.query('select public._leads_derivados_rellenar(5000) as n')
      const saltado = (await carteraDe(cb, lead)).guardada === null
      await ca.query('commit')
      const c = await carteraDe(orquesta, lead)
      espero(
        `la transferencia primero: el relleno no espera ni lo pisa (llenó ${String(hecho.n)}) y queda calculado`,
        saltado && c.guardada === ordenada(duena, destino) && c.guardada === c.fuente,
        { hecho, c },
      )
    } finally {
      await ca.end()
      await cb.end()
    }
  }
}
