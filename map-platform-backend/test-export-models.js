import { buildExportData } from './src/services/export.service.js';

// Mock project data with 3D models
const mockProject = {
  _id: 'test-project-id',
  title: 'Test Project with 3D Models',
  description: 'Testing 3D model export',
  principal: {
    _id: 'principal-1',
    name: 'Principal Place',
    latitude: 40.7128,
    longitude: -74.0060,
    virtualtour: 'https://example.com/panorama.jpg',
    model3d: {
      url: 'https://example.com/model.glb',
      useAsMarker: true,
      scale: 1.0,
      rotation: [0, 0, 0],
      altitude: 0
    }
  },
  secondaries: [
    {
      _id: 'secondary-1',
      name: 'Secondary Place 1',
      latitude: 40.7589,
      longitude: -73.9851,
      virtualtour: 'https://example.com/panorama2.jpg',
      model3d: {
        url: 'https://example.com/model2.glb',
        useAsMarker: false,
        scale: 0.5,
        rotation: [0, 90, 0],
        altitude: 10
      }
    },
    {
      _id: 'secondary-2',
      name: 'Secondary Place 2',
      latitude: 40.7505,
      longitude: -73.9934,
      virtualtour: 'https://example.com/panorama3.jpg'
      // No 3D model for this one
    }
  ]
};

console.log('Testing 3D model export data building...');

try {
  const exportData = buildExportData(mockProject);
  
  console.log('Export data built successfully');
  console.log('Project has models:', !!exportData.principal.model3d || exportData.secondaries.some(s => s.model3d));
  console.log('Principal model:', exportData.principal.model3d);
  console.log('Secondary models:');
  exportData.secondaries.forEach((s, i) => {
    console.log(`  ${i + 1}. ${s.name}:`, s.model3d ? 'Has model' : 'No model');
  });
  
  // Check if models are properly structured
  const hasModels = !!exportData.principal.model3d || exportData.secondaries.some(s => s.model3d);
  console.log('Models detected correctly:', hasModels);
  
} catch (error) {
  console.error('Error building export data:', error);
}
