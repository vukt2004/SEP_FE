import React from "react";
import StudentLayout from "../layout/StudentLayout";

export const HomePage: React.FC = () => {
  return (
    <StudentLayout>
      <div style={{ padding: "20px" }}>
        <h1>Welcome to Student Home</h1>
        <p>This is a simple home page for testing.</p>
        <button onClick={() => alert("Button clicked!")}>Test Button</button>
      </div>
    </StudentLayout>
  );
};

export default HomePage;
