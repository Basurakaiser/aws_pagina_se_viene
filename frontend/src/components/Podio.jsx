import { useEffect, useMemo, useState } from "react";
import "./Podio.css";
import { proyectoApi } from "../api/client";

const IMAGENES = {
    kaiser: "/recursos/imagenes/podio/kaiser.png",
    kano: "/recursos/imagenes/podio/kano.png",
    ruoye: "/recursos/imagenes/podio/ruoye.png",
    vicho: "/recursos/imagenes/podio/vicho.png",
    vichosky: "/recursos/imagenes/podio/vicho.png",
    walalan: "/recursos/imagenes/podio/walalan.png",
    skere: "/recursos/imagenes/podio/skere.png",
    firitoz: "/recursos/imagenes/podio/firitoz.png",
    yurishin: "/recursos/imagenes/podio/yurishin.png",
    bentron: "/recursos/imagenes/podio/bentron.png"
};

const NOMBRES = {
    kaiser: "Kaiser",
    kano: "Kano",
    ruoye: "Ruoye",
    vicho: "Vichosky",
    vichosky: "Vichosky",
    walalan: "Walalan",
    skere: "Skere",
    firitoz: "Firitoz",
    yurishin: "Yurishin",
    bentron: "Bentron"
};

const ORDEN_FALLBACK = [
    "kaiser",
    "ruoye",
    "kano",
    "walalan",
    "vicho",
    "skere",
    "firitoz",
    "yurishin",
    "bentron"
];

function Podio() {
    const [ranking, setRanking] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let activo = true;

        const cargarRanking = async () => {
            try {
                const datos = await proyectoApi.ranking();

                if (!activo) return;

                const lista = Array.isArray(datos)
                    ? datos
                    : datos.ranking || [];

                setRanking(lista);
                setError("");
            } catch (error) {
                console.error("Error cargando ranking:", error);

                if (activo) {
                    setError("No se pudo cargar el ranking.");
                }
            } finally {
                if (activo) {
                    setCargando(false);
                }
            }
        };

        cargarRanking();

        return () => {
            activo = false;
        };
    }, []);

    const participantes = useMemo(() => {
        const mapaRanking = new Map();

        ranking.forEach((persona) => {
            const id = String(
                persona.miembro ??
                persona.usuario ??
                persona.nombre ??
                ""
            )
                .trim()
                .toLowerCase();

            if (!id || !ORDEN_FALLBACK.includes(id === "vichosky" ? "vicho" : id)) return;

            const idCanonico = id === "vichosky" ? "vicho" : id;
            mapaRanking.set(idCanonico, persona);
        });

        const todos = ORDEN_FALLBACK.map((id) => {
            const datos = mapaRanking.get(id);

            return {
                id,
                nombre:
                    datos?.nombre_mostrado ??
                    datos?.nombre ??
                    NOMBRES[id],
                puntos: Number(
                    datos?.puntos ??
                    datos?.total_puntos ??
                    0
                ),
                imagen: IMAGENES[id]
            };
        });

        ranking.forEach((persona) => {
            const idOriginal = String(
                persona.miembro ??
                persona.usuario ??
                persona.nombre ??
                ""
            )
                .trim()
                .toLowerCase();

            if (!idOriginal || !ORDEN_FALLBACK.includes(idOriginal === "vichosky" ? "vicho" : idOriginal)) return;

            const id =
                idOriginal === "vichosky"
                    ? "vicho"
                    : idOriginal;

            if (
                todos.some(
                    (participante) =>
                        participante.id === id
                )
            ) {
                return;
            }

            if (!IMAGENES[id]) return;

            todos.push({
                id,
                nombre:
                    persona.nombre_mostrado ??
                    persona.nombre ??
                    NOMBRES[id] ??
                    id,
                puntos: Number(
                    persona.puntos ??
                    persona.total_puntos ??
                    0
                ),
                imagen: IMAGENES[id]
            });
        });

        return todos
            .sort((a, b) => {
                if (b.puntos !== a.puntos) {
                    return b.puntos - a.puntos;
                }

                const ia = ORDEN_FALLBACK.indexOf(a.id);
                const ib = ORDEN_FALLBACK.indexOf(b.id);
                return (ia < 0 ? Infinity : ia) - (ib < 0 ? Infinity : ib);
            })
            .map((persona, indice) => ({
                ...persona,
                posicion: indice + 1
            }));
    }, [ranking]);

    const obtenerClasePosicion = (posicion) => {
        if (posicion === 1) return "podio-puesto-1";
        if (posicion === 2) return "podio-puesto-2";
        if (posicion === 3) return "podio-puesto-3";

        // Los puestos inferiores se presentan consecutivamente en filas.
        return "podio-puesto-inferior";
    };

    return (
        <section className="podio">
            <div className="podio-contenido">
                {cargando && (
                    <div className="podio-mensaje">
                        Cargando ranking...
                    </div>
                )}

                {!cargando && error && (
                    <div className="podio-mensaje podio-error">
                        {error}
                    </div>
                )}

                {!cargando && (
                    <div className="podio-grid">
                        {participantes.map((persona) => (
                            <article
                                key={persona.id}
                                style={persona.posicion >= 4 ? {
                                    "--puesto-columna": (persona.posicion - 4) % 3,
                                    "--puesto-fila": Math.floor((persona.posicion - 4) / 3)
                                } : undefined}
                                className={`
                                    podio-tarjeta
                                    ${obtenerClasePosicion(
                                        persona.posicion
                                    )}
                                `}
                            >
                                <div className="podio-nombre">
                                    {persona.nombre}
                                </div>

                                <div className="podio-poster-contenedor">
                                    <img
                                        src={persona.imagen}
                                        alt={persona.nombre}
                                        className="podio-poster"
                                        draggable="false"
                                    />

                                    <div className="podio-medalla">
                                        {persona.posicion}
                                    </div>

                                    {persona.posicion === 1 && (
                                        <div
                                            className="podio-corona"
                                            aria-hidden="true"
                                        >
                                            ♛
                                        </div>
                                    )}
                                </div>

                                <div className="podio-puntos">
                                    {persona.puntos}
                                    <span> pts</span>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}

export default Podio;