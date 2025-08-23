# Map Platform Frontend

A modern React/Next.js frontend for the Map Platform, featuring interactive maps, 360° image viewing, drag & drop place management, and real-time routing.

## 🚀 Features (To be implemented)

- **Interactive Maps**: MapLibre GL integration with satellite imagery
- **360° Image Viewer**: Pannellum integration for immersive viewing
- **Drag & Drop**: Place ordering and management with @dnd-kit
- **File Upload**: Drag & drop file uploads with react-dropzone
- **Real-time Routing**: OSRM integration for real road route calculation
- **Project Management**: Create and manage mapping projects
- **Responsive Design**: Tailwind CSS for modern, mobile-friendly UI

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Maps**: MapLibre GL (open-source alternative to Mapbox)
- **360° Viewer**: Pannellum
- **Drag & Drop**: @dnd-kit
- **File Upload**: react-dropzone
- **HTTP Client**: Built-in fetch API

## 📦 Installation

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
Create a `.env.local` file in the root directory:

```bash
# Copy the content from env-config.txt to .env.local

# Map Configuration
NEXT_PUBLIC_MAP_STYLE=https://demotiles.maplibre.org/style.json

# Backend API
NEXT_PUBLIC_BACKEND_URL=http://localhost:4000

# Optional: Mapbox (if you want to use Mapbox instead of MapLibre)
# NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your_mapbox_token_here
```

### 3. Start Development Server
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## 🏗️ Project Structure

```
map-platform-frontend/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   └── globals.css        # Global styles
├── components/             # React components
│   ├── Map/               # Map-related components
│   ├── ProjectForm/       # Project creation form
│   ├── PlaceManager/      # Place management with drag & drop
│   ├── ImageViewer/       # 360° image viewer
│   └── FileUpload/        # File upload component
├── lib/                    # Utility libraries
│   ├── api.ts             # API client
│   └── store.ts           # Zustand store
├── types/                  # TypeScript definitions
│   └── index.ts           # Main type definitions
├── public/                 # Static assets
└── package.json            # Dependencies and scripts
```

## 🔧 Development

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Component Development
Each component is currently a placeholder. To implement:

1. **MapComponent**: Integrate MapLibre GL for interactive mapping
2. **ProjectForm**: Create forms for project and place creation
3. **PlaceManager**: Implement drag & drop with @dnd-kit
4. **ImageViewer**: Add Pannellum for 360° viewing
5. **FileUpload**: Implement file upload with react-dropzone

### State Management
The Zustand store (`lib/store.ts`) provides global state for:
- Projects list and current project
- Places management
- Loading states and error handling

### API Integration
The API client (`lib/api.ts`) handles communication with your backend:
- Project CRUD operations
- Place management
- Route calculation
- File uploads

## 🎨 Styling

The project uses Tailwind CSS with custom configuration:
- Custom color palette (primary, secondary)
- Responsive design utilities
- Custom component styles
- MapLibre GL integration styles

## 🗺️ Map Configuration

### MapLibre GL (Default)
- Open-source alternative to Mapbox
- Uses public demo tiles
- Customizable map styles
- No API key required

### Mapbox (Optional)
To switch to Mapbox:
1. Get a Mapbox access token
2. Update environment variables
3. Change imports from `maplibre-gl` to `mapbox-gl`
4. Update map style URLs

## 📱 Responsive Design

The application is designed to work on:
- Desktop computers
- Tablets
- Mobile devices
- Touch interfaces

## 🔒 Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `NEXT_PUBLIC_MAP_STYLE` | Map style URL | Yes | MapLibre demo style |
| `NEXT_PUBLIC_BACKEND_URL` | Backend API URL | Yes | `http://localhost:4000` |
| `NEXT_PUBLIC_OSRM_HOST` | OSRM server URL (e.g. http://localhost:5000) | No | router.project-osrm.org |
| `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` | Mapbox token | No | - |

## 🛣️ Real Road Routing

The application now supports real road routing using the **Open Source Routing Machine (OSRM)** service.

### Features
- **Real Road Paths**: Routes follow actual road networks instead of straight lines
- **Supported Profiles**: `driving`, `walking`, `cycling`
- **Fallback Support**: Graceful fallback to enhanced mock routing when the service is unavailable

### Setup
1. (Optional) Self-host an OSRM server or use the public demo at `https://router.project-osrm.org`
2. Add to `.env.local` if self-hosting: `NEXT_PUBLIC_OSRM_HOST=http://localhost:5000`
3. Routes will automatically use the configured OSRM server

### Route Visualization
- **Enhanced Styling**: Thicker lines with white outlines for better visibility
- **Road Network**: Routes curve and follow realistic road paths
