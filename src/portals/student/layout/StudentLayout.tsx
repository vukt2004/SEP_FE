import React from "react";

const StudentLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="student-layout">
      <header className="header">
        <h1>Student Portal</h1>
      </header>
      <nav className="sidebar">
        <ul>
          <li>
            <a href="/dashboard">Dashboard</a>
          </li>
          <li>
            <a href="/courses">Courses</a>
          </li>
          <li>
            <a href="/grades">Grades</a>
          </li>
          <li>
            <a href="/profile">Profile</a>
          </li>
        </ul>
      </nav>
      <main className="content">{children}</main>
    </div>
  );
};

export default StudentLayout;
