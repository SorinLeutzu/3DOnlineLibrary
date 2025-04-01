import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { invoke } from "@tauri-apps/api/core";

const ProtectedRoute = ({ children }) => {
  const [isValid, setIsValid] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const validateToken = async () => {
      const token = localStorage.getItem("token");

      if (!token) {
        navigate("/");
        return;
      }

      try {
       
        const response = await invoke("validate_token", { token });

        if (response.valid) {
          setIsValid(true);
        } else {
          navigate("/");
        }
      } catch (error) {
        navigate("/");
      }
    };

    validateToken();
  }, [navigate]);

  if (!isValid) {
    return <p>Loading...</p>;
  }

  return children;
};

export default ProtectedRoute;
