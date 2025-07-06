# Transaction Visualiser

A modern, interactive transaction visualisation tool for financial investigations, built with React, Vite, TypeScript, and D3.js. This project visualises account transactions as time flows, tree graphs, and summary charts, supporting advanced interactivity and red-flag surfacing for suspicious activity.

## Features

- **TimeFlow Chart**: Visualises money flows between accounts over time using a Sankey-style diagram. Bands are colored red if any transaction in the flow is flagged.
- **TreeGraph**: Shows incoming and outgoing transaction trees for a selected account. Red flag icons (🚩) appear next to transaction counts if any transaction in a node is flagged.
- **Summary Chart**: Overview of credits, debits, and total volume with consistent axis and label styling.
- **Interactivity**:
  - Filter by amount range
  - Context menus for focusing on accounts
  - Flag/unflag transactions
  - Pagination for transaction tables
  - Reset View for zoom/pan
- **Consistent UI**: Unified axis label styling and button placement across all charts.
- **TypeScript**: Full type safety for all data and components.

## Getting Started

### Prerequisites

- Node.js (v16+ recommended)
- npm or yarn

### Installation

```sh
npm install
# or
yarn install
```

### Running the App

```sh
npm run dev
# or
yarn dev
```

Open your browser to the local server URL (usually http://localhost:5173) to view the app.

### Building for Production

```sh
npm run build
# or
yarn build
```

### Linting & Formatting

```sh
npm run lint
```

## Project Structure

- `src/components/Chart.tsx` — Summary chart (credits, debits, volume)
- `src/components/TimeFlow.tsx` — Time-based flow visualisation (Sankey)
- `src/components/TreeGraph.tsx` — Transaction tree visualisation
- `src/components/Controls.tsx` — UI controls (filters, sliders)
- `src/data.ts` — Data types, config, and sample data
- `public/` — Static assets

## Red Flag Surfacing

- **TreeGraph**: If any transaction in a node is flagged (`isFlagged`), a red flag icon (🚩) appears next to the transaction count.
- **TimeFlow**: If any transaction in a flow is flagged, the flow band is colored red for immediate visual attention.

## Customisation

- Update `src/data.ts` to add or modify accounts and transactions.
- Adjust chart and UI settings in the `config` object in `src/data.ts`.

## License

MIT

---

_Built with React, Vite, TypeScript, and D3.js for modern, high-performance financial visualisation._
