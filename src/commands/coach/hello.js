export default {
  data: {
    name: 'hello',
    description: 'Say hello!',
    toJSON() { return { name: this.name, description: this.description }; }
  },
  async execute(interaction) {
    await interaction.reply('Hello, Coach!');
  }
};
