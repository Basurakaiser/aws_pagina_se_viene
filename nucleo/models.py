from django.db import models
from django.core.exceptions import ValidationError


# ==================================================
# ETAPAS DEL PROYECTO
# ==================================================

class Etapa(models.Model):

    ESTADO_CHOICES = [
        ('pendiente', 'Pendiente'),
        ('activa', 'Activa'),
        ('completada', 'Completada'),
    ]

    numero = models.PositiveIntegerField(
        unique=True,
        verbose_name="Número de etapa"
    )

    nombre = models.CharField(
        max_length=100,
        blank=True,
        default='',
        verbose_name="Nombre"
    )

    descripcion = models.TextField(
        blank=True,
        default='',
        verbose_name="Descripción"
    )

    estado = models.CharField(
        max_length=20,
        choices=ESTADO_CHOICES,
        default='pendiente',
        verbose_name="Estado"
    )

    fecha_inicio = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Fecha de inicio"
    )

    fecha_finalizacion = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Fecha de finalización"
    )

    fecha_creacion = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Fecha de creación"
    )

    def categorias_activas(self):
        return self.categorias.filter(
            activa=True
        )

    def progreso(self):
        categorias = self.categorias_activas()

        cantidad = categorias.count()

        if cantidad == 0:
            return 0

        total = sum(
            categoria.progreso()
            for categoria in categorias
        )

        return round(
            total / cantidad,
            2
        )

    def esta_completa(self):
        return self.progreso() >= 100

    def __str__(self):
        nombre = (
            f" - {self.nombre}"
            if self.nombre
            else ""
        )

        return (
            f"Etapa {self.numero}"
            f"{nombre} "
            f"({self.get_estado_display()})"
        )

    class Meta:
        ordering = ['numero']
        verbose_name = "Etapa"
        verbose_name_plural = "Etapas"


# ==================================================
# CATEGORÍAS DE MISIONES
# ==================================================

class CategoriaMision(models.Model):

    etapa = models.ForeignKey(
        Etapa,
        on_delete=models.PROTECT,
        related_name='categorias',
        verbose_name="Etapa"
    )

    nombre = models.CharField(
        max_length=100,
        verbose_name="Nombre"
    )

    slug = models.SlugField(
        max_length=100,
        verbose_name="Identificador"
    )

    descripcion = models.TextField(
        blank=True,
        default='',
        verbose_name="Descripción"
    )

    activa = models.BooleanField(
        default=True,
        verbose_name="Activa"
    )

    orden = models.PositiveIntegerField(
        default=1,
        verbose_name="Orden"
    )

    fecha_creacion = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Fecha de creación"
    )

    def misiones_para_progreso(self):
        return self.misiones.filter(
            cuenta_para_progreso=True
        )

    def cantidad_misiones(self):
        return (
            self
            .misiones_para_progreso()
            .count()
        )

    def cantidad_completadas(self):
        return (
            self
            .misiones_para_progreso()
            .filter(
                estado='completada'
            )
            .count()
        )

    def progreso(self):
        total = self.cantidad_misiones()

        if total == 0:
            return 0

        completadas = (
            self.cantidad_completadas()
        )

        return round(
            (
                completadas /
                total
            ) * 100,
            2
        )

    def __str__(self):
        return (
            f"Etapa {self.etapa.numero} "
            f"→ {self.nombre}"
        )

    class Meta:
        ordering = [
            'etapa__numero',
            'orden',
            'id',
        ]

        constraints = [
            models.UniqueConstraint(
                fields=[
                    'etapa',
                    'slug',
                ],
                name='categoria_slug_unico_por_etapa'
            )
        ]

        verbose_name = "Categoría de misión"
        verbose_name_plural = "Categorías de misiones"


# ==================================================
# MISIONES / QUESTS
# ==================================================

class Mision(models.Model):

    ROL_CHOICES = [
        ('programador', 'Programador'),
        ('dibujante', 'Dibujante'),
        ('musico', 'Músico'),
        ('hibrido', 'Híbrido'),
        ('escritor', 'Escritor'),
    ]

    MIEMBROS_CHOICES = [
        ('kano', 'Kano'),
        ('ruoye', 'Ruoye'),
        ('vicho', 'Vicho'),
        ('lea', 'Lea'),
        ('kaiser', 'Kaiser'),
        ('walalan', 'Walalan'),
        ('hisoka', 'Hisoka'),
        ('skere', 'Skere'),
        ('firitoz', 'Firitoz'),
        ('yurishin', 'Yurishin'),
        ('bentron', 'Bentron'),
        ('todos', 'Todos / Libre'),
    ]

    ESTADO_CHOICES = [
        (
            'disponible',
            '⚔️ Disponible en Tablero'
        ),
        (
            'en_progreso',
            '⏳ En Progreso (Tomada)'
        ),
        (
            'entregada',
            '📨 Pendiente de Revisión'
        ),
        (
            'completada',
            '💎 Completada'
        ),
    ]

    categoria = models.ForeignKey(
        CategoriaMision,
        on_delete=models.PROTECT,
        related_name='misiones',
        null=True,
        blank=True,
        verbose_name="Categoría de Misión"
    )

    cuenta_para_progreso = models.BooleanField(
        default=True,
        verbose_name="Cuenta para el progreso"
    )

    roles_permitidos = models.CharField(
        max_length=200,
        default='',
        verbose_name="Roles Permitidos"
    )

    asignado_a = models.CharField(
        max_length=30,
        choices=MIEMBROS_CHOICES,
        default='todos',
        verbose_name="Asignado a"
    )

    estado = models.CharField(
        max_length=20,
        choices=ESTADO_CHOICES,
        default='disponible',
        verbose_name="Estado de la Misión"
    )

    descripcion = models.TextField(
        verbose_name="Descripción"
    )

    prioridad = models.IntegerField(
        default=1,
        verbose_name="Prioridad (Estrellas)"
    )

    recompensa_puntos = models.IntegerField(
        default=1,
        verbose_name="Puntos"
    )

    # Los puntos determinan la rareza; el diseño se sortea una sola vez.
    PERGAMINOS_POR_PUNTOS = {
        1: ('1', '2', '3', '4', '5', '6'),
        2: ('1', '2', '3', '4', '5', '6'),
        3: ('1_plata', '2_plata', '3_plata'),
        5: ('1_plata', '2_plata', '3_plata'),
        8: ('1_oro', '2_oro'),
        13: ('1_diamante',),
        21: ('1_morado',),
        34: ('1_dragon',),
    }

    PERGAMINO_CHOICES = [
        (nombre, nombre.replace('_', ' ').title())
        for nombre in (
            '1', '2', '3', '4', '5', '6',
            '1_plata', '2_plata', '3_plata',
            '1_oro', '2_oro', '1_diamante',
            '1_morado', '1_dragon',
        )
    ]

    numero_pergamino = models.CharField(
        max_length=30,
        choices=PERGAMINO_CHOICES,
        default='1',
        verbose_name="Diseño de pergamino"
    )

    def save(self, *args, **kwargs):
        import random

        opciones = self.PERGAMINOS_POR_PUNTOS.get(self.recompensa_puntos)
        if not opciones:
            raise ValidationError({
                'recompensa_puntos': 'Usa 1, 2, 3, 5, 8, 13, 21 o 34 puntos.'
            })

        # Mantener el mismo diseño mientras no cambie la recompensa.
        if self._state.adding:
            self.numero_pergamino = random.choice(opciones)
        else:
            anterior = type(self).objects.filter(pk=self.pk).values(
                'recompensa_puntos', 'numero_pergamino'
            ).first()
            if anterior and anterior['recompensa_puntos'] != self.recompensa_puntos:
                self.numero_pergamino = random.choice(opciones)
            elif str(self.numero_pergamino) not in opciones:
                self.numero_pergamino = random.choice(opciones)

        if kwargs.get('update_fields') is not None:
            kwargs['update_fields'] = set(kwargs['update_fields']) | {'numero_pergamino'}

        super().save(*args, **kwargs)

    fecha_tomada = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Fecha en que se tomó"
    )

    fecha_entregada = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Fecha de entrega"
    )

    fecha_completada = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Fecha de aprobación"
    )

    def clean(self):
        super().clean()

        if (
            self.estado == 'en_progreso'
            and self.asignado_a != 'todos'
        ):
            tiene_mision = (
                Mision.objects
                .filter(
                    asignado_a=self.asignado_a,
                    estado='en_progreso'
                )
                .exclude(
                    id=self.id
                )
                .exists()
            )

            if tiene_mision:
                raise ValidationError({
                    'asignado_a':
                        f"{self.get_asignado_a_display()} "
                        "ya tiene una misión en progreso."
                })

    def __str__(self):
        categoria = (
            self.categoria.nombre
            if self.categoria
            else "Sin categoría"
        )

        return (
            f"[{self.get_estado_display()}] "
            f"[{categoria}] "
            f"→ {self.get_asignado_a_display()}"
        )


# ==================================================
# ENTREGAS DE MISIONES
# ==================================================

class EntregaMision(models.Model):

    mision = models.OneToOneField(
        Mision,
        on_delete=models.CASCADE,
        related_name='entrega',
        verbose_name="Misión"
    )

    enlace_drive = models.URLField(
        max_length=500,
        blank=True,
        default='',
        verbose_name="Enlace de la entrega"
    )

    comentario = models.TextField(
        blank=True,
        default='',
        verbose_name="Comentario de entrega"
    )

    fecha = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Fecha de registro"
    )

    fecha_modificacion = models.DateTimeField(
        auto_now=True,
        verbose_name="Última modificación"
    )

    def clean(self):
        super().clean()

        if self.mision_id:
            if (
                self.mision.asignado_a
                == 'todos'
            ):
                raise ValidationError({
                    'mision':
                        'La misión debe haber sido tomada '
                        'por un miembro antes de registrar '
                        'una entrega.'
                })

    def __str__(self):
        return (
            f"Entrega de "
            f"{self.mision.get_asignado_a_display()} "
            f"→ Quest #{self.mision_id}"
        )

    class Meta:
        ordering = ['-fecha']
        verbose_name = "Entrega de misión"
        verbose_name_plural = "Entregas de misiones"


# ==================================================
# PROXY: ENTREGAS PENDIENTES
# ==================================================

class EntregaPendiente(Mision):

    class Meta:
        proxy = True
        verbose_name = "Entrega pendiente"
        verbose_name_plural = "Entregas pendientes"


# ==================================================
# PROXY: BAÚL
# ==================================================

class MisionCompletada(Mision):

    class Meta:
        proxy = True
        verbose_name = "Misión completada"
        verbose_name_plural = "Baúl de misiones completadas"


# ==================================================
# PUBLICACIONES DE PERSONAJES
# ==================================================

class Publicacion(models.Model):

    TIPO_CHOICES = [
        ('dialogo', '💬 Diálogo'),
        ('estado', '🟢 Estado'),
    ]

    AUTOR_CHOICES = [
        ('kano', 'Kano'),
        ('ruoye', 'Ruoye'),
        ('vicho', 'Vicho'),
        ('lea', 'Lea'),
        ('kaiser', 'Kaiser'),
        ('walalan', 'Walalan'),
        ('hisoka', 'Hisoka'),
        ('skere', 'Skere'),
        ('firitoz', 'Firitoz'),
        ('yurishin', 'Yurishin'),
        ('bentron', 'Bentron'),
    ]

    autor = models.CharField(
        max_length=30,
        choices=AUTOR_CHOICES,
        verbose_name="Personaje"
    )

    tipo = models.CharField(
        max_length=20,
        choices=TIPO_CHOICES,
        default='dialogo',
        verbose_name="Tipo"
    )

    titulo = models.CharField(
        max_length=100,
        blank=True,
        default='',
        verbose_name="Título"
    )

    contenido = models.TextField(
        verbose_name="Contenido"
    )

    activo = models.BooleanField(
        default=True,
        verbose_name="Visible"
    )

    fecha = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Fecha de publicación"
    )

    fecha_modificacion = models.DateTimeField(
        auto_now=True,
        verbose_name="Última modificación"
    )

    def __str__(self):
        return (
            f"[{self.get_tipo_display()}] "
            f"{self.get_autor_display()} → "
            f"{self.titulo or self.contenido[:40]}"
        )

    class Meta:
        ordering = ['-fecha']
        verbose_name = "Publicación de personaje"
        verbose_name_plural = "Publicaciones de personajes"


# ==================================================
# OPCIONES / RAMAS DE DIÁLOGO
# ==================================================

class OpcionDialogo(models.Model):

    dialogo_origen = models.ForeignKey(
        Publicacion,
        on_delete=models.CASCADE,
        related_name='opciones_dialogo',
        verbose_name="Diálogo que muestra esta opción"
    )

    texto = models.CharField(
        max_length=200,
        verbose_name="Texto de la respuesta"
    )

    dialogo_destino = models.ForeignKey(
        Publicacion,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='opciones_que_llegan',
        verbose_name="Diálogo al que lleva"
    )

    orden = models.PositiveIntegerField(
        default=1,
        verbose_name="Orden"
    )

    activo = models.BooleanField(
        default=True,
        verbose_name="Visible"
    )

    def clean(self):
        super().clean()

        if (
            self.dialogo_origen
            and self.dialogo_origen.tipo
            != 'dialogo'
        ):
            raise ValidationError({
                'dialogo_origen':
                    'Las opciones solo pueden pertenecer '
                    'a publicaciones de tipo diálogo.'
            })

        if (
            self.dialogo_destino
            and self.dialogo_destino.tipo
            != 'dialogo'
        ):
            raise ValidationError({
                'dialogo_destino':
                    'La respuesta solo puede llevar '
                    'a otra publicación de tipo diálogo.'
            })

        if (
            self.dialogo_origen_id
            and self.dialogo_destino_id
            and self.dialogo_origen_id
            == self.dialogo_destino_id
        ):
            raise ValidationError({
                'dialogo_destino':
                    'Un diálogo no puede apuntarse '
                    'directamente a sí mismo.'
            })

        if (
            self.dialogo_origen
            and self.dialogo_destino
            and self.dialogo_origen.autor
            != self.dialogo_destino.autor
        ):
            raise ValidationError({
                'dialogo_destino':
                    'Por ahora, una respuesta debe '
                    'llevar a otro diálogo del mismo '
                    'personaje.'
            })

    def __str__(self):
        destino = (
            self.dialogo_destino.contenido[:30]
            if self.dialogo_destino
            else "Fin"
        )

        return (
            f"{self.texto} "
            f"→ {destino}"
        )

    class Meta:
        ordering = [
            'orden',
            'id',
        ]

        verbose_name = "Opción de diálogo"
        verbose_name_plural = "Opciones de diálogo"