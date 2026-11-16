"""Crea cuentas DEMO solo en desarrollo. Nunca almacena la clave en el código."""

from getpass import getpass

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError

from nucleo.auth_password import AVENTUREROS


class Command(BaseCommand):
    help = "Crear las nueve cuentas locales del gremio con una clave de demostración."

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset-existing",
            action="store_true",
            help="También sustituir la contraseña de cuentas existentes (solo demo).",
        )

    def handle(self, *args, **options):
        if not settings.DEBUG:
            raise CommandError("Este comando solo puede ejecutarse con DJANGO_DEBUG=True.")

        password = getpass("Contraseña temporal para las nueve cuentas: ")
        if not password:
            raise CommandError("No se ingresó ninguna contraseña.")

        User = get_user_model()
        for username in sorted(AVENTUREROS):
            user, created = User.objects.get_or_create(username=username)
            if created or options["reset_existing"]:
                user.set_password(password)  # Crea un hash, nunca texto plano.
                user.save()
                mensaje = "creada" if created else "contraseña actualizada"
            else:
                mensaje = "ya existe (sin alterar su contraseña)"
            self.stdout.write(f"{username}: {mensaje}")

        self.stdout.write(self.style.SUCCESS("Cuentas DEMO procesadas."))
