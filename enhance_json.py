import os
import json
from openai import OpenAI
import glob

# Initialize OpenAI client
client = OpenAI(api_key=os.environ.get('OPENAI_API_KEY'))

# Input and output directories
input_folder = "/Users/merwanmez/CascadeProjects/personal-website/flashcards/json_files"
output_folder = "/Users/merwanmez/CascadeProjects/personal-website/flashcards/enhanced_json_files"
os.makedirs(output_folder, exist_ok=True)

# Prompt for adding justifications
prompt = """Add a justification_fausses_reponses field to each question in this QCM JSON. For each incorrect option, generate a short and clear explanation that provides context or scientific reasoning to help understand why the answer is incorrect. Do not paraphrase the option; instead, explain the underlying principle or relevant facts that make it wrong. The response must remain in structured JSON format, with justifications added directly under each question without modifying other fields. The theme field must remain unchanged.

Expected example:

{
  "theme": "Biophysics",
  "question": "Among the following statements, which one(s) is (are) correct?",
  "options": [
    "The IR domain corresponds to higher energies than the Visible domain",
    "The Visible domain corresponds to higher energies than the IR domain",
    "The Visible domain corresponds to lower frequencies than the UV domain",
    "The UV domain corresponds to lower energies than the Visible domain",
    "The UV domain corresponds to shorter wavelengths than the IR domain"
  ],
  "correct_answers": [
    "The Visible domain corresponds to lower frequencies than the UV domain",
    "The UV domain corresponds to shorter wavelengths than the IR domain",
    "The Visible domain corresponds to higher energies than the IR domain"
  ],
  "justification_fausses_reponses": {
    "The IR domain corresponds to higher energies than the Visible domain": "Incorrect: Infrared (IR) radiation has longer wavelengths and lower energy compared to the Visible spectrum.",
    "The UV domain corresponds to lower energies than the Visible domain": "Incorrect: Ultraviolet (UV) light has higher energy than Visible light, which is why it can cause damage to DNA and skin cells."
  }
}

Return a clean, well-formatted JSON, ready for integration into a web application. Ensure that the explanations are clear, educational, and concise.

Here is the JSON to enhance:
{json_content}"""

def enhance_json_with_explanations(json_content):
    try:
        # Convert JSON to string if it's not already
        if isinstance(json_content, (dict, list)):
            json_str = json.dumps(json_content, ensure_ascii=False)
        else:
            json_str = json_content

        # Prepare the message
        messages = [
            {"role": "user", "content": prompt.format(json_content=json_str)}
        ]

        # Call OpenAI API
        response = client.chat.completions.create(
            model="gpt-4",
            messages=messages,
            temperature=0.0
        )

        # Get the enhanced JSON from the response
        enhanced_json = response.choices[0].message.content.strip()
        
        # Parse the response to ensure it's valid JSON
        return json.loads(enhanced_json)

    except Exception as e:
        print(f"Error processing JSON: {str(e)}")
        return None

def process_all_files():
    # Get all JSON files from input directory
    json_files = glob.glob(os.path.join(input_folder, "*.json"))
    total_files = len(json_files)

    for index, json_file in enumerate(json_files, 1):
        try:
            print(f"Processing file {index}/{total_files}: {os.path.basename(json_file)}")
            
            # Read the original JSON file
            with open(json_file, 'r', encoding='utf-8') as f:
                original_json = json.load(f)

            # Enhance the JSON with explanations
            enhanced_json = enhance_json_with_explanations(original_json)

            if enhanced_json:
                # Create output filename
                output_file = os.path.join(output_folder, os.path.basename(json_file))
                
                # Write enhanced JSON to new file
                with open(output_file, 'w', encoding='utf-8') as f:
                    json.dump(enhanced_json, f, ensure_ascii=False, indent=2)
                
                print(f"Successfully enhanced: {os.path.basename(json_file)}")
            else:
                print(f"Failed to enhance: {os.path.basename(json_file)}")

        except Exception as e:
            print(f"Error processing file {json_file}: {str(e)}")

if __name__ == "__main__":
    print("Starting JSON enhancement process...")
    process_all_files()
    print("Enhancement process completed!")
