# Producto — importadora

## Qué es

Sistema interno **white-label** para importadoras de vehículos: se vende por repositorio, una
empresa por despliegue, con marca, país, moneda y zona horaria configurables adentro. Reemplaza el
prototipo `ip` (ya vendido a su primer cliente) con un sistema planificado desde cero: un solo
motor configurable donde `ip` tenía tres copias (USA / China / Oficina / Repuestos).

## El problema

La importadora trabaja hoy con planillas por asesor, fotos y WhatsApp entre áreas: nadie sabe en
qué fase está un vehículo sin preguntar, las cotizaciones no cuadran entre asesores, y los datos
del cliente viven en el teléfono de cada uno. El sistema junta todo en un lugar centralizado y hace
que cada rol vea exactamente lo que le toca.

## Quién lo usa

| Rol de referencia | Qué viene a hacer                                                                        | Cuántos            |
| ----------------- | ---------------------------------------------------------------------------------------- | ------------------ |
| Dueño             | Configurar (orígenes, flujos, fórmulas, roles, web), mirar métricas, resolver conflictos | ~10                |
| Asesor            | Leads, seguimientos, cotizaciones, turnos de la web, portal del cliente                  | la mayoría de ~100 |
| Logística         | Mover vehículos por el flujo, documentos, transporte, aduana, gastos, pagos              | varios             |
| Repuestos         | Proyectos e ítems de repuestos, compras, stock, cotizador propio                         | varios             |
| RRHH / equipo     | Alta, roles, bloqueo y baja de usuarios                                                  | esporádico         |

Los roles son libres: el dueño los crea y les da permisos del catálogo. La interfaz se arma por
permisos, no por nombre de rol.

## Alcance (completo, por fases en `docs/PLAN.md`)

- **Equipo y permisos**: auth email+contraseña y Google, recuperar contraseña, registro on/off
  aplicado en base; roles libres; catálogo de permisos fijo por código parametrizable por origen y
  con alcance propios/todos; bloqueo; baja (sus leads quedan en el limbo hasta que alguien los adopte).
- **Empresa**: marca, datos legales, país, locale, zona horaria, monedas y N tipos de cambio
  nombrados, integraciones (apibara, push, web pública), retención de actividad y papelera.
- **Orígenes**: CRUD de orígenes de vehículos (subasta USA, China, Oficina, Corea…) con layout de
  campos (preconfiguración subasta/apibara o manual) y categorías; cada origen tiene su flujo de
  logística, su fórmula y su plantilla de cotización.
- **Vehículos**: inventario por origen, hasta 24 fotos optimizadas, filtros estilo Copart con
  estado en la URL, interesados y vínculo a lead, vitrina web, papelera 30 días, alta por link de
  Copart/IAAI vía apibara.
- **Leads**: teléfono principal único y enmascarado salvo cartera, verificación mientras se tipea,
  compartir/transferir, favoritos, tachados y etiquetas por usuario, seguimientos con texto
  enriquecido y visibilidad pública/privada, recordatorios, oportunidades en embudos
  configurables por usuario, acceso al portal del cliente, papelera, exportar/importar CSV.
- **Cotizaciones**: fórmula por origen como grafo de nodos versionado (append-only), XCell con
  valor por defecto global (⚙), tablas de referencia editables, snapshot por cotización, Modo
  Live, vista previa y PDF con plantilla versionada, versiones (cotizar encima), comentarios,
  adjuntos, reportes, revisiones con diff, preventa/final, comprobantes de venta.
- **Flujos**: fases con color, orden, inicial/final, jubilación, requisitos de entrada
  (documentos, datos, esperas entre flujos), roles por fase y transición, alerta por demora,
  vitrina y portal con alias, revisión de coherencia, vista previa antes de mover, lotes con
  resultado parcial.
- **Logística**: cadena por fase, documentos con aprobación y vencimiento, transporte
  (embarques y contenedores como grupos), declaraciones aduaneras, gastos y pagos, notas, alerta
  por demora, «dónde está», cotización final vs gasto real y margen.
- **Repuestos**: proyecto por vehículo, ítems que recorren su propio flujo, imágenes, stock,
  compras (costo con permiso aparte), cotizador propio con configuración versionada.
- **Agenda**: eventos, tareas con responsable, recordatorios y subastas en un calendario.
- **Chat**: directos, grupos y canal global; menciones `#` de vehículos, leads y cotizaciones;
  tareas y eventos desde el chat; realtime.
- **Notificaciones**: campana con lo que pide acción, realtime y push web.
- **Actividad**: auditoría de todo, 14 días.
- **Web**: contenido de la web pública (guías, FAQs, testimonios con consentimiento, legales,
  redes, NIT), cola de turnos tipo ruleta configurable, vitrina, portal del cliente; esquema `web`
  que consume el repo de la web.
- **Buscador global** por permisos (Ctrl/Cmd+K). **Tablero** con métricas y gráficas por rol,
  widgets personalizables. **Datos**: exportar/importar CSV (lo propio cualquiera; todo, el dueño).
- PWA instalable, modo oscuro, transiciones, esqueletos, formularios en bloques.

## Fuera de alcance

- Multiidioma (sólo español).
- Offline real (sin conexión no funciona; el caché es el mínimo del shell).
- Editor de artes para redes (Konva) y directorio de contactos/empresas.
- Integración con la API de WhatsApp/Meta.
- La web pública en sí: va en otro repositorio (skill `sitio-marketing`) sobre el esquema `web`.
- Multi-empresa en un mismo despliegue.
