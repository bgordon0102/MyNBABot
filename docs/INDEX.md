# 📚 Documentation Index

Welcome to LEAGUEbuddy! Here's a guide to all available documentation.

## Quick Links

### 🚀 Getting Started
- **[README.md](../README.md)** - Project overview and quick setup
- **[New Contributor Checklist](NEW_CONTRIBUTOR_CHECKLIST.md)** - Step-by-step guide for new contributors
- **[CONTRIBUTING.md](../CONTRIBUTING.md)** - How to contribute to the project

### 👨‍💻 Development
- **[DEVELOPMENT.md](DEVELOPMENT.md)** - Developer reference and API guide
- **[Example Workflow](EXAMPLE_WORKFLOW.md)** - Complete example of adding a new command

### 🔧 Deployment
- **[DEPLOYMENT.md](../DEPLOYMENT.md)** - How to deploy the bot to production
- **[EA Sports Integration](EA_SPORTS_INTEGRATION.md)** - EA Sports API integration guide

## Documentation by Role

### For New Contributors
1. Start with [New Contributor Checklist](NEW_CONTRIBUTOR_CHECKLIST.md)
2. Read [CONTRIBUTING.md](../CONTRIBUTING.md)
3. Follow [Example Workflow](EXAMPLE_WORKFLOW.md)
4. Reference [DEVELOPMENT.md](DEVELOPMENT.md) as needed

### For Developers
1. Quick start: [README.md](../README.md)
2. API reference: [DEVELOPMENT.md](DEVELOPMENT.md)
3. Code patterns: [Example Workflow](EXAMPLE_WORKFLOW.md)
4. Data structure: `../data/README_LEAGUEbuddy_data_structure.txt`

### For Maintainers
1. Project overview: [README.md](../README.md)
2. Deployment: [DEPLOYMENT.md](../DEPLOYMENT.md)
3. Contribution guidelines: [CONTRIBUTING.md](../CONTRIBUTING.md)

## Project Structure

```
LEAGUEbuddy/
├── README.md                    # Project overview
├── CONTRIBUTING.md              # Contribution guidelines
├── DEPLOYMENT.md                # Deployment instructions
├── docs/
│   ├── INDEX.md                 # This file
│   ├── NEW_CONTRIBUTOR_CHECKLIST.md  # Getting started guide
│   ├── DEVELOPMENT.md           # Developer reference
│   ├── EXAMPLE_WORKFLOW.md      # Complete example
│   └── EA_SPORTS_INTEGRATION.md # EA API integration
├── src/
│   ├── commands/                # Discord commands
│   ├── interactions/            # Button/menu handlers
│   └── utils/                   # Utility functions
└── data/                        # JSON data storage
```

## Key Concepts

### Commands
Discord slash commands that users can execute. Located in:
- `src/commands/staff/` - Staff-only commands
- `src/commands/coach/` - Coach commands

See [DEVELOPMENT.md](DEVELOPMENT.md#command-structure) for details.

### Interactions
Handlers for buttons, select menus, and modals. Located in:
- `src/interactions/`

See [DEVELOPMENT.md](DEVELOPMENT.md#interaction-handler-structure) for details.

### Data Storage
JSON files storing league state. Located in:
- `data/2k/` - NBA 2K league data (season, standings, schedules)
- `data/*.json` - Configuration files

## Common Tasks

| Task | Documentation |
|------|---------------|
| Set up development environment | [New Contributor Checklist](NEW_CONTRIBUTOR_CHECKLIST.md) |
| Add a new command | [Example Workflow](EXAMPLE_WORKFLOW.md) |
| Add a button/menu handler | [Example Workflow](EXAMPLE_WORKFLOW.md#example-adding-an-interaction-handler) |
| Debug issues | [DEVELOPMENT.md](DEVELOPMENT.md#debugging-tips) |
| Deploy to production | [DEPLOYMENT.md](../DEPLOYMENT.md) |
| Integrate EA Sports API | [EA_SPORTS_INTEGRATION.md](EA_SPORTS_INTEGRATION.md) |

## Getting Help

### Found an Issue?
1. Check if it's documented here
2. Search existing issues on GitHub
3. Open a new issue with details

### Need Clarification?
1. Check the relevant documentation
2. Look at existing code examples
3. Ask in Discord or open a discussion

### Want to Contribute?
1. Read [CONTRIBUTING.md](../CONTRIBUTING.md)
2. Follow [New Contributor Checklist](NEW_CONTRIBUTOR_CHECKLIST.md)
3. Submit a pull request

## Resources

### External Documentation
- [Discord.js Guide](https://discordjs.guide/)
- [Discord.js API Docs](https://discord.js.org/)
- [Discord Developer Portal](https://discord.com/developers/docs/)
- [Node.js Documentation](https://nodejs.org/docs/)

### Repository Links
- [GitHub Repository](https://github.com/bgordon0102/LEAGUEbuddy)
- [Issues](https://github.com/bgordon0102/LEAGUEbuddy/issues)
- [Pull Requests](https://github.com/bgordon0102/LEAGUEbuddy/pulls)

## Version Information

- **Discord.js**: v14.23.2
- **Node.js**: >= 18.0.0
- **Module System**: ES Modules (import/export)

## Update History

This documentation was created to facilitate collaboration on the LEAGUEbuddy project. For the most up-to-date information, check the GitHub repository.

---

**Ready to start?** Head to the [New Contributor Checklist](NEW_CONTRIBUTOR_CHECKLIST.md)! 🏀
