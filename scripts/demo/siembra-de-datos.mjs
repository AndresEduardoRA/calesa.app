// Los datos de ejemplo de `sembrar.mjs`, por las RPC de la app y con la sesión de quien los crearía: los leads con su primer
// seguimiento y su recordatorio (`crear_lead`), un segundo seguimiento (`seguimiento_crear`), los vehículos (`vehiculo_crear`,
// el dueño) y las cotizaciones (`cotizacion_hoja` + `cotizacion_crear`, quien tiene el lead o, si su nivel le esconde un input,
// el dueño). Cada uno lleva un id fijo: si ya estaba, la RPC lo devuelve sin duplicar. Si el dueño ve leads que no son de la
// siembra, no se siembra nada (la base está en uso).
import {
  atributosQueCaben,
  leadsDeDemo,
  pedidoDeLead,
  requeridosSinValor,
} from './datos-de-demo.mjs'
import {
  entradasDeCotizacion,
  parejasDeCotizacion,
  ubicarVehiculos,
  vehiculosDeDemo,
} from './vehiculos-de-demo.mjs'

export class FalloDeSiembra extends Error {}

// La respuesta de supabase-js, o un fallo con lo que se intentaba y el mensaje de la base (que nunca trae una clave).
export function exigir({ data, error }, que) {
  if (error) throw new FalloDeSiembra(`No se pudo ${que}: ${error.message}`)
  return data
}

const TOPE = 1000
const nuevaCuenta = () => ({ creados: 0, yaEstaban: 0, omitidos: [] })

// Los inputs que quien mira puede tipear en la hoja que devolvió `cotizacion_hoja()` (ya recortada por su nivel): los nodos con
// `tipo_nodo: 'input'` y `editable: true`, estén en una celda o en el lado secundario de un par.
export function editablesDeLaHoja(hoja) {
  const editables = new Set()
  const visitar = (x) => {
    if (Array.isArray(x)) x.forEach(visitar)
    else if (x && typeof x === 'object') {
      if (typeof x.nodo === 'string' && x.tipo_nodo === 'input' && x.editable === true)
        editables.add(x.nodo)
      Object.values(x).forEach(visitar)
    }
  }
  visitar(hoja.secciones ?? [])
  return editables
}

async function puede(sesion, clave, origen = null) {
  return (
    exigir(
      await sesion.cliente.rpc('tiene_permiso', { p_clave: clave, p_origen: origen }),
      `preguntar por ${clave}`,
    ) === true
  )
}

async function leerCatalogos(dueno) {
  const de = (consulta, que) => consulta.then((r) => exigir(r, `leer ${que}`))
  const c = dueno.cliente
  const [tipos, origenesDeLead, tiposDeSeguimiento, camposDeLead, origenes, camposDeOrigen] =
    await Promise.all([
      de(
        c
          .from('tipos_lead')
          .select('id, clase, orden')
          .eq('activo', true)
          .order('orden')
          .limit(TOPE),
        'los tipos de lead',
      ),
      de(
        c.from('origenes_lead').select('id, orden').eq('activo', true).order('orden').limit(TOPE),
        'los orígenes de lead',
      ),
      de(
        c
          .from('tipos_seguimiento')
          .select('id, orden')
          .eq('activo', true)
          .order('orden')
          .limit(TOPE),
        'los tipos de seguimiento',
      ),
      de(
        c.from('leads_campos').select('clave, tipo, opciones, activo, requerido').limit(TOPE),
        'los campos de los leads',
      ),
      de(
        c.from('origenes').select('id, nombre, tipo, activo, orden').order('orden').limit(TOPE),
        'los orígenes',
      ),
      de(
        c
          .from('origenes_campos')
          .select('origen_id, clave, tipo, opciones, activo, requerido')
          .limit(TOPE),
        'los campos de los orígenes',
      ),
    ])
  return { tipos, origenesDeLead, tiposDeSeguimiento, camposDeLead, origenes, camposDeOrigen }
}

async function sembrarLeads({ dueno, personas, cat, ahora, r }) {
  const leads = leadsDeDemo()
  const ejemplo = pedidoDeLead(leads[0], {
    ...cat,
    origenes: cat.origenesDeLead,
    campos: cat.camposDeLead,
    ahora,
  })
  const faltan = requeridosSinValor(cat.camposDeLead, Object.keys(ejemplo.p_lead.atributos))
  if (faltan.length) {
    r.leads.omitidos.push({
      que: 'todos',
      motivo: `los leads piden ${faltan.join(', ')} y la siembra no los inventa`,
    })
    return []
  }
  const creadores = []
  for (const p of [dueno, ...personas]) if (await puede(p, 'leads.crear')) creadores.push(p)
  const sembrados = []
  for (const [i, lead] of leads.entries()) {
    const quien = creadores[i % creadores.length]
    const pedido = pedidoDeLead(lead, {
      ...cat,
      origenes: cat.origenesDeLead,
      campos: cat.camposDeLead,
      ahora,
    })
    const { data, error } = await quien.cliente.rpc('crear_lead', pedido)
    if (error) {
      r.fallos.push(`lead ${lead.nombre}: ${error.message}`)
      continue
    }
    if (data.resultado !== 'creado') {
      r.leads.omitidos.push({
        que: lead.nombre,
        motivo: `el teléfono ya es de otro lead (${String(data.resultado)})`,
      })
      continue
    }
    if (data.repetido) r.leads.yaEstaban++
    else {
      r.leads.creados++
      if (pedido.p_seguimiento) r.seguimientos++
      if (pedido.p_recordatorio) r.recordatorios++
    }
    sembrados.push({ ...lead, quien })
    if (lead.segundoSeguimiento && cat.tiposDeSeguimiento.length) {
      const tipo = cat.tiposDeSeguimiento[(lead.n + 1) % cat.tiposDeSeguimiento.length]
      const otro = await quien.cliente.rpc('seguimiento_crear', {
        p_id: lead.segundoSeguimiento.id,
        p_lead: lead.id,
        p_seguimiento: { tipo_id: tipo.id, titulo: lead.segundoSeguimiento.titulo },
      })
      if (otro.error) r.fallos.push(`seguimiento de ${lead.nombre}: ${otro.error.message}`)
      else if (otro.data.resultado !== 'repetido') r.seguimientos++
    }
  }
  return sembrados
}

async function sembrarVehiculos({ dueno, cat, r }) {
  const { ubicados, sinOrigen } = ubicarVehiculos(vehiculosDeDemo(), cat.origenes)
  for (const v of sinOrigen)
    r.vehiculos.omitidos.push({
      que: v.datos.titulo,
      motivo: `no hay un origen activo de tipo ${v.tipoDeOrigen}`,
    })
  const ids = ubicados.map((v) => v.id)
  const previos = new Set(
    exigir(
      await dueno.cliente.from('vehiculos').select('id').in('id', ids).limit(ids.length),
      'leer los vehículos',
    ).map((f) => f.id),
  )
  const sembrados = []
  for (const v of ubicados) {
    const campos = cat.camposDeOrigen.filter((c) => c.origen_id === v.origen.id)
    const { atributos } = atributosQueCaben(v.atributos, campos)
    const faltan = requeridosSinValor(campos, Object.keys(atributos))
    if (faltan.length) {
      r.vehiculos.omitidos.push({
        que: v.datos.titulo,
        motivo: `${v.origen.nombre} pide ${faltan.join(', ')}`,
      })
      continue
    }
    if (!(await puede(dueno, 'vehiculos.crear', v.origen.id))) {
      r.vehiculos.omitidos.push({
        que: v.datos.titulo,
        motivo: `el dueño no puede crear vehículos en ${v.origen.nombre}`,
      })
      continue
    }
    const { error } = await dueno.cliente.rpc('vehiculo_crear', {
      p_id: v.id,
      p_origen: v.origen.id,
      p_datos: { ...v.datos, atributos },
    })
    if (error) {
      r.fallos.push(`vehículo ${v.datos.titulo}: ${error.message}`)
      continue
    }
    if (previos.has(v.id)) r.vehiculos.yaEstaban++
    else r.vehiculos.creados++
    sembrados.push(v)
  }
  return sembrados
}

// La hoja de un origen abierta por esa persona (la base la firma para ella: la cotiza la misma) y lo que tipearía en ella.
async function hojaPara(quien, vehiculo) {
  const hoja = await quien.cliente.rpc('cotizacion_hoja', { p_origen: vehiculo.origen.id })
  if (hoja.error)
    return {
      motivo: `${quien.email} no cotiza en ${vehiculo.origen.nombre} (${hoja.error.message})`,
    }
  if (hoja.data.estado !== 'lista')
    return { motivo: `${vehiculo.origen.nombre} no tiene una fórmula publicada` }
  return {
    quien,
    abierta: hoja.data.abierta,
    ...entradasDeCotizacion(vehiculo, editablesDeLaHoja(hoja.data)),
  }
}

// Quién cotiza: quien tiene el lead, si puede tipear todo lo del vehículo; si su nivel le esconde un input (el asesor no ve el
// valor tabla de la subasta), el dueño, que ve todos los leads. Así ningún total sale de un input en cero que nadie tipeó.
async function elegirHoja(lead, dueno, vehiculo) {
  const propia = await hojaPara(lead.quien, vehiculo)
  if (lead.quien === dueno || propia.omitidos?.length === 0) return propia
  const delDueno = await hojaPara(dueno, vehiculo)
  return delDueno.omitidos?.length === 0 ? delDueno : propia
}

async function sembrarCotizaciones({ dueno, leads, vehiculos, r }) {
  for (const { id, lead, vehiculo } of parejasDeCotizacion(leads, vehiculos)) {
    const que = `${lead.nombre} / ${vehiculo.datos.titulo}`
    const hoja = await elegirHoja(lead, dueno, vehiculo)
    if (!hoja.quien) {
      r.cotizaciones.omitidos.push({ que, motivo: hoja.motivo })
      continue
    }
    if (hoja.omitidos.length)
      r.avisos.push(
        `${que}: ${hoja.quien.email} no edita ${hoja.omitidos.join(', ')}; quedan en lo de la fórmula`,
      )
    const { data, error } = await hoja.quien.cliente.rpc('cotizacion_crear', {
      p_id: id,
      p_origen: vehiculo.origen.id,
      p_lead: lead.id,
      p_entradas: hoja.entradas,
      p_abierta: hoja.abierta,
      p_vehiculo: vehiculo.id,
      p_clase: 'preventa',
      p_con_la_abierta: false,
    })
    if (error) {
      r.fallos.push(`cotización ${que}: ${error.message}`)
      continue
    }
    if (data.repetido) r.cotizaciones.yaEstaban++
    else r.cotizaciones.creados++
  }
}

export async function sembrarDatos({ dueno, personas, ahora }) {
  const r = {
    salteado: null,
    leads: nuevaCuenta(),
    seguimientos: 0,
    recordatorios: 0,
    vehiculos: nuevaCuenta(),
    cotizaciones: nuevaCuenta(),
    avisos: [],
    fallos: [],
  }
  const deLaSiembra = new Set(leadsDeDemo().map((l) => l.id))
  const visibles = exigir(
    await dueno.cliente
      .from('leads_vista')
      .select('id')
      .limit(deLaSiembra.size + 1),
    'leer los leads',
  )
  if (visibles.some((f) => !deLaSiembra.has(f.id))) {
    r.salteado =
      'el dueño ya ve leads que no son de la siembra: la base está en uso y no se le agregan datos de ejemplo'
    return r
  }
  const cat = await leerCatalogos(dueno)
  const leads = await sembrarLeads({ dueno, personas, cat, ahora, r })
  const vehiculos = await sembrarVehiculos({ dueno, cat, r })
  await sembrarCotizaciones({ dueno, leads, vehiculos, r })
  return r
}
