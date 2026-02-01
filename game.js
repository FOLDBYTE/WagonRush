// ====== Config ======
let TRACKS = 2;
const LANE_W = 2.4;
const SPEED = 8.0;
const SEG_LEN = 12;
const SEG_COUNT = 10;
const STARS_TO_WIN = 5;
const BRIDGE_START_Z = -70;

// Mobile detection
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;

// Game state
let lane = 0;
let stars = 0;
let level = 1;
let phase = "MENU"; // MENU, STARTING, PLAY, HIT, CATCH, WIN, PAUSED
let safeLane = 0;
let gameSpeed = SPEED;
let isPaused = false;
let previousPhase = "PLAY";

// Touch/swipe tracking
let touchStartX = 0;
let touchStartY = 0;
let touchStartTime = 0;

// DOM
const startScreen = document.getElementById("start-screen");
const startBtn = document.getElementById("start-btn");
const trackOptions = document.querySelectorAll(".track-option");
const hudEl = document.getElementById("hud");
const messageEl = document.getElementById("message");
const buttonsEl = document.getElementById("track-buttons");
const celebrationEl = document.getElementById("celebration");
const centerBtn = document.querySelector(".track-btn-center");
const starSlots = document.querySelectorAll(".star-slot");
const levelDisplay = document.getElementById("level-display");
const pauseBtn = document.getElementById("pause-btn");
const pauseMenu = document.getElementById("pause-menu");
const resumeBtn = document.querySelector(".menu-btn.resume");
const restartBtn = document.querySelector(".menu-btn.restart");
const quitBtn = document.querySelector(".menu-btn.quit");

// Track selection
trackOptions.forEach(opt => {
	opt.addEventListener("click", () => {
		trackOptions.forEach(o => o.classList.remove("selected"));
		opt.classList.add("selected");
		TRACKS = parseInt(opt.dataset.tracks);
	});
});

// ====== Translations ======
let currentLang = 'cs';

const translations = {
	en: {
		title: '🚂 Wagon Dash!',
		subtitle: 'How many tracks?',
		tracks2: '2 Tracks',
		tracks3: '3 Tracks',
		easier: 'Easier',
		moreFun: 'More fun!',
		start: '▶ Start!',
		level: 'Level',
		pauseTitle: '⏸️ Paused',
		resume: '▶ Resume',
		restart: '🔄 Restart',
		mainMenu: '🏠 Main Menu',
		tryAgain: "Let's try another way! 🚂",
		levelComplete: '🎉 Level Complete! 🎉',
		nextLevel: 'Get ready for Level'
	},
	cs: {
		title: '🚂 Chyť zlobivé vagóny!',
		subtitle: 'Kolik kolejí?',
		tracks2: '2 koleje',
		tracks3: '3 koleje',
		easier: 'Jednodušší',
		moreFun: 'Větší zábava!',
		start: '▶ Start!',
		level: 'Level',
		pauseTitle: '⏸️ Pauza',
		resume: '▶ Pokračovat',
		restart: '🔄 Znovu',
		mainMenu: '🏠 Hlavní menu',
		tryAgain: 'Zkusíme jinou cestu! 🚂',
		levelComplete: '🎉 Level dokončen! 🎉',
		nextLevel: 'Připrav se na Level'
	}
};

function setLanguage(lang) {
	currentLang = lang;
	const t = translations[lang];

	// Update all text
	document.getElementById('title').textContent = t.title;
	document.getElementById('subtitle').textContent = t.subtitle;
	document.querySelector('[data-i18n="tracks2"]').textContent = t.tracks2;
	document.querySelector('[data-i18n="tracks3"]').textContent = t.tracks3;
	document.querySelector('[data-i18n="easier"]').textContent = t.easier;
	document.querySelector('[data-i18n="moreFun"]').textContent = t.moreFun;
	document.querySelector('[data-i18n="start"]').textContent = t.start;
	document.getElementById('pause-title').textContent = t.pauseTitle;
	document.querySelector('[data-i18n="resume"]').textContent = t.resume;
	document.querySelector('[data-i18n="restart"]').textContent = t.restart;
	document.querySelector('[data-i18n="mainMenu"]').textContent = t.mainMenu;
	messageEl.textContent = t.tryAgain;
	document.getElementById('celebration-title').textContent = t.levelComplete;

	// Update level display
	levelDisplay.textContent = `${t.level} ${level}`;

	// Update language buttons
	document.querySelectorAll('.lang-btn').forEach(btn => {
		btn.classList.toggle('active', btn.dataset.lang === lang);
	});

	// Save preference
	try { localStorage.setItem('wagons-lang', lang); } catch (e) { }
}

// Language toggle buttons
document.querySelectorAll('.lang-btn').forEach(btn => {
	btn.addEventListener('click', () => setLanguage(btn.dataset.lang));
});

// Load saved language preference
try {
	const savedLang = localStorage.getItem('wagons-lang');
	if (savedLang && translations[savedLang]) {
		setLanguage(savedLang);
	}
} catch (e) { }

// ====== Audio ======
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function initAudio() {
	if (!audioCtx) audioCtx = new AudioContext();
	if (audioCtx.state === 'suspended') audioCtx.resume();
}

function playSound(type) {
	if (!audioCtx || isPaused) return;
	const osc = audioCtx.createOscillator();
	const gain = audioCtx.createGain();
	osc.connect(gain);
	gain.connect(audioCtx.destination);

	if (type === 'horn') {
		osc.frequency.setValueAtTime(392, audioCtx.currentTime);
		osc.frequency.setValueAtTime(523, audioCtx.currentTime + 0.15);
		osc.type = 'sine';
		gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
		osc.start();
		osc.stop(audioCtx.currentTime + 0.35);
	} else if (type === 'collect') {
		[523, 659, 784].forEach((freq, i) => {
			const o = audioCtx.createOscillator();
			const g = audioCtx.createGain();
			o.connect(g);
			g.connect(audioCtx.destination);
			o.frequency.setValueAtTime(freq, audioCtx.currentTime + i * 0.08);
			o.type = 'sine';
			g.gain.setValueAtTime(0.15, audioCtx.currentTime + i * 0.08);
			o.start(audioCtx.currentTime + i * 0.08);
			o.stop(audioCtx.currentTime + i * 0.08 + 0.12);
		});
	} else if (type === 'wrong') {
		osc.frequency.setValueAtTime(200, audioCtx.currentTime);
		osc.frequency.setValueAtTime(150, audioCtx.currentTime + 0.15);
		osc.type = 'sine';
		gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
		osc.start();
		osc.stop(audioCtx.currentTime + 0.3);
	} else if (type === 'celebration') {
		[523, 587, 659, 784, 880, 1047].forEach((freq, i) => {
			const o = audioCtx.createOscillator();
			const g = audioCtx.createGain();
			o.connect(g);
			g.connect(audioCtx.destination);
			o.frequency.setValueAtTime(freq, audioCtx.currentTime + i * 0.1);
			o.type = 'sine';
			g.gain.setValueAtTime(0.12, audioCtx.currentTime + i * 0.1);
			o.start(audioCtx.currentTime + i * 0.1);
			o.stop(audioCtx.currentTime + i * 0.1 + 0.12);
		});
	} else if (type === 'tap') {
		osc.frequency.setValueAtTime(800, audioCtx.currentTime);
		osc.type = 'sine';
		gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
		osc.start();
		osc.stop(audioCtx.currentTime + 0.04);
	}
}

// ====== Three.js Setup ======
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 25, 120);

const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 200);
camera.position.set(0, 6, 14);
camera.lookAt(0, 1.5, -5);

const renderer = new THREE.WebGLRenderer({
	antialias: !isMobile, // Disable antialiasing on mobile for performance
	powerPreference: "high-performance"
});
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, isMobile ? 1.5 : 2));
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// Lights
scene.add(new THREE.HemisphereLight(0xffffff, 0x88cc55, 0.7));
const sun = new THREE.DirectionalLight(0xffffd0, 1.0);
sun.position.set(8, 15, 10);
sun.castShadow = true;
sun.shadow.mapSize.width = 1024;
sun.shadow.mapSize.height = 1024;
scene.add(sun);

// ====== Helpers ======
function laneX(i) {
	return (i - (TRACKS - 1) / 2) * LANE_W;
}
function lerp(a, b, t) { return a + (b - a) * t; }

// ====== Materials ======
const grassMat = new THREE.MeshLambertMaterial({ color: 0x5fa83a });
const gravelMat = new THREE.MeshLambertMaterial({ color: 0x7a6a5a });
const railMat = new THREE.MeshLambertMaterial({ color: 0x555555 });
const tieMat = new THREE.MeshLambertMaterial({ color: 0x5c3a1e });
const wheelMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
const hillMat = new THREE.MeshLambertMaterial({ color: 0x4a8f2a });
const stoneMat = new THREE.MeshLambertMaterial({ color: 0x707070 });

// ====== Ground + Tracks ======
const ground = new THREE.Group();
scene.add(ground);
const segs = [];

function createTrackSegments() {
	while (ground.children.length) ground.remove(ground.children[0]);
	segs.length = 0;

	const sleeperMat = new THREE.MeshLambertMaterial({ color: 0x6B4423 });

	for (let s = 0; s < SEG_COUNT; s++) {
		const g = new THREE.Group();

		const base = new THREE.Mesh(new THREE.BoxGeometry(50, 0.3, SEG_LEN), grassMat);
		base.position.set(0, -0.2, 0);
		base.receiveShadow = true;
		g.add(base);

		const gravel = new THREE.Mesh(new THREE.BoxGeometry(TRACKS * LANE_W + 1.5, 0.15, SEG_LEN), gravelMat);
		gravel.position.set(0, -0.02, 0);
		g.add(gravel);

		// Rails and sleepers for each track separately
		for (let t = 0; t < TRACKS; t++) {
			const x = laneX(t);

			// Rails
			const rail1 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, SEG_LEN), railMat);
			const rail2 = rail1.clone();
			rail1.position.set(x - 0.4, 0.12, 0);
			rail2.position.set(x + 0.4, 0.12, 0);
			g.add(rail1, rail2);

			// Wooden sleepers for THIS track only (width ~1.2 to span just the two rails)
			const sleeperGeo = new THREE.BoxGeometry(1.2, 0.1, 0.28);
			for (let k = 0; k < 12; k++) {
				const sleeper = new THREE.Mesh(sleeperGeo, sleeperMat);
				sleeper.position.set(x, 0.03, (k - 5.5) * (SEG_LEN / 12));
				sleeper.receiveShadow = true;
				g.add(sleeper);
			}
		}

		g.position.z = -s * SEG_LEN;
		segs.push(g);
		ground.add(g);
	}
}

// ====== Background (STATIC) ======
const background = new THREE.Group();
scene.add(background);

function createBackground() {
	while (background.children.length) background.remove(background.children[0]);

	// Static hills only on the RIGHT side (fewer on mobile)
	const hillCount = isMobile ? 3 : 6;
	for (let i = 0; i < hillCount; i++) {
		const hill = new THREE.Mesh(
			new THREE.SphereGeometry(15 + Math.random() * 10, isMobile ? 10 : 16, isMobile ? 8 : 12, 0, Math.PI * 2, 0, Math.PI / 2),
			hillMat
		);
		hill.position.set(37 + Math.random() * 20, -4, -30 - i * (isMobile ? 37 : 20));
		background.add(hill);
	}

	// SEA on the LEFT (far background) - positioned very low to never show at bottom
	const seaMat = new THREE.MeshLambertMaterial({ color: 0x1e90ff });
	const sea = new THREE.Mesh(
		new THREE.PlaneGeometry(100, 300),
		seaMat
	);
	sea.rotation.x = -Math.PI / 2;
	sea.position.set(-55, -5, -100);
	background.add(sea);

	// Waves effect (fewer on mobile)
	if (!isMobile) {
		const waveMat = new THREE.MeshLambertMaterial({ color: 0x4db8ff, transparent: true, opacity: 0.6 });
		for (let i = 0; i < 5; i++) {
			const wave = new THREE.Mesh(
				new THREE.PlaneGeometry(60, 2),
				waveMat
			);
			wave.rotation.x = -Math.PI / 2;
			wave.position.set(-50, -1.4, -30 - i * 35);
			background.add(wave);
		}
	}

	// BEACH (yellow sand strip)
	const sandMat = new THREE.MeshLambertMaterial({ color: 0xFFD700 });
	const beach = new THREE.Mesh(
		new THREE.PlaneGeometry(10, 300),
		sandMat
	);
	beach.rotation.x = -Math.PI / 2;
	beach.position.set(-20, -0.04, -80);
	background.add(beach);

	// Static clouds (fewer on mobile)
	const cloudCount = isMobile ? 4 : 8;
	const puffCount = isMobile ? 3 : 5;
	for (let i = 0; i < cloudCount; i++) {
		const cloud = new THREE.Group();
		const mat = new THREE.MeshLambertMaterial({ color: 0xffffff });
		for (let j = 0; j < puffCount; j++) {
			const puff = new THREE.Mesh(new THREE.SphereGeometry(0.8 + Math.random() * 0.5, isMobile ? 6 : 8, isMobile ? 6 : 8), mat);
			puff.position.set((Math.random() - 0.5) * 2, (Math.random() - 0.5) * 0.5, (Math.random() - 0.5));
			cloud.add(puff);
		}
		cloud.position.set((Math.random() - 0.5) * 80, 15 + Math.random() * 8, -30 - Math.random() * 60);
		background.add(cloud);
	}
}

// ====== Road and Cars ======
const roadGroup = new THREE.Group();
scene.add(roadGroup);
const cars = [];
const roadDashes = [];

function createRoad() {
	while (roadGroup.children.length) roadGroup.remove(roadGroup.children[0]);
	cars.length = 0;
	roadDashes.length = 0;

	// Road surface
	const roadMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
	const road = new THREE.Mesh(
		new THREE.PlaneGeometry(4, 300),
		roadMat
	);
	road.rotation.x = -Math.PI / 2;
	road.position.set(-10, 0.01, -80);
	roadGroup.add(road);

	// Road edges (white lines)
	const lineMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
	const lineLeft = new THREE.Mesh(
		new THREE.PlaneGeometry(0.15, 300),
		lineMat
	);
	lineLeft.rotation.x = -Math.PI / 2;
	lineLeft.position.set(-12, 0.02, -80);
	roadGroup.add(lineLeft);

	const lineRight = lineLeft.clone();
	lineRight.position.x = -8;
	roadGroup.add(lineRight);

	// Center dashed line (will be animated) - fewer on mobile
	const dashCount = isMobile ? 20 : 30;
	for (let i = 0; i < dashCount; i++) {
		const dash = new THREE.Mesh(
			new THREE.PlaneGeometry(0.15, 3),
			new THREE.MeshLambertMaterial({ color: 0xffff00 })
		);
		dash.rotation.x = -Math.PI / 2;
		dash.position.set(-10, 0.025, 20 - i * (isMobile ? 9 : 6));
		roadGroup.add(dash);
		roadDashes.push(dash);
	}
}

function makeCar(color) {
	const car = new THREE.Group();

	// Car body
	const bodyMat = new THREE.MeshLambertMaterial({ color });
	const body = new THREE.Mesh(
		new THREE.BoxGeometry(1.2, 0.5, 2.2),
		bodyMat
	);
	body.position.y = 0.4;
	car.add(body);

	// Car cabin
	const cabinMat = new THREE.MeshLambertMaterial({ color: 0x87CEEB });
	const cabin = new THREE.Mesh(
		new THREE.BoxGeometry(1.0, 0.4, 1.2),
		cabinMat
	);
	cabin.position.set(0, 0.75, -0.2);
	car.add(cabin);

	// Wheels
	const wheelMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
	const wheelGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.15, 12);
	const positions = [[-0.55, 0.2, 0.6], [0.55, 0.2, 0.6], [-0.55, 0.2, -0.6], [0.55, 0.2, -0.6]];
	positions.forEach(pos => {
		const wheel = new THREE.Mesh(wheelGeo, wheelMat);
		wheel.rotation.z = Math.PI / 2;
		wheel.position.set(...pos);
		car.add(wheel);
	});

	// Headlights
	const lightMat = new THREE.MeshBasicMaterial({ color: 0xffffaa });
	const lightL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.15, 0.05), lightMat);
	lightL.position.set(-0.4, 0.35, -1.13);
	car.add(lightL);
	const lightR = lightL.clone();
	lightR.position.x = 0.4;
	car.add(lightR);

	// Taillights
	const tailMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
	const tailL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.12, 0.05), tailMat);
	tailL.position.set(-0.4, 0.35, 1.13);
	car.add(tailL);
	const tailR = tailL.clone();
	tailR.position.x = 0.4;
	car.add(tailR);

	return car;
}

const carColors = [0xff4444, 0x4444ff, 0x44ff44, 0xffff44, 0xff44ff, 0x44ffff, 0xffffff, 0xff8800];

function spawnCar() {
	const car = makeCar(carColors[Math.floor(Math.random() * carColors.length)]);
	car.position.set(-10, 0, -120 - Math.random() * 30);
	car.userData.speed = 5 + Math.random() * 4; // Random speed
	car.rotation.y = Math.PI; // Face forward (toward player)
	cars.push(car);
	scene.add(car);
}

// ====== Moving Environment ======
const environment = new THREE.Group();
scene.add(environment);
const windmills = [];

function makeTree(x, z, scale = 1) {
	const tree = new THREE.Group();
	const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 1.2, 8), new THREE.MeshLambertMaterial({ color: 0x6B4423 }));
	trunk.position.y = 0.6;
	tree.add(trunk);
	const crown = new THREE.Mesh(new THREE.SphereGeometry(0.7, 10, 10), new THREE.MeshLambertMaterial({ color: 0x2E8B2E }));
	crown.position.y = 1.4;
	tree.add(crown);
	const crown2 = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 10), new THREE.MeshLambertMaterial({ color: 0x3CB371 }));
	crown2.position.set(0.2, 1.8, 0.1);
	tree.add(crown2);
	tree.position.set(x, 0, z);
	tree.scale.setScalar(scale);
	return tree;
}

function makeHouse(x, z, hue = 0) {
	const house = new THREE.Group();
	const colors = [0xFFE4B5, 0xFFC0CB, 0xADD8E6, 0xFFFFE0];
	const roofs = [0x8B4513, 0xA52A2A, 0x2F4F4F];

	const walls = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.4, 1.5), new THREE.MeshLambertMaterial({ color: colors[hue % colors.length] }));
	walls.position.y = 0.7;
	house.add(walls);

	const roof = new THREE.Mesh(new THREE.ConeGeometry(1.5, 0.9, 4), new THREE.MeshLambertMaterial({ color: roofs[hue % roofs.length] }));
	roof.position.y = 1.85;
	roof.rotation.y = Math.PI / 4;
	house.add(roof);

	house.position.set(x, 0, z);
	return house;
}

function makeWindmill(x, z) {
	const mill = new THREE.Group();
	const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.7, 3, 8), new THREE.MeshLambertMaterial({ color: 0xF5DEB3 }));
	tower.position.y = 1.5;
	mill.add(tower);

	const roof = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.7, 8), new THREE.MeshLambertMaterial({ color: 0x8B4513 }));
	roof.position.y = 3.35;
	mill.add(roof);

	const bladeGroup = new THREE.Group();
	for (let i = 0; i < 4; i++) {
		const blade = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.8, 0.05), new THREE.MeshLambertMaterial({ color: 0xffffff }));
		blade.position.y = 0.9;
		const wrapper = new THREE.Group();
		wrapper.add(blade);
		wrapper.rotation.z = (i * Math.PI) / 2;
		bladeGroup.add(wrapper);
	}
	bladeGroup.position.set(0, 2.5, 0.5);
	mill.add(bladeGroup);
	mill.bladeGroup = bladeGroup;

	mill.position.set(x, 0, z);
	return mill;
}

function makeSheep(x, z) {
	const sheep = new THREE.Group();
	const body = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 10), new THREE.MeshLambertMaterial({ color: 0xFFFAF0 }));
	body.position.y = 0.35;
	body.scale.set(1.2, 0.9, 1);
	sheep.add(body);
	const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), new THREE.MeshLambertMaterial({ color: 0x333333 }));
	head.position.set(0.3, 0.4, 0);
	sheep.add(head);
	sheep.position.set(x, 0, z);
	sheep.rotation.y = Math.random() * Math.PI * 2;
	return sheep;
}

function makeCow(x, z) {
	const cow = new THREE.Group();
	const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.45, 0.4), new THREE.MeshLambertMaterial({ color: 0xffffff }));
	body.position.y = 0.4;
	cow.add(body);
	const spot = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), new THREE.MeshLambertMaterial({ color: 0x333333 }));
	spot.position.set(0.1, 0.5, 0.2);
	spot.scale.y = 0.5;
	cow.add(spot);
	const head = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 0.2), new THREE.MeshLambertMaterial({ color: 0xffffff }));
	head.position.set(0.45, 0.45, 0);
	cow.add(head);
	cow.position.set(x, 0, z);
	cow.rotation.y = Math.random() * Math.PI * 2;
	return cow;
}

function makeSignal(x, z) {
	const signal = new THREE.Group();
	const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 2.5, 8), new THREE.MeshLambertMaterial({ color: 0x333333 }));
	post.position.y = 1.25;
	signal.add(post);
	const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.5, 0.15), new THREE.MeshLambertMaterial({ color: 0x222222 }));
	head.position.y = 2.6;
	signal.add(head);
	const light = new THREE.Mesh(new THREE.CircleGeometry(0.08, 12), new THREE.MeshBasicMaterial({ color: 0x00FF00 }));
	light.position.set(0, 2.5, 0.08);
	signal.add(light);
	signal.position.set(x, 0, z);
	return signal;
}

function makePond(x, z, size = 1) {
	const pond = new THREE.Group();

	// Water surface (blue ellipse)
	const waterMat = new THREE.MeshLambertMaterial({ color: 0x4a90d9, transparent: true, opacity: 0.85 });
	const water = new THREE.Mesh(
		new THREE.CircleGeometry(2 * size, 24),
		waterMat
	);
	water.rotation.x = -Math.PI / 2;
	water.position.y = 0.02;
	water.scale.set(1.3, 1, 1); // Make it elliptical
	pond.add(water);

	// Lighter center reflection
	const reflection = new THREE.Mesh(
		new THREE.CircleGeometry(1.2 * size, 20),
		new THREE.MeshLambertMaterial({ color: 0x7ab8eb, transparent: true, opacity: 0.6 })
	);
	reflection.rotation.x = -Math.PI / 2;
	reflection.position.set(0.3 * size, 0.03, -0.2 * size);
	reflection.scale.set(1.2, 1, 1);
	pond.add(reflection);

	// Reeds/grass around the pond
	const reedMat = new THREE.MeshLambertMaterial({ color: 0x556B2F });
	for (let i = 0; i < 8; i++) {
		const angle = (i / 8) * Math.PI * 2 + Math.random() * 0.3;
		const dist = 1.8 * size + Math.random() * 0.5;
		const reed = new THREE.Mesh(
			new THREE.CylinderGeometry(0.03, 0.05, 0.6 + Math.random() * 0.3, 6),
			reedMat
		);
		reed.position.set(
			Math.cos(angle) * dist,
			0.3,
			Math.sin(angle) * dist * 0.8
		);
		reed.rotation.z = (Math.random() - 0.5) * 0.2;
		pond.add(reed);
	}

	// Small rocks around edge
	const rockMat = new THREE.MeshLambertMaterial({ color: 0x808080 });
	for (let i = 0; i < 5; i++) {
		const angle = Math.random() * Math.PI * 2;
		const dist = 2.2 * size + Math.random() * 0.3;
		const rock = new THREE.Mesh(
			new THREE.DodecahedronGeometry(0.15 + Math.random() * 0.1),
			rockMat
		);
		rock.position.set(
			Math.cos(angle) * dist,
			0.08,
			Math.sin(angle) * dist * 0.8
		);
		pond.add(rock);
	}

	pond.position.set(x, 0, z);
	return pond;
}

// ====== BRIDGE OVER TRACKS ======
const bridgeGroup = new THREE.Group();
scene.add(bridgeGroup);

function createBridge() {
	while (bridgeGroup.children.length) bridgeGroup.remove(bridgeGroup.children[0]);

	const trackWidth = TRACKS * LANE_W + 3;
	const bridgeWidth = 4;
	const bridgeHeight = 6;
	const pillarWidth = 1.2;

	const stoneMat = new THREE.MeshLambertMaterial({ color: 0x808080 });
	const stoneMatDark = new THREE.MeshLambertMaterial({ color: 0x606060 });
	const brickMat = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
	const metalMat = new THREE.MeshLambertMaterial({ color: 0x444444 });

	// LEFT PILLAR
	const pillarGeo = new THREE.BoxGeometry(pillarWidth, bridgeHeight, bridgeWidth);
	const pillarLeft = new THREE.Mesh(pillarGeo, stoneMat);
	pillarLeft.position.set(-trackWidth / 2 - pillarWidth / 2, bridgeHeight / 2, 0);
	bridgeGroup.add(pillarLeft);

	// Right pillar
	const pillarRight = new THREE.Mesh(pillarGeo, stoneMat);
	pillarRight.position.set(trackWidth / 2 + pillarWidth / 2, bridgeHeight / 2, 0);
	bridgeGroup.add(pillarRight);

	// Pillar tops (decorative caps)
	const capGeo = new THREE.BoxGeometry(pillarWidth + 0.3, 0.4, bridgeWidth + 0.3);
	const capLeft = new THREE.Mesh(capGeo, stoneMatDark);
	capLeft.position.set(-trackWidth / 2 - pillarWidth / 2, bridgeHeight + 0.2, 0);
	bridgeGroup.add(capLeft);

	const capRight = new THREE.Mesh(capGeo, stoneMatDark);
	capRight.position.set(trackWidth / 2 + pillarWidth / 2, bridgeHeight + 0.2, 0);
	bridgeGroup.add(capRight);

	// BRIDGE DECK (the road on top)
	const deckLength = trackWidth + pillarWidth * 2 + 2;
	const deckGeo = new THREE.BoxGeometry(deckLength, 0.5, bridgeWidth);
	const deck = new THREE.Mesh(deckGeo, stoneMatDark);
	deck.position.set(0, bridgeHeight + 0.5, 0);
	bridgeGroup.add(deck);

	// Road surface on deck
	const roadGeo = new THREE.BoxGeometry(deckLength, 0.1, bridgeWidth - 0.6);
	const road = new THREE.Mesh(roadGeo, new THREE.MeshLambertMaterial({ color: 0x333333 }));
	road.position.set(0, bridgeHeight + 0.8, 0);
	bridgeGroup.add(road);

	// RAILINGS
	const railingMat = new THREE.MeshLambertMaterial({ color: 0x222222 });

	// Front railing posts
	for (let i = 0; i < 8; i++) {
		const postX = -deckLength / 2 + 1 + i * (deckLength - 2) / 7;
		const post = new THREE.Mesh(
			new THREE.BoxGeometry(0.15, 1.2, 0.15),
			railingMat
		);
		post.position.set(postX, bridgeHeight + 1.35, bridgeWidth / 2 - 0.2);
		bridgeGroup.add(post);

		// Back railing post
		const postBack = post.clone();
		postBack.position.z = -bridgeWidth / 2 + 0.2;
		bridgeGroup.add(postBack);
	}

	// Railing bars (horizontal)
	const barGeo = new THREE.BoxGeometry(deckLength - 1, 0.1, 0.1);
	const barFront = new THREE.Mesh(barGeo, railingMat);
	barFront.position.set(0, bridgeHeight + 1.8, bridgeWidth / 2 - 0.2);
	bridgeGroup.add(barFront);

	const barBack = new THREE.Mesh(barGeo, railingMat);
	barBack.position.set(0, bridgeHeight + 1.8, -bridgeWidth / 2 + 0.2);
	bridgeGroup.add(barBack);

	// Lower bar
	const barFrontLow = new THREE.Mesh(barGeo, railingMat);
	barFrontLow.position.set(0, bridgeHeight + 1.2, bridgeWidth / 2 - 0.2);
	bridgeGroup.add(barFrontLow);

	const barBackLow = new THREE.Mesh(barGeo, railingMat);
	barBackLow.position.set(0, bridgeHeight + 1.2, -bridgeWidth / 2 + 0.2);
	bridgeGroup.add(barBackLow);

	// ARCH under the bridge (decorative)
	const archSegments = 12;
	const archRadius = trackWidth / 2;
	for (let i = 0; i <= archSegments; i++) {
		const angle = Math.PI - (i / archSegments) * Math.PI;
		const archStone = new THREE.Mesh(
			new THREE.BoxGeometry(0.6, 0.5, bridgeWidth - 0.5),
			stoneMat
		);
		archStone.position.set(
			Math.cos(angle) * archRadius,
			bridgeHeight - 1 + Math.sin(angle) * 2,
			0
		);
		archStone.rotation.z = angle - Math.PI / 2;
		bridgeGroup.add(archStone);
	}

	// Decorative elements on pillars
	for (let side = -1; side <= 1; side += 2) {
		const x = side * (trackWidth / 2 + pillarWidth / 2);

		// Pillar stripes
		for (let j = 0; j < 3; j++) {
			const stripe = new THREE.Mesh(
				new THREE.BoxGeometry(pillarWidth + 0.1, 0.2, bridgeWidth + 0.1),
				stoneMatDark
			);
			stripe.position.set(x, 1.5 + j * 2, 0);
			bridgeGroup.add(stripe);
		}
	}

	bridgeGroup.position.z = BRIDGE_START_Z;
}

function createEnvironment() {
	while (environment.children.length) environment.remove(environment.children[0]);
	windmills.length = 0;

	// Clear cars
	cars.forEach(c => scene.remove(c));
	cars.length = 0;

	// Trees only on RIGHT side (fewer on mobile)
	const treeCount = isMobile ? 6 : 10;
	for (let i = 0; i < treeCount; i++) {
		environment.add(makeTree(7 + Math.random() * 3, -i * (isMobile ? 18 : 12) - 8, 0.9 + Math.random() * 0.4));
	}

	// Houses only on RIGHT side
	environment.add(makeHouse(13, -25, 0));
	environment.add(makeHouse(15, -55, 1));
	if (!isMobile) environment.add(makeHouse(12, -100, 2));

	// Windmills only on RIGHT side
	const wm1 = makeWindmill(16, -40);
	windmills.push(wm1);
	environment.add(wm1);
	if (!isMobile) {
		const wm2 = makeWindmill(18, -95);
		windmills.push(wm2);
		environment.add(wm2);
	}

	// Ponds only on RIGHT side (skip on mobile)
	if (!isMobile) {
		environment.add(makePond(14, -65, 1.0));
		environment.add(makePond(12, -120, 0.8));
	}

	// Signals near tracks
	environment.add(makeSignal(-4, -18));
	if (!isMobile) environment.add(makeSignal(4, -50));

	// Animals only on RIGHT side (fewer on mobile)
	const sheepCount = isMobile ? 2 : 5;
	for (let i = 0; i < sheepCount; i++) {
		environment.add(makeSheep(9 + Math.random() * 3, -15 - i * (isMobile ? 40 : 22)));
	}
	environment.add(makeCow(11, -45));
	if (!isMobile) environment.add(makeCow(13, -85));

	// Beach umbrellas (fewer on mobile)
	const umbrellaCount = isMobile ? 2 : 4;
	for (let i = 0; i < umbrellaCount; i++) {
		const umbrella = makeBeachUmbrella();
		umbrella.position.set(-18 - Math.random() * 2, 0, -20 - i * (isMobile ? 50 : 30));
		environment.add(umbrella);
	}

	// Create road
	createRoad();

	// Spawn initial cars (fewer on mobile)
	const carCount = isMobile ? 2 : 4;
	for (let i = 0; i < carCount; i++) {
		spawnCar();
		cars[i].position.z = -20 - i * (isMobile ? 50 : 35);
	}

	// Create bridge
	createBridge();
}

function makeBeachUmbrella() {
	const umbrella = new THREE.Group();

	// Pole
	const pole = new THREE.Mesh(
		new THREE.CylinderGeometry(0.05, 0.05, 2, 8),
		new THREE.MeshLambertMaterial({ color: 0x8B4513 })
	);
	pole.position.y = 1;
	umbrella.add(pole);

	// Canopy
	const colors = [0xff4444, 0x4444ff, 0xffff44, 0xff44ff];
	const canopy = new THREE.Mesh(
		new THREE.ConeGeometry(1.2, 0.6, 8),
		new THREE.MeshLambertMaterial({ color: colors[Math.floor(Math.random() * colors.length)] })
	);
	canopy.position.y = 2;
	canopy.rotation.x = Math.PI;
	umbrella.add(canopy);

	// Beach towel
	const towel = new THREE.Mesh(
		new THREE.PlaneGeometry(1.5, 0.8),
		new THREE.MeshLambertMaterial({ color: colors[Math.floor(Math.random() * colors.length)] })
	);
	towel.rotation.x = -Math.PI / 2;
	towel.position.set(0.8, 0.02, 0.3);
	umbrella.add(towel);

	return umbrella;
}

// ====== Train ======
const train = new THREE.Group();
scene.add(train);

const blueMat = new THREE.MeshLambertMaterial({ color: 0x2b6cff });
const darkBlueMat = new THREE.MeshLambertMaterial({ color: 0x1f3a7a });

const body = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.0, 2.4), blueMat);
body.position.set(0, 0.65, 0);
train.add(body);

const boiler = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 1.8, 20), blueMat);
boiler.rotation.x = Math.PI / 2;
boiler.position.set(0, 0.95, -0.3);
train.add(boiler);

const boilerFront = new THREE.Mesh(new THREE.CircleGeometry(0.55, 20), darkBlueMat);
boilerFront.position.set(0, 0.95, -1.2);
train.add(boilerFront);

const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.9, 1.0), blueMat);
cabin.position.set(0, 1.35, 0.8);
train.add(cabin);

const cabinRoof = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.15, 1.2), darkBlueMat);
cabinRoof.position.set(0, 1.87, 0.8);
train.add(cabinRoof);

const windowMat = new THREE.MeshLambertMaterial({ color: 0x87CEEB });
const cabinWindow = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.5, 0.6), windowMat);
cabinWindow.position.set(0.71, 1.35, 0.8);
train.add(cabinWindow);
train.add(cabinWindow.clone().translateX(-1.42));

const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 0.45, 12), darkBlueMat);
chimney.position.set(0, 1.45, -0.95);
train.add(chimney);

const chimneyTop = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.18, 0.12, 12), darkBlueMat);
chimneyTop.position.set(0, 1.72, -0.95);
train.add(chimneyTop);

const dome = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0xFFD700 }));
dome.position.set(0, 1.25, -0.4);
train.add(dome);

const buffer = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.25, 0.15), new THREE.MeshLambertMaterial({ color: 0xcc2222 }));
buffer.position.set(0, 0.3, -1.25);
train.add(buffer);

const wheels = [];
function makeWheel(x, z, r) {
	const w = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.18, 16), wheelMat);
	w.rotation.z = Math.PI / 2;
	w.position.set(x, r, z);
	return w;
}
wheels.push(makeWheel(-0.7, -0.75, 0.3));
wheels.push(makeWheel(0.7, -0.75, 0.3));
wheels.push(makeWheel(-0.7, 0.65, 0.22));
wheels.push(makeWheel(0.7, 0.65, 0.22));
wheels.forEach(w => train.add(w));

// Face
const faceCanvas = document.createElement("canvas");
faceCanvas.width = 256;
faceCanvas.height = 256;
const fctx = faceCanvas.getContext("2d");

function drawFace(blink = 0, expression = "happy") {
	fctx.clearRect(0, 0, 256, 256);
	fctx.fillStyle = "#FFF5E6";
	fctx.beginPath();
	fctx.arc(128, 128, 110, 0, Math.PI * 2);
	fctx.fill();
	fctx.lineWidth = 6;
	fctx.strokeStyle = "#D4C4A8";
	fctx.stroke();

	const eyeY = 95, eyeX1 = 85, eyeX2 = 171, eyeW = 28, eyeH = 32;
	fctx.fillStyle = "#fff";
	fctx.beginPath();
	fctx.ellipse(eyeX1, eyeY, eyeW, eyeH * (1 - blink), 0, 0, Math.PI * 2);
	fctx.fill();
	fctx.beginPath();
	fctx.ellipse(eyeX2, eyeY, eyeW, eyeH * (1 - blink), 0, 0, Math.PI * 2);
	fctx.fill();
	fctx.strokeStyle = "#333";
	fctx.lineWidth = 3;
	fctx.stroke();

	if (blink < 0.8) {
		fctx.fillStyle = "#1a1a1a";
		fctx.beginPath();
		fctx.arc(eyeX1 + 4, eyeY + 3, 10, 0, Math.PI * 2);
		fctx.fill();
		fctx.beginPath();
		fctx.arc(eyeX2 + 4, eyeY + 3, 10, 0, Math.PI * 2);
		fctx.fill();
		fctx.fillStyle = "#fff";
		fctx.beginPath();
		fctx.arc(eyeX1 - 2, eyeY - 5, 4, 0, Math.PI * 2);
		fctx.fill();
		fctx.beginPath();
		fctx.arc(eyeX2 - 2, eyeY - 5, 4, 0, Math.PI * 2);
		fctx.fill();
	}

	fctx.strokeStyle = "#5D4037";
	fctx.lineWidth = 7;
	fctx.lineCap = "round";
	if (expression === "confused") {
		fctx.beginPath();
		fctx.moveTo(eyeX1 - 20, eyeY - 38);
		fctx.lineTo(eyeX1 + 20, eyeY - 45);
		fctx.stroke();
		fctx.beginPath();
		fctx.moveTo(eyeX2 - 20, eyeY - 45);
		fctx.lineTo(eyeX2 + 20, eyeY - 38);
		fctx.stroke();
	} else {
		fctx.beginPath();
		fctx.moveTo(eyeX1 - 22, eyeY - 42);
		fctx.lineTo(eyeX1 + 22, eyeY - 42);
		fctx.stroke();
		fctx.beginPath();
		fctx.moveTo(eyeX2 - 22, eyeY - 42);
		fctx.lineTo(eyeX2 + 22, eyeY - 42);
		fctx.stroke();
	}

	fctx.fillStyle = "rgba(255,180,180,0.4)";
	fctx.beginPath();
	fctx.ellipse(55, 145, 18, 12, 0, 0, Math.PI * 2);
	fctx.fill();
	fctx.beginPath();
	fctx.ellipse(201, 145, 18, 12, 0, 0, Math.PI * 2);
	fctx.fill();

	fctx.strokeStyle = "#333";
	fctx.fillStyle = "#E57373";
	fctx.lineWidth = 5;
	if (expression === "happy") {
		fctx.beginPath();
		fctx.arc(128, 155, 42, 0.15 * Math.PI, 0.85 * Math.PI);
		fctx.stroke();
		fctx.beginPath();
		fctx.arc(128, 155, 35, 0.1 * Math.PI, 0.9 * Math.PI);
		fctx.fill();
	} else {
		fctx.beginPath();
		fctx.arc(128, 165, 15, 0, Math.PI * 2);
		fctx.fill();
		fctx.stroke();
	}
}
drawFace(0, "happy");

const faceTex = new THREE.CanvasTexture(faceCanvas);
const face = new THREE.Mesh(new THREE.CircleGeometry(0.5, 32), new THREE.MeshBasicMaterial({ map: faceTex }));
face.position.set(0, 0.95, -1.21);
train.add(face);

// Steam
const steamPuffs = [];
for (let i = 0; i < 8; i++) {
	const puff = new THREE.Mesh(
		new THREE.SphereGeometry(0.12, 8, 8),
		new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0 })
	);
	puff.position.set(0, 1.8, -0.95);
	puff.userData = { life: 0, active: false };
	steamPuffs.push(puff);
	train.add(puff);
}

train.position.set(0, 0, 2);

// ====== Wagon ======
function makeWagon(color) {
	const wagon = new THREE.Group();
	const mat = new THREE.MeshLambertMaterial({ color });
	const dark = new THREE.MeshLambertMaterial({ color: new THREE.Color(color).multiplyScalar(0.7) });

	const wBody = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.7, 1.2), mat);
	wBody.position.y = 0.55;
	wagon.add(wBody);

	const trim = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.1, 1.25), dark);
	trim.position.y = 0.95;
	wagon.add(trim);

	for (let i = 0; i < 4; i++) {
		const whl = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.14, 14), wheelMat);
		whl.rotation.z = Math.PI / 2;
		whl.position.set(i < 2 ? -0.5 : 0.5, 0.2, i % 2 ? 0.4 : -0.4);
		wagon.add(whl);
	}

	// Wagon face
	const wfc = document.createElement("canvas");
	wfc.width = 128;
	wfc.height = 128;
	const wfctx = wfc.getContext("2d");

	wfctx.fillStyle = "#FFF5E6";
	wfctx.beginPath();
	wfctx.arc(64, 64, 50, 0, Math.PI * 2);
	wfctx.fill();
	wfctx.strokeStyle = "#D4C4A8";
	wfctx.lineWidth = 3;
	wfctx.stroke();

	wfctx.fillStyle = "#fff";
	wfctx.beginPath();
	wfctx.ellipse(45, 55, 12, 14, 0, 0, Math.PI * 2);
	wfctx.fill();
	wfctx.beginPath();
	wfctx.ellipse(83, 55, 12, 14, 0, 0, Math.PI * 2);
	wfctx.fill();
	wfctx.strokeStyle = "#333";
	wfctx.lineWidth = 2;
	wfctx.stroke();

	wfctx.fillStyle = "#1a1a1a";
	wfctx.beginPath();
	wfctx.arc(47, 57, 5, 0, Math.PI * 2);
	wfctx.fill();
	wfctx.beginPath();
	wfctx.arc(85, 57, 5, 0, Math.PI * 2);
	wfctx.fill();

	wfctx.fillStyle = "#fff";
	wfctx.beginPath();
	wfctx.arc(43, 52, 2, 0, Math.PI * 2);
	wfctx.fill();
	wfctx.beginPath();
	wfctx.arc(81, 52, 2, 0, Math.PI * 2);
	wfctx.fill();

	wfctx.strokeStyle = "#333";
	wfctx.lineWidth = 3;
	wfctx.lineCap = "round";
	wfctx.beginPath();
	wfctx.arc(64, 72, 20, 0.15 * Math.PI, 0.85 * Math.PI);
	wfctx.stroke();

	wfctx.fillStyle = "rgba(255,180,180,0.4)";
	wfctx.beginPath();
	wfctx.ellipse(28, 75, 8, 5, 0, 0, Math.PI * 2);
	wfctx.fill();
	wfctx.beginPath();
	wfctx.ellipse(100, 75, 8, 5, 0, 0, Math.PI * 2);
	wfctx.fill();

	const wagonFaceTex = new THREE.CanvasTexture(wfc);
	const wagonFace = new THREE.Mesh(new THREE.CircleGeometry(0.35, 24), new THREE.MeshBasicMaterial({ map: wagonFaceTex }));
	wagonFace.position.set(0, 0.6, 0.61);
	wagon.add(wagonFace);
	const wagonFaceBack = wagonFace.clone();
	wagonFaceBack.position.z = -0.61;
	wagonFaceBack.rotation.y = Math.PI;
	wagon.add(wagonFaceBack);

	return wagon;
}

const wagonColors = [0xff6666, 0xffcc44, 0x66cc66, 0x6688ff, 0xff88cc];
let wagonIdx = 0;

// Two rows system - each row has wagon + obstacles
const rows = [];

function createRow(spawnZ) {
	const row = {
		safeLane: Math.floor(Math.random() * TRACKS),
		z: spawnZ,
		wagon: null,
		obstacles: [],
		collected: false,
		passed: false
	};

	// Create wagon
	wagonIdx = (wagonIdx + 1) % wagonColors.length;
	row.wagon = makeWagon(wagonColors[wagonIdx]);
	row.wagon.position.set(laneX(row.safeLane), 0, spawnZ);
	scene.add(row.wagon);

	// Create obstacles on other lanes
	for (let i = 0; i < TRACKS; i++) {
		if (i === row.safeLane) continue;
		const o = makeObstacle(Math.floor(Math.random() * 3));
		o.position.set(laneX(i), 0, spawnZ);
		scene.add(o);
		row.obstacles.push(o);
	}

	return row;
}

function removeRow(row) {
	if (row.wagon) scene.remove(row.wagon);
	row.obstacles.forEach(o => scene.remove(o));
}

// ====== Obstacles ======
const obstacles = [];

function makeObstacle(type) {
	const obs = new THREE.Group();
	if (type === 0) {
		const log = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 1.8, 10), new THREE.MeshLambertMaterial({ color: 0x6B4423 }));
		log.rotation.z = Math.PI / 2;
		log.position.y = 0.3;
		obs.add(log);
		const leaves = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 10), new THREE.MeshLambertMaterial({ color: 0x2E8B2E }));
		leaves.position.set(0.9, 0.4, 0);
		obs.add(leaves);
	} else if (type === 1) {
		for (let i = 0; i < 4; i++) {
			const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.3 + Math.random() * 0.2), new THREE.MeshLambertMaterial({ color: 0x808080 }));
			rock.position.set((Math.random() - 0.5) * 0.6, 0.25 + Math.random() * 0.2, (Math.random() - 0.5) * 0.4);
			rock.rotation.set(Math.random(), Math.random(), Math.random());
			obs.add(rock);
		}
	} else {
		const postMat = new THREE.MeshLambertMaterial({ color: 0xDD3333 });
		const post1 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.2, 8), postMat);
		post1.position.set(-0.5, 0.6, 0);
		obs.add(post1);
		const post2 = post1.clone();
		post2.position.x = 0.5;
		obs.add(post2);
		const bar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.15, 0.08), new THREE.MeshLambertMaterial({ color: 0xffffff }));
		bar.position.y = 0.7;
		obs.add(bar);
		for (let i = 0; i < 5; i++) {
			const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.09), postMat);
			stripe.position.set(-0.45 + i * 0.22, 0.7, 0);
			obs.add(stripe);
		}
	}
	return obs;
}

// ====== Game Logic ======
const ROW_SPACING = 25; // Distance between rows

function clearAllRows() {
	rows.forEach(row => removeRow(row));
	rows.length = 0;
}

function spawnRound() {
	clearAllRows();

	// Create two initial rows
	rows.push(createRow(-40));
	rows.push(createRow(-40 - ROW_SPACING));

	phase = "PLAY";
}

function updateStars() {
	starSlots.forEach((slot, i) => {
		if (i < stars) {
			slot.classList.add("filled");
			slot.textContent = "⭐";
		} else {
			slot.classList.remove("filled");
			slot.textContent = "";
		}
	});
	levelDisplay.textContent = `${translations[currentLang].level} ${level}`;
}

function levelUp() {
	level++;
	gameSpeed = SPEED + (level - 1) * 0.8; // Each level adds 0.8 speed
	levelDisplay.classList.add("levelup");
	setTimeout(() => levelDisplay.classList.remove("levelup"), 500);
}

function showMessage(key) {
	messageEl.textContent = translations[currentLang][key] || key;
	messageEl.classList.add("show");
	setTimeout(() => messageEl.classList.remove("show"), 2000);
}

// ====== Pause Functions ======
function pauseGame() {
	if (phase === "MENU" || phase === "WIN" || isPaused) return;
	isPaused = true;
	previousPhase = phase;
	pauseMenu.classList.add("show");
}

function resumeGame() {
	isPaused = false;
	pauseMenu.classList.remove("show");
	phase = previousPhase;
}

function restartGame() {
	isPaused = false;
	pauseMenu.classList.remove("show");
	stars = 0;
	level = 1;
	gameSpeed = SPEED;
	updateStars();

	// Reset bridge position
	bridgeGroup.position.z = BRIDGE_START_Z;

	// Reset environment positions
	environment.children.forEach((obj, i) => {
		obj.position.z = -8 - i * 10;
	});

	spawnRound();
}

function quitToMenu() {
	isPaused = false;
	pauseMenu.classList.remove("show");
	hudEl.classList.add("hide");
	buttonsEl.classList.add("hide");
	pauseBtn.classList.add("hide");
	startScreen.classList.remove("hide");
	phase = "MENU";

	// Reset game state
	stars = 0;
	level = 1;
	gameSpeed = SPEED;
	updateStars();
	bridgeGroup.position.z = BRIDGE_START_Z;
}

// ====== Input ======
function setLane(i) {
	if (phase !== "PLAY" || isPaused) return;
	const newLane = Math.max(0, Math.min(TRACKS - 1, i));
	if (newLane !== lane) {
		playSound('tap');
		lane = newLane;
	}
}

function startGame() {
	initAudio();
	playSound('horn');

	startScreen.classList.add("hide");
	hudEl.classList.remove("hide");
	buttonsEl.classList.remove("hide");
	pauseBtn.classList.remove("hide");

	if (TRACKS === 2) {
		centerBtn.classList.add("hide");
		lane = 0;
	} else {
		centerBtn.classList.remove("hide");
		lane = 1;
	}

	createTrackSegments();
	createBackground();
	createEnvironment();

	train.position.set(laneX(lane), 0, 2);
	stars = 0;
	level = 1;
	gameSpeed = SPEED;
	updateStars();

	phase = "STARTING";
	setTimeout(() => spawnRound(), 500);
}

// Event Listeners
startBtn.addEventListener("click", startGame);
pauseBtn.addEventListener("click", pauseGame);
resumeBtn.addEventListener("click", resumeGame);
restartBtn.addEventListener("click", restartGame);
quitBtn.addEventListener("click", quitToMenu);

// Touch/tap controls
window.addEventListener("pointerdown", (e) => {
	if (phase === "MENU" || isPaused) return;
	if (e.target === pauseBtn || pauseBtn.contains(e.target)) return;
	if (e.target.closest('.track-btn')) return; // Let buttons handle themselves

	touchStartX = e.clientX;
	touchStartY = e.clientY;
	touchStartTime = Date.now();
});

window.addEventListener("pointerup", (e) => {
	if (phase === "MENU" || isPaused) return;
	if (e.target === pauseBtn || pauseBtn.contains(e.target)) return;
	if (e.target.closest('.track-btn')) return;

	const deltaX = e.clientX - touchStartX;
	const deltaY = e.clientY - touchStartY;
	const deltaTime = Date.now() - touchStartTime;

	// Swipe detection (quick horizontal movement)
	if (deltaTime < 300 && Math.abs(deltaX) > 30 && Math.abs(deltaX) > Math.abs(deltaY)) {
		// Swipe left or right
		if (deltaX > 0) {
			setLane(lane + 1); // Swipe right
		} else {
			setLane(lane - 1); // Swipe left
		}
	} else if (deltaTime < 200 && Math.abs(deltaX) < 20 && Math.abs(deltaY) < 20) {
		// Quick tap - use screen position
		const third = innerWidth / TRACKS;
		setLane(Math.floor(e.clientX / third));
	}
});

// Track buttons (explicit lane selection)
document.querySelectorAll(".track-btn").forEach(btn => {
	btn.addEventListener("pointerdown", (e) => {
		e.stopPropagation();
		e.preventDefault();
		setLane(parseInt(btn.dataset.lane));
	});
});

window.addEventListener("keydown", (e) => {
	if (e.key === "Escape") {
		if (isPaused) resumeGame();
		else pauseGame();
		return;
	}
	if (isPaused) return;

	if (e.key === "ArrowLeft" || e.key === "a") setLane(lane - 1);
	if (e.key === "ArrowRight" || e.key === "d") setLane(lane + 1);
	if (e.key === " " && phase === "MENU") startGame();
});

// Prevent context menu on long press
window.addEventListener("contextmenu", (e) => e.preventDefault());

// Prevent scrolling/bouncing
document.body.addEventListener("touchmove", (e) => {
	if (e.target.tagName !== "INPUT") e.preventDefault();
}, { passive: false });

addEventListener("resize", () => {
	camera.aspect = innerWidth / innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize(innerWidth, innerHeight);
});

// ====== Game Loop ======
let t0 = performance.now();
let blinkTimer = 0;
let steamTimer = 0;
let currentExpression = "happy";

function animate(now) {
	requestAnimationFrame(animate);

	// Always render, but skip game logic when paused
	if (isPaused) {
		renderer.render(scene, camera);
		return;
	}

	const dt = Math.min((now - t0) / 1000, 0.05);
	t0 = now;

	if (phase === "MENU") {
		renderer.render(scene, camera);
		return;
	}

	// Face blink
	blinkTimer += dt;
	const blink = (blinkTimer % 4.5 < 0.12) ? 0.9 : 0;
	drawFace(blink, currentExpression);
	faceTex.needsUpdate = true;

	// Train position
	train.position.x = lerp(train.position.x, laneX(lane), 12 * dt);

	// Steam
	if (phase === "PLAY" || phase === "STARTING") {
		steamTimer += dt;
		if (steamTimer > 0.25) {
			steamTimer = 0;
			const puff = steamPuffs.find(p => !p.userData.active);
			if (puff) {
				puff.userData.active = true;
				puff.userData.life = 0;
				puff.position.set((Math.random() - 0.5) * 0.15, 1.8, -0.95);
				puff.material.opacity = 0.8;
				puff.scale.setScalar(0.8);
			}
		}
	}
	steamPuffs.forEach(puff => {
		if (puff.userData.active) {
			puff.userData.life += dt;
			puff.position.y += dt * 1.5;
			puff.position.z -= dt * 0.3;
			puff.scale.addScalar(dt * 0.8);
			puff.material.opacity = Math.max(0, 0.8 - puff.userData.life);
			if (puff.userData.life > 1) puff.userData.active = false;
		}
	});

	// Windmills
	windmills.forEach(wm => {
		if (wm.bladeGroup) wm.bladeGroup.rotation.z += dt * 1.5;
	});

	// Move cars on the road
	cars.forEach(car => {
		car.position.z += car.userData.speed * dt;
		// Reset car when it goes past the player
		if (car.position.z > 30) {
			car.position.z = -120 - Math.random() * 30;
			car.userData.speed = 5 + Math.random() * 4;
		}
	});

	// Spawn new cars occasionally (fewer on mobile)
	const maxCars = isMobile ? 3 : 8;
	if (Math.random() < (isMobile ? 0.001 : 0.003) && cars.length < maxCars) {
		spawnCar();
	}

	if (phase === "PLAY" || phase === "CATCH") {
		// Move track segments
		for (const seg of segs) {
			seg.position.z += gameSpeed * dt;
			if (seg.position.z > SEG_LEN) seg.position.z -= SEG_LEN * SEG_COUNT;
		}

		// Move environment
		environment.children.forEach(obj => {
			obj.position.z += gameSpeed * dt * 0.5;
			if (obj.position.z > 15) obj.position.z -= 130;
		});

		// Move bridge
		bridgeGroup.position.z += gameSpeed * dt;
		if (bridgeGroup.position.z > 25) {
			bridgeGroup.position.z -= 140;
		}

		// Move road dashes (animated stripes)
		roadDashes.forEach(dash => {
			dash.position.z += gameSpeed * dt;
			if (dash.position.z > 25) {
				dash.position.z -= 180;
			}
		});

		// Move rows (wagons and obstacles)
		rows.forEach(row => {
			// Move wagon
			if (row.wagon) {
				row.wagon.position.z += gameSpeed * dt;
				row.wagon.rotation.z = Math.sin(performance.now() * 0.008) * 0.05;
			}
			// Move obstacles
			row.obstacles.forEach(o => o.position.z += gameSpeed * dt);
		});

		// Wheels
		wheels.forEach(w => w.rotation.x += gameSpeed * dt * 2);

		// Collision and collection
		if (phase === "PLAY") {
			// Process each row
			for (let i = rows.length - 1; i >= 0; i--) {
				const row = rows[i];
				if (!row.wagon) continue;

				const wagonZ = row.wagon.position.z;

				// Check if row passed player
				if (wagonZ > 10 && !row.passed) {
					row.passed = true;

					// Remove this row
					removeRow(row);
					rows.splice(i, 1);

					// Spawn new row far behind
					const lastRowZ = rows.length > 0 ? Math.min(...rows.map(r => r.wagon ? r.wagon.position.z : -100)) : -40;
					rows.push(createRow(lastRowZ - ROW_SPACING));
					continue;
				}

				// Check obstacle collision
				let hitObstacle = false;
				for (const o of row.obstacles) {
					if (Math.abs(o.position.z - 2) < 1.2 && Math.abs(o.position.x - train.position.x) < 1.0) {
						hitObstacle = true;
						break;
					}
				}

				if (hitObstacle) {
					phase = "HIT";
					currentExpression = "confused";
					playSound('wrong');
					showMessage('tryAgain');
					setTimeout(() => {
						currentExpression = "happy";
						spawnRound();
					}, 1800);
					break;
				}

				// Check wagon collection
				if (!row.collected &&
					Math.abs(wagonZ - 2) < 1.0 &&
					Math.abs(row.wagon.position.x - train.position.x) < 0.8) {
					row.collected = true;
					playSound('collect');
					stars++;
					updateStars();

					// Animate the collected wagon
					let popTime = 0;
					const wagon = row.wagon;
					const pop = setInterval(() => {
						popTime += 0.1;
						wagon.position.y = Math.sin(Math.min(popTime, Math.PI)) * 1.2;
						wagon.rotation.y += 0.2;

						if (popTime >= Math.PI) {
							clearInterval(pop);
							wagon.position.y = -10; // Hide below ground
							wagon.rotation.y = 0;

							// Check if level complete
							if (stars >= STARS_TO_WIN) {
								phase = "WIN";
								playSound('celebration');
								document.getElementById("next-level-text").textContent = `${translations[currentLang].nextLevel} ${level + 1}!`;
								celebrationEl.classList.add("show");
								setTimeout(() => {
									celebrationEl.classList.remove("show");
									stars = 0;
									levelUp();
									updateStars();
									spawnRound();
								}, 4000);
							}
						}
					}, 16);
				}
			}
		}
	}

	renderer.render(scene, camera);
}

// Init
createTrackSegments();
createBackground();
createEnvironment();
requestAnimationFrame(animate);