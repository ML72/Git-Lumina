import React from 'react';
import { Route, BrowserRouter, Routes, Navigate } from 'react-router-dom';

/* Your page imports */
import Landing from './pages/Landing';
import Results from './pages/Results';

/* Your CSS */
import './App.css';

const App: React.FC = () => {

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        {/** Page routing here */}
        <Route path="/" element={<Landing />} />
        <Route path="/results" element={<Results />} />

        {/** Redirect for unknown routes */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
