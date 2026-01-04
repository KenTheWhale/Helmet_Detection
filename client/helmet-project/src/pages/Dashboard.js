import React from "react";

const Dashboard = () => {
  const items = [
    "Analytics Overview",
    "User Profile",
    "Notifications",
    "Customer Support",
  ];

  return (
    <>
      <h1 className="page-title">Dashboard</h1>

      <div className="dashboard-grid">
        {items.map((item, index) => (
          <div className="card" key={index}>
            <h3>{item}</h3>
            <p>
              Manage and view details related to {item.toLowerCase()}.
            </p>
          </div>
        ))}
      </div>
    </>
  );
};

export default Dashboard;
