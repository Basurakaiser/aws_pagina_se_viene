
// ==================================================
// CONFIGURACIÓN DE LA API
// ==================================================

const BASE_URL = `${
    (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000")
        .replace(/\/$/, "")
}/api`;


// ==================================================
// CSRF
// ==================================================

function obtenerCookie(nombre) {
    const cookies = document.cookie
        ? document.cookie.split(";")
        : [];

    for (const cookie of cookies) {
        const cookieLimpia = cookie.trim();

        if (cookieLimpia.startsWith(`${nombre}=`)) {
            return decodeURIComponent(
                cookieLimpia.substring(nombre.length + 1)
            );
        }
    }

    return null;
}

function obtenerCsrfToken() {
    return obtenerCookie("csrftoken");
}


// ==================================================
// PETICIONES AUTENTICADAS
// ==================================================

async function request(url, options = {}) {
    const metodo = (options.method || "GET").toUpperCase();

    const necesitaCsrf = ![
        "GET",
        "HEAD",
        "OPTIONS",
        "TRACE"
    ].includes(metodo);

    const token = sessionStorage.getItem("taberna_token");

    if (!token) {
        throw new Error(
            "Debes iniciar sesión con Google para continuar."
        );
    }

    const headers = {
        "Content-Type": "application/json",
        ...options.headers,
        Authorization: `Bearer ${token}`
    };

    if (necesitaCsrf) {
        const csrfToken = obtenerCsrfToken();

        if (csrfToken) {
            headers["X-CSRFToken"] = csrfToken;
        }
    }

    const respuesta = await fetch(`${BASE_URL}${url}`, {
        ...options,
        headers,
        credentials: "same-origin"
    });

    if (respuesta.status === 401) {
        sessionStorage.removeItem("taberna_token");

        throw new Error(
            "Tu sesión venció. Recarga la página e inicia sesión con Google nuevamente."
        );
    }

    if (respuesta.status === 204) {
        return null;
    }

    let datos = null;

    try {
        datos = await respuesta.json();
    } catch {
        datos = null;
    }

    if (!respuesta.ok) {
        const mensaje =
            datos?.error ||
            datos?.detail ||
            datos ||
            `Error del servidor: ${respuesta.status}`;

        throw new Error(
            typeof mensaje === "string"
                ? mensaje
                : JSON.stringify(mensaje)
        );
    }

    return datos;
}



 // ==================================================
 // DASHBOARD Y RANKING
 // ==================================================

 export const proyectoApi = {
     dashboard: () => request("/dashboard/"),
     ranking: () => request("/ranking/")
 };

 export const dashboardApi = {
     obtener: () => request("/dashboard/"),
     cargar: () => request("/dashboard/")
 };

 export const rankingApi = {
     obtener: () => request("/ranking/"),
     cargar: () => request("/ranking/")
 };

// ==================================================
// MISIONES
// ==================================================

export const misionesApi = {
    disponibles: () =>
        request("/mision-aleatoria/"),

    activa: (usuario) =>
        request(
            `/mision-activa/${encodeURIComponent(usuario)}/`
        ),

    tomar: (id, usuario) =>
        request(`/misiones/${id}/tomar/`, {
            method: "POST",
            body: JSON.stringify({
                usuario
            })
        }),

    entregar: (
        id,
        {
            enlaceDrive = "",
            comentario = ""
        } = {}
    ) =>
        request(`/misiones/${id}/entregar/`, {
            method: "POST",
            body: JSON.stringify({
                enlace_drive: enlaceDrive,
                comentario
            })
        })
};


// ==================================================
// MIEMBROS
// ==================================================

export const miembrosApi = {
    estadisticas: (usuario) =>
        request(
            `/miembros/${encodeURIComponent(usuario)}/estadisticas/`
        ),

    archivos: (usuario) =>
        request(
            `/miembros/${encodeURIComponent(usuario)}/archivos/`
        )
};


// ==================================================
// PUBLICACIONES
// ==================================================

export const publicacionesApi = {
    listar: () =>
        request("/publicaciones/"),

    listarPorAutor: (autor) =>
        request(
            `/publicaciones/?autor=${encodeURIComponent(autor)}`
        ),

    listarPorAutorYTipo: (autor, tipo) =>
        request(
            `/publicaciones/?autor=${encodeURIComponent(autor)}&tipo=${encodeURIComponent(tipo)}`
        ),

    crear: (publicacion) =>
        request("/publicaciones/", {
            method: "POST",
            body: JSON.stringify(publicacion)
        }),

    actualizar: (id, publicacion) =>
        request(`/publicaciones/${id}/`, {
            method: "PUT",
            body: JSON.stringify(publicacion)
        }),

    eliminar: (id) =>
        request(`/publicaciones/${id}/`, {
            method: "DELETE"
        })
};


// ==================================================
// OPCIONES DE DIÁLOGO
// ==================================================

export const opcionesDialogoApi = {
    listar: () =>
        request("/opciones-dialogo/"),

    listarPorDialogo: (dialogoId) =>
        request(
            `/opciones-dialogo/?dialogo=${encodeURIComponent(dialogoId)}`
        ),

    crear: ({
        dialogoOrigen,
        texto,
        dialogoDestino = null,
        orden = 1,
        activo = true
    }) =>
        request("/opciones-dialogo/", {
            method: "POST",
            body: JSON.stringify({
                dialogo_origen: dialogoOrigen,
                texto,
                dialogo_destino: dialogoDestino,
                orden,
                activo
            })
        }),

    actualizar: (
        id,
        {
            dialogoOrigen,
            texto,
            dialogoDestino = null,
            orden = 1,
            activo = true
        }
    ) =>
        request(`/opciones-dialogo/${id}/`, {
            method: "PUT",
            body: JSON.stringify({
                dialogo_origen: dialogoOrigen,
                texto,
                dialogo_destino: dialogoDestino,
                orden,
                activo
            })
        }),

    eliminar: (id) =>
        request(`/opciones-dialogo/${id}/`, {
            method: "DELETE"
        })
};
