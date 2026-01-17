import React from 'react';
import { Route, BrowserRouter, Routes } from 'react-router-dom';

/* Your page imports */
import Landing from './pages/Landing';

/* Your CSS */
import './App.css';

const App: React.FC = () => {

  return (
    <BrowserRouter>
      <Routes>
        {/** Page routing here */}
        <Route path="/" element={<Landing />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
