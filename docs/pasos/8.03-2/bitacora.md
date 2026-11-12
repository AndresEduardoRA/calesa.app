## 2026-11-12 · Paso 8.03-2: categorías de las guías y legales con el editor (parte 2 de 2 del 8.03)

- **Hecho:**
  - **Reglas** (`entities/contenido/`): `categorias.ts` (orden 0..n−1, dirección, uso, motivo de no eliminar) y `legales.ts` (lectura con defensa, qué se manda,
    motivos por campo), con sus pruebas.
  - **Lectura y escritura** (`infra/contenido/`): categorías con su uso en una sola consulta acotada, las cinco escrituras (`upsert` para ordenar; «sólo sin guías» al
    eliminar) y los legales por `web_ajustes_guardar` con sólo la clave `legales`; cinco actions de categorías y `guardarLegales`, todas con el permiso antes de la base.
  - **Panel «Categorías»** (`?panel=categorias` en la pestaña «Guías»): `<ListaDeCatalogo>` con crear, renombrar, ordenar, desactivar y eliminar con confirmación por URL.
  - **Pestaña «Legales»** (`?seccion=legales`): términos y política con el mismo editor sin imágenes y un solo «Guardar».
  - Sin migración, sin `src/shared`. Decisiones en `decisiones.md` (D1–D16). Con esto el **8.03 queda completo (2 de 2)**.
- **e2e completo: no (8.03-2, Nivel 1: lo corre el CI del PR; dirigidos: configuracion-web-legales, configuracion-web-guias y configuracion-web-ajustes en escritorio)**
- **Para el carril a (coordinador):** anotar bajo la fila 8.03 de `docs/PLAN.md`: «8.03-2 hecha (categorías en `?panel=categorias` y legales en `?seccion=legales` con
  el mismo editor); 8.03 completa (2 de 2)». El paso no sigue asignado a b.
