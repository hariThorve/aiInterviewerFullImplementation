/**
 * Main Application Component - AI Interview Platform
 * 
 * This is the root component that manages the application's state and routing
 * between different views: Form → Validation → Interview
 * 
 * Application Flow:
 * 1. Form: User fills out personal information and uploads profile photo
 * 2. Validate: Face recognition validation using live camera
 * 3. Interview: AI-powered interview session with real-time evaluation
 * 
 * State Management:
 * - candidateName: Stores the candidate's name for personalization
 * - view: Controls which component is currently displayed
 * - userId: Database ID of the candidate for performance tracking
 * - photoPath: Path to the uploaded profile photo for validation
 * 
 * @author AI Interview Platform Team
 * @version 1.0.0
 */

import './App.css'
import { useState } from 'react'
import Form from './components/Form'
import Interview from './components/Interview'
import Validate from './components/Validate'

function App() {
  // Application state management
  const [candidateName, setCandidateName] = useState('') // Candidate's name for personalization
  const [view, setView] = useState('form') // Current view: 'form', 'validate', or 'interview'
  const [userId, setUserId] = useState(null); // Database ID for performance tracking
  const [photoPath, setPhotoPath] = useState(null); // Path to uploaded profile photo
  const [position, setPosition] = useState('');
  const getAssistantId = () => {
    switch (position) {
      case 'RN':
        return import.meta.env.VITE_VAPI_RN_ASSISTANT_ID;
      case 'LPN':
        return import.meta.env.VITE_VAPI_LPN_ASSISTANT_ID;
      case 'HCA':
        return import.meta.env.VITE_VAPI_HCA_ASSISTANT_ID;
      default:
        return '';
    }
  };

  
  /**
   * Handles form submission and transitions to validation view
   * @param {string} name - Candidate's name
   * @param {string} id - Database user ID
   * @param {string} photoPath - Path to uploaded profile photo
   * @param {string} role - Candidate's selected role
   */
  const handleFormSubmit = (name, id, role, photoPath) => {
    setCandidateName(name)
    setView('validate')
    setUserId(id)
    setPosition(role)
    setPhotoPath(photoPath)
  }

  /**
   * Handles successful validation and transitions to interview view
   */
  const handleValidationSuccess = () => {
    setView('interview')
  }

  return (
    <>
      {/* Conditional rendering based on current view */}
      {view === 'form' && <Form onSubmit={handleFormSubmit} />}
      {view === 'validate' && <Validate photoPath={photoPath} onValidationSuccess={handleValidationSuccess} />}
      {view === 'interview' && (
        <Interview 
          apiKey={import.meta.env.VITE_VAPI_API_KEY}
          assistantId={getAssistantId()}
          userId={userId}
          config={{
            "variableValues": {
              name: candidateName, // Pass candidate name to AI for personalization
            }
          }}
        />
      )}
    </> 
    // Development/testing code (commented out)
    // <>
    // <Form></Form>
    // </>
  )
}

export default App
