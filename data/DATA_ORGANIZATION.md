# LEAGUEbuddy Data Organization

## Folder Structure

### `/data/2k/` - NBA 2K League Data
All NBA 2K related data files are stored here:
- `teams.json` - NBA team information
- `players.json` - NBA player rosters
- `schedule.json` - NBA game schedule
- `standings.json` - NBA team standings
- `scores.json` - NBA game scores
- `season.json` - NBA season information
- `recruiting.json` - NBA recruit data
- `recruits.json` - NBA recruit lists
- `scouting.json` - NBA scouting information
- `bigboard.json` - NBA big board data
- `prospectBoards.json` - NBA prospect boards
- `scout_points.json` - NBA scout points
- `top_performer.json` - NBA top performers
- `playoffpicture.json` - NBA playoff picture
- `coachRoleMap.json` - NBA coach role mappings

### `/data/madden/` - Madden NFL League Data
All Madden NFL related data files are stored here:
- `teams.json` - NFL team information
- `players.json` - NFL player rosters  
- `schedule.json` - NFL game schedule
- `standings.json` - NFL team standings
- `league.json` - NFL league information

### `/data/` (Root) - Shared/Global Data
- `league.json` - Global league configuration
- `draftClasses.json` - Draft class information
- `ea_tokens.json` - EA Sports authentication tokens
- `README_LEAGUEbuddy_data_structure.txt` - Original data structure documentation

## Import Behavior

### NBA 2K Commands
All existing 2K commands (`/standings`, `/schedule`, `/scout`, etc.) now read/write data from the `/data/2k/` folder.

### Madden NFL Commands  
The `/ea sync` command imports Madden league data and saves it to the `/data/madden/` folder.

## Benefits

1. **Organization**: Clear separation between NBA 2K and Madden NFL data
2. **Scalability**: Easy to add more games in the future (e.g., `/data/fifa/`)
3. **Maintenance**: Easier to backup, restore, or migrate specific game data
4. **Debugging**: Simpler to troubleshoot game-specific issues

## Migration Notes

- All existing 2K data files were moved from `/data/` to `/data/2k/`
- All command file paths were updated automatically
- Madden import functionality creates new files in `/data/madden/`
- No user intervention required - everything works seamlessly
