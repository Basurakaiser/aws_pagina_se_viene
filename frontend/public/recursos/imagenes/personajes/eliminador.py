from pathlib import Path

# Carpeta donde está ubicado este script
carpeta = Path(__file__).resolve().parent

eliminados = 0

for archivo in carpeta.iterdir():
    if archivo.is_file() and archivo.suffix.lower() == ".png":
        archivo.unlink()
        print(f"Eliminado: {archivo.name}")
        eliminados += 1

print(f"\nProceso terminado. Se eliminaron {eliminados} archivos PNG.")
