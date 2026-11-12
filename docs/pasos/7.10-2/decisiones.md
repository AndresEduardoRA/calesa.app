## 2026-11-12 — 7.10-2

Plan: `.piloto/planes/7.10-2.md`. Cierra la D7 de 7.10-1 (editar manda `p_menciones`).

- **D10** — La consulta del `#` es una palabra sola, sin espacios: un nombre de dos palabras se halla por una de ellas. Reversible: cambiar la expresión de `consultaAbierta`.
- **D11** — Dos referencias con la misma etiqueta se distinguen con « (2)» sólo en el campo; el cuerpo guarda el token.
- **D12** — El campo es un `<textarea>` plano: `#Nombre` no se resalta ni se protege; si se edita, queda como texto y no menciona.
- **D13** — El panel va dentro del formulario, sobre el campo, no como popover (no pelea el foco y se prueba igual).
- **D14** — Un envío rechazado por una mención (ya no la ves) queda «No enviado» con su motivo; no se quita la mención en silencio.
- **D15** — Se puede mencionar a cualquier persona activa y sin bloqueo, sea o no miembro; la base sólo avisa a los miembros vigentes.
- **D16** — No se ofrece mencionarse a uno mismo (`leerPersonas` excluye a quien escribe).
