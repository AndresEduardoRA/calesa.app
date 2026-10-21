// Lo que las guardas de escala (`escala.test.ts`) dejan pasar, **cada cosa con su motivo y su tope**. Una
// excepción que ya no coincide con nada falla (se saca), y una nueva se discute: el motivo es lo que
// permite revisarla. `.claude/rules/escala.md` es la regla; `docs/RENDIMIENTO.md`, el inventario.
import type { TablaAcotada } from './escala'

// Tablas que no crecen con el uso: se leen enteras sin `.limit(`.
export const TABLAS_ACOTADAS: Readonly<Record<string, TablaAcotada>> = {
  ajustes_empresa: { motivo: 'Una sola fila (id = 1).', tope: '1 fila' },
  ajustes_web: { motivo: 'Una sola fila.', tope: '1 fila' },
  monedas: { motivo: 'Catálogo de la empresa.', tope: 'decenas' },
  tipos_cambio: { motivo: 'Catálogo de la empresa, uno por par de monedas.', tope: 'decenas' },
  tipos_cambio_historial: {
    motivo: 'Se lee con su propio tope (`CAMBIOS_A_LA_VISTA`).',
    tope: '30 filas',
  },
  integraciones: { motivo: 'Una fila por integración conocida.', tope: 'menos de 10 filas' },
  roles: { motivo: 'Catálogo de roles de la empresa.', tope: 'decenas' },
  permisos: { motivo: 'Catálogo fijo, cambia sólo por migración.', tope: 'unos 100 filas' },
  origenes: { motivo: 'Catálogo de la empresa (un origen por línea de negocio).', tope: 'decenas' },
  origenes_campos: { motivo: 'El layout de campos de un origen.', tope: 'decenas por origen' },
  categorias: { motivo: 'Categorías de un origen.', tope: 'decenas por origen' },
  fases: { motivo: 'Las fases de un flujo.', tope: 'decenas por origen' },
  tipos_seguimiento: {
    motivo: 'Catálogo de la empresa, con un tope en la base (`_tipos_seguimiento_tope()`).',
    tope: '100 filas (lo impone la base)',
  },
  leads_campos: { motivo: 'El layout de campos de los leads.', tope: 'decenas' },
  preferencias_usuario: { motivo: 'Una fila por persona (la propia).', tope: '1 fila' },
  perfiles: { motivo: 'El equipo de la empresa (cuentas, no clientes).', tope: 'decenas' },
  embudos: { motivo: 'Los embudos de quien mira, con un tope en la base.', tope: '10 por persona' },
  vistas_guardadas: {
    motivo: 'Las vistas de quien mira, con un tope en la base.',
    tope: '20 por pantalla',
  },
  etiquetas: {
    motivo: 'Las etiquetas de quien mira, con un tope en la base.',
    tope: '50 por persona',
  },
  vehiculos_imagenes: { motivo: 'Las fotos de un vehículo.', tope: '24 por vehículo' },
  vehiculos_imagenes_version: { motivo: 'Una fila por vehículo, por su id.', tope: '1 fila' },
}

export type Excepcion = {
  archivo: string
  regla: string
  motivo: string
  tope: string
}

// Hallazgos puntuales: el archivo, la regla rota y por qué se deja.
export const EXCEPCIONES: readonly Excepcion[] = [
  {
    archivo: 'src/modules/equipo/infra/queries/roles.ts',
    regla: 'count',
    motivo: '`usuarios_roles(count)` cuenta las personas por rol: es el equipo de la empresa.',
    tope: 'decenas',
  },
]
