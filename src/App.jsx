import { BrowserRouter, Routes, Route } from 'react-router-dom'
import ChildPage from './pages/ChildPage.jsx'
import ParentPage from './pages/ParentPage.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ChildPage />} />
        <Route path="/parent" element={<ParentPage />} />
      </Routes>
    </BrowserRouter>
  )
}
