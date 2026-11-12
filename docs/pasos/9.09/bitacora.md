## 9.09 · higiene del e2e y del CI, partes 1 y 3 (2026-11-12)

Parte 1 (9-8): `empresa.spec.ts` deja Vault como estaba. `e2e/soporte/apibara-clave.ts` suma `vigilarVaultDeApibara()` (huella al
empezar, quitar lo que dejó la prueba y comprobar la huella al final); sin clave previa borra la que escribió la prueba, con una real el
caso que escribe se salta. `e2e/apibara-clave-intacta.spec.ts` prueba esa regla con y sin clave.

Parte 3 (9-11): `scripts/ci/volcar-base.sh` deja el log de la base y sus estadísticas en `e2e-fallos/` y el job `e2e` lo corre con
`if: failure()`; `scripts/guardas/workflows-fallo.ts` lo exige (4 mutaciones en `workflows-fallo.test.ts`). 9-4 y 9-5 se cierran como
decididos; 9-6 queda abierto con la persona. Quedan 9.09-2 (9-9 y 9-10) y 9.09-3 (4-41).

- e2e completo: no (9.09, Nivel 1: lo corre el CI del PR; dirigidos empresa, apibara-clave-intacta y vehiculos-apibara-funcion en escritorio)
