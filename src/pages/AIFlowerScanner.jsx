// AI Flower Scanner Page
import React, { useState } from "react";
import { scanFlower } from "../api/aiScanner";

export default function AIFlowerScanner() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setResult(null);
    setError(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const dt = e.dataTransfer;
    if (dt.files && dt.files[0]) {
      setFile(dt.files[0]);
      setResult(null);
      setError(null);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const res = await scanFlower(file);
      setResult(res);
    } catch (e) {
      setError("Failed to analyze image. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ai-flower-scanner container">
      <h1>AI Flower Scanner</h1>
      <div
        className="upload-area"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
        />
        <p>Or drag & drop an image here (JPG, PNG, WEBP)</p>
      </div>
      <button
        className="analyze-btn"
        onClick={handleAnalyze}
        disabled={!file || loading}
      >
        {loading ? "Analyzing..." : "Analyze Flower"}
      </button>

      {error && <p className="error-msg">{error}</p>}

      {result && (
        <div className="result-section">
          <h2>Analysis Results</h2>
          <p><strong>Flower:</strong> {result.flowerName}</p>
          <p><strong>Scientific Name:</strong> {result.scientificName}</p>
          <p><strong>Confidence:</strong> {(result.confidence * 100).toFixed(0)}%</p>
          <p><strong>Category:</strong> {result.category}</p>
          <p><strong>Type:</strong> {result.flowerType}</p>
          {result.reasons && result.reasons.length > 0 && (
            <>
              <h3>Reasons</h3>
              <ul>
                {result.reasons.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </>
          )}
          <h3>Care Tips</h3>
          <ul>
            {result.careTips && result.careTips.map((tip, i) => (
              <li key={i}>{tip}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
