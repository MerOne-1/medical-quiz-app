import os
import fitz  # PyMuPDF
import re
import json

def extract_text_from_pdf(pdf_path):
    """
    Ouvre le PDF et extrait le texte de toutes ses pages (ici une seule page par fichier).
    """
    text = ""
    with fitz.open(pdf_path) as doc:
        for page in doc:
            text += page.get_text()
    return text

def parse_question(text):
    """
    Parse le texte extrait d'une page PDF pour en extraire :
      - Le texte de la question (tout ce qui précède les options)
      - Les options de réponse (identifiées par des lettres A à E suivies de '.' ou ')')
      - La bonne réponse (recherchée dans une ligne contenant 'Réponse' ou 'Bonne réponse')
    """
    lines = text.splitlines()
    question_lines = []
    options = {}
    correct_answer = None

    option_regex = re.compile(r'^([A-E])[\.\)]\s*(.+)$')
    answer_regex = re.compile(r'^(?:Réponse|Bonne réponse)\s*[:\-]\s*([A-E])', re.IGNORECASE)

    options_found = False

    for line in lines:
        line = line.strip()
        if not line:
            continue

        match_answer = answer_regex.search(line)
        if match_answer:
            correct_answer = match_answer.group(1)
            continue

        match_option = option_regex.match(line)
        if match_option:
            options_found = True
            letter = match_option.group(1)
            option_text = match_option.group(2)
            options[letter] = option_text
        else:
            if not options_found:
                question_lines.append(line)

    question_text = " ".join(question_lines).strip()
    return {
        "question": question_text,
        "options": options,
        "correct_answer": correct_answer
    }

def main():
    # Dossier contenant les PDF
    folder_path = os.path.join(os.path.dirname(__file__), "pdfs/ilovepdf_extracted-pages")  # Chemin vers le dossier contenant les PDFs
    output_json = "questions.json"
    questions_list = []

    # Crée le dossier pdfs s'il n'existe pas
    if not os.path.exists(folder_path):
        os.makedirs(folder_path)
        print(f"Créé le dossier: {folder_path}")
        print("Veuillez y placer vos fichiers PDF et relancer le script")
        return

    # Récupère la liste de tous les fichiers PDF dans le dossier
    pdf_files = [f for f in os.listdir(folder_path) if f.lower().endswith(".pdf")]
    
    if not pdf_files:
        print(f"Aucun fichier PDF trouvé dans {folder_path}")
        print("Veuillez ajouter vos fichiers PDF et relancer le script")
        return
        
    pdf_files.sort()

    for pdf_file in pdf_files:
        pdf_path = os.path.join(folder_path, pdf_file)
        print(f"Traitement du fichier : {pdf_file}")
        text = extract_text_from_pdf(pdf_path)
        question_data = parse_question(text)
        question_data["source_file"] = pdf_file
        questions_list.append(question_data)

    with open(output_json, "w", encoding="utf-8") as f:
        json.dump({"questions": questions_list}, f, ensure_ascii=False, indent=4)

    print(f"\nExtraction terminée : {len(questions_list)} questions enregistrées dans '{output_json}'.")

if __name__ == "__main__":
    main()
