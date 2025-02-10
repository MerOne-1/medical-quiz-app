import os
import json
from openai import OpenAI
import glob
import time

# Initialize OpenAI client
client = OpenAI(api_key=os.environ.get('OPENAI_API_KEY'))

# Directory paths - all JSON files should be in this directory
input_dir = "/Users/merwanmez/CascadeProjects/personal-website/flashcards/json_files"
output_dir = "/Users/merwanmez/CascadeProjects/personal-website/flashcards/enhanced_json_files"

# Create output directory if it doesn't exist
os.makedirs(output_dir, exist_ok=True)

# Prompt for adding justifications
prompt = """Tu dois améliorer cette question en ajoutant des explications en français pour les réponses incorrectes. Tu es une fonction de traitement JSON qui doit produire UNIQUEMENT un objet JSON valide.

RÈGLES :
1. Garde ces champs EXACTEMENT comme dans l'entrée :
   - theme
   - question
   - options
   - correct_answers
2. Ajoute un nouveau champ appelé 'justification_fausses_reponses'
3. Dans justification_fausses_reponses, ajoute des explications UNIQUEMENT pour les options qui ne sont PAS dans correct_answers
4. Les explications doivent être en français, claires, pédagogiques et scientifiquement précises
5. Les explications doivent expliquer pourquoi la réponse est fausse en utilisant des principes scientifiques

ENTRÉE :
{json_content}

FORMAT DE SORTIE :
{{
  "theme": "<exactement comme l'entrée>",
  "question": "<exactement comme l'entrée>",
  "options": ["<exactement comme l'entrée>"],
  "correct_answers": ["<exactement comme l'entrée>"],
  "justification_fausses_reponses": {{
    "<option incorrecte>": "<explication en français>",
    "<option incorrecte>": "<explication en français>"
  }}
}}

Renvoie UNIQUEMENT l'objet JSON, sans autre texte ni formatage."""

def validate_json_response(enhanced_json, original_json):
    """Validate that the enhanced JSON has all required fields and structure."""
    required_fields = ['theme', 'question', 'options', 'correct_answers', 'justification_fausses_reponses']
    
    # Check all required fields are present
    for field in required_fields:
        if field not in enhanced_json:
            return False, f"Missing required field: {field}"
    
    # Check that original fields are unchanged
    for field in ['theme', 'question', 'options', 'correct_answers']:
        if enhanced_json[field] != original_json[field]:
            return False, f"Field was modified: {field}"
    
    # Check that justification_fausses_reponses is a dictionary
    if not isinstance(enhanced_json['justification_fausses_reponses'], dict):
        return False, "justification_fausses_reponses must be a dictionary"
    
    return True, "Valid JSON"

def clean_json_string(json_str):
    """Clean and extract JSON from the response."""
    # Remove any leading/trailing whitespace and newlines
    json_str = json_str.strip()
    
    # Try to find the first '{' and last '}'
    start = json_str.find('{')
    end = json_str.rfind('}')
    
    if start != -1 and end != -1:
        json_str = json_str[start:end + 1]
        
        # Try to parse it as JSON
        try:
            json.loads(json_str)
            return json_str
        except json.JSONDecodeError:
            return None
    return None

def enhance_question(question):
    try:
        # Convert the single question to string
        question_str = json.dumps(question, ensure_ascii=False)

        # Prepare the message
        messages = [
            {"role": "user", "content": prompt.format(json_content=question_str)}
        ]

        # Call OpenAI API
        response = client.chat.completions.create(
            model="gpt-4",
            messages=messages,
            temperature=0.0
        )

        # Get the enhanced JSON from the response
        enhanced_json_str = response.choices[0].message.content
        
        # Clean the JSON string
        cleaned_json_str = clean_json_string(enhanced_json_str)
        if not cleaned_json_str:
            print("Failed to extract valid JSON from response")
            return None
            
        # Parse the response to ensure it's valid JSON
        enhanced_json = json.loads(cleaned_json_str)
        
        # Validate the structure and content
        is_valid, message = validate_json_response(enhanced_json, question)
        if not is_valid:
            print(f"Invalid JSON structure: {message}")
            return None
            
        return enhanced_json

    except Exception as e:
        print(f"\nError occurred: {str(e)}")
        return None

def enhance_json_with_explanations(questions):
    enhanced_questions = []
    for i, question in enumerate(questions, 1):
        enhanced_question = enhance_question(question)
        if enhanced_question:
            enhanced_questions.append(enhanced_question)
        else:
            print(f"Failed to enhance question {i}, keeping original")
            enhanced_questions.append(question)
        # Add a small delay to avoid rate limiting
        time.sleep(0.5)
    return enhanced_questions

def process_file(json_file, temp_file):
    try:
        # Copy the file to temp directory
        shutil.copy2(json_file, temp_file)
        
        # Read the JSON file
        with open(temp_file, 'r', encoding='utf-8') as f:
            questions = json.load(f)
        
        # Process the questions
        if isinstance(questions, list):
            enhanced_questions = enhance_json_with_explanations(questions)
        else:
            enhanced_questions = enhance_json_with_explanations([questions])[0]
        
        # Create output filename
        output_file = os.path.join(output_dir, f"enhanced_{os.path.basename(json_file)}")
        
        # Write enhanced JSON to file
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(enhanced_questions, f, ensure_ascii=False, indent=2)
        
        return True
    except Exception as e:
        print(f"Error processing file {json_file}: {str(e)}")
        return False
    finally:
        # Clean up temp file
        if os.path.exists(temp_file):
            os.remove(temp_file)

def main():
    print("Starting JSON enhancement process...")
    
    # Create output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)
    
    # Get list of JSON files
    json_files = glob.glob(os.path.join(input_dir, "*.json"))
    total_files = len(json_files)
    
    if total_files == 0:
        print("No JSON files found!")
        return
    
    print(f"Found {total_files} JSON files to process")
    
    # Process each file
    success_count = 0
    for i, json_file in enumerate(json_files):
        print(f"\nProcessing file {i+1}/{total_files}: {os.path.basename(json_file)}")
        
        try:
            # Read the JSON file
            with open(json_file, 'r', encoding='utf-8') as f:
                questions = json.load(f)
            
            # Process the questions
            if isinstance(questions, list):
                enhanced_questions = enhance_json_with_explanations(questions)
            else:
                enhanced_questions = enhance_json_with_explanations([questions])[0]
            
            # Create output filename
            output_file = os.path.join(output_dir, f"enhanced_{os.path.basename(json_file)}")
            
            # Write enhanced JSON to file
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(enhanced_questions, f, ensure_ascii=False, indent=2)
            
            success_count += 1
            print(f"Successfully enhanced: {os.path.basename(json_file)}")
            
        except Exception as e:
            print(f"Error processing file {json_file}: {str(e)}")
    
    print(f"\nProcessing complete!")
    print(f"Successfully processed {success_count} out of {total_files} files")
    print(f"Enhanced files are saved in: {output_dir}")

if __name__ == "__main__":
    main()
