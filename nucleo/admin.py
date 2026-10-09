from django.contrib import admin
from django import forms
from django.utils import timezone
from django.utils.html import format_html

from .models import (
    Etapa,
    CategoriaMision,
    Mision,
    EntregaMision,
    EntregaPendiente,
    MisionCompletada,
)


# ==================================================
# FORMULARIO DE MISIONES
# ==================================================

class MisionAdminForm(forms.ModelForm):
    roles_permitidos = forms.MultipleChoiceField(
        choices=Mision.ROL_CHOICES,
        widget=forms.CheckboxSelectMultiple,
        label="Roles Permitidos",
        required=True,
    )

    class Meta:
        model = Mision
        fields = "__all__"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        if self.instance and self.instance.pk:
            roles_guardados = self.instance.roles_permitidos or ""

            self.initial["roles_permitidos"] = [
                rol.strip().lower()
                for rol in roles_guardados.split(",")
                if rol.strip()
            ]

    def clean_roles_permitidos(self):
        roles = self.cleaned_data["roles_permitidos"]
        return ",".join(roles)
# ==================================================
# CATEGORÍAS DENTRO DE ETAPAS
# ==================================================

class CategoriaMisionInline(admin.TabularInline):
    model = CategoriaMision
    extra = 0

    fields = (
        'nombre',
        'slug',
        'orden',
        'activa',
    )

    ordering = (
        'orden',
    )


# ==================================================
# ETAPAS
# ==================================================

@admin.register(Etapa)
class EtapaAdmin(admin.ModelAdmin):
    list_display = (
        'numero',
        'nombre',
        'estado',
        'mostrar_progreso',
        'cantidad_categorias',
        'fecha_inicio',
        'fecha_finalizacion',
    )

    list_filter = (
        'estado',
    )

    search_fields = (
        'nombre',
        'descripcion',
    )

    ordering = (
        'numero',
    )

    inlines = [
        CategoriaMisionInline
    ]

    @admin.display(
        description="Progreso"
    )
    def mostrar_progreso(self, obj):
        return f"{obj.progreso()}%"

    @admin.display(
        description="Categorías"
    )
    def cantidad_categorias(self, obj):
        return obj.categorias.filter(
            activa=True
        ).count()


# ==================================================
# CATEGORÍAS DE MISIONES
# ==================================================

@admin.register(CategoriaMision)
class CategoriaMisionAdmin(admin.ModelAdmin):
    list_display = (
        'nombre',
        'etapa',
        'orden',
        'activa',
        'mostrar_progreso',
        'mostrar_misiones',
    )

    list_filter = (
        'etapa',
        'activa',
    )

    search_fields = (
        'nombre',
        'slug',
        'descripcion',
    )

    ordering = (
        'etapa__numero',
        'orden',
    )

    prepopulated_fields = {
        'slug': (
            'nombre',
        )
    }

    @admin.display(
        description="Progreso"
    )
    def mostrar_progreso(self, obj):
        return f"{obj.progreso()}%"

    @admin.display(
        description="Quest"
    )
    def mostrar_misiones(self, obj):
        return (
            f"{obj.cantidad_completadas()} / "
            f"{obj.cantidad_misiones()}"
        )


# ==================================================
# MISIONES NORMALES
# ==================================================

@admin.register(Mision)
class MisionAdmin(admin.ModelAdmin):
    form = MisionAdminForm

    list_display = (
        'descripcion_corta',
        'categoria',
        'mostrar_etapa',
        'asignado_a',
        'estado',
        'prioridad',
        'recompensa_puntos',
        'cuenta_para_progreso',
    )

    list_filter = (
        'estado',
        'categoria__etapa',
        'categoria',
        'asignado_a',
        'prioridad',
        'cuenta_para_progreso',
    )

    search_fields = (
        'descripcion',
        'asignado_a',
        'categoria__nombre',
    )

    list_select_related = (
        'categoria',
        'categoria__etapa',
    )

    def get_queryset(self, request):
        queryset = super().get_queryset(
            request
        )

        return queryset.exclude(
            estado__in=[
                'entregada',
                'completada'
            ]
        )

    @admin.display(
        description="Descripción"
    )
    def descripcion_corta(self, obj):
        if len(obj.descripcion) > 60:
            return (
                obj.descripcion[:60]
                + "..."
            )

        return obj.descripcion

    @admin.display(
        description="Etapa"
    )
    def mostrar_etapa(self, obj):
        if not obj.categoria:
            return "-"

        return (
            f"Etapa "
            f"{obj.categoria.etapa.numero}"
        )


# ==================================================
# ENTREGA INLINE
# ==================================================

class EntregaMisionInline(admin.StackedInline):
    model = EntregaMision
    extra = 0
    max_num = 1
    can_delete = False

    fields = (
        'enlace_drive',
        'comentario',
        'fecha',
        'fecha_modificacion',
    )

    readonly_fields = (
        'enlace_drive',
        'comentario',
        'fecha',
        'fecha_modificacion',
    )

    verbose_name = "Entrega de la Quest"
    verbose_name_plural = "📦 Entrega de la Quest"

    def has_add_permission(
        self,
        request,
        obj=None
    ):
        return False


# ==================================================
# ENTREGAS PENDIENTES
# ==================================================

@admin.register(EntregaPendiente)
class EntregaPendienteAdmin(admin.ModelAdmin):
    list_display = (
        'descripcion_corta',
        'asignado_a',
        'categoria',
        'recompensa_puntos',
        'mostrar_enlace_entrega',
        'fecha_tomada',
        'fecha_entregada',
    )

    list_filter = (
        'asignado_a',
        'categoria__etapa',
        'categoria',
        'fecha_entregada',
    )

    search_fields = (
        'descripcion',
        'asignado_a',
        'categoria__nombre',
        'entrega__enlace_drive',
        'entrega__comentario',
    )

    list_select_related = (
        'categoria',
        'categoria__etapa',
        'entrega',
    )

    readonly_fields = (
        'mostrar_entrega_completa',
    )

    inlines = [
        EntregaMisionInline
    ]

    actions = [
        'aprobar_misiones'
    ]

    def get_queryset(self, request):
        return (
            super()
            .get_queryset(request)
            .filter(
                estado='entregada'
            )
            .select_related(
                'categoria',
                'categoria__etapa',
                'entrega',
            )
        )

    @admin.display(
        description="Descripción"
    )
    def descripcion_corta(self, obj):
        if len(obj.descripcion) > 60:
            return (
                obj.descripcion[:60]
                + "..."
            )

        return obj.descripcion

    @admin.display(
        description="🔗 Entrega"
    )
    def mostrar_enlace_entrega(
        self,
        obj
    ):
        try:
            entrega = obj.entrega
        except EntregaMision.DoesNotExist:
            return "⚠ Sin entrega registrada"

        enlace = (
            entrega.enlace_drive or ""
        ).strip()

        if not enlace:
            return "⚠ Sin enlace"

        return format_html(
            '<a href="{}" '
            'target="_blank" '
            'rel="noopener noreferrer">'
            '🔗 Abrir entrega'
            '</a>',
            enlace
        )

    @admin.display(
        description="Información de la entrega"
    )
    def mostrar_entrega_completa(
        self,
        obj
    ):
        if not obj:
            return "-"

        try:
            entrega = obj.entrega
        except EntregaMision.DoesNotExist:
            return format_html(
                '<strong>'
                '⚠ Esta Quest no tiene una '
                'entrega registrada.'
                '</strong>'
            )

        enlace = (
            entrega.enlace_drive or ""
        ).strip()

        comentario = (
            entrega.comentario or ""
        ).strip()

        if enlace:
            enlace_html = format_html(
                '<a href="{}" '
                'target="_blank" '
                'rel="noopener noreferrer">'
                '{}'
                '</a>',
                enlace,
                enlace
            )
        else:
            enlace_html = "Sin enlace"

        if not comentario:
            comentario = "Sin comentario"

        return format_html(
            '<div style="line-height:1.8;">'
            '<strong>Enlace:</strong> {}'
            '<br>'
            '<strong>Comentario:</strong> {}'
            '<br>'
            '<strong>Registrada:</strong> {}'
            '<br>'
            '<strong>Última modificación:</strong> {}'
            '</div>',
            enlace_html,
            comentario,
            entrega.fecha,
            entrega.fecha_modificacion,
        )

    @admin.action(
        description="💎 Aprobar misiones seleccionadas"
    )
    def aprobar_misiones(
        self,
        request,
        queryset
    ):
        cantidad = 0

        for mision in queryset:
            if mision.estado != 'entregada':
                continue

            mision.estado = 'completada'
            mision.fecha_completada = (
                timezone.now()
            )

            mision.save(
                update_fields=[
                    'estado',
                    'fecha_completada',
                ]
            )

            cantidad += 1

        self.message_user(
            request,
            (
                f"{cantidad} Quest"
                f"{'s' if cantidad != 1 else ''} "
                "aprobada"
                f"{'s' if cantidad != 1 else ''} "
                "correctamente."
            )
        )


# ==================================================
# BAÚL DE MISIONES COMPLETADAS
# ==================================================

@admin.register(MisionCompletada)
class MisionCompletadaAdmin(admin.ModelAdmin):
    list_display = (
        'descripcion_corta',
        'asignado_a',
        'categoria',
        'mostrar_etapa',
        'recompensa_puntos',
        'prioridad',
        'mostrar_enlace_entrega',
        'fecha_tomada',
        'fecha_entregada',
        'fecha_completada',
    )

    list_filter = (
        'asignado_a',
        'categoria__etapa',
        'categoria',
        'prioridad',
        'fecha_completada',
    )

    search_fields = (
        'descripcion',
        'asignado_a',
        'categoria__nombre',
        'entrega__enlace_drive',
        'entrega__comentario',
    )

    ordering = (
        '-fecha_completada',
    )

    list_select_related = (
        'categoria',
        'categoria__etapa',
        'entrega',
    )

    readonly_fields = (
        'mostrar_entrega_completa',
    )

    inlines = [
        EntregaMisionInline
    ]

    def get_queryset(self, request):
        return (
            super()
            .get_queryset(request)
            .filter(
                estado='completada'
            )
            .select_related(
                'categoria',
                'categoria__etapa',
                'entrega',
            )
        )

    @admin.display(
        description="Descripción"
    )
    def descripcion_corta(self, obj):
        if len(obj.descripcion) > 60:
            return (
                obj.descripcion[:60]
                + "..."
            )

        return obj.descripcion

    @admin.display(
        description="Etapa"
    )
    def mostrar_etapa(self, obj):
        if not obj.categoria:
            return "-"

        return (
            f"Etapa "
            f"{obj.categoria.etapa.numero}"
        )

    @admin.display(
        description="🔗 Entrega"
    )
    def mostrar_enlace_entrega(
        self,
        obj
    ):
        try:
            entrega = obj.entrega
        except EntregaMision.DoesNotExist:
            return "—"

        enlace = (
            entrega.enlace_drive or ""
        ).strip()

        if not enlace:
            return "—"

        return format_html(
            '<a href="{}" '
            'target="_blank" '
            'rel="noopener noreferrer">'
            '🔗 Abrir entrega'
            '</a>',
            enlace
        )

    @admin.display(
        description="Información de la entrega"
    )
    def mostrar_entrega_completa(
        self,
        obj
    ):
        if not obj:
            return "-"

        try:
            entrega = obj.entrega
        except EntregaMision.DoesNotExist:
            return format_html(
                '<strong>'
                'Esta Quest es antigua y no tiene '
                'una entrega registrada.'
                '</strong>'
            )

        enlace = (
            entrega.enlace_drive or ""
        ).strip()

        comentario = (
            entrega.comentario or ""
        ).strip()

        if enlace:
            enlace_html = format_html(
                '<a href="{}" '
                'target="_blank" '
                'rel="noopener noreferrer">'
                '{}'
                '</a>',
                enlace,
                enlace
            )
        else:
            enlace_html = "Sin enlace"

        if not comentario:
            comentario = "Sin comentario"

        return format_html(
            '<div style="line-height:1.8;">'
            '<strong>Enlace:</strong> {}'
            '<br>'
            '<strong>Comentario:</strong> {}'
            '<br>'
            '<strong>Registrada:</strong> {}'
            '<br>'
            '<strong>Última modificación:</strong> {}'
            '</div>',
            enlace_html,
            comentario,
            entrega.fecha,
            entrega.fecha_modificacion,
        )