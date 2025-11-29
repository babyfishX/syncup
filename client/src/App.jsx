import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import CreateEventForm from './components/CreateEventForm';
import EventView from './components/EventView';

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<CreateEventForm />} />
                <Route path="/event/:id" element={<EventView />} />
            </Routes>
        </Router>
    );
}

export default App;
