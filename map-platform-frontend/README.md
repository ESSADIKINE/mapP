# Map Platform Frontend

A SaaS-like platform for creating interactive map projects with satellite imagery, 360° panoramas, and route visualization.

## Features

### Project Management
- **Principal Place**: Set a main location for your project
- **Secondary Places**: Add multiple secondary locations
- **360° Panoramas**: Upload and view immersive 360° images for each location
- **Route Computation**: Calculate routes from principal to secondary places using OSRM
- **Real-time Preview**: See your project on a satellite map as you build it

### Export Functionality
- **Self-contained ZIP**: Export complete projects as standalone HTML files
- **Route Inclusion**: Routes are automatically included in exports
- **360° Images**: All panorama images are bundled with the export
- **Satellite Maps**: Uses MapLibre GL with satellite imagery
- **Responsive Design**: Works on desktop and mobile devices

### Enhanced Export Features
- **Modern UI**: Professional header with navigation menu
- **Project Sidebar**: List of all secondary places with click-to-view functionality
- **360° Modal**: Full-screen panorama viewer with route button
- **Route Display**: Visualize routes between principal and secondary places
- **Navigation Controls**: Home, About Us, and Projects navigation
- **Responsive Layout**: Adapts to different screen sizes

## Usage

### Creating a Project
1. Set your principal place location and details
2. Add secondary places by clicking on the map or using the "Add" button
3. Upload 360° images for each location
4. Compute routes using the "Route" button on each secondary place
5. Save your project

### Exporting
1. Click the "Export" button in the header
2. Configure export options:
   - **Mirror images locally**: Include images in the export package
   - **Inline data**: Embed project data directly in HTML
   - **Include local libs**: Bundle MapLibre and Pannellum libraries
   - **Include routes**: Ensure routes are included in the export
   - **Style URL**: Customize the map style
3. Download the ZIP file containing your standalone project

### Exported Project Features
The exported `map.html` file includes:
- **Header Navigation**: Home, About Us, Projects menu
- **Satellite Map**: Interactive MapLibre GL map with satellite imagery
- **Project Sidebar**: List of all secondary places
- **360° Viewer**: Full-screen panorama viewer with Pannellum
- **Route Visualization**: Display routes from principal to secondary places
- **Responsive Design**: Works on all devices

## Technical Details

### Dependencies
- **MapLibre GL**: For interactive satellite maps
- **Pannellum**: For 360° panorama viewing
- **OSRM**: For route computation
- **Next.js**: React framework for the frontend
- **Zustand**: State management

### Export Structure
```
project-export.zip/
├── map.html              # Main interactive map
├── data/
│   └── project.json      # Project data (if not inlined)
├── assets/
│   ├── css/
│   │   └── styles.css    # Styling
│   └── js/
│       └── app.js        # Application logic
└── libs/                 # Local libraries (optional)
    ├── maplibre-gl.js
    ├── maplibre-gl.css
    ├── pannellum.js
    └── pannellum.css
```

### Route Data Format
Routes are stored as GeoJSON LineString features with metadata:
```json
{
  "profile": "driving",
  "distance_m": 1500,
  "duration_s": 300,
  "geometry": {
    "type": "LineString",
    "coordinates": [[lng1, lat1], [lng2, lat2], ...]
  }
}
```

## Development

### Running Locally
```bash
npm install
npm run dev
```

### Building for Production
```bash
npm run build
npm start
```

## API Integration

The platform integrates with a backend API for:
- Project storage and retrieval
- Image upload and management
- Route computation via OSRM
- Export generation

## License

This project is proprietary software for ROF PRAMASA.
