import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useNavigate, useLocation } from "react-router";

import LogoutButton from "./LogoutButton";

const ConversationsList = () => {

    const { state } = useLocation();
    const userId = state?.userId;
  

  const [conversations, setConversations] = useState([]);
  const [newReceiverId, setNewReceiverId] = useState("");
  const navigate = useNavigate();


  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const userConversations = await invoke("get_user_conversations", { userId });
        setConversations(userConversations);
      } catch (error) {
        console.error("Failed to fetch conversations:", error);
      }
    };

    fetchConversations();
  }, [userId]);

  const startNewConversation = () => {
    if (!newReceiverId.trim()) return;
    navigate(`/conversation?senderId=${userId}&receiverId=${newReceiverId}`);
  };

  return (
    <div style={styles.container}>
       <LogoutButton/>
      <h1 style={styles.title}>Your Conversations</h1>
      <ul style={styles.list}>
        {conversations.map((conv) => (
          <li
            key={conv.receiver_id}
            onClick={() =>
              navigate(`/conversation?senderId=${userId}&receiverId=${conv.receiver_id}`)
            }
            style={styles.listItem}
          >
            Conversation with User {conv.receiver_id}
          </li>
        ))}
      </ul>
      <div style={styles.newConversation}>
        <input
          type="text"
          value={newReceiverId}
          onChange={(e) => setNewReceiverId(e.target.value)}
          placeholder="Enter user ID to start a new conversation"
          style={styles.input}
        />
        <button onClick={startNewConversation} style={styles.button}>
          Start Conversation
        </button>
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: "20px",
    backgroundColor: "#f9f9f9",
    height: "100vh",
  },
  title: {
    fontSize: "24px",
    marginBottom: "20px",
  },
  list: {
    listStyle: "none",
    padding: 0,
    marginBottom: "20px",
  },
  listItem: {
    padding: "10px",
    backgroundColor: "#e0e0e0",
    margin: "10px 0",
    cursor: "pointer",
    borderRadius: "5px",
  },
  newConversation: {
    display: "flex",
    alignItems: "center",
  },
  input: {
    flex: 1,
    padding: "10px",
    borderRadius: "4px",
    border: "1px solid #ccc",
    marginRight: "10px",
  },
  button: {
    padding: "10px 20px",
    backgroundColor: "#007bff",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
  },
};

export default ConversationsList;
