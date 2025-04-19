import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';


function App() {
  // Check if user is authenticated
  const isAuthenticated = true; // Replace with actual auth check

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return (
    <Router>
     
    </Router>
  );
}

export default App;
