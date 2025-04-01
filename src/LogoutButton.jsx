import React from "react";
import { invoke } from "@tauri-apps/api/core";
import { useNavigate } from "react-router";

const LogoutButton = () => {


  const navigate=useNavigate();


  const logout = async () => {
    const token = localStorage.getItem("token");
  
    if (!token) return;
  
    try {
        await invoke("logout", { token });
        localStorage.removeItem("token");
        navigate("/");
    } catch (error) {
        console.error("Logout failed", error);
        alert("An error occurred while logging out. Please try again.");
    }
  };


    return (
        <button onClick={logout}>
            Logout
        </button>
    );
};



export default LogoutButton;