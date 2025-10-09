# New Contributor Checklist

Welcome to LEAGUEbuddy! Use this checklist to get started:

## Initial Setup

- [ ] **Fork or clone the repository**
  ```bash
  git clone https://github.com/bgordon0102/LEAGUEbuddy.git
  cd LEAGUEbuddy
  ```

- [ ] **Install dependencies**
  ```bash
  npm install
  ```

- [ ] **Create .env file**
  ```bash
  cp .env.example .env
  # Edit .env with your Discord bot credentials
  ```

- [ ] **Get Discord Bot Token**
  - Visit [Discord Developer Portal](https://discord.com/developers/applications)
  - Create a new application or use existing one
  - Go to "Bot" section and copy the token
  - Add to `.env` as `TOKEN=your_token_here`

- [ ] **Get Client and Guild IDs**
  - Client ID: From "General Information" in Developer Portal
  - Guild ID: Enable Developer Mode in Discord, right-click your server, "Copy ID"
  - Add to `.env` file

- [ ] **Deploy commands to Discord**
  ```bash
  npm run deploy
  ```

- [ ] **Start the bot**
  ```bash
  npm start
  # or for auto-reload during development
  npm run dev
  ```

- [ ] **Test the bot in Discord**
  - Type `/` in your test server
  - Verify commands appear
  - Test a simple command like `/mycommands`

## Understanding the Project

- [ ] **Read the documentation**
  - [ ] [README.md](../README.md) - Project overview
  - [ ] [CONTRIBUTING.md](../CONTRIBUTING.md) - Contribution guidelines
  - [ ] [docs/DEVELOPMENT.md](DEVELOPMENT.md) - Developer reference
  - [ ] [docs/EXAMPLE_WORKFLOW.md](EXAMPLE_WORKFLOW.md) - Complete example

- [ ] **Explore the codebase**
  - [ ] Check `src/commands/staff/` for staff commands
  - [ ] Check `src/commands/coach/` for coach commands
  - [ ] Check `src/interactions/` for button/menu handlers
  - [ ] Look at `app.js` to understand the bot structure

- [ ] **Review data structure**
  - [ ] Check `data/2k/` directory for league data
  - [ ] Read `data/README_LEAGUEbuddy_data_structure.txt`

## Before Making Changes

- [ ] **Create a feature branch**
  ```bash
  git checkout -b feature/your-feature-name
  ```

- [ ] **Understand the issue/feature you're working on**

- [ ] **Look at similar existing code for patterns**

## Making Changes

- [ ] **Write your code**
  - Follow existing code style
  - Use ES modules (import/export)
  - Add comments for complex logic

- [ ] **Test your changes**
  - [ ] Check syntax: `node --check yourfile.js`
  - [ ] Deploy commands if needed: `npm run deploy`
  - [ ] Restart bot: `npm run dev`
  - [ ] Test in Discord thoroughly
  - [ ] Test edge cases and error handling

- [ ] **Verify existing functionality still works**
  - Test related commands
  - Check for console errors

## Submitting Your Changes

- [ ] **Commit your changes**
  ```bash
  git add .
  git commit -m "Clear description of changes"
  ```

- [ ] **Push your branch**
  ```bash
  git push origin feature/your-feature-name
  ```

- [ ] **Create a Pull Request**
  - Go to GitHub
  - Click "New Pull Request"
  - Describe what your changes do
  - Include screenshots if UI changes
  - Reference related issues

- [ ] **Respond to review feedback**
  - Make requested changes
  - Push updates to same branch
  - Reply to comments

## Tips for Success

✅ **Start small** - Begin with a simple change to understand the workflow

✅ **Test thoroughly** - Test happy path, error cases, and edge cases

✅ **Ask questions** - Open an issue if you're unsure about something

✅ **Follow conventions** - Match the style of existing code

✅ **Document changes** - Add comments and update docs if needed

✅ **Be patient** - Code review takes time

## Common First Contributions

Good places to start:

1. **Fix a typo** - Simple way to learn the workflow
2. **Add a simple command** - Follow the example in EXAMPLE_WORKFLOW.md
3. **Improve documentation** - Add examples or clarify instructions
4. **Add error handling** - Improve robustness of existing commands
5. **Add tests** - Help improve code quality

## Getting Help

- **Documentation unclear?** - Open an issue to improve it
- **Stuck on code?** - Check existing commands for examples
- **Bug found?** - Open an issue with details and steps to reproduce
- **Feature idea?** - Open an issue to discuss before coding

---

Welcome aboard! 🏀 We're excited to have you contribute to LEAGUEbuddy!
