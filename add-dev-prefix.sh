#!/bin/bash

# Add dev- prefix to all command names for development environment
echo "🔄 Adding dev- prefix to development commands..."

# Find all command files and update their names
find src/commands -name "*.js" -exec sed -i '' 's/\.setName('\''mycommands'\'')/\.setName('\''dev-mycommands'\'')/g' {} \;
find src/commands -name "*.js" -exec sed -i '' 's/\.setName('\''ea'\'')/\.setName('\''dev-ea'\'')/g' {} \;
find src/commands -name "*.js" -exec sed -i '' 's/\.setName('\''bigboard'\'')/\.setName('\''dev-bigboard'\'')/g' {} \;
find src/commands -name "*.js" -exec sed -i '' 's/\.setName('\''schedule'\'')/\.setName('\''dev-schedule'\'')/g' {} \;
find src/commands -name "*.js" -exec sed -i '' 's/\.setName('\''scout'\'')/\.setName('\''dev-scout'\'')/g' {} \;
find src/commands -name "*.js" -exec sed -i '' 's/\.setName('\''standings'\'')/\.setName('\''dev-standings'\'')/g' {} \;
find src/commands -name "*.js" -exec sed -i '' 's/\.setName('\''prospectboard'\'')/\.setName('\''dev-prospectboard'\'')/g' {} \;
find src/commands -name "*.js" -exec sed -i '' 's/\.setName('\''recruitboard'\'')/\.setName('\''dev-recruitboard'\'')/g' {} \;
find src/commands -name "*.js" -exec sed -i '' 's/\.setName('\''playoffpicture'\'')/\.setName('\''dev-playoffpicture'\'')/g' {} \;
find src/commands -name "*.js" -exec sed -i '' 's/\.setName('\''invitecoach'\'')/\.setName('\''dev-invitecoach'\'')/g' {} \;
find src/commands -name "*.js" -exec sed -i '' 's/\.setName('\''uninvitecoach'\'')/\.setName('\''dev-uninvitecoach'\'')/g' {} \;

# Staff commands
find src/commands -name "*.js" -exec sed -i '' 's/\.setName('\''advanceweek'\'')/\.setName('\''dev-advanceweek'\'')/g' {} \;
find src/commands -name "*.js" -exec sed -i '' 's/\.setName('\''advanceplayoff'\'')/\.setName('\''dev-advanceplayoff'\'')/g' {} \;
find src/commands -name "*.js" -exec sed -i '' 's/\.setName('\''assignrole'\'')/\.setName('\''dev-assignrole'\'')/g' {} \;
find src/commands -name "*.js" -exec sed -i '' 's/\.setName('\''startseason'\'')/\.setName('\''dev-startseason'\'')/g' {} \;
find src/commands -name "*.js" -exec sed -i '' 's/\.setName('\''clearmessages'\'')/\.setName('\''dev-clearmessages'\'')/g' {} \;
find src/commands -name "*.js" -exec sed -i '' 's/\.setName('\''createcoachoffices'\'')/\.setName('\''dev-createcoachoffices'\'')/g' {} \;
find src/commands -name "*.js" -exec sed -i '' 's/\.setName('\''clearcoachoffices'\'')/\.setName('\''dev-clearcoachoffices'\'')/g' {} \;
find src/commands -name "*.js" -exec sed -i '' 's/\.setName('\''deletegamechannel'\'')/\.setName('\''dev-deletegamechannel'\'')/g' {} \;
find src/commands -name "*.js" -exec sed -i '' 's/\.setName('\''generaterandomscores'\'')/\.setName('\''dev-generaterandomscores'\'')/g' {} \;
find src/commands -name "*.js" -exec sed -i '' 's/\.setName('\''resetnbaroles'\'')/\.setName('\''dev-resetnbaroles'\'')/g' {} \;
find src/commands -name "*.js" -exec sed -i '' 's/\.setName('\''resetscouting'\'')/\.setName('\''dev-resetscouting'\'')/g' {} \;
find src/commands -name "*.js" -exec sed -i '' 's/\.setName('\''clearallgames'\'')/\.setName('\''dev-clearallgames'\'')/g' {} \;
find src/commands -name "*.js" -exec sed -i '' 's/\.setName('\''pushtoplayoffs'\'')/\.setName('\''dev-pushtoplayoffs'\'')/g' {} \;
find src/commands -name "*.js" -exec sed -i '' 's/\.setName('\''draftclass'\'')/\.setName('\''dev-draftclass'\'')/g' {} \;
find src/commands -name "*.js" -exec sed -i '' 's/\.setName('\''testdraft'\'')/\.setName('\''dev-testdraft'\'')/g' {} \;

echo "✅ Successfully added dev- prefix to all commands!"
echo "📝 Commands are now: /dev-mycommands, /dev-ea, /dev-bigboard, etc."
