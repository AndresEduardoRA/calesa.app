---
name: revisar
description: Revisión adversarial del diff actual de importadora contra las reglas del proyecto antes de commitear.
context: fork
model: sonnet
allowed-tools: Read, Grep, Glob, Bash
---

# /revisar

Revisa `git diff` y `git diff --staged` buscando lo que los lints **no** atrapan. No edites nada:
reporta. Para cada hallazgo: archivo y línea, qué está mal, por qué importa, severidad
(bloquea / debería / menor).

Busca en este orden:

1. **Datos**: tabla sin RLS, policy sin `(select auth.uid())`, definer sin `search_path`, columna
   de policy sin índice, schema cambiado sin `pnpm db:types` ni prueba en `supabase/tests/humo.sql`,
   `.update()` sobre una columna que otorga permisos (fase, dueño, vitrina, papelera).
2. **Permisos en UI**: `if (rol === …)`, acciones visibles que la RPC rechaza, montos sin
   `<Monto>`, teléfono leído de `leads` en vez de `leads_vista`.
3. **Estados no felices**: pantallas sin vacío/error/sin permiso; `PT409` tratado como error
   genérico; destructivas sin deshacer ni confirmación según `docs/UX.md`; errores tragados.
4. **Contrato de módulo**: import a tripas de otro módulo, API pública que creció sin necesidad,
   dependencia nueva o ciclo (mira «Depende de» en `docs/MAPA.md` antes y después).
5. **Nombres**: términos fuera de `docs/GLOSARIO.md` o sinónimos de uno que sí está; textos fijos
   que nombran orígenes, fases o documentos (salen de la base).
6. **Memoria**: unidad nueva sin `CLAUDE.md`, ficha que ya no describe la unidad,
   `docs/ESTADO.md` sin actualizar.

Termina con un veredicto de una línea: **listo para commitear** o **no todavía** y por qué.
