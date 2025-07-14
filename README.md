# Transaction Visualiser

A modern, interactive transaction visualisation tool for financial investigations and money laundering detection, built with React, Vite, TypeScript, and D3.js. This project visualises account transactions through multiple perspectives: flow charts, tree graphs, and time-based flows, supporting advanced interactivity and red-flag surfacing for suspicious activity.

## Features

### 📊 Three Visualization Modes

- **Flow Chart**: Interactive Sankey-style diagram showing money flows between accounts over time with zoom/pan capabilities, account focus, and color-coded transaction types.
- **Tree Graph**: Hierarchical visualization of incoming and outgoing transaction trees for selected accounts with depth-limited expansion and red flag indicators.
- **Time Flow**: Time-based flow visualization with account lanes, running balances, and aggregated daily flows between account pairs.

### 🔍 Advanced Interactivity

- **Dual Range Sliders**: Filter by transaction amount and account flow ranges
- **Real-time Filtering**: Dynamic updates across all visualizations
- **Account Focus**: Click to focus on specific accounts and their transactions
- **Flag/Unflag Transactions**: Mark suspicious transactions with red flag icons (🚩)
- **Search & Pagination**: Searchable transaction table with pagination
- **Zoom & Pan**: Interactive navigation for all chart types
- **Reset View**: Quick reset for zoom/pan states
- **Tooltips**: Detailed transaction information on hover

### 🚩 Red Flag Detection

- **Visual Indicators**: Red-colored flows and flag icons for flagged transactions
- **Suspicious Pattern Detection**: Built-in detection for structuring, layering, and integration patterns
- **Money Laundering Simulation**: Comprehensive sample data including realistic laundering scenarios

### 🎨 Professional UI

- **Responsive Design**: Works across different screen sizes
- **Consistent Styling**: Unified theming and professional appearance
- **TypeScript**: Full type safety for all data and components
- **Modern React**: Built with React 19 for optimal performance

## Sample Data

The application includes comprehensive sample data covering:

### Normal Transactions (July-September 2024)
- Salary payments from Acme Corp to employees
- Daily expenses (groceries, utilities, electronics)
- Account structuring patterns (own account transfers)
- Cross-person transfers between savings accounts

### Money Laundering Simulation (September)
A realistic money laundering scenario demonstrating:

1. **Placement Phase**: Large cash deposit ($25,000)
2. **Layering Phase**: Rapid transfers through shell companies and mule accounts
3. **Integration Phase**: High-value purchases (luxury cars, jewelry, art, property)

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

### Deployment

```sh
npm run deploy
```

The app is configured for GitHub Pages deployment at `https://tarunbolla.github.io/txn-visualiser/`

### Linting

```sh
npm run lint
```

## Project Structure

```
src/
├── components/
│   ├── Chart.tsx           # Flow chart visualization (Sankey-style)
│   ├── TimeFlow.tsx        # Time-based flow visualization
│   ├── TreeGraph.tsx       # Transaction tree visualization
│   ├── Controls.tsx        # UI controls and filters
│   ├── TransactionsTable.tsx # Transaction data table
│   ├── DualRangeSlider.tsx # Custom range slider component
│   └── Tooltip.tsx         # Interactive tooltips
├── data.ts                 # Data types, config, and sample data
├── App.tsx                 # Main application component
├── App.css                 # Application styles
└── main.tsx               # Application entry point
```

## Key Components

### Chart.tsx
- Sankey-style flow visualization
- Interactive account focus
- Zoom and pan capabilities
- Color-coded transaction types
- Red flag detection for flows

### TimeFlow.tsx
- Time-based account lane visualization
- Running balance tracking
- Daily flow aggregation
- Horizontal timeline navigation
- Red coloring for flagged flows

### TreeGraph.tsx
- Hierarchical transaction trees
- Incoming/outgoing transaction analysis
- Depth-limited expansion (max 8 levels)
- Red flag icons for flagged transactions
- Context menus for account focus

### Controls.tsx
- Dual range sliders for filtering
- Real-time filter updates
- Amount and flow range controls

## Red Flag Surfacing

- **TreeGraph**: Red flag icons (🚩) appear next to transaction counts when any transaction in a node is flagged
- **TimeFlow**: Flow bands are colored red when any transaction in the flow is flagged
- **Flow Chart**: Flows are highlighted in red for flagged transactions
- **Transaction Table**: Flagged transactions show active red flag icons

## Customisation

- **Data**: Update `src/data.ts` to add or modify accounts and transactions
- **Configuration**: Adjust chart settings in the `config` object in `src/data.ts`
- **Styling**: Modify `src/App.css` for custom theming
- **Visualization Limits**: Configure tree depth and children limits in `config.treeGraph`

## Use Cases

This tool is designed for:
- **Financial crime investigators**
- **Compliance officers**
- **Banking security teams**
- **Regulatory authorities**
- **Forensic accountants**
- **Anti-money laundering (AML) professionals**

## Technology Stack

- **React 19** - Modern UI framework
- **TypeScript** - Type safety and developer experience
- **D3.js** - Advanced data visualization
- **Vite** - Fast build tool and dev server
- **GitHub Pages** - Static hosting

## License

MIT

---

_Built with React, Vite, TypeScript, and D3.js for modern, high-performance financial investigation and money laundering detection._
