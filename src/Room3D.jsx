import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls";
import { useNavigate , useLocation} from "react-router";
import { invoke } from "@tauri-apps/api/core";
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';


const Room3D = () => {
  const { state } = useLocation();
  const userId = state?.userId;

  const mountRef = useRef(null);
  const [artPieces, setArtPieces] = useState([]);
  const [showPrompt, setShowPrompt] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyPress = (event) => {
      if (event.key.toLowerCase() === "c") {
        navigate("/conversations", { state: { userId } });
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [navigate]);


  useEffect(() => {
   
    const fetchArtPieces = async () => {
      try {  console.log("User ID before API call:", userId);
        const response = await invoke("get_art_by_user", {  userId });
        setArtPieces(response);
      } catch (error) {
        console.error("Error fetching art pieces:", error);
      }
    };

    fetchArtPieces();
  }, [userId]);

  useEffect(() => {
    if (!mountRef.current || artPieces.length === 0) return;

   
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.y = 1.8; 

   
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    mountRef.current.appendChild(renderer.domElement);

       
        const ambientLight = new THREE.AmbientLight(0x404040, 1);
        scene.add(ambientLight);
        const pointLight = new THREE.PointLight(0xffffff, 100, 100);
        pointLight.position.set(7, 40, -5);
        scene.add(pointLight);



const roomSize = 150;


const colors = [0xff0000, 0x00ff00, 0xffff00, 0x0000ff, 0xffa500, 0x800080];


function createWall(width, height, color, position, rotation) {
  const geometry = new THREE.PlaneGeometry(width, height);
  const material = new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide });
  const wall = new THREE.Mesh(geometry, material);
  wall.position.set(...position);
  wall.rotation.set(...rotation);
  scene.add(wall);
}


createWall(roomSize, roomSize, 0x808080, [0, 0, 0], [-Math.PI / 2, 0, 0]);


createWall(roomSize, roomSize, colors[5], [0, roomSize, 0], [Math.PI / 2, 0, 0]);

createWall(roomSize, roomSize, colors[0], [0, roomSize / 2, -roomSize / 2], [0, 0, 0]);


createWall(roomSize, roomSize, colors[1], [0, roomSize / 2, roomSize / 2], [0, Math.PI, 0]);

createWall(roomSize, roomSize, colors[2], [-roomSize / 2, roomSize / 2, 0], [0, Math.PI / 2, 0]);

createWall(roomSize, roomSize, colors[3], [roomSize / 2, roomSize / 2, 0], [0, -Math.PI / 2, 0]);




const loader = new GLTFLoader();
let laptopObject = null;
let deskObject = null;

const books = [];


loader.load('/models/desk.glb', (gltf) => {
  deskObject = gltf.scene;
  deskObject.position.set(0, 0, -1); 
  deskObject.scale.set(1.5, 1.5, 1.5);
  scene.add(deskObject);

  
  loader.load('/models/laptop.glb', (gltf) => {
    laptopObject = gltf.scene;
    laptopObject.position.set(0, 1.2, -1); 
    laptopObject.scale.set(0.5, 0.5, 0.5);
    scene.add(laptopObject);
  }, undefined, (error) => {
    console.error('Error loading laptop:', error);
  });

}, undefined, (error) => {
  console.error('Error loading desk:', error);
});


const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

window.addEventListener('click', (event) => {
  if (!laptopObject) return; 

 
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;


  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObject(laptopObject, true);

 
  if (intersects.length > 0) {
    const distance = camera.position.distanceTo(laptopObject.position);
    if (distance < 2) {
      navigate("/conversations"); 
    }
  }
});



   
    const artObjects = [];
    const textureLoader = new THREE.TextureLoader();

    artPieces.forEach((art, index) => {
      loader.load('/models/book.glb', (gltf) => {
        const book = gltf.scene;
        book.position.set(index * 3 - 5, 0.5, -5); 
        book.scale.set(1, 1, 1);
    
        if (art.displayed_image) {
          
          const texture = textureLoader.load(`data:image/png;base64,${art.displayed_image}`);
    
         
          book.traverse((child) => {
            if (child.isMesh) {
              child.material = new THREE.MeshBasicMaterial({ map: texture });
            }
          });
        }
    
        scene.add(book);
        books.push(book);
      }, undefined, (error) => {
        console.error('Error loading book model:', error);
      });
    });


let lastClonedBook = null;


window.addEventListener('keydown', (event) => {
  if (event.key.toLowerCase() === 'f') {
    if (books.length === 0 || !deskObject) return; 

    const userPosition = camera.position;
    let closestBook = null;
    let minDistance = Infinity;

   
    books.forEach((book) => {
      const distance = userPosition.distanceTo(book.position);
      if (distance < minDistance) {
        minDistance = distance;
        closestBook = book;
      }
    });

    
    if (closestBook && minDistance < 2) {
      
      if (lastClonedBook) {
        scene.remove(lastClonedBook);
      }

     
      lastClonedBook = closestBook.clone();
      lastClonedBook.scale.set(0.5, 0.5, 0.5);
      lastClonedBook.position.set(0, 1.3, -1); 
      scene.add(lastClonedBook);

      console.log("Replaced last book clone with a new one!");
    }
  }
});


let penObject = null; 

loader.load('/models/pen.glb', (gltf) => {
  penObject = gltf.scene;
  penObject.position.set(0.3, 1.3, -1); 
  penObject.scale.set(0.3, 0.3, 0.3); 
  scene.add(penObject);
}, undefined, (error) => {
  console.error('Error loading pen:', error);
});


window.addEventListener('keydown', (event) => {
  if (event.key.toLowerCase() === 'u' && penObject) {
    const userPosition = camera.position;
    const distance = userPosition.distanceTo(penObject.position);

    if (distance < 2) { 
      navigate("/upload"); 
    }
  }
});

    
    const controls = new PointerLockControls(camera, renderer.domElement);
    document.addEventListener("click", () => controls.lock());

    
    const movement = { forward: false, backward: false, left: false, right: false };
    const velocity = new THREE.Vector3();
    const direction = new THREE.Vector3();
    const clock = new THREE.Clock();

    
    const onKeyDown = (event) => {
      switch (event.code) {
        case "ArrowUp":
        case "KeyW":
          movement.forward = true;
          break;
        case "ArrowDown":
        case "KeyS":
          movement.backward = true;
          break;
        case "ArrowLeft":
        case "KeyA":
          movement.left = true;
          break;
        case "ArrowRight":
        case "KeyD":
          movement.right = true;
          break;
      }
    };

    const onKeyUp = (event) => {
      switch (event.code) {
        case "ArrowUp":
        case "KeyW":
          movement.forward = false;
          break;
        case "ArrowDown":
        case "KeyS":
          movement.backward = false;
          break;
        case "ArrowLeft":
        case "KeyA":
          movement.left = false;
          break;
        case "ArrowRight":
        case "KeyD":
          movement.right = false;
          break;
      }
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);

    
    const animate = () => {
      const delta = clock.getDelta();

     
      velocity.set(0, 0, 0);
      if (movement.forward) velocity.z -= 5 * delta;
      if (movement.backward) velocity.z += 5 * delta;
      if (movement.left) velocity.x -= 5 * delta;
      if (movement.right) velocity.x += 5 * delta;

      
      direction.copy(velocity).applyQuaternion(camera.quaternion);
      controls.object.position.x += direction.x;
      controls.object.position.z += direction.z;
      controls.object.position.y = 1.8; 

     
      let nearArt = false;
      artObjects.forEach(({ cube }) => {
        const distance = controls.object.position.distanceTo(cube.position);
        if (distance < 3) nearArt = true;
      });

      setShowPrompt(nearArt); 
      if (nearArt) {
        navigate("/art_search");
      }

      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };

    animate();

   
    return () => {
      if (mountRef.current) mountRef.current.removeChild(renderer.domElement);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("keyup", onKeyUp);
    };
  }, [navigate, artPieces]);

  return (
    <>
      <div ref={mountRef} style={{ width: "100%", height: "100vh" }} />
      {showPrompt && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            padding: "10px 20px",
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            color: "white",
            borderRadius: "5px",
            textAlign: "center",
          }}
        >
          Approaching an artwork... Redirecting to details!
          
      
        </div>
      )}
    </>
  );
};

export default Room3D;
