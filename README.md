# Baby Book App

A Vue.js application for tracking baby feedings and diaper changes with local storage persistence and CSV export/import functionality.

## Features

- **Baby Management**: Add and manage multiple babies
- **Feeding Tracking**: Record breast, formula, and solid feedings with amounts and notes
- **Diaper Changes**: Track wet, dirty, or both diaper changes with notes
- **Data Persistence**: All data is automatically saved to localStorage
- **CSV Export/Import**: Backup and restore your data with CSV files
- **Responsive Design**: Works on desktop and mobile devices
- **PWA Ready**: Progressive Web App support for mobile installation

## Tech Stack

- **Vue 3** - Frontend framework with Composition API
- **TypeScript** - Type safety and better development experience
- **Pinia** - State management
- **Vite** - Build tool and development server
- **Tailwind CSS** - Utility-first CSS framework
- **Vite PWA Plugin** - Progressive Web App functionality

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/babybook.git
   cd babybook
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:5174`

## Usage

### Adding Babies
- Click the "Add Baby" button
- Enter the baby's name
- Click "Add" to create the baby

### Recording Feedings
- For each baby, click the "Add Feeding" button
- Select the feeding type (breast, formula, or solid)
- Enter the amount
- Add optional notes
- Click "Save"

### Recording Diaper Changes
- For each baby, click the "Add Diaper Change" button
- Select the type (wet, dirty, or both)
- Add optional notes
- Click "Save"

### Data Management
- Click "Show Data Manager" in the header
- **Export Data**: Click "Export All Data" to download CSV files
- **Import Data**: Select CSV files to import (overwrites existing data)

## Data Export/Import

### Export
The app exports three separate CSV files:
- `babybook-babies-YYYY-MM-DD.csv` - Baby information
- `babybook-feedings-YYYY-MM-DD.csv` - Feeding records
- `babybook-diaper-changes-YYYY-MM-DD.csv` - Diaper change records

### Import
- **Single File**: Import individual CSV files for specific data types
- **Multiple Files**: Import all three files at once for complete backup restore
- **Note**: Importing will overwrite existing data

## Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
src/
├── App.vue                 # Main app container
├── views/
│   └── HomePage.vue        # Main application view
├── components/
│   ├── RecordForm.vue      # Form for adding records
│   ├── HistoryList.vue     # Display of historical records
│   └── DataManager.vue     # CSV import/export functionality
├── stores/
│   └── babyStore.ts        # Pinia store with localStorage persistence
└── assets/                 # Static assets
```

## Data Storage

All data is stored in the browser's localStorage and includes:
- Baby information (ID, name)
- Feeding records (ID, baby ID, timestamp, amount, type, notes)
- Diaper change records (ID, baby ID, timestamp, type, notes)

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

If you encounter any issues or have questions, please open an issue on GitHub.

---

Made with ❤️ for parents tracking their little ones' daily activities.
