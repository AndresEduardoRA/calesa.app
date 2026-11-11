## 2026-11-11 · Paso 8.06-1: la base revalida la web pública (parte 1 de 2 del 8.06)

- **Hecho:**
  - **Cola.** `interno.web_revalidar_pendiente` tiene RLS, no tiene grants y no tiene índice único sobre la etiqueta.
  - **Triggers.** Hay 15 triggers por sentencia `web_revalidar`, que anotan `guias`, `faqs`, `testimonios`, `ajustes`, `asesores` y `vehiculos`.
    `categorias` anota `vehiculos`. `cola_web_asesores` anota sólo cuando cambia el orden.
  - **Job.** `web_revalidar_correr()` (`security definer`, sólo `service_role`) corre en el job `web-revalidar` cada minuto. Manda un solo pedido con las
    etiquetas y lleva el secreto de Vault sólo en la cabecera. Si la web está apagada, no tiene dirección `https://` o falta el secreto, no envía y no
    pierde lo pendiente.
  - **`integracion_guardar`.** Valida `revalidar_url` y guarda sólo esa clave.
  - **Conteo.** `web_publica_vehiculos_que_cambian()` cuenta acotado a 51 los vehículos que cambian.
  - **Catálogo.** La fila `web_publica` entra por migración.
  - Decisiones en `decisiones.md`. La auditoría del plan bloqueó dos veces: el `on conflict` serializaba las escrituras, y el nivel era 2, no 1.
    Las dos se resolvieron en el plan.
- **Commits:** `5c65e085` (la cola), `0d19e222` (el job), `02f7fdf0` (la dirección), `7582c2a6` (el conteo) y `61fe6130`.
  `61fe6130` es el `fix` que pidió la auditoría del informe: R1 siembra una fila de otra transacción y exige que la propia anote igual. Con la variante
  descartada, R1 cae (`.piloto/salidas/8.06/control-d4.txt`).
- **Falta (8.06-2):**
  - Quitar las variables de entorno.
  - Las reglas en `entities`.
  - «Probar» desde el servidor.
  - La tarjeta «Web pública».
  - El e2e.
  - La ficha de `web` con el contrato con el sitio.
- **Verificación** (`.piloto/salidas/8.06/`):
  - `SOLO=areas/web/revalidar.sql pnpm db:probar`: R1–R9 en verde.
  - `db:probar` completo: 816 ✓, ningún ✗.
  - `db:lint`: sin errores; los avisos son los de siempre, ninguno de las funciones nuevas.
  - `db:carreras`: todas en verde (14,1 s).
  - `scripts/guardas`: 1.044 ✓.
  - `nivel.mjs`: nivel 2 (`rls`, `estructura`).
- e2e completo: no (8.06-1, Nivel 2 por rls y estructura: lo corre el CI del PR)
