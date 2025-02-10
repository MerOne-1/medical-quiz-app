import os
import json
import shutil
import re

def clean_filename(filename):
    # Remove .json extension
    name = filename.replace('.json', '')
    # Convert to lowercase and replace spaces/special chars with hyphens
    name = re.sub(r'[\s,]+', '-', name.lower())
    # Remove accents
    name = name.replace('é', 'e').replace('è', 'e').replace('ê', 'e')\
             .replace('à', 'a').replace('â', 'a')\
             .replace('ô', 'o').replace('û', 'u')\
             .replace('î', 'i').replace('ï', 'i')
    # Remove any other special characters
    name = re.sub(r'[^a-z0-9-]', '', name)
    return name

def generate_themes_json():
    source_dir = '../enhanced_json_files_by_theme'
    data_dir = '../public/data'
    
    # Clean data directory
    if os.path.exists(data_dir):
        shutil.rmtree(data_dir)
    os.makedirs(data_dir)
    
    # Copy all JSON files
    for filename in os.listdir(source_dir):
        if filename.endswith('.json'):
            shutil.copy2(os.path.join(source_dir, filename), os.path.join(data_dir, filename))
    
    # Generate themes.json
    themes = []
    for filename in sorted(os.listdir(source_dir)):
        if filename.endswith('.json'):
            theme_name = filename.replace('.json', '')
            theme = {
                "id": clean_filename(filename),
                "title": theme_name,
                "description": f"Questions de {theme_name}",
                "filename": filename
            }
            themes.append(theme)
    
    with open(os.path.join(data_dir, 'themes.json'), 'w', encoding='utf-8') as f:
        json.dump(themes, f, ensure_ascii=False, indent=2)

if __name__ == '__main__':
    generate_themes_json()
