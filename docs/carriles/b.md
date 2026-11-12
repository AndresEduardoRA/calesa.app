# Carril B — notas

El carril B (`docs/ORCA.md`) no edita `docs/ESTADO.md`, `docs/PLAN.md`, `docs/DECISIONES.md` ni `docs/BITACORA.md`: lo que iría
allí se anota aquí (una sesión del B sin coordinador) o, con coordinador, en `docs/pasos/<paso>/`, y el carril A (o la persona, al
integrar) lo pasa a su lugar. Lo hace cumplir la guarda de CI `scripts/guardas/carriles.mjs`, con `docs/plan.yaml`.

Cada entrada: `## AAAA-MM-DD — <tema>` (fecha de `TZ=America/La_Paz date +%F`) y debajo, en listas cortas:

- **Hecho:** lo que quedó en la rama, con el PR.
- **Para ESTADO / PLAN:** lo que el carril A tiene que reflejar (un abierto nuevo, una fila cerrada, un dato de la fase).
- **Para DECISIONES:** la decisión no obvia, en una línea, con su motivo.
- **Bitácora:** el nivel corrido (`e2e completo: sí|no (<tarea>)`) y lo medido.
- **Necesita del carril A:** una migración de un dominio compartido, un cambio en `src/shared` u otra cosa fuera de los dominios de B
  (sus `migraciones` en `docs/plan.yaml`). B no la hace: la describe aquí y sigue con otra cosa.

## Entradas

## 2026-11-11 — 5.04-3: el inspector › Datos de una fase

- **Hecho:** `<DatosDeLaFase>` llena el hueco `bloques.datos`; el registro del drawer pasó a `formulario`. Detalle en `docs/pasos/5.04-3/`.
- **Microdecisiones de texto:** bloques «Identidad», «En el flujo», «Alerta por demora», «Transporte y aduana» y «Web y portal»; interruptores «Es inicial», «Es final»,
  «Pide nota al entrar», «Es logística», «Permite contenedor», «Permite aduana», «Llegada de repuestos», «Se publica en la web» y «Visible en el portal»; campos «Demora (días)»,
  «Repetir la alerta cada (horas)», «Nombre para el cliente» y «Descripción para el cliente». El aviso de otra inicial es el de la entidad (`avisoDeOtraInicial`).
- **Para ESTADO / PLAN:** el 5.04 está completo (`docs/pasos/5.04-1` a `5.04-3`).
