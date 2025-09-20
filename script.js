const chatHistory = document.getElementById("chatHistory");
const userInput = document.getElementById("userInput");
const botBubble = document.getElementById("botBubble");

// Mostrar un mensaje en el historial
function appendMessage(sender, text) {
  const msg = document.createElement("div");
  msg.classList.add("msg");
  msg.textContent = `${sender}: ${text}`;
  chatHistory.appendChild(msg);
  chatHistory.scrollTop = chatHistory.scrollHeight;
}

// Enviar mensaje
async function sendMessage() {
  const msg = userInput.value;
  const provider = document.getElementById("providerSelect").value;
  const username = localStorage.getItem("username");
  if (!username) {
    alert("¡Debes iniciar sesión primero!");
    return;
  }

  appendMessage("Tú", msg);
  userInput.value = "";

  const res = await fetch("http://127.0.0.1:8000/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: username,
      message: msg,
      provider: provider
    })
  });
  const data = await res.json();
  appendMessage("Robotix", data.response);
  botBubble.textContent = data.response;
  speak(data.response);
}

// Reconocimiento de voz
function startSpeech() {
  const recog = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  recog.lang = "es-ES";
  recog.start();
  recog.onresult = e => userInput.value = e.results[0][0].transcript;
}

// Texto a voz
function speak(text) {
  const synth = window.speechSynthesis;
  const utter = new SpeechSynthesisUtterance(text);
  synth.speak(utter);
}

// Registro
function registerUser() {
  const username = prompt("Nuevo usuario:");
  const password = prompt("Contraseña:");
  fetch("http://127.0.0.1:8000/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  }).then(res => res.json()).then(data => {
    alert(data.message || data.detail || "Registro fallido.");
  });
}

// Login
function loginUser() {
  const username = prompt("Usuario:");
  const password = prompt("Contraseña:");
  fetch("http://127.0.0.1:8000/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  }).then(res => res.json()).then(data => {
    if (data.message === "Login exitoso.") {
      localStorage.setItem("username", username);
      document.getElementById("userOptions").style.display = "none";
      document.getElementById("userInfo").style.display = "block";
      document.getElementById("usernameDisplay").textContent = username;
      chatHistory.innerHTML = "";
      data.history.forEach(e => {
        appendMessage("Tú", e.question);
        appendMessage("Robotix", e.response);
      });
    } else {
      alert(data.detail || "Error al iniciar sesión.");
    }
  });
}

// Logout
function logoutUser() {
  localStorage.removeItem("username");
  location.reload();
}

// Inicializar estado del usuario
window.onload = () => {
  const username = localStorage.getItem("username");
  if (username) {
    document.getElementById("userOptions").style.display = "none";
    document.getElementById("userInfo").style.display = "block";
    document.getElementById("usernameDisplay").textContent = username;
  }
};

// Avatar 3D - Ajuste al tamaño del cuadro y mejor iluminación
const avatarContainer = document.getElementById("avatarContainer");
const width = avatarContainer.clientWidth;
const height = avatarContainer.clientHeight;

const renderer = new THREE.WebGLRenderer({ alpha: true });
renderer.setSize(width, height);
avatarContainer.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
const scene = new THREE.Scene();

const loader = new THREE.GLTFLoader();
loader.load("Avatar.glb", gltf => {
  const avatar = gltf.scene;
  scene.add(avatar);

  // Ajustar tamaño y posición del modelo
  const box = new THREE.Box3().setFromObject(avatar);
  const size = box.getSize(new THREE.Vector3()).length();
  const center = box.getCenter(new THREE.Vector3());

  avatar.position.x += (avatar.position.x - center.x);
  avatar.position.y += (avatar.position.y - center.y);
  avatar.position.z += (avatar.position.z - center.z);

  camera.position.z = size * 1.5;

  animate();

  function animate() {
    requestAnimationFrame(animate);
    avatar.rotation.y += 0.01;
    renderer.render(scene, camera);
  }
});

// Mejora de iluminación para que el avatar se vea menos oscuro
const ambientLight = new THREE.AmbientLight(0xffffff, 1.2); // Luz ambiental fuerte
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
directionalLight.position.set(2, 2, 2); // Ajusta dirección para destacar el modelo
scene.add(directionalLight);

const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6); // Luz suave de arriba y abajo
hemiLight.position.set(0, 20, 0);
scene.add(hemiLight);
