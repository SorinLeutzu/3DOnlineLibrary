import React, { useState } from "react";
import { invoke } from "@tauri-apps/api/core";

const ArtSearch = () => {
  const [query, setQuery] = useState("");
  const [artPieces, setArtPieces] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchArtPieces = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await invoke("search_art", { query });
      setArtPieces(response);
    } catch (err) {
      console.error("Failed to fetch art pieces:", err);
      setError("Failed to fetch art pieces. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif", maxWidth: "800px", margin: "auto" }}>
      <h1 style={{ textAlign: "center", color: "#333" }}>Art Search</h1>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: "20px" }}>
        <input
          type="text"
          placeholder="Search for art by description..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            padding: "10px",
            width: "300px",
            border: "1px solid #ccc",
            borderRadius: "4px",
            fontSize: "16px"
          }}
        />
        <button
          onClick={fetchArtPieces}
          style={{
            padding: "10px 20px",
            marginLeft: "10px",
            backgroundColor: "#007BFF",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "16px"
          }}
        >
          Search
        </button>
      </div>

      {loading && <p style={{ textAlign: "center", fontSize: "18px" }}>Loading...</p>}
      {error && <p style={{ color: "red", textAlign: "center", fontSize: "18px" }}>{error}</p>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "20px" }}>
        {artPieces.length === 0 && !loading && !error && (
          <p style={{ textAlign: "center", fontSize: "18px", color: "#666" }}>No art pieces found. Try a different search term.</p>
        )}

        {artPieces.map((art) => (
          <div
            key={art.art_id}
            style={{
              border: "1px solid #ddd",
              padding: "15px",
              borderRadius: "8px",
              boxShadow: "2px 2px 10px rgba(0, 0, 0, 0.1)",
              backgroundColor: "#fff",
              textAlign: "center"
            }}
          >
            {art.displayed_image && (
              <img
                src={`data:image/jpeg;base64,${art.displayed_image}`}
                alt={art.name}
                style={{ maxWidth: "100%", height: "auto", borderRadius: "8px", marginBottom: "10px" }}
              />
            )}
            <h3 style={{ color: "#007BFF" }}>{art.name}</h3>
            <p><strong>Author:</strong> {art.author}</p>
            <p style={{ fontStyle: "italic", color: "#555" }}><strong>Description:</strong> {art.description}</p>
            <p><strong>Publishing Date:</strong> {art.publishing_date}</p>
            <p><strong>Content Type:</strong> {art.content_type}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ArtSearch;
