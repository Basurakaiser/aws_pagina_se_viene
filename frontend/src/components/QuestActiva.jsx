
import { useEffect, useState } from "react";

import "./QuestActiva.css";

import { misionesApi } from "../api/client";


// =====================================================
// INVOCADORES SEGÚN EL USUARIO
// =====================================================

const INVOCADORES = {
    kaiser: "programador",

    ruoye: "dibujante",
    walalan: "escritor",
    vicho: "hibrido",
    kano: "musico",
    skere: "programador",
    firitoz: "programador",
    yurishin: "dibujante",
    bentron: "escritor",
};

function obtenerInvocador(usuario) {

    const nombre = String(usuario || "")
        .trim()
        .toLowerCase();

    const rol = INVOCADORES[nombre] || "programador";

    return `/recursos/imagenes/invocador/${rol}.png`;
}


// =====================================================
// VALIDACIÓN / NORMALIZACIÓN DE ENLACES
// =====================================================

function normalizarEnlaceDrive(valor) {

    let enlace = String(valor || "").trim();

    if (!enlace) {
        throw new Error(
            "Debes pegar un enlace de Google Drive o Google Docs."
        );
    }

    if (!/^https?:\/\//i.test(enlace)) {
        enlace = `https://${enlace}`;
    }

    let url;

    try {
        url = new URL(enlace);
    } catch {
        throw new Error(
            "El vínculo ingresado no es una URL válida."
        );
    }

    const host = url.hostname.toLowerCase();

    const hostPermitido =
        host === "drive.google.com" ||
        host === "docs.google.com";

    if (!hostPermitido) {
        throw new Error(
            "El vínculo debe pertenecer a Google Drive o Google Docs."
        );
    }

    url.protocol = "https:";

    return url.toString();
}


// =====================================================
// COMPONENTE
// =====================================================

function QuestActiva({
    cambiarPantalla,
    volverDesdeQuest,
    usuarioActivo
}) {

    const usuario = usuarioActivo;

    const [mision, setMision] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [enlaceDrive, setEnlaceDrive] = useState("");
    const [entregando, setEntregando] = useState(false);
    const [entregada, setEntregada] = useState(false);
    const [error, setError] = useState("");
    const [regresando, setRegresando] = useState(false);

    // Invocador correspondiente al aventurero
    const imagenInvocador = obtenerInvocador(usuario);


    // =====================================================
    // CARGAR MISIÓN ACTIVA DEL USUARIO
    // =====================================================

    useEffect(() => {

        let cancelado = false;

        async function cargarMision() {

            setCargando(true);
            setMision(null);
            setError("");
            setEnlaceDrive("");
            setEntregando(false);
            setEntregada(false);

            if (!usuario) {
                setError("No hay un aventurero seleccionado.");
                setCargando(false);
                return;
            }

            try {

                const datos = await misionesApi.activa(usuario);

                if (cancelado) return;

                if (!datos?.mision) {
                    setMision(null);
                    return;
                }

                setMision(datos.mision);

            } catch (error) {

                if (cancelado) return;

                console.error(
                    "Error al cargar la misión:",
                    error
                );

                setError(
                    "No se pudo conectar con el gremio."
                );

                setMision(null);

            } finally {

                if (!cancelado) {
                    setCargando(false);
                }
            }
        }

        cargarMision();

        return () => {
            cancelado = true;
        };

    }, [usuario]);


    // =====================================================
    // VÍNCULO
    // =====================================================

    const vinculoActivo =
        enlaceDrive.trim().length > 0;


    // =====================================================
    // PRECARGAR RUNAS
    // =====================================================

    useEffect(() => {

        const imagenes = [
            "/recursos/imagenes/runa.png",
            "/recursos/imagenes/runa2.png"
        ];

        imagenes.forEach((src) => {
            const imagen = new Image();
            imagen.src = src;
        });

    }, []);


    // =====================================================
    // TEXTO CIRCULAR
    // =====================================================

    const textoCircular = vinculoActivo
        ? `${enlaceDrive.trim()}  ✦  ${enlaceDrive.trim()}  ✦  `
        : "✦ VÍNCULO SIN ESTABLECER ✦ VÍNCULO SIN ESTABLECER ✦ ";


    // =====================================================
    // REGRESAR
    // =====================================================

    const regresarTaberna = () => {

        if (regresando) return;

        setRegresando(true);

        setTimeout(() => {

            if (volverDesdeQuest) {
                volverDesdeQuest();
            } else {
                cambiarPantalla("taberna");
            }

        }, 700);
    };


    // =====================================================
    // ENTREGAR QUEST
    // =====================================================

    async function entregarQuest() {

        if (
            !mision ||
            !vinculoActivo ||
            entregando ||
            entregada
        ) {
            return;
        }

        let enlaceNormalizado;

        try {

            enlaceNormalizado =
                normalizarEnlaceDrive(enlaceDrive);

        } catch (errorValidacion) {

            setError(errorValidacion.message);
            return;
        }

        const confirmar = window.confirm(
            "¿Quieres sellar este vínculo y entregar la Quest?"
        );

        if (!confirmar) return;

        try {

            setEntregando(true);
            setError("");

            await misionesApi.entregar(
                mision.id,
                {
                    enlaceDrive: enlaceNormalizado
                }
            );

            setEnlaceDrive(enlaceNormalizado);
            setEntregada(true);

            // Limpiar la referencia local tras entregar.
            localStorage.removeItem("misionActivaId");

            setTimeout(() => {

                if (volverDesdeQuest) {
                    volverDesdeQuest();
                } else {
                    cambiarPantalla("taberna");
                }

            }, 1200);

        } catch (error) {

            console.error(
                "Error al entregar:",
                error
            );

            setError(
                error.message ||
                "No se pudo entregar la Quest."
            );

            setEntregando(false);
        }
    }


    // =====================================================
    // CLASE GENERAL
    // =====================================================

    const claseQuest = `
        quest-activa
        ${regresando ? "quest-regresando-taberna" : ""}
    `;


    // =====================================================
    // CARGANDO
    // =====================================================

    if (cargando) {

        return (
            <main className={claseQuest}>

                <div className="quest-cargando">
                    Consultando el registro del gremio...
                </div>

                <div
                    className="quest-capa-transicion"
                    aria-hidden="true"
                />

            </main>
        );
    }


    // =====================================================
    // SIN MISIÓN
    // =====================================================

    if (!mision) {

        return (
            <main className={claseQuest}>

                <button
                    className="quest-boton-regresar"
                    onClick={regresarTaberna}
                    disabled={regresando}
                >
                    ← Regresar
                </button>

                <div className="quest-sin-mision">

                    <div className="quest-mensaje-sin-mision">

                        <div className="quest-icono-sin-mision">
                            ⚔
                        </div>

                        <h1>
                            No tienes una Quest activa
                        </h1>

                        <p>
                            {error
                                ? error
                                : "Ve al tablero del gremio y elige una misión."
                            }
                        </p>

                        <button
                            className="quest-boton-buscar"
                            onClick={() =>
                                cambiarPantalla("tablon")
                            }
                            disabled={regresando}
                        >
                            Ver tablero de Quests
                        </button>

                    </div>

                </div>

                <div
                    className="quest-capa-transicion"
                    aria-hidden="true"
                />

            </main>
        );
    }


    // =====================================================
    // DATOS DE LA QUEST
    // =====================================================

    const prioridadSegura = Math.max(
        0,
        Math.min(
            5,
            Number(mision.prioridad) || 0
        )
    );

    const estrellas =
        "★".repeat(prioridadSegura) +
        "☆".repeat(5 - prioridadSegura);

    const textoRoles =
        Array.isArray(mision.roles_lista) &&
        mision.roles_lista.length > 0
            ? mision.roles_lista.join(" o ")
            : "Cualquiera";

    const recompensa =
        Number(mision.recompensa_puntos) || 0;

    const numeroPergamino =
        String(mision.numero_pergamino || "1");


    // =====================================================
    // QUEST
    // =====================================================

    return (

        <main className={claseQuest}>

            <button
                className="quest-boton-regresar"
                onClick={regresarTaberna}
                disabled={regresando}
            >
                ← Regresar
            </button>


            <div className={`quest-pergamino ${numeroPergamino === "1_dragon" ? "quest-pergamino-dragon" : ""}`}>

                <img
                    src={`/recursos/imagenes/quest/${numeroPergamino}.png`}
                    alt="Pergamino de la Quest"
                    className="quest-imagen-pergamino"
                    draggable="false"
                />

                <div className="quest-datos">

                    <h4 className="quest-categoria">
                        {mision.categoria}
                    </h4>

                    <p className="quest-descripcion">
                        {mision.descripcion}
                    </p>

                    <div className="quest-datos-inferiores">

                        <div className="quest-prioridad">
                            Prioridad {estrellas}
                        </div>

                        <div className="quest-recompensa">
                            Recompensa{" "}
                            {recompensa}{" "}
                            {recompensa === 1
                                ? "punto"
                                : "puntos"}
                        </div>

                        <div className="quest-roles">
                            Exclusivo {textoRoles}
                        </div>

                    </div>

                </div>

            </div>


            {/* =========================================
                ZONA DE ENTREGA
            ========================================= */}

            <div className="quest-zona-entrega">

                <div
                    className={`quest-circulo-vinculo ${
                        vinculoActivo ? "activo" : ""
                    }`}
                >

                    <div className="quest-capas-runa">

                        <img
                            src="/recursos/imagenes/runa.png"
                            alt=""
                            className="
                                quest-imagen-circulo
                                quest-runa-base
                            "
                            draggable="false"
                        />

                        <img
                            src="/recursos/imagenes/runa2.png"
                            alt="Circuito mágico de vínculo"
                            className="
                                quest-imagen-circulo
                                quest-runa-final
                            "
                            draggable="false"
                        />

                    </div>


                    {/* TEXTO CIRCULAR */}

                    <svg
                        className="quest-texto-circular"
                        viewBox="0 0 500 500"
                        aria-hidden="true"
                    >

                        <defs>
                            <path
                                id="quest-ruta-vinculo"
                                d="
                                    M 250,250
                                    m -185,0
                                    a 185,185 0 1,1 370,0
                                    a 185,185 0 1,1 -370,0
                                "
                            />
                        </defs>

                        <text>
                            <textPath
                                href="#quest-ruta-vinculo"
                                startOffset="0%"
                            >
                                {textoCircular}
                            </textPath>
                        </text>

                    </svg>


                    {/* INPUT GOOGLE DRIVE */}

                    <input
                        type="url"
                        value={enlaceDrive}
                        onChange={(event) => {

                            setEnlaceDrive(
                                event.target.value
                            );

                            if (error) {
                                setError("");
                            }
                        }}
                        className="quest-input-vinculo"
                        placeholder="Pega aquí el vínculo de Google Drive"
                        disabled={
                            entregando ||
                            entregada ||
                            regresando
                        }
                    />

                </div>


                {/* =========================================
                    INVOCADOR DEL USUARIO
                ========================================= */}

                <div className="quest-zona-sellar">

                    <button
                        type="button"
                        className={`
                            quest-boton-invocador
                            ${vinculoActivo ? "activo" : ""}
                            ${entregando ? "entregando" : ""}
                            ${entregada ? "entregada" : ""}
                        `}
                        onClick={entregarQuest}
                        disabled={
                            !vinculoActivo ||
                            entregando ||
                            entregada ||
                            regresando
                        }
                        aria-label="Sellar y entregar Quest"
                    >

                        <img
                            src={imagenInvocador}
                            alt={`Invocador de ${usuario}`}
                            className="quest-imagen-invocador"
                            draggable="false"
                        />

                    </button>


                    <div className="quest-texto-sellar">

                        {entregada
                            ? "✦ QUEST SELLADA ✦"
                            : entregando
                                ? "SELLANDO VÍNCULO..."
                                : vinculoActivo
                                    ? "SELLAR QUEST"
                                    : "ESTABLECE EL VÍNCULO"
                        }

                    </div>

                </div>


                {error && (

                    <div className="quest-error">
                        {error}
                    </div>

                )}

            </div>


            <div
                className="quest-capa-transicion"
                aria-hidden="true"
            />

        </main>
    );
}

export default QuestActiva;