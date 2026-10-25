"""Autenticación con Google. Requiere google-auth."""
import json
from django.conf import settings
from django.core import signing
from django.http import JsonResponse
from django.views.decorators.http import require_GET, require_POST
from django.views.decorators.csrf import csrf_exempt
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token

AVENTUREROS = {"kaiser", "kano", "ruoye", "vicho", "walalan", "skere", "firitoz", "yurishin", "bentron"}

@csrf_exempt  # Solo este endpoint: verifica el ID token firmado de Google antes de emitir un token propio.
@require_POST
def login_google(request):
    if not settings.GOOGLE_CLIENT_ID:
        return JsonResponse({"error": "Google Login no está configurado en Django"}, status=503)
    try:
        credential = json.loads(request.body).get("credential", "")
        if not isinstance(credential, str) or len(credential) > 10000:
            raise ValueError("Credencial inválida")
        datos = id_token.verify_oauth2_token(
            credential, google_requests.Request(), settings.GOOGLE_CLIENT_ID
        )
        if datos.get("iss") not in ("accounts.google.com", "https://accounts.google.com"):
            raise ValueError("Emisor inválido")
        if datos.get("email_verified") is not True:
            return JsonResponse({"error": "Google no verificó este correo"}, status=403)
        correo = str(datos.get("email", "")).strip().lower()
        autorizados = {str(k).lower(): str(v).lower() for k, v in settings.GOOGLE_AVENTUREROS.items()}
        aventurero = autorizados.get(correo)
        if aventurero not in AVENTUREROS:
            return JsonResponse({"error": "Tu cuenta de Google no está autorizada en el gremio"}, status=403)
        token = signing.dumps({"sub": datos["sub"], "aventurero": aventurero, "correo": correo}, salt="taberna-login-v1")
        return JsonResponse({"aventurero": aventurero, "token": token})
    except (ValueError, KeyError, TypeError, json.JSONDecodeError):
        return JsonResponse({"error": "Credencial de Google inválida"}, status=401)
    except Exception:
        return JsonResponse({"error": "No se pudo verificar el inicio de sesión"}, status=401)


def obtener_aventurero_autenticado(request):
    cabecera = request.headers.get("Authorization", "")
    if not cabecera.startswith("Bearer "):
        return None
    try:
        datos = signing.loads(cabecera[7:], salt="taberna-login-v1", max_age=8 * 3600)
        correo = datos.get("correo", "").lower()
        autorizado = {str(k).lower(): str(v).lower() for k, v in settings.GOOGLE_AVENTUREROS.items()}.get(correo)
        if autorizado == datos.get("aventurero") and autorizado in AVENTUREROS:
            return autorizado
    except (signing.BadSignature, signing.SignatureExpired, ValueError, TypeError):
        pass
    return None

@require_GET
def perfil_google(request):
    aventurero = obtener_aventurero_autenticado(request)
    if not aventurero:
        return JsonResponse({"error": "Sesión no válida o vencida"}, status=401)
    return JsonResponse({"aventurero": aventurero})
