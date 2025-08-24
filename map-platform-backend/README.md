# Map Platform Backend

A Node.js/Express API for a SaaS-like mapping platform with projects, places, routes, and file uploads.

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
Create a `.env` file in the root directory with the following variables:

```bash
# Copy the content from env-config.txt to .env
```

**Required:**
- `MONGODB_URI`: MongoDB connection string
- `PORT`: Server port (defaults to 4000)
- `CORS_ORIGIN`: Allowed CORS origins

**Optional:**
- `OSRM_HOST`: Custom OSRM server (defaults to router.project-osrm.org)
- `CLOUDINARY_*`: For Cloudinary file uploads

### 3. MongoDB Setup
You have two options:

**Option A: Local MongoDB**
1. Install MongoDB locally
2. Start MongoDB service
3. Set `MONGODB_URI=mongodb://localhost:27017/map-platform`

**Option B: MongoDB Atlas (Cloud)**
1. Create a MongoDB Atlas account
2. Create a cluster
3. Get your connection string
4. Set `MONGODB_URI=your_atlas_connection_string`

### 4. Run the Application

**Development mode:**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

## API Endpoints

- `GET /health` - Health check
- `GET /api/projects` - List projects
- `POST /api/projects` - Create project
- `GET /api/projects/:id/places` - List places in project
- `POST /api/upload` - File upload
- `GET /api/route` - Route calculation
- `POST /api/projects/:id/export` - Stream project as static ZIP bundle

### Export Bundles
To include MapLibre and Pannellum assets locally in the exported bundle, install
`maplibre-gl` and `pannellum` in the backend. If these packages are not
available, the exporter automatically references CDN-hosted versions.

## Troubleshooting

### MongoDB Connection Issues
- Ensure MongoDB is running (local) or accessible (Atlas)
- Check your connection string format
- Verify network connectivity for cloud databases
- Check firewall settings

### Environment Variables
- Ensure `.env` file exists in root directory
- Verify all required variables are set
- Restart the application after changing `.env` 
