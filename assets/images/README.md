# Game Assets

This directory contains the game's visual assets.

## Expected Asset Files

The game will automatically try to load the following image files. If they don't exist, it will use enhanced procedural fallback graphics:

### Defense Sprites
- `firewall_fortress.png` - Firewall defense tower
- `encryption_monastery.png` - Encryption defense tower  
- `decoy_temple.png` - Decoy defense tower
- `mirror_server.png` - Mirror defense tower
- `anonymity_shroud.png` - Anonymity defense tower
- `dharma_distributor.png` - Dharma defense tower

### Enemy Sprites
- `enemy_script_kiddie.png` - Script kiddie enemy
- `enemy_federal_agent.png` - Federal agent enemy
- `enemy_corporate_saboteur.png` - Corporate saboteur enemy
- `enemy_ai_surveillance.png` - AI surveillance enemy
- `enemy_raid_team.png` - Raid team enemy

## Adding Custom Graphics

1. Place PNG images with the exact names listed above in this `assets/images/` directory
2. The game will automatically detect and use them
3. If any file is missing, the game will use enhanced procedural fallback graphics
4. Recommended sprite sizes:
   - Defense towers: 40x40 pixels
   - Enemies: 30x30 pixels  
   - Bosses: 80x80 pixels

## Current Status

Currently, all graphics are using enhanced procedural fallback sprites with:
- Detailed defense towers with spikes and glowing effects
- Enemy sprites with eyes and directional indicators  
- Glowing projectiles with bright cores
- Intimidating boss designs with threatening features

The fallback graphics are fully functional and provide a cyberpunk aesthetic that matches the game's theme.
