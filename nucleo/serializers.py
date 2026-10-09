from rest_framework import serializers

from .models import (
    Etapa,
    CategoriaMision,
    Mision,
    EntregaMision,
    Publicacion,
    OpcionDialogo,
)


# ==================================================
# ENTREGAS DE MISIONES
# ==================================================

class EntregaMisionSerializer(serializers.ModelSerializer):
    class Meta:
        model = EntregaMision
        fields = [
            'id',
            'enlace_drive',
            'comentario',
            'fecha',
            'fecha_modificacion',
        ]

        read_only_fields = [
            'id',
            'fecha',
            'fecha_modificacion',
        ]


# ==================================================
# CATEGORÍAS DE MISIONES
# ==================================================

class CategoriaMisionSerializer(serializers.ModelSerializer):
    progreso = serializers.SerializerMethodField()
    cantidad_misiones = serializers.SerializerMethodField()
    cantidad_completadas = serializers.SerializerMethodField()

    class Meta:
        model = CategoriaMision
        fields = [
            'id',
            'nombre',
            'slug',
            'descripcion',
            'activa',
            'orden',
            'progreso',
            'cantidad_misiones',
            'cantidad_completadas',
        ]

        read_only_fields = [
            'id',
            'progreso',
            'cantidad_misiones',
            'cantidad_completadas',
        ]

    def get_progreso(self, obj):
        return obj.progreso()

    def get_cantidad_misiones(self, obj):
        return obj.cantidad_misiones()

    def get_cantidad_completadas(self, obj):
        return obj.cantidad_completadas()


# ==================================================
# ETAPAS
# ==================================================

class EtapaSerializer(serializers.ModelSerializer):
    progreso = serializers.SerializerMethodField()
    esta_completa = serializers.SerializerMethodField()

    categorias = serializers.SerializerMethodField()

    class Meta:
        model = Etapa
        fields = [
            'id',
            'numero',
            'nombre',
            'descripcion',
            'estado',
            'fecha_inicio',
            'fecha_finalizacion',
            'progreso',
            'esta_completa',
            'categorias',
        ]

        read_only_fields = [
            'id',
            'progreso',
            'esta_completa',
            'categorias',
        ]

    def get_progreso(self, obj):
        return obj.progreso()

    def get_esta_completa(self, obj):
        return obj.esta_completa()

    def get_categorias(self, obj):
        categorias = (
            obj.categorias
            .filter(activa=True)
            .order_by(
                'orden',
                'id'
            )
        )

        return CategoriaMisionSerializer(
            categorias,
            many=True
        ).data


# ==================================================
# MISIONES
# ==================================================

class MisionSerializer(serializers.ModelSerializer):
    categoria_nombre = serializers.CharField(
        source='categoria.nombre',
        read_only=True
    )

    categoria_slug = serializers.CharField(
        source='categoria.slug',
        read_only=True
    )

    etapa_id = serializers.IntegerField(
        source='categoria.etapa_id',
        read_only=True
    )

    etapa_numero = serializers.IntegerField(
        source='categoria.etapa.numero',
        read_only=True
    )

    asignado_a_nombre = serializers.CharField(
        source='get_asignado_a_display',
        read_only=True
    )

    estado_nombre = serializers.CharField(
        source='get_estado_display',
        read_only=True
    )

    entrega = EntregaMisionSerializer(
        read_only=True
    )

    class Meta:
        model = Mision
        fields = [
            'id',
            'categoria',
            'categoria_nombre',
            'categoria_slug',
            'etapa_id',
            'etapa_numero',
            'cuenta_para_progreso',
            'roles_permitidos',
            'asignado_a',
            'asignado_a_nombre',
            'estado',
            'estado_nombre',
            'descripcion',
            'prioridad',
            'recompensa_puntos',
            'numero_pergamino',
            'fecha_tomada',
            'fecha_entregada',
            'fecha_completada',
            'entrega',
        ]

        read_only_fields = [
            'id',
            'categoria_nombre',
            'categoria_slug',
            'etapa_id',
            'etapa_numero',
            'fecha_tomada',
            'fecha_entregada',
            'fecha_completada',
            'entrega',
        ]


# ==================================================
# OPCIONES DE DIÁLOGO - LECTURA
# ==================================================

class OpcionDialogoSerializer(serializers.ModelSerializer):
    dialogo_destino_contenido = serializers.CharField(
        source='dialogo_destino.contenido',
        read_only=True
    )

    class Meta:
        model = OpcionDialogo
        fields = [
            'id',
            'dialogo_origen',
            'texto',
            'dialogo_destino',
            'dialogo_destino_contenido',
            'orden',
            'activo',
        ]

        read_only_fields = [
            'id',
            'dialogo_origen',
        ]

    def validate_texto(self, value):
        if not value.strip():
            raise serializers.ValidationError(
                "La respuesta no puede estar vacía."
            )

        return value.strip()


# ==================================================
# PUBLICACIONES
# ==================================================

class PublicacionSerializer(serializers.ModelSerializer):
    autor_nombre = serializers.CharField(
        source='get_autor_display',
        read_only=True
    )

    tipo_nombre = serializers.CharField(
        source='get_tipo_display',
        read_only=True
    )

    opciones = OpcionDialogoSerializer(
        source='opciones_dialogo',
        many=True,
        read_only=True
    )

    class Meta:
        model = Publicacion
        fields = [
            'id',
            'autor',
            'autor_nombre',
            'tipo',
            'tipo_nombre',
            'titulo',
            'contenido',
            'activo',
            'opciones',
            'fecha',
            'fecha_modificacion',
        ]

        read_only_fields = [
            'id',
            'fecha',
            'fecha_modificacion',
        ]

    def validate_contenido(self, value):
        if not value.strip():
            raise serializers.ValidationError(
                "El contenido no puede estar vacío."
            )

        return value.strip()


# ==================================================
# OPCIONES DE DIÁLOGO - CREAR / EDITAR
# ==================================================

class OpcionDialogoCrearSerializer(serializers.ModelSerializer):
    class Meta:
        model = OpcionDialogo
        fields = [
            'id',
            'dialogo_origen',
            'texto',
            'dialogo_destino',
            'orden',
            'activo',
        ]

        read_only_fields = [
            'id',
        ]

    def validate_texto(self, value):
        if not value.strip():
            raise serializers.ValidationError(
                "La respuesta no puede estar vacía."
            )

        return value.strip()

    def validate(self, attrs):
        origen = attrs.get(
            'dialogo_origen'
        )

        destino = attrs.get(
            'dialogo_destino'
        )

        if (
            origen
            and origen.tipo != 'dialogo'
        ):
            raise serializers.ValidationError({
                'dialogo_origen':
                    'Las opciones solo pueden pertenecer a un diálogo.'
            })

        if (
            destino
            and destino.tipo != 'dialogo'
        ):
            raise serializers.ValidationError({
                'dialogo_destino':
                    'La respuesta solo puede llevar a otro diálogo.'
            })

        if (
            origen
            and destino
            and origen.id == destino.id
        ):
            raise serializers.ValidationError({
                'dialogo_destino':
                    'Un diálogo no puede llevar directamente a sí mismo.'
            })

        if (
            origen
            and destino
            and origen.autor != destino.autor
        ):
            raise serializers.ValidationError({
                'dialogo_destino':
                    'El diálogo de destino debe pertenecer al mismo personaje.'
            })

        return attrs