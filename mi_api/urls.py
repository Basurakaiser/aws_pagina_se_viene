from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from nucleo import views
from nucleo.auth_google import login_google, perfil_google


router = DefaultRouter()

router.register(
    r'publicaciones',
    views.PublicacionViewSet,
    basename='publicacion'
)

router.register(
    r'opciones-dialogo',
    views.OpcionDialogoViewSet,
    basename='opcion-dialogo'
)


urlpatterns = [
    path("api/auth/google/", login_google, name="login_google"),
    path("api/auth/me/", perfil_google, name="perfil_google"),
    # ==================================================
    # ADMIN
    # ==================================================

    path(
        'admin/',
        admin.site.urls
    ),

    # ==================================================
    # ROUTER DRF
    # ==================================================

    path(
        'api/',
        include(router.urls)
    ),

    # ==================================================
    # DASHBOARD / ETAPAS
    # ==================================================

    path(
        'api/dashboard/',
        views.dashboard_proyecto,
        name='dashboard_proyecto'
    ),

    path(
        'api/etapas/',
        views.historial_etapas,
        name='historial_etapas'
    ),

    path(
        'api/etapas/<int:numero_etapa>/',
        views.detalle_etapa,
        name='detalle_etapa'
    ),

    # ==================================================
    # RANKING
    # ==================================================

    path(
        'api/ranking/',
        views.ranking_miembros,
        name='ranking_miembros'
    ),

    # ==================================================
    # MISIONES
    # ==================================================

    path(
        'api/mision-aleatoria/',
        views.obtener_mision_aleatoria,
        name='mision_aleatoria'
    ),

    path(
        'api/mision-activa/<str:nombre_usuario>/',
        views.obtener_mision_activa_usuario,
        name='mision_activa_usuario'
    ),

    path(
        'api/misiones/<int:mision_id>/tomar/',
        views.tomar_mision,
        name='tomar_mision'
    ),

    path(
        'api/misiones/<int:mision_id>/entregar/',
        views.entregar_mision,
        name='mision_entregar'
    ),

    # ==================================================
    # MIEMBROS
    # ==================================================

    path(
        'api/miembros/<str:nombre_usuario>/estadisticas/',
        views.estadisticas_miembro,
        name='estadisticas_miembro'
    ),

    path(
        'api/miembros/<str:nombre_usuario>/archivos/',
        views.archivos_miembro,
        name='archivos_miembro'
    ),
]