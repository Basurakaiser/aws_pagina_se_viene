import { useEffect, useMemo, useState } from "react";

import {

    publicacionesApi,

    opcionesDialogoApi,

} from "../api/client";



import "./MiPersonaje.css";





// Configuración provisional de los aventureros.
// Ajusta las rutas de imagen cuando tengas sus archivos definitivos.
// CAMBIA ESTE TEXTO PARA EL ENCABEZADO DEL PERGAMINO
const TITULO_PERFIL = "AVENTURERO"; // Ej: "MI PERSONAJE", "PERFIL", "AVENTURERO"

const PERSONAJES = {
    kaiser: { nombre: "Kaiser", rol: "Programador", imagen: "/recursos/imagenes/personajes/kaiser1.webp" },
    kano: { nombre: "Kano", rol: "Músico", imagen: "/recursos/imagenes/personajes/kano1.webp" },
    ruoye: { nombre: "Ruoye", rol: "Dibujante", imagen: "/recursos/imagenes/personajes/ruoye1.webp" },
    vicho: { nombre: "Vicho", rol: "Híbrido", imagen: "/recursos/imagenes/personajes/vicho1.webp" },
    walalan: { nombre: "Walalan", rol: "Escritor", imagen: "/recursos/imagenes/personajes/walalan1.webp" },
    skere: { nombre: "Martín Skerr", rol: "Programador", imagen: "/recursos/imagenes/personajes/skere1.webp" },
    firitoz: { nombre: "Firitoz", rol: "Programador", imagen: "/recursos/imagenes/personajes/firitoz1.webp" },
    yurishin: { nombre: "Yurishin", rol: "Dibujante", imagen: "/recursos/imagenes/personajes/yurishin.webp" },
    bentron: { nombre: "Bentron", rol: "Escritor", imagen: "/recursos/imagenes/personajes/bentron.webp" },
};

function crearOpcionVacia() {

    return {

        id: null,

        texto: "",

        dialogoDestino: null,

        respuestaKaiser: "",

    };

}





function MiPersonaje({

    cambiarPantalla,

    verComoMeVen,
    usuarioActivo,

}) {
    const USUARIO_ACTUAL = String(usuarioActivo || "").trim().toLowerCase();
    const personaje = PERSONAJES[USUARIO_ACTUAL] || {
        nombre: "Aventurero",
        rol: "Sin rol",
        imagen: "",
    };




    // ==================================================

    // DATOS

    // ==================================================



    const [

        publicaciones,

        setPublicaciones,

    ] = useState([]);



    const [

        cargando,

        setCargando,

    ] = useState(true);



    const [

        error,

        setError,

    ] = useState("");



    const [

        guardadoVisible,

        setGuardadoVisible,

    ] = useState(false);





    // ==================================================

    // EDITOR

    // ==================================================



    const [

        editor,

        setEditor,

    ] = useState(null);



    const [

        editando,

        setEditando,

    ] = useState(null);



    const [

        texto,

        setTexto,

    ] = useState("");



    const [

        guardando,

        setGuardando,

    ] = useState(false);





    // ==================================================

    // RAMIFICACIONES

    // ==================================================



    const [

        usarOpciones,

        setUsarOpciones,

    ] = useState(false);



    const [

        opciones,

        setOpciones,

    ] = useState([

        crearOpcionVacia(),

        crearOpcionVacia(),

    ]);





    // ==================================================

    // NAVEGACIÓN VERTICAL

    // ==================================================



    const [

        zonaInferiorVisible,

        setZonaInferiorVisible,

    ] = useState(false);





    // ==================================================

    // CARGAR

    // ==================================================



    useEffect(() => {
        setPublicaciones([]);
        setEditor(null);
        setEditando(null);
        if (USUARIO_ACTUAL) cargar();
    }, [USUARIO_ACTUAL]);





    async function cargar() {

        try {

            setCargando(true);

            setError("");



            const datos =

                await publicacionesApi

                    .listarPorAutor(

                        USUARIO_ACTUAL

                    );



            setPublicaciones(

                Array.isArray(datos)

                    ? datos

                    : []

            );

        } catch (err) {

            console.error(err);



            setError(

                "No se pudo cargar tu personaje."

            );

        } finally {

            setCargando(false);

        }

    }





    // ==================================================

    // DETECTAR SCROLL

    // ==================================================



    useEffect(() => {



        function detectarZona() {

            const contenido =

                document.getElementById(

                    "mi-contenido"

                );



            if (!contenido) {

                return;

            }



            const rect =

                contenido.getBoundingClientRect();



            setZonaInferiorVisible(

                rect.top <

                window.innerHeight * 0.55

            );

        }



        detectarZona();



        window.addEventListener(

            "scroll",

            detectarZona,

            {

                passive: true,

            }

        );



        window.addEventListener(

            "resize",

            detectarZona

        );



        return () => {

            window.removeEventListener(

                "scroll",

                detectarZona

            );



            window.removeEventListener(

                "resize",

                detectarZona

            );

        };



    }, []);





    // ==================================================

    // TODOS LOS DIÁLOGOS

    // ==================================================



    const todosLosDialogos =

        useMemo(

            () =>

                publicaciones.filter(

                    (item) =>

                        item.tipo ===

                        "dialogo"

                ),

            [publicaciones]

        );





    // ==================================================

    // ESTADOS

    // ==================================================



    const estados =

        useMemo(

            () =>

                publicaciones.filter(

                    (item) =>

                        item.tipo ===

                        "estado"

                ),

            [publicaciones]

        );





    // ==================================================

    // DETECTAR DIÁLOGOS QUE SON RAMAS

    // ==================================================



    const idsDialogosDestino =

        useMemo(() => {



            const ids =

                new Set();



            todosLosDialogos.forEach(

                (dialogo) => {



                    if (

                        !Array.isArray(

                            dialogo.opciones

                        )

                    ) {

                        return;

                    }



                    dialogo.opciones.forEach(

                        (opcion) => {



                            if (

                                opcion.dialogo_destino

                            ) {

                                ids.add(

                                    opcion.dialogo_destino

                                );

                            }



                        }

                    );



                }

            );



            return ids;



        }, [todosLosDialogos]);





    // ==================================================

    // SOLO DIÁLOGOS PRINCIPALES

    // ==================================================



    const dialogos =

        useMemo(

            () =>

                todosLosDialogos.filter(

                    (dialogo) =>

                        !idsDialogosDestino.has(

                            dialogo.id

                        )

                ),

            [

                todosLosDialogos,

                idsDialogosDestino,

            ]

        );





    // ==================================================

    // ESTADO ACTUAL

    // ==================================================



    const estadoActual =

        estados.length > 0

            ? estados[0]

            : null;





    // ==================================================

    // FRASE DE PREVIEW

    // ==================================================



    const frasePreview =

        dialogos.length > 0

            ? dialogos[0].contenido

            : "¿Necesitas algo?";





    // ==================================================

    // OPCIONES

    // ==================================================



    function resetearOpciones() {

        setUsarOpciones(false);



        setOpciones([

            crearOpcionVacia(),

            crearOpcionVacia(),

        ]);

    }





    // ==================================================

    // ABRIR NUEVO

    // ==================================================



    function abrirNuevo(tipo) {

        setEditor(tipo);

        setEditando(null);

        setTexto("");

        setError("");



        resetearOpciones();

    }





    // ==================================================

    // EDITAR

    // ==================================================



    function abrirEdicion(item) {

        setEditor(item.tipo);

        setEditando(item);



        setTexto(

            item.contenido || ""

        );



        setError("");



        if (

            item.tipo === "dialogo" &&

            Array.isArray(

                item.opciones

            ) &&

            item.opciones.length > 0

        ) {



            setUsarOpciones(true);



            const existentes =

                item.opciones

                    .slice(0, 2)

                    .map(

                        (opcion) => ({

                            id:

                                opcion.id,



                            texto:

                                opcion.texto ||

                                "",



                            dialogoDestino:

                                opcion.dialogo_destino ||

                                null,



                            respuestaKaiser:

                                opcion.dialogo_destino_contenido ||

                                "",

                        })

                    );



            while (

                existentes.length < 2

            ) {

                existentes.push(

                    crearOpcionVacia()

                );

            }



            setOpciones(

                existentes

            );



        } else {



            resetearOpciones();



        }

    }





    // ==================================================

    // CERRAR EDITOR

    // ==================================================



    function cerrarEditor() {

        setEditor(null);

        setEditando(null);

        setTexto("");

        setError("");



        resetearOpciones();

    }





    // ==================================================

    // TEXTOS DEL EDITOR

    // ==================================================



    function obtenerPregunta() {



        if (

            editor === "dialogo"

        ) {

            return "¿Qué quieres decir?";

        }



        if (

            editor === "estado"

        ) {

            return "¿Qué andas haciendo?";

        }



        return "";

    }





    function obtenerPlaceholder() {



        if (

            editor === "dialogo"

        ) {

            return (

                `Escribe algo que diría ${personaje.nombre}...`

            );

        }



        if (

            editor === "estado"

        ) {

            return (

                "Ej: peleando con Django"

            );

        }



        return "";

    }





    // ==================================================

    // CAMBIAR OPCIÓN

    // ==================================================



    function cambiarOpcion(

        indice,

        campo,

        valor

    ) {



        setOpciones(

            (anteriores) =>

                anteriores.map(

                    (

                        opcion,

                        i

                    ) =>

                        i === indice

                            ? {

                                  ...opcion,

                                  [campo]:

                                      valor,

                              }

                            : opcion

                )

        );

    }





    // ==================================================

    // ACTIVAR / DESACTIVAR RESPUESTAS

    // ==================================================



    function alternarOpciones() {



        if (usarOpciones) {



            const hayContenido =

                opciones.some(

                    (opcion) =>

                        opcion.texto.trim() ||

                        opcion.respuestaKaiser.trim()

                );



            const confirmar =

                hayContenido

                    ? window.confirm(

                          "¿Quitar las opciones de respuesta de este diálogo?"

                      )

                    : true;



            if (!confirmar) {

                return;

            }



            setUsarOpciones(

                false

            );



            return;

        }



        setUsarOpciones(

            true

        );

    }





    // ==================================================

    // VALIDAR RESPUESTAS

    // ==================================================



    function validarOpciones() {



        if (!usarOpciones) {

            return true;

        }



        const opcionesUsadas =

            opciones.filter(

                (opcion) =>

                    opcion.texto.trim() ||

                    opcion.respuestaKaiser.trim()

            );



        if (

            opcionesUsadas.length === 0

        ) {

            setError(

                "Escribe al menos una opción de respuesta."

            );



            return false;

        }



        for (

            const opcion

            of opcionesUsadas

        ) {



            if (

                !opcion.texto.trim()

            ) {

                setError(

                    "Escribe lo que podrá responder la otra persona."

                );



                return false;

            }



            if (

                !opcion.respuestaKaiser.trim()

            ) {

                setError(

                    `Escribe qué dirá ${personaje.nombre} después de esa respuesta.`

                );



                return false;

            }



        }



        return true;

    }





    // ==================================================

    // GUARDAR DIÁLOGO DESTINO

    // ==================================================



    async function guardarDestino(

        opcion

    ) {



        const datosDestino = {

            autor:

                USUARIO_ACTUAL,



            tipo:

                "dialogo",



            titulo:

                "",



            contenido:

                opcion

                    .respuestaKaiser

                    .trim(),



            activo:

                true,

        };





        if (

            opcion.dialogoDestino

        ) {



            await publicacionesApi

                .actualizar(

                    opcion.dialogoDestino,

                    datosDestino

                );



            return (

                opcion.dialogoDestino

            );

        }





        const nuevoDestino =

            await publicacionesApi

                .crear(

                    datosDestino

                );





        return nuevoDestino.id;

    }





    // ==================================================

    // GUARDAR OPCIONES

    // ==================================================



    async function guardarOpciones(

        dialogoOrigenId

    ) {



        const opcionesOriginales =

            editando?.opciones ||

            [];





        // ----------------------------------------------

        // SI QUITÓ TODAS LAS RESPUESTAS

        // ----------------------------------------------



        if (!usarOpciones) {



            for (

                const opcionOriginal

                of opcionesOriginales

            ) {



                await opcionesDialogoApi

                    .eliminar(

                        opcionOriginal.id

                    );

            }



            return;

        }





        // ----------------------------------------------

        // OPCIONES UTILIZADAS

        // ----------------------------------------------



        const opcionesUsadas =

            opciones.filter(

                (opcion) =>

                    opcion.texto.trim() &&

                    opcion.respuestaKaiser.trim()

            );





        const idsQueSiguen =

            new Set();





        for (

            let i = 0;

            i < opcionesUsadas.length;

            i++

        ) {



            const opcion =

                opcionesUsadas[i];





            const destinoId =

                await guardarDestino(

                    opcion

                );





            if (opcion.id) {



                await opcionesDialogoApi

                    .actualizar(

                        opcion.id,

                        {

                            dialogoOrigen:

                                dialogoOrigenId,



                            texto:

                                opcion.texto.trim(),



                            dialogoDestino:

                                destinoId,



                            orden:

                                i + 1,



                            activo:

                                true,

                        }

                    );



                idsQueSiguen.add(

                    opcion.id

                );



            } else {



                const nuevaOpcion =

                    await opcionesDialogoApi

                        .crear({

                            dialogoOrigen:

                                dialogoOrigenId,



                            texto:

                                opcion.texto.trim(),



                            dialogoDestino:

                                destinoId,



                            orden:

                                i + 1,



                            activo:

                                true,

                        });





                idsQueSiguen.add(

                    nuevaOpcion.id

                );

            }

        }





        // ----------------------------------------------

        // ELIMINAR OPCIONES QUE YA NO EXISTEN

        // ----------------------------------------------



        for (

            const opcionOriginal

            of opcionesOriginales

        ) {



            if (

                !idsQueSiguen.has(

                    opcionOriginal.id

                )

            ) {



                await opcionesDialogoApi

                    .eliminar(

                        opcionOriginal.id

                    );

            }

        }

    }





    // ==================================================

    // GUARDAR PUBLICACIÓN

    // ==================================================



    async function guardar() {



        if (

            !texto.trim()

        ) {



            setError(

                "Escribe algo primero."

            );



            return;

        }





        if (

            editor === "dialogo" &&

            !validarOpciones()

        ) {

            return;

        }





        try {



            setGuardando(true);

            setError("");





            const datos = {

                autor:

                    USUARIO_ACTUAL,



                tipo:

                    editor,



                titulo:

                    "",



                contenido:

                    texto.trim(),



                activo:

                    true,

            };





            let publicacionGuardada;





            if (editando) {



                publicacionGuardada =

                    await publicacionesApi

                        .actualizar(

                            editando.id,

                            datos

                        );



            } else {



                publicacionGuardada =

                    await publicacionesApi

                        .crear(

                            datos

                        );

            }





            if (

                editor === "dialogo"

            ) {



                await guardarOpciones(

                    publicacionGuardada.id

                );

            }





            cerrarEditor();



            await cargar();





            setGuardadoVisible(

                true

            );





            setTimeout(

                () =>

                    setGuardadoVisible(

                        false

                    ),

                1500

            );



        } catch (err) {



            console.error(err);



            setError(

                "No se pudo guardar."

            );



        } finally {



            setGuardando(

                false

            );

        }

    }





    // ==================================================

    // ELIMINAR

    // ==================================================



    async function quitar(

        item

    ) {



        const mensaje =

            item.tipo === "dialogo"

                ? "¿Quitar esta frase y sus opciones de respuesta?"

                : "¿Quitar esto?";





        if (

            !window.confirm(

                mensaje

            )

        ) {

            return;

        }





        try {



            setError("");





            await publicacionesApi

                .eliminar(

                    item.id

                );





            await cargar();



        } catch (err) {



            console.error(err);



            setError(

                "No se pudo eliminar."

            );

        }

    }





    // ==================================================

    // SCROLL

    // ==================================================



    function irALoMio() {



        document

            .getElementById(

                "mi-contenido"

            )

            ?.scrollIntoView({

                behavior:

                    "smooth",



                block:

                    "start",

            });

    }





    function volverAKaiser() {



        document

            .getElementById(

                "mi-kaiser-inicio"

            )

            ?.scrollIntoView({

                behavior:

                    "smooth",



                block:

                    "start",

            });

    }





    function navegarVerticalmente() {



        if (

            zonaInferiorVisible

        ) {

            volverAKaiser();

        } else {

            irALoMio();

        }

    }





    // ==================================================

    // VERME COMO NPC

    // ==================================================



    function abrirVistaNPC() {



        if (

            typeof verComoMeVen ===

            "function"

        ) {

            verComoMeVen();

            return;

        }



        // Fallback por si App.jsx todavía no

        // tiene conectada la función.

        if (

            typeof cambiarPantalla ===

            "function"

        ) {

            cambiarPantalla(

                "npc"

            );

        }

    }





    // ==================================================

    // RENDER

    // ==================================================



    return (

        <main

            id="mi-kaiser-inicio"

            className="mi-personaje mi-personaje-rpg"

        >



            <div

                className="mi-personaje-fondo"

                aria-hidden="true"

            />



            <div

                className="mi-luz-ambiente"

                aria-hidden="true"

            />





            {/* ==========================================

                VOLVER

            ========================================== */}



            <button

                className="mi-volver"

                onClick={() =>

                    cambiarPantalla(

                        "taberna"

                    )

                }

            >

                ← Volver a la taberna

            </button>





            {/* ==========================================

                HERO

            ========================================== */}



            <section className="mi-hero">



                <div className="mi-encabezado">



                    <span>

                        {TITULO_PERFIL}

                    </span>



                    <h1>

                        {personaje.nombre}

                    </h1>



                    <p>

                        {personaje.rol}

                    </p>



                </div>





                <div className="mi-vista-etiqueta">



                    <span />



                    Así estás ahora



                    <span />



                </div>





                {/* ======================================

                    PERSONAJE

                ====================================== */}



                <div className="mi-personaje-escena">



                    <div

                        className="mi-resplandor"

                        aria-hidden="true"

                    />



                    <div

                        className="mi-sombra-suelo"

                        aria-hidden="true"

                    />





                    <img

                        className="mi-kaiser"

                        src={personaje.imagen}

                        alt={personaje.nombre}

                    />





                    {/* BURBUJA */}



                    <div

                        key={

                            frasePreview

                        }

                        className="mi-burbuja"

                    >



                        <div className="mi-burbuja-nombre">

                            {personaje.nombre}
                        </div>



                        <div className="mi-burbuja-texto">



                            “



                            {

                                editor ===

                                    "dialogo" &&

                                texto.trim()

                                    ? texto

                                    : frasePreview

                            }



                            ”



                        </div>



                    </div>



                </div>





                





                {/* ======================================

                    ACCIONES

                ====================================== */}



                                <div className="mi-acciones-principales">

                    <button
                        className="mi-decir-principal"
                        onClick={() => abrirNuevo("dialogo")}
                    >
                        Agregar algo que digo
                    </button>




                    





                    <button

                        className="mi-ver-como"

                        onClick={

                            abrirVistaNPC

                        }

                    >



                        <span>

                            👁

                        </span>



                        Verme como me ven los demás



                    </button>



                </div>



            </section>





            {/* ==========================================

                MENSAJES

            ========================================== */}



            {

                guardadoVisible && (

                    <div className="mi-guardado">

                        Listo.

                    </div>

                )

            }





            {

                error && (

                    <div className="mi-error">

                        {error}

                    </div>

                )

            }





            {/* ==========================================

                EDITOR

            ========================================== */}



            {

                editor && (



                    <section className="mi-editor">



                        <div className="mi-editor-contenido">





                            <button

                                className="mi-editor-cerrar"

                                onClick={

                                    cerrarEditor

                                }

                                aria-label="Cerrar"

                            >

                                ×

                            </button>





                            {/* IDENTIDAD */}



                            <div className="mi-editor-identidad">



                                <div className="mi-editor-avatar">



                                    <img

                                        src={

                                            personaje.imagen

                                        }

                                        alt=""

                                    />



                                </div>





                                <div>



                                    <small>

                                        {personaje.nombre.toUpperCase()}
                                    </small>



                                    <h2>

                                        {

                                            obtenerPregunta()

                                        }

                                    </h2>



                                </div>



                            </div>





                            {/* PREVIEW */}



                            {

                                editor ===

                                    "dialogo" && (



                                    <div className="mi-editor-preview">



                                        <span>

                                            Vas a decir

                                        </span>



                                        <p>

                                            “

                                            {

                                                texto.trim()

                                                    ? texto

                                                    : "..."

                                            }

                                            ”

                                        </p>



                                    </div>



                                )

                            }





                            {/* TEXTO */}



                            <textarea

                                value={

                                    texto

                                }

                                onChange={

                                    (

                                        event

                                    ) =>

                                        setTexto(

                                            event

                                                .target

                                                .value

                                        )

                                }

                                placeholder={

                                    obtenerPlaceholder()

                                }

                                maxLength={

                                    600

                                }

                                autoFocus

                            />





                            {/* ==================================

                                RAMIFICACIONES

                            ================================== */}



                            {

                                editor ===

                                    "dialogo" && (



                                    <div className="mi-dialogo-ramas">





                                        <button

                                            type="button"

                                            className="mi-agregar-opciones"

                                            onClick={

                                                alternarOpciones

                                            }

                                        >



                                            {

                                                usarOpciones

                                                    ? "− Quitar opciones para responder"

                                                    : "+ Dar opciones para responder"

                                            }



                                        </button>





                                        {

                                            usarOpciones && (



                                                <div className="mi-opciones-dialogo">





                                                    <div className="mi-opciones-intro">



                                                        <strong>

                                                            ¿Qué pueden responderte?

                                                        </strong>



                                                        <p>

                                                            Cada respuesta puede llevar a una frase distinta de {personaje.nombre}.

                                                        </p>



                                                    </div>





                                                    {

                                                        opciones.map(

                                                            (

                                                                opcion,

                                                                indice

                                                            ) => (



                                                                <div

                                                                    className="mi-opcion-dialogo"

                                                                    key={

                                                                        indice

                                                                    }

                                                                >



                                                                    <div className="mi-opcion-numero">



                                                                        RESPUESTA{" "}

                                                                        {

                                                                            indice +

                                                                            1

                                                                        }



                                                                    </div>





                                                                    <label>

                                                                        La otra persona responde

                                                                    </label>





                                                                    <input

                                                                        type="text"

                                                                        value={

                                                                            opcion.texto

                                                                        }

                                                                        onChange={

                                                                            (

                                                                                event

                                                                            ) =>

                                                                                cambiarOpcion(

                                                                                    indice,

                                                                                    "texto",

                                                                                    event

                                                                                        .target

                                                                                        .value

                                                                                )

                                                                        }

                                                                        placeholder={

                                                                            indice ===

                                                                            0

                                                                                ? "Ej: Sí, ¿qué tienes?"

                                                                                : "Ej: No, solo vine a hablar."

                                                                        }

                                                                        maxLength={

                                                                            200

                                                                        }

                                                                    />





                                                                    <div className="mi-rama-flecha">

                                                                        ↓

                                                                    </div>





                                                                    <label>

                                                                        Entonces {personaje.nombre} dice

                                                                    </label>





                                                                    <textarea

                                                                        value={

                                                                            opcion.respuestaKaiser

                                                                        }

                                                                        onChange={

                                                                            (

                                                                                event

                                                                            ) =>

                                                                                cambiarOpcion(

                                                                                    indice,

                                                                                    "respuestaKaiser",

                                                                                    event

                                                                                        .target

                                                                                        .value

                                                                                )

                                                                        }

                                                                        placeholder={`Escribe la respuesta de ${personaje.nombre}...`}

                                                                        maxLength={

                                                                            600

                                                                        }

                                                                    />



                                                                </div>



                                                            )

                                                        )

                                                    }



                                                </div>



                                            )

                                        }



                                    </div>



                                )

                            }





                            {/* ==================================

                                BOTONES EDITOR

                            ================================== */}



                            <div className="mi-editor-acciones">



                                <button

                                    className="mi-editor-cancelar"

                                    onClick={

                                        cerrarEditor

                                    }

                                    disabled={

                                        guardando

                                    }

                                >

                                    Cancelar

                                </button>





                                <button

                                    className="mi-editor-guardar"

                                    onClick={

                                        guardar

                                    }

                                    disabled={

                                        guardando

                                    }

                                >



                                    {

                                        guardando

                                            ? "Guardando..."

                                            : "Guardar"

                                    }



                                </button>



                            </div>



                        </div>



                    </section>



                )

            }





            {/* ==========================================

                LO MÍO

            ========================================== */}



            <section

                id="mi-contenido"

                className="mi-contenido"

            >



                <div className="mi-contenido-titulo">



                    <span>

                        LO MÍO

                    </span>



                    <h2>

                        Lo que pueden encontrar de mí

                    </h2>



                    <p>

                        Aquí controlas lo que {personaje.nombre} dice cuando los demás hablan contigo.

                    </p>



                </div>





                {/* ======================================

                    SOLO COSAS QUE DIGO

                ====================================== */}



                <div className="mi-grid mi-grid-solo-dialogos">



                    <article className="mi-seccion mi-seccion-ancha">





                        <header className="mi-seccion-cabecera">



                            <div>



                                <span className="mi-seccion-icono">

                                    💬

                                </span>





                                <div>



                                    <small>

                                        COSAS QUE DIGO

                                    </small>



                                    <h2>

                                        Mis frases

                                    </h2>



                                </div>



                            </div>





                            



                        </header>





                        {/* CARGANDO */}



                        {

                            cargando ? (



                                <p className="mi-vacio">

                                    Cargando...

                                </p>



                            ) : dialogos.length ===

                              0 ? (



                                <p className="mi-vacio">

                                    Todavía no has agregado frases.

                                </p>



                            ) : (



                                <div className="mi-lista">



                                    {

                                        dialogos.map(

                                            (

                                                item

                                            ) => {



                                                const tieneRamas =

                                                    Array.isArray(

                                                        item.opciones

                                                    ) &&

                                                    item.opciones

                                                        .length >

                                                        0;





                                                return (



                                                    <div

                                                        className="mi-item mi-frase"

                                                        key={

                                                            item.id

                                                        }

                                                    >





                                                        <div className="mi-frase-radio">

                                                            <span />

                                                        </div>





                                                        <div className="mi-frase-contenido">



                                                            <p>

                                                                “

                                                                {

                                                                    item.contenido

                                                                }

                                                                ”

                                                            </p>





                                                            <div className="mi-frase-etiquetas">



                                                                <small>



                                                                    {

                                                                        tieneRamas

                                                                            ? "CONVERSACIÓN"

                                                                            : "FRASE"

                                                                    }



                                                                </small>





                                                                {

                                                                    tieneRamas && (



                                                                        <small className="mi-tiene-ramas">



                                                                            ⑂{" "}

                                                                            {

                                                                                item

                                                                                    .opciones

                                                                                    .length

                                                                            }{" "}

                                                                            opciones



                                                                        </small>



                                                                    )

                                                                }



                                                            </div>



                                                        </div>





                                                        <div className="mi-item-acciones">





                                                            <button

                                                                title="Editar"

                                                                onClick={() =>

                                                                    abrirEdicion(

                                                                        item

                                                                    )

                                                                }

                                                            >

                                                                ✎

                                                            </button>





                                                            <button

                                                                className="mi-quitar"

                                                                title="Quitar"

                                                                onClick={() =>

                                                                    quitar(

                                                                        item

                                                                    )

                                                                }

                                                            >

                                                                ×

                                                            </button>





                                                        </div>



                                                    </div>



                                                );

                                            }

                                        )

                                    }



                                </div>



                            )

                        }



                    </article>



                </div>



            </section>



        </main>

    );

}





export default MiPersonaje;