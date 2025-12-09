import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import Favorites from './pages/Favorites';
import Profile from './pages/Profile';
import AdminDashboard from './pages/AdminDashboard';
import ArtisanDashboard from './pages/ArtisanDashboard';
import Messages from './pages/Messages';
import './App.scss';

function App() {
  return (
    <NotificationProvider>
      <AuthProvider>
        <Router>
          <div className="App">
            <Navbar />
            <main className="main-content">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/products" element={<Products />} />
                <Route path="/products/:id" element={<ProductDetail />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/orders" element={<Orders />} />
                <Route path="/favorites" element={<Favorites />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/messages" element={<Messages />} />
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/artisan" element={<ArtisanDashboard />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </Router>
      </AuthProvider>
    </NotificationProvider>
  );
}

export default App;

