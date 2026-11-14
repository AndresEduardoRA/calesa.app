// Cómo se nombra lo que dice la actividad: la entidad con el término de `docs/GLOSARIO.md`, la acción por su sufijo, cada campo con su
// etiqueta y quién lo hizo. Sin etiqueta, el nombre crudo humanizado: nunca se esconde un cambio por no tener nombre.
import type { FilaDeActividad } from './actividad'

// Espejo de las tablas declaradas en `_actividad_recorte` (supabase/migrations/…_actividad_diff.sql): una tabla nueva ahí, una línea aquí.
export const ENTIDADES_DE_LA_ACTIVIDAD: Readonly<Record<string, string>> = {
  leads: 'Lead',
  vehiculos: 'Vehículo',
  cotizaciones: 'Cotización',
  comprobantes: 'Comprobante',
  declaraciones_aduana: 'Declaración aduanera',
  documentos: 'Documento',
  gastos: 'Gasto',
  pagos: 'Pago',
  transportes: 'Transporte',
  repuestos_compras: 'Compra',
  repuestos_items: 'Ítem de repuesto',
  ajustes_empresa: 'Empresa',
  ajustes_web: 'Ajustes de la web',
  ajustes_leads: 'Ajustes de leads',
  categorias: 'Categoría',
  cola_web_asesores: 'Cola web',
  fases: 'Fase',
  fases_requisitos: 'Requisito',
  fases_transiciones: 'Transición',
  formulas: 'Fórmula',
  integraciones: 'Integración',
  leads_campos: 'Campo de lead',
  origenes: 'Origen',
  origenes_campos: 'Layout de campos',
  origenes_lead: 'Origen del lead',
  plantillas_tarjeta: 'Plantilla de tarjeta',
  roles_permisos: 'Concesión',
  tipos_cambio: 'Tipo de cambio',
  tipos_lead: 'Tipo de lead',
  tipos_seguimiento: 'Tipo de seguimiento',
  usuarios_roles: 'Rol de una persona',
}

const CAMPOS_COMUNES: Readonly<Record<string, string>> = {
  nombre: 'Nombre',
  titulo: 'Título',
  estado: 'Estado',
  notas: 'Notas',
  activo: 'Activo',
  orden: 'Orden',
  clave: 'Clave',
  origen_id: 'Origen',
  fase_id: 'Fase',
  lead_id: 'Lead',
  vehiculo_id: 'Vehículo',
  repuesto_id: 'Ítem de repuesto',
  cotizacion_id: 'Cotización',
  categoria_id: 'Categoría',
  creado_por: 'Creado por',
  creado_en: 'Creado',
  eliminado_en: 'Enviado a la papelera',
  lote_papelera_id: 'Lote de papelera',
  moneda: 'Moneda',
  monto: 'Monto',
  monto_base: 'Monto en moneda base',
  fecha: 'Fecha',
  descripcion: 'Descripción',
  atributos: 'Atributos',
  atributos_publicos: 'Atributos públicos',
}

const CAMPOS_POR_TABLA: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  leads: {
    telefono_cc: 'Código de país',
    tipo_lead_id: 'Tipo de lead',
    origen_lead_id: 'Origen del lead',
    ultimo_seguimiento_en: 'Último seguimiento',
  },
  vehiculos: {
    precio: 'Precio',
    precio_web: 'Precio público',
    precio_web_hasta: 'Precio público hasta',
    publicado_web: 'Publicado',
    lote: 'Lote de subasta',
    situacion: 'Situación',
    subasta_resultado: 'Resultado de la subasta',
    subasta_resuelta_en: 'Subasta resuelta el',
    subasta_resuelta_por: 'Subasta resuelta por',
  },
  cotizaciones: { total_base: 'Total en moneda base' },
  repuestos_items: { precio_cliente: 'Precio al cliente' },
}

// «precio_web_nota» → «Precio web nota».
function humanizar(clave: string): string {
  const texto = clave.replace(/[._]+/g, ' ').trim()
  return texto.length === 0 ? clave : texto.charAt(0).toUpperCase() + texto.slice(1)
}

export function etiquetaDeEntidad(tabla: string): string {
  return ENTIDADES_DE_LA_ACTIVIDAD[tabla] ?? tabla
}

// Las de `registrar_actividad()` que no se leen bien humanizadas.
const VERBOS: Readonly<Record<string, string>> = {
  'vehiculo.subasta_resuelta': 'Resolvió la subasta',
}

// La acción la escribe `auditar()` como `<tabla>.<insert|update|delete>`; las de `registrar_actividad()` traen su propia clave.
export function verboDeLaAccion(accion: string): string {
  const propio = VERBOS[accion]
  if (propio) return propio
  if (accion.endsWith('.insert')) return 'Creó'
  if (accion.endsWith('.update')) return 'Cambió'
  if (accion.endsWith('.delete')) return 'Borró'
  return humanizar(accion)
}

// `atributos.<clave>` lleva la etiqueta del campo del layout (`leads_campos` / `origenes_campos`) si llega.
export function etiquetaDeCampo(
  tabla: string,
  clave: string,
  etiquetasDeAtributos?: ReadonlyMap<string, { etiqueta: string }>,
): string {
  const punto = clave.indexOf('.')
  if (punto > 0) {
    const interna = clave.slice(punto + 1)
    return etiquetasDeAtributos?.get(interna)?.etiqueta ?? humanizar(interna)
  }
  return CAMPOS_POR_TABLA[tabla]?.[clave] ?? CAMPOS_COMUNES[clave] ?? humanizar(clave)
}

// Sin persona: lo hizo el sistema (un job, un trigger); con persona y sin nombre cargado, «Sin nombre».
export function nombreDelActor(fila: Pick<FilaDeActividad, 'actorId' | 'actorNombre'>): string {
  if (fila.actorId === null) {
    return 'Sistema'
  }
  return fila.actorNombre ?? 'Sin nombre'
}
