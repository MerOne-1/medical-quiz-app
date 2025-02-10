import os
from PyPDF2 import PdfReader

def extract_text_from_pdf(pdf_path):
    text = ""
    try:
        reader = PdfReader(pdf_path)
        for page in reader.pages:
            text += page.extract_text()
    except Exception as e:
        print(f"Error reading {pdf_path}: {str(e)}")
    return text

def convert_pdfs_to_text(pdf_folder, output_folder):
    if not os.path.exists(output_folder):
        os.makedirs(output_folder)

    pdf_files = [f for f in os.listdir(pdf_folder) if f.lower().endswith(".pdf")]
    pdf_files.sort()

    for pdf_file in pdf_files:
        pdf_path = os.path.join(pdf_folder, pdf_file)
        print(f"Processing file: {pdf_file}")

        try:
            text = extract_text_from_pdf(pdf_path)
            if not text:
                print(f"Warning: No text extracted from {pdf_file}")
                continue

            text = text.replace('\x00', '')
            text = '\n'.join(line.strip() for line in text.splitlines() if line.strip())

            base_name = os.path.splitext(pdf_file)[0]
            txt_file = base_name + ".txt"
            txt_path = os.path.join(output_folder, txt_file)

            with open(txt_path, "w", encoding="utf-8") as f:
                f.write(text)
        except Exception as e:
            print(f"Error processing {pdf_file}: {str(e)}")
            continue

    print("\nConversion complete!")
    print(f"Files processed: {len(pdf_files)}")

if __name__ == "__main__":
    script_dir = os.path.dirname(os.path.abspath(__file__))
    pdf_folder = os.path.join(script_dir, "pdfs", "ilovepdf_extracted-pages")
    output_folder = os.path.join(script_dir, "txt_files")

    if not os.path.exists(pdf_folder):
        print(f"PDF folder does not exist: {pdf_folder}")
        print("1. Create a 'pdfs' folder in the same directory as this script")
        print("2. Inside 'pdfs', create a folder 'ilovepdf_extracted-pages'")
        print("3. Place your PDF files in this folder")
        print("4. Run the script again")
        exit(1)

    pdf_files = [f for f in os.listdir(pdf_folder) if f.lower().endswith('.pdf')]
    if not pdf_files:
        print(f"No PDF files found in: {pdf_folder}")
        print("Add your PDF files and run the script again")
        exit(1)

    convert_pdfs_to_text(pdf_folder, output_folder)
