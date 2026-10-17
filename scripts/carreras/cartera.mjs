// Las carreras de la cartera en la fila del lead (9h): `leads.cartera` la recalcula un trigger de `leads_asesores`, y dos
// transacciones que cambian quién tiene el mismo lead a la vez no pueden dejarla vieja. Cada una con dos conexiones reales
// (el arnés de `scripts/carreras.mjs`: A actúa y retiene, B espera un lock); al final la cartera es igual a lo que dice
// `leads_asesores`. El relleno con `skip locked` no espera: esa se prueba aparte, con las dos transacciones abiertas.
import { PERSONAS, PREFIJO, comoPersona, leadDeLaDuena } from './terreno.mjs'

const { duena, compartido, supervision, destino, configura } = PERSONAS
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

  console.log('La cartera en la fila: el relleno y otra escritura a la vez')
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

// Antes de `…001600` la visibilidad no mira la cartera: una escritura de `leads_asesores` llega por cualquier camino mientras
// el relleno corre. Acá va directo a la tabla (como postgres), que es lo que dispara el trigger, sin pasar por `puede_lead()`
// (que desde `…001600` ya lee la cartera, y con una cartera nula a mano rechazaría sin esperar).
const compartirDirecto = (lead) => ({
  rol: 'postgres',
  consulta: `with x as (insert into public.leads_asesores (lead_id, usuario_id, tipo_acceso, compartido_por)
             values ($1, $2, 'compartido', $3) returning 1) select count(*)::int as r from x`,
  args: [lead, compartido, duena],
})

async function carrerasDelRelleno({ orquesta, carrera, espero, conectar }) {
  {
    // El relleno toma primero el lead (sin calcular) y el trigger de la otra escritura espera.
    const lead = await leadDeLaDuena(orquesta, 'relleno primero')
    await orquesta.query('update public.leads set cartera = null where id = $1', [lead])
    const r = await carrera(orquesta, {
      a: { rol: 'postgres', sql: 'public._leads_derivados_rellenar(5000)', args: [] },
      b: compartirDirecto(lead),
    })
    const c = await carteraDe(orquesta, lead)
    espero(
      'el relleno primero: la otra escritura espera y la cartera queda con los dos',
      r.a.ok && r.b.ok && c.guardada === ordenada(duena, compartido) && c.guardada === c.fuente,
      { r, c },
    )
  }
  {
    // La otra escritura toma primero el lead: el relleno lo salta (no espera) y el trigger lo deja calculado.
    const lead = await leadDeLaDuena(orquesta, 'relleno después')
    await orquesta.query('update public.leads set cartera = null where id = $1', [lead])
    const [ca, cb] = [await conectar(), await conectar()]
    try {
      const escritura = compartirDirecto(lead)
      await ca.query('begin')
      await ca.query(escritura.consulta, escritura.args)
      const {
        rows: [hecho],
      } = await cb.query('select public._leads_derivados_rellenar(5000) as n')
      const saltado = (await carteraDe(cb, lead)).guardada === null
      await ca.query('commit')
      const c = await carteraDe(orquesta, lead)
      espero(
        `la otra escritura primero: el relleno no espera ni lo pisa (llenó ${String(hecho.n)}) y queda calculado`,
        saltado && c.guardada === ordenada(duena, compartido) && c.guardada === c.fuente,
        { hecho, c },
      )
    } finally {
      await ca.end()
      await cb.end()
    }
  }
}

// Pasar un campo a privado mientras otra persona crea un lead con ese dato (9h): ningún lead puede quedar con la clave en
// `atributos_publicos` cuando el campo ya es privado.
let campos = 0
async function campoNuevo(db) {
  campos += 1
  const clave = `carreras_priv_${String(campos)}`
  await db.query(
    `insert into public.leads_campos (clave, etiqueta, tipo, orden) values ($1, $2, 'texto', 900 + $3)`,
    [clave, `${PREFIJO} privado ${String(campos)}`, campos],
  )
  return clave
}
const altaConDato = (clave, telefono, origen) => ({
  persona: duena,
  sql: 'public.crear_lead($1, $2::jsonb, null)',
  args: [
    crypto.randomUUID(),
    JSON.stringify({
      nombre: `${PREFIJO} con ${clave}`,
      telefono_principal: telefono,
      origen_lead_id: origen,
      atributos: { [clave]: 'dato' },
    }),
  ],
})
const privatizar = async (db, clave) => ({
  persona: configura,
  sql: `public.lead_campo_guardar((select id from public.leads_campos where clave = $1), $2, '{"solo_cartera": true}')`,
  args: [
    clave,
    (
      await db.query(`select actualizado_en::text as v from public.leads_campos where clave = $1`, [
        clave,
      ])
    ).rows[0].v,
  ],
})
const estadoDe = async (db, clave) =>
  (
    await db.query(
      `select (select solo_cartera from public.leads_campos where clave = $1) as privado,
              (select count(*)::int from public.leads where atributos_publicos ? $1) as con_la_clave,
              (select count(*)::int from public.leads where atributos ? $1) as con_el_dato`,
      [clave],
    )
  ).rows[0]

export async function carrerasDePrivacidad({ orquesta, carrera, espero }) {
  const origen = (
    await orquesta.query(
      'select id from public.origenes_lead where activo order by orden, id limit 1',
    )
  ).rows[0].id
  console.log('Pasar un campo a privado mientras se crea un lead con ese dato')
  {
    const clave = await campoNuevo(orquesta)
    const r = await carrera(orquesta, {
      a: altaConDato(clave, '79300011', origen),
      b: await privatizar(orquesta, clave),
    })
    const e = await estadoDe(orquesta, clave)
    espero(
      'el alta primero: privatizar espera, quita la clave del lead nuevo y el campo queda privado',
      r.a.ok && r.b.ok && e.privado && e.con_el_dato === 1 && e.con_la_clave === 0,
      { r, e },
    )
  }
  {
    const clave = await campoNuevo(orquesta)
    const r = await carrera(orquesta, {
      a: await privatizar(orquesta, clave),
      b: altaConDato(clave, '79300012', origen),
    })
    const e = await estadoDe(orquesta, clave)
    espero(
      'privatizar primero: el alta espera y el lead nace sin la clave en los atributos públicos',
      r.a.ok && r.b.ok && e.privado && e.con_el_dato === 1 && e.con_la_clave === 0,
      { r, e },
    )
  }
}
