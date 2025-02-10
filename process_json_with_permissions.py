import os
import json
import shutil
from openai import OpenAI
import glob

# Initialize OpenAI client
client = OpenAI(api_key=os.environ.get('OPENAI_API_KEY'))

# Directory paths
source_file = "/Users/merwanmez/CascadeProjects/personal-website/flashcards/qcm csp tout -17.json"
output_dir = "/Users/merwanmez/CascadeProjects/personal-website/flashcards/enhanced_json_files"

# Prompt for adding justifications
prompt = """Enhance this question by adding explanations for incorrect answers. You are a JSON processing function that must output ONLY a valid JSON object.

RULES:
1. Keep these fields EXACTLY as they are in the input:
   - theme
   - question  
   - options
   - correct_answers
2. Add a new field called 'justification_fausses_reponses'
3. In justification_fausses_reponses, add explanations ONLY for options that are NOT in correct_answers

INPUT:
{json_content}

OUTPUT FORMAT:
{{
  "theme": "<exactly as input>",
  "question": "<exactly as input>",
  "options": ["<exactly as input>"],
  "correct_answers": ["<exactly as input>"],
  "justification_fausses_reponses": {{
    "<incorrect option>": "<explanation>",
    "<incorrect option>": "<explanation>"
  }}
}}

Output ONLY the JSON object, no other text or formatting."""

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
        print("\nInput question:")
        print(question_str)

        # Prepare the message
        messages = [
            {"role": "user", "content": prompt.format(json_content=question_str)}
        ]

        print("\nSending request to OpenAI API...")
        # Call OpenAI API
        response = client.chat.completions.create(
            model="gpt-4",
            messages=messages,
            temperature=0.0
        )

        # Get the enhanced JSON from the response
        enhanced_json_str = response.choices[0].message.content
        print("\nAPI Response:")
        print(enhanced_json_str)
        
        # Clean the JSON string
        cleaned_json_str = clean_json_string(enhanced_json_str)
        if not cleaned_json_str:
            print("Failed to extract valid JSON from response")
            return None
            
        print("\nCleaned JSON:")
        print(cleaned_json_str)
        
        print("\nValidating JSON structure...")
        # Parse the response to ensure it's valid JSON
        enhanced_json = json.loads(cleaned_json_str)
        
        # Validate the structure and content
        is_valid, message = validate_json_response(enhanced_json, question)
        if not is_valid:
            print(f"Invalid JSON structure: {message}")
            return None
            
        print("Successfully validated the response")
        return enhanced_json

    except Exception as e:
        print(f"\nError occurred: {str(e)}")
        if 'enhanced_json_str' in locals():
            print("Raw response was:")
            print(enhanced_json_str)
            if 'cleaned_json_str' in locals():
                print("\nCleaned response was:")
                print(cleaned_json_str)
        return None

def enhance_json_with_explanations(questions):
    enhanced_questions = []
    for i, question in enumerate(questions, 1):
        print(f"\nProcessing question {i}/{len(questions)}...")
        enhanced_question = enhance_question(question)
        if enhanced_question:
            enhanced_questions.append(enhanced_question)
        else:
            print(f"Failed to enhance question {i}, keeping original")
            enhanced_questions.append(question)
    return enhanced_questions

def process_file():
    try:
        print("Processing JSON file...")
        
        # Create output directory if it doesn't exist
        os.makedirs(output_dir, exist_ok=True)
        
        # Read the original JSON file
        print(f"Reading file: {os.path.basename(source_file)}")
        with open(source_file, 'r', encoding='utf-8') as f:
            original_json = json.load(f)

        # Enhance the JSON with explanations
        print("Enhancing JSON with explanations...")
        enhanced_json = enhance_json_with_explanations(original_json)

        if enhanced_json:
            # Create output filename
            output_file = os.path.join(output_dir, f"enhanced_{os.path.basename(source_file)}")
            
            # Write enhanced JSON to new file
            print("Writing enhanced JSON to file...")
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(enhanced_json, f, ensure_ascii=False, indent=2)
            
            print(f"\nSuccess! Enhanced file saved as: {os.path.basename(output_file)}")
        else:
            print("Failed to enhance the JSON file.")

    except Exception as e:
        print(f"An error occurred: {str(e)}")

if __name__ == "__main__":
    print("Starting JSON enhancement process...")
    process_file()
    print("\nProcess finished!")
