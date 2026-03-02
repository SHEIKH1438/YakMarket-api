// Gemora Landing 3D & interactions
// Аккуратные 3D‑сцены, оптимизированные под плавный скролл

function initSmoothAnchors() {
    const links = document.querySelectorAll('a[href^="#"]');
    links.forEach(link => {
        link.addEventListener('click', (event) => {
            const href = link.getAttribute('href');
            if (!href || href === '#') return;
            const target = document.querySelector(href);
            if (!target) return;
            event.preventDefault();
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });
}

function initScrollTopButton() {
    const btn = document.getElementById('scroll-top');
    if (!btn) return;

    btn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    let ticking = false;

    function onScroll() {
        const shouldShow = window.scrollY > 300;
        btn.classList.toggle('scroll-top--visible', shouldShow);
    }

    window.addEventListener(
        'scroll',
        () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    onScroll();
                    ticking = false;
                });
                ticking = true;
            }
        },
        { passive: true }
    );
}

// Simple 3D tilt on cards
function initTiltCards() {
    const cards = document.querySelectorAll('.tilt');
    if (!cards.length) return;

    const MAX_ROTATION = 6; // degrees

    cards.forEach(card => {
        let bounds = card.getBoundingClientRect();

        function handleMove(event) {
            const x = event.clientX - bounds.left;
            const y = event.clientY - bounds.top;
            const centerX = bounds.width / 2;
            const centerY = bounds.height / 2;
            const percentX = (x - centerX) / centerX;
            const percentY = (y - centerY) / centerY;

            const rotateY = percentX * MAX_ROTATION;
            const rotateX = -percentY * MAX_ROTATION;

            card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-2px)`;
        }

        function reset() {
            card.style.transform = '';
        }

        card.addEventListener('mouseenter', () => {
            bounds = card.getBoundingClientRect();
        });

        card.addEventListener('mousemove', handleMove);
        card.addEventListener('mouseleave', reset);
        window.addEventListener('resize', () => {
            bounds = card.getBoundingClientRect();
        });
    });
}

// Hero 3D background
function initHeroScene() {
    const canvas = document.getElementById('hero-3d');
    if (!canvas || typeof THREE === 'undefined') return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
    camera.position.set(0, 0, 6);

    const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));

    function resizeRenderer() {
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        if (width === 0 || height === 0) return;
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
    }

    resizeRenderer();

    // Central abstract sphere
    const sphereGeometry = new THREE.SphereGeometry(1.4, 64, 64);
    const sphereMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        metalness: 0.4,
        roughness: 0.2,
        transparent: true,
        opacity: 0.9
    });
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphere.position.set(0.4, 0.1, 0);
    scene.add(sphere);

    // Particles
    const particlesGeometry = new THREE.BufferGeometry();
    const particlesCount = 320;
    const positions = new Float32Array(particlesCount * 3);

    for (let i = 0; i < particlesCount; i++) {
        const i3 = i * 3;
        positions[i3] = (Math.random() - 0.5) * 10;
        positions[i3 + 1] = (Math.random() - 0.5) * 6;
        positions[i3 + 2] = (Math.random() - 0.5) * 6;
    }

    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const particlesMaterial = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.02,
        transparent: true,
        opacity: 0.45
    });

    const particles = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particles);

    // Lights
    const mainLight = new THREE.DirectionalLight(0xffffff, 1.2);
    mainLight.position.set(2, 3, 4);
    scene.add(mainLight);

    const softLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(softLight);

    let lastTime = 0;

    function animate(now) {
        const time = now * 0.001;
        const delta = time - lastTime;
        lastTime = time;

        sphere.rotation.y += delta * 0.35;
        sphere.rotation.x += delta * 0.18;

        particles.rotation.y += delta * 0.08;

        renderer.render(scene, camera);
        requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);

    window.addEventListener('resize', () => {
        resizeRenderer();
    });
}

// Scroll‑reactive 3D orb in ecosystem section
function initScrollOrbScene() {
    const canvas = document.getElementById('scroll-orb');
    const section = document.getElementById('about');
    if (!canvas || !section || typeof THREE === 'undefined') return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, canvas.clientWidth / canvas.clientHeight, 0.1, 50);
    camera.position.set(0, 0, 8);

    const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));

    function resize() {
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        if (!width || !height) return;
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
    }

    resize();

    const orbGeometry = new THREE.IcosahedronGeometry(1.1, 1);
    const orbMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        wireframe: false,
        metalness: 0.3,
        roughness: 0.35
    });

    const orb = new THREE.Mesh(orbGeometry, orbMaterial);
    scene.add(orb);

    const rimGeometry = new THREE.RingGeometry(1.5, 1.8, 64);
    const rimMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.12
    });
    const rim = new THREE.Mesh(rimGeometry, rimMaterial);
    rim.rotation.x = Math.PI / 2.2;
    scene.add(rim);

    const light = new THREE.DirectionalLight(0xffffff, 1.1);
    light.position.set(2, 3, 4);
    scene.add(light);
    scene.add(new THREE.AmbientLight(0xffffff, 0.4));

    let scrollProgress = 0;
    let lastScrollY = window.scrollY;
    let ticking = false;

    function updateScrollProgress() {
        const rect = section.getBoundingClientRect();
        const vh = window.innerHeight || document.documentElement.clientHeight;

        const start = vh * 0.2;
        const end = vh * 0.8;
        const clamped = Math.min(Math.max(rect.top, start), end);
        const progress = 1 - (clamped - start) / (end - start);
        scrollProgress = progress;
    }

    function onScroll() {
        const currentY = window.scrollY;
        if (Math.abs(currentY - lastScrollY) < 8) return;
        lastScrollY = currentY;
        updateScrollProgress();
    }

    window.addEventListener(
        'scroll',
        () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    onScroll();
                    ticking = false;
                });
                ticking = true;
            }
        },
        { passive: true }
    );

    updateScrollProgress();

    let lastTime = 0;

    function animate(now) {
        const time = now * 0.001;
        const delta = time - lastTime;
        lastTime = time;

        const depth = -4 + scrollProgress * 3.6; // движение к камере и обратно
        const scale = 0.9 + scrollProgress * 0.4;
        const wobble = Math.sin(time * 1.4) * 0.08;

        orb.position.z = depth;
        orb.scale.setScalar(scale + wobble * 0.1);

        orb.rotation.y += delta * 0.6;
        orb.rotation.x += delta * 0.35;
        rim.rotation.z += delta * 0.18;

        renderer.render(scene, camera);
        requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);

    window.addEventListener('resize', () => {
        resize();
    });
}

// Contact form via Formspree (graceful handling)
function initContactForm() {
    const form = document.getElementById('contact-form');
    const status = document.getElementById('form-status');
    if (!form || !status) return;

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const formData = new FormData(form);
        status.textContent = 'Отправка...';
        status.classList.remove('form-status--success', 'form-status--error');

        try {
            const response = await fetch(form.action, {
                method: form.method || 'POST',
                body: formData,
                headers: {
                    Accept: 'application/json'
                }
            });

            if (response.ok) {
                form.reset();
                status.textContent = 'Сообщение отправлено. Спасибо!';
                status.classList.add('form-status--success');
            } else {
                status.textContent = 'Не удалось отправить форму. Проверьте настройки Formspree.';
                status.classList.add('form-status--error');
            }
        } catch (error) {
            status.textContent = 'Произошла ошибка сети. Попробуйте позже.';
            status.classList.add('form-status--error');
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initSmoothAnchors();
    initScrollTopButton();
    initTiltCards();
    initHeroScene();
    initScrollOrbScene();
    initContactForm();
});

