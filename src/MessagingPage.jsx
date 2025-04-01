import React from "react";

const MessagingPage = () => {
  return (
    <div style={styles.container}>
      <h1>Your conversations will be here</h1>
    </div>
  );
};

const styles = {
  container: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
    backgroundColor: "#f5f5f5",
    fontFamily: "Arial, sans-serif",
    color: "#333",
  },
};

export default MessagingPage;
