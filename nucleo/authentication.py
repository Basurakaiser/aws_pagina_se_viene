"""Autenticación DRF Bearer sin importar vistas/decoradores de DRF.

Este módulo puede cargarse de forma segura desde REST_FRAMEWORK.DEFAULT_AUTHENTICATION_CLASSES.
"""

from rest_framework.authentication import TokenAuthentication


class BearerTokenAuthentication(TokenAuthentication):
    """Acepta Authorization: Bearer <token> en lugar de Token <token>."""

    keyword = "Bearer"
