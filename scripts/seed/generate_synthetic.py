"""
Genera datos sintéticos para Infra.Coop.
Uso: python generate_synthetic.py [--upload]

Genera:
  - 150 datasets sintéticos (DS-S001+)
  - 15 normativas sintéticas (NM-S001+)
  - 500 preguntas sintéticas (2024-W01 a 2026-W16, tendencia creciente)

Output: scripts/seed/output/
"""
import argparse
import json
import os
import random
from datetime import datetime, timedelta
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent.parent / '.env')

OUTPUT_DIR = Path(__file__).parent / 'output'
OUTPUT_DIR.mkdir(exist_ok=True)

random.seed(42)

PAISES = ['BRA', 'PER', 'URY', 'BOL', 'PRY', 'MEX', 'ECU', 'ARG', 'COL', 'CHL']
PAISES_SIN_COBERTURA = ['BRA', 'PER', 'URY', 'BOL', 'PRY']
AGENDAS_POOL = ['Ag. Género', 'Ag. Datos', 'Ag. Tecnológica']

SUBTEMAS_NUEVOS = [
    'trabajo no remunerado', 'economía del cuidado', 'migración femenina',
    'datos abiertos gubernamentales', 'trata de personas', 'interseccionalidad',
    'violencia digital', 'brecha salarial', 'mujeres en STEM',
    'participación política', 'salud mental y género', 'femicidio',
]

FUENTES_SINTETICAS = {
    'BRA': ['IBGE', 'Ministério da Mulher', 'DataSUS', 'IPEA'],
    'PER': ['INEI', 'Ministerio de la Mujer Perú', 'MIDIS'],
    'URY': ['INE Uruguay', 'INMUJERES Uruguay', 'OPP'],
    'BOL': ['INE Bolivia', 'Ministerio de Justicia Bolivia', 'UDAPE'],
    'PRY': ['DGEEC', 'Ministerio de la Mujer Paraguay', 'STP'],
    'MEX': ['INEGI', 'CONAPO', 'IMSS', 'INMUJERES'],
    'ECU': ['INEC', 'Consejo Nacional para la Igualdad', 'SENESCYT'],
    'ARG': ['INDEC', 'MMGyD', 'CONICET', 'Ministerio de Salud ARG'],
    'COL': ['DANE', 'Consejería Presidencial para la Equidad de la Mujer'],
    'CHL': ['INE Chile', 'SernamEG', 'Ministerio de Ciencias Chile'],
}

FORMATOS = ['CSV', 'XLSX', 'JSON', 'API', 'GeoJSON', 'CSV y XLSX', 'API REST']
FRECUENCIAS = ['Anual', 'Bienal', 'Quinquenal', 'Mensual', 'Trimestral', 'Irregular']
DESAGREGACIONES = ['Municipal', 'Estatal/Provincial', 'Nacional', 'Sin información', 'Regional']
CALIDADES = ['Completa', 'Parcial', 'Nula']

PREGUNTAS_POOL = [
    'datos sobre violencia digital contra mujeres en plataformas sociales',
    'estadísticas de acoso en línea por género',
    'información sobre ciberviolencia y género',
    'datos gobierno abierto violencia digital mujeres',
    'registros de grooming y explotación sexual digital niñas',
    'encuesta violencia género ecuador actualizada',
    'datos violencia intrafamiliar ecuador 2023 2024',
    'estadísticas femicidio ecuador por provincia',
    'datos línea 144 argentina violencia género',
    'registros llamadas asistencia victimas argentina',
    'estadísticas refugios violencia género argentina',
    'regulación inteligencia artificial perspectiva género',
    'datos sesgo algorítmico sistemas IA y mujeres',
    'marcos normativos IA y derechos de las mujeres',
    'ley inteligencia artificial con enfoque género latinoamérica',
    'brecha digital género por municipio',
    'acceso internet mujeres zonas rurales desagregado',
    'datos conectividad digital femenina nivel provincial',
    'salud reproductiva datos estadísticas',
    'mortalidad materna por región',
    'participación política mujeres datos',
    'femicidio estadísticas por año y país',
    'brecha salarial datos oficiales',
    'trabajo no remunerado encuesta tiempo uso',
    'mujeres ciencia tecnología estadísticas',
    'datos interseccionalidad etnia género',
    'encuesta uso tiempo cuidados no remunerados',
    'datos migrantes mujeres latinoamérica',
    'trata de personas estadísticas regionales',
    'aborto legal datos acceso servicios',
    'violencia obstétrica registros oficiales',
    'datos pobreza jefatura hogar femenina',
    'empleo informal mujeres estadísticas',
    'datos educación género egreso universidad',
]

NORMATIVAS_SINTETICAS = [
    {'id': 'NM-S001', 'nombre': 'Lei Maria da Penha (Lei 11.340/2006)',
     'organismo_emisor': 'Congresso Nacional Brasil', 'tipo': 'Ley nacional',
     'pais_alcance': 'Brasil', 'anio_adopcion': 2006, 'articulo_numeral': 'Art. 26',
     'obligacion_datos': 'Obliga al poder público a producir estadísticas sobre violencia doméstica desagregadas por región',
     'agendas': ['Ag. Género', 'Ag. Datos']},
    {'id': 'NM-S002', 'nombre': 'Ley 30364 — Ley para prevenir, sancionar y erradicar la violencia (Perú)',
     'organismo_emisor': 'Congreso de la República del Perú', 'tipo': 'Ley nacional',
     'pais_alcance': 'Perú', 'anio_adopcion': 2015, 'articulo_numeral': 'Art. 44',
     'obligacion_datos': 'Obliga al MIMP a publicar estadísticas anuales de violencia desagregadas',
     'agendas': ['Ag. Género', 'Ag. Datos']},
    {'id': 'NM-S003', 'nombre': 'Ley 19.580 — Ley de Violencia hacia las Mujeres (Uruguay)',
     'organismo_emisor': 'Parlamento de Uruguay', 'tipo': 'Ley nacional',
     'pais_alcance': 'Uruguay', 'anio_adopcion': 2018, 'articulo_numeral': 'Art. 7',
     'obligacion_datos': 'Obliga al Sistema Nacional de Información sobre Violencia Doméstica a publicar datos abiertos',
     'agendas': ['Ag. Género', 'Ag. Datos']},
    {'id': 'NM-S004', 'nombre': 'Agenda Digital para América Latina y el Caribe (eLAC2024)',
     'organismo_emisor': 'CEPAL', 'tipo': 'Plan regional',
     'pais_alcance': 'ALyC', 'anio_adopcion': 2022, 'articulo_numeral': 'Meta 2.3',
     'obligacion_datos': 'Insta a los países a publicar datos de brecha digital desagregados por género y territorio',
     'agendas': ['Ag. Tecnológica', 'Ag. Datos', 'Ag. Género']},
    {'id': 'NM-S005', 'nombre': 'Declaración de Santiago sobre Inteligencia Artificial e Igualdad de Género',
     'organismo_emisor': 'ONU Mujeres / CEPAL', 'tipo': 'Declaración regional',
     'pais_alcance': 'ALyC', 'anio_adopcion': 2024, 'articulo_numeral': 'Punto 8',
     'obligacion_datos': 'Solicita a los Estados producir datos sobre impacto de sistemas de IA en derechos de las mujeres',
     'agendas': ['Ag. Tecnológica', 'Ag. Género']},
]

for i in range(6, 16):
    pais = PAISES_SIN_COBERTURA[i % len(PAISES_SIN_COBERTURA)]
    NORMATIVAS_SINTETICAS.append({
        'id': f'NM-S{i:03d}',
        'nombre': f'Plan Nacional de Igualdad de Género {2018 + i} ({pais})',
        'organismo_emisor': f'Ministerio de la Mujer ({pais})',
        'tipo': 'Plan nacional',
        'pais_alcance': pais,
        'anio_adopcion': 2018 + i,
        'articulo_numeral': f'Eje {i}',
        'obligacion_datos': 'Establece metas de datos desagregados por género a nivel subnacional',
        'agendas': ['Ag. Género', 'Ag. Datos'],
    })


def generate_datasets(n=150):
    datasets = []
    for i in range(1, n + 1):
        pais = random.choice(PAISES_SIN_COBERTURA if i <= 80 else PAISES)
        subtema = random.choice(SUBTEMAS_NUEVOS)
        fuente = random.choice(FUENTES_SINTETICAS.get(pais, ['Organismo Nacional']))
        anio = random.randint(2019, 2025)
        calidad = random.choices(CALIDADES, weights=[0.3, 0.5, 0.2])[0]

        n_agendas = random.choices([1, 2, 3], weights=[0.3, 0.5, 0.2])[0]
        agendas = ['Ag. Género']
        pool = ['Ag. Datos', 'Ag. Tecnológica']
        random.shuffle(pool)
        agendas += pool[:n_agendas - 1]

        datasets.append({
            'id': f'DS-S{i:03d}',
            'titulo': f'Encuesta/Registro de {subtema.title()} — {pais} {anio}',
            'fuente_organismo': fuente,
            'pais_iso3': pais,
            'anio_publicacion': anio,
            'subtema': subtema,
            'agendas': list(set(agendas)),
            'calidad': calidad,
            'frecuencia': random.choice(FRECUENCIAS),
            'desagregacion_geo': random.choice(DESAGREGACIONES),
            'accesibilidad_formato': random.choice(FORMATOS),
            'url_descarga': f'https://datos.{pais.lower()}.example.com/ds-s{i:03d}',
            'url_valida': calidad != 'Nula',
            'descripcion_notas': f'Dataset sintético sobre {subtema} en {pais}. Generado para desarrollo y testing.',
            'es_sintetico': True,
        })
    return datasets


def generate_preguntas(n=500):
    preguntas = []
    start_date = datetime(2024, 1, 1)
    end_date = datetime(2026, 4, 20)
    total_days = (end_date - start_date).days

    for _ in range(n):
        t = random.betavariate(2, 1)
        delta = timedelta(days=int(t * total_days))
        fecha = start_date + delta
        texto = random.choice(PREGUNTAS_POOL)

        preguntas.append({
            'texto': texto,
            'fecha': fecha.isoformat() + 'Z',
            'agenda_clasificada': random.choice(AGENDAS_POOL + [None]),
            'resultado_score': round(random.uniform(0.1, 0.95), 3),
            'datasets_encontrados': [],
            'es_sintetico': True,
        })

    preguntas.sort(key=lambda p: p['fecha'])
    return preguntas


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--upload', action='store_true', help='Sube a Supabase después de generar')
    args = parser.parse_args()

    datasets = generate_datasets(150)
    normativas = [dict(n, es_sintetico=True, url_texto_oficial=None, descripcion_notas=None) for n in NORMATIVAS_SINTETICAS]
    preguntas = generate_preguntas(500)

    (OUTPUT_DIR / 'synthetic_datasets.json').write_text(json.dumps(datasets, ensure_ascii=False, indent=2))
    (OUTPUT_DIR / 'synthetic_normativas.json').write_text(json.dumps(normativas, ensure_ascii=False, indent=2))
    (OUTPUT_DIR / 'synthetic_preguntas.json').write_text(json.dumps(preguntas, ensure_ascii=False, indent=2))

    print(f'✓ Generados: {len(datasets)} datasets, {len(normativas)} normativas, {len(preguntas)} preguntas')
    print(f'  Output: {OUTPUT_DIR}')

    if args.upload:
        from supabase import create_client
        client = create_client(os.environ['VITE_SUPABASE_URL'], os.environ['VITE_SUPABASE_ANON_KEY'])

        print('\nSubiendo datasets sintéticos...')
        client.table('datasets').upsert(datasets).execute()

        print('Subiendo normativas sintéticas...')
        client.table('normativas').upsert(normativas).execute()

        print('Subiendo preguntas sintéticas...')
        for i in range(0, len(preguntas), 100):
            client.table('preguntas').insert(preguntas[i:i+100]).execute()

        print(f'✓ Upload completo.')


if __name__ == '__main__':
    main()
