"""Inicio/cierre de sesión local con usuarios reales de Django."""

from django.contrib.auth import authenticate
from rest_framework import status
from .authentication import BearerTokenAuthentication
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response


AVENTUREROS = frozenset({
    "kaiser", "kano", "ruoye", "vicho", "walalan",
    "skere", "firitoz", "yurishin", "bentron",
})


@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def login_usuario(request):
    usuario = request.data.get("usuario", "")
    password = request.data.get("password", "")

    if not isinstance(usuario, str) or not isinstance(password, str):
        return Response({"error": "Usuario y contraseña deben ser texto."}, status=400)

    usuario = usuario.strip().lower()
    if not usuario or not password:
        return Response({"error": "Ingresa usuario y contraseña."}, status=400)

    cuenta = authenticate(request=request._request, username=usuario, password=password)
    if cuenta is None:
        return Response({"error": "Usuario o contraseña incorrectos."}, status=401)

    if cuenta.get_username().lower() not in AVENTUREROS:
        return Response({"error": "Cuenta no autorizada en el gremio."}, status=403)

    token, _ = Token.objects.get_or_create(user=cuenta)
    return Response({"token": token.key, "aventurero": cuenta.get_username().lower()})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def perfil_usuario(request):
    usuario = request.user.get_username().lower()
    if usuario not in AVENTUREROS:
        return Response({"error": "Cuenta no autorizada."}, status=403)
    return Response({"aventurero": usuario})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def logout_usuario(request):
    # Revocar el token del servidor: borrarlo del navegador no basta.
    if request.auth is not None:
        request.auth.delete()
    return Response({"mensaje": "Sesión cerrada correctamente."}, status=status.HTTP_200_OK)
