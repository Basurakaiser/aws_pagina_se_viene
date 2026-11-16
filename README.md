# Taberna del Gremio — Django + React

Proyecto final de Desarrollo de Aplicaciones Web. Aplicación web de un gremio de videojuegos, desarrollada con **React + Vite** en el frontend y **Django REST Framework** en el backend. Utiliza **SQLite** para almacenar los datos.

## Funcionalidades principales

- Inicio de sesión con usuario y contraseña, validados en Django.
- Autenticación por token Bearer y cierre de sesión.
- Perfil de personaje con publicaciones y diálogos.
- CRUD de publicaciones desde React: **listar (GET), crear (POST), editar (PUT) y eliminar (DELETE)**.
- Consulta del detalle de una publicación mediante **GET**.
- Validación de contenido y permisos para impedir modificar o eliminar publicaciones de otro personaje.
- Otras funciones del gremio, como tablón de quests, estadísticas y ranking.

## Tecnologías

- **Frontend:** React, Vite y JavaScript.
- **Backend:** Python, Django y Django REST Framework.
- **Base de datos:** SQLite (`db.sqlite3`).
- **Autenticación:** Django Auth + DRF TokenAuthentication (encabezado `Authorization: Bearer <token>`).
- **CORS:** `django-cors-headers`, con orígenes locales permitidos.

## Requisitos

- Python y pip (el proyecto se ha ejecutado localmente con Python 3.12).
- Node.js y npm, en una versión compatible con el Vite instalado.
- Archivos `requirements.txt` y `frontend/package.json` presentes en el repositorio.

## Instalación y ejecución local

### 1. Backend Django

Abrir PowerShell en la carpeta principal del repositorio (donde está `manage.py`):

```powershell
py -3.12 -m venv .venv312
.\.venv312\Scripts\Activate.ps1
pip install -r requirements.txt
python manage.py migrate
```

**Solo para preparar las cuentas de demostración** (la primera vez):

```powershell
python manage.py crear_usuarios_demo
```

El comando pedirá una contraseña local para las cuentas de prueba. Se almacena como **hash**, no como texto plano. Este comando requiere que Django esté en modo de desarrollo (`DEBUG=True`). Los usuarios disponibles son: `kaiser`, `kano`, `ruoye`, `vicho`, `walalan`, `skere`, `firitoz`, `yurishin` y `bentron`.

> Si las cuentas ya existen y se necesita cambiarles la contraseña de demostración, ejecutar `python manage.py crear_usuarios_demo --reset-existing`. Esto reemplaza sus contraseñas actuales; no hacerlo sin necesidad.

Iniciar el backend:

```powershell
python manage.py runserver
```

Backend: http://127.0.0.1:8000/

### 2. Frontend React

Abrir **otra terminal** desde la carpeta principal:

```powershell
cd frontend
npm install
npm run dev
```

Frontend: http://localhost:5173/

Si es necesario configurar explícitamente la dirección del backend, crear `frontend/.env.local` con el siguiente contenido y reiniciar Vite:

```env
VITE_API_URL=http://127.0.0.1:8000
```

`client.js` utiliza esa dirección para enviar solicitudes a la API de Django. La comunicación de esta versión es **directa mediante fetch y CORS**, no depende del proxy de Vite para las publicaciones.

## API REST principal

| Método | Ruta | Función | Respuesta esperada |
|---|---|---|---|
| GET | `/api/publicaciones/` | Listar publicaciones | 200 |
| GET | `/api/publicaciones/{id}/` | Consultar una publicación | 200 |
| POST | `/api/publicaciones/` | Crear publicación | 201 |
| PUT | `/api/publicaciones/{id}/` | Actualizar publicación | 200 |
| DELETE | `/api/publicaciones/{id}/` | Eliminar publicación | 204 |
| POST | `/api/auth/login/` | Iniciar sesión | 200 |
| GET | `/api/auth/me/` | Consultar sesión | 200 |
| POST | `/api/auth/logout/` | Cerrar sesión y revocar token | 200 |

Los endpoints de publicaciones requieren un token válido. Se pueden filtrar por autor, por ejemplo: `/api/publicaciones/?autor=kano`.

## Cómo probar el CRUD

1. Abrir el frontend en `http://localhost:5173/` e iniciar sesión con una cuenta de demostración.
2. Entrar a la sección de publicaciones/diálogos del personaje.
3. Crear una publicación y comprobar que aparece en el listado.
4. Editar la publicación; el formulario debe aparecer con su contenido anterior.
5. Eliminarla y comprobar que desaparece del listado.
6. Para probar persistencia, crear otra publicación, recargar la página, detener e iniciar nuevamente los servidores y comprobar que continúa guardada.
7. Para probar autenticación, ingresar una contraseña incorrecta y comprobar el error; cerrar sesión y comprobar que las publicaciones quedan protegidas.

## Comprobaciones de Django

Desde la carpeta principal, con el entorno virtual activado:

```powershell
python manage.py check
python manage.py test nucleo.tests_auth
```

## Estructura del proyecto

```text
mi_api/                 Configuración de Django y rutas del proyecto
nucleo/                  Modelos, serializers, vistas y autenticación
frontend/src/            Interfaz React
frontend/src/api/client.js  Funciones para consumir la API
manage.py                Administración del backend
db.sqlite3               Base de datos SQLite local
```

## Notas para la evaluación

- Django debe estar ejecutándose en el puerto **8000** y React en el **5173**.
- El backend configura `CORS_ALLOWED_ORIGINS` para permitir `http://localhost:5173` y `http://127.0.0.1:5173`.
- Las cuentas de demostración y sus contraseñas están pensadas **solo para pruebas locales**. No publicar contraseñas ni tokens.
- No incluir entornos virtuales, `node_modules`, archivos `.env.local` ni credenciales en el repositorio.
