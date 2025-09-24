import axios from 'axios';

// Configuration
const API_BASE = 'http://localhost:4000/api';
    const PROJECT_ID = '68b481962342d613c92574ed'; // Replace with your actual project ID

// Test model URL (from the upload we saw in logs)
const MODEL_URL = './uploads/1756660115054_4ab7b77c0b8f72ce5c9a940df47904e0_glb.glb';

async function fixModelUrls() {
  try {
    console.log('Fixing 3D model URLs for project:', PROJECT_ID);
    
    // First, let's get the project to see the current state
    const projectResponse = await axios.get(`${API_BASE}/projects/${PROJECT_ID}`);
    const project = projectResponse.data;
    
    console.log('Current project state:');
    console.log('Principal place:', project.principal.name);
    console.log('Principal model3d:', project.principal.model3d);
    console.log('Secondary places:', project.secondaries.map(s => ({ name: s.name, model3d: s.model3d })));
    
    // Fix principal place model3d
    console.log('\nFixing principal place model3d...');
    const principalModel3d = {
      url: MODEL_URL,
      useAsMarker: false,
      scale: 1,
      rotation: [0, 0, 0],
      altitude: 0
    };
    
    await axios.put(`${API_BASE}/projects/${PROJECT_ID}/principal/model3d`, {
      model3d: principalModel3d
    });
    console.log('✅ Principal place model3d updated');
    
    // Fix secondary places model3d
    for (let i = 0; i < project.secondaries.length; i++) {
      const place = project.secondaries[i];
      console.log(`\nFixing secondary place ${i + 1}: ${place.name}`);
      
      const secondaryModel3d = {
        url: MODEL_URL,
        useAsMarker: true,
        scale: 1,
        rotation: [0, 0, 0],
        altitude: 0
      };
      
      await axios.put(`${API_BASE}/projects/${PROJECT_ID}/places/${place._id}/model3d`, {
        model3d: secondaryModel3d
      });
      console.log(`✅ Secondary place ${i + 1} model3d updated`);
    }
    
    // Verify the fixes
    console.log('\nVerifying fixes...');
    const updatedProjectResponse = await axios.get(`${API_BASE}/projects/${PROJECT_ID}`);
    const updatedProject = updatedProjectResponse.data;
    
    console.log('Updated project state:');
    console.log('Principal model3d:', updatedProject.principal.model3d);
    console.log('Secondary models:', updatedProject.secondaries.map(s => ({ name: s.name, model3d: s.model3d })));
    
    console.log('\n🎉 All model URLs have been fixed!');
    console.log('You can now export the project and the 3D models should be included.');
    
  } catch (error) {
    console.error('Error fixing model URLs:', error.response?.data || error.message);
  }
}

fixModelUrls();
