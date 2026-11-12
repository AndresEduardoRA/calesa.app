# 9.07 · Tablero: las métricas en la base (2026-11-12)

- **D1 · Excepción a «un número que se muestra nunca es un total exacto».** Un agregado de un período cerrado (las RPC `tablero_*`) se cuenta en la base, con ventana máxima de 366 días y por índice de fecha; si usa `count(`, con su motivo en `supabase/tests/escala.sql` (`tablero_cotizaciones`; `tablero_leads` suma con `sum` y no entra al registro). Las listas siguen igual. Escrita en `.claude/rules/escala.md`.
- **D2 · Conversión.** «Convertidos» = leads con `cliente_desde` en el período; «Tasa» = convertidos / creados del período, con 4 decimales y nula con `creados = 0`. Puede pasar de 1 (se convierten leads creados antes): no se recorta.
- **D3 · Los clientes de antes.** Quedan con `cliente_desde` nulo: no se sabe cuándo pasaron y no se inventa. `tablero_leads` devuelve `conversion_desde` (el día en que se aplicó la migración en ese entorno, `_tablero_conversion_desde()`) para que el widget diga «Desde <fecha>».
- **D4 · Alta directa como cliente.** Un lead que nace con un tipo de clase `cliente` (también por importación) queda sin fecha: sólo el paso de prospecto a cliente la pone, así una importación no infla la tasa.
- **D5 · De cliente a cliente.** Conserva la fecha; volver a prospecto la vacía. Nadie la escribe a mano (el trigger la repone).
- **D6 · «Finales».** Las cotizaciones creadas en el período que hoy son de clase final, cualquiera sea su estado: no hay fecha de cuándo se marcó final. Sumar esa fecha es otro paso.
- **D7 · Ranking por persona.** Por el dueño vigente del lead. Un lead sin dueño, o cuyo dueño está en una baja en curso (`_bajas_en_curso()`), cuenta en el total y no en el ranking (la regla de humo.sql: toda lectura que nombra a una persona dice quién se queda).
- **D8 · Ranking por origen de leads.** Por `leads.origen_lead_id`; el lead sin origen es un grupo con id y nombre nulos (la pantalla escribe «Sin origen»).
- **D9 · Alcance.** Quien tiene `tablero.metricas.ver` (global) cuenta toda la empresa, sin mirar carteras, niveles ni `cotizaciones.ver`: sólo hay cuentas y nombres de personas y orígenes, ningún dato de un lead ni monto.
- **D10 · Período.** Fechas inclusivas en la zona de `ajustes_empresa`, como intervalo semiabierto; nulas, al revés o de más de 366 días dan 22023 con su `hint`.
- **D11 · Orden de los rankings.** Más creados, más convertidos (o finales), nombre (nulos al final), id; sólo grupos con algo en el período; `*_hay_mas` dice si había más que el tope.
- **D12 · `cliente_desde` en la actividad.** Aparece en la foto que guarda `lead_auditar` como cualquier columna: no es privado (el cambio de tipo ya está en la misma foto). Recortarla es de la revisión de `registrar_actividad` del 9.01 (carril c).
- **D13 · Sin partir.** Una parte: tres migraciones (`tablero_cliente_desde`, `tablero_leads`, `tablero_cotizaciones`), un test SQL y los tipos.
