import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import './Dashboard.scss';

const Dashboard = () => {
  const { user, isAdmin, isArtisan } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (isAdmin) {
      navigate('/admin');
    } else if (isArtisan) {
      navigate('/artisan');
    }
  }, [isAdmin, isArtisan, navigate]);

  return (
    <div className="dashboard">
      <h1>Tableau de bord</h1>
      <p>Bienvenue {user?.first_name} {user?.last_name} !</p>
    </div>
  );
};

export default Dashboard;

