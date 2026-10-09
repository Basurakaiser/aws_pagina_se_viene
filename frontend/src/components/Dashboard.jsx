import { useEffect, useState } from "react";
import "./Dashboard.css";
import { proyectoApi } from "../api/client";


const CONFIG_CATEGORIAS = {
    creador_personaje: {
        logo: "/recursos/imagenes/logos/creador_de_personajes.webp",
        color: "rojo"
    },

    creacion_lore: {
        logo: "/recursos/imagenes/logos/creacion_de_lore.webp",
        color: "morado"
    },

    juegos_casino: {
        logo: "/recursos/imagenes/logos/juegos_de_casino.webp",
        color: "amarillo"
    },

    mecanicas_jugador: {
        logo: "/recursos/imagenes/logos/mecanicas_del_jugador.webp",
        color: "azul"
    },

    npc: {
        logo: "/recursos/imagenes/logos/npc.webp",
        color: "verde"
    },

    creacion_mapa: {
        logo: "/recursos/imagenes/logos/creacion_del_mapa.webp",
        color: "naranjo"
    },

    rogue_lite: {
        logo: "/recursos/imagenes/logos/rogue_lite.webp",
        color: "magenta"
    }
};


function Dashboard() {
    const [etapa, setEtapa] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState("");


    useEffect(() => {
        let activo = true;

        const cargarDashboard = async () => {
            try {
                const datos = await proyectoApi.dashboard();

                if (!activo) {
                    return;
                }

                setEtapa(datos.etapa_activa);
                setError("");
            } catch (error) {
                console.error(
                    "Error cargando dashboard:",
                    error
                );

                if (activo) {
                    setError(
                        "No se pudo cargar el progreso."
                    );
                }
            } finally {
                if (activo) {
                    setCargando(false);
                }
            }
        };

        cargarDashboard();

        return () => {
            activo = false;
        };
    }, []);


    const limitarPorcentaje = (valor) => {
        const numero = Number(valor) || 0;

        return Math.min(
            100,
            Math.max(0, numero)
        );
    };


    const mostrarPorcentaje = (valor) => {
        const numero =
            limitarPorcentaje(valor);

        if (Number.isInteger(numero)) {
            return numero;
        }

        return Number(
            numero.toFixed(1)
        );
    };


    return (
        <div className="dashboard">

            <img
                src="/recursos/imagenes/papeldash.png"
                alt=""
                className="dashboard-papel"
                draggable="false"
            />


            <div className="dashboard-contenido">

                {cargando && (
                    <div className="dashboard-mensaje">
                        Cargando registro...
                    </div>
                )}


                {!cargando && error && (
                    <div className="dashboard-mensaje dashboard-error">
                        {error}
                    </div>
                )}


                {!cargando && !error && !etapa && (
                    <div className="dashboard-mensaje">
                        No hay una etapa activa.
                    </div>
                )}


                {!cargando && !error && etapa && (
                    <>

                        <header className="dashboard-cabecera">

                            <div className="dashboard-etapa">
                                {etapa.nombre ||
                                    `Etapa ${etapa.numero}`}
                            </div>

                            <div className="dashboard-progreso-general">
                                {mostrarPorcentaje(
                                    etapa.progreso
                                )}%
                            </div>

                        </header>


                        <div className="dashboard-linea-cabecera" />


                        <div className="dashboard-categorias">

                            {etapa.categorias.map(
                                (categoria) => {

                                    const progreso =
                                        limitarPorcentaje(
                                            categoria.progreso
                                        );

                                    const config =
                                        CONFIG_CATEGORIAS[
                                            categoria.slug
                                        ];

                                    return (
                                        <div
                                            className="dashboard-categoria"
                                            key={categoria.id}
                                        >

                                            <div className="dashboard-logo-contenedor">

                                                {config?.logo && (
                                                    <img
                                                        src={
                                                            config.logo
                                                        }
                                                        alt=""
                                                        className="dashboard-logo"
                                                        draggable="false"
                                                    />
                                                )}

                                            </div>


                                            <div className="dashboard-categoria-nombre">
                                                {
                                                    categoria.nombre
                                                }
                                            </div>


                                            <div className="dashboard-barra-categoria">

                                                <div
                                                    className={
                                                        `dashboard-barra-categoria-relleno ${
                                                            config
                                                                ? `dashboard-color-${config.color}`
                                                                : ""
                                                        }`
                                                    }
                                                    style={{
                                                        width:
                                                            `${progreso}%`
                                                    }}
                                                />

                                            </div>


                                            <div className="dashboard-categoria-datos">

                                                <span className="dashboard-categoria-porcentaje">
                                                    {
                                                        mostrarPorcentaje(
                                                            progreso
                                                        )
                                                    }%
                                                </span>

                                                <span className="dashboard-categoria-misiones">
                                                    {
                                                        categoria.cantidad_completadas
                                                    }
                                                    /
                                                    {
                                                        categoria.cantidad_misiones
                                                    }
                                                </span>

                                            </div>

                                        </div>
                                    );
                                }
                            )}

                        </div>

                    </>
                )}

            </div>

        </div>
    );
}


export default Dashboard;