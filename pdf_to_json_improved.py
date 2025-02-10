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

def clean_text(text):
    """Remove headers, URLs, and other unwanted content from the text."""
    # Remove URLs and headers
    text = re.sub(r'https?://\S+', '', text)
    text = re.sub(r'\d{2}/\d{2}/\d{4}.*?Quiz.*?Question \d+', '', text, flags=re.DOTALL)
    text = re.sub(r'Non répondue.*?Noté sur \d+,\d+\s*', '', text)
    text = re.sub(r'Question \d+\s*Non répondue.*?Noté sur \d+,\d+\s*', '', text)
    text = re.sub(r'Commencé le.*?Temps mis.*?s', '', text, flags=re.DOTALL)
    text = re.sub(r'Accueil.*?santé /', '', text, flags=re.DOTALL)
    text = re.sub(r'Veuillez choisir.*?:', '', text)
    text = re.sub(r'\s+', ' ', text)  # Replace multiple spaces with single space
    text = re.sub(r'\s*[\.,]\s*$', '', text)  # Remove trailing periods and commas
    return text.strip()

def parse_question(text):
    """
    Parse le texte extrait d'une page PDF pour en extraire :
      - Le texte de la question
      - Les options de réponse
      - Les bonnes réponses
    """
    # Clean the text first
    text = clean_text(text)
    
    # Split into lines and remove empty lines
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    
    # Initialize variables
    question_text = ""
    options = {}
    correct_answers = []
    
    # Find where options start and correct answers are
    question_lines = []
    in_options = False
    found_correct_answers = False
    
    for i, line in enumerate(lines):
        # Check for correct answers first
        if ("réponses correctes sont" in line.lower() or 
            "réponse correcte est" in line.lower() or 
            "la réponse correcte est" in line.lower()):
            found_correct_answers = True
            # Extract correct answers from this line and any following lines until we hit an option or new question
            answers_text = ""
            if "sont :" in line:
                answers_text = line.split("sont :")[-1]
            elif "est :" in line:
                answers_text = line.split("est :")[-1]
            else:
                answers_text = line.split("est")[-1]
                
            # Get any continuation lines
            j = i + 1
            while j < len(lines) and not re.match(r'^[A-E][\.\)]', lines[j]):
                answers_text += " " + lines[j]
                j += 1
                
            # Clean and store correct answers
            answers = [ans.strip(" ,.'\"") for ans in answers_text.split(",")]
            correct_answers.extend([ans for ans in answers if ans])
            continue
            
        # Check for options
        option_match = re.match(r'^([A-E])[\.\)]\s*(.+)$', line)
        if option_match:
            in_options = True
            letter = option_match.group(1)
            option_text = option_match.group(2).strip()
            options[letter] = option_text
            continue
            
        # If we haven't started options section and haven't found correct answers,
        # this is part of the question
        if not in_options and not found_correct_answers:
            question_lines.append(line)
    
    question_text = " ".join(question_lines).strip()
    
    # Clean up correct answers
    if correct_answers:
        # Remove duplicates while preserving order
        seen = set()
        correct_answers = [x for x in correct_answers if not (x in seen or seen.add(x))]
        # Remove any remaining artifacts
        correct_answers = [re.sub(r'^[,-]\s*', '', ans) for ans in correct_answers]
        correct_answers = [ans for ans in correct_answers if len(ans) > 1]  # Remove single-character answers
    
    return {
        "question": question_text,
        "options": options,
        "correct_answers": correct_answers if correct_answers else None
    }

def main():
    # Dossier contenant les PDF
    folder_path = os.path.join(os.path.dirname(__file__), "pdfs/ilovepdf_extracted-pages")
    output_json = "questions_improved.json"
    questions_list = []

    # Vérifie si le dossier existe
    if not os.path.exists(folder_path):
        os.makedirs(folder_path)
        print(f"Créé le dossier: {folder_path}")
        print("Veuillez y placer vos fichiers PDF et relancer le script")
        return

    # Récupère la liste de tous les fichiers PDF
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
