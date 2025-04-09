import React from 'react';
import { Link, useLocation } from 'react-router-dom';

function Sidebar() {
  const location = useLocation();

  const menuItems = [
    { name: 'Dashboard', path: '/' },
    { name: 'Patient Info', path: '/patients' },
    { name: 'Blood Network', path: '/blood-network' },
    { name: 'Hospital to Hospital Connection', path: '/hospital-connection' },
    { name: 'Inventory Management', path: '/inventory' },
    { name: 'Insurances', path: '/insurances' },
  ];

  return (
    <div className="w-64 h-screen bg-gray-50 border-r border-gray-200 flex flex-col">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-blue-600">HealthcareApp</h1>
      </div>
      <nav className="flex-1">
        <ul className="space-y-2 p-4">
          {menuItems.map((item) => (
            <li key={item.name}>
              <Link
                to={item.path}
                className={`flex items-center p-3 rounded-lg text-gray-700 hover:bg-blue-100 hover:text-blue-600 transition ${
                  location.pathname === item.path ? 'bg-blue-100 text-blue-600' : ''
                }`}
              >
                <span>{item.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

export default Sidebar;