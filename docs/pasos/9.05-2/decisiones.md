# 9.05-2 · Datos: exportar todo, el route handler con la fuente de leads (2026-11-12)

- **D10 · La 9.05-2 se parte.** Esta parte lleva el route handler y la fuente de leads; la 9.05-2b, vehículos y cotizaciones (dos lecturas por RPC
  distintas, cada una con su medición: no cabían en 6 commits).
- **D11 · El flujo lee con un token fijo, no con la cookie.** Un cliente de supabase-js con `accessToken` no refresca nunca: refrescar después de
  responder rotaría el refresh token sin poder guardarlo y la detección de reuso cerraría la sesión. El token se toma con `getSession()` y se verifica
  ese mismo con `getClaims(token)`; identidad y vencimiento salen de los claims. Es la única excepción a «nunca getSession()» y está en la ficha.
- **D12 · El conteo previo va por páginas de ids**, sin SQL nuevo. Medido: 0,3 s con 200.000.
- **D13 · Primero el permiso efectivo**, para no contar de balde; la autoridad sigue siendo el registrar (42501).
- **D14 · Una sola regla por tipo de campo:** las celdas salen de la exportación propia de `leads`, reexportadas por su `index.ts`.
- **D15 · Columnas de leads:** `N.º` (sólo con su permiso), Nombre, Teléfono, Tipo, Origen, Dueño, Creado, Último seguimiento y los campos activos.
  Sin `N.º propio` (la función no lo trae). Fechas como `AAAA-MM-DDTHH:mm` en la zona de la empresa.
- **D16 · El archivo se llama `leads-todos-AAAA-MM-DD.csv`.**
- **D17 · El conteo y la lectura usan el mismo instante de corte** y la lectura corta en las filas registradas: el archivo nunca pasa la constancia.
- **D18 · Un fallo a mitad del flujo lo corta con error** y el cupo queda gastado (la constancia ya se dejó; no hay RPC que la devuelva).
- **D19 · No se pide una página con menos de 30 s de token:** corta con error antes que mandar un pedido que dará 401.
- **D20 · La fila de rendimiento va en `docs/pasos/9.05-2/rendimiento.md`**, con su ancla.
- **`TOPE_DE_FILAS` queda en 250.000:** la lectura entera extrapolada da 42 s, y aun doblándola por el viaje HTTP y el JSON entra en los 5 min de
  vida mínima del token.
- **Las columnas viven en `features/exportar/`** y no en `entities/` (la auditoría del plan): `entities` no puede importar otro módulo, y las celdas son de `leads`.
