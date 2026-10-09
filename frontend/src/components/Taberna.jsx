import { useEffect, useRef, useState } from "react";



import "./Taberna.css";



import Dashboard from "./Dashboard";

import Podio from "./Podio";





function Taberna({

    cambiarPantalla,

    abrirNPC,

    salaInicial = 1,

    setSalaGuardada,

    regresandoDesdeQuest = false,

    terminarRegresoQuest,
    usuarioActivo = "kaiser"

}) {

    const usuarioActual = String(usuarioActivo || "").trim().toLowerCase();

    const [saliendo, setSaliendo] = useState(false);

    const [yendoQuest, setYendoQuest] = useState(false);

    const [npcDestino, setNpcDestino] = useState(null);

    const [salaActual, setSalaActual] = useState(salaInicial);

    const [direccionSala, setDireccionSala] = useState(null);

    const [faseSala, setFaseSala] = useState(null);



    const tabernaRef = useRef(null);

    const dialogosPrecargadosRef = useRef(new Map());

    const frameCamaraRef = useRef(null);



    const posicionMouseRef = useRef({

        x: 0,

        y: 0

    });



    const MOVIMIENTO_HORIZONTAL = -150;

    const MOVIMIENTO_VERTICAL = -70;



    const yendoNPC = npcDestino !== null;

    const cambiandoSala = faseSala !== null;



    const bloqueado =

        saliendo ||

        yendoQuest ||

        yendoNPC ||

        cambiandoSala ||

        regresandoDesdeQuest;





    /* =====================================================

       PRECARGA GENERAL

       ===================================================== */



    useEffect(() => {

        const rutas = [

            "/recursos/imagenes/taberna1.webp",

            "/recursos/imagenes/taberna2.webp",

            "/recursos/imagenes/taberna3.png",

            "/recursos/imagenes/papeldash.png",



            "/recursos/imagenes/podio/hisoka.png",

            "/recursos/imagenes/podio/kaiser.png",

            "/recursos/imagenes/podio/kano.png",

            "/recursos/imagenes/podio/lea.png",

            "/recursos/imagenes/podio/ruoye.png",

            "/recursos/imagenes/podio/vichosky.png",

            "/recursos/imagenes/podio/walalan.png"

        ];



        const imagenesPrecargadas = rutas.map((ruta) => {

            const imagen = new Image();



            imagen.src = ruta;



            if (imagen.decode) {

                imagen.decode().catch(() => {});

            }



            return imagen;

        });



        return () => {

            dialogosPrecargadosRef.current.clear();



            if (frameCamaraRef.current !== null) {

                cancelAnimationFrame(frameCamaraRef.current);

                frameCamaraRef.current = null;

            }

        };

    }, []);





    /* =====================================================

       REGRESO DESDE QUEST

       ===================================================== */



    useEffect(() => {

        if (!regresandoDesdeQuest) {

            return;

        }



        if (tabernaRef.current) {

            tabernaRef.current.style.setProperty(

                "--mouse-x",

                "0px"

            );



            tabernaRef.current.style.setProperty(

                "--mouse-y",

                "0px"

            );

        }



        const temporizador = setTimeout(() => {

            terminarRegresoQuest?.();

        }, 760);



        return () => {

            clearTimeout(temporizador);

        };

    }, [

        regresandoDesdeQuest,

        terminarRegresoQuest

    ]);





    /* =====================================================

       CARGADOR DE IMÁGENES

       ===================================================== */



    const cargarImagen = (src) => {

        return new Promise((resolve) => {

            const imagen = new Image();



            let terminada = false;



            const terminar = async () => {

                if (terminada) {

                    return;

                }



                terminada = true;



                try {

                    if (imagen.decode) {

                        await imagen.decode();

                    }

                } catch {

                    // Si decode falla no bloqueamos la transición.

                }



                resolve(imagen);

            };



            imagen.onload = terminar;

            imagen.onerror = terminar;

            imagen.src = src;



            if (imagen.complete) {

                terminar();

            }

        });

    };





    /* =====================================================

       PRECARGAR QUEST

       ===================================================== */



    const precargarQuest = async () => {

        const imagenes = [

            "/recursos/imagenes/runa.png",

            "/recursos/imagenes/runa2.png",

            `/recursos/imagenes/invocador/${({ kaiser: "programador", lea: "programador", hisoka: "programador", ruoye: "dibujante", walalan: "escritor", vicho: "hibrido", kano: "musico" })[usuarioActual] || "programador"}.png`

        ];



        try {

                const respuesta = await fetch(
                    `${(import.meta.env.VITE_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "")}/api/mision-activa/${encodeURIComponent(usuarioActual)}/`
                );



            if (respuesta.ok) {

                const datos = await respuesta.json();



                if (

                    datos.tiene_mision &&

                    datos.numero_pergamino

                ) {

                    imagenes.push(

                        `/recursos/imagenes/quest/${datos.numero_pergamino}.png`

                    );

                }

            }

        } catch (error) {

            console.warn(

                "No se pudo consultar la Quest durante la precarga:",

                error

            );

        }



        await Promise.all(

            imagenes.map((src) => cargarImagen(src))

        );

    };





    /* =====================================================

       PRECARGAR NPC

       ===================================================== */



    const precargarDialogoNPC = (idPersonaje) => {

        if (

            dialogosPrecargadosRef.current.has(

                idPersonaje

            )

        ) {

            return;

        }



        const imagen = new Image();



        imagen.src =

            `/recursos/imagenes/personajes/${idPersonaje}2.webp`;



        dialogosPrecargadosRef.current.set(

            idPersonaje,

            imagen

        );



        if (imagen.decode) {

            imagen.decode().catch(() => {});

        }

    };





    /* =====================================================

       CÁMARA

       ===================================================== */



    const actualizarCamara = () => {

        frameCamaraRef.current = null;



        if (!tabernaRef.current) {

            return;

        }



        const posicionX =

            posicionMouseRef.current.x /

            window.innerWidth;



        const posicionY =

            posicionMouseRef.current.y /

            window.innerHeight;



        const normalX =

            (posicionX - 0.5) * 2;



        const normalY =

            (posicionY - 0.5) * 2;



        const movimientoX =

            normalX * MOVIMIENTO_HORIZONTAL;



        const movimientoY =

            normalY * MOVIMIENTO_VERTICAL;



        tabernaRef.current.style.setProperty(

            "--mouse-x",

            `${movimientoX}px`

        );



        tabernaRef.current.style.setProperty(

            "--mouse-y",

            `${movimientoY}px`

        );

    };





    const moverCamara = (event) => {

        if (!tabernaRef.current || bloqueado) {

            return;

        }



        posicionMouseRef.current.x =

            event.clientX;



        posicionMouseRef.current.y =

            event.clientY;



        if (frameCamaraRef.current !== null) {

            return;

        }



        frameCamaraRef.current =

            requestAnimationFrame(

                actualizarCamara

            );

    };





    const cancelarFrameCamara = () => {

        if (frameCamaraRef.current === null) {

            return;

        }



        cancelAnimationFrame(

            frameCamaraRef.current

        );



        frameCamaraRef.current = null;

    };





    const centrarCamara = () => {

        if (!tabernaRef.current || bloqueado) {

            return;

        }



        cancelarFrameCamara();



        tabernaRef.current.style.setProperty(

            "--mouse-x",

            "0px"

        );



        tabernaRef.current.style.setProperty(

            "--mouse-y",

            "0px"

        );

    };





    const resetearCamara = () => {

        if (!tabernaRef.current) {

            return;

        }



        cancelarFrameCamara();



        tabernaRef.current.style.setProperty(

            "--mouse-x",

            "0px"

        );



        tabernaRef.current.style.setProperty(

            "--mouse-y",

            "0px"

        );

    };





    /* =====================================================

       CAMBIO DE SALA

       ===================================================== */



    const cambiarSala = (

        nuevaSala,

        direccion

    ) => {

        if (

            bloqueado ||

            nuevaSala === salaActual

        ) {

            return;

        }



        resetearCamara();



        setDireccionSala(direccion);

        setFaseSala("saliendo");



        setTimeout(() => {

            setSalaActual(nuevaSala);



            setSalaGuardada?.(nuevaSala);



            setFaseSala("entrando");

        }, 300);



        setTimeout(() => {

            setFaseSala(null);

            setDireccionSala(null);

        }, 650);

    };





    const irDerecha = () => {

        if (salaActual === 3) {

            cambiarSala(1, "derecha");



            return;

        }



        if (salaActual === 1) {

            cambiarSala(2, "derecha");

        }

    };





    const irIzquierda = () => {

        if (salaActual === 2) {

            cambiarSala(1, "izquierda");



            return;

        }



        if (salaActual === 1) {

            cambiarSala(3, "izquierda");

        }

    };





    /* =====================================================

       VOLVER AL INICIO

       ===================================================== */



    const volverInicio = () => {

        if (bloqueado) {

            return;

        }



        resetearCamara();



        setSaliendo(true);



        setTimeout(() => {

            cambiarPantalla("entrada");

        }, 850);

    };





    /* =====================================================

       GREMIO

       ===================================================== */



    const abrirGremio = () => {

        if (bloqueado) {

            return;

        }



        console.log(

            "Abrir estado del gremio"

        );

    };





    /* =====================================================

       ABRIR QUEST

       ===================================================== */



    const abrirQuest = async () => {

        if (bloqueado) {

            return;

        }



        resetearCamara();



        setYendoQuest(true);



        const cargaQuest = precargarQuest();



        await new Promise((resolve) => {

            setTimeout(resolve, 760);

        });



        await cargaQuest;



        await new Promise((resolve) => {

            setTimeout(resolve, 250);

        });



        cambiarPantalla("questActiva");

    };





    /* =====================================================

       TABLÓN

       ===================================================== */



    const abrirTablon = () => {

        if (bloqueado) {

            return;

        }



        resetearCamara();



        cambiarPantalla("tablon");

    };





    /* =====================================================

       HABLAR CON NPC

       ===================================================== */



    const hablarConNPC = (

        idPersonaje

    ) => {

        if (bloqueado || idPersonaje === usuarioActual) {

            return;

        }



        setSalaGuardada?.(salaActual);



        precargarDialogoNPC(idPersonaje);



        resetearCamara();



        setNpcDestino(idPersonaje);



        setTimeout(() => {

            abrirNPC(

                idPersonaje,

                salaActual

            );

        }, 650);

    };





    /* =====================================================

       IMAGEN DE SALA

       ===================================================== */



    const imagenesSala = {

        1: "/recursos/imagenes/taberna1.webp",

        2: "/recursos/imagenes/taberna2.webp",

        3: "/recursos/imagenes/taberna3.png"

    };



    const imagenSala =

        imagenesSala[salaActual] ||

        imagenesSala[1];





    /* =====================================================

       CLASES

       ===================================================== */



    const claseTaberna = `

        taberna

        taberna-sala-${salaActual}

        ${saliendo ? "taberna-saliendo" : ""}

        ${yendoQuest ? "taberna-yendo-quest" : ""}

        ${regresandoDesdeQuest ? "taberna-volviendo-quest" : ""}

        ${yendoNPC ? "taberna-yendo-npc" : ""}

        ${npcDestino ? `taberna-yendo-${npcDestino}` : ""}

        ${direccionSala ? `taberna-direccion-${direccionSala}` : ""}

        ${faseSala ? `taberna-cambio-${faseSala}` : ""}

    `;





    /* =====================================================

       NPC INTERNO

       ===================================================== */



    const NPCInterno = ({

        id,

        nombre

    }) => id === usuarioActual ? null : (

        <div

            className={

                `taberna-npc taberna-npc-${id}`

            }

            onMouseEnter={() =>

                precargarDialogoNPC(id)

            }

        >

            <img

                src={

                    `/recursos/imagenes/personajes/${id}1.webp`

                }

                alt={nombre}

                className="taberna-npc-imagen"

                draggable="false"

            />



            <div className="taberna-npc-interaccion">

                <button

                    type="button"

                    className="taberna-npc-hablar"

                    onMouseEnter={() =>

                        precargarDialogoNPC(id)

                    }

                    onFocus={() =>

                        precargarDialogoNPC(id)

                    }

                    onClick={() =>

                        hablarConNPC(id)

                    }

                    disabled={bloqueado}

                >

                    <span className="taberna-npc-icono">

                        💬

                    </span>



                    Hablarle

                </button>

            </div>

        </div>

    );





    /* =====================================================

       HTML

       ===================================================== */



    return (

        <div

            ref={tabernaRef}

            className={claseTaberna}

            onMouseMove={moverCamara}

            onMouseLeave={centrarCamara}

        >

            <div className="taberna-escenario">

                <div

                    className="taberna-fondo"

                    style={{

                        backgroundImage:

                            `url("${imagenSala}")`

                    }}

                />



                {salaActual === 1 && (

                    <>

                        <NPCInterno

                            id="kaiser"

                            nombre="Kaiser"

                        />



                        <NPCInterno

                            id="ruoye"

                            nombre="Ruoye"

                        />



                        <NPCInterno

                            id="lea"

                            nombre="Lea"

                        />



                        <div className="menu-gremio">

                            <img

                                src="/recursos/imagenes/caja_dialogo.png"

                                alt="Menú del gremio"

                                className="imagen-menu-gremio"

                                draggable="false"

                            />



                            <button

                                type="button"

                                className="boton-menu boton-gremio"

                                onClick={abrirGremio}

                                aria-label="Ver estado del gremio"

                                disabled={bloqueado}

                            />



                            <button

                                type="button"

                                className="boton-menu boton-quest"

                                onClick={abrirQuest}

                                aria-label="Ver Quest activa"

                                disabled={bloqueado}

                            />



                            <button

                                type="button"

                                className="boton-menu boton-tablon"

                                onClick={abrirTablon}

                                aria-label="Ver tablón de Quests"

                                disabled={bloqueado}

                            />

                        </div>

                    </>

                )}



                {salaActual === 2 && (

                    <div className="taberna-sala2-contenido">

                        <NPCInterno

                            id="hisoka"

                            nombre="Hisoka"

                        />



                        <NPCInterno

                            id="kano"

                            nombre="Kano"

                        />



                        <NPCInterno

                            id="walalan"

                            nombre="Walalan"

                        />



                        <NPCInterno

                            id="vicho"

                            nombre="Vicho"

                        />

                    </div>

                )}



                {salaActual === 3 && (

                    <div className="taberna-sala3-contenido">

                        <Podio />

                        <Dashboard />

                    </div>

                )}

            </div>



            {(salaActual === 1 || salaActual === 3) && (

                <div className="taberna-borde taberna-borde-derecho">

                    <div className="taberna-borde-luz" />



                    <button

                        type="button"

                        className="taberna-flecha taberna-flecha-derecha"

                        onClick={irDerecha}

                        disabled={bloqueado}

                        aria-label={

                            salaActual === 3

                                ? "Volver a la sala principal"

                                : "Ir a la segunda sala"

                        }

                    >

                        ›

                    </button>

                </div>

            )}



            {(salaActual === 1 || salaActual === 2) && (

                <div className="taberna-borde taberna-borde-izquierdo">

                    <div className="taberna-borde-luz" />



                    <button

                        type="button"

                        className="taberna-flecha taberna-flecha-izquierda"

                        onClick={irIzquierda}

                        disabled={bloqueado}

                        aria-label={

                            salaActual === 1

                                ? "Ir a la sala del gremio"

                                : "Volver a la sala principal"

                        }

                    >

                        ‹

                    </button>

                </div>

            )}



            <button

                type="button"

                className="boton-inicio"

                onClick={volverInicio}

                disabled={bloqueado}

            >

                ← Volver al inicio

            </button>



            <div

                className="taberna-transicion-sala"

                aria-hidden="true"

            />



            <div

                className="taberna-transicion-mesa"

                aria-hidden="true"

            />



            <div

                className="taberna-transicion-npc"

                aria-hidden="true"

            />

        </div>

    );

}



export default Taberna;