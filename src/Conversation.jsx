import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useLocation } from "react-router"; 

const useQuery = () => {
  return new URLSearchParams(useLocation().search);
};

const Conversation = () => {
  const query = useQuery();
  const senderId = parseInt(query.get("senderId"), 10); 
  const receiverId = parseInt(query.get("receiverId"), 10);

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const fetchedMessages = await invoke("get_messages", {
          senderId, receiverId
        });
        setMessages(fetchedMessages);
      } catch (error) {
        console.error("Failed to fetch messages:", error);
      }
    };

    if (senderId && receiverId) {
      fetchMessages();
    }
  }, [senderId, receiverId]);

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      const sentMessage = await invoke("send_message", {
        senderId,
        receiverId,
        content: newMessage,
      });

      setMessages((prev) => [...prev, sentMessage]);
      setNewMessage("");
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };
  return (
    <div style={styles.container}>
      <div style={styles.messagesContainer}>
        {messages.map((msg) => (
          <div
            key={msg.message_id}
            style={{
              ...styles.message,
              alignSelf: msg.sender_id === senderId ? "flex-end" : "flex-start",
            }}
          >
            {msg.content}
          </div>
        ))}
      </div>
      <div style={styles.inputContainer}>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type your message..."
          style={styles.input}
        />
        <button onClick={sendMessage} style={styles.sendButton}>
          Send
        </button>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    padding: "20px",
    backgroundColor: "#f9f9f9",
  },
  messagesContainer: {
    flex: 1,
    overflowY: "scroll",
    marginBottom: "10px",
    display: "flex",
    flexDirection: "column",
  },
  message: {
    margin: "5px",
    padding: "10px",
    borderRadius: "8px",
    backgroundColor: "#007bff",
    color: "white",
    maxWidth: "70%",
  },
  inputContainer: {
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
  sendButton: {
    padding: "10px 20px",
    backgroundColor: "#007bff",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
  },
};

export default Conversation;