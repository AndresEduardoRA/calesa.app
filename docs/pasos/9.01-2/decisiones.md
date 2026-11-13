## 2026-11-12 · Decisiones del paso 9.01-2 (privilegios de `registrar_actividad()` y de `actividad.detalle`)

- **D17 · `registrar_actividad()` pierde el `execute` de `authenticated`** (y se revoca de `public` y `anon`, que no lo tenían). Nadie que no sea
  definer la llama y nada de la app ni de edge; las definer corren como su dueño. `areas/actividad/registrar.sql` (T2) cae si una función de
  invocador la llama.
- **D18 · `service_role` conserva el `execute`:** quitarlo no protege nada (escribe `actividad` directo) y deja la puerta a un job futuro.
- **D19 · `actividad.detalle` pierde el `select` de `authenticated`:** hay detalle privado (tabla de abajo) y nadie de la app lo lee. Los lectores
  definer (`_lead_crear`, `leads_importaciones_recientes`) siguen igual.
- **D20 · Revoke de columna, nunca de tabla:** el grant de `authenticated` sobre `actividad` es por columna; un revoke de tabla se llevaría la cabecera.
- **D21 · Ninguna tabla que quedó sin declarar en `_actividad_recorte` (D15) se declara:** sin `detalle` para la app no hay nada nuevo que mostrar.
- **D22 · No se cambia lo que guardan las llamadas ni las filas viejas:** quitar la columna a la app basta; enmascarar el código o sacar montos
  rompería pruebas que leen esas claves sin ganancia. Si la app necesita leer `detalle`, será por una función definer que lo recorte.
- **D23 · El detector lee `pg_get_functiondef`, no `prosrc`** (una `language sql` con `begin atomic` deja `prosrc` vacío), mira todos los esquemas
  menos los del sistema y se prueba con dos sondas creadas y descartadas en la misma transacción (T4).

### Revisión de lo que guarda `detalle` (sexto argumento de `registrar_actividad`)

Los `insert into public.actividad` directos de los triggers (`auditar`, `cotizacion_auditar`, `formula_auditar`, `lead_auditar`, los de
`origenes_lead`, `tipos_lead` y `tipos_seguimiento`) no escriben `detalle`.

**Con dato privado:**

| Acción · función                                                                                                | Claves                                                      | Por qué                                                   |
| --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | --------------------------------------------------------- |
| `lead.telefono_cambiado` · `cambiar_telefono_lead` (`base.sql:8559-8561`)                                       | `anterior`, `nuevo`                                         | trozo del teléfono de un lead que quien mira puede no ver |
| `lead.telefono_extra_*` · `lead_telefono_guardar`, `lead_telefono_quitar` (`base.sql:12676, 12693, 12716`)      | `telefono`                                                  | ídem                                                      |
| `portal.otorgado` / `reotorgado` · `otorgar_portal` (`base.sql:15814-15816`)                                    | `codigo`, `codigo_anterior`                                 | la mitad de la credencial del portal                      |
| `portal.desbloqueado` · `portal_desbloquear` (`base.sql:16106`); `portal.revocado` · `revocar_portal` (`16777`) | `codigo`                                                    | ídem                                                      |
| `pago.confirmado` · `pago_confirmar` (`20261111225327_pagos_confirmar.sql:80-81`)                               | `monto`, `moneda`, `monto_base`                             | dinero de un origen que quien mira puede no ver           |
| `pago.anulado` · `pago_anular` (`20261111225333_pagos_anular.sql:89-91`)                                        | `motivo`, `monto`, `moneda`, `monto_base`, `confirmado_por` | ídem                                                      |

**Dudosas** (texto del filtro): `leads.exportado` · `leads_exportacion_registrar` (`base.sql:13262`); `datos.exportado` ·
`datos_exportacion_registrar` (`20261112194922_datos_exportacion_registrar.sql:53, 92`).

**Sin dato privado** (por familia): bajas (`_baja_terminar`, `equipo_dar_de_baja`: conteos); alta y adopción de lead (`_lead_crear`: `intento`);
oportunidades (ids y `cantidad`); papeleras de leads, vehículos y cotizaciones (`tipo`, `cantidad`, `automatica`, `desde`); importación (conteos y
`por_motivo`); limpieza automática (conteos, `lote`, `parcial`); niveles (`concesiones`); catálogos de leads (`nombre`, `por_defecto`,
`despues_de`); seguimientos (ids, `tipo`, `visibilidad`, nunca el texto); fotos (`foto`, `hash`, `cantidad`); vehículo (`publicado`,
`destacado`); comentarios (ids). Las ≈ 30 llamadas restantes pasan 4 o 5 argumentos: `detalle` queda nulo. El detalle con `archivo:línea` está en
el plan del paso.
