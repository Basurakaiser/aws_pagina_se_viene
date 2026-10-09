
import { useEffect, useState } from "react";

import "./TablonQuests.css";

import { misionesApi } from "../api/client";


function TablonQuests({ cambiarPantalla, usuarioActivo }) {

    // =====================================================
    // USUARIO SELECCIONADO EN LA ENTRADA
    // =====================================================

    const USUARIO_ACTUAL = String(usuarioActivo || "").trim().toLowerCase();

    const [misiones, setMisiones] = useState([]);

    const [misionSeleccionada, setMisionSeleccionada] = useState(null);

    const [cargando, setCargando] = useState(true);

    const [tomandoMision, setTomandoMision] = useState(false);

    const [error, setError] = useState("");
    const [reintento, setReintento] = useState(0);


    // =====================================================
    // CARGAR MISIONES
    // =====================================================

    useEffect(() => {
        let cancelado = false;
        const cargar = async () => {
            setCargando(true);
            setError("");
            setMisiones([]);
            setMisionSeleccionada(null);

            if (!USUARIO_ACTUAL) {
                setError("Selecciona un aventurero antes de abrir el tablón.");
                setCargando(false);
                return;
            }

            try {
                // El backend filtra tanto por rol como por asignación individual.
                const datos = await misionesApi.disponibles(USUARIO_ACTUAL);
                if (cancelado) return;
                const lista = Array.isArray(datos?.lista_misiones) ? datos.lista_misiones : [];
                setMisiones(lista.map((mision) => ({
                    ...mision,
                    rotacion: (Math.random() * 8) - 4
                })));
            } catch (error) {
                if (cancelado) return;
                console.error("Error al cargar Quest:", error);
                setError(error.message || "No se pudieron cargar las Quests.");
            } finally {
                if (!cancelado) setCargando(false);
            }
        };
        cargar();
        return () => { cancelado = true; };
    }, [USUARIO_ACTUAL, reintento]);


    const cargarMisiones = () => {
        // Reintenta la carga sin cambiar el usuario seleccionado.
        setReintento((valor) => valor + 1);
    };

    // =====================================================
    // SELECCIONAR MISIÓN
    // =====================================================

    const seleccionarMision = (mision) => {

        if (tomandoMision) return;

        setMisionSeleccionada(mision);
    };


    // =====================================================
    // TOMAR MISIÓN
    // =====================================================

    const tomarMision = async () => {

        if (!misionSeleccionada) return;
        if (tomandoMision) return;

        if (!USUARIO_ACTUAL) {
            alert("No hay un usuario seleccionado.");
            return;
        }

        setTomandoMision(true);

        try {

            // La misión se registra en Django
            // a nombre del usuario seleccionado.

            await misionesApi.tomar(
                misionSeleccionada.id,
                USUARIO_ACTUAL
            );

            /*
                Conservamos la clave original para que
                QuestActiva.jsx siga funcionando.

                Cuando adaptemos QuestActiva.jsx,
                podremos separar el almacenamiento
                por usuario.
            */

            localStorage.setItem(
                "misionActivaId",
                String(misionSeleccionada.id)
            );

            cambiarPantalla("questActiva");

        } catch (error) {

            console.error(
                "Error al tomar la misión:",
                error
            );

            alert(
                error.message ||
                "No se pudo conectar con el servidor."
            );

            setTomandoMision(false);
        }
    };


    // =====================================================
    // VOLVER
    // =====================================================

    const regresar = () => {

        cambiarPantalla("taberna");
    };


    // =====================================================
    // UTILIDADES
    // =====================================================

    const obtenerEstrellas = (prioridad) => {

        /*
            Si la prioridad supera 5,
            visualmente mostramos 5 estrellas.
        */

        const prioridadSegura = Math.max(
            0,
            Math.min(
                5,
                Number(prioridad) || 0
            )
        );

        return (
            "★".repeat(prioridadSegura) +
            "☆".repeat(5 - prioridadSegura)
        );
    };


    const obtenerRoles = (roles) => {

        if (
            Array.isArray(roles) &&
            roles.length > 0
        ) {
            return roles.join(" o ");
        }

        return "Cualquiera";
    };


    const obtenerImagenPergamino = (mision) => {

        /*
            Rutas originales:

            /recursos/imagenes/quest/1.png
            /recursos/imagenes/quest/2.png
            etc.
        */

        const numero =
            Number(mision?.numero_pergamino) || 1;

        return `/recursos/imagenes/quest/${numero}.png`;
    };


    // =====================================================
    // JSX
    // =====================================================

    return (

        <main className="tablon-quests">

            {/* =========================
                REGRESAR
            ========================= */}

            <button
                className="tablon-boton-regresar"
                onClick={regresar}
            >
                ← Regresar
            </button>


            {/* =========================
                TOMAR MISIÓN
            ========================= */}

            <button
                className="tablon-boton-tomar"
                onClick={tomarMision}
                disabled={
                    !misionSeleccionada ||
                    tomandoMision ||
                    !USUARIO_ACTUAL
                }
            >
                {tomandoMision
                    ? "Tomando Quest..."
                    : "Tomar misión"}
            </button>


            {/* =========================
                CONTENEDOR
            ========================= */}

            <div className="tablon-contenido">

                {/* =========================
                    CARGANDO
                ========================= */}

                {cargando && (

                    <p className="tablon-mensaje">
                        Cargando misiones...
                    </p>

                )}


                {/* =========================
                    ERROR
                ========================= */}

                {!cargando && error && (

                    <div className="tablon-error">

                        <p>{error}</p>

                        <button onClick={cargarMisiones}>
                            Intentar de nuevo
                        </button>

                    </div>

                )}


                {/* =========================
                    SIN QUESTS
                ========================= */}

                {!cargando &&
                    !error &&
                    misiones.length === 0 && (

                        <p className="tablon-mensaje">
                            No hay Quests disponibles.
                        </p>

                    )}


                {/* =========================
                    LISTA DE QUESTS
                ========================= */}

                {!cargando &&
                    !error &&
                    misiones.map((mision) => {

                        const seleccionada =
                            misionSeleccionada?.id ===
                            mision.id;

                        const estrellas =
                            obtenerEstrellas(
                                mision.prioridad
                            );

                        /*
                            El backend devuelve:
                            roles_lista
                        */

                        const roles =
                            obtenerRoles(
                                mision.roles_lista
                            );

                        /*
                            El backend devuelve:
                            recompensa_puntos
                        */

                        const recompensa =
                            Number(
                                mision.recompensa_puntos
                            ) || 0;

                        const imagenPergamino =
                            obtenerImagenPergamino(
                                mision
                            );

                        return (

                            <div
                                key={mision.id}

                                className={
                                    `tablon-pergamino ${
                                        seleccionada
                                            ? "seleccionada"
                                            : ""
                                    }`
                                }

                                style={{
                                    "--rotacion":
                                        `${mision.rotacion}deg`
                                }}

                                onClick={() =>
                                    seleccionarMision(
                                        mision
                                    )
                                }
                            >

                                {/* =========================
                                    IMAGEN PERGAMINO
                                ========================= */}

                                <img
                                    src={imagenPergamino}
                                    alt="Pergamino de Misión"
                                    className="tablon-imagen-pergamino"
                                    draggable="false"
                                />


                                {/* =========================
                                    DATOS DE LA MISIÓN
                                ========================= */}

                                <div className="tablon-datos-mision">

                                    {/* CATEGORÍA */}

                                    <div className="tablon-categoria">
                                        {mision.categoria}
                                    </div>


                                    {/* DESCRIPCIÓN */}

                                    <div className="tablon-descripcion">
                                        {mision.descripcion}
                                    </div>


                                    {/* DETALLES */}

                                    <div className="tablon-detalles">

                                        {/* PRIORIDAD */}

                                        <div className="tablon-prioridad">
                                            Prioridad{" "}
                                            {estrellas}
                                        </div>


                                        {/* RECOMPENSA */}

                                        <div className="tablon-recompensa">
                                            Recompensa{" "}
                                            {recompensa}{" "}
                                            {recompensa === 1
                                                ? "punto"
                                                : "puntos"}
                                        </div>


                                        {/* ROLES */}

                                        <div className="tablon-roles">
                                            Exclusivo{" "}
                                            {roles}
                                        </div>

                                    </div>

                                </div>

                            </div>

                        );
                    })}

            </div>

        </main>
    );
}


export default TablonQuests;
