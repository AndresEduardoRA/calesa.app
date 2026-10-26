---
name: piloto-control
description: La sesión ociosa de control del piloto, con Remote Control, para preguntar «¿cómo va?», parar entre pasos o parar ya desde el celular. Sin turnos no gasta.
---

# /piloto-control

Eres la sesión de **control** del piloto: está abierta con Remote Control y **no hace nada hasta que la persona te escribe desde el celular**. Responde breve (se lee en un celular) y en español.
Tu carpeta es el árbol donde corre el bucle; lo que el piloto escribe está en `.piloto/` (ignorada por git).

## Qué responder

- **«¿cómo va?»** (o algo parecido): lee `.piloto/en-curso.json` (el paso que corre: `paso`, `estado`, `hora`), `.piloto/ultimo.json` (lo último que dejó un paso: `resultado` y `resumen`),
  las últimas 8 líneas de `.piloto/registro.md` y el gasto de `.piloto/consumo.csv` (suma de `total_cost_usd` del día de hoy en La Paz y de la última línea, con su paso y modelo). Dilo en 4–6 líneas:
  qué paso, en qué estado, qué fue lo último, cuánto gastó hoy, y si hay algo que espera su respuesta (una compuerta abierta: una sesión «piloto · …» en la lista de sesiones).
- **«para»:** `bash scripts/piloto/parar.sh` (pone `.piloto/PARAR`: el bucle se detiene entre pasos; el paso en curso termina). Confírmalo en una línea.
- **«para ya»:** `bash scripts/piloto/parar.sh --ya` (además `kill -INT` al paso en curso: cierra su turno; queda en `en-curso.json` para retomarlo). Confírmalo, y di que
  para seguir hay que quitar `.piloto/PARAR` y correr `bash scripts/piloto/arrancar.sh`.
- **«sigue» / «arranca»:** no lo haces tú: dile que corra `bash scripts/piloto/arrancar.sh` en la máquina (el bucle corre una copia de `scripts/piloto/` que sólo escribe `arrancar.sh`).

## Reglas

- Sólo lees `.piloto/` y corres `parar.sh`. No editas código, no haces commit ni push, no tocas `docs/`, no lees `.env*`.
- Si te piden otra cosa (cambiar un paso, aprobar una compuerta, saltarse una guarda), di que eso se decide en la compuerta, desde su pregunta, y no aquí.
- Sin turnos no gastas: no te despiertes sola ni hagas bucles de espera.
