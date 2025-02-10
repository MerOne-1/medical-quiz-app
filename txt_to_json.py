import os
import glob
import json
from openai import OpenAI

# ====== Configuration ======
client = OpenAI(api_key=os.environ.get('OPENAI_API_KEY'))

# Chemin du dossier contenant vos fichiers .txt
input_folder = "/Users/merwanmez/CascadeProjects/personal-website/flashcards/txt_files"
# Chemin du dossier de sortie pour les fichiers JSON générés
output_folder = "/Users/merwanmez/Documents/json qcms csp"
os.makedirs(output_folder, exist_ok=True)

# ====== Prompt standard pour convertir un fichier TXT de quizz en JSON ======
system_prompt = (
    "Tu es un assistant expert en conversion de quizz en JSON. On te fournit un fichier texte "
    "qui peut contenir ou non des quizz. Le fichier commence par le thème, puis peut présenter plusieurs questions de type QCM. "
    "Pour chaque question, tu dois extraire :\n"
    "  - L'énoncé de la question.\n"
    "  - Les réponses possibles du QCM.\n"
    "  - Les bonnes réponses du QCM.\n"
    "  - Le thème (celui indiqué en début de fichier).\n\n"
    "Chaque question doit être convertie en un objet JSON avec exactement les clés suivantes :\n"
    "{\n"
    "  \"theme\": <string>,\n"
    "  \"question\": <string>,\n"
    "  \"options\": [<string>, ...],\n"
    "  \"correct_answers\": [<string>, ...]\n"
    "}\n\n"
    "Le format de sortie doit être un tableau JSON contenant ces objets.\n"
    "Si le fichier ne contient aucun quiz, renvoie un tableau JSON vide : []\n"
    "Ne renvoie aucune introduction, explication ou texte supplémentaire : uniquement le JSON des QCM."
)

# ====== Traitement des fichiers TXT ======
# Récupérer tous les fichiers .txt du dossier
txt_files = glob.glob(os.path.join(input_folder, "*.txt"))

for txt_file in txt_files:
    with open(txt_file, "r", encoding="utf-8") as file:
        file_content = file.read()

    # Construire la conversation à envoyer à l'API :
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": file_content}
    ]

    try:
        response = client.chat.completions.create(
            model="gpt-4",
            messages=messages,
            temperature=0.0
        )
        response_text = response.choices[0].message.content.strip()

        # Vérifier que la réponse est un JSON valide
        try:
            json_data = json.loads(response_text)
        except json.JSONDecodeError as json_err:
            print(f"Erreur de décodage JSON pour le fichier {txt_file} : {json_err}")
            continue

        # Sauvegarder la réponse dans un fichier .json
        base_name = os.path.splitext(os.path.basename(txt_file))[0]
        output_file = os.path.join(output_folder, f"{base_name}.json")
        with open(output_file, "w", encoding="utf-8") as out_file:
            json.dump(json_data, out_file, ensure_ascii=False, indent=2)

        print(f"Traitement réussi pour : {txt_file}")

    except Exception as e:
        print(f"Erreur lors du traitement du fichier {txt_file} : {e}")
