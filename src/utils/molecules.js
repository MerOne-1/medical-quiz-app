// Map theme names to their directory names
export const themeToDirectory = {
  'antibact-antisept': 'antibact-antisept',
  'broncho': 'broncho',
  'gastro': 'gastro',
  'immuno-hemato': 'immuno-hemato',
  'infectio': 'infectio',
  'onco': 'onco',
  'syst-nerveux': 'syst-nerveux'
};

// Load all molecules from all themes
export const loadAllMolecules = async () => {
  try {
    const molecules = [];
    
    // Load molecules from each theme
    for (const [theme, directory] of Object.entries(themeToDirectory)) {
      const response = await fetch(`/molecules/data/${directory}.json`);
      if (!response.ok) {
        console.error(`Failed to load molecules for theme ${theme}`);
        continue;
      }
      
      const data = await response.json();
      if (!data || !data.cards) {
        console.error(`Invalid data format for theme ${theme}`);
        continue;
      }
      
      // Add theme information to each molecule
      const themeMolecules = data.cards.map(card => ({
        ...card,
        theme,
        directory,
        id: card.id || card.name.toLowerCase().replace(/[^a-z0-9]/g, ''),
        image: card.image.includes('/') ? 
          `/molecules/images/${card.image}` : 
          `/molecules/images/${directory}/${card.image}`
      }));
      
      molecules.push(...themeMolecules);
    }
    
    return molecules;
  } catch (error) {
    console.error('Error loading molecules:', error);
    throw error;
  }
};
