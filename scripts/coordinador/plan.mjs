// La lógica del coordinador, sin I/O: leer y validar `plan.yaml` (esquema plan/v1, el que entrega la skill idea-a-semilla), decidir
// el siguiente paso de un carril, las transiciones de estado de cada paso y el tablero. La CLI (`coordinador.mjs`) le pone el disco,
// el candado y `gh` alrededor. Se prueba en `plan.test.mjs`.
//
// Un paso pasa por: pendiente → asignado (un carril lo está haciendo) → publicado (su PR está abierto) → integrado (está en main).
// Un paso puede empezar cuando todas sus dependencias están integradas: así cada carril parte de un main que ya las tiene.
// Un paso partido publica sus partes sin dejar de estar asignado: el PR de la parte va en `pr_parcial` y se integra igual (sincronizar).
// Un PEDIDO es lo que un carril necesita de lo que posee otro (un registro, una prueba, un archivo de src/app): lo deja el bucle del que
// espera (`pedir`), el carril dueño lo toma antes que sus propios pasos y, al integrarse, el que esperaba se retoma solo.
// PRESTADO (2026-11-08): un carril sin paso propio listo toma uno listo de otro carril que está ocupado, si no toca lo que está en curso.
// El paso conserva su carril del plan (el de sus permisos: la guarda de CI juzga la rama `<quien lo hace>/<paso>` con el carril del paso)
// y el estado anota en `carril` quién lo hace: ése lo retoma, lo publica y lo arregla.
// APARCADO (2026-11-09, las fases 5 a 9 de corrido): un paso que su carril no logra cerrar (gastó su tope, falló dos veces, agotó sus
// reintentos) no para al carril: queda aparcado con su motivo y el carril toma otro. Lo que depende de él espera. Cuando al carril no le
// queda nada más, lo reintenta con una sesión nueva (hasta `maxAparcado` veces, y no antes de `enfriar` ms); después lo mira la persona
// (`coordinador.mjs reanudar <paso>`).
import { parse } from 'yaml'
import { problemasDeMigraciones } from './plan-migraciones.mjs'

export const ESTADOS = ['pendiente', 'asignado', 'publicado', 'integrado', 'aparcado']
const TRANSICIONES = {
  pendiente: ['asignado'],
  asignado: ['publicado', 'pendiente', 'aparcado'],
  publicado: ['integrado', 'asignado'],
  integrado: [],
  // → integrado: el PR de un paso aparcado terminó integrándose (su CI se puso verde, o alguien lo integró a mano).
  aparcado: ['asignado', 'pendiente', 'integrado'],
}
const RIESGOS = ['rojo', 'ambar', 'verde']
const AGENTES = ['claude', 'codex']
const MODELOS = ['haiku', 'sonnet', 'opus', 'opusplan', 'fable', 'codex']
const EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max']
const MODOS = ['auto', 'plan', 'manual', 'plan→auto', 'plan→manual']
const REVISORES = ['codex', 'claude-sesion-nueva', 'ninguno']
const ID_CARRIL = /^[a-z][a-z0-9-]{0,19}$/

export const dentro = (ruta, dueno) =>
  (ruta.replace(/\/$/, '') + '/').startsWith(dueno.replace(/\/$/, '') + '/')
const solapan = (a, b) => dentro(a, b) || dentro(b, a)
// Rutas que ningún carril posee y que todos pueden tocar sin chocar: `docs/` y las `compartido` del plan (carpetas donde cada paso
// sólo AGREGA archivos con nombre propio, como `supabase/migrations/`, que lleva una marca de tiempo distinta por paso).
const esLibre = (ruta, plan) =>
  ruta.startsWith('docs/') || (plan.compartido ?? []).some((c) => dentro(ruta, c))

/** Lee el texto de plan.yaml. No valida: para eso, `problemasDelPlan`. */
export function leerPlan(texto) {
  const plan = parse(texto) ?? {}
  return {
    esquema: plan.esquema,
    agentes_disponibles: plan.agentes_disponibles ?? [],
    compartido: plan.compartido ?? [],
    carriles: plan.carriles ?? [],
    pasos: plan.pasos ?? [],
  }
}

/**
 * Todo lo que impide correr el plan en paralelo sin choques. Puro. Un carril con `base: true` puede poseer carpetas que contienen las
 * de otros (el carril de los pasos que preparan o cierran el módulo); no choca porque sus pasos van antes o después de todos los demás:
 * lo verifica la comprobación de pasos que pueden correr a la vez.
 */
export function problemasDelPlan(plan) {
  const p = []
  if (plan.esquema !== 'plan/v1') p.push('esquema: debe ser plan/v1')
  const agentes = new Set(plan.agentes_disponibles)
  if (!agentes.has('claude') || [...agentes].some((a) => !AGENTES.includes(a)))
    p.push('agentes_disponibles: debe incluir claude y sólo claude o codex')

  const carriles = new Map()
  for (const c of plan.carriles) {
    if (!ID_CARRIL.test(String(c.id)))
      p.push(`carril «${c.id}»: id en minúsculas, sin espacios, hasta 20 caracteres`)
    if (carriles.has(c.id)) p.push(`carril ${c.id}: repetido`)
    if (!Array.isArray(c.dueno_de) || c.dueno_de.length === 0)
      p.push(`carril ${c.id}: sin dueno_de`)
    carriles.set(c.id, c)
  }
  if (carriles.size === 0) p.push('sin carriles')
  const lista = [...carriles.values()]
  for (let i = 0; i < lista.length; i++)
    for (let j = i + 1; j < lista.length; j++)
      for (const ra of lista[i].dueno_de ?? [])
        for (const rb of lista[j].dueno_de ?? [])
          if (!lista[i].base && !lista[j].base && solapan(ra, rb))
            p.push(`OWNERS: ${lista[i].id} y ${lista[j].id} comparten ${ra} / ${rb}`)

  p.push(...problemasDeMigraciones(plan))

  const pasos = new Map()
  for (const paso of plan.pasos) {
    if (pasos.has(paso.id)) p.push(`paso ${paso.id}: repetido`)
    pasos.set(paso.id, paso)
  }
  for (const paso of plan.pasos) {
    const e = `paso ${paso.id}:`
    for (const campo of [
      'titulo',
      'depende_de',
      'carril',
      'riesgo',
      'modulos',
      'ruteo',
      'verificacion',
      'terminado',
    ])
      if (paso[campo] === undefined) p.push(`${e} falta ${campo}`)
    if (!RIESGOS.includes(paso.riesgo)) p.push(`${e} riesgo inválido`)
    // Lo que el bucle ya no saca del número del paso (antes, `4.18` y `4.28` escritos en bucle.sh): `puerta` (antes de empezarlo, el CI de
    // main en verde), `cierre` (cierra su fase: Nivel 3, con el e2e completo en local) y `fase` (para el tablero).
    for (const campo of ['puerta', 'cierre'])
      if (paso[campo] !== undefined && typeof paso[campo] !== 'boolean')
        p.push(`${e} ${campo} debe ser true o false`)
    if (paso.fase !== undefined && !(Number.isInteger(paso.fase) && paso.fase >= 0))
      p.push(`${e} fase debe ser un número entero`)
    const carril = carriles.get(paso.carril)
    if (!carril) p.push(`${e} el carril ${paso.carril} no existe`)
    for (const m of paso.modulos ?? [])
      if (carril && !esLibre(m, plan) && !carril.dueno_de.some((d) => dentro(m, d)))
        p.push(`${e} toca ${m}, que no es del carril ${paso.carril}`)
    for (const d of paso.depende_de ?? [])
      if (!pasos.has(d)) p.push(`${e} depende de ${d}, que no existe`)
    const r = paso.ruteo ?? {}
    if (!AGENTES.includes(r.agente)) p.push(`${e} agente inválido`)
    else if (!agentes.has(r.agente)) p.push(`${e} usa ${r.agente}, que no está disponible`)
    if (!MODELOS.includes(r.modelo)) p.push(`${e} modelo inválido`)
    if (!EFFORTS.includes(r.effort)) p.push(`${e} effort inválido`)
    if (!MODOS.includes(r.modo)) p.push(`${e} modo inválido`)
    if (!REVISORES.includes(r.revisor)) p.push(`${e} revisor inválido`)
    if (r.revisor === 'codex' && !agentes.has('codex'))
      p.push(`${e} revisor codex sin codex disponible`)
    if (paso.riesgo === 'rojo') {
      if (r.modelo !== 'opus') p.push(`${e} un paso rojo va con opus`)
      if (!['high', 'xhigh', 'max'].includes(r.effort))
        p.push(`${e} un paso rojo necesita effort high o más`)
      if (!String(r.modo ?? '').startsWith('plan')) p.push(`${e} un paso rojo empieza en modo plan`)
      if (r.revisor === 'ninguno') p.push(`${e} un paso rojo necesita revisor`)
    }
  }

  const orden = ordenTopologico(plan)
  if (!orden) p.push('las dependencias tienen un ciclo')
  else {
    const anc = ancestros(plan)
    const ids = plan.pasos.map((x) => x.id)
    for (let i = 0; i < ids.length; i++)
      for (let j = i + 1; j < ids.length; j++) {
        const a = pasos.get(ids[i])
        const b = pasos.get(ids[j])
        if (anc.get(a.id).has(b.id) || anc.get(b.id).has(a.id)) continue
        // Dos pasos del mismo carril nunca corren a la vez (el coordinador le da uno por vez): que toquen lo mismo no choca. El 4.19-1
        // sumó a su paso `supabase/` y `.claude/rules/`, que también tienen el 4.15-7 y el 4.20-4a del A, y el A no pudo pedir paso.
        if (a.carril === b.carril) continue
        for (const ma of a.modulos ?? [])
          for (const mb of b.modulos ?? [])
            if (!esLibre(ma, plan) && !esLibre(mb, plan) && solapan(ma, mb))
              p.push(`${a.id} y ${b.id} pueden correr a la vez y los dos tocan ${ma} / ${mb}`)
      }
  }
  return p
}

/** Los ids en un orden que respeta las dependencias, o null si hay un ciclo. */
export function ordenTopologico(plan) {
  const pendientes = new Map(plan.pasos.map((p) => [p.id, new Set(p.depende_de ?? [])]))
  const orden = []
  while (pendientes.size > 0) {
    const libres = [...pendientes]
      .filter(([, deps]) => [...deps].every((d) => !pendientes.has(d)))
      .map(([id]) => id)
    if (libres.length === 0) return null
    for (const id of libres.sort()) {
      orden.push(id)
      pendientes.delete(id)
    }
  }
  return orden
}

/** Para cada paso, todos los pasos de los que depende (directa o indirectamente). */
export function ancestros(plan) {
  const porId = new Map(plan.pasos.map((p) => [p.id, p]))
  const memo = new Map()
  const de = (id) => {
    if (memo.has(id)) return memo.get(id)
    const acc = new Set()
    memo.set(id, acc)
    for (const d of porId.get(id)?.depende_de ?? []) {
      acc.add(d)
      for (const x of de(d)) acc.add(x)
    }
    return acc
  }
  for (const p of plan.pasos) de(p.id)
  return memo
}

/**
 * El largo del camino más largo desde cada paso hasta el final (él incluido). Los pasos con el número más alto son el camino
 * crítico: si se atrasan, se atrasa el proyecto entero.
 */
export function caminoCritico(plan) {
  const hijos = new Map(plan.pasos.map((p) => [p.id, []]))
  for (const p of plan.pasos) for (const d of p.depende_de ?? []) hijos.get(d)?.push(p.id)
  const memo = new Map()
  const largo = (id) => {
    if (!memo.has(id)) memo.set(id, 1 + Math.max(0, ...hijos.get(id).map(largo)))
    return memo.get(id)
  }
  for (const p of plan.pasos) largo(p.id)
  return memo
}

/**
 * El estado inicial: todos pendientes. Conserva lo que ya traía `previo`, también lo de los pasos que ESTA versión del plan no nombra: cada
 * carril lee el plan de su árbol, y uno atrasado (sin un paso que main sumó después) borraba al guardar el estado de ese paso, que
 * volvía a nacer `pendiente` y se hacía dos veces. Nadie recorre `estado.pasos`: todo parte de `plan.pasos`.
 */
export function estadoInicial(plan, previo = { pasos: {} }) {
  const pasos = { ...(previo.pasos ?? {}) }
  for (const p of plan.pasos) pasos[p.id] = previo.pasos?.[p.id] ?? { estado: 'pendiente' }
  return {
    pasos,
    ...(previo.pedidos?.length ? { pedidos: previo.pedidos } : {}),
    // El commit de cada PR cuyo CI rojo ya se volvió a correr (coordinador.mjs › reintentarUnaVez).
    ...(previo.reintentos && Object.keys(previo.reintentos).length
      ? { reintentos: previo.reintentos }
      : {}),
    // Los PR con un rojo del entorno: el commit, cuántas veces se volvió a correr y cuándo la última (pr.mjs › reintentarUnaVez).
    ...(previo.entorno && Object.keys(previo.entorno).length ? { entorno: previo.entorno } : {}),
    // Los PR con el CI cancelado y sin otra corrida detrás, desde cuándo (coordinador.mjs › atenderColgado).
    ...(previo.colgados && Object.keys(previo.colgados).length
      ? { colgados: previo.colgados }
      : {}),
  }
}

/** El carril que posee una ruta, sin contar a `salvo`: el de la carpeta más precisa; si ninguno, el base. */
export function duenoDe(plan, ruta, salvo) {
  let mejor = null
  for (const c of plan.carriles) {
    if (c.id === salvo) continue
    for (const d of c.dueno_de ?? [])
      if (dentro(ruta, d) && (!mejor || d.length > mejor.largo))
        mejor = { id: c.id, largo: d.length }
  }
  return mejor?.id ?? plan.carriles.find((c) => c.base && c.id !== salvo)?.id ?? null
}

const PEDIDO_ABIERTO = new Set(['pendiente', 'asignado', 'publicado'])
// asignado → integrado: el dueño lo cerró sin cambios (ya estaba hecho); sin esto el coordinador se lo volvía a dar sin fin.
const TRANSICIONES_PEDIDO = {
  pendiente: ['asignado'],
  asignado: ['publicado', 'pendiente', 'integrado'],
  publicado: ['integrado', 'asignado'],
  integrado: [],
}

// Las rutas que protegen al piloto. Un PR que las toca no se integra solo: la copia del bucle sale de main y los tres carriles se recargan
// con ella, así que es la persona quien lo deja entrar. De `scripts/guardas/`, sólo las que protegen al piloto y a los carriles (2026-11-08):
// las demás son de la app (escala, páginas, los registros de cada carril) y entraban con la persona sin motivo (la compuerta «guardas» del
// cierre, scripts/piloto/cierre.sh, sigue mirando la carpeta entera).
const GUARDAS =
  /^(scripts\/piloto\/|scripts\/guardas\/(ajustes|bloquear-peligrosos|carriles|carriles-plan|escribir-solo-en-piloto|guardar-autorizaciones|ignorados-del-piloto|por-agente|solo-lectura|verificar-al-terminar|workflows)[.]|scripts\/candado\.sh$|\.claude\/settings[^/]*\.json$|\.claude\/hooks\/|\.claude\/agents\/|\.claude\/skills\/piloto|lefthook\.yml$|\.github\/workflows\/)/
/** Las rutas de `rutas` que son guardas del piloto. */
export const guardasEn = (rutas) => rutas.filter((r) => GUARDAS.test(r))

/**
 * Anota un pedido del carril `de` (que espera en su paso `paso`). Uno abierto por paso: si ya hay, lo devuelve. Va al dueño de sus
 * `archivos` (el primero que tenga) o al carril base. Un carril no se pide a sí mismo.
 */
export function pedir(
  plan,
  estado,
  { de, paso, texto, archivos = [] },
  ahora = new Date().toISOString(),
) {
  const pedidos = estado.pedidos ?? []
  const abierto = pedidos.find(
    (p) => p.de === de && p.paso === paso && PEDIDO_ABIERTO.has(p.estado),
  )
  if (abierto) return { estado, pedido: abierto, nuevo: false }
  const para =
    archivos.map((a) => duenoDe(plan, a, de)).find(Boolean) ??
    plan.carriles.find((c) => c.base && c.id !== de)?.id
  if (!para) throw new Error(`no hay a qué carril pedirle lo del carril ${de}`)
  if (para === de) throw new Error(`el carril ${de} posee lo que pide: va en su paso`)
  // Dos carriles que se esperan: el dueño está parado esperando a quien le pide, y ninguno llega a tomar el pedido del otro.
  const inverso = pedidos.find(
    (p) => p.de === para && p.para === de && PEDIDO_ABIERTO.has(p.estado),
  )
  if (inverso)
    throw new Error(
      `ciclo: el carril ${para} espera al ${de} (${inverso.id}); lo decide la persona`,
    )
  const n = pedidos.reduce((m, p) => Math.max(m, p.n ?? 0), 0) + 1
  const pedido = {
    id: `pedido-${n}`,
    n,
    de,
    paso,
    texto,
    archivos,
    para,
    estado: 'pendiente',
    desde: ahora,
  }
  return { estado: { ...estado, pedidos: [...pedidos, pedido] }, pedido, nuevo: true }
}

/** Cambia el estado de un pedido, si la transición vale. No muta. */
export function marcarPedido(estado, id, nuevo, datos = {}, ahora = new Date().toISOString()) {
  const pedidos = estado.pedidos ?? []
  const actual = pedidos.find((p) => p.id === id)
  if (!actual) throw new Error(`no hay un pedido ${id}`)
  if (!TRANSICIONES_PEDIDO[actual.estado].includes(nuevo))
    throw new Error(`el pedido ${id} no puede pasar de ${actual.estado} a ${nuevo}`)
  return {
    ...estado,
    pedidos: pedidos.map((p) =>
      p.id === id ? { ...p, ...datos, estado: nuevo, desde: ahora } : p,
    ),
  }
}

/** Lo que el carril ve de un pedido como si fuera un paso (el bucle lo rutea solo: bucle.sh › ruteo_pedido). */
export const pasoDePedido = (pd) => ({
  id: pd.id,
  titulo: `Pedido del carril ${pd.de} (${pd.paso})`,
  riesgo: 'ambar',
  ruteo: { modelo: 'sonnet', effort: 'high' },
  terminado: pd.texto,
  decisiones: [],
  modulos: [],
})

/** Cambia el estado de un paso, si la transición vale. Devuelve un estado nuevo; no muta. */
export function marcar(estado, id, nuevo, datos = {}, ahora = new Date().toISOString()) {
  const actual = estado.pasos[id]
  if (!actual) throw new Error(`el paso ${id} no está en el plan`)
  if (!TRANSICIONES[actual.estado].includes(nuevo))
    throw new Error(`el paso ${id} no puede pasar de ${actual.estado} a ${nuevo}`)
  return {
    ...estado,
    pasos: { ...estado.pasos, [id]: { ...actual, ...datos, estado: nuevo, desde: ahora } },
  }
}

/** Aparca un paso asignado: deja de ser de su carril hasta que se reintente o la persona lo reanude. Cuenta las veces. No muta. */
export function aparcar(estado, id, motivo, ahora = new Date().toISOString()) {
  const veces = (estado.pasos[id]?.aparcado_veces ?? 0) + 1
  return marcar(
    estado,
    id,
    'aparcado',
    { motivo_aparcado: String(motivo ?? '').slice(0, 500), aparcado_veces: veces },
    ahora,
  )
}

/** La persona (o la supervisión) devuelve un paso aparcado a la cola, con la cuenta en cero. No muta. */
export function reanudar(estado, id, ahora = new Date().toISOString()) {
  return marcar(
    estado,
    id,
    'pendiente',
    { aparcado_veces: 0, motivo_aparcado: null, carril: undefined, rama: undefined },
    ahora,
  )
}

/**
 * El paso aparcado que `carril` puede volver a intentar, o null: lo aparcó él (o es suyo y nadie lo tomó), lleva menos de `maxAparcado`
 * veces y pasó `enfriar` desde que se aparcó (una causa del entorno suele pasar sola; reintentar al instante la repite).
 */
export function reintentable(
  plan,
  estado,
  carril,
  { maxAparcado = 2, enfriar = 30 * 60_000, ahora = Date.now() } = {},
) {
  return (
    plan.pasos.find((p) => {
      const e = estado.pasos[p.id]
      return (
        e?.estado === 'aparcado' &&
        (e.carril ?? p.carril) === carril &&
        (e.aparcado_veces ?? 1) <= maxAparcado &&
        ahora - (Date.parse(e.desde ?? '') || 0) >= enfriar
      )
    }) ?? null
  )
}

/**
 * Qué hace ahora el carril. `cuota` es la fracción usada de la ventana de 5 h (0 a 1, o null si no está calibrada); con `umbral` o más,
 * sólo avanzan los pasos del camino crítico; con 1 o más, nadie.
 * @returns {{accion: 'paso', paso: object, rama: string} | {accion: 'esperar', motivo: string} | {accion: 'terminado'}}
 */
export function siguiente(
  plan,
  estado,
  carril,
  { cuota = null, umbral = 0.8, maxAparcado = 2, enfriar = 30 * 60_000, ahora = Date.now() } = {},
) {
  // Un pedido de otro carril va antes que todo lo propio (entre partes de un paso, también): el otro carril está parado esperándolo.
  // Primero los de un carril que está parado esperándolo; después los de la persona (nadie espera), por orden de llegada.
  const esCarril = (id) => plan.carriles.some((c) => c.id === id)
  const pedidos = (estado.pedidos ?? [])
    .filter((p) => p.para === carril)
    .sort((x, y) => Number(!esCarril(x.de)) - Number(!esCarril(y.de)) || (x.n ?? 0) - (y.n ?? 0))
  const pd =
    pedidos.find((p) => p.estado === 'asignado') ??
    pedidos.find((p) => p.estado === 'publicado' && p.arreglar) ??
    pedidos.find((p) => p.estado === 'pendiente')
  if (pd)
    return {
      accion: 'paso',
      paso: pasoDePedido(pd),
      rama: rama(carril, pd.id),
      retomar: pd.estado !== 'pendiente',
      pedido: pd,
      ...(pd.arreglar ? { arreglar: pd.arreglar } : {}),
    }
  const propios = plan.pasos.filter((p) => p.carril === carril)
  // Lo que hace este carril: lo suyo del plan y lo que tomó prestado (`carril` del estado); lo suyo que hace otro, no.
  const haceEste = (p) => (estado.pasos[p.id]?.carril ?? p.carril) === carril
  // La rama de un paso es la que quedó anotada al asignarlo (un arreglo prestado sigue en la del PR de otro carril, `b/4.26`).
  const ramaDe = (p) => estado.pasos[p.id]?.rama ?? rama(carril, p.id)
  const enCurso = plan.pasos.find((p) => estado.pasos[p.id]?.estado === 'asignado' && haceEste(p))
  if (enCurso) return { accion: 'paso', paso: enCurso, rama: ramaDe(enCurso), retomar: true }
  // Un PR propio con el CI rojo o en conflicto con main va antes que un paso nuevo: bloquea a los que dependen de él.
  const roto = plan.pasos.find(
    (p) =>
      estado.pasos[p.id]?.estado === 'publicado' && estado.pasos[p.id]?.arreglar && haceEste(p),
  )
  if (roto)
    return {
      accion: 'paso',
      paso: roto,
      rama: ramaDe(roto),
      retomar: true,
      arreglar: estado.pasos[roto.id].arreglar,
    }
  const integrado = (id) => estado.pasos[id]?.estado === 'integrado'
  const largo = caminoCritico(plan)
  if (plan.pasos.every((p) => integrado(p.id))) return { accion: 'terminado' }
  const pendientes = propios.filter((p) => estado.pasos[p.id]?.estado === 'pendiente')
  const listos = pendientes.filter((p) => (p.depende_de ?? []).every(integrado))
  if (listos.length === 0) {
    // Antes que un paso prestado, el PR roto de un carril ocupado: se arregla en su misma rama (2026-11-08: el B alternaba el 4.22 y el
    // 4.26, los dos en conflicto, mientras el A y el C esperaban sin paso).
    const ajeno = arregloAjeno(plan, estado, carril)
    if (ajeno)
      return {
        accion: 'paso',
        paso: ajeno,
        rama:
          estado.pasos[ajeno.id].rama ??
          rama(estado.pasos[ajeno.id].carril ?? ajeno.carril, ajeno.id),
        retomar: true,
        arreglar: estado.pasos[ajeno.id].arreglar,
        prestado: true,
      }
    const prestado =
      cuota !== null && cuota >= umbral ? null : prestable(plan, estado, carril, largo)
    if (prestado)
      return {
        accion: 'paso',
        paso: prestado,
        rama: rama(carril, prestado.id),
        retomar: false,
        prestado: true,
      }
    // Sin nada más que hacer, lo aparcado: una sesión nueva sobre la rama que quedó (lo anota el bucle en `.piloto/aparcados/`).
    const otraVez = reintentable(plan, estado, carril, { maxAparcado, enfriar, ahora })
    if (otraVez)
      return {
        accion: 'paso',
        paso: otraVez,
        rama: estado.pasos[otraVez.id].rama ?? rama(carril, otraVez.id),
        retomar: true,
        reintento: estado.pasos[otraVez.id].aparcado_veces ?? 1,
      }
    const aparcados = plan.pasos.filter((p) => estado.pasos[p.id]?.estado === 'aparcado')
    const vivos = plan.pasos.some((p) =>
      ['asignado', 'publicado'].includes(estado.pasos[p.id]?.estado),
    )
    const alguienPuede = plan.pasos.some(
      (p) => estado.pasos[p.id]?.estado === 'pendiente' && (p.depende_de ?? []).every(integrado),
    )
    // Nada corre, nada está listo, lo que queda cuelga de lo aparcado y a lo aparcado no le quedan reintentos (uno que sólo se está
    // enfriando no cuenta): el plan llegó hasta donde puede sin la persona.
    const leQuedan = aparcados.some((p) => (estado.pasos[p.id].aparcado_veces ?? 1) <= maxAparcado)
    if (aparcados.length && !vivos && !alguienPuede && !leQuedan)
      return {
        accion: 'esperar',
        atascado: true,
        motivo: `atascado: ${aparcados.map((p) => p.id).join(', ')} ${aparcados.length === 1 ? 'está aparcado' : 'están aparcados'} y lo demás depende de ${aparcados.length === 1 ? 'él' : 'ellos'}; los mira la persona (coordinador.mjs reanudar <paso>)`,
      }
    // Un carril con sus pasos integrados sigue atento a los pedidos hasta que termine el plan entero (un bucle que sale no atiende ninguno).
    if (propios.every((p) => integrado(p.id)))
      return {
        accion: 'esperar',
        motivo:
          propios.length === 0
            ? `el carril ${carril} no tiene pasos en el plan ni uno listo que tomar de otro`
            : 'sus pasos están integrados: atiende pedidos hasta que el plan termine',
      }
    if (pendientes.length === 0)
      return {
        accion: 'esperar',
        motivo: propios.some((p) => estado.pasos[p.id]?.estado === 'aparcado')
          ? 'lo que le queda está aparcado (se reintenta más tarde) o publicado'
          : 'sus pasos están publicados: falta que se integren',
      }
    // Lo que bloquea al primero de sus pasos en el orden del plan (los demás esperan detrás de él).
    const orden = ordenTopologico(plan) ?? plan.pasos.map((p) => p.id)
    const primero = pendientes.sort((a, b) => orden.indexOf(a.id) - orden.indexOf(b.id))[0]
    const faltan = (primero.depende_de ?? []).filter((d) => !integrado(d))
    const conMarca = (d) => (estado.pasos[d]?.estado === 'aparcado' ? `${d} (aparcado)` : d)
    return {
      accion: 'esperar',
      motivo: `${primero.id} espera a que se integren: ${faltan.sort().map(conMarca).join(', ')}`,
    }
  }

  if (cuota !== null && cuota >= 1)
    return { accion: 'esperar', motivo: 'cuota: se llegó al tope de la ventana de 5 h' }
  let candidatos = listos
  if (cuota !== null && cuota >= umbral) {
    const maximo = Math.max(
      ...plan.pasos
        .filter((p) => estado.pasos[p.id]?.estado !== 'integrado')
        .map((p) => largo.get(p.id)),
    )
    candidatos = listos.filter((p) => largo.get(p.id) === maximo)
    if (candidatos.length === 0)
      return {
        accion: 'esperar',
        motivo: `cuota al ${Math.round(cuota * 100)} %: sólo avanza el camino crítico`,
      }
  }
  const elegido = [...candidatos].sort(
    (a, b) => largo.get(b.id) - largo.get(a.id) || a.id.localeCompare(b.id),
  )[0]
  return { accion: 'paso', paso: elegido, rama: rama(carril, elegido.id), retomar: false }
}

/**
 * El paso de otro carril que `carril` puede tomar prestado, o null: pendiente, con sus dependencias integradas, de un carril que ya está
 * ocupado con un paso asignado (uno libre lo toma él mismo en su próxima vuelta) y sin tocar nada de lo que está en curso o con el PR
 * abierto (salvo `docs/` y `compartido`). El de camino más largo primero y, a igual largo, el que más toca lo de `carril` (el 4.27, de
 * comentarios, al c, que posee esas áreas).
 */
export function prestable(plan, estado, carril, largo = caminoCritico(plan)) {
  const integrado = (id) => estado.pasos[id]?.estado === 'integrado'
  const suyas = plan.carriles.find((c) => c.id === carril)?.dueno_de ?? []
  const afinidad = (p) => (p.modulos ?? []).filter((m) => suyas.some((d) => dentro(m, d))).length
  const quien = (p) => estado.pasos[p.id]?.carril ?? p.carril
  const ocupados = new Set(
    plan.pasos.filter((p) => estado.pasos[p.id]?.estado === 'asignado').map(quien),
  )
  for (const pd of estado.pedidos ?? []) if (pd.estado === 'asignado') ocupados.add(pd.para)
  const vivos = plan.pasos.filter((p) =>
    ['asignado', 'publicado'].includes(estado.pasos[p.id]?.estado),
  )
  const choca = (p) =>
    vivos.some((v) =>
      (p.modulos ?? []).some(
        (m) =>
          !esLibre(m, plan) && (v.modulos ?? []).some((n) => !esLibre(n, plan) && solapan(m, n)),
      ),
    )
  return (
    plan.pasos
      .filter(
        (p) =>
          p.carril !== carril &&
          ocupados.has(p.carril) &&
          estado.pasos[p.id]?.estado === 'pendiente' &&
          (p.depende_de ?? []).every(integrado) &&
          !choca(p),
      )
      .sort(
        (a, b) =>
          largo.get(b.id) - largo.get(a.id) ||
          afinidad(b) - afinidad(a) ||
          a.id.localeCompare(b.id),
      )[0] ?? null
  )
}

/**
 * El paso publicado de otro carril con el PR en rojo o en conflicto que `carril` puede arreglar, o null: sólo si quien lo hizo está ocupado
 * con otro paso o un pedido (uno libre lo toma él mismo en su próxima vuelta). Se arregla en la rama de su PR, sin abrir otro.
 */
export function arregloAjeno(plan, estado, carril) {
  const quien = (p) => estado.pasos[p.id]?.carril ?? p.carril
  const ocupados = new Set(
    plan.pasos.filter((p) => estado.pasos[p.id]?.estado === 'asignado').map(quien),
  )
  for (const pd of estado.pedidos ?? []) if (pd.estado === 'asignado') ocupados.add(pd.para)
  return (
    plan.pasos.find((p) => {
      const e = estado.pasos[p.id]
      return (
        e?.estado === 'publicado' && e.arreglar && quien(p) !== carril && ocupados.has(quien(p))
      )
    }) ?? null
  )
}

export const rama = (carril, paso) => `${carril}/${paso.toLowerCase()}`

/**
 * Si el coordinador puede integrar el PR de este paso sin la persona: su riesgo está en `mergeAuto` (COORD_MERGE_AUTO). Un paso rojo sólo si
 * la lista lo nombra a propósito (`verde,ambar,rojo`); por omisión, lo integra la persona.
 */
export function integraSolo(paso, mergeAuto = ['verde', 'ambar']) {
  return mergeAuto.includes(paso.riesgo)
}

/** El desfase de puertos de cada carril (la principal es 0): 100, 200, … en el orden de plan.yaml. */
export function desfases(plan) {
  return Object.fromEntries(plan.carriles.map((c, i) => [c.id, 100 * (i + 1)]))
}

/** El tablero en Markdown: por carril, cada paso con su estado y su PR. */
export function tablero(plan, estado, { cuota = null, ahora = new Date().toISOString() } = {}) {
  const marca = { pendiente: '·', asignado: '▶', publicado: '⧗', integrado: '✓', aparcado: '✗' }
  const total = plan.pasos.length
  const hechos = plan.pasos.filter((p) => estado.pasos[p.id]?.estado === 'integrado').length
  const lineas = [
    `# Tablero`,
    '',
    `${hechos} de ${total} pasos integrados · cuota de la ventana: ${cuota === null ? 'sin calibrar' : `${Math.round(cuota * 100)} %`} · ${ahora}`,
    '',
    '`·` pendiente · `▶` en curso · `⧗` PR abierto · `✓` integrado · `✗` aparcado',
  ]
  const aparcados = plan.pasos.filter((p) => estado.pasos[p.id]?.estado === 'aparcado')
  if (aparcados.length) {
    lineas.push('', '## Aparcados (los mira la persona si se agotan los reintentos)', '')
    for (const p of aparcados) {
      const e = estado.pasos[p.id]
      lineas.push(
        `- **${p.id}** (${e.carril ?? p.carril}, ${e.aparcado_veces ?? 1}.ª vez, ${e.desde ?? '—'}): ${String(e.motivo_aparcado ?? 'sin motivo').replace(/\n/g, ' ')}`,
      )
    }
  }
  for (const c of plan.carriles) {
    lineas.push(
      '',
      `## ${c.id}`,
      '',
      '| | Paso | Riesgo | Depende de | PR |',
      '|---|---|---|---|---|',
    )
    for (const p of plan.pasos.filter((x) => x.carril === c.id)) {
      const e = estado.pasos[p.id] ?? { estado: 'pendiente' }
      // Un PR ya integrado de un paso aparcado es de una parte anterior: sigue a la vista.
      const pr = [e.pr && `#${e.pr}`, e.pr_parcial && `#${e.pr_parcial} (parte)`].filter(Boolean)
      const prestado =
        e.carril && e.carril !== c.id && e.estado !== 'pendiente' ? ` (lo hace ${e.carril})` : ''
      lineas.push(
        `| ${marca[e.estado]} | ${p.id} ${p.titulo}${prestado} | ${p.riesgo} | ${(p.depende_de ?? []).join(', ') || '—'} | ${pr.join(', ') || '—'} |`,
      )
    }
  }
  const pedidos = (estado.pedidos ?? []).filter((p) => PEDIDO_ABIERTO.has(p.estado))
  if (pedidos.length) {
    lineas.push(
      '',
      '## Pedidos entre carriles',
      '',
      '| | Pedido | De → para | Texto | PR |',
      '|---|---|---|---|---|',
    )
    for (const p of pedidos)
      lineas.push(
        `| ${marca[p.estado]} | ${p.id} (${p.paso}) | ${p.de} → ${p.para} | ${String(p.texto).replace(/\|/g, '/').slice(0, 120)} | ${p.pr ? `#${p.pr}` : '—'} |`,
      )
  }
  return lineas.join('\n') + '\n'
}

/**
 * La fracción usada de la ventana de 5 h, sumando el `total_cost_usd` de las filas de consumo.csv de todos los carriles en esas 5 h.
 * Es una aproximación (dólares equivalentes, no el % que muestra Claude): por eso `usdVentana` se calibra midiendo, y sin él es null.
 * @param {{fecha: string, usd: number}[]} filas  @param {number|null} usdVentana  @param {number} topePct
 */
export function fraccionDeCuota(filas, usdVentana, topePct = 100, ahora = Date.now()) {
  if (!usdVentana || usdVentana <= 0) return null
  const desde = ahora - 5 * 3600 * 1000
  const usado = filas
    .filter((f) => Date.parse(f.fecha) >= desde)
    .reduce((s, f) => s + (Number(f.usd) || 0), 0)
  return usado / (usdVentana * (topePct / 100))
}

/** Las filas de un consumo.csv del piloto (las columnas `fecha` y `total_cost_usd`). Tolera comillas. */
export function leerConsumo(texto) {
  const filas = texto.split('\n').filter((l) => l.trim() !== '')
  if (filas.length === 0) return []
  const campos = (linea) => {
    const out = []
    let actual = ''
    let comillas = false
    for (const ch of linea) {
      if (ch === '"') comillas = !comillas
      else if (ch === ',' && !comillas) {
        out.push(actual)
        actual = ''
      } else actual += ch
    }
    out.push(actual)
    return out
  }
  const cabecera = campos(filas[0])
  const iFecha = cabecera.indexOf('fecha')
  const iUsd = cabecera.indexOf('total_cost_usd')
  if (iFecha < 0 || iUsd < 0) return []
  return filas.slice(1).map((l) => {
    const c = campos(l)
    return { fecha: c[iFecha], usd: Number(c[iUsd]) || 0 }
  })
}
