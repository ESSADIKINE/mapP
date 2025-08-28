import { buildExportData } from './src/services/export.service.js';
import { Project } from './src/models/Project.js';

async function testExport() {
  try {
    // Get a project from the database
    const project = await Project.findOne().lean();
    
    if (!project) {
      console.log('No projects found in database');
      return;
    }
    
    console.log('Testing export for project:', project.title);
    console.log('Project ID:', project._id);
    
    // Test the buildExportData function
    const exportData = buildExportData(project, { inlineData: true });
    
    console.log('Export data built successfully');
    console.log('Principal virtual tour:', exportData.principal.virtualtour);
    console.log('Secondary places:', exportData.secondaries.length);
    
    exportData.secondaries.forEach((s, i) => {
      console.log(`Secondary ${i + 1}:`, s.name, 'Virtual tour:', s.virtualtour);
    });
    
    console.log('✅ Export test completed successfully');
    
  } catch (error) {
    console.error('❌ Export test failed:', error);
  }
}

// Run the test
testExport();
