import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import Dashboard from './components/Dashboard/Dashboard';
import Products from './components/Products/Products';
import Suppliers from './components/Suppliers/Suppliers';
import PurchaseOrders from './components/PurchaseOrders/PurchaseOrders';
import SalesOrders from './components/SalesOrders/SalesOrders';
import Reports from './components/Reports/Reports';
import Algorithms from './components/Algorithms/Algorithms';
import Navbar from './components/Layout/Navbar';
import './App.css';

const PrivateRoute = ({ children }) => {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/*"
              element={
                <PrivateRoute>
                  <Navbar />
                  <div className="main-content">
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/products" element={<Products />} />
                      <Route path="/suppliers" element={<Suppliers />} />
                      <Route path="/purchase-orders" element={<PurchaseOrders />} />
                      <Route path="/sales-orders" element={<SalesOrders />} />
                      <Route path="/reports" element={<Reports />} />
                      <Route path="/algorithms" element={<Algorithms />} />
                    </Routes>
                  </div>
                </PrivateRoute>
              }
            />
          </Routes>
          <ToastContainer position="top-right" autoClose={3000} />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;

