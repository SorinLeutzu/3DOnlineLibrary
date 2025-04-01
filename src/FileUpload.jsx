import React, { useState } from 'react';
import { invoke } from "@tauri-apps/api/core";

const FileUpload = () => {
  const [formData, setFormData] = useState({
    name: '',
    author: '',
    description: '',
    publishing_date: '',
    content_type: 'book',
  });
  const [file, setFile] = useState(null);
  const [displayedImage, setDisplayedImage] = useState(null);
  const [message, setMessage] = useState('');

  const allowedFileTypes = {
    book: 'application/pdf',
    object: 'model/obj',
    picture: 'image/png',
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleDisplayedImageChange = (e) => {
    setDisplayedImage(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
  
    if (!file) {
      setMessage('Please select a file to upload.');
      return;
    }
  
    if (file.type !== allowedFileTypes[formData.content_type]) {
      setMessage(`Invalid file type. Expected: ${allowedFileTypes[formData.content_type]}`);
      return;
    }
  
    const readFileAsBase64 = (file) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    };
  
    try {
      const fileBase64 = await readFileAsBase64(file);
      const displayedImageBase64 = displayedImage ? await readFileAsBase64(displayedImage) : null;
  
      const data = {
        ...formData,
        file_data: fileBase64,
        displayed_image: displayedImageBase64,
      };
  
      console.log('Submitting form data:', data);
  
      const response = await invoke('upload_art', { formData: data });
      console.log('Upload response:', response);
      setMessage(response.message || 'File uploaded successfully!');
    } catch (err) {
      console.error('Upload error:', err);
      setMessage('Error uploading file.');
    }
  };
  
  

  return (
    <div>
      <h1>Upload Art</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Name:</label>
          <input type="text" name="name" value={formData.name} onChange={handleInputChange} required />
        </div>
        <div>
          <label>Author:</label>
          <input type="text" name="author" value={formData.author} onChange={handleInputChange} required />
        </div>
        <div>
          <label>Description:</label>
          <textarea name="description" value={formData.description} onChange={handleInputChange} />
        </div>
        <div>
          <label>Publishing Date:</label>
          <input type="date" name="publishing_date" value={formData.publishing_date} onChange={handleInputChange} />
        </div>
        <div>
          <label>Content Type:</label>
          <select name="content_type" value={formData.content_type} onChange={handleInputChange}>
            <option value="book">Book (PDF)</option>
            <option value="object">Object (OBJ)</option>
            <option value="picture">Picture (PNG)</option>
          </select>
        </div>
        <div>
          <label>File:</label>
          <input type="file" onChange={handleFileChange} required />
        </div>
        <div>
          <label>Displayed Image (Optional):</label>
          <input type="file" onChange={handleDisplayedImageChange} />
        </div>
        <button type="submit">Upload</button>
      </form>
      {message && <p>{message}</p>}
    </div>
  );
};

export default FileUpload;
