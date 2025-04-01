// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

use reqwest::Client;
use serde::{Deserialize, Serialize};


#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}


#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![get_user_id_by_token,greet,login_user,register_user,get_user_conversations,send_message,get_messages,validate_and_register_user,logout,upload_art,search_art,get_art_by_user])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}



#[derive(Serialize, Deserialize)]
struct LoginRequest {
    username: String,
    password: String,
}

#[derive(Serialize, Deserialize)]
struct LoginResponse {
    token: String,
    message: Option<String>,
}

#[tauri::command]
async fn login_user(username: String, password: String) -> Result<String, String> {
    let client = Client::new();
    let login_url = "http://localhost:5000/login";

    let login_request = LoginRequest { username, password };

    
    let response = client
        .post(login_url)
        .json(&login_request)
        .send()
        .await
        .map_err(|err| format!("Failed to send request: {}", err))?;

    if response.status().is_success() {
        let login_response: LoginResponse = response
            .json()
            .await
            .map_err(|err| format!("Failed to parse response: {}", err))?;
        Ok(login_response.token) 
    } else {
        let error_message = response
            .text()
            .await
            .unwrap_or_else(|_| "Unknown error".to_string());
        Err(error_message)
    }
}


#[derive(Serialize, Deserialize)]
struct RegisterRequest {
    username: String,
    email: String,
    password: String,
    is_creator: bool,
}

#[derive(Serialize, Deserialize)]
struct RegisterResponse {
    message: String,
}

#[tauri::command]
async fn register_user(username: String, email: String, password: String, is_creator: bool) -> Result<String, String> {
    let client = Client::new();
    let register_url = "http://localhost:5000/register";
    let register_request = RegisterRequest {
        username,
        email,
        password,
        is_creator,
    };

    let response = client
        .post(register_url)
        .json(&register_request)
        .send()
        .await
        .map_err(|err| format!("Failed to send request: {}", err))?;

    if response.status().is_success() {
        let register_response: RegisterResponse = response
            .json()
            .await
            .map_err(|err| format!("Failed to parse response: {}", err))?;
        Ok(register_response.message) 
    } else {
        let error_message = response
            .text()
            .await
            .unwrap_or_else(|_| "Unknown error".to_string());
        Err(error_message)
    }
}




#[derive(Serialize, Deserialize, Debug)]
struct Message {
    message_id: Option<i32>,
    sender_id: i32,
    receiver_id: i32,
    content: String,
    timestamp: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
struct Conversation {
    receiver_id: i32,
}



#[tauri::command]
async fn send_message(sender_id: i32, receiver_id: i32, content: String) -> Result<Message, String> {
    let message = Message {
        message_id: None,
        sender_id,
        receiver_id,
        content,
        timestamp: None,
    };

    let client = reqwest::Client::new();
    let response = client
        .post("http://localhost:8081/send_message")
        .json(&message)
        .send()
        .await
        .map_err(|e| format!("Failed to send request: {}", e))?;

    if response.status().is_success() {
        response
            .json::<Message>()
            .await
            .map_err(|e| format!("Failed to parse response: {}", e))
    } else {
        Err(format!("Error: {}", response.status()))
    }
}


#[tauri::command]
async fn get_messages(sender_id: i32, receiver_id: i32) -> Result<Vec<Message>, String> {
    let url = format!(
        "http://localhost:8081/get_messages?sender_id={}&receiver_id={}",
        sender_id, receiver_id
    );

    let response = reqwest::get(&url)
        .await
        .map_err(|e| format!("Failed to fetch messages: {}", e))?;

    if response.status().is_success() {
        response
            .json::<Vec<Message>>()
            .await
            .map_err(|e| format!("Failed to parse response: {}", e))
    } else {
        Err(format!("Error: {}", response.status()))
    }
}


#[tauri::command]
async fn get_user_conversations(user_id: i32) -> Result<Vec<Conversation>, String> {
    let url = format!("http://localhost:8081/get_user_conversations?user_id={}", user_id);

    let response = reqwest::get(&url)
        .await
        .map_err(|e| format!("Failed to fetch conversations: {}", e))?;

    if response.status().is_success() {
        response
            .json::<Vec<Conversation>>()
            .await
            .map_err(|e| format!("Failed to parse response: {}", e))
    } else {
        Err(format!("Error: {}", response.status()))
    }
}





#[derive(Deserialize)]
struct LogoutResponse {
    message: String,
}

#[tauri::command]
async fn logout(token: String) -> Result<String, String> {
    let client = Client::new();
    let url = "http://127.0.0.1:5000/logout";

    let response = client
        .post(url)
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await
        .map_err(|e| format!("Network error: {}", e))?;

    
    if response.status().is_success() {
        let logout_response: LogoutResponse = response
            .json()
            .await
            .map_err(|e| format!("Failed to parse response: {}", e))?;
        Ok(logout_response.message)
    } else {
        let status_code = response.status();
        let error_text = response
            .text()
            .await
            .unwrap_or_else(|_| "Unknown error".to_string());
        Err(format!(
            "Logout failed with status {}: {}",
            status_code, error_text
        ))
    }
}
use serde_json::Value;
use serde_json::json;


#[tauri::command]
async fn upload_art(form_data: serde_json::Value) -> Result<serde_json::Value, String> {
    use reqwest::multipart;

    let client = reqwest::Client::new();
    let url = "http://localhost:8082/upload";

   
    let mut form = multipart::Form::new();

    if let Some(name) = form_data.get("name").and_then(|v| v.as_str()) {
        form = form.text("name", name.to_string());
    }
    if let Some(author) = form_data.get("author").and_then(|v| v.as_str()) {
        form = form.text("author", author.to_string());
    }

    if let Some(description) = form_data.get("description").and_then(|v| v.as_str()) {
        form = form.text("description", description.to_string());
    }

    if let Some(content_type) = form_data.get("content_type").and_then(|v| v.as_str()) {
        form = form.text("content_type", content_type.to_string());
    }

  
    if let Some(file_data) = form_data.get("file_data").and_then(|v| v.as_str()) {
        let file_part = multipart::Part::bytes(base64::decode(file_data).unwrap())
            .file_name("file_data")
            .mime_str("application/octet-stream")
            .unwrap();
        form = form.part("file_data", file_part);
    }

    
    if let Some(displayed_image) = form_data.get("displayed_image").and_then(|v| v.as_str()) {
        let image_part = multipart::Part::bytes(base64::decode(displayed_image).unwrap())
            .file_name("displayed_image")
            .mime_str("image/png")
            .unwrap();
        form = form.part("displayed_image", image_part);
    }

    
    match client.post(url).multipart(form).send().await {
        Ok(response) => {
            if response.status().is_success() {
                let response_text = response.text().await.unwrap_or_default();
                Ok(serde_json::from_str(&response_text).unwrap_or_else(|_| json!({"message": "Upload completed"})))
            } else {
                let error_text = response.text().await.unwrap_or_default();
                Err(format!("Server error: {}", error_text))
            }
        }
        Err(err) => Err(format!("Network error: {}", err)),
    }
}



#[derive(Serialize, Deserialize)]
struct Art {
    art_id: i32,
    name: String,
    author: String,
    description: String,
    publishing_date: Option<String>,
    displayed_image: Option<String>,  
    
}


#[derive(Serialize, Deserialize)]
struct ArtPiece {
    art_id: i32,
    name: String,
    author: String,
    description: String,
    publishing_date: String,
    content_type: String,
    displayed_image: Option<String>, 
    file_data: Option<String>, 
}



#[tauri::command]
async fn search_art(query: String) -> Result<Vec<ArtPiece>, String> {
    let python_server_url = "http://localhost:8082/art/search";

    let client = Client::new();
    let response = client
        .get(python_server_url)
        .query(&[("query", query)])
        .send()
        .await;

    match response {
        Ok(resp) => {
            if resp.status().is_success() {
                let art_pieces: Vec<ArtPiece> = resp.json().await.unwrap_or_else(|_| vec![]);
                Ok(art_pieces)
            } else {
                Err(format!(
                    "Python server returned an error: {}",
                    resp.status()
                ))
            }
        }
        Err(err) => Err(format!("Failed to reach Python server: {}", err)),
    }
}


// PROXY:
#[tauri::command]
async fn validate_and_register_user(
    username: String,
    email: String,
    password: String,
    is_creator: bool,
) -> Result<String, String> {
    
    if username.len() < 5 {
        return Err("Username must be at least 5 characters long.".to_string());
    }

    if password.len() < 5 {
        return Err("Password must be at least 5 characters long.".to_string());
    }

    if !password.chars().any(|c| c.is_digit(10)) {
        return Err("Password must contain at least one number.".to_string());
    }

   
    register_user(username, email, password, is_creator).await
}

#[derive(Deserialize)]
struct User {
    learning_space_id: Option<i32>,
}

#[tauri::command]
async fn get_art_by_user(user_id: i32) -> Result<Vec<ArtPiece>, String> {
    let python_server_url = format!("http://localhost:8082/user/{}/art", user_id);

    let client = reqwest::Client::new();
    let response = client.get(&python_server_url).send().await;

    match response {
        Ok(resp) => {
            if resp.status().is_success() {
                println!("O mers requestu boss");
                let art_pieces: Vec<ArtPiece> = resp.json().await.unwrap_or_else(|_| vec![]);
                Ok(art_pieces)
            } else {
                Err(format!(
                    "Python server returned an error: {}",
                    resp.status()
                ))
            }
        }
        Err(err) => Err(format!("Failed to reach Python server: {}", err)),
    }
}


#[tauri::command]
async fn get_user_id_by_token(token: String) -> Result<i32, String> {
    let python_server_url = "http://localhost:5000/user/by-token"; 

    let client = reqwest::Client::new();
    let response = client
        .get(python_server_url)
        .header("Authorization", format!("Bearer {}", token)) 
        .send()
        .await;

    match response {
        Ok(resp) => {
            if resp.status().is_success() {
                
                let json_value: serde_json::Value = resp.json().await.unwrap_or_default();
                if let Some(user_id) = json_value["user_id"].as_i64() {
                    Ok(user_id as i32)
                } else {
                    Err("User ID not found in response".to_string())
                }
            } else {
                Err(format!(
                    "Python server returned an error: {}",
                    resp.status()
                ))
            }
        }
        Err(err) => Err(format!("Failed to reach Python server: {}", err)),
    }
}
