export default {
  data: {
    name: 'ping',
    description: 'Replies with Pong!',
    toJSON() { return { name: this.name, description: this.description }; }
  },
  async execute(interaction) {
    await interaction.reply('Pong!');
  }
};
