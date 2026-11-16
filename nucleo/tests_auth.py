"""Pruebas de los requisitos de autenticación y CRUD exigidos en DAW."""
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from nucleo.models import Publicacion


class LoginDAWTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.kaiser = User.objects.create_user(username="kaiser", password="1234")
        self.ruoye = User.objects.create_user(username="ruoye", password="1234")
        self.client = APIClient()

    def iniciar(self, usuario="kaiser", password="1234"):
        return self.client.post("/api/auth/login/", {"usuario": usuario, "password": password}, format="json")

    def test_login_y_hash(self):
        respuesta = self.iniciar()
        self.assertEqual(respuesta.status_code, 200)
        self.assertTrue(respuesta.data["token"])
        self.assertNotEqual(self.kaiser.password, "1234")
        self.assertTrue(self.kaiser.check_password("1234"))

    def test_login_invalido(self):
        respuesta = self.iniciar(password="incorrecta")
        self.assertEqual(respuesta.status_code, 401)

    def test_crud_sin_token_devuelve_401(self):
        self.assertEqual(self.client.get("/api/publicaciones/").status_code, 401)

    def test_crud_completo_y_logout(self):
        token = self.iniciar().data["token"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        creado = self.client.post(
            "/api/publicaciones/",
            {"autor": "kaiser", "tipo": "dialogo", "contenido": "Primer diálogo"},
            format="json",
        )
        self.assertEqual(creado.status_code, 201)
        pk = creado.data["id"]
        self.assertEqual(self.client.get(f"/api/publicaciones/{pk}/").status_code, 200)
        editado = self.client.patch(f"/api/publicaciones/{pk}/", {"contenido": "Editado"}, format="json")
        self.assertEqual(editado.status_code, 200)
        self.assertEqual(Publicacion.objects.get(pk=pk).contenido, "Editado")
        self.assertEqual(self.client.delete(f"/api/publicaciones/{pk}/").status_code, 204)
        self.assertEqual(self.client.get(f"/api/publicaciones/{pk}/").status_code, 404)
        self.assertEqual(self.client.post("/api/auth/logout/", {}, format="json").status_code, 200)
        self.assertEqual(self.client.get("/api/publicaciones/").status_code, 401)

    def test_no_editar_publicacion_ajena(self):
        publicacion = Publicacion.objects.create(autor="kaiser", tipo="dialogo", contenido="Privado")
        token = self.iniciar(usuario="ruoye").data["token"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        respuesta = self.client.patch(
            f"/api/publicaciones/{publicacion.pk}/", {"contenido": "Intento"}, format="json"
        )
        self.assertEqual(respuesta.status_code, 403)
        self.assertEqual(Publicacion.objects.get(pk=publicacion.pk).contenido, "Privado")

    def test_error_400_en_datos_invalidos(self):
        token = self.iniciar().data["token"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        respuesta = self.client.post(
            "/api/publicaciones/", {"autor": "kaiser", "tipo": "dialogo", "contenido": "   "}, format="json"
        )
        self.assertEqual(respuesta.status_code, 400)
        self.assertIn("contenido", respuesta.data)
