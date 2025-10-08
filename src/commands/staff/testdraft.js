import { SlashCommandBuilder } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('dev-testdraft')
        .setDescription('Test draft class functionality'),

    async execute(interaction) {
        try {
            console.log('🧪 Testing draft class functionality...');

            // Test 1: Check if draftClasses.json exists
            const fs = await import('fs');
            const path = await import('path');

            const draftClassesPath = path.join(process.cwd(), 'data/draftClasses.json');
            console.log('📁 Checking path:', draftClassesPath);

            if (!fs.existsSync(draftClassesPath)) {
                await interaction.reply({
                    content: '❌ `data/draftClasses.json` file not found on server!',
                    ephemeral: true
                });
                return;
            }

            // Test 2: Try to read the file
            const data = fs.readFileSync(draftClassesPath, 'utf8');
            const config = JSON.parse(data);

            // Test 3: Try to import DraftClassManager
            const { DraftClassManager } = await import('../utils/draftClassManager.js');
            console.log('✅ DraftClassManager imported successfully');

            // Test 4: Try to use DraftClassManager
            const currentClass = DraftClassManager.getCurrentClass();

            await interaction.reply({
                content: `✅ **Test Results:**
                
**File exists:** ✅ Yes
**Classes found:** ${config.availableClasses?.length || 0}
**Current class:** ${currentClass?.id || 'None'}
**Current class name:** ${currentClass?.name || 'None'}

All systems working! The draftclass command should work now.`,
                ephemeral: true
            });

        } catch (error) {
            console.error('❌ Test failed:', error);
            await interaction.reply({
                content: `❌ **Test Failed:**
                
**Error:** ${error.message}
**Type:** ${error.constructor.name}

Check Railway logs for full details.`,
                ephemeral: true
            });
        }
    }
};
