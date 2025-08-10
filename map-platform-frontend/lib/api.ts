// Placeholder for the API client
// This will handle all backend API calls

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000'

export class ApiClient {
  // Project endpoints
  static async createProject(data: any) {
    // To be implemented
    console.log('Creating project:', data)
  }

  static async getProjects() {
    // To be implemented
    console.log('Fetching projects')
  }

  // Place endpoints
  static async addPlace(projectId: string, data: any) {
    // To be implemented
    console.log('Adding place to project:', projectId, data)
  }

  // Route endpoints
  static async getRoute(from: string, to: string) {
    // To be implemented
    console.log('Getting route from', from, 'to', to)
  }

  // Upload endpoints
  static async uploadFile(file: File) {
    // To be implemented
    console.log('Uploading file:', file.name)
  }
} 