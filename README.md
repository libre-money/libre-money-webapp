# Libre Money

Free and Open Source Personal Finance Tracking Application that makes sense.

## About

**Libre Money** is a comprehensive, privacy-focused personal finance management application built as a Progressive Web App (PWA). It works seamlessly offline and puts you in complete control of your financial data.

### Key Features

- 💰 Complete financial tracking: income, expenses, assets, debts, and wallets
- 📱 Offline-first with PouchDB
- 🔄 Optional cloud synchronization
- 📈 Analytics, reports, and budget analysis
- 🏷️ Flexible organization with tags, parties, and categories
- 💵 Multi-currency support
- 📝 Templates and quick entry
- 🎯 Rolling budgets
- 📊 Full double-entry bookkeeping
- 🌙 Dark mode support

### Technology Stack

- **Frontend:** Vue 3 with Composition API
- **UI Framework:** Quasar Framework (+ Material Design 3)
- **Language:** TypeScript
- **Offline Storage:** PouchDB
- **Build Tool:** Quasar CLI with Vite

## Development Setup

### Install dependencies

```bash
npm install
```

### Set up environment variables

Create a `.env` file in the root directory using `.env.example` as a template:

```bash
cp .env.example .env
```

### Start development server

```bash
npm run dev
```

### Type checking

```bash
npm run type-check
```

### Lint and format

```bash
npm run lint
npm run format
```

### Build for production

```bash
npm run build
```

## Documentation

- [Design Guidelines](docs/design-guidelines.md)

## Authors

Founded by [Sayem Shafayet](https://github.com/iShafayet), now maintained by a small but highly dedicated [team](https://github.com/libre-money).

## License

[GNU General Public License v3.0](LICENSE)

## Links

- **Organization:** [libre-money](https://github.com/libre-money)
- **Contact:** [libre.money.support@proton.me](mailto:libre.money.support@proton.me)
