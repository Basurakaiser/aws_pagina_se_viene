# Ejecutar una sola vez con: python manage.py shell < asignar_pergaminos.py
import random
from nucleo.models import Mision

actualizadas = 0
for mision in Mision.objects.all():
    opciones = Mision.PERGAMINOS_POR_PUNTOS.get(mision.recompensa_puntos)
    if not opciones:
        print(f'Quest #{mision.pk}: puntos no admitidos ({mision.recompensa_puntos}); sin cambios')
        continue
    if str(mision.numero_pergamino) not in opciones:
        mision.numero_pergamino = random.choice(opciones)
        Mision.objects.filter(pk=mision.pk).update(numero_pergamino=mision.numero_pergamino)
        actualizadas += 1
print(f'Pergaminos asignados/actualizados: {actualizadas}')
