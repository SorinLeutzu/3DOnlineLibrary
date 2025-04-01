import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";


import ProtectedRoute from "./ProtectedRoute";
import LoginPage from "./LoginPage";

import { BrowserRouter, Routes, Route } from "react-router";

import RegisterPage from "./RegisterPage";
import Room3D from "./Room3D";
import MessagingPage from "./MessagingPage";
import ConversationsList from "./ConversationsList";
import Conversation from "./Conversation";
import { AuthProvider } from "./AuthContext";
import FileUpload from "./FileUpload";
import ArtSearch from "./ArtSearch";

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
   <AuthProvider>
  <Routes>
      

   <Route exact path="/" element={ <LoginPage  />} /> 
   <Route path="/" element={ <LoginPage  />} /> 
   <Route path="/register_page" element={ <RegisterPage  />} /> 
 <Route path="/art_search" element={ <ArtSearch  />} /> 
 <Route path="/room3d" element={ <Room3D  />} /> 
 <Route path="/conversations" element={<ConversationsList/> }/>
 <Route path="/conversation" element={<Conversation/> }/>
 <Route path="/upload" element={<FileUpload/> }/>

 </Routes>
 </AuthProvider>
 </BrowserRouter>
);
