// La carrera de la rueda de turnos por rol (`web.cola.participar`). Dos visitantes piden asesor a la vez: el reparto se serializa con un candado
// de la cola (`pg_advisory_xact_lock(hashtext('cola_web'))`), y quien llega segundo espera. Si mientras espera alguien le quita el permiso al
// rol del asesor que iba primero, el reparto —que evalúa la elegibilidad DESPUÉS del candado, con la foto nueva de cada sentencia— no se lo da.
//
//   A  reparte y retiene el candado (su turno es para X, el primero de la fila)
//   B  reparte y espera ese candado (se ve en pg_stat_activity: nada de `sleep`)
//   C  (el orquestador) revoca el permiso del rol de X, y se confirma
//   A  confirma. B sigue: sin la revocación le toca a X (control); con ella, a Y.
//
// X e Y son las únicas personas en la rueda; Y está en su cupo, así que sin la revocación X es siempre la primera. Lo que estaba habilitado de antes
// se apaga durante la prueba y se enciende al terminar.
import { PERSONAS } from './terreno.mjs'

const TOKEN = (nombre) => `carreras-rueda-${nombre}-0000000000`
const X = PERSONAS.compartido
const Y = PERSONAS.supervision

async function aislar(orquesta) {
  const { rows } = await orquesta.query(
    `update public.cola_web_asesores set habilitado = false where habilitado and usuario_id <> all ($1::uuid[]) returning usuario_id`,
    [[X, Y]],
  )
  for (const [letra, id] of [
    ['x', X],
    ['y', Y],
  ]) {
    await orquesta.query(`update public.perfiles set whatsapp_web = $2 where id = $1`, [
      id,
      `+59172000${letra === 'x' ? '001' : '002'}`,
    ])
    await orquesta.query(
      `insert into public.roles (clave, nombre) values ($1, $2) on conflict (clave) do nothing`,
      [`carreras_rueda_${letra}`, `Carreras rueda ${letra}`],
    )
    await orquesta.query(
      `insert into public.usuarios_roles (usuario_id, rol_id) select $1, id from public.roles where clave = $2 on conflict do nothing`,
      [id, `carreras_rueda_${letra}`],
    )
    await orquesta.query(
      `update public.cola_web_asesores set habilitado = true, disponible = true, max_abiertas = $2, prioridad = 0,
         ultima_asignacion_en = null, orden = 0 where usuario_id = $1`,
      [id, letra === 'y' ? 1 : null],
    )
  }
  return rows.map((f) => f.usuario_id)
}

async function darPermiso(orquesta, letra) {
  await orquesta.query(
    `insert into public.roles_permisos (rol_id, permiso_clave, alcance)
     select id, 'web.cola.participar', 'todos' from public.roles where clave = $1 on conflict do nothing`,
    [`carreras_rueda_${letra}`],
  )
}

async function turnoDe(orquesta, token) {
  return (
    await orquesta.query(
      `select usuario_id from public.solicitudes_contacto_web where token_visitante = $1 order by creado_en desc limit 1`,
      [token],
    )
  ).rows[0]?.usuario_id
}

// Una vuelta: A retiene el candado, B espera, C actúa (revocar o no) y A confirma.
async function vuelta({ orquesta, conectar, esperarBloqueo }, { revocar, nombre }) {
  await orquesta.query(
    `delete from public.solicitudes_contacto_web where token_visitante like 'carreras-rueda-%'`,
  )
  await darPermiso(orquesta, 'x')
  await darPermiso(orquesta, 'y')
  // Y está en su cupo (1 de 1): sin revocación, X es siempre la primera de la fila.
  await orquesta.query(
    `insert into public.solicitudes_contacto_web (codigo, token_visitante, usuario_id, estado, fuente, vence_en)
     values ($1, $2, $3, 'asignada', 'boton_general', now() + interval '1 day')`,
    [`#WEB-C${nombre.slice(0, 3).toUpperCase()}`, TOKEN(`cupo-${nombre}`), Y],
  )
  const [a, b] = [await conectar(), await conectar()]
  try {
    await a.query('set role anon')
    await b.query('set role anon')
    await a.query('begin')
    await a.query('select web.solicitar_asesor($1, $2) as r', [
      TOKEN(`a-${nombre}`),
      'boton_general',
    ])
    const pidB = (await b.query('select pg_backend_pid() as pid')).rows[0].pid
    const segundo = b.query('select web.solicitar_asesor($1, $2) as r', [
      TOKEN(`b-${nombre}`),
      'boton_general',
    ])
    segundo.catch(() => undefined)
    await esperarBloqueo(orquesta, pidB)
    if (revocar) {
      await orquesta.query(
        `delete from public.roles_permisos where permiso_clave = 'web.cola.participar'
           and rol_id = (select id from public.roles where clave = 'carreras_rueda_x')`,
      )
    }
    await a.query('commit')
    await segundo
    return {
      a: await turnoDe(orquesta, TOKEN(`a-${nombre}`)),
      b: await turnoDe(orquesta, TOKEN(`b-${nombre}`)),
    }
  } finally {
    await a.end()
    await b.end()
  }
}

export async function carrerasDeLaRueda(ctx) {
  const { orquesta, espero } = ctx
  console.log('La rueda por rol: el permiso se quita mientras un reparto espera el candado')
  const apagadas = await aislar(orquesta)
  try {
    const control = await vuelta(ctx, { revocar: false, nombre: 'control' })
    espero(
      'control, sin revocar: A y B reciben a X, la primera de la fila (la carrera existe)',
      control.a === X && control.b === X,
      control,
    )
    const r = await vuelta(ctx, { revocar: true, nombre: 'revoca' })
    espero(
      'con el permiso de X revocado mientras B espera: A ya tenía a X, y B no se lo da: le toca a Y',
      r.a === X && r.b === Y,
      r,
    )
  } finally {
    await orquesta.query(
      `delete from public.solicitudes_contacto_web where token_visitante like 'carreras-rueda-%'`,
    )
    if (apagadas.length > 0) {
      await orquesta.query(
        `update public.cola_web_asesores set habilitado = true where usuario_id = any ($1::uuid[])`,
        [apagadas],
      )
    }
  }
}
