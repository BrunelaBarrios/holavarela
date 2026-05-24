# Auditoría del admin de Hola Varela

Fecha: 24 de mayo de 2026

## Diagnóstico

El admin ya cubre las operaciones centrales, pero creció por módulo: eventos, comercios, servicios, cursos, instituciones, usuarios, contactos, suscripciones, sorteos y métricas repiten patrones de navegación, estados de carga, errores, formularios y acciones. Eso hace que el panel sea más difícil de aprender y más caro de mantener.

Problemas detectados:

- `Desafíos` existía y se enlazaba desde el dashboard, pero no aparecía en el sidebar.
- Las rutas de superadmin se bloqueaban principalmente desde el cliente; ahora también se validan en middleware.
- `loginV` se reconocía como login para redirecciones, pero el shell no lo excluía del layout admin.
- El dashboard guardaba cada métrica en un estado separado, aunque llega como un solo objeto.
- La navegación tenía grupos colapsables que escondían secciones importantes y aumentaban el esfuerzo de exploración.
- Varias páginas repiten estados vacíos, loading panels, filtros, headers, pills métricas y fetch POST a APIs admin.
- Los formularios de contenido son largos y mezclan datos básicos, premium, redes, imagen y publicación en una sola superficie.
- Tablas/listados usan layouts distintos según módulo, lo que obliga al administrador a reaprender acciones similares.

## Nueva estructura propuesta

- Panel
  - Dashboard
  - Métricas
- Contenido
  - Comercios
  - Eventos
  - Servicios
  - Instituciones
  - Cursos
- Gestión
  - Contactos
  - Usuarios
  - Suscripciones
- Sistema
  - Sitio
  - Sorteos
  - Desafíos
  - Radio
  - Administradores
  - Actividad

La idea es separar gestión diaria de configuración poco frecuente. El sidebar queda plano, con grupos visibles y búsqueda local para entrar rápido por intención.

## Cambios implementados

- Se creó una fuente única de navegación en `app/admin/adminNavigation.ts`.
- Se centralizaron permisos de rutas en `app/lib/adminPermissions.ts`.
- El middleware ahora redirige admins sin rol suficiente cuando intentan entrar a rutas de superadmin.
- El shell del admin se simplificó: grupos visibles, búsqueda de secciones, descripciones cortas y corrección de `loginV`.
- El dashboard se rearmó como bandeja de trabajo: prioridades, accesos principales y sistema.
- Se agregaron componentes compartidos para headers, notices, loading, empty states, métricas, tarjetas, búsqueda y controles segmentados.
- Contactos ahora reutiliza esos componentes y muestra empty state contextual según búsqueda/filtro.
- Se extrajo `postAdminAction` para eliminar fetch/error handling duplicado en eventos, servicios y cursos.

## Próximos pasos recomendados

- Convertir formularios largos en secciones plegables o tabs: básico, contacto, premium, publicación.
- Unificar cards/listados de contenido en un componente común para acciones: editar, ocultar, destacar, duplicar, eliminar.
- Agregar búsqueda y filtros consistentes a comercios, servicios, cursos e instituciones.
- Incorporar bulk actions solo donde haya tareas repetidas reales: publicar borradores, ocultar vencidos, marcar contactos.
- Separar componentes grandes por módulo para reducir archivos de 800 a 1.000 líneas.
- Medir qué acciones se usan realmente antes de agregar nuevos accesos.
