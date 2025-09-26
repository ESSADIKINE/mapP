# Map Platform Monorepo Overview

This repository contains the latest version of the Map Platform, a SaaS-style tool for building and exporting interactive map projects that combine satellite imagery, 360° panoramas, and computed routes.

## Repository Structure

- **map-platform-frontend/** – Next.js application that creators use to design and preview their map projects in real time.
- **map-platform-backend/** – Express.js API that persists project data, uploads media assets, calculates routes, and produces downloadable exports.

## Frontend Highlights

The frontend delivers the authoring experience described below. For detailed usage instructions, see [`map-platform-frontend/README.md`](map-platform-frontend/README.md).

- **Project workspace** with a principal place and any number of secondary places managed through a form-driven UI.
- **Interactive MapLibre canvas** that visualises the project using satellite imagery while you edit.
- **360° media support** allowing uploads for principal and secondary places, plus optional tour URLs.
- **Route generation controls** that fetch OSRM directions from the principal place to each secondary place.
- **Export dialog** for generating a self-contained ZIP that includes data, imagery, MapLibre, and Pannellum assets.
- **Responsive layout** with a modern navigation header, sidebar place list, and modal panorama viewer inside exported projects.

## Backend Highlights

The backend powers persistence, media, routing, and export workflows. See [`map-platform-backend/README.md`](map-platform-backend/README.md) for setup details.

- **Projects & places REST API** for creating, listing, and updating project structures in MongoDB.
- **Image upload endpoint** that stores 360° panoramas and logos on Cloudinary.
- **OSRM integration** to compute travel routes between the principal place and each secondary place.
- **Static export builder** that assembles a standalone HTML package referencing either bundled or CDN-hosted MapLibre and Pannellum libraries.
- **Health & configuration checks** via `/health` and environment-based configuration (MongoDB URI, OSRM host, etc.).

## Typical Authoring Flow

1. Launch the frontend (`npm run dev`), define the project metadata, and choose a principal location on the map.
2. Add secondary places by clicking the map or using the "Add" button, provide their details, and upload 360° imagery if available.
3. Generate routes for each secondary place to visualise connectivity from the principal site.
4. Use the export dialog to download a ZIP containing `map.html`, project data, media assets, and optional local library copies.
5. Share the exported bundle with stakeholders, who can explore the project offline with the built-in map, sidebar navigation, panorama modal, and route overlays.

## Technology Stack

- **Frontend:** Next.js, React, Tailwind CSS, Zustand, MapLibre GL, Pannellum.
- **Backend:** Node.js, Express, MongoDB (via Mongoose), Cloudinary SDK, OSRM API, archiver for ZIP exports.

## Version Status

This document reflects the capabilities captured in the existing frontend and backend READMEs and matches the UI shown in the latest build, featuring the principal/secondary place workflow, 360° panorama previews, route management, and export tooling.
