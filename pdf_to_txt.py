import os
import fitz  # PyMuPDF

def extract_text_from_pdf(pdf_path):
    """
    Extrait le texte du PDF indiqué par pdf_path.
    """
    text = ""
    # Ouvre le PDF avec PyMuPDF
    with fitz.open(pdf_path) as doc:
        # Pour chaque page, récupère le texte
        for page in doc:
            text += page.get_text()
    return text

def convert_pdfs_to_text(pdf_folder, output_folder):
    """
    Parcourt le dossier pdf_folder, extrait le texte de chaque PDF,
    et enregistre le texte dans un fichier .txt dans output_folder.
    """
    # Crée le dossier de sortie s'il n'existe pas
    if not os.path.exists(output_folder):
        os.makedirs(output_folder)

    # Récupère la liste de tous les fichiers PDF du dossier
    pdf_files = [f for f in os.listdir(pdf_folder) if f.lower().endswith(".pdf")]
    pdf_files.sort()  # Tri alphabétique

    for pdf_file in pdf_files:
        pdf_path = os.path.join(pdf_folder, pdf_file)
        print(f"Traitement du fichier : {pdf_file}")

        # Extraction du texte
        text = extract_text_from_pdf(pdf_path)

        # Clean up the text a bit
        text = text.replace('\x00', '')  # Remove null bytes
        text = '\n'.join(line.strip() for line in text.splitlines())  # Clean up whitespace

        # Nom du fichier texte de sortie : on remplace .pdf par .txt
        base_name = os.path.splitext(pdf_file)[0]
        txt_file = base_name + ".txt"
        txt_path = os.path.join(output_folder, txt_file)

        # Enregistrement du texte dans le fichier
        with open(txt_path, "w", encoding="utf-8") as f:
            f.write(text)

    print("\nConversion terminée !")
    print(f"Nombre de fichiers traités : {len(pdf_files)}")

if __name__ == "__main__":
    # Dossier contenant les PDFs (utilise le même dossier que le script précédent)
    script_dir = os.path.dirname(os.path.abspath(__file__))
    pdf_folder = os.path.join(script_dir, "pdfs/ilovepdf_extracted-pages")
    
    # Dossier de sortie pour les fichiers texte
    output_folder = os.path.join(script_dir, "txt_files")

    convert_pdfs_to_text(pdf_folder, output_folder)
