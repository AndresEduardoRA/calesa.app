## 2026-11-08 — Paso 4.22-7: el CI en rojo tras unir main (e2e bloque 1 de 4)

- **Hecho:** arreglo de dos specs que cayeron en el CI del PR (run 42503883574, `cae5d445`), sin código de producción.
  - `e2e/configuracion-cotizacion-tarjeta.spec.ts` (E1): la barra de Configuración › Cotización ya tiene seis pestañas (Fórmula, Tarjeta, Diseño, Tonos, Tablas,
    Ajustes) desde que el 4.22 y el 4.19-3b se unieron; el spec esperaba cuatro.
  - `e2e/configuracion-cotizacion-tarjeta-volumen.spec.ts` (E7): el primer HTML de la pestaña «Tarjeta» con 500 miembros midió **155.874 B** (tope de 154.900; en
    local da lo mismo, es determinista). El tope pasa a **163.700 B** (155.874 + 5 %); `docs/RENDIMIENTO.md` lo dice. Los nodos del DOM siguen bajo 5.000.
- **Verificación:** los dos specs en escritorio, 7 en verde (`.piloto/salidas/4.22/ci-fix-e2e.txt`). El otro rojo anotado («Carriles», run 42496082053) es de un
  commit anterior y el CI de `cae5d445` ya no lo trae.
- **Lo que no se hizo:** no se atribuyó el +8,4 KB a una pestaña o a un cambio de main: probar sin las pestañas Diseño y Tonos no compila (`seccion-abierta.tsx` las usa).
  e2e completo: no (4.22-7, arreglo de dos specs, Nivel 1: lo dirigido en escritorio)
