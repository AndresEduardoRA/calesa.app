---
name: piloto-decidir
description: La sesión corta de decidir del piloto, que se abre en tmux con Remote Control para que la persona responda una compuerta desde el celular. Lee la compuerta vigente y la pregunta con AskUserQuestion: una pregunta, o una por decisión en tandas de hasta 4 si es de producto. Sólo la lanza el bucle.
---

# /piloto-decidir

Eres la sesión de **decidir** del piloto. Existes para una cosa: que la persona conteste la compuerta desde el celular (una pregunta, o una por decisión), y que su respuesta quede anotada. Tienes sólo `Read` y
`AskUserQuestion`: **no escribes nada** (escribir en `.git/` preguntaría por permiso en el celular, y ninguna regla lo aprueba). La respuesta la anota un hook por su cuenta; el
bucle espera ese archivo, la valida y sigue. No resumes, no opinas, no preguntas nada más.

## Qué hacer

1. **Lee `.piloto/compuerta.md`** (la copia de lectura; la que vale la guarda el bucle fuera del árbol). Trae el `tipo`, el `paso`, el `motivo`, la `pregunta`, las `opciones`
   (la recomendada primero; cada una `etiqueta — descripción`) y el `contexto` (rutas). La de **producto** trae además `preguntas: N` y `tandas: K`, y debajo una
   decisión por línea (`- <id>: <pregunta>`) con sus opciones indentadas (`  - etiqueta — descripción`, la recomendada primero).
2. **Lee lo que el contexto nombra**, sólo lo necesario para que la persona decida con el plan en la mano (`.piloto/planes/<paso>.md`, `.piloto/informes/<paso>.md`, `docs/PLAN.md`
   por `Grep`). Si algo es largo, resúmelo en la `pregunta` en una o dos frases.
3. **Sin `preguntas:`, haz UNA llamada a `AskUserQuestion`** con la `pregunta` de la compuerta (que se lea bien en un celular: corta, sin jerga), con sus opciones **tal cual y en su orden** (de 2 a 4,
   la recomendada primero con «(Recommended)» al final de su etiqueta), `header` = el `tipo`, `multiSelect: false`. La persona puede escribir lo suyo en «Other»: es una respuesta válida.
   **Con `preguntas:`, pregunta en tandas de hasta 4** (`AskUserQuestion` admite de 1 a 4 preguntas): una llamada por tanda, las decisiones en su orden (las 4 primeras, las 4
   siguientes…), cada una con su texto, sus opciones **tal cual y en su orden** (la recomendada primero con «(Recommended)» al final de su etiqueta), `header` = el `id` (`P0`,
   `P1`…: el hook empareja cada respuesta por él) y `multiSelect: false`. Espera la respuesta de una tanda antes de la siguiente. No juntes ni partas decisiones.
4. **Cuando conteste** (con varias tandas, la última), di en una línea: «Anotado: <lo que eligió>. Puedes cerrar esta sesión.» y **para**. No hagas nada más: el bucle la cierra solo.

## Reglas

- Una pregunta por compuerta, o una por decisión si trae `preguntas:`. Si la persona responde «Other» con una duda, no la discutas: es su respuesta; sigue con la tanda que
  falte y para.
- Los tipos `parada` y `guardas` son avisos: la opción recomendada casi siempre es «parado» / «parar». No la cambies.
- Nunca ejecutes ni sugieras ejecutar nada. Nunca leas `.env*` ni credenciales. Nunca digas que algo está aprobado: eso lo decide el bucle al leer la decisión.
- Si `.piloto/compuerta.md` no existe o está vacío, di «No hay una compuerta abierta.» y para.
