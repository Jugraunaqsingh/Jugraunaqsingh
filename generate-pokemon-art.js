const fs = require('fs');
const path = require('path');

// Simple YAML parser for this use case
function parseYAML(content) {
  const pokemon = {};
  const lines = content.split('\n');
  let currentPokemon = null;
  let currentAnimation = null;
  let inFrame = false;
  let frameLines = [];
  let indentLevel = 0;
  let inPokemonSection = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const leadingSpaces = line.length - line.trimStart().length;

    // Skip if empty and not in frame
    if (trimmed === '' && !inFrame) {
      continue;
    }

    // Detect pokemon: section
    if (trimmed === 'pokemon:') {
      inPokemonSection = true;
      continue;
    }

    // Detect pokemon name (indented under pokemon:)
    if (inPokemonSection && trimmed.match(/^[a-z_]+:$/) && leadingSpaces === 2) {
      const pokemonKey = trimmed.replace(':', '');
      currentPokemon = pokemonKey;
      pokemon[pokemonKey] = { name: '', type: '', animations: {} };
      currentAnimation = null;
      inFrame = false;
      frameLines = [];
      continue;
    }

    // Detect name field (4 spaces indent)
    if (trimmed.startsWith('name:') && currentPokemon && leadingSpaces === 4) {
      pokemon[currentPokemon].name = trimmed.split('name:')[1].trim().replace(/"/g, '');
      continue;
    }

    // Detect type field (4 spaces indent)
    if (trimmed.startsWith('type:') && currentPokemon && leadingSpaces === 4) {
      pokemon[currentPokemon].type = trimmed.split('type:')[1].trim().replace(/"/g, '');
      continue;
    }

    // Detect animations section (4 spaces indent)
    if (trimmed === 'animations:' && currentPokemon && leadingSpaces === 4) {
      continue;
    }

    // Detect animation name (6 spaces indent)
    if (trimmed.match(/^[a-z_]+:$/) && currentPokemon && leadingSpaces === 6) {
      const animKey = trimmed.replace(':', '');
      currentAnimation = animKey;
      if (!pokemon[currentPokemon].animations[animKey]) {
        pokemon[currentPokemon].animations[animKey] = [];
      }
      inFrame = false;
      frameLines = [];
      continue;
    }

    // Detect frame start (8 spaces indent, starts with - |)
    if (trimmed.startsWith('- |') && currentAnimation && leadingSpaces === 8) {
      // Save previous frame if we have one
      if (inFrame && frameLines.length > 0) {
        const frameContent = frameLines.join('\n').trim();
        if (frameContent) {
          pokemon[currentPokemon].animations[currentAnimation].push(frameContent);
        }
      }
      // Start new frame
      inFrame = true;
      frameLines = [];
      continue;
    }

    // Collect frame lines (10+ spaces indent when in frame)
    if (inFrame && currentAnimation) {
      if (leadingSpaces >= 10) {
        // This is part of the frame content
        frameLines.push(line.substring(10)); // Remove leading spaces
      } else if (trimmed === '' && frameLines.length > 0) {
        // Empty line might end frame, but check next line
        const nextLine = i + 1 < lines.length ? lines[i + 1] : '';
        const nextTrimmed = nextLine.trim();
        const nextLeading = nextLine.length - nextLine.trimStart().length;
        
        if (nextTrimmed === '' || (nextLeading < 8 && nextTrimmed !== '' && !nextTrimmed.startsWith('- |'))) {
          // End of frame
          const frameContent = frameLines.join('\n').trim();
          if (frameContent) {
            pokemon[currentPokemon].animations[currentAnimation].push(frameContent);
          }
          frameLines = [];
          inFrame = false;
        }
      } else if (leadingSpaces < 8 && trimmed !== '' && !trimmed.startsWith('- |')) {
        // End of frame - we've moved to a different section
        const frameContent = frameLines.join('\n').trim();
        if (frameContent) {
          pokemon[currentPokemon].animations[currentAnimation].push(frameContent);
        }
        frameLines = [];
        inFrame = false;
      }
    }
  }

  // Handle last frame
  if (inFrame && frameLines.length > 0 && currentAnimation) {
    const frameContent = frameLines.join('\n').trim();
    if (frameContent) {
      pokemon[currentPokemon].animations[currentAnimation].push(frameContent);
    }
  }

  return pokemon;
}

// Generate markdown output
function generateMarkdown(pokemon) {
  let output = '## 🎮 Pokémon Animations\n\n';
  output += 'Welcome to the Microservice Fusion System! Here are some Pokémon animations:\n\n';

  const pokemonOrder = ['pikachu', 'charizard', 'squirtle', 'bulbasaur', 'eevee', 'mewtwo'];
  
  for (const pokemonKey of pokemonOrder) {
    if (!pokemon[pokemonKey]) continue;
    
    const p = pokemon[pokemonKey];
    output += `### ${p.name} (${p.type})\n\n`;

    // Show pokeball animation
    if (p.animations.pokeball && p.animations.pokeball.length > 0) {
      output += '**Emerging from Pokéball:**\n\n';
      output += '```\n';
      // Show last frame (fully emerged)
      const lastFrame = p.animations.pokeball[p.animations.pokeball.length - 1];
      if (lastFrame && lastFrame.trim()) {
        output += lastFrame;
      } else {
        // Fallback to first frame if last is empty
        const firstFrame = p.animations.pokeball[0];
        if (firstFrame && firstFrame.trim()) {
          output += firstFrame;
        }
      }
      output += '\n```\n\n';
    }

    // Show other animations
    for (const [animName, frames] of Object.entries(p.animations)) {
      if (animName === 'pokeball') continue;
      
      const animTitle = animName.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      output += `**${animTitle}:**\n\n`;
      output += '```\n';
      
      // Show all frames for animation effect
      if (frames.length > 0) {
        // Show the last frame as the main display, or first if last is empty
        let displayFrame = frames[frames.length - 1];
        if (!displayFrame || !displayFrame.trim()) {
          displayFrame = frames.find(f => f && f.trim()) || '';
        }
        if (displayFrame && displayFrame.trim()) {
          output += displayFrame;
        }
      }
      output += '\n```\n\n';
    }
  }

  // Add a special section showing all Pokémon together
  output += '### 🎯 All Pokémon Together\n\n';
  output += '```\n';
  
  const allPokemon = [];
  for (const pokemonKey of pokemonOrder) {
    if (!pokemon[pokemonKey]) continue;
    const p = pokemon[pokemonKey];
    const frames = Object.values(p.animations).flat();
    if (frames.length > 0) {
      allPokemon.push({
        name: p.name,
        art: frames[frames.length - 1]
      });
    }
  }

  // Try to arrange them side by side (simple approach)
  if (allPokemon.length > 0) {
    const artLines = allPokemon.map(p => p.art.split('\n'));
    const maxLines = Math.max(...artLines.map(a => a.length));
    
    for (let i = 0; i < maxLines; i++) {
      const line = artLines.map(a => a[i] || '').join('    ');
      output += line + '\n';
    }
  }
  
  output += '```\n\n';
  output += '---\n\n';

  return output;
}

// Main execution
try {
  const yamlPath = path.join(__dirname, 'pokemon-animations.yml');
  const yamlContent = fs.readFileSync(yamlPath, 'utf8');
  
  const pokemon = parseYAML(yamlContent);
  const markdown = generateMarkdown(pokemon);
  
  // Write to a temporary file
  const outputPath = path.join(__dirname, 'pokemon-art-output.md');
  fs.writeFileSync(outputPath, markdown, 'utf8');
  
  // Also output to console
  console.log(markdown);
  console.log(`\n✅ Pokémon art generated! Output saved to: ${outputPath}`);
} catch (error) {
  console.error('Error generating Pokémon art:', error);
  process.exit(1);
}

