import fs from 'fs';
import path from 'path';

export function loadCommands(client) {
  const commandFolders = ['src/commands/staff', 'src/commands/coach'];
  for (const folder of commandFolders) {
    const commandFiles = fs.readdirSync(folder).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
      const filePath = path.join(folder, file);
      import(path.resolve(filePath)).then(mod => {
        const command = mod.default;
        if (command && command.data && command.execute) {
          client.commands.set(command.data.name, command);
        }
      });
    }
  }
}
