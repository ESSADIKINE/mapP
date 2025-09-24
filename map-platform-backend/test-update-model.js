import { Project } from './src/models/Project.js';
import { connectDB } from './src/config/db.js';

// Test data - replace with actual project and place IDs from your database
const TEST_PROJECT_ID = '68b48048ba9ee453a6bbd1da'; // Replace with actual project ID
const TEST_PLACE_ID = '68b48046ba9ee453a6bbd1d5'; // Replace with actual place ID

async function testUpdateModel() {
  try {
    await connectDB(process.env.MONGODB_URI);
    console.log('Connected to database');

    // Find the project
    const project = await Project.findById(TEST_PROJECT_ID);
    if (!project) {
      console.error('Project not found');
      return;
    }

    console.log('Found project:', project.title);
    console.log('Principal place:', project.principal.name);
    console.log('Principal model3d before:', project.principal.model3d);

    // Update the principal place with a test model URL
    project.principal.model3d = {
      url: './uploads/1756656136232_8a8cf314e4df64339ac2332f9cd615ff_glb',
      useAsMarker: false,
      scale: 1,
      rotation: [0, 0, 0],
      altitude: 0
    };

    await project.save();
    console.log('Project updated successfully');

    // Verify the update
    const updatedProject = await Project.findById(TEST_PROJECT_ID);
    console.log('Principal model3d after:', updatedProject.principal.model3d);

    // Also update a secondary place if it exists
    if (updatedProject.secondaries.length > 0) {
      const secondaryPlace = updatedProject.secondaries[0];
      console.log('Secondary place before:', secondaryPlace.name, secondaryPlace.model3d);

      secondaryPlace.model3d = {
        url: './uploads/1756656136232_8a8cf314e4df64339ac2332f9cd615ff_glb',
        useAsMarker: true,
        scale: 0.5,
        rotation: [0, 90, 0],
        altitude: 10
      };

      await updatedProject.save();
      console.log('Secondary place updated successfully');

      const finalProject = await Project.findById(TEST_PROJECT_ID);
      console.log('Secondary place after:', finalProject.secondaries[0].name, finalProject.secondaries[0].model3d);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

testUpdateModel();
