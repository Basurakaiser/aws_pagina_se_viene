from django.utils import timezone
from django.shortcuts import get_object_or_404
from django.db.models import Sum
from django.db import transaction
from rest_framework.exceptions import PermissionDenied, NotAuthenticated
from .auth_google import obtener_aventurero_autenticado

from rest_framework import viewsets
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from .models import (
    Etapa,
    CategoriaMision,
    Mision,
    EntregaMision,
    Publicacion,
    OpcionDialogo,
)

from .serializers import (
    EtapaSerializer,
    CategoriaMisionSerializer,
    MisionSerializer,
    PublicacionSerializer,
    OpcionDialogoCrearSerializer,
)


# Autorización basada en el token firmado por Django tras verificar Google.
# No se acepta localStorage, parámetros de URL ni el cuerpo como identidad.
def aventurero_actual(request):
    nombre = obtener_aventurero_autenticado(request)
    if not nombre:
        raise NotAuthenticated('Inicia sesión con Google para continuar.')
    return nombre


def exigir_propietario(request, nombre):
    actual = aventurero_actual(request)
    if actual != str(nombre).strip().lower():
        raise PermissionDenied('No puedes actuar en nombre de otro aventurero.')
    return actual


# ==================================================
# DASHBOARD / PROGRESO DEL PROYECTO
# ==================================================

@api_view(['GET'])
def dashboard_proyecto(request):
    aventurero_actual(request)
    etapa = (
        Etapa.objects
        .filter(estado='activa')
        .prefetch_related(
            'categorias',
            'categorias__misiones'
        )
        .order_by('numero')
        .first()
    )

    if not etapa:
        return Response({
            'etapa_activa': None,
            'mensaje': 'No hay ninguna etapa activa.'
        })

    serializer = EtapaSerializer(etapa)

    return Response({
        'etapa_activa': serializer.data
    })


# ==================================================
# HISTORIAL DE ETAPAS
# ==================================================

@api_view(['GET'])
def historial_etapas(request):
    aventurero_actual(request)
    etapas = (
        Etapa.objects
        .all()
        .prefetch_related(
            'categorias',
            'categorias__misiones'
        )
        .order_by('numero')
    )

    serializer = EtapaSerializer(
        etapas,
        many=True
    )

    return Response({
        'cantidad': etapas.count(),
        'etapas': serializer.data
    })


# ==================================================
# DETALLE DE UNA ETAPA
# ==================================================

@api_view(['GET'])
def detalle_etapa(request, numero_etapa):
    aventurero_actual(request)
    etapa = get_object_or_404(
        Etapa.objects.prefetch_related(
            'categorias',
            'categorias__misiones'
        ),
        numero=numero_etapa
    )

    serializer = EtapaSerializer(etapa)

    return Response({
        'etapa': serializer.data
    })


# Roles de los aventureros (selector temporal de personajes).
ROLES_POR_USUARIO = {
    'kaiser': 'programador',
    'lea': 'programador',
    'hisoka': 'programador',
    'ruoye': 'dibujante',
    'vicho': 'hibrido',
    'kano': 'musico',
    'walalan': 'escritor',
}


def roles_de_mision(mision):
    return {
        rol.strip().lower()
        for rol in (mision.roles_permitidos or '').split(',')
        if rol.strip()
    }


# ==================================================
# MISIÓN ALEATORIA / DISPONIBLES
# ==================================================

@api_view(['GET'])
def obtener_mision_aleatoria(request):
    aventurero_actual(request)
    usuario = aventurero_actual(request)
    rol_usuario = ROLES_POR_USUARIO.get(usuario)
    if not rol_usuario:
        return Response(
            {'error': 'Debes indicar un aventurero válido.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    misiones = (
        Mision.objects
        .filter(
            estado='disponible',
            categoria__activa=True,
            categoria__etapa__estado='activa'
        )
        .select_related(
            'categoria',
            'categoria__etapa'
        )
    )

    lista_misiones = []

    for mision in misiones:
        if rol_usuario not in roles_de_mision(mision):
            continue

        roles_lista = [
            rol.strip().capitalize()
            for rol in mision.roles_permitidos.split(',')
            if rol.strip()
        ]

        lista_misiones.append({
            'id': mision.id,
            'categoria_id': mision.categoria_id,
            'categoria': mision.categoria.nombre,
            'categoria_slug': mision.categoria.slug,
            'etapa': mision.categoria.etapa.numero,
            'roles_lista': roles_lista,
            'descripcion': mision.descripcion,
            'prioridad': mision.prioridad,
            'recompensa_puntos': mision.recompensa_puntos,
            'numero_pergamino': mision.numero_pergamino,
            'imagen_url': (
                f"/recursos/imagenes/pergaminos/"
                f"pergamino{mision.numero_pergamino}.webp"
            ),
        })

    return Response({
        'lista_misiones': lista_misiones
    })


# ==================================================
# MISIÓN ACTIVA DE UN USUARIO
# ==================================================

@api_view(['GET'])
def obtener_mision_activa_usuario(
    request,
    nombre_usuario
):
    aventurero_actual(request)
    exigir_propietario(request, nombre_usuario)
    mision = (
        Mision.objects
        .filter(
            asignado_a=nombre_usuario,
            estado='en_progreso'
        )
        .select_related(
            'categoria',
            'categoria__etapa'
        )
        .first()
    )

    if not mision:
        return Response({
            'mision': None
        })

    return Response({
        'mision': {
            'id': mision.id,
            'categoria_id': mision.categoria_id,
            'categoria': mision.categoria.nombre,
            'categoria_slug': mision.categoria.slug,
            'etapa': mision.categoria.etapa.numero,
            'descripcion': mision.descripcion,
            'prioridad': mision.prioridad,
            'recompensa_puntos': mision.recompensa_puntos,
            'numero_pergamino': mision.numero_pergamino,
            'imagen_url': (
                f"/recursos/imagenes/pergaminos/"
                f"pergamino{mision.numero_pergamino}.webp"
            ),
            'fecha_tomada': mision.fecha_tomada,
        }
    })


# ==================================================
# TOMAR MISIÓN
# ==================================================

@api_view(['POST'])
@transaction.atomic
def tomar_mision(
    request,
    mision_id
):
    # Autenticar antes de consultar la existencia de la misión.
    usuario = aventurero_actual(request)
    solicitado = str(request.data.get('usuario') or usuario).strip().lower()
    if solicitado != usuario:
        raise PermissionDenied('No puedes tomar misiones para otro aventurero.')

    mision = get_object_or_404(
        Mision.objects.select_for_update().select_related(
            'categoria',
            'categoria__etapa'
        ),
        id=mision_id
    )

    if not usuario:
        return Response(
            {
                'error': 'Falta indicar el usuario.'
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    usuarios_validos = {
        valor
        for valor, _ in Mision.MIEMBROS_CHOICES
        if valor != 'todos'
    }

    if usuario not in usuarios_validos:
        return Response(
            {
                'error': 'El usuario indicado no es válido.'
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    rol_usuario = ROLES_POR_USUARIO.get(usuario)
    if not rol_usuario:
        return Response(
            {'error': 'Este aventurero no tiene un rol configurado.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    if rol_usuario not in roles_de_mision(mision):
        return Response(
            {'error': 'Esta Quest no está permitida para tu rol.'},
            status=status.HTTP_403_FORBIDDEN
        )

    if mision.estado != 'disponible':
        return Response(
            {
                'error': 'Esta misión ya no está disponible.'
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    if not mision.categoria:
        return Response(
            {
                'error':
                    'La misión no tiene una categoría válida.'
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    if not mision.categoria.activa:
        return Response(
            {
                'error':
                    'La categoría de esta misión no está activa.'
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    if mision.categoria.etapa.estado != 'activa':
        return Response(
            {
                'error':
                    'Esta misión no pertenece a la etapa activa.'
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    ya_tiene_mision = (
        Mision.objects
        .filter(
            asignado_a=usuario,
            estado='en_progreso'
        )
        .exists()
    )

    if ya_tiene_mision:
        return Response(
            {
                'error':
                    'Ya tienes una misión en progreso.'
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    mision.asignado_a = usuario
    mision.estado = 'en_progreso'
    mision.fecha_tomada = timezone.now()

    mision.full_clean()
    mision.save()

    return Response({
        'mensaje': 'Quest tomada correctamente.',
        'mision_id': mision.id
    })


# ==================================================
# ENTREGAR MISIÓN
# ==================================================

@api_view(['POST'])
@transaction.atomic
def entregar_mision(
    request,
    mision_id
):
    usuario = aventurero_actual(request)
    mision = get_object_or_404(
        Mision.objects.select_for_update(),
        id=mision_id
    )
    if mision.asignado_a != usuario:
        raise PermissionDenied('Solo quien tomó la quest puede entregarla.')

    if mision.estado != 'en_progreso':
        return Response(
            {
                'error':
                    'La misión no está en progreso.'
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    enlace_drive = str(
        request.data.get(
            'enlace_drive',
            ''
        )
    ).strip()

    comentario = str(
        request.data.get(
            'comentario',
            ''
        )
    ).strip()

    entrega, _ = (
        EntregaMision.objects
        .update_or_create(
            mision=mision,
            defaults={
                'enlace_drive': enlace_drive,
                'comentario': comentario,
            }
        )
    )

    mision.estado = 'entregada'
    mision.fecha_entregada = timezone.now()

    mision.full_clean()
    mision.save()

    return Response({
        'mensaje': (
            'Quest entregada. '
            'Queda pendiente de revisión.'
        ),
        'entrega': {
            'id': entrega.id,
            'enlace_drive': entrega.enlace_drive,
            'comentario': entrega.comentario,
        }
    })


# ==================================================
# HISTORIAL / ARCHIVOS DE UN MIEMBRO
# ==================================================

@api_view(['GET'])
def archivos_miembro(
    request,
    nombre_usuario
):
    aventurero_actual(request)
    misiones = (
        Mision.objects
        .filter(
            asignado_a=nombre_usuario,
            estado='completada'
        )
        .select_related(
            'categoria',
            'categoria__etapa',
            'entrega'
        )
        .order_by(
            '-fecha_completada',
            '-id'
        )
    )

    serializer = MisionSerializer(
        misiones,
        many=True
    )

    return Response({
        'usuario': nombre_usuario,
        'cantidad': misiones.count(),
        'misiones': serializer.data,
    })


# ==================================================
# ESTADÍSTICAS DEL MIEMBRO
# ==================================================

@api_view(['GET'])
def estadisticas_miembro(
    request,
    nombre_usuario
):
    aventurero_actual(request)
    misiones_completadas = (
        Mision.objects
        .filter(
            asignado_a=nombre_usuario,
            estado='completada'
        )
        .select_related(
            'categoria',
            'categoria__etapa'
        )
        .order_by(
            '-fecha_completada'
        )
    )

    resultado = (
        misiones_completadas
        .aggregate(
            total=Sum(
                'recompensa_puntos'
            )
        )
    )

    puntos_totales = (
        resultado['total']
        or 0
    )

    cantidad_misiones = (
        misiones_completadas.count()
    )

    categorias = {}

    for mision in misiones_completadas:
        if not mision.categoria:
            continue

        clave = mision.categoria_id

        if clave not in categorias:
            categorias[clave] = {
                'categoria_id':
                    mision.categoria_id,

                'categoria':
                    mision.categoria.slug,

                'nombre':
                    mision.categoria.nombre,

                'etapa':
                    mision.categoria.etapa.numero,

                'cantidad': 0,
                'puntos': 0,
            }

        categorias[clave]['cantidad'] += 1

        categorias[clave]['puntos'] += (
            mision.recompensa_puntos
        )

    return Response({
        'usuario': nombre_usuario,
        'puntos_totales': puntos_totales,
        'misiones_completadas': cantidad_misiones,
        'categorias': list(
            categorias.values()
        ),
    })


# ==================================================
# RANKING GENERAL
# ==================================================

@api_view(['GET'])
def ranking_miembros(request):
    aventurero_actual(request)
    ranking = []

    for valor, nombre in Mision.MIEMBROS_CHOICES:
        if valor == 'todos':
            continue

        misiones = (
            Mision.objects
            .filter(
                asignado_a=valor,
                estado='completada'
            )
        )

        resultado = misiones.aggregate(
            total=Sum(
                'recompensa_puntos'
            )
        )

        puntos = (
            resultado['total']
            or 0
        )

        ranking.append({
            'usuario': valor,
            'nombre': nombre,
            'puntos': puntos,
            'misiones_completadas':
                misiones.count(),
        })

    ranking.sort(
        key=lambda miembro: (
            miembro['puntos'],
            miembro['misiones_completadas']
        ),
        reverse=True
    )

    for posicion, miembro in enumerate(
        ranking,
        start=1
    ):
        miembro['posicion'] = posicion

    return Response({
        'ranking': ranking
    })


# ==================================================
# PUBLICACIONES
# ==================================================

class PublicacionViewSet(
    viewsets.ModelViewSet
):
    serializer_class = (
        PublicacionSerializer
    )

    authentication_classes = []
    permission_classes = []

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        aventurero_actual(request)

    def perform_create(self, serializer):
        usuario = aventurero_actual(self.request)
        autor = self.request.data.get('autor')
        if autor and autor != usuario:
            raise PermissionDenied('No puedes publicar como otro personaje.')
        serializer.save(autor=usuario)

    def perform_update(self, serializer):
        usuario = aventurero_actual(self.request)
        if serializer.instance.autor != usuario:
            raise PermissionDenied('No puedes modificar publicaciones ajenas.')
        serializer.save(autor=usuario)

    def perform_destroy(self, instance):
        if instance.autor != aventurero_actual(self.request):
            raise PermissionDenied('No puedes borrar publicaciones ajenas.')
        instance.delete()

    def get_queryset(self):
        publicaciones = (
            Publicacion.objects
            .all()
            .prefetch_related(
                'opciones_dialogo'
            )
        )

        autor = (
            self.request
            .query_params
            .get('autor')
        )

        tipo = (
            self.request
            .query_params
            .get('tipo')
        )

        if autor:
            publicaciones = (
                publicaciones.filter(
                    autor=autor
                )
            )

        if tipo:
            publicaciones = (
                publicaciones.filter(
                    tipo=tipo
                )
            )

        return publicaciones


# ==================================================
# OPCIONES DE DIÁLOGO
# ==================================================

class OpcionDialogoViewSet(
    viewsets.ModelViewSet
):
    serializer_class = (
        OpcionDialogoCrearSerializer
    )

    authentication_classes = []
    permission_classes = []

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        aventurero_actual(request)

    def _validar_dialogos(self, origen, destino=None):
        usuario = aventurero_actual(self.request)
        if origen.autor != usuario or (destino is not None and destino.autor != usuario):
            raise PermissionDenied('Solo puedes editar diálogos de tu personaje.')

    def perform_create(self, serializer):
        origen = serializer.validated_data['dialogo_origen']
        destino = serializer.validated_data.get('dialogo_destino')
        self._validar_dialogos(origen, destino)
        serializer.save()

    def perform_update(self, serializer):
        instance = serializer.instance
        self._validar_dialogos(instance.dialogo_origen)
        origen = serializer.validated_data.get('dialogo_origen', instance.dialogo_origen)
        destino = serializer.validated_data.get('dialogo_destino', instance.dialogo_destino)
        self._validar_dialogos(origen, destino)
        serializer.save()

    def perform_destroy(self, instance):
        self._validar_dialogos(instance.dialogo_origen)
        instance.delete()

    def get_queryset(self):
        opciones = (
            OpcionDialogo.objects
            .all()
            .select_related(
                'dialogo_origen',
                'dialogo_destino'
            )
        )

        dialogo = (
            self.request
            .query_params
            .get('dialogo')
        )

        if dialogo:
            opciones = (
                opciones.filter(
                    dialogo_origen_id=dialogo
                )
            )

        return opciones