/* ============================================
   GamerConnections - Script principal
   ============================================ */

(function () {
    'use strict';

    /* --------------------------------------------
       Lista de avatares disponíveis
       -------------------------------------------- */
    const AVATARS = [
        'assets/avatars/avatar1.svg?v=2',
        'assets/avatars/avatar2.svg?v=2',
        'assets/avatars/avatar3.svg?v=2',
        'assets/avatars/avatar4.svg?v=2',
        'assets/avatars/avatar5.svg?v=2',
        'assets/avatars/avatar6.svg?v=2',
        'assets/avatars/avatar7.svg?v=2',
        'assets/avatars/avatar8.svg?v=2',
    ];

    /* --------------------------------------------
       Helpers
       -------------------------------------------- */
    const $ = (sel, ctx = document) => ctx.querySelector(sel);
    const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

    /* ============================================
       1. Toggle de senha (mostrar/ocultar)
       ============================================ */
    function initPasswordToggles() {
        $$('.toggle-password').forEach((btn) => {
            btn.addEventListener('click', () => {
                const wrapper = btn.closest('.input-wrapper');
                if (!wrapper) return;
                const input = wrapper.querySelector('input');
                if (!input) return;

                const isPassword = input.type === 'password';
                input.type = isPassword ? 'text' : 'password';

                const eyeOpen = btn.querySelector('.eye-open');
                const eyeClosed = btn.querySelector('.eye-closed');

                if (eyeOpen) eyeOpen.style.display = isPassword ? 'none' : 'block';
                if (eyeClosed) eyeClosed.style.display = isPassword ? 'block' : 'none';

                btn.setAttribute(
                    'aria-label',
                    isPassword ? 'Ocultar senha' : 'Mostrar senha'
                );

                // Mantém o foco e a posição do cursor
                input.focus();
                const val = input.value;
                input.setSelectionRange(val.length, val.length);
            });
        });
    }

    /* ============================================
       2. Medidor de força da senha
       ============================================ */
    function calcStrength(password) {
        let score = 0;
        if (password.length >= 8) score++;
        if (password.length >= 12) score++;
        if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
        if (/\d/.test(password)) score++;
        if (/[^a-zA-Z0-9]/.test(password)) score++;
        return Math.min(score, 4);
    }

    const STRENGTH_LABELS = ['Muito fraca', 'Fraca', 'Média', 'Forte', 'Muito forte'];
    const STRENGTH_CLASSES = ['weak', 'weak', 'fair', 'good', 'strong'];

    function initPasswordStrength() {
        const input = $('#password');
        const fill = $('#strengthFill');
        const text = $('#strengthText');
        if (!input || !fill || !text) return;
        if (input.type !== 'password') return; // só na página de cadastro

        const update = () => {
            const value = input.value;
            const level = value ? calcStrength(value) : 0;

            fill.className = 'strength-fill' + (value ? ' ' + STRENGTH_CLASSES[level] : '');
            text.className = 'strength-text' + (value ? ' ' + STRENGTH_CLASSES[level] : '');
            text.textContent = value ? STRENGTH_LABELS[level] : 'Força da senha';
        };

        input.addEventListener('input', update);
        update();
    }

    /* ============================================
       3. Validação de formulários
       ============================================ */
    function setError(formGroup, message) {
        if (!formGroup) return;
        formGroup.classList.add('error');
        formGroup.classList.remove('success');
        const el = formGroup.querySelector('.error-message');
        if (el) el.textContent = message;
    }

    function setSuccess(formGroup) {
        if (!formGroup) return;
        formGroup.classList.remove('error');
        formGroup.classList.add('success');
        const el = formGroup.querySelector('.error-message');
        if (el) el.textContent = '';
    }

    function clearState(formGroup) {
        if (!formGroup) return;
        formGroup.classList.remove('error', 'success');
        const el = formGroup.querySelector('.error-message');
        if (el) el.textContent = '';
    }

    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    /* --- Login --- */
    function initLoginForm() {
        const form = $('#loginForm');
        console.log('[GC] initLoginForm: form found =', !!form);
        if (!form) return;

        const usernameInput = $('#username');
        const passwordInput = $('#password');

        const validate = () => {
            let valid = true;

            const usernameGroup = usernameInput.closest('.form-group');
            if (!usernameInput.value.trim()) {
                setError(usernameGroup, 'Informe seu usuário ou email.');
                valid = false;
            } else {
                setSuccess(usernameGroup);
            }

            const passwordGroup = passwordInput.closest('.form-group');
            if (!passwordInput.value) {
                setError(passwordGroup, 'Informe sua senha.');
                valid = false;
            } else {
                setSuccess(passwordGroup);
            }

            return valid;
        };

        // Validação em tempo real após o primeiro blur
        [usernameInput, passwordInput].forEach((input) => {
            input.addEventListener('blur', () => {
                const group = input.closest('.form-group');
                if (!input.value.trim()) {
                    setError(group, input === passwordInput ? 'Informe sua senha.' : 'Informe seu usuário ou email.');
                } else {
                    setSuccess(group);
                }
            });
            input.addEventListener('input', () => {
                const group = input.closest('.form-group');
                if (group.classList.contains('error') && input.value.trim()) {
                    clearState(group);
                }
            });
        });

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            console.log('[GC] Login submit triggered');
            if (!validate()) return;

            const btn = form.querySelector('button[type="submit"]');
            const btnText = btn.querySelector('.btn-text');
            const btnLoader = btn.querySelector('.btn-loader');

            setLoading(btn, btnText, btnLoader, true);

            setTimeout(async () => {
                const id = usernameInput.value.trim().toLowerCase();
                const pw = passwordInput.value;
                let user = getUsers().find(
                    (u) => u.username.toLowerCase() === id || u.email.toLowerCase() === id
                );
                if (!user) {
                    // Tenta importar da nuvem (conta criada em outro aparelho)
                    const row = await cloudGetUser(id);
                    if (row) {
                        user = toLocalUser(row);
                        const users = getUsers();
                        users.push(user);
                        saveUsers(users);
                    }
                }
                let ok = false;
                if (user) {
                    if (user.passwordHash) {
                        ok = (await hashPassword(pw)) === user.passwordHash;
                    } else if (user.password) {
                        ok = pw === user.password;
                        if (ok) {
                            // Migra conta antiga para hash
                            const users = getUsers();
                            const idx = users.findIndex((x) => x.username === user.username);
                            if (idx > -1) {
                                delete users[idx].password;
                                users[idx].passwordHash = await hashPassword(pw);
                                saveUsers(users);
                                user = users[idx];
                            }
                        }
                    }
                }
                setLoading(btn, btnText, btnLoader, false);
                if (user && user.banned) {
                    setError(passwordInput.closest('.form-group'), 'Conta suspensa. Fale com o suporte.');
                    showToast('Conta suspensa.', 'error');
                    return;
                }
                if (!ok) {
                    setError(passwordInput.closest('.form-group'), 'Usuário/email ou senha incorretos.');
                    showToast('Não foi possível entrar. Confira os dados.', 'error');
                    return;
                }
                setSession(user.username);
                showToast(`Bem-vindo de volta, ${user.username}!`, 'success');
                setTimeout(() => {
                    location.href = getNext() || 'app.html';
                }, 600);
            }, 900);
        });
    }

    /* --- Cadastro --- */
    function initRegisterForm() {
        const form = $('#registerForm');
        console.log('[GC] initRegisterForm: form found =', !!form);
        if (!form) return;

        const nomeInput = $('#nome');
        const usernameInput = $('#username');
        const emailInput = $('#email');
        const birthdateInput = $('#birthdate');
        const passwordInput = $('#password');
        const confirmInput = $('#confirmPassword');
        const termsInput = $('#terms');

        const checks = {
            nome() {
                const group = nomeInput.closest('.form-group');
                const value = nomeInput.value.trim();
                if (!value) {
                    setError(group, 'Informe seu nome completo.');
                    return false;
                }
                if (value.split(/\s+/).length < 2) {
                    setError(group, 'Informe nome e sobrenome.');
                    return false;
                }
                setSuccess(group);
                return true;
            },
            username() {
                const group = usernameInput.closest('.form-group');
                const value = usernameInput.value.trim();
                if (!value) {
                    setError(group, 'Escolha um username.');
                    return false;
                }
                if (!/^[a-zA-Z0-9_]{3,20}$/.test(value)) {
                    setError(group, 'Use 3-20 caracteres: letras, números e _');
                    return false;
                }
                setSuccess(group);
                return true;
            },
            email() {
                const group = emailInput.closest('.form-group');
                const value = emailInput.value.trim();
                if (!value) {
                    setError(group, 'Informe seu email.');
                    return false;
                }
                if (!EMAIL_RE.test(value)) {
                    setError(group, 'Email inválido.');
                    return false;
                }
                setSuccess(group);
                return true;
            },
            birthdate() {
                const group = birthdateInput.closest('.form-group');
                const value = birthdateInput.value;
                if (!value) {
                    setError(group, 'Informe sua data de nascimento.');
                    return false;
                }
                const birth = new Date(value);
                const today = new Date();
                let age = today.getFullYear() - birth.getFullYear();
                const m = today.getMonth() - birth.getMonth();
                if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
                if (isNaN(age) || age < 13) {
                    setError(group, 'Você precisa ter pelo menos 13 anos.');
                    return false;
                }
                setSuccess(group);
                return true;
            },
            password() {
                const group = passwordInput.closest('.form-group');
                const value = passwordInput.value;
                if (!value) {
                    setError(group, 'Crie uma senha.');
                    return false;
                }
                if (value.length < 8) {
                    setError(group, 'Mínimo de 8 caracteres.');
                    return false;
                }
                setSuccess(group);
                // Revalida confirmação se já preenchida
                if (confirmInput.value) checks.confirmPassword();
                return true;
            },
            confirmPassword() {
                const group = confirmInput.closest('.form-group');
                const value = confirmInput.value;
                if (!value) {
                    setError(group, 'Confirme sua senha.');
                    return false;
                }
                if (value !== passwordInput.value) {
                    setError(group, 'As senhas não coincidem.');
                    return false;
                }
                setSuccess(group);
                return true;
            },
            terms() {
                const group = termsInput.closest('.terms-group');
                if (!termsInput.checked) {
                    setError(group, 'Você precisa aceitar os termos.');
                    return false;
                }
                setSuccess(group);
                return true;
            },
        };

        // Validação em blur + limpeza em input
        const bindings = [
            [nomeInput, 'nome'],
            [usernameInput, 'username'],
            [emailInput, 'email'],
            [birthdateInput, 'birthdate'],
            [passwordInput, 'password'],
            [confirmInput, 'confirmPassword'],
        ];

        bindings.forEach(([input, key]) => {
            input.addEventListener('blur', () => checks[key]());
            input.addEventListener('input', () => {
                const group = input.closest('.form-group');
                if (group.classList.contains('error')) clearState(group);
            });
        });

        termsInput.addEventListener('change', () => {
            const group = termsInput.closest('.terms-group');
            if (termsInput.checked) clearState(group);
        });

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            console.log('[GC] Register submit triggered');
            const results = Object.values(checks).map((fn) => fn());
            if (results.includes(false)) {
                // Foca no primeiro campo com erro
                const firstError = form.querySelector('.form-group.error input, .terms-group.error input');
                if (firstError) firstError.focus();
                return;
            }

            const btn = form.querySelector('button[type="submit"]');
            const btnText = btn.querySelector('.btn-text');
            const btnLoader = btn.querySelector('.btn-loader');

            setLoading(btn, btnText, btnLoader, true);

            setTimeout(async () => {
                const users = getUsers();
                const username = usernameInput.value.trim();
                const email = emailInput.value.trim().toLowerCase();

                if (users.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
                    setLoading(btn, btnText, btnLoader, false);
                    setError(usernameInput.closest('.form-group'), 'Esse username já está em uso.');
                    usernameInput.focus();
                    return;
                }
                if (users.some((u) => u.email.toLowerCase() === email)) {
                    setLoading(btn, btnText, btnLoader, false);
                    setError(emailInput.closest('.form-group'), 'Esse email já tem conta. Faça login.');
                    emailInput.focus();
                    return;
                }

                const genderEl = form.querySelector('input[name="gender"]:checked');
                const buscoEl = form.querySelector('input[name="busco"]:checked');
                const wantEls = [...form.querySelectorAll('input[name="want"]:checked')].map((c) => c.value);
                if (!genderEl) {
                    setLoading(btn, btnText, btnLoader, false);
                    showToast('Selecione: você é...', 'error');
                    return;
                }
                if (!buscoEl) {
                    setLoading(btn, btnText, btnLoader, false);
                    showToast('Selecione quem você busca.', 'error');
                    return;
                }
                if (!wantEls.length) {
                    setLoading(btn, btnText, btnLoader, false);
                    showToast('Escolha pelo menos um interesse.', 'error');
                    return;
                }
                const passwordHash = await hashPassword(passwordInput.value);
                const record = {
                    name: nomeInput.value.trim(),
                    username,
                    email,
                    birthdate: birthdateInput.value,
                    passwordHash,
                    gender: genderEl.value,
                    lookingFor: buscoEl.value,
                    intents: wantEls,
                    avatar: ($('#selectedAvatar') && $('#selectedAvatar').value) || 'assets/avatars/avatar1.svg?v=2',
                    createdAt: new Date().toISOString(),
                };

                // Nuvem primeiro (vale entre aparelhos)
                const cloud = await cloudCreateUser(record);
                setLoading(btn, btnText, btnLoader, false);
                if (!cloud.ok && !cloud.offline) {
                    const msg = String((cloud.error && (cloud.error.message || cloud.error.code)) || '');
                    if ((cloud.error && cloud.error.code === '23505') || /duplicate|unique|já existe/i.test(msg)) {
                        setError(emailInput.closest('.form-group'), 'Esses dados já têm conta. Faça login.');
                        showToast('Conta já existe. Tente entrar.', 'error');
                        return;
                    }
                    console.error('[GC] Falha ao salvar na nuvem:', cloud.error);
                    showToast('Nuvem falhou (' + ((cloud.error && (cloud.error.code || cloud.error.message)) || 'sem conexão') + '). Conta salva local.', 'error');
                }

                users.push(record);
                saveUsers(users);
                if (username.toLowerCase() !== 'nauj') {
                    store.set('gc_follows_' + username, ['u:nauj']);
                }
                setSession(username);
                showToast(`Conta criada${cloud.ok ? ' e salva na nuvem' : ''}! Bem-vindo, ${username}!`, 'success');
                setTimeout(() => {
                    location.href = getNext() || 'app.html';
                }, 600);
            }, 900);
        });
    }

    function setLoading(btn, btnText, btnLoader, loading) {
        if (!btn) return;
        btn.disabled = loading;
        if (btnText) btnText.style.display = loading ? 'none' : 'inline';
        if (btnLoader) btnLoader.style.display = loading ? 'inline-flex' : 'none';
    }

    /* ============================================
       4. Seletor de avatares
       ============================================ */
    function initAvatarSelector() {
        const grid = $('#avatarGrid');
        const preview = $('#avatarPreview');
        const hiddenInput = $('#selectedAvatar');
        const uploadInput = $('#avatarUpload');
        if (!grid) return;

        // Renderiza as opções
        grid.innerHTML = AVATARS.map(
            (src, i) => `
            <button type="button" class="avatar-option${i === 0 ? ' active' : ''}"
                    data-src="${src}" title="Avatar ${i + 1}" aria-label="Escolher avatar ${i + 1}">
                <img src="${src}" alt="Avatar ${i + 1}" loading="lazy">
            </button>`
        ).join('');

        // Fallback: se a imagem não existir, usa um placeholder inline
        $$('.avatar-option img', grid).forEach((img) => {
            img.addEventListener('error', () => {
                img.src = fallbackAvatar(img.alt);
            });
        });

        if (preview) {
            preview.addEventListener('error', () => {
                preview.src = fallbackAvatar('Preview');
            });
        }

        // Clique em um avatar
        grid.addEventListener('click', (e) => {
            const option = e.target.closest('.avatar-option');
            if (!option) return;
            $$('.avatar-option', grid).forEach((o) => o.classList.remove('active'));
            option.classList.add('active');
            const src = option.dataset.src;
            if (preview) preview.src = src;
            if (hiddenInput) hiddenInput.value = src;
        });

        // Upload de imagem
        if (uploadInput) {
            uploadInput.addEventListener('change', () => {
                const file = uploadInput.files && uploadInput.files[0];
                if (!file) return;
                if (!file.type.startsWith('image/')) {
                    showToast('Selecione um arquivo de imagem.', 'error');
                    return;
                }
                const reader = new FileReader();
                reader.onload = (ev) => {
                    if (preview) preview.src = ev.target.result;
                    $$('.avatar-option', grid).forEach((o) => o.classList.remove('active'));
                    if (hiddenInput) hiddenInput.value = ''; // upload próprio
                };
                reader.readAsDataURL(file);
            });
        }
    }

    // Gera um SVG data-URI como avatar de fallback
    function fallbackAvatar(label) {
        const initial = (label || 'G').charAt(0).toUpperCase();
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
            <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="#2563eb"/><stop offset="100%" stop-color="#22d3ee"/>
            </linearGradient></defs>
            <rect width="96" height="96" rx="48" fill="url(#g)"/>
            <text x="48" y="60" font-family="Orbitron, sans-serif" font-size="36" font-weight="700"
                  fill="#fff" text-anchor="middle">${initial}</text>
        </svg>`;
        return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    }

    /* ============================================
       5. Toast / notificações
       ============================================ */
    let toastContainer = null;

    function showToast(message, type = 'info') {
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.className = 'toast-container';
            document.body.appendChild(toastContainer);
        }

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toastContainer.appendChild(toast);

        requestAnimationFrame(() => toast.classList.add('show'));

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3200);
    }

    /* ============================================
       6. Login com Discord (demo)
       ============================================ */
    function initDiscordLogin() {
        const btn = $('#discordLogin');
        if (!btn) return;
        btn.addEventListener('click', () => {
            showToast('OAuth Discord será integrado em breve (demo).', 'info');
        });
    }

    /* ============================================
       7. Animações de scroll
       ============================================ */
    function initScrollAnimations() {
        const targets = $$('.feature-card, .game-card, .auth-card, .cta-content');
        if (!targets.length) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('animate-in');
                        observer.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.15 }
        );

        targets.forEach((el) => observer.observe(el));
    }

    /* ============================================
       8. Spotlight que segue o mouse nos cards
       ============================================ */
    function initSpotlight() {
        const cards = $$('.feature-card');
        if (!cards.length) return;
        cards.forEach((card) => {
            card.addEventListener('pointermove', (e) => {
                const rect = card.getBoundingClientRect();
                card.style.setProperty('--mx', `${e.clientX - rect.left}px`);
                card.style.setProperty('--my', `${e.clientY - rect.top}px`);
            });
        });
    }

    /* ============================================
       9. Header com fundo ao rolar
       ============================================ */
    function initHeaderScroll() {
        const header = $('.header');
        if (!header) return;
        const onScroll = () => {
            header.classList.toggle('scrolled', window.scrollY > 20);
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
    }

    /* ============================================
       10. Monetização — helpers
       ============================================ */
    const BRL = (n) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    /* ============================================
       Auth — sessão e usuários (localStorage)
       ============================================ */
    const getUsers = () => store.get('gc_users_v1', []);
    const saveUsers = (u) => store.set('gc_users_v1', u);
    const getSession = () => store.get('gc_session_v1', null);
    const setSession = (username) => store.set('gc_session_v1', username ? { username, at: new Date().toISOString() } : null);
    const getNext = () => {
        const n = new URLSearchParams(location.search).get('next') || '';
        return /^[a-z0-9-]+\.html$/i.test(n) ? n : '';
    };
    const currentUser = () => {
        const s = getSession();
        return s ? getUsers().find((u) => u.username === s.username) || null : null;
    };
    const store = {
        get(k, fb) {
            if (CloudCache.has(k)) {
                const v = CloudCache.get(k);
                return v === undefined ? fb : v;
            }
            try {
                const v = localStorage.getItem(k);
                return v ? JSON.parse(v) : fb;
            } catch (e) { return fb; }
        },
        set(k, v) {
            CloudCache.set(k, v);
            try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sem espaço? segue */ }
            cloudSave(k, v);
        },
        remove(k) {
            CloudCache.delete(k);
            try { localStorage.removeItem(k); } catch (e) { /* ignore */ }
            cloudSave(k, null);
        },
    };
    const orderCode = () => 'GC-' + Math.floor(100000 + Math.random() * 900000);

    /* ============================================
       11. Monetização — modais genéricos
       ============================================ */
    function openModal(overlay) {
        if (!overlay) return;
        showStep(overlay, 'payment');
        overlay.classList.add('open');
        overlay.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    }

    function closeModal(overlay) {
        if (!overlay) return;
        overlay.classList.remove('open');
        overlay.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        setTimeout(() => showStep(overlay, 'payment'), 350);
    }

    function showStep(overlay, step) {
        $$('.modal-step', overlay).forEach((s) => {
            s.hidden = s.dataset.step !== step;
        });
    }

    function initModals() {
        $$('.modal-overlay').forEach((overlay) => {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) closeModal(overlay);
            });
            $$('[data-close]', overlay).forEach((btn) => {
                btn.addEventListener('click', () => closeModal(overlay));
            });
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                $$('.modal-overlay.open').forEach(closeModal);
                closeCart();
            }
        });
    }

    /* ============================================
       12. Monetização — máscaras de input
       ============================================ */
    function initCardMasks() {
        const num = $('#cardNumber');
        if (num) {
            num.addEventListener('input', () => {
                const d = num.value.replace(/\D/g, '').slice(0, 16);
                num.value = d.replace(/(\d{4})(?=\d)/g, '$1 ');
            });
        }
        const exp = $('#cardExpiry');
        if (exp) {
            exp.addEventListener('input', () => {
                let d = exp.value.replace(/\D/g, '').slice(0, 4);
                exp.value = d.length > 2 ? d.slice(0, 2) + '/' + d.slice(2) : d;
            });
        }
        const cvv = $('#cardCvv');
        if (cvv) {
            cvv.addEventListener('input', () => {
                cvv.value = cvv.value.replace(/\D/g, '').slice(0, 4);
            });
        }
        const cep = $('#buyerCep');
        if (cep) {
            cep.addEventListener('input', () => {
                let d = cep.value.replace(/\D/g, '').slice(0, 8);
                cep.value = d.length > 5 ? d.slice(0, 5) + '-' + d.slice(5) : d;
            });
        }
    }

    function validCardFields(scope) {
        let ok = true;
        const mark = (input, valid, msg) => {
            const group = input.closest('.form-group');
            if (valid) {
                group.classList.remove('error');
                group.querySelector('.error-message').textContent = '';
            } else {
                group.classList.add('error');
                group.querySelector('.error-message').textContent = msg;
                ok = false;
            }
        };

        const name = $('#payerName', scope) || $('#buyerName', scope);
        if (name) mark(name, name.value.trim().length >= 3, 'Informe o nome completo.');

        const email = $('#buyerEmail', scope);
        if (email) mark(email, EMAIL_RE.test(email.value.trim()), 'Email inválido.');

        const cep = $('#buyerCep', scope);
        if (cep) mark(cep, cep.value.replace(/\D/g, '').length === 8, 'CEP inválido.');

        const num = $('#cardNumber', scope);
        if (num) mark(num, num.value.replace(/\D/g, '').length === 16, 'Número do cartão inválido.');

        const exp = $('#cardExpiry', scope);
        if (exp) {
            const m = exp.value.match(/^(0[1-9]|1[0-2])\/(\d{2})$/);
            let valid = !!m;
            if (m) {
                const yy = 2000 + parseInt(m[2], 10);
                const mm = parseInt(m[1], 10);
                const now = new Date();
                valid = yy > now.getFullYear() || (yy === now.getFullYear() && mm >= now.getMonth() + 1);
            }
            mark(exp, valid, 'Validade inválida.');
        }

        const cvv = $('#cardCvv', scope);
        if (cvv) mark(cvv, /^\d{3,4}$/.test(cvv.value.trim()), 'CVV inválido.');

        return ok;
    }

    /* ============================================
       13. Monetização — planos VIP
       ============================================ */
    let billingPeriod = 'monthly';

    function initBillingToggle() {
        const options = $$('.billing-option');
        if (!options.length) return;
        const prices = { vip: { monthly: '19,90', yearly: '167,16' }, elite: { monthly: '34,90', yearly: '293,16' } };
        options.forEach((btn) => {
            btn.addEventListener('click', () => {
                options.forEach((o) => o.classList.remove('active'));
                btn.classList.add('active');
                billingPeriod = btn.dataset.period;
                const yearly = billingPeriod === 'yearly';
                Object.keys(prices).forEach((plan) => {
                    const el = document.querySelector(`[data-price="${plan}"]`);
                    if (el) el.textContent = yearly ? prices[plan].yearly : prices[plan].monthly;
                });
                $$('[data-period-label]').forEach((el) => {
                    el.textContent = yearly ? '/ano' : '/mês';
                });
            });
        });
    }

    function initPlanCheckout() {
        const modal = $('#planModal');
        if (!modal) return;
        const form = $('#planForm');

        $$('[data-plan="vip"], [data-plan="elite"]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const yearly = billingPeriod === 'yearly';
                const value = parseFloat(yearly ? btn.dataset.yearly : btn.dataset.monthly);
                $('#planName').textContent = btn.dataset.name + (yearly ? ' — Anual (-30%)' : ' — Mensal');
                $('#planPrice').textContent = BRL(value) + (yearly ? '/ano' : '/mês');
                $('#planTotal').textContent = BRL(value);
                modal.dataset.plan = btn.dataset.plan;
                modal.dataset.amount = String(value);
                openModal(modal);
            });
        });

        const freeBtn = $('[data-plan="free"]');
        if (freeBtn) {
            freeBtn.addEventListener('click', () => {
                showToast('Você já está no plano Free. Bora de VIP?', 'info');
            });
        }

        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                if (!validCardFields(modal)) return;
                const btn = form.querySelector('button[type="submit"]');
                setLoading(btn, btn.querySelector('.btn-text'), btn.querySelector('.btn-loader'), true);
                setTimeout(() => {
                    setLoading(btn, btn.querySelector('.btn-text'), btn.querySelector('.btn-loader'), false);
                    const plan = (modal.dataset.plan || 'vip').toUpperCase();
                    $('#successPlan').textContent = plan;
                    $('#planOrderCode').textContent = orderCode();
                    store.set('gc_vip_v1', { plan: plan.toLowerCase(), since: new Date().toISOString() });
                    cloudSavePlan(plan.toLowerCase(), plan);
                    showStep(modal, 'success');
                    renderVipBadge();
                    showToast(`Plano ${plan} ativado!`, 'success');
                }, 1800);
            });
        }
    }

    function renderVipBadge() {
        const vip = store.get('gc_vip_v1', null);
        const sess = getSession();
        if (!vip || !sess) return;
        $$('.nav').forEach((nav) => {
            if (nav.querySelector('.vip-badge')) return;
            const badge = document.createElement('span');
            badge.className = 'vip-badge';
            badge.textContent = planTag();
            const s0 = getSession();
            paintBadge(badge, s0 ? planOf(s0.username) : 'free', s0 ? badgeColorOf(s0.username) : null);
            nav.prepend(badge);
        });
    }

    /* ============================================
       14. Monetização — FAQ
       ============================================ */
    function initFaq() {
        $$('.faq-item').forEach((item) => {
            const btn = $('.faq-question', item);
            const answer = $('.faq-answer', item);
            if (!btn || !answer) return;
            btn.addEventListener('click', () => {
                const isOpen = item.classList.contains('open');
                $$('.faq-item.open').forEach((o) => {
                    o.classList.remove('open');
                    $('.faq-answer', o).style.maxHeight = null;
                });
                if (!isOpen) {
                    item.classList.add('open');
                    answer.style.maxHeight = answer.scrollHeight + 'px';
                }
            });
        });
    }

    /* ============================================
       15. Monetização — loja / carrinho
       ============================================ */
    const FREE_SHIPPING_FROM = 99;
    const SHIPPING_COST = 14.9;

    function getCart() { return store.get('gc_cart_v1', []); }
    function saveCart(cart) { store.set('gc_cart_v1', cart); }

    function initShop() {
        // Preview da gravação ao vivo
        $$('[data-engrave]').forEach((input) => {
            const card = input.closest('.product-card');
            const preview = card ? card.querySelector('[data-preview]') : null;
            input.addEventListener('input', () => {
                if (preview) preview.textContent = input.value.trim().toUpperCase() || 'SEU NICK';
            });
        });

        // Adicionar ao carrinho
        $$('[data-add]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const card = btn.closest('.product-card');
                const engraveInput = card.querySelector('[data-engrave]');
                const engrave = engraveInput ? engraveInput.value.trim().toUpperCase() : '';
                const cart = getCart();
                const found = cart.find((i) => i.id === card.dataset.id && i.engrave === engrave);
                if (found) {
                    found.qty++;
                } else {
                    cart.push({
                        id: card.dataset.id,
                        name: card.dataset.name,
                        price: parseFloat(card.dataset.price),
                        engrave,
                        qty: 1,
                    });
                }
                saveCart(cart);
                renderCart();
                openCart();
                showToast(`${card.dataset.name} no carrinho!`, 'success');
            });
        });

        // Drawer
        const cartBtn = $('#cartBtn');
        if (cartBtn) cartBtn.addEventListener('click', openCart);
        const cartClose = $('#cartClose');
        if (cartClose) cartClose.addEventListener('click', closeCart);
        const overlay = $('#cartOverlay');
        if (overlay) overlay.addEventListener('click', closeCart);

        // Delegação: qty +/-, remover
        const items = $('#cartItems');
        if (items) {
            items.addEventListener('click', (e) => {
                const actionBtn = e.target.closest('[data-action]');
                if (!actionBtn) return;
                const idx = parseInt(actionBtn.dataset.index, 10);
                const cart = getCart();
                if (actionBtn.dataset.action === 'inc') cart[idx].qty++;
                if (actionBtn.dataset.action === 'dec') {
                    cart[idx].qty--;
                    if (cart[idx].qty <= 0) cart.splice(idx, 1);
                }
                if (actionBtn.dataset.action === 'rm') cart.splice(idx, 1);
                saveCart(cart);
                renderCart();
            });
        }

        // Checkout da loja
        const checkoutBtn = $('#checkoutBtn');
        if (checkoutBtn) {
            checkoutBtn.addEventListener('click', () => {
                const cart = getCart();
                if (!cart.length) {
                    showToast('Seu carrinho está vazio.', 'error');
                    return;
                }
                renderShopSummary();
                closeCart();
                openModal($('#shopModal'));
            });
        }

        const shopForm = $('#shopForm');
        if (shopForm) {
            shopForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const modal = $('#shopModal');
                if (!validCardFields(modal)) return;
                const btn = shopForm.querySelector('button[type="submit"]');
                setLoading(btn, btn.querySelector('.btn-text'), btn.querySelector('.btn-loader'), true);
                setTimeout(() => {
                    setLoading(btn, btn.querySelector('.btn-text'), btn.querySelector('.btn-loader'), false);
                    const cart = getCart();
                    const total = cartTotal(cart);
                    const orders = store.get('gc_orders_v1', []);
                    const code = orderCode();
                    orders.push({ code, items: cart, total, date: new Date().toISOString() });
                    store.set('gc_orders_v1', orders);
                    saveCart([]);
                    renderCart();
                    $('#shopOrderCode').textContent = code;
                    showStep(modal, 'success');
                    showToast('Pedido confirmado!', 'success');
                }, 1800);
            });
        }

        renderCart();
    }

    function cartSubtotal(cart) {
        return cart.reduce((s, i) => s + i.price * i.qty, 0);
    }

    function cartShipping(subtotal, count) {
        if (!count) return 0;
        return subtotal >= FREE_SHIPPING_FROM ? 0 : SHIPPING_COST;
    }

    function cartTotal(cart) {
        const sub = cartSubtotal(cart);
        return sub + cartShipping(sub, cart.length);
    }

    function renderCart() {
        const itemsEl = $('#cartItems');
        if (!itemsEl) return;
        const cart = getCart();
        const count = cart.reduce((s, i) => s + i.qty, 0);
        const countEl = $('#cartCount');
        if (countEl) countEl.textContent = count;

        if (!cart.length) {
            itemsEl.innerHTML = '<p class="cart-empty">Seu carrinho está vazio.<br>Escolha sua dogtag acima.</p>';
        } else {
            itemsEl.innerHTML = cart.map((item, idx) => `
                <div class="cart-item">
                    <div class="cart-item-tag ${item.id}">${item.name.split(' ').map((w) => w[0]).join('').slice(0, 2)}</div>
                    <div class="cart-item-info">
                        <strong>${item.name}</strong>
                        <span>${item.engrave ? 'Gravação: ' + esc(item.engrave) : 'Sem gravação'} · ${BRL(item.price)}</span>
                        <div class="qty-box" style="margin-top:8px">
                            <button type="button" class="qty-btn" data-action="dec" data-index="${idx}">−</button>
                            <span class="qty-val">${item.qty}</span>
                            <button type="button" class="qty-btn" data-action="inc" data-index="${idx}">+</button>
                        </div>
                    </div>
                    <button type="button" class="cart-item-remove" data-action="rm" data-index="${idx}">remover</button>
                </div>`).join('');
        }

        const sub = cartSubtotal(cart);
        const ship = cartShipping(sub, cart.length);
        $('#cartSubtotal').textContent = BRL(sub);
        $('#cartShipping').textContent = cart.length ? (ship === 0 ? 'Grátis' : BRL(ship)) : '—';
        $('#cartTotal').textContent = BRL(sub + ship);

        const note = $('#freeShippingNote');
        if (note) {
            if (!cart.length) {
                note.textContent = '';
            } else if (ship === 0) {
                note.textContent = 'Você ganhou FRETE GRÁTIS.';
            } else {
                note.textContent = `Faltam ${BRL(FREE_SHIPPING_FROM - sub)} para o frete grátis.`;
            }
        }
    }

    function renderShopSummary() {
        const box = $('#shopSummary');
        if (!box) return;
        const cart = getCart();
        const sub = cartSubtotal(cart);
        const ship = cartShipping(sub, cart.length);
        box.innerHTML = cart.map((i) => `
            <div class="order-line"><span>${i.qty}x ${i.name}${i.engrave ? ` (${esc(i.engrave)})` : ''}</span><strong>${BRL(i.price * i.qty)}</strong></div>
        `).join('') + `
            <div class="order-line"><span>Frete</span><strong>${ship === 0 ? 'Grátis' : BRL(ship)}</strong></div>
            <div class="order-line total"><span>Total</span><strong>${BRL(sub + ship)}</strong></div>`;
    }

    function openCart() {
        const drawer = $('#cartDrawer');
        const overlay = $('#cartOverlay');
        if (!drawer) return;
        renderCart();
        drawer.classList.add('open');
        if (overlay) overlay.classList.add('open');
        document.body.style.overflow = 'hidden';
    }

    function closeCart() {
        const drawer = $('#cartDrawer');
        const overlay = $('#cartOverlay');
        if (!drawer || !drawer.classList.contains('open')) return;
        drawer.classList.remove('open');
        if (overlay) overlay.classList.remove('open');
        document.body.style.overflow = '';
    }

    /* ============================================
       16. Auth — guarda de rotas e header logado
       ============================================ */
    function initAuth() {
        // Fallback global: nenhuma imagem quebrada no site
        document.addEventListener('error', (e) => {
            const t = e.target;
            if (t && t.tagName === 'IMG' && !t.dataset.fbk) {
                if (t.closest && (t.closest('#postPreview') || t.closest('.post-media-wrap') || t.closest('#lightBody') || t.classList.contains('post-media'))) return;
                t.dataset.fbk = '1';
                if (t.src.indexOf('avatar1.svg') === -1) t.src = 'assets/avatars/avatar1.svg?v=2';
            }
        }, true);

        // Migração: avatares .png antigos → .svg + cache-busting ?v=2
        const users = getUsers();
        let usersChanged = false;
        users.forEach((u) => {
            if (u.avatar && u.avatar.indexOf('logo') === -1 && u.avatar.indexOf('data:') !== 0) {
                let a = u.avatar;
                if (a.endsWith('.png')) a = a.replace('.png', '.svg');
                if (a.endsWith('.svg') && a.indexOf('?') === -1) a += '?v=2';
                if (a !== u.avatar) {
                    u.avatar = a;
                    usersChanged = true;
                }
            }
        });
        if (usersChanged) saveUsers(users);
        PROFILES.forEach((p) => {
            if (p.avatar.indexOf('?') === -1) p.avatar += '?v=2';
        });

        // Propaga ?next= para o link de cadastro (login -> register)
        const next = getNext();
        if (next) {
            $$('a[href="register.html"]').forEach((a) => {
                a.href = 'register.html?next=' + encodeURIComponent(next);
            });
        }

        // Bloqueia páginas exclusivas
        if (document.body.hasAttribute('data-requires-auth') && !getSession()) {
            const page = location.pathname.split('/').pop() || 'index.html';
            location.href = 'login.html?next=' + encodeURIComponent(page);
            return;
        }

        // Logout global (delegação)
        document.addEventListener('click', (e) => {
            if (e.target.closest('[data-logout]')) {
                setSession(null);
                showToast('Você saiu. Até a próxima partida!', 'info');
                setTimeout(() => { location.href = 'index.html'; }, 500);
            }
        });

        cloudLoadPlan();
        renderAuthArea();
    }

    function renderAuthArea() {
        const user = currentUser();
        if (!user) return;
        $$('.nav').forEach((nav) => {
            if (nav.querySelector('[data-auth-area]')) return;
            if (!nav.querySelector('a[href="login.html"]')) return;
            nav.querySelectorAll('a.btn').forEach((b) => b.remove());
            const area = document.createElement('div');
            area.className = 'auth-area';
            area.setAttribute('data-auth-area', '');
            area.innerHTML =
                '<a href="planos.html" class="nav-link">Planos</a>' +
                '<a href="loja.html" class="nav-link">Loja</a>' +
                '<a href="app.html" class="btn btn-primary">Jogar</a>' +
                `<a href="app.html" class="avatar-chip" title="${esc(user.username)}">` +
                `<img src="${esc(user.avatar)}" alt=""></a>` +
                '<button type="button" class="link-btn" data-logout>Sair</button>';
            nav.appendChild(area);
        });
    }

    /* ============================================
       17. App — dados
       ============================================ */
    const PROFILES = [
        { id: 'luna', name: 'Luna', age: 22, rank: 'Diamante III', level: 'Lv 47', games: ['Valorant', 'LoL'], bio: 'Duelista nas horas vagas, suporte no coração. Procuro duo fixo pro ranked e maratona de série depois.', avatar: 'assets/avatars/avatar3.svg', likesYou: true },
        { id: 'kaito', name: 'Kaito', age: 25, rank: 'Mestre', level: 'Lv 62', games: ['LoL', 'Valorant'], bio: 'Mono Yasuo arrependido. Jogo desde a season 3 e ainda erro smite. Me carrega?', avatar: 'assets/avatars/avatar1.svg', likesYou: false },
        { id: 'bia', name: 'Bia', age: 20, rank: 'Platina II', level: 'Lv 35', games: ['Fortnite', 'Minecraft'], bio: 'Construo mais rápido do que converso. Zero build? Nem conheço. Vem de squad.', avatar: 'assets/avatars/avatar5.svg', likesYou: true },
        { id: 'rafa', name: 'Rafa', age: 27, rank: 'Lendário', level: 'Lv 71', games: ['CoD', 'Fortnite'], bio: 'Ex-competitivo de CoD, hoje jogo por diversão (e continuo tryhard). Mic sempre ligado.', avatar: 'assets/avatars/avatar2.svg', likesYou: false },
        { id: 'nico', name: 'Nico', age: 23, rank: 'Ouro I', level: 'Lv 29', games: ['Minecraft', 'WoW'], bio: 'Builder de respeito e healer dedicado. Servidor próprio de Minecraft com a galera.', avatar: 'assets/avatars/avatar4.svg', likesYou: false },
        { id: 'vivi', name: 'Vivi', age: 21, rank: 'Imortal', level: 'Lv 58', games: ['Valorant'], bio: 'Sentinela main, mira afiada e call limpa. Só chamo pra jogar se tiver bom humor no lobby.', avatar: 'assets/avatars/avatar8.svg', likesYou: true },
        { id: 'leo', name: 'Leo', age: 26, rank: 'Ascendente', level: 'Lv 41', games: ['CoD', 'LoL'], bio: 'Camper assumido e orgulhoso. Jogo pra relaxar depois do trampo. Sem rage, só GG.', avatar: 'assets/avatars/avatar6.svg', likesYou: false },
        { id: 'mia', name: 'Mia', age: 24, rank: 'Radiante', level: 'Lv 66', games: ['Valorant', 'Fortnite'], bio: 'Top 500 e coach nas horas livres. Se seu K/D tá sofrendo, eu ajudo (com paciência).', avatar: 'assets/avatars/avatar7.svg', likesYou: false },
    ];

    const CHAT_REPLIES = [
        'GG! Que rank você tá agora?',
        'Bora uma partida hoje à noite?',
        'Finalmente alguém que joga os mesmos jogos que eu',
        'Qual sua main? Preciso saber se confio',
        'Kkkkk boa. Me adiciona lá depois',
        'Você joga de mic aberto ou é do time silencioso?',
        'Topa ranked ou prefere casual pra começar?',
        'Que setup você usa? To montando o meu ainda',
        'Joguei até tarde ontem, tô aquecido pra hoje',
        'Manda seu user da Steam/Discord depois',
    ];

    const FREE_LIKES_PER_DAY = 5;

    /* ============================================
       18. App — estado
       ============================================ */
    function appKey() {
        const s = getSession();
        return s ? 'gc_app_' + s.username : null;
    }

    function getAppState() {
        const k = appKey();
        if (!k) return null;
        const st = store.get(k, null);
        if (st) return st;
        const fresh = { seen: [], likes: { date: '', count: 0 }, matches: [] };
        store.set(k, fresh);
        return fresh;
    }

    function saveAppState(st) {
        const k = appKey();
        if (k) store.set(k, st);
    }

    function todayStr() { return new Date().toISOString().slice(0, 10); }

    function isVipUser() { return !!store.get('gc_vip_v1', null); }
    const OWNER_PLANS = ['owner', 'ceo'];
    function isEliteUser() {
        const v = store.get('gc_vip_v1', null);
        return !!(v && (v.plan === 'elite' || OWNER_PLANS.includes(v.plan)));
    }
    function isOwner() {
        const v = store.get('gc_vip_v1', null);
        return !!(v && OWNER_PLANS.includes(v.plan));
    }
    function planTag() {
        const v = store.get('gc_vip_v1', null);
        if (!v) return null;
        if (v.plan === 'ceo') return '✦ CEO';
        if (v.plan === 'owner') return '✦ OWNER';
        if (v.plan === 'elite') return '◆ ELITE';
        return '★ VIP';
    }
    function planMode() {
        const v = store.get('gc_vip_v1', null);
        if (!v) return 'Modo VIP';
        if (v.plan === 'ceo') return 'Modo CEO';
        if (v.plan === 'owner') return 'Modo OWNER';
        if (v.plan === 'elite') return 'Modo ELITE';
        return 'Modo VIP';
    }
    const SEED_PLANS = { mia: 'elite', rafa: 'vip' };
    const BADGE_COLORS = ['#e9c766', '#22d3ee', '#f472b6', '#9b8cf8', '#4ade80', '#f87171'];
    function planOf(username) {
        const s = getSession();
        if (s && username === s.username) {
            const v = store.get('gc_vip_v1', null);
            return v ? v.plan : 'free';
        }
        const subs = store.get('gc_subs_all', []);
        const row = subs.find((r) => r.username === username);
        if (row) return row.plan;
        return SEED_PLANS[username] || 'free';
    }
    function planTagOf(plan) {
        if (plan === 'ceo') return '✦ CEO';
        if (plan === 'owner') return '✦ OWNER';
        if (plan === 'elite') return '◆ ELITE';
        if (plan === 'vip') return '★ VIP';
        return 'FREE';
    }
    function badgeColorOf(username) {
        const s = getSession();
        if (s && s.username === username) {
            return store.get('gc_badgecolor_' + username, null);
        }
        // Para outros usuários, tenta cache de perfil (hydratado no boot)
        const u = getUsers().find((x) => x.username === username);
        return (u && u.badgeColor) || null;
    }
    function paintBadge(el, plan, color) {
        if (!el) return;
        el.classList.toggle('owner-glow', plan === 'ceo' || plan === 'owner');
        if (color === 'fade') {
            el.classList.add('badge-fade');
            el.style.background = '';
            el.style.borderColor = '';
            el.style.color = '';
            el.style.boxShadow = '';
            return;
        }
        el.classList.remove('badge-fade');
        const c = color || ((plan === 'ceo' || plan === 'owner') ? '#e9c766' : null);
        if (!c) {
            el.style.background = '';
            el.style.borderColor = '';
            el.style.color = '';
            el.style.boxShadow = '';
            return;
        }
        el.style.background = `linear-gradient(135deg, ${c}, ${c})`;
        el.style.borderColor = c;
        el.style.color = '#06121f';
        el.style.boxShadow = `0 0 16px ${c}66`;
    }
    function renderBadgePicker() {
        const box = $('#badgeColors');
        if (!box) return;
        const show = isOwner();
        box.hidden = !show;
        if (!show) return;
        const s = getSession();
        const cur = s ? badgeColorOf(s.username) : null;
        const sw = $('#badgeSwatches');
        if (!sw) return;
        sw.innerHTML = BADGE_COLORS.map((c) => `<button type="button" data-bc="${c}" style="background:${c}" class="${cur === c ? 'active' : ''}" aria-label="Cor do selo"></button>`).join('');
        sw.querySelectorAll('[data-bc]').forEach((b) => {
            b.addEventListener('click', () => {
                const s2 = getSession();
                if (!s2) return;
                store.set('gc_badgecolor_' + s2.username, b.dataset.bc);
                syncBadgeColor(s2.username, b.dataset.bc);
                renderBadgePicker();
                const pb = $('#pfVipBadge');
                if (pb) paintBadge(pb, planOf(s2.username), b.dataset.bc);
                $$('.nav .vip-badge').forEach((bb) => paintBadge(bb, planOf(s2.username), b.dataset.bc));
                showToast('Cor do selo atualizada!', 'success');
            });
        });
        const custom = $('#badgeCustom');
        if (custom) {
            custom.value = cur && cur.charAt(0) === '#' ? cur : '#22d3ee';
            custom.oninput = () => {
                const s3 = getSession();
                if (!s3) return;
                store.set('gc_badgecolor_' + s3.username, custom.value);
                syncBadgeColor(s3.username, custom.value);
                renderBadgePicker();
                const pb = $('#pfVipBadge');
                if (pb) paintBadge(pb, planOf(s3.username), custom.value);
                $$('.nav .vip-badge').forEach((bb) => paintBadge(bb, planOf(s3.username), custom.value));
            };
        }
        const fadeBtn = $('#badgeFadeBtn');
        if (fadeBtn) {
            fadeBtn.classList.toggle('active', cur === 'fade');
            fadeBtn.onclick = () => {
                const s4 = getSession();
                if (!s4) return;
                const next = cur === 'fade' ? '' : 'fade';
                if (next) {
                    store.set('gc_badgecolor_' + s4.username, next);
                    syncBadgeColor(s4.username, next);
                } else {
                    store.remove('gc_badgecolor_' + s4.username);
                    syncBadgeColor(s4.username, '');
                }
                renderBadgePicker();
                const pb = $('#pfVipBadge');
                if (pb) paintBadge(pb, planOf(s4.username), next || null);
                $$('.nav .vip-badge').forEach((bb) => paintBadge(bb, planOf(s4.username), next || null));
                showToast(next ? 'Fade animado ativado!' : 'Cor padrão restaurada.', 'success');
            };
        }
    }
    const REDEEM_CODES = {
        'BETA-USER': { medal: 'beta', label: 'BETA' },
        'BETA': { medal: 'beta', label: 'BETA' },
        'VIP-TOTAL': { plan: 'elite', label: 'ELITE' },
        'CEO-ACCESS': { plan: 'ceo', label: 'CEO', single: true },
    };

    function likesLeft(st) {
        if (isVipUser()) return Infinity;
        if (st.likes.date !== todayStr()) return FREE_LIKES_PER_DAY;
        return Math.max(0, FREE_LIKES_PER_DAY - st.likes.count);
    }

    /* ============================================
       19. App — principal
       ============================================ */
    let activeMatchId = null;

    function initApp() {
        if (!$('#deck')) return;
        initAppTabs();
        try {
            const savedTab = sessionStorage.getItem('gc_tab');
            if (savedTab && document.querySelector(`[data-tab="${savedTab}"]`)) switchTab(savedTab);
        } catch (e) { /* ignore */ }
        initSideUser();
        initFeed();
        initProfile();
        initClipsNav();
        initHighlights();
        initChat();
        initRooms();
        renderDeck();
        renderLikesBar();
        renderMatchList();
        renderProfile();

        $('#likeBtn').addEventListener('click', () => swipe('like'));
        $('#passBtn').addEventListener('click', () => swipe('pass'));
        $('#refreshDeckBtn')?.addEventListener('click', async () => {
            const btn = $('#refreshDeckBtn');
            if (!btn || btn.disabled) return;
            btn.disabled = true;
            btn.style.opacity = '0.5';
            try {
                const client = supaClient();
                if (client) {
                    const { data: newUsers } = await client
                        .from('profiles')
                        .select('*')
                        .gt('created_at', new Date(store.get('gc_last_user_sync', 0)).toISOString())
                        .limit(50);
                    if (newUsers && newUsers.length) {
                        const localUsers = getUsers();
                        let changed = false;
                        newUsers.forEach((u) => {
                            if (!localUsers.some((x) => x.username === u.username)) {
                                localUsers.push(toLocalUser(u));
                                changed = true;
                            }
                        });
                        if (changed) {
                            saveUsers(localUsers);
                            CloudCache.set('gc_users_v1', localUsers.map(toLocalUser));
                            store.set('gc_last_user_sync', Date.now());
                            showToast(`${newUsers.length} novo${newUsers.length > 1 ? 's' : ''} jogador${newUsers.length > 1 ? 'es' : ''} encontrado${newUsers.length > 1 ? 's' : ''}!`, 'success');
                        } else {
                            showToast('Nenhum jogador novo no momento.', 'info');
                        }
                    } else {
                        showToast('Nenhum jogador novo no momento.', 'info');
                    }
                }
            } catch (e) {
                showToast('Erro ao buscar jogadores.', 'error');
            } finally {
                btn.disabled = false;
                btn.style.opacity = '1';
                renderDeck();
                renderLikesBar();
            }
        });
        $('#matchChatBtn').addEventListener('click', () => {
            closeModal($('#matchModal'));
            switchTab('matches');
        });
        $('#chatForm').addEventListener('submit', sendMessage);
    }

    function initAppTabs() {
        $$('[data-tab]').forEach((tab) => {
            if (tab.tagName === 'BUTTON') {
                tab.addEventListener('click', () => switchTab(tab.dataset.tab));
            }
        });
    }

    function switchTab(name) {
        $$('[data-tab]').forEach((t) => t.classList.toggle('active', t.dataset.tab === name));
        try { sessionStorage.setItem('gc_tab', name); } catch (e) { /* ignore */ }
        $$('.app-view').forEach((v) => { v.hidden = v.id !== 'tab-' + name; });
        if (name === 'matches') renderMatchList();
        if (name === 'profile') { renderProfile(); renderInsta(); refreshFollowers(); }
        if (name === 'feed') renderFeed();
        if (name === 'admin') {
            if (!isOwner()) {
                showToast('Área restrita ao OWNER.', 'error');
                switchTab('discover');
                return;
            }
            renderAdmin();
        }
        if (name === 'clips') renderGlobalClips();
        if (name === 'chat') { renderChatHome(); startGlobalBots(); }
        stopClips();
        stopAllClips();
        if (name !== 'chat') stopGlobalBots();
        if (name === 'rooms' && typeof renderRooms === 'function') renderRooms();
    }

    function initSideUser() {
        const user = currentUser();
        if (!user) return;
        const vip = store.get('gc_vip_v1', null);

        ['sideAvatar', 'mobileAvatar'].forEach((id) => {
            const el = document.getElementById(id);
            if (el) el.src = myAvatar();
        });
        const nameEl = $('#sideName');
        if (nameEl) nameEl.textContent = '$' + user.username;
        const planEl = $('#sidePlan');
        if (planEl) {
            planEl.textContent = vip ? planTag() : 'Plano Free';
            if (vip) planEl.classList.add('vip');
        }
        $$('.side-nav').forEach((nav) => {
            if (nav.querySelector('[data-tab="admin"]') || !isOwner()) return;
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'side-btn';
            b.dataset.tab = 'admin';
            b.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> Admin';
            b.addEventListener('click', () => switchTab('admin'));
            nav.appendChild(b);
        });
        const sideVip = $('#sideVip');
        if (sideVip && vip) {
            sideVip.innerHTML = `<img src="assets/icons/crown.png" alt="VIP" width="30" height="30"><div><strong>${planMode()}</strong><span>Benefícios ativos</span></div><a href="planos.html" class="btn btn-secondary">Gerenciar</a>`;
        }

        const hello = $('#helloText');
        if (hello) {
            const h = new Date().getHours();
            const greet = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
            hello.textContent = `${greet}, ${user.name.split(' ')[0]}`;
        }
    }
    function calcAge(birthdate) {
        if (!birthdate) return '?';
        const birth = new Date(birthdate);
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
        return isNaN(age) ? '?' : age;
    }

    /* --- Descobrir --- */
    const SEED_META = {
        luna: { gender: 'F', intents: ['Amizade', 'Duo'] },
        kaito: { gender: 'M', intents: ['Amizade', 'Duo'] },
        bia: { gender: 'F', intents: ['Amizade', 'Duo'] },
        rafa: { gender: 'M', intents: ['Amizade', 'Duo'] },
        nico: { gender: 'M', intents: ['Amizade'] },
        vivi: { gender: 'F', intents: ['Duo', 'Namoro'] },
        leo: { gender: 'M', intents: ['Amizade', 'Duo'] },
        mia: { gender: 'F', intents: ['Namoro', 'Duo'] },
    };
    function seedMeta(id) {
        return SEED_META[id] || { gender: null, intents: [] };
    }
    function profileVisible(p) {
        const me = currentUser();
        const want = (me && me.lookingFor) || 'both';
        if (want !== 'F' && want !== 'M') return true;
        return seedMeta(p.id).gender === want;
    }
    function currentProfile() {
        const st = getAppState();
        const blk = blockedSet();
        const me = currentUser();
        
        // 1) Usuários reais (do cloud/localStorage)
        const realUsers = getUsers().filter((u) => {
            if (me && u.username === me.username) return false; // não mostra a si mesmo
            if (st.seen.includes('u:' + u.username)) return false; // já viu
            if (blk.has('u:' + u.username)) return false; // bloqueado
            // Filtro de gênero
            const want = (me && me.lookingFor) || 'both';
            if (want === 'F' && u.gender !== 'F') return false;
            if (want === 'M' && u.gender !== 'M') return false;
            return true;
        });
        if (realUsers.length) {
            const u = realUsers[0];
            return { id: 'u:' + u.username, name: u.name, age: calcAge(u.birthdate), rank: u.rank || 'Sem rank', level: 'Lv 1', games: u.games || [], bio: u.bio || '', avatar: avatarOf(u.username), intents: u.intents || [], seed: false };
        }
        
        // 2) Fallback: bots seed
        return PROFILES.find((p) => !st.seen.includes(p.id) && !blk.has(p.id) && profileVisible(p)) || null;
    }

    function renderDeck() {
        const deck = $('#deck');
        const empty = $('#deckEmpty');
        const actions = $('#deckActions');
        const p = currentProfile();
        if (!p) {
            deck.innerHTML = '';
            empty.hidden = false;
            actions.style.display = 'none';
            return;
        }
        empty.hidden = true;
        actions.style.display = 'flex';
        deck.innerHTML = `
            <article class="swipe-card" data-id="${p.id}">
                <div class="swipe-photo">
                    <span class="swipe-level">${esc(p.level)}</span>
                    <img src="${esc(p.avatar)}" alt="${esc(p.name)}">
                </div>
                <div class="swipe-info">
                    <h3>${esc(p.name)} <span>${p.age}</span></h3>
                    <p class="swipe-rank">${esc(p.rank)}</p>
                    <div class="swipe-games">${p.games.map((g) => `<span>${esc(g)}</span>`).join('')}</div>
                    <div class="swipe-games intents">${(p.intents || []).map((t) => `<span class="intent">${esc(t)}</span>`).join('')}</div>
                    <p class="swipe-bio">${esc(p.bio)}</p>
                </div>
            </article>`;
    }

    function renderLikesBar() {
        const st = getAppState();
        const left = likesLeft(st);
        $('#likesInfo').textContent = left === Infinity ? 'Likes ilimitados (VIP ativo)' : `${left} like${left === 1 ? '' : 's'} restante${left === 1 ? '' : 's'} hoje`;
        $('#likesUpsell').hidden = left !== 0;
    }

    function swipe(dir) {
        const st = getAppState();
        const p = currentProfile();
        if (!p) return;

        if (dir === 'like' && likesLeft(st) <= 0) {
            $('#upsellTitle').textContent = 'Likes de hoje esgotados';
            $('#upsellText').textContent = 'Membros VIP têm likes ilimitados + perfil em destaque.';
            openModal($('#upsellModal'));
            return;
        }

        const card = $('#deck .swipe-card');
        if (card) card.classList.add(dir === 'like' ? 'exit-right' : 'exit-left');

        setTimeout(() => {
            st.seen.push(p.id);
            if (dir === 'like') {
                if (st.likes.date !== todayStr()) st.likes = { date: todayStr(), count: 0 };
                st.likes.count++;
                
                // Real user (id starts with 'u:')
                if (p.id.startsWith('u:')) {
                    const targetUsername = p.id.slice(2);
                    // Envia solicitação de amizade
                    sendRequest(targetUsername);
                    showToast(`Solicitação enviada para ${p.name}!`, 'success');
                } 
                // Seed bot (tem likesYou)
                else if (p.likesYou && !st.matches.some((m) => m.id === p.id)) {
                    st.matches.unshift({ id: p.id, unread: 1, messages: [{ from: 'them', text: 'Ei, GG! Também te curti. Bora jogar junto?', at: Date.now() }] });
                    saveAppState(st);
                    renderDeck();
                    renderLikesBar();
                    renderMatchList();
                    openMatchModal(p);
                    return;
                }
            }
            saveAppState(st);
            renderDeck();
            renderLikesBar();
        }, 280);
    }

    function openMatchModal(p) {
        const me = currentUser();
        $('#matchMe').src = (me && me.avatar) || 'assets/avatars/avatar1.svg';
        $('#matchThem').src = p.avatar;
        $('#matchText').textContent = `Você e ${p.name} se curtiram. Puxe papo antes da próxima partida.`;
        $('#matchModal').dataset.matchId = p.id;
        openModal($('#matchModal'));
        activeMatchId = p.id;
    }

    /* --- Matches / Chat --- */
    function getMatchProfile(id) {
        if (id.indexOf('u:') === 0) {
            const u = getUsers().find((x) => x.username === id.slice(2));
            if (u) return { id, name: u.name.split(' ')[0], avatar: avatarOf(id.slice(2)), user: true };
        }
        return PROFILES.find((p) => p.id === id);
    }

    function renderMatchList() {
        const st = getAppState();
        const list = $('#matchList');
        const totalUnread = st.matches.reduce((s, m) => s + (m.unread || 0), 0);
        $$('.match-badge-count').forEach((badge) => {
            badge.hidden = totalUnread === 0;
            badge.textContent = totalUnread;
        });

        const reqs = getMyRequests();
        let reqHtml = '';
        if (reqs.length) {
            reqHtml = '<div class="req-box"><p class="req-title">Solicitações de amizade</p>' + reqs.map((r) => {
                const u = getUsers().find((x) => x.username === r.from);
                const nm = u ? u.name.split(' ')[0] : r.from;
                const av = u ? avatarOf(r.from) : 'assets/avatars/avatar1.svg?v=2';
                return `<div class="req-row"><img src="${esc(av)}" alt=""><div><strong>${esc(nm)}</strong><span>$${esc(r.from)}</span></div><button type="button" class="follow-btn" data-req-ok="${esc(r.from)}">Aceitar</button><button type="button" class="link-btn" data-req-no="${esc(r.from)}">Recusar</button></div>`;
            }).join('') + '</div>';
        }
        if (!st.matches.length && !reqs.length) {
            list.innerHTML = '<p class="match-list-empty">Nenhum match ainda.<br>Volte para Descobrir e distribua likes.</p>';
            return;
        }
        list.innerHTML = reqHtml + st.matches.map((m) => {
            const p = getMatchProfile(m.id);
            if (!p) return '';
            const last = m.messages.length ? m.messages[m.messages.length - 1] : null;
            const preview = last ? (last.from === 'me' ? 'Você: ' : '') + last.text : 'Novo match!';
            return `
                <button type="button" class="match-item${m.id === activeMatchId ? ' active' : ''}" data-match="${m.id}">
                    <img src="${esc(p.avatar)}" alt="${esc(p.name)}">
                    <span class="match-item-info"><strong>${esc(p.name)}</strong><span>${esc(preview)}</span></span>
                    ${m.unread ? '<span class="unread-dot"></span>' : ''}
                </button>`;
        }).join('');

        $$('[data-match]', list).forEach((btn) => {
            btn.addEventListener('click', () => openChat(btn.dataset.match));
        });
        list.querySelectorAll('[data-req-ok]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const from = btn.dataset.reqOk;
                removeRequest(from);
                const s2 = getAppState();
                if (s2 && !s2.matches.some((m) => m.id === 'u:' + from)) {
                    s2.matches.unshift({ id: 'u:' + from, unread: 1, messages: [{ from: 'them', text: 'Aceitei sua solicitação! Bora jogar junto?', at: Date.now() }] });
                    saveAppState(s2);
                }
                renderMatchList();
                showToast('Amizade aceita! Chat liberado.', 'success');
            });
        });
        list.querySelectorAll('[data-req-no]').forEach((btn) => {
            btn.addEventListener('click', () => {
                removeRequest(btn.dataset.reqNo);
                renderMatchList();
                showToast('Solicitação recusada.', 'info');
            });
        });
    }

    function openChat(id) {
        activeMatchId = id;
        const st = getAppState();
        const m = st.matches.find((x) => x.id === id);
        if (!m) return;
        m.unread = 0;
        saveAppState(st);

        const p = getMatchProfile(id);
        $('#chatEmpty').hidden = true;
        $('#chatActive').hidden = false;
        $('#chatHead').innerHTML = `
            <img src="${esc(p.avatar)}" alt="${esc(p.name)}">
            <div><strong>${esc(p.name)}</strong><span>● online agora</span></div>`;
        renderMessages(m);
        renderMatchList();
    }

    function fmtTime(ts) {
        return new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }

    function renderMessages(m) {
        const box = $('#chatMessages');
        box.innerHTML = m.messages.map((msg) => dmMsgHtml(msg, m.id)).join('');
        box.scrollTop = box.scrollHeight;
    }

    function sendMessage(e) {
        e.preventDefault();
        const input = $('#chatInput');
        const text = input.value.trim();
        if (!text || !activeMatchId) return;
        const st = getAppState();
        const m = st.matches.find((x) => x.id === activeMatchId);
        if (!m) return;
        m.messages.push({ from: 'me', text, at: Date.now() });
        saveAppState(st);
        input.value = '';
        renderMessages(m);
        renderMatchList();
        simulateReply(m.id, m.messages.length);
    }

    function simulateReply(matchId, countBefore) {
        if (String(matchId).indexOf('u:') === 0) return;
        const box = $('#chatMessages');
        const typing = document.createElement('div');
        typing.className = 'typing';
        typing.innerHTML = '<span></span><span></span><span></span>';

        setTimeout(() => {
            if (activeMatchId === matchId && !$('#tab-matches').hidden) box.appendChild(typing);
        }, 900);

        setTimeout(() => {
            typing.remove();
            const st = getAppState();
            if (!st) return;
            const m = st.matches.find((x) => x.id === matchId);
            if (!m || m.messages.length !== countBefore) return;
            const text = CHAT_REPLIES[Math.floor(Math.random() * CHAT_REPLIES.length)];
            m.messages.push({ from: 'them', text, at: Date.now() });
            if (activeMatchId === matchId && !$('#tab-matches').hidden) {
                renderMessages(m);
            } else {
                m.unread = (m.unread || 0) + 1;
            }
            saveAppState(st);
            renderMatchList();
        }, 2600);
    }

    /* --- Perfil --- */
    function renderProfile() {
        const user = currentUser();
        if (!user) return;
        $('#pfAvatar').src = myAvatar();
        $('#pfName').textContent = user.name.split(' ')[0];
        $('#pfUser').textContent = '$' + user.username;

        const vip = store.get('gc_vip_v1', null);
        $('#pfVip').innerHTML = vip
            ? `<span class="vip-badge" id="pfVipBadge">${planTag()}${isOwner() ? '' : ' ATIVO'}</span>`
            : '<span style="color:var(--text-3);font-weight:600">Plano Free — <a href="planos.html">virar VIP</a></span>';
        paintBadge($('#pfVipBadge'), vip ? vip.plan : 'free', badgeColorOf(user.username));
        renderBadgePicker();

        const k = appKey();
        const st = k ? store.get(k, { seen: [], matches: [] }) : { seen: [], matches: [] };
        const likesGiven = st.seen ? st.seen.length : 0;
        $('#pfStats').innerHTML = `
            <div><strong>${st.matches.length}</strong><span>matches</span></div>
            <div><strong>${likesGiven}</strong><span>vistos</span></div>
            <div><strong>${vip ? '∞' : FREE_LIKES_PER_DAY}</strong><span>likes/dia</span></div>`;

        const dg = $('#pfDogtag');
        if (dg) {
            const eq = getEquippedDogtag();
            const item = getOwnedDogtags().find((o) => o.id === eq);
            dg.innerHTML = item
                ? `<div class="dogtag mini ${item.id}"><span class="dogtag-hole"></span><span class="dogtag-text">${esc(item.text)}</span><span class="dogtag-sub">${item.id === 'elite' ? 'ELITE MEMBER' : 'GAMERCONNECTIONS'}</span></div>`
                : '<p class="profile-dogtag-empty">Nenhuma dogtag — <a href="loja.html">escolher estilo</a></p>';
        }
    }

    /* ============================================
       20. Salas — dados
       ============================================ */
    const ROOM_GAMES = [
        { id: 'valorant', name: 'Valorant', color: '#3b82f6', base: 87 },
        { id: 'lol', name: 'League of Legends', color: '#22d3ee', base: 112 },
        { id: 'fortnite', name: 'Fortnite', color: '#38b6ff', base: 64 },
        { id: 'minecraft', name: 'Minecraft', color: '#60a5fa', base: 45 },
        { id: 'cod', name: 'Call of Duty', color: '#818cf8', base: 58 },
        { id: 'wow', name: 'World of Warcraft', color: '#93c5fd', base: 31 },
    ];

    const ROOM_SEEDS = {
        valorant: [
            { u: 'Vivi', t: 'Alguém pro competitivo? Jogo de sentinela, sou imortal' },
            { u: 'Kaito', t: 'To aquecendo no DM, chamo em 10min' },
        ],
        lol: [
            { u: 'Kaito', t: 'Procuro duo pra sair do platina, jogo mid' },
            { u: 'Leo', t: 'Alguém pra ARAM? Hoje é dia de chill' },
        ],
        fortnite: [
            { u: 'Bia', t: 'Squad fechando, falta 1! Zero build' },
            { u: 'Rafa', t: 'Cheguei, bora cair no Tilted' },
        ],
        minecraft: [
            { u: 'Nico', t: 'Servidor novo no ar, IP fixado no topo' },
            { u: 'Bia', t: 'Alguém pra minerar netherite comigo?' },
        ],
        cod: [
            { u: 'Rafa', t: 'Rebirth com a galera às 21h, confirma presença' },
            { u: 'Leo', t: 'Confirmado, levo as smokes' },
        ],
        wow: [
            { u: 'Nico', t: 'Guilda recrutando healer pra raid de sexta' },
            { u: 'Mia', t: 'Sou DPS mas quebro um galho de heal' },
        ],
    };

    const ROOM_BOT_NAMES = ['Ghost', 'NoScope', 'Pixel', 'FragQueen', 'Zer0', 'Blitz', 'Nova', 'Rush'];
    const ROOM_BOT_TEXTS = [
        'GG demais essa última partida',
        'alguém mais travando ou é minha net?',
        'bora fechar squad?',
        'que horas vocês costumam jogar?',
        'alguém clipou aquela play??',
        'to online, me chamem',
        'qual rank vocês tão?',
        'essa sala é a melhor daqui, papo reto',
        'alguém afim de ranked agora?',
        'jogo de suporte, me adotem',
    ];

    /* ============================================
       21. Salas — motor
       ============================================ */
    let activeRoom = null;
    let roomTimer = null;
    const roomOnline = {};

    function getPrivateRooms() { return store.get('gc_rooms_v1', []); }
    function savePrivateRooms(r) { store.set('gc_rooms_v1', r); }
    function getRoomMsgs() { return store.get('gc_roommsg_v1', {}); }
    function saveRoomMsgs(m) {
        Object.keys(m).forEach((k) => { m[k] = m[k].slice(-100); });
        store.set('gc_roommsg_v1', m);
    }

    function seedRoomMsgs() {
        const all = getRoomMsgs();
        let changed = false;
        ROOM_GAMES.forEach((g) => {
            const k = 'g_' + g.id;
            if (!all[k]) {
                all[k] = ROOM_SEEDS[g.id].map((s, i) => ({ user: s.u, text: s.t, at: Date.now() - (ROOM_SEEDS[g.id].length - i) * 90000 }));
                changed = true;
            }
        });
        if (changed) saveRoomMsgs(all);
    }

    function onlineCount(gameId, base) {
        if (!roomOnline[gameId]) roomOnline[gameId] = base + Math.floor(Math.random() * 12);
        roomOnline[gameId] = Math.max(8, roomOnline[gameId] + Math.floor(Math.random() * 7) - 3);
        return roomOnline[gameId];
    }

    function gameById(id) { return ROOM_GAMES.find((g) => g.id === id) || ROOM_GAMES[0]; }

    function initRooms() {
        if (!$('#generalRooms')) return;
        seedRoomMsgs();

        $('#createRoomBtn').addEventListener('click', () => {
            if (!isVipUser()) {
                $('#upsellTitle').textContent = 'Salas privadas são VIP';
                $('#upsellText').textContent = 'Membros VIP e ELITE podem criar salas privadas com senha. E ganham likes ilimitados.';
                openModal($('#upsellModal'));
                return;
            }
            openModal($('#roomModal'));
        });

        $('#roomFormCreate').addEventListener('submit', (e) => {
            e.preventDefault();
            const nameInput = $('#roomName');
            const passInput = $('#roomPass');
            const name = nameInput.value.trim();
            const pass = passInput.value.trim();
            const nameGroup = nameInput.closest('.form-group');
            const passGroup = passInput.closest('.form-group');
            let ok = true;
            if (name.length < 3) {
                nameGroup.classList.add('error');
                nameGroup.querySelector('.error-message').textContent = 'Dê um nome com 3+ letras.';
                ok = false;
            } else {
                nameGroup.classList.remove('error');
                nameGroup.querySelector('.error-message').textContent = '';
            }
            if (pass && pass.length < 4) {
                passGroup.classList.add('error');
                passGroup.querySelector('.error-message').textContent = 'Senha com 4+ caracteres.';
                ok = false;
            } else {
                passGroup.classList.remove('error');
                passGroup.querySelector('.error-message').textContent = '';
            }
            if (!ok) return;

            const user = currentUser();
            const rooms = getPrivateRooms();
            const room = {
                id: 'r' + Date.now().toString(36),
                name,
                game: $('#roomGame').value,
                password: pass || '',
                owner: user.username,
                at: Date.now(),
            };
            rooms.unshift(room);
            savePrivateRooms(rooms);
            const all = getRoomMsgs();
            all['p_' + room.id] = [{ sys: true, text: `${user.username} criou a sala`, at: Date.now() }];
            saveRoomMsgs(all);
            closeModal($('#roomModal'));
            $('#roomFormCreate').reset();
            renderRooms();
            enterRoom({ key: 'p_' + room.id, title: room.name, game: gameById(room.game).name, color: gameById(room.game).color, privateRoom: room });
            showToast('Sala privada criada!', 'success');
        });

        $('#roomPassForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const modal = $('#roomPassModal');
            const roomId = modal.dataset.roomId;
            const room = getPrivateRooms().find((r) => r.id === roomId);
            if (!room) return;
            const input = $('#roomPassInput');
            if (input.value === room.password) {
                closeModal(modal);
                input.value = '';
                enterRoom({ key: 'p_' + room.id, title: room.name, game: gameById(room.game).name, color: gameById(room.game).color, privateRoom: room });
            } else {
                const group = input.closest('.form-group');
                group.classList.add('error');
                group.querySelector('.error-message').textContent = 'Senha incorreta.';
            }
        });

        $('#roomBack').addEventListener('click', leaveRoomView);
        $('#roomForm').addEventListener('submit', sendRoomMessage);
        $('#roomDelete').addEventListener('click', () => {
            if (!activeRoom || !activeRoom.privateRoom) return;
            const rooms = getPrivateRooms().filter((r) => r.id !== activeRoom.privateRoom.id);
            savePrivateRooms(rooms);
            const all = getRoomMsgs();
            delete all[activeRoom.key];
            saveRoomMsgs(all);
            showToast('Sala excluída.', 'info');
            leaveRoomView();
            renderRooms();
        });
    }

    function renderRooms() {
        const general = $('#generalRooms');
        if (!general) return;
        const me = currentUser();
        const myName = me ? me.username : '';

        general.innerHTML = ROOM_GAMES.map((g) => `
            <button type="button" class="room-card" style="--room-color:${g.color}" data-general="${g.id}">
                <span class="room-tag">${esc(g.name)}</span>
                <span class="room-name">Sala geral</span>
                <span class="room-meta"><span class="online-dot"></span>${onlineCount(g.id, g.base)} online</span>
            </button>`).join('');

        $$('[data-general]', general).forEach((btn) => {
            btn.addEventListener('click', () => {
                const g = gameById(btn.dataset.general);
                enterRoom({ key: 'g_' + g.id, title: 'Sala ' + g.name, game: g.name, color: g.color, general: true });
            });
        });

        const priv = $('#privateRooms');
        const rooms = getPrivateRooms();
        if (!rooms.length) {
            priv.innerHTML = '<p class="rooms-empty">Nenhuma sala privada ainda. Membros VIP podem criar a primeira.</p>';
            return;
        }
        priv.innerHTML = rooms.map((r) => {
            const g = gameById(r.game);
            const mine = r.owner === myName;
            return `
            <button type="button" class="room-card" style="--room-color:${g.color}" data-private="${r.id}">
                <span class="room-tag">${esc(g.name)}</span>
                <span class="room-name">${esc(r.name)}
                    ${r.password ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>' : ''}
                </span>
                <span class="room-meta"><span class="online-dot"></span>por ${esc(r.owner)}${mine ? ' (sua)' : ''}</span>
            </button>`;
        }).join('');

        $$('[data-private]', priv).forEach((btn) => {
            btn.addEventListener('click', () => {
                const room = getPrivateRooms().find((r) => r.id === btn.dataset.private);
                if (!room) return;
                const me2 = currentUser();
                if (room.password && (!me2 || room.owner !== me2.username)) {
                    const modal = $('#roomPassModal');
                    modal.dataset.roomId = room.id;
                    $('#roomPassHint').textContent = `Sala de ${room.owner}. Digite a senha para entrar.`;
                    $('#roomPassInput').value = '';
                    openModal(modal);
                } else {
                    const g = gameById(room.game);
                    enterRoom({ key: 'p_' + room.id, title: room.name, game: g.name, color: g.color, privateRoom: room });
                }
            });
        });
    }

    function enterRoom(room) {
        activeRoom = room;
        $('#roomsList').hidden = true;
        $('#roomView').hidden = false;
        $('#roomTitle').textContent = room.title;
        const me = currentUser();
        const mine = room.privateRoom && me && room.privateRoom.owner === me.username;
        $('#roomDelete').hidden = !mine;
        updateRoomMeta();
        renderRoomMessages();
        stopRoomBots();
        if (room.general) {
            roomTimer = setInterval(() => {
                if (!activeRoom || !activeRoom.general || $('#roomView').hidden) return;
                if (Math.random() < 0.55) return;
                const all = getRoomMsgs();
                const arr = all[activeRoom.key] || [];
                arr.push({
                    user: ROOM_BOT_NAMES[Math.floor(Math.random() * ROOM_BOT_NAMES.length)],
                    text: ROOM_BOT_TEXTS[Math.floor(Math.random() * ROOM_BOT_TEXTS.length)],
                    at: Date.now(),
                });
                all[activeRoom.key] = arr;
                saveRoomMsgs(all);
                if (activeRoom) {
                    renderRoomMessages();
                    updateRoomMeta();
                }
            }, 20000);
        }
        const sysAll = getRoomMsgs();
        const arr = sysAll[room.key] || [];
        arr.push({ sys: true, text: `${me ? me.username : 'Você'} entrou na sala`, at: Date.now() });
        sysAll[room.key] = arr;
        saveRoomMsgs(sysAll);
        renderRoomMessages();
    }

    function updateRoomMeta() {
        if (!activeRoom) return;
        const meta = $('#roomMeta');
        if (activeRoom.general) {
            const g = ROOM_GAMES.find((x) => 'g_' + x.id === activeRoom.key);
            meta.textContent = `${activeRoom.game} • ${onlineCount(activeRoom.key, g ? g.base : 40)} online`;
        } else {
            const r = activeRoom.privateRoom;
            meta.textContent = `${activeRoom.game} • privada${r.password ? ' com senha' : ''} • dono: ${r.owner}`;
        }
    }

    function leaveRoomView() {
        stopRoomBots();
        activeRoom = null;
        const list = $('#roomsList');
        const view = $('#roomView');
        if (list) list.hidden = false;
        if (view) view.hidden = true;
    }

    function stopRoomBots() {
        if (roomTimer) {
            clearInterval(roomTimer);
            roomTimer = null;
        }
    }

    function renderRoomMessages() {
        const box = $('#roomMessages');
        if (!box || !activeRoom) return;
        const me = currentUser();
        const myName = me ? me.username : '';
        const msgs = (getRoomMsgs()[activeRoom.key] || []);
        box.innerHTML = msgs.map((m) => {
            if (m.sys) return `<div class="room-sys">${esc(m.text)}</div>`;
            const mine = m.user === myName;
            return `<div class="room-msg ${mine ? 'me' : 'them'}"><div class="conv-head"><img src="${esc(msgAvatarOf(m.user))}" alt="" loading="lazy"><span class="who">$${esc(m.user)}</span></div><div class="bubble ${mine ? 'me' : 'them'}">${esc(m.text)}<span class="bubble-time">${fmtTime(m.at)}</span></div></div>`;
        }).join('');
        box.scrollTop = box.scrollHeight;
    }

    function sendRoomMessage(e) {
        e.preventDefault();
        const input = $('#roomInput');
        const text = input.value.trim();
        if (!text || !activeRoom) return;
        const me = currentUser();
        const all = getRoomMsgs();
        const arr = all[activeRoom.key] || [];
        arr.push({ user: me ? me.username : 'Você', text, at: Date.now() });
        all[activeRoom.key] = arr;
        saveRoomMsgs(all);
        input.value = '';
        renderRoomMessages();
    }

    /* ============================================
       22. Loja digital — coleção de dogtags
       ============================================ */
    function dogtagKey(suffix) {
        const s = getSession();
        return s ? 'gc_' + suffix + '_' + s.username : null;
    }
    function getOwnedDogtags() {
        const k = dogtagKey('dogtags');
        return k ? store.get(k, []) : [];
    }
    function saveOwnedDogtags(o) {
        const k = dogtagKey('dogtags');
        if (k) store.set(k, o);
    }
    function getEquippedDogtag() {
        const k = dogtagKey('equip');
        return k ? store.get(k, null) : null;
    }
    function setEquippedDogtag(id) {
        const k = dogtagKey('equip');
        if (k) store.set(k, id);
    }

    function initDogtagShop() {
        const grid = $('#dogGrid');
        if (!grid) return;
        const user = currentUser();

        // Texto padrão da gravação = username
        $$('.product-card [data-engrave]').forEach((input) => {
            const preview = input.closest('.product-card').querySelector('[data-preview]');
            if (user && !input.value) {
                input.value = user.username.slice(0, 14);
                if (preview) preview.textContent = input.value.toUpperCase();
            }
        });
        renderDogtagShop();

        grid.addEventListener('click', (e) => {
            const buyBtn = e.target.closest('[data-buy]');
            const equipBtn = e.target.closest('[data-equip]');
            const claimBtn = e.target.closest('[data-claim]');
            if (buyBtn) openBuyModal(buyBtn.closest('.product-card'));
            if (equipBtn) {
                setEquippedDogtag(equipBtn.closest('.product-card').dataset.id);
                renderDogtagShop();
                showToast('Dogtag equipada no perfil!', 'success');
            }
            if (claimBtn) claimDogtag(claimBtn.closest('.product-card'));
        });

        const buyForm = $('#buyForm');
        if (buyForm) {
            buyForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const modal = $('#buyModal');
                if (!validCardFields(modal)) return;
                const btn = buyForm.querySelector('button[type="submit"]');
                setLoading(btn, btn.querySelector('.btn-text'), btn.querySelector('.btn-loader'), true);
                setTimeout(() => {
                    setLoading(btn, btn.querySelector('.btn-text'), btn.querySelector('.btn-loader'), false);
                    const card = document.querySelector(`.product-card[data-id="${modal.dataset.itemId}"]`);
                    const engrave = card ? card.querySelector('[data-engrave]') : null;
                    const text = engrave && engrave.value.trim() ? engrave.value.trim().toUpperCase() : 'SEU NICK';
                    const owned = getOwnedDogtags().filter((o) => o.id !== modal.dataset.itemId);
                    owned.push({ id: modal.dataset.itemId, text });
                    saveOwnedDogtags(owned);
                    setEquippedDogtag(modal.dataset.itemId);
                    $('#buyOrderCode').textContent = orderCode();
                    $('#buySuccessText').textContent = `${modal.dataset.itemName} desbloqueada e equipada no seu perfil.`;
                    showStep(modal, 'success');
                    renderDogtagShop();
                    showToast('Dogtag desbloqueada!', 'success');
                }, 1600);
            });
        }
    }

    function renderDogtagShop() {
        const grid = $('#dogGrid');
        if (!grid) return;
        const owned = getOwnedDogtags();
        const equipped = getEquippedDogtag();
        const vip = store.get('gc_vip_v1', null);
        const isElite = isEliteUser();

        $$('.product-card', grid).forEach((card) => {
            const id = card.dataset.id;
            const has = owned.some((o) => o.id === id);
            card.classList.toggle('owned', has);
            card.querySelectorAll('.owned-badge').forEach((b) => b.remove());
            const actions = card.querySelector('[data-actions]');
            if (has) {
                const badge = document.createElement('span');
                badge.className = 'owned-badge';
                badge.textContent = 'Na sua coleção';
                card.appendChild(badge);
                actions.innerHTML = equipped === id
                    ? '<span class="btn btn-equipped">Equipada ✓</span>'
                    : '<button type="button" class="btn btn-secondary btn-mini" data-equip>Equipar</button>';
            } else if ((id === 'elite' && isElite) || isOwner()) {
                const priceEl = card.querySelector('[data-elite-price]');
                if (priceEl) priceEl.textContent = 'Grátis';
                actions.innerHTML = '<button type="button" class="btn btn-primary btn-mini" data-claim>Resgatar grátis</button>';
            } else {
                actions.innerHTML = '<button type="button" class="btn btn-primary btn-mini" data-buy>Comprar</button>';
            }
        });
    }

    function openBuyModal(card) {
        const modal = $('#buyModal');
        modal.dataset.itemId = card.dataset.id;
        modal.dataset.itemName = card.dataset.name;
        const engrave = card.querySelector('[data-engrave]');
        const text = engrave && engrave.value.trim() ? engrave.value.trim().toUpperCase() : 'SEU NICK';
        $('#buySummary').innerHTML = `
            <div class="order-line"><span>${esc(card.dataset.name)}</span><strong>${BRL(parseFloat(card.dataset.price))}</strong></div>
            <div class="order-line"><span>Gravação</span><strong>${esc(text)}</strong></div>
            <div class="order-line total"><span>Total</span><strong>${BRL(parseFloat(card.dataset.price))}</strong></div>`;
        openModal(modal);
    }

    function claimDogtag(card) {
        const id = card.dataset.id;
        const vip = store.get('gc_vip_v1', null);
        const ok = vip && (isOwner() || (vip.plan === 'elite' && id === 'elite'));
        if (!ok) {
            showToast(id === 'elite' ? 'A dogtag dourada grátis é exclusiva do plano ELITE.' : 'Entre como OWNER para resgatar.', 'error');
            return;
        }
        const engrave = card.querySelector('[data-engrave]');
        const text = engrave && engrave.value.trim() ? engrave.value.trim().toUpperCase() : 'SEU NICK';
        const owned = getOwnedDogtags().filter((o) => o.id !== id);
        owned.push({ id, text });
        saveOwnedDogtags(owned);
        setEquippedDogtag(id);
        renderDogtagShop();
        showToast(`Dogtag ${id === 'elite' ? 'Elite' : card.dataset.name} resgatada e equipada!`, 'success');
    }

    /* ============================================
       23. Feed global — dados
       ============================================ */
    const SEED_POSTS = [
        { id: 'sp1', authorId: 'mia', type: 'photo', src: 'https://picsum.photos/seed/gcranked/800/1000', game: 'Valorant', hoursAgo: 1, caption: 'Radiante de novo. Quem quiser coach de mira, chama na DM.', likes: 342 },
        { id: 'sp2', authorId: 'bia', type: 'photo', src: 'https://picsum.photos/seed/gcbuild/800/1000', game: 'Fortnite', hoursAgo: 3, caption: 'Vitória com 12 eliminações. O drop pagou hoje.', likes: 187 },
        { id: 'sp3', authorId: 'rafa', type: 'video', src: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4', poster: 'https://picsum.photos/seed/gccod/800/1000', game: 'Call of Duty', hoursAgo: 5, caption: 'Clip da play de ontem. Esse 1v3 foi insano.', likes: 256 },
        { id: 'sp4', authorId: 'nico', type: 'photo', src: 'https://picsum.photos/seed/gccastle/800/1000', game: 'Minecraft', hoursAgo: 8, caption: 'Terminei meu castelo depois de 3 semanas. Servidor aberto!', likes: 423 },
        { id: 'sp5', authorId: 'luna', type: 'photo', src: 'https://picsum.photos/seed/gcduel/800/1000', game: 'Valorant', hoursAgo: 12, caption: 'Nova skin, nova era. Ace de Operator pra começar o dia.', likes: 198 },
        { id: 'sp6', authorId: 'kaito', type: 'photo', src: 'https://picsum.photos/seed/gcmid/800/1000', game: 'League of Legends', hoursAgo: 20, caption: 'Finalmente saí do platina. Mid diff.', likes: 154 },
        { id: 'sp7', authorId: 'vivi', type: 'photo', src: 'https://picsum.photos/seed/gcsetup/800/1000', game: 'Valorant', hoursAgo: 30, caption: 'Setup novo montado. RGB aumenta o HS, confia.', likes: 287 },
        { id: 'sp8', authorId: 'leo', type: 'photo', src: 'https://picsum.photos/seed/gcchill/800/1000', game: 'Call of Duty', hoursAgo: 49, caption: 'Sexta à noite: ranked com os amigos e zero stress.', likes: 96 },
    ];

    /* ============================================
       24. Feed global — motor
       ============================================ */
    let feedFilter = 'all';
    let pendingPostFile = null;

    function myPosts() {
        const s = getSession();
        if (!s) return [];
        return store.get('gc_posts_all', []).filter((p) => p.authorUsername === s.username);
    }

    function getAllUserPosts() {
        return store.get('gc_posts_all', []).slice();
    }

    function getPostLikes() {
        const s = getSession();
        return s ? store.get('gc_postlikes_' + s.username, []) : [];
    }

    function getFollows() {
        const s = getSession();
        return s ? store.get('gc_follows_' + s.username, []) : [];
    }

    function resolveAuthor(p) {
        if (p.authorId) {
            const prof = PROFILES.find((x) => x.id === p.authorId);
            if (prof) return { key: prof.id, name: prof.name, avatar: prof.avatar, seed: true };
        }
        const u = getUsers().find((x) => x.username === p.authorUsername);
        return {
            key: 'u:' + p.authorUsername,
            name: u ? u.name.split(' ')[0] : p.authorUsername,
            avatar: avatarOf(p.authorUsername),
            seed: false,
        };
    }

    function fmtAgo(ts) {
        const m = Math.floor((Date.now() - ts) / 60000);
        if (m < 1) return 'agora';
        if (m < 60) return m + ' min';
        const h = Math.floor(m / 60);
        if (h < 24) return h + ' h';
        return Math.floor(h / 24) + ' d';
    }

    function feedItems() {
        const seeds = SEED_POSTS.map((p) => ({ ...p, at: Date.now() - p.hoursAgo * 3600000 }));
        const seen = new Set();
        const all = [...getAllUserPosts(), ...seeds].sort((a, b) => b.at - a.at).filter((p) => {
            if (!p || seen.has(p.id)) return false;
            seen.add(p.id);
            return true;
        });
        const blk = blockedSet();
        const hidden = getHiddenPosts();
        return all.filter((p) => {
            if (hidden.includes(p.id)) return false;
            const a = resolveAuthor(p);
            if (blk.has(a.key) || blk.has(a.name)) return false;
            if (feedTag && !postHasTag(p, feedTag)) return false;
            if (getBlockedTags().some((t) => postHasTag(p, t))) return false;
            return true;
        });
    }

    function initFeed() {
        if (!$('#feedList')) return;
        const me = currentUser();
        if (me) {
            const c = $('#composerAvatar');
            if (c) c.src = myAvatar();
        }
        $('#composerOpen').addEventListener('click', () => openModal($('#postModal')));
        $$('.feed-filters .pill').forEach((b) => {
            b.addEventListener('click', () => {
                $$('.feed-filters .pill').forEach((x) => x.classList.remove('active'));
                b.classList.add('active');
                feedFilter = b.dataset.f;
                renderFeed();
            });
        });
        initPostForm();
        seedComments();
        initSearch();
        initComments();
        initReport();
        const tagClear = $('#tagClear');
        if (tagClear) tagClear.addEventListener('click', clearTagFilter);
        renderFeed();
    }

    function renderFeed() {
        const list = $('#feedList');
        if (!list) return;
        refreshCloudPosts();
        const likes = getPostLikes();
        const follows = getFollows();
        let items = feedItems();
        if (feedFilter === 'following') {
            items = items.filter((p) => follows.includes(resolveAuthor(p).key));
        }
        if (!items.length) {
            list.innerHTML = '<p class="rooms-empty">Nada por aqui. Siga jogadores ou seja o primeiro a postar.</p>';
            return;
        }
        const heartSvg = '<svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>';
        list.innerHTML = items.map((p) => {
            const a = resolveAuthor(p);
            const liked = likes.includes(p.id);
            const sessU = getSession();
            const isMine = a.key === (sessU ? 'u:' + sessU.username : '');
            const media = p.type === 'video'
                ? `<video class="post-media" src="${p.src}"${p.poster ? ` poster="${p.poster}"` : ''} controls playsinline preload="metadata"></video>`
                : `<img class="post-media" src="${p.src}" alt="Publicação de ${esc(a.name)}" loading="lazy">`;
            return `<article class="post" data-post="${p.id}">
                <div class="post-head">
                    <button type="button" class="post-author" data-author="${a.key}" data-seed="${a.seed ? 1 : 0}" data-uname="${a.seed ? '' : esc(p.authorUsername || '')}">
                        <img src="${esc(a.avatar)}" alt="${esc(a.name)}">
                        <div><strong>${esc(a.name)}</strong><span>${esc(p.game)} • ${fmtAgo(p.at)}</span></div>
                    </button>
                    <button type="button" class="follow-btn${follows.includes(a.key) ? ' following' : ''}" data-follow="${esc(a.key)}">${follows.includes(a.key) ? 'Seguindo' : 'Seguir'}</button>
                </div>
                <div class="post-media-wrap">${media}</div>
                <div class="post-actions">
                    <button type="button" class="like-btn${liked ? ' liked' : ''}" data-plike="${p.id}">${heartSvg}<span>${(p.likes || 0) + (liked ? 1 : 0)}</span></button>
                    <button type="button" class="comment-btn" data-comments="${p.id}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg><span>${commentCount(p.id)}</span>
                    </button>
                    ${isMine ? '' : (a.seed ? `<button type="button" class="view-profile-btn" data-view="${a.key}">Ver perfil</button>` : `<button type="button" class="view-profile-btn" data-viewuser="${esc(p.authorUsername || '')}">Ver perfil</button>`)}
                    ${isMine ? '' : `<button type="button" class="report-link" data-report-post="${p.id}">Denunciar</button>`}
                </div>
                <p class="post-caption"><strong>${esc(a.name)}</strong> ${fmtCaption(p.caption || '')}</p>
            </article>`;
        }).join('');

        // Fallback offline para fotos externas
        $$('#feedList img.post-media').forEach((img) => {
            img.addEventListener('error', () => {
                const w = img.closest('.post-media-wrap');
                if (w) w.innerHTML = '<div class="post-media post-fallback"><span>GAMERCONNECTIONS</span></div>';
            }, { once: true });
        });

        const s = getSession();
        list.querySelectorAll('[data-plike]').forEach((b) => {
            b.addEventListener('click', () => {
                if (!s) return;
                let arr = store.get('gc_postlikes_' + s.username, []);
                arr = arr.includes(b.dataset.plike) ? arr.filter((x) => x !== b.dataset.plike) : [...arr, b.dataset.plike];
                store.set('gc_postlikes_' + s.username, arr);
                renderFeed();
            });
        });
        list.querySelectorAll('[data-follow]').forEach((b) => {
            b.addEventListener('click', () => {
                if (!s) return;
                let arr = store.get('gc_follows_' + s.username, []);
                const key = b.dataset.follow;
                arr = arr.includes(key) ? arr.filter((x) => x !== key) : [...arr, key];
                store.set('gc_follows_' + s.username, arr);
                renderFeed();
            });
        });
        list.querySelectorAll('[data-view]').forEach((b) => {
            b.addEventListener('click', () => openPerson(b.dataset.view));
        });
        list.querySelectorAll('[data-viewuser]').forEach((b) => {
            b.addEventListener('click', () => openUserCard(b.dataset.viewuser));
        });
        list.querySelectorAll('[data-comments]').forEach((b) => {
            b.addEventListener('click', () => openComments(b.dataset.comments));
        });
        list.querySelectorAll('[data-report-post]').forEach((b) => {
            b.addEventListener('click', () => openReport('post', b.dataset.reportPost));
        });
        list.querySelectorAll('.hashtag').forEach((b) => {
            b.addEventListener('click', () => setTagFilter(b.dataset.tag));
        });
        list.querySelectorAll('[data-author]').forEach((b) => {
            b.addEventListener('click', () => openAuthorProfile(b.dataset.author, b.dataset.seed === '1', b.dataset.uname));
        });
    }

    /* --- Publicar --- */
    function initPostForm() {
        const form = $('#postForm');
        if (!form) return;
        const fileInput = $('#postFile');
        const preview = $('#postPreview');
        const err = $('#postError');

        fileInput.addEventListener('change', async () => {
            err.textContent = '';
            preview.innerHTML = '';
            preview.hidden = true;
            pendingPostFile = null;
            const f = fileInput.files && fileInput.files[0];
            if (!f) return;
            const isVideo = f.type.indexOf('video/') === 0;
            const isGif = f.type === 'image/gif';
            const isImage = f.type.indexOf('image/') === 0 && !isGif;
            if (!isVideo && !isImage && !isGif) {
                err.textContent = 'Envie uma foto ou um vídeo.';
                fileInput.value = '';
                return;
            }
            let src = null;
            if (isVideo || isGif) {
                // Vídeos e GIFs vão para a nuvem (sem limite local)
                const up = await uploadMedia(f, 'posts');
                if (!up.url && f.size > 8 * 1024 * 1024) {
                    err.textContent = 'Arquivo muito pesado para salvar offline (máx 8MB). Verifique a internet e tente de novo.';
                    fileInput.value = '';
                    return;
                }
                src = up.url || up.dataUrl;
            } else {
                try {
                    src = await downscaleImage(f, 1280, 0.85);
                } catch (ex) {
                    err.textContent = 'Não foi possível ler a imagem.';
                    fileInput.value = '';
                    return;
                }
            }
            if (isVideo) {
                const v = document.createElement('video');
                v.preload = 'metadata';
                v.src = src;
                v.onloadedmetadata = () => {
                    if (v.duration > 30.5) {
                        err.textContent = `Vídeo de ${Math.round(v.duration)}s. O limite é 30 segundos.`;
                        fileInput.value = '';
                        return;
                    }
                    pendingPostFile = { type: 'video', dataUrl: src };
                    preview.innerHTML = `<video src="${src}" controls playsinline></video><span class="video-badge">${Math.round(v.duration)}s</span>`;
                    preview.hidden = false;
                };
                v.onerror = () => { err.textContent = 'Não foi possível ler o vídeo.'; };
            } else {
                pendingPostFile = { type: 'photo', dataUrl: src };
                preview.innerHTML = `<img src="${src}" alt="Prévia">`;
                preview.hidden = false;
            }
        });

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            if (!pendingPostFile) {
                err.textContent = 'Escolha uma foto ou vídeo primeiro.';
                return;
            }
            const caption = $('#postCaption').value.trim().slice(0, 220);
            const game = $('#postGame').selectedOptions[0].textContent;
            const s = getSession();
            const newPost = { id: 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), authorUsername: s ? s.username : '?', type: pendingPostFile.type, src: pendingPostFile.dataUrl, caption, game, at: Date.now(), likes: 0 };
            const all = store.get('gc_posts_all', []);
            all.unshift(newPost);
            store.set('gc_posts_all', all);
            form.reset();
            preview.innerHTML = '';
            preview.hidden = true;
            pendingPostFile = null;
            closeModal($('#postModal'));
            feedFilter = 'all';
            $$('.feed-filters .pill').forEach((x) => x.classList.toggle('active', x.dataset.f === 'all'));
            renderFeed();
            showToast('Publicado no feed global!', 'success');
        });
    }

    /* --- Ver perfil + curtida direta (paga) --- */
    function openPerson(profileId) {
        const p = PROFILES.find((x) => x.id === profileId);
        if (!p) return;
        const posts = SEED_POSTS.filter((s) => s.authorId === p.id);
        const followed = getFollows().includes(p.id);
        const b = $('#pmBanner');
        b.className = 'insta-banner mini banner-g' + (p.id.length % 4);
        b.style.backgroundImage = '';
        b.style.backgroundPosition = '';
        $('#pmAvatar').src = p.avatar;
        $('#pmName').textContent = `${p.name}, ${p.age}`;
        $('#pmMeta').textContent = `${p.rank} • ${p.level}`;
        $('#pmGames').dataset.expanded = '0';
        pmGamesFull = p.games;
        renderPmGames();
        $('#pmBio').textContent = p.bio;
        $('#pmStPosts').textContent = posts.length;
        $('#pmStFollowers').textContent = 120 + ((p.id.charCodeAt(0) * 37) % 700) + (followed ? 1 : 0);
        $('#pmStFollowing').textContent = 90 + ((p.id.charCodeAt(0) * 53) % 250);
        const seedPlan = SEED_PLANS[p.id] || 'free';
        const pmBox = $('#pmPlan');
        if (pmBox) {
            pmBox.innerHTML = `<span class="vip-badge">${planTagOf(seedPlan)}</span>`;
            paintBadge(pmBox.firstChild, seedPlan, null);
        }
        renderPersonGrid(posts);
        renderModalMedals(seedMedalList(p, posts.length, getFollows().includes(p.id)));
        const st = getAppState();
        const matched = st && st.matches.some((m) => m.id === p.id);
        const btn = $('#pmLikeBtn');
        const hint = $('#pmHint');
        if (matched) {
            btn.textContent = 'Conversar no match';
            btn.onclick = () => {
                closeModal($('#personModal'));
                switchTab('matches');
                openChat(p.id);
            };
            hint.textContent = 'Vocês já deram match. Bora pro papo.';
        } else {
            btn.textContent = 'Dar like no match';
            btn.onclick = () => superLike(p.id);
            hint.textContent = isVipUser() ? 'VIP: curtidas diretas ilimitadas.' : 'Conta Free: 1 curtida direta por dia. VIP é ilimitado.';
        }
        const fb = $('#pmFollowBtn');
        fb.hidden = false;
        const refreshFb = () => {
            const has = getFollows().includes(p.id);
            fb.textContent = has ? 'Seguindo ✓' : 'Seguir';
        };
        refreshFb();
        fb.onclick = () => {
            toggleFollow(p.id);
            refreshFb();
            renderFeed();
            $('#pmStFollowers').textContent = 120 + ((p.id.charCodeAt(0) * 37) % 700) + (getFollows().includes(p.id) ? 1 : 0);
        };
        $('#pmAddBtn').hidden = true;
        $('#pmMsgBtn').hidden = true;
        $('#pmBlockBtn').style.display = '';
        $('#pmBlockBtn').onclick = () => {
            const now = toggleBlock({ key: p.id, name: p.name });
            if (now) {
                const s2 = getAppState();
                if (s2) {
                    s2.matches = s2.matches.filter((m) => m.id !== p.id);
                    saveAppState(s2);
                    renderMatchList();
                }
            }
            showToast(now ? `${p.name} bloqueado.` : `${p.name} desbloqueado.`, now ? 'error' : 'success');
            closeModal($('#personModal'));
            renderFeed();
            renderDeck();
        };
        openModal($('#personModal'));
    }

    let pmGamesFull = [];

    function renderPmGames() {
        const box = $('#pmGames');
        if (!box) return;
        const showAll = box.dataset.expanded === '1';
        const list = showAll ? pmGamesFull : pmGamesFull.slice(0, 3);
        box.innerHTML = list.map((g) => `<span>${gameLogo(g) ? `<img src="${gameLogo(g)}" alt="">` : ''}${esc(g)}</span>`).join('')
            + (pmGamesFull.length > 3 ? `<button type="button" class="games-plus${showAll ? ' open' : ''}" data-pmexpand aria-label="Ver jogos">${showAll ? '−' : '+'}</button>` : '');
        const btn = box.querySelector('[data-pmexpand]');
        if (btn) btn.addEventListener('click', () => {
            box.dataset.expanded = showAll ? '0' : '1';
            renderPmGames();
        });
    }

    function seedMedalList(p, postCount, followed) {
        const fcount = 120 + ((p.id.charCodeAt(0) * 37) % 700) + (followed ? 1 : 0);
        const out = [MEDALS.find((m) => m.id === 'founder')];
        if (postCount > 0) out.push(MEDALS.find((m) => m.id === 'creator'));
        if (fcount >= 500) out.push(MEDALS.find((m) => m.id === 'popular'));
        return out.filter(Boolean).slice(0, 3);
    }

    function equippedMedalsOf(username) {
        const eq = store.get('gc_medals_' + username, []);
        const dates = store.get('gc_medal_dates_' + username, {});
        return eq.slice(0, 6).map((id) => {
            const m = MEDALS.find((x) => x.id === id);
            return m ? { ...m, date: dates[id] } : null;
        }).filter(Boolean);
    }

    function renderModalMedals(list) {
        const box = $('#pmMedals');
        if (!box) return;
        box.innerHTML = list.length
            ? list.map((m) => `<span class="medal-chip" title="${esc(m.name)}${m.date ? ' — desde ' + fmtDate(m.date) : ''}"><img src="${m.icon}" alt="${esc(m.name)}"></span>`).join('')
            : '';
        box.style.display = list.length ? 'flex' : 'none';
    }

    function renderPersonGrid(posts) {
        const grid = $('#pmGrid');
        if (!grid) return;
        grid.innerHTML = posts.length ? posts.map((pp) => `
            <button type="button" class="my-grid-item" data-pmlight="${pp.id}">
                ${pp.type === 'video' ? `<video src="${pp.src}" preload="metadata" muted playsinline></video><span class="grid-video-tag">▶</span>` : `<img src="${pp.src}" alt="" loading="lazy">`}
            </button>`).join('') : '<p class="my-grid-empty">Nenhuma publicação ainda.</p>';
        grid.querySelectorAll('[data-pmlight]').forEach((bb) => {
            bb.addEventListener('click', () => {
                closeModal($('#personModal'));
                setTimeout(() => openLight(bb.dataset.pmlight), 150);
            });
        });
    }

    function superLike(profileId) {
        const p = PROFILES.find((x) => x.id === profileId);
        if (!p) return;
        const st = getAppState();
        if (st.matches.some((m) => m.id === profileId)) {
            closeModal($('#personModal'));
            switchTab('matches');
            openChat(profileId);
            return;
        }
        if (!isVipUser()) {
            if (!st.super || st.super.date !== todayStr()) st.super = { date: todayStr(), count: 0 };
            if (st.super.count >= 1) {
                $('#upsellTitle').textContent = 'Curtida direta é VIP';
                $('#upsellText').textContent = 'Conta Free curte direto 1x por dia. VIP tem curtidas diretas ilimitadas + likes ∞ no Descobrir.';
                closeModal($('#personModal'));
                openModal($('#upsellModal'));
                return;
            }
            st.super.count++;
            saveAppState(st);
        }
        if (!st.seen.includes(profileId)) st.seen.push(profileId);
        if (p.likesYou && !st.matches.some((m) => m.id === profileId)) {
            st.matches.unshift({ id: profileId, unread: 1, messages: [{ from: 'them', text: 'Ei! Vi sua curtida no meu post. Bora jogar junto?', at: Date.now() }] });
            saveAppState(st);
            closeModal($('#personModal'));
            renderDeck();
            renderLikesBar();
            renderMatchList();
            openMatchModal(p);
            return;
        }
        saveAppState(st);
        closeModal($('#personModal'));
        renderDeck();
        showToast(`Like enviado para ${p.name}! Se curtir de volta, vira match.`, 'success');
    }

    /* ============================================
       25. Perfil — dados
       ============================================ */
    function getProfile() {
        const s = getSession();
        return s ? store.get('gc_profile_' + s.username, {}) : {};
    }
    function saveProfile(p) {
        const s = getSession();
        if (s) store.set('gc_profile_' + s.username, p);
    }
    function myAvatar() {
        const u = currentUser();
        if (!u) return 'assets/avatars/avatar1.svg?v=2';
        const pf = getProfile();
        if (pf.gifAvatar && isVipUser()) return pf.gifAvatar;
        return pf.photo || u.avatar;
    }
    // Avatar de QUALQUER usuário (foto/gif personalizado ou padrão)
    function avatarOf(username) {
        const u = getUsers().find((x) => x.username === username);
        if (!u) {
            const cu = cloudUserCache[String(username || '').toLowerCase()];
            return (cu && cu.avatar) || 'assets/avatars/avatar1.svg?v=2';
        }
        try {
            const pf = store.get('gc_profile_' + username, {});
            if (pf.gifAvatar) return pf.gifAvatar;
            if (pf.photo) return pf.photo;
        } catch (e) { /* ignore */ }
        return u.avatar;
    }
    function getFollowerList() {
        const s = getSession();
        if (!s) return [];
        const out = [];
        const followers = store.get('gc_followers_of_' + s.username, []);
        followers.forEach((username) => {
            const u = getUsers().find((x) => x.username === username);
            if (u) out.push({ key: 'u:' + username, name: u.name.split(' ')[0], avatar: avatarOf(username), seed: false });
        });
        return out;
    }
    function resolveFollowKey(key) {
        if (key.indexOf('u:') === 0) {
            const u = getUsers().find((x) => x.username === key.slice(2));
            return u ? { key, name: u.name.split(' ')[0], avatar: avatarOf(key.slice(2)), seed: false } : null;
        }
        const p = PROFILES.find((x) => x.id === key);
        return p ? { key, name: p.name, avatar: p.avatar, seed: true } : null;
    }
    function toggleFollow(key) {
        const s = getSession();
        if (!s) return false;
        let arr = store.get('gc_follows_' + s.username, []);
        const has = arr.includes(key);
        arr = has ? arr.filter((x) => x !== key) : [...arr, key];
        store.set('gc_follows_' + s.username, arr);
        return !has;
    }
    function togglePostLike(id) {
        const s = getSession();
        if (!s) return false;
        let arr = store.get('gc_postlikes_' + s.username, []);
        const has = arr.includes(id);
        arr = has ? arr.filter((x) => x !== id) : [...arr, id];
        store.set('gc_postlikes_' + s.username, arr);
        return !has;
    }

    /* ============================================
       26. Perfil — render e clips
       ============================================ */
    let clipsObserver = null;
    let clipsMuted = true;
    let clipsData = [];

    function renderPfGames() {
        const box = $('#pfGames');
        if (!box) return;
        const games = getProfile().games || [];
        const showAll = box.dataset.expanded === '1';
        const list = showAll ? games : games.slice(0, 3);
        box.innerHTML = list.map((g) => `<span>${gameLogo(g) ? `<img src="${gameLogo(g)}" alt="">` : ''}${esc(g)}</span>`).join('');
        const tg = $('#gamesToggleBtn');
        if (tg) {
            tg.style.display = games.length > 3 ? '' : 'none';
            tg.textContent = showAll ? '−' : '+';
            tg.classList.toggle('open', showAll);
        }
    }

    function renderInsta() {
        const user = currentUser();
        if (!user || !$('#pfName')) return;
        const pf = getProfile();

        // Banner
        const b = $('#pfBanner');
        const pb = pf.banner;
        b.className = 'insta-banner' + (pb && pb.type === 'img' ? ' has-img' : ' banner-g' + ((pb && pb.i) || 0));
        b.style.backgroundImage = pb && pb.type === 'img' ? `url("${pb.src}")` : '';
        b.style.backgroundPosition = 'center ' + ((pb && pb.pos) || 'top');

        const card = $('#instaCard');
        if (card) {
            const th = (typeof pf.theme === 'number') ? pf.theme : 0;
            card.className = 'insta-profile' + (th > 0 ? ' theme-t' + th : '');
            if (pf.bgImg && isVipUser()) {
                card.style.backgroundImage = `linear-gradient(rgba(5,7,14,0.78), rgba(5,7,14,0.93)), url("${pf.bgImg}")`;
                card.style.backgroundSize = 'cover';
                card.style.backgroundPosition = 'center top';
            } else {
                card.style.backgroundImage = '';
                card.style.backgroundSize = '';
            }
        }

        const statsBar = document.querySelector('#tab-profile .insta-stats');
        if (statsBar) {
            const owned = getOwnedDogtags();
            const eq = owned.find((o) => o.id === getEquippedDogtag());
            if (eq && eq.id === 'elite') {
                statsBar.style.borderColor = 'rgba(233, 199, 102, 0.6)';
                statsBar.style.boxShadow = '0 0 22px rgba(233, 199, 102, 0.22), inset 0 1px 0 rgba(255,255,255,0.05)';
            } else if (eq && eq.id === 'neon') {
                statsBar.style.borderColor = 'rgba(34, 211, 238, 0.55)';
                statsBar.style.boxShadow = '0 0 22px rgba(34, 211, 238, 0.2), inset 0 1px 0 rgba(255,255,255,0.05)';
            } else if (eq) {
                statsBar.style.borderColor = 'rgba(195, 204, 217, 0.5)';
                statsBar.style.boxShadow = '0 0 18px rgba(195, 204, 217, 0.18), inset 0 1px 0 rgba(255,255,255,0.05)';
            } else {
                statsBar.style.borderColor = '';
                statsBar.style.boxShadow = '';
            }
        }

        // Contadores
        $('#stPosts').textContent = myPosts().length;
        $('#stFollowers').textContent = getFollowerList().length;
        $('#stFollowing').textContent = getFollows().length;

        // Bio e chips
        const bio = $('#pfBio');
        bio.textContent = pf.bio || '';
        bio.style.display = pf.bio ? 'block' : 'none';
        $('#pfHobbies').innerHTML = (pf.hobbies || []).map((h) => `<span># ${esc(h)}</span>`).join('');
        renderPfGames();

        renderHighlights();
        renderMedals();
        renderBlockedList();
        const admBtn = $('#adminBtn');
        if (admBtn) {
            admBtn.hidden = !isOwner();
            if (!admBtn.dataset.bound) {
                admBtn.dataset.bound = '1';
                admBtn.addEventListener('click', () => switchTab('admin'));
            }
        }
        renderMyWall();
        renderMyGrid();
    }

    function renderMyGrid() {
        const grid = $('#myGrid');
        if (!grid) return;
        stopClips();
        const posts = myPosts();
        if (!posts.length) {
            grid.innerHTML = '<p class="my-grid-empty">Nenhuma publicação ainda.<br>Compartilhe sua primeira play no Feed.</p>';
            return;
        }
        grid.innerHTML = posts.map((p) => `
            <button type="button" class="my-grid-item" data-light="${p.id}">
                ${p.type === 'video' ? `<video src="${p.src}" preload="metadata" muted playsinline></video><span class="grid-video-tag">▶ ${p.dur || 'clip'}</span>` : `<img src="${p.src}" alt="Publicação" loading="lazy">`}
            </button>`).join('');
        grid.querySelectorAll('[data-light]').forEach((btn) => {
            btn.addEventListener('click', () => openLight(btn.dataset.light));
        });
    }

    function findPost(id) {
        return feedItems().find((p) => p.id === id) || myPosts().find((p) => p.id === id);
    }

    function openLight(id) {
        const p = findPost(id);
        if (!p) return;
        const s = getSession();
        const likes = s ? store.get('gc_postlikes_' + s.username, []) : [];
        const liked = likes.includes(p.id);
        const media = p.type === 'video'
            ? `<video src="${p.src}" controls playsinline ${p.poster ? `poster="${p.poster}"` : ''}></video>`
            : `<img src="${p.src}" alt="Publicação">`;
        $('#lightBody').innerHTML = `
            ${media}
            <div class="post-actions">
                <button type="button" class="like-btn${liked ? ' liked' : ''}" id="lightLike">
                    <svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                    <span>${(p.likes || 0) + (liked ? 1 : 0)}</span>
                </button>
            </div>
            <p class="post-caption">${esc(p.caption || '')}</p>
            ${myPosts().some((x) => x.id === p.id) ? '<button type="button" class="btn btn-outline btn-full" id="lightDelete" style="margin-top:12px">Excluir publicação</button>' : ''}`;
        $('#lightLike').addEventListener('click', () => {
            const nowLiked = togglePostLike(p.id);
            const btn = $('#lightLike');
            btn.classList.toggle('liked', nowLiked);
            btn.querySelector('span').textContent = (p.likes || 0) + (nowLiked ? 1 : 0);
            renderFeed();
        });
        const delBtn = $('#lightDelete');
        if (delBtn) delBtn.addEventListener('click', () => {
            const all = store.get('gc_posts_all', []).filter((x) => x.id !== p.id);
            store.set('gc_posts_all', all);
            closeModal($('#lightModal'));
            renderMyGrid();
            renderInsta();
            renderFeed();
            showToast('Publicação excluída.', 'info');
        });
        openModal($('#lightModal'));
    }

    /* --- Clips --- */
    function renderClips() {
        const stage = $('#clipsStage');
        if (!stage) return;
        stopClips();
        const s = getSession();
        const all = feedItems().filter((p) => p.type === 'video');
        const mine = all.filter((p) => p.authorUsername === (s && s.username));
        const others = all.filter((p) => p.authorUsername !== (s && s.username));
        clipsData = [...mine, ...others];
        if (!clipsData.length) {
            stage.innerHTML = '<p class="clips-empty">Nenhum clip ainda.<br>Publique um vídeo de até 30s no Feed.</p>';
            return;
        }
        const likes = getPostLikes();
        const follows = getFollows();
        stage.innerHTML = clipsData.map((p) => {
            const a = resolveAuthor(p);
            const liked = likes.includes(p.id);
            return `<div class="clip" data-clip="${p.id}">
                <video src="${p.src}"${p.poster ? ` poster="${p.poster}"` : ''} loop playsinline preload="metadata" muted></video>
                <div class="clip-shade"></div>
                <div class="clip-info"><button type="button" class="clip-author" data-author="${a.key}" data-seed="${a.seed ? 1 : 0}" data-uname="${a.seed ? '' : esc(p.authorUsername || '')}"><strong>$${esc(a.name)}</strong></button><p>${esc(p.caption || '')}</p></div>
                <div class="clip-rail">
                    <button type="button" class="like-btn${liked ? ' liked' : ''}" data-cliplike="${p.id}">
                        <svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                        <span>${(p.likes || 0) + (liked ? 1 : 0)}</span>
                    </button>
                    ${a.seed ? `<button type="button" class="follow-btn${follows.includes(a.key) ? ' following' : ''}" data-clipfollow="${esc(a.key)}">${follows.includes(a.key) ? 'Seguindo' : 'Seguir'}</button>` : ''}
                </div>
            </div>`;
        }).join('');

        clipsObserver = new IntersectionObserver((entries) => {
            entries.forEach((en) => {
                const v = en.target;
                if (en.isIntersecting && en.intersectionRatio > 0.6) {
                    v.muted = clipsMuted;
                    v.play().catch(() => { /* autoplay bloqueado */ });
                } else {
                    v.pause();
                }
            });
        }, { root: stage, threshold: [0, 0.6, 1] });
        stage.querySelectorAll('video').forEach((v) => clipsObserver.observe(v));

        stage.onclick = (e) => {
            const ab = e.target.closest('[data-clipauthor]');
            if (ab) {
                openAuthorProfile(ab.dataset.author, ab.dataset.seed === '1', ab.dataset.uname);
                return;
            }
            const lb = e.target.closest('[data-cliplike]');
            if (lb) {
                const liked = togglePostLike(lb.dataset.cliplike);
                const clip = clipsData.find((c) => c.id === lb.dataset.cliplike);
                lb.classList.toggle('liked', liked);
                lb.querySelector('span').textContent = ((clip && clip.likes) || 0) + (liked ? 1 : 0);
                return;
            }
            const fb = e.target.closest('[data-clipfollow]');
            if (fb) {
                const now = toggleFollow(fb.dataset.clipfollow);
                fb.classList.toggle('following', now);
                fb.textContent = now ? 'Seguindo' : 'Seguir';
            }
        };
        updateMuteBtn();
    }

    function stopClips() {
        if (clipsObserver) {
            clipsObserver.disconnect();
            clipsObserver = null;
        }
        $$('#clipsStage video').forEach((v) => v.pause());
    }

    function updateMuteBtn() {
        const btn = $('#clipMute');
        if (btn) {
            btn.classList.toggle('off', clipsMuted);
            btn.title = clipsMuted ? 'Ativar som' : 'Silenciar';
        }
    }

    function clipStep(dir) {
        const stage = $('#clipsStage');
        if (stage) stage.scrollBy({ top: dir * stage.clientHeight, behavior: 'smooth' });
    }

    /* --- Seguidores / seguindo --- */
    function openFollowList(kind) {
        if (kind === 'posts') {
            $$('[data-ptab]').forEach((t) => t.classList.toggle('active', t.dataset.ptab === 'posts'));
            $('#myGrid').hidden = false;
            $('#myClips').hidden = true;
            renderMyGrid();
            return;
        }
        const title = $('#followTitle');
        const list = $('#followList');
        title.textContent = kind === 'followers' ? 'Seguidores' : 'Seguindo';
        const rows = kind === 'followers' ? getFollowerList() : getFollows().map(resolveFollowKey).filter(Boolean);
        if (!rows.length) {
            list.innerHTML = '<p class="my-grid-empty">Ninguém por aqui ainda.</p>';
        } else {
            const follows = getFollows();
            list.innerHTML = rows.map((r) => `
                <div class="follow-row">
                    <img src="${esc(r.avatar)}" alt="${esc(r.name)}">
                    <div><strong>${esc(r.name)}</strong><span>${r.seed ? 'Jogador da comunidade' : '$' + esc(r.key.slice(2))}</span></div>
                    ${r.seed ? `<button type="button" class="follow-btn${follows.includes(r.key) ? ' following' : ''}" data-fb="${esc(r.key)}">${follows.includes(r.key) ? 'Seguindo' : 'Seguir'}</button>` : ''}
                </div>`).join('');
            list.querySelectorAll('[data-fb]').forEach((b) => {
                b.addEventListener('click', () => {
                    const now = toggleFollow(b.dataset.fb);
                    b.classList.toggle('following', now);
                    b.textContent = now ? 'Seguindo' : 'Seguir';
                    renderInsta();
                });
            });
        }
        openModal($('#followModal'));
    }

    /* --- Editar perfil --- */
    const EDIT_GAMES = [
        { name: 'Valorant', logo: 'assets/games/valorant.svg' },
        { name: 'League of Legends', logo: 'assets/games/lol.svg' },
        { name: 'Fortnite', logo: 'assets/games/fortnite.svg' },
        { name: 'Minecraft', logo: 'assets/games/minecraft.svg' },
        { name: 'Call of Duty', logo: 'assets/games/cod.svg' },
        { name: 'World of Warcraft', logo: 'assets/games/wow.png' },
    ];
    const GAME_LOGOS = Object.fromEntries(EDIT_GAMES.map((g) => [g.name, g.logo]));
    const GAME_ALIAS = { LoL: 'League of Legends', CoD: 'Call of Duty', WoW: 'World of Warcraft' };
    function gameLogo(name) {
        return GAME_LOGOS[name] || GAME_LOGOS[GAME_ALIAS[name]] || '';
    }
    const editSel = { avatar: null, photo: null, gif: null, banner: null, bannerPos: 'top', theme: null, bgImg: null };

    function initProfile() {
        if (!$('#editProfileBtn')) return;

        const medalsBtn = $('#medalsBtn');
        if (medalsBtn) medalsBtn.addEventListener('click', openMedals);
        const gamesToggle = $('#gamesToggleBtn');
        if (gamesToggle) gamesToggle.addEventListener('click', () => {
            const grid = $('#pfGames');
            grid.dataset.expanded = grid.dataset.expanded === '1' ? '0' : '1';
            renderPfGames();
        });
        const medalsRow = $('#pfMedals');
        if (medalsRow) medalsRow.addEventListener('click', openMedals);

        $$('[data-followlist]').forEach((b) => {
            b.addEventListener('click', () => openFollowList(b.dataset.followlist));
        });

        $$('[data-ptab]').forEach((t) => {
            t.addEventListener('click', () => {
                $$('[data-ptab]').forEach((x) => x.classList.toggle('active', x === t));
                const clips = t.dataset.ptab === 'clips';
                $('#myGrid').hidden = clips;
                $('#myClips').hidden = !clips;
                if (clips) renderProfileClips();
                else { stopClips(); renderMyGrid(); }
            });
        });

        /* navegação dos clips ligada globalmente em initClipsNav */

        $('#editProfileBtn').addEventListener('click', openEditProfile);

        $('#photoUpload').addEventListener('change', (e) => {
            const f = e.target.files && e.target.files[0];
            if (!f) return;
            downscaleImage(f, 256, 0.85).then((dataUrl) => {
                editSel.photo = dataUrl;
                editSel.gif = '';
                editSel.avatar = null;
                $('#editAvaPreview').src = dataUrl;
                $$('#editAvatarGrid .avatar-option').forEach((o) => o.classList.remove('active'));
            }).catch(() => showToast('Não foi possível ler a foto.', 'error'));
        });

        $('#gifUpload').addEventListener('click', (e) => {
            if (!isVipUser()) {
                e.preventDefault();
                showToast('GIF no avatar é exclusivo VIP.', 'error');
            }
        });
        $('#gifUpload').addEventListener('change', async (e) => {
            const f = e.target.files && e.target.files[0];
            if (!f || !isVipUser()) return;
            const up = await uploadMedia(f, 'avatars');
            if (!up.url && f.size > 2 * 1024 * 1024) {
                showToast('GIF muito pesado para salvar offline (máx 2MB). Verifique a internet.', 'error');
                e.target.value = '';
                return;
            }
            editSel.gif = up.url || up.dataUrl;
            $('#editAvaPreview').src = editSel.gif;
            showToast(up.url ? 'GIF na nuvem! Clique em Salvar.' : 'Prévia do GIF aplicada. Clique em Salvar!', 'success');
        });

        $('#bannerUpload').addEventListener('click', (e) => {
            if (!isVipUser()) {
                e.preventDefault();
                showToast('Banner personalizado é exclusivo VIP.', 'error');
            }
        });
        $('#bannerUpload').addEventListener('change', async (e) => {
            const f = e.target.files && e.target.files[0];
            if (!f || !isVipUser()) return;
            if (f.type === 'image/gif') {
                const up = await uploadMedia(f, 'banners');
                if (!up.url && f.size > 2 * 1024 * 1024) {
                    showToast('GIF muito pesado para salvar offline (máx 2MB).', 'error');
                    e.target.value = '';
                    return;
                }
                editSel.banner = { type: 'img', src: up.url || up.dataUrl };
            } else {
                try {
                    editSel.banner = { type: 'img', src: await downscaleImage(f, 900, 0.82) };
                } catch (ex) {
                    showToast('Não foi possível ler a imagem.', 'error');
                    return;
                }
            }
            $$('#bannerSwatches button').forEach((o) => o.classList.remove('active'));
            showToast('Banner pronto! Salve o perfil.', 'success');
        });

        $('#bgUpload').addEventListener('click', (e) => {
            if (!isVipUser()) {
                e.preventDefault();
                showToast('Imagem de fundo personalizada é exclusiva VIP.', 'error');
            }
        });
        $('#bgUpload').addEventListener('change', async (e) => {
            const f = e.target.files && e.target.files[0];
            if (!f || !isVipUser()) return;
            if (f.type === 'image/gif') {
                const up = await uploadMedia(f, 'backgrounds');
                if (!up.url && f.size > 2 * 1024 * 1024) {
                    showToast('GIF muito pesado para salvar offline (máx 2MB).', 'error');
                    e.target.value = '';
                    return;
                }
                editSel.bgImg = up.url || up.dataUrl;
            } else {
                try {
                    editSel.bgImg = await downscaleImage(f, 900, 0.82);
                } catch (ex) {
                    showToast('Não foi possível ler a imagem.', 'error');
                    return;
                }
            }
            showToast('Fundo pronto! Salve o perfil.', 'success');
        });

        $('#editProfileForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const me0 = currentUser();
            const newU = $('#editUsername').value.trim();
            if (me0 && newU && newU !== me0.username) {
                if (!/^[a-zA-Z0-9_]{3,20}$/.test(newU)) {
                    showToast('Username: 3-20 caracteres (letras, números e _).', 'error');
                    return;
                }
                if (getUsers().some((x) => x.username.toLowerCase() === newU.toLowerCase())) {
                    showToast('Esse username já está em uso.', 'error');
                    return;
                }
                const cloudRow = await cloudGetUser(newU);
                if (cloudRow && cloudRow.username.toLowerCase() !== me0.username.toLowerCase()) {
                    showToast('Esse username já está em uso.', 'error');
                    return;
                }
                showToast('Atualizando username em tudo...', 'info');
                await renameUser(me0.username, newU);
            }
            const pf = getProfile();
            pf.bio = $('#editBio').value.trim().slice(0, 150);
            pf.hobbies = $('#editHobbies').value.split(',').map((h) => h.trim().slice(0, 24)).filter(Boolean).slice(0, 8);
            pf.games = $$('#editGames input:checked').map((c) => c.value);
            const users = getUsers();
            const me = currentUser();
            const urec = me ? users.find((x) => x.username === me.username) : null;
            if (urec) {
                const eg = document.querySelector('#editGenderPick input:checked');
                if (eg) urec.gender = eg.value;
                const eb = document.querySelector('#editBuscoPick input:checked');
                if (eb) urec.lookingFor = eb.value;
                const ew = $$('#editWantPick input:checked').map((c) => c.value);
                if (ew.length) urec.intents = ew;
                saveUsers(users);
                try {
                    const cc = supaClient();
                    if (cc) await cc.from('profiles').update({ gender: urec.gender || null, looking_for: urec.lookingFor || null, intents: urec.intents || [] }).eq('username', me.username);
                } catch (e) { /* segue local */ }
            }
            if (editSel.photo) {
                pf.photo = editSel.photo;
            } else if (editSel.avatar) {
                pf.photo = '';
                const users = getUsers();
                const me = currentUser();
                const u = users.find((x) => x.username === me.username);
                if (u) {
                    u.avatar = editSel.avatar;
                    saveUsers(users);
                }
            }
            if (editSel.theme !== null && editSel.theme !== undefined) pf.theme = editSel.theme;
            if (isVipUser()) {
                if (editSel.gif !== null) pf.gifAvatar = editSel.gif || '';
                if (editSel.banner !== null) pf.banner = editSel.banner;
                if (pf.banner) pf.banner.pos = editSel.bannerPos;
                if (editSel.bgImg) pf.bgImg = editSel.bgImg;
            }
            const saveRes = saveProfileSafe(pf);
            if (saveRes === 'fail') {
                showToast('Perfil muito pesado para salvar. Use imagens menores.', 'error');
                return;
            }
            if (saveRes === 'no-gif') showToast('GIF removido (muito pesado). Restante salvo!', 'info');
            closeModal($('#editProfileModal'));
            renderInsta();
            renderProfile();
            initSideUser();
            const c = $('#composerAvatar');
            if (c) c.src = myAvatar();
            showToast('Perfil atualizado!', 'success');
        });
    }

    function openEditProfile() {
        const user = currentUser();
        if (!user) return;
        const pf = getProfile();
        const vip = isVipUser();
        editSel.avatar = null;
        editSel.photo = null;
        editSel.gif = null;
        editSel.banner = null;
        editSel.theme = null;
        editSel.bgImg = null;

        $('#editAvaPreview').src = myAvatar();
        const grid = $('#editAvatarGrid');
        grid.innerHTML = AVATARS.map((src) => `
            <button type="button" class="avatar-option${user.avatar === src && !pf.photo ? ' active' : ''}" data-src="${src}">
                <img src="${src}" alt="Avatar" loading="lazy">
            </button>`).join('');
        grid.querySelectorAll('.avatar-option').forEach((o) => {
            o.addEventListener('click', () => {
                grid.querySelectorAll('.avatar-option').forEach((x) => x.classList.remove('active'));
                o.classList.add('active');
                editSel.avatar = o.dataset.src;
                editSel.gif = '';
                editSel.photo = null;
                $('#editAvaPreview').src = o.dataset.src;
            });
        });

        $$('#editProfileModal [data-lock]').forEach((l) => { l.hidden = vip; });
        $('#gifUpload').disabled = !vip;
        $('#bannerUpload').disabled = !vip;
        $('#bgUpload').disabled = !vip;

        const sw = $('#bannerSwatches');
        const curB = pf.banner || { type: 'g', i: 0 };
        sw.innerHTML = [0, 1, 2, 3].map((i) => `
            <button type="button" class="${'sw-g' + i}${curB.type !== 'img' && (curB.i || 0) === i ? ' active' : ''}" data-b="${i}" aria-label="Banner ${i + 1}"${vip ? '' : ' disabled'}></button>`).join('');
        sw.querySelectorAll('button').forEach((b) => {
            b.addEventListener('click', () => {
                if (!vip) return;
                sw.querySelectorAll('button').forEach((x) => x.classList.remove('active'));
                b.classList.add('active');
                editSel.banner = { type: 'g', i: parseInt(b.dataset.b, 10) };
            });
        });

        const curTheme = (typeof pf.theme === 'number') ? pf.theme : 0;
        const tsw = $('#themeSwatches');
        tsw.querySelectorAll('button').forEach((o) => o.classList.toggle('active', parseInt(o.dataset.theme, 10) === curTheme));
        tsw.querySelectorAll('button').forEach((b) => {
            b.addEventListener('click', () => {
                tsw.querySelectorAll('button').forEach((x) => x.classList.remove('active'));
                b.classList.add('active');
                editSel.theme = parseInt(b.dataset.theme, 10);
            });
        });

        editSel.bannerPos = (pf.banner && pf.banner.pos) || 'top';
        $$('#bannerPos .billing-option').forEach((o) => {
            o.classList.toggle('active', o.dataset.pos === editSel.bannerPos);
            o.onclick = () => {
                if (!vip) return;
                editSel.bannerPos = o.dataset.pos;
                $$('#bannerPos .billing-option').forEach((x) => x.classList.toggle('active', x === o));
            };
        });

        $('#editUsername').value = user.username;
        $('#editBio').value = pf.bio || '';
        const gPick = document.querySelector(`#editGenderPick input[value="${user.gender || ''}"]`);
        if (gPick) gPick.checked = true;
        const bPick = document.querySelector(`#editBuscoPick input[value="${user.lookingFor || 'both'}"]`);
        if (bPick) bPick.checked = true;
        const wWant = user.intents || [];
        $$('#editWantPick input').forEach((c) => { c.checked = wWant.includes(c.value); });
        $('#editHobbies').value = (pf.hobbies || []).join(', ');
        $('#editGames').innerHTML = EDIT_GAMES.map((g) => `
            <label><input type="checkbox" value="${g.name}"${(pf.games || []).includes(g.name) ? ' checked' : ''}><img src="${g.logo}" alt=""> ${g.name}</label>`).join('');

        openModal($('#editProfileModal'));
    }

    /* ============================================
       32. Clips — motor reutilizável + destaques
       ============================================ */
    let clipsObservers = [];
    let clipsFilterMode = 'mine';

    function allClipPosts() {
        return feedItems().filter((p) => p.type === 'video');
    }

    function renderClipsInto(stage, items) {
        if (!stage) return;
        stopAllClips();
        if (!items.length) {
            stage.innerHTML = '<p class="clips-empty">Nenhum clip aqui.<br>Publique um vídeo de até 30s no Feed.</p>';
            return;
        }
        const likes = getPostLikes();
        const follows = getFollows();
        const heart = '<svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>';
        stage.innerHTML = items.map((p) => {
            const a = resolveAuthor(p);
            const liked = likes.includes(p.id);
            return `<div class="clip" data-clip="${p.id}">
                <video src="${p.src}"${p.poster ? ` poster="${p.poster}"` : ''} loop playsinline preload="metadata" muted></video>
                <div class="clip-shade"></div>
                <div class="clip-info"><button type="button" class="clip-author" data-author="${a.key}" data-seed="${a.seed ? 1 : 0}" data-uname="${a.seed ? '' : esc(p.authorUsername || '')}"><strong>$${esc(a.name)}</strong></button><p>${esc(p.caption || '')}</p></div>
                <div class="clip-rail">
                    <button type="button" class="like-btn${liked ? ' liked' : ''}" data-cliplike="${p.id}" data-base="${p.likes || 0}">${heart}<span>${(p.likes || 0) + (liked ? 1 : 0)}</span></button>
                    ${a.seed ? `<button type="button" class="follow-btn${follows.includes(a.key) ? ' following' : ''}" data-clipfollow="${esc(a.key)}">${follows.includes(a.key) ? 'Seguindo' : 'Seguir'}</button>` : ''}
                </div>
            </div>`;
        }).join('');
        const obs = new IntersectionObserver((entries) => {
            entries.forEach((en) => {
                const v = en.target;
                if (en.isIntersecting && en.intersectionRatio > 0.6) {
                    v.muted = clipsMuted;
                    v.play().catch(() => { /* autoplay bloqueado */ });
                } else {
                    v.pause();
                }
            });
        }, { root: stage, threshold: [0, 0.6, 1] });
        stage.querySelectorAll('video').forEach((v) => obs.observe(v));
        clipsObservers.push(obs);
        stage.onclick = (e) => {
            const ab = e.target.closest('[data-clipauthor]');
            if (ab) {
                openAuthorProfile(ab.dataset.author, ab.dataset.seed === '1', ab.dataset.uname);
                return;
            }
            const lb = e.target.closest('[data-cliplike]');
            if (lb) {
                const liked = togglePostLike(lb.dataset.cliplike);
                lb.classList.toggle('liked', liked);
                lb.querySelector('span').textContent = parseInt(lb.dataset.base, 10) + (liked ? 1 : 0);
                return;
            }
            const fb = e.target.closest('[data-clipfollow]');
            if (fb) {
                const now = toggleFollow(fb.dataset.clipfollow);
                fb.classList.toggle('following', now);
                fb.textContent = now ? 'Seguindo' : 'Seguir';
            }
        };
    }

    function stopAllClips() {
        clipsObservers.forEach((o) => { try { o.disconnect(); } catch (e) { /* ignore */ } });
        clipsObservers = [];
        $$('.clips-stage video').forEach((v) => v.pause());
    }

    function renderGlobalClips() {
        const s = getSession();
        const all = allClipPosts();
        const items = clipsFilterMode === 'mine' ? all.filter((p) => s && p.authorUsername === s.username) : all;
        renderClipsInto($('#clipsStageGlobal'), items);
    }

    function renderProfileClips() {
        const s = getSession();
        const all = allClipPosts();
        const mine = all.filter((p) => s && p.authorUsername === s.username);
        const others = all.filter((p) => !(s && p.authorUsername === s.username));
        renderClipsInto($('#clipsStage'), [...mine, ...others]);
    }

    function initClipsNav() {
        $$('[data-clipnav]').forEach((b) => {
            b.addEventListener('click', () => {
                const stage = document.getElementById(b.dataset.stage);
                if (stage) stage.scrollBy({ top: (b.dataset.clipnav === 'up' ? -1 : 1) * stage.clientHeight, behavior: 'smooth' });
            });
        });
        $$('[data-clipmute]').forEach((b) => {
            b.classList.toggle('off', clipsMuted);
            b.addEventListener('click', () => {
                clipsMuted = !clipsMuted;
                $$('.clips-stage video').forEach((v) => { v.muted = clipsMuted; });
                $$('[data-clipmute]').forEach((x) => x.classList.toggle('off', clipsMuted));
            });
        });
        $$('#clipsFilter .pill').forEach((b) => {
            b.addEventListener('click', () => {
                $$('#clipsFilter .pill').forEach((x) => x.classList.remove('active'));
                b.classList.add('active');
                clipsFilterMode = b.dataset.cf;
                renderGlobalClips();
            });
        });
    }

    /* --- Destaques (3) --- */
    function getHighlights() {
        const s = getSession();
        return s ? store.get('gc_hl_' + s.username, []) : [];
    }

    function renderHighlights() {
        const row = $('#hlRow');
        if (!row) return;
        const arr = getHighlights();
        let html = '';
        for (let i = 0; i < 3; i++) {
            const h = arr[i];
            html += h
                ? `<button type="button" class="hl-item" data-hl="${i}"><img src="${h.img}" alt="${esc(h.label)}"><span>${esc(h.label)}</span></button>`
                : `<button type="button" class="hl-item empty" data-hlnew="${i}"><span class="hl-plus">+</span><span>Adicionar</span></button>`;
        }
        row.innerHTML = html;
        row.querySelectorAll('[data-hl]').forEach((b) => {
            b.addEventListener('click', () => openHighlight(parseInt(b.dataset.hl, 10)));
        });
        row.querySelectorAll('[data-hlnew]').forEach((b) => {
            b.addEventListener('click', openHlModal);
        });
    }

    let hlCoverData = null;

    function openHlModal() {
        if (getHighlights().length >= 3) {
            showToast('Máximo de 3 destaques.', 'error');
            return;
        }
        hlCoverData = null;
        $('#hlForm').reset();
        $$('#hlModal [data-hlsrc]').forEach((x) => x.classList.toggle('active', x.dataset.hlsrc === 'upload'));
        $('#hlUploadPane').hidden = false;
        $('#hlPostsPane').hidden = true;
        const pick = $('#hlCoverPick');
        pick.style.backgroundImage = '';
        pick.classList.remove('has-img');
        $('#hlError').textContent = '';
        openModal($('#hlModal'));
    }

    function openHighlight(i) {
        const h = getHighlights()[i];
        if (!h) return;
        $('#lightBody').innerHTML = `<img src="${h.img}" alt="${esc(h.label)}"><p class="post-caption"><strong>${esc(h.label)}</strong></p><button type="button" class="btn btn-outline btn-full" id="hlRemove" style="margin-top:12px">Remover destaque</button>`;
        $('#hlRemove').addEventListener('click', () => {
            const arr = getHighlights();
            arr.splice(i, 1);
            const s = getSession();
            if (s) store.set('gc_hl_' + s.username, arr);
            closeModal($('#lightModal'));
            renderHighlights();
            showToast('Destaque removido.', 'info');
        });
        openModal($('#lightModal'));
    }

    function refreshPersonCounts(username) {
        const fall = store.get('gc_follows_all', []);
        const fcount = fall.filter((r) => r.following === 'u:' + username).length;
        const followingCount = fall.filter((r) => r.follower === username).length;
        const fc = $('#pmStFollowers');
        if (fc) fc.textContent = fcount;
        const fg = $('#pmStFollowing');
        if (fg) fg.textContent = followingCount;
    }

    function openAuthorProfile(key, isSeed, username) {
        if (isSeed) {
            openPerson(key);
        } else if (username) {
            openUserCard(username);
        }
    }

    function openUserCard(username) {
        const u = getUsers().find((x) => x.username === username) || cloudUserCache[username.toLowerCase()];
        if (!u) return;
        const sess = getSession();
        const isSelf = sess && sess.username === username;
        const pf = store.get('gc_profile_' + username, {});
        const posts = getAllUserPosts().filter(p => p.authorUsername === username);
        let fcount = 0;
        let following = [];
        try {
            const fall = store.get('gc_follows_all', []);
            fcount = fall.filter((r) => r.following === 'u:' + username).length;
            following = fall.filter((r) => r.follower === username).map((r) => r.following);
        } catch (e) { /* ignore */ }
        refreshPersonCounts(username);
        const b = $('#pmBanner');
        const pb = pf.banner;
        b.className = 'insta-banner mini' + (pb && pb.type === 'img' ? ' has-img' : ' banner-g' + ((pb && pb.i) || 0));
        b.style.backgroundImage = pb && pb.type === 'img' ? `url("${pb.src}")` : '';
        b.style.backgroundPosition = 'center ' + ((pb && pb.pos) || 'top');
        $('#pmAvatar').src = avatarOf(username);
        $('#pmName').textContent = u.name.split(' ')[0];
        $('#pmMeta').textContent = '$' + u.username;
        $('#pmGames').dataset.expanded = '0';
        pmGamesFull = pf.games || [];
        renderPmGames();
        $('#pmBio').textContent = pf.bio || 'Este gamer ainda não escreveu uma bio.';
        $('#pmStPosts').textContent = posts.length;
        $('#pmStFollowers').textContent = fcount;
        $('#pmStFollowing').textContent = following.length;
        const upl = planOf(username);
        const pmBox2 = $('#pmPlan');
        if (pmBox2) {
            pmBox2.innerHTML = `<span class="vip-badge">${planTagOf(upl)}</span>`;
            paintBadge(pmBox2.firstChild, upl, badgeColorOf(username));
        }
        renderPersonGrid(posts);
        renderModalMedals(equippedMedalsOf(username));
        $('#pmLikeBtn').hidden = true;
        const fb = $('#pmFollowBtn');
        fb.hidden = isSelf;
        const key = 'u:' + username;
        const refresh = () => {
            const has = getFollows().includes(key);
            fb.textContent = has ? 'Seguindo ✓' : 'Seguir';
        };
        refresh();
        fb.onclick = () => {
            const now = toggleFollow(key);
            refresh();
            renderFeed();
            showToast(now ? `Agora você segue ${u.name.split(' ')[0]}.` : 'Você deixou de seguir.', 'success');
        };
        $('#pmHint').textContent = isSelf ? 'Este é o seu perfil.' : 'Siga para ver os posts no filtro Seguindo.';
        $('#pmBlockBtn').style.display = isSelf ? 'none' : '';
        const ab = $('#pmAddBtn');
        const mb = $('#pmMsgBtn');
        if (ab) ab.hidden = isSelf;
        if (mb) mb.hidden = isSelf;
        if (!isSelf) {
            const me = getSession();
            const st = getAppState();
            const friends = st && st.matches.some((m) => m.id === 'u:' + username);
            let pending = false;
            if (me) {
                const reqs = store.get('gc_requests_' + username, []);
                pending = reqs.some((r) => r.from === me.username);
            }
            ab.textContent = friends ? 'Amigos ✓' : (pending ? 'Solicitação enviada' : '+ Adicionar');
            ab.disabled = friends || pending;
            ab.onclick = () => {
                if (sendRequest(username)) {
                    ab.textContent = 'Solicitação enviada';
                    ab.disabled = true;
                }
            };
            mb.onclick = () => {
                const s2 = getAppState();
                if (s2 && s2.matches.some((m) => m.id === 'u:' + username)) {
                    closeModal($('#personModal'));
                    switchTab('matches');
                    openChat('u:' + username);
                } else {
                    showToast('Vocês ainda não são amigos. Envie uma solicitação primeiro.', 'info');
                }
            };
            $('#pmBlockBtn').onclick = () => {
                const now = toggleBlock({ key: 'u:' + username, name: u.name.split(' ')[0] });
                showToast(now ? 'Usuário bloqueado.' : 'Usuário desbloqueado.', now ? 'error' : 'success');
                closeModal($('#personModal'));
                renderFeed();
                renderDeck();
            };
        }
        pmWallUser = isSelf ? null : username;
        renderPmWall();
        const wallForm = $('#pmWallForm');
        if (wallForm) wallForm.onsubmit = (e) => {
            e.preventDefault();
            if (!pmWallUser) return;
            const input = $('#pmWallInput');
            const text = input.value.trim().slice(0, 200);
            if (!text) return;
            const me = currentUser();
            pushWall(pmWallUser, me ? me.username : '?', text);
            input.value = '';
            renderPmWall();
            showToast('Comentário publicado no mural!', 'success');
        };
        openModal($('#personModal'));
    }

    function renderHlPosts() {
        const grid = $('#hlPostsGrid');
        if (!grid) return;
        const photos = myPosts().filter((p) => p.type !== 'video');
        grid.innerHTML = photos.length ? photos.map((p) => `
            <button type="button" class="my-grid-item${hlCoverData === p.src ? ' hl-sel' : ''}" data-hlpick="${p.id}">
                <img src="${p.src}" alt="" loading="lazy">
            </button>`).join('') : '<p class="my-grid-empty">Sem fotos publicadas ainda.</p>';
        grid.querySelectorAll('[data-hlpick]').forEach((b) => {
            b.addEventListener('click', () => {
                const post = myPosts().find((x) => x.id === b.dataset.hlpick);
                if (!post) return;
                hlCoverData = post.src;
                $('#hlError').textContent = '';
                const pick = $('#hlCoverPick');
                pick.style.backgroundImage = `url("${post.src}")`;
                pick.classList.add('has-img');
                renderHlPosts();
                showToast('Capa selecionada! Dê um nome e adicione.', 'success');
            });
        });
    }

    function initHighlights() {
        if (!$('#hlRow')) return;
        renderHighlights();
        $$('#hlModal [data-hlsrc]').forEach((t) => {
            t.addEventListener('click', () => {
                $$('#hlModal [data-hlsrc]').forEach((x) => x.classList.toggle('active', x === t));
                const posts = t.dataset.hlsrc === 'posts';
                $('#hlUploadPane').hidden = posts;
                $('#hlPostsPane').hidden = !posts;
                if (posts) renderHlPosts();
            });
        });
        $('#hlCoverPick').addEventListener('click', () => $('#hlCover').click());
        $('#hlCover').addEventListener('change', (e) => {
            const f = e.target.files && e.target.files[0];
            if (!f) return;
            if (f.size > 4 * 1024 * 1024) {
                $('#hlError').textContent = 'Imagem muito pesada (máx 4MB).';
                return;
            }
            const r = new FileReader();
            r.onload = () => {
                hlCoverData = r.result;
                const pick = $('#hlCoverPick');
                pick.style.backgroundImage = `url("${r.result}")`;
                pick.classList.add('has-img');
                $('#hlError').textContent = '';
            };
            r.readAsDataURL(f);
        });
        $('#hlForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const label = $('#hlLabel').value.trim().slice(0, 14);
            if (!hlCoverData) {
                $('#hlError').textContent = 'Escolha uma capa.';
                return;
            }
            if (!label) {
                $('#hlError').textContent = 'Dê um nome ao destaque.';
                return;
            }
            const arr = getHighlights();
            if (arr.length >= 3) {
                showToast('Máximo de 3 destaques.', 'error');
                return;
            }
            arr.push({ label, img: hlCoverData });
            const s = getSession();
            if (s) {
                store.set('gc_hl_' + s.username, arr);
            }
            closeModal($('#hlModal'));
            renderHighlights();
            showToast('Destaque adicionado!', 'success');
        });
    }

    /* ============================================
       33. Medalhas
       ============================================ */
    const MEDALS = [
        { id: 'founder', name: 'Fundador', icon: 'assets/icons/shield.png', req: 'Usar o código CEO-ACCESS' },
        { id: 'beta', name: 'BETA', icon: 'assets/icons/beta.svg', req: 'Jogar durante a fase beta' },
        { id: 'vip', name: 'VIP', icon: 'assets/icons/crown.png', req: 'Assinatura VIP ativa' },
        { id: 'elite', name: 'ELITE', icon: 'assets/icons/diamond.png', req: 'Assinatura ELITE ativa' },
        { id: 'creator', name: 'Criador', icon: 'assets/icons/mic.png', req: 'Publicar 1 post' },
        { id: 'marathon', name: 'Maratonista', icon: 'assets/icons/bolt.png', req: 'Publicar 5 posts' },
        { id: 'popular', name: 'Popular', icon: 'assets/icons/trophy.png', req: 'Ter 5 seguidores' },
        { id: 'social', name: 'Sociável', icon: 'assets/icons/target.png', req: 'Fazer 3 matches' },
    ];
    const MAX_MEDALS = 6;

    function hasBeta() {
        const s = getSession();
        if (!s) return false;
        if (store.get('gc_beta_' + s.username, false)) return true;
        // Migração: quem já exibia a BETA mantém
        const eq = store.get('gc_medals_' + s.username, []);
        if (eq.includes('beta')) {
            store.set('gc_beta_' + s.username, true);
            syncBeta(s.username, true);
            return true;
        }
        return false;
    }

    function hasFounder() {
        const s = getSession();
        if (!s) return false;
        if (store.get('gc_founder_' + s.username, false)) return true;
        return isOwner();
    }

    function evaluateMedals() {
        const vip = store.get('gc_vip_v1', null);
        const posts = myPosts().length;
        const followers = getFollowerList().length;
        const st = getAppState();
        const matches = st ? st.matches.length : 0;
        const un = {
            founder: hasFounder(),
            beta: hasBeta(),
            vip: !!(vip && (vip.plan === 'vip' || vip.plan === 'elite' || vip.plan === 'owner' || vip.plan === 'ceo')),
            elite: !!(vip && (vip.plan === 'elite' || vip.plan === 'owner' || vip.plan === 'ceo')),
            creator: posts >= 1,
            marathon: posts >= 5,
            popular: followers >= 5,
            social: matches >= 3,
        };
        const base = MEDALS.map((m) => ({ ...m, unlocked: !!un[m.id] }));
        return [...base, ...getCustomMedals().map((m) => ({ ...m, custom: true, unlocked: evalCustomRule(m) }))];
    }

    function getEquippedMedals() {
        const s = getSession();
        return s ? store.get('gc_medals_' + s.username, []) : [];
    }

    function stampMedalDates(ev) {
        const s = getSession();
        if (!s) return {};
        let dates = store.get('gc_medal_dates_' + s.username, {});
        let changed = false;
        const now = new Date().toISOString();
        ev.forEach((m) => {
            if (m.unlocked && !dates[m.id]) {
                dates[m.id] = now;
                changed = true;
            }
        });
        if (changed) {
            store.set('gc_medal_dates_' + s.username, dates);
            syncMedalDates(s.username, dates);
        }
        return dates;
    }

    function fmtDate(iso) {
        try { return new Date(iso).toLocaleDateString('pt-BR'); } catch (e) { return ''; }
    }

    function renderMedals() {
        const box = $('#pfMedals');
        if (!box) return;
        const ev = evaluateMedals();
        const dates = stampMedalDates(ev);
        const eq = getEquippedMedals()
            .map((id) => ev.find((m) => m.id === id))
            .filter((m) => m && m.unlocked);
        box.innerHTML = eq.length
            ? eq.map((m) => `<span class="medal-chip" title="${esc(m.name)} — desbloqueada em ${fmtDate(dates[m.id])}"><img src="${m.icon}" alt="${esc(m.name)}"></span>`).join('')
            : '<span class="medal-hint">Sem medalhas exibidas — toque para gerenciar</span>';
    }

    function openMedals() {
        const ev = evaluateMedals();
        const dates = stampMedalDates(ev);
        let eq = getEquippedMedals();
        const grid = $('#medalsGrid');
        if (!grid) return;
        const draw = () => {
            grid.innerHTML = ev.map((m) => {
                const isEq = eq.includes(m.id);
                return `<button type="button" class="medal-item${m.unlocked ? '' : ' locked'}${isEq ? ' equipped' : ''}" data-medal="${m.id}"${m.unlocked ? '' : ' disabled'}>
                    <img src="${m.icon}" alt="">
                    <strong>${esc(m.name)}</strong>
                    <span class="medal-req">${m.unlocked ? (isEq ? `Exibida ✓ • ${fmtDate(dates[m.id])}` : 'Toque para exibir') : 'Bloqueada'}</span>
                </button>`;
            }).join('');
            grid.querySelectorAll('[data-medal]').forEach((bb) => {
                bb.addEventListener('click', () => {
                    const id = bb.dataset.medal;
                    if (eq.includes(id)) {
                        eq = eq.filter((x) => x !== id);
                    } else {
                        if (eq.length >= MAX_MEDALS) {
                            showToast('Máximo de 6 medalhas visíveis.', 'error');
                            return;
                        }
                        eq = [...eq, id];
                    }
                    const s = getSession();
                    if (s) store.set('gc_medals_' + s.username, eq);
                    draw();
                    renderMedals();
                });
            });
        };
        draw();
        openModal($('#medalsModal'));
    }

    /* ============================================
       34. Códigos de resgate
       ============================================ */
    function initCode() {
        if (!$('#codeModal')) return;
        const openBtn = $('#codeBtn');
        if (openBtn) {
            openBtn.addEventListener('click', () => {
                $('#codeInput').value = '';
                $('#codeError').textContent = '';
                openModal($('#codeModal'));
            });
        }
        const input = $('#codeInput');
        input.addEventListener('input', () => {
            input.value = input.value.toUpperCase();
            $('#codeError').textContent = '';
        });
        $('#codeForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const code = input.value.trim().toUpperCase();
            const reward = REDEEM_CODES[code];
            if (!reward) {
                $('#codeError').textContent = 'Código inválido ou expirado.';
                return;
            }
            if (reward.single) {
                const client = supaClient();
                const s0 = getSession();
                if (!client || !s0) {
                    $('#codeError').textContent = 'Conecte-se à internet para resgatar este código.';
                    return;
                }
                try {
                    const { error } = await client.from('redeemed_codes').insert({ code, used_by: s0.username });
                    if (error) {
                        $('#codeError').textContent = error.code === '23505' ? 'Este código já foi utilizado.' : 'Não foi possível validar. Tente de novo.';
                        return;
                    }
                } catch (ex) {
                    $('#codeError').textContent = 'Sem conexão. Tente de novo.';
                    return;
                }
            }
            if (reward.medal) {
                const s = getSession();
                let has = false;
                if (s) has = store.get('gc_beta_' + s.username, false);
                if (has) {
                    closeModal($('#codeModal'));
                    showToast('Esta medalha já está desbloqueada.', 'info');
                    return;
                }
                if (s) {
                    store.set('gc_beta_' + s.username, true);
                    syncBeta(s.username, true);
                }
                closeModal($('#codeModal'));
                showToast(`Código resgatado! Medalha ${reward.label} desbloqueada. Equipe no perfil.`, 'success');
                return;
            }
            const cur = store.get('gc_vip_v1', null);
            if (cur && cur.plan === reward.plan) {
                closeModal($('#codeModal'));
                showToast('Este código já está ativo na sua conta.', 'info');
                return;
            }
            store.set('gc_vip_v1', { plan: reward.plan, label: reward.label, code, since: new Date().toISOString() });
            cloudSavePlan(reward.plan, reward.label);
            if (code === 'CEO-ACCESS') {
                const s = getSession();
                if (s) {
                    store.set('gc_founder_' + s.username, true);
                    syncFounder(s.username, true);
                }
            }
            closeModal($('#codeModal'));
            renderVipBadge();
            if ($('#pfName')) {
                renderProfile();
                renderInsta();
            }
            if ($('#sideName')) initSideUser();
            showToast(`Código resgatado! Acesso ${reward.label} ativado.`, 'success');
        });
    }

    /* ============================================
       35. Uploads — leitura e compressão
       ============================================ */
    function readFileAsDataURL(file) {
        return new Promise((res, rej) => {
            const r = new FileReader();
            r.onload = () => res(r.result);
            r.onerror = rej;
            r.readAsDataURL(file);
        });
    }

    // Reduz foto estática (não usar em GIF animado!)
    function downscaleImage(file, maxDim, quality) {
        return new Promise((res, rej) => {
            const url = URL.createObjectURL(file);
            const img = new Image();
            img.onload = () => {
                try {
                    let w = img.width;
                    let h = img.height;
                    const scale = Math.min(1, maxDim / Math.max(w, h));
                    w = Math.max(1, Math.round(w * scale));
                    h = Math.max(1, Math.round(h * scale));
                    const cv = document.createElement('canvas');
                    cv.width = w;
                    cv.height = h;
                    cv.getContext('2d').drawImage(img, 0, 0, w, h);
                    URL.revokeObjectURL(url);
                    res(cv.toDataURL('image/jpeg', quality || 0.82));
                } catch (e) {
                    URL.revokeObjectURL(url);
                    rej(e);
                }
            };
            img.onerror = () => {
                URL.revokeObjectURL(url);
                rej(new Error('img'));
            };
            img.src = url;
        });
    }

    // Salva perfil sem falhar em silêncio (remove GIF se estourar a cota)
    function saveProfileSafe(pf) {
        const s = getSession();
        if (!s) return 'fail';
        const k = 'gc_profile_' + s.username;
        try {
            store.set(k, pf);
            return 'ok';
        } catch (e) {
            if (pf.gifAvatar) {
                pf.gifAvatar = '';
                try {
                    store.set(k, pf);
                    return 'no-gif';
                } catch (e2) { /* ignore */ }
            }
            return 'fail';
        }
    }

    /* ============================================
       35. Chat global + grupos
       ============================================ */
    const CHAT_BOT_NAMES = ['Vivi', 'Kaito', 'Bia', 'Rafa', 'Nico', 'Leo', 'Mia', 'Luna'];
    const CHAT_BOT_TEXTS = [
        'alguém on pra ranked agora?',
        'GG demais a última partida',
        'que horas vocês costumam jogar?',
        'bora fechar squad? falta 1',
        'alguém clipou aquela play??',
        'to online, me chamem',
        'qual rank vocês tão essa season?',
        'alguém pra casual sem stress?',
        'acabei de sair de uma partida insana',
        'quem joga de suporte aqui?',
    ];
    let globalTimer = null;
    let globalOnline = 0;
    let activeGroupId = null;

    function getGlobalMsgs() { return store.get('gc_global_v1', []); }
    function saveGlobalMsgs(m) { store.set('gc_global_v1', m.slice(-120)); }
    function getGroups() { return store.get('gc_groups_v1', []); }
    function saveGroups(g) { store.set('gc_groups_v1', g); }

    function seedGlobal() {
        if (getGlobalMsgs().length) return;
        const now = Date.now();
        saveGlobalMsgs([
            { id: 'seed-g1', user: 'Vivi', text: 'Bem-vindos ao chat global! Apresentem-se', at: now - 3600000 },
            { id: 'seed-g2', user: 'Rafa', text: 'Salve! Jogo CoD e Valorant, me chamem', at: now - 3000000 },
            { id: 'seed-g3', user: 'Bia', text: 'Alguém pro Fortnite agora?', at: now - 2400000 },
            { id: 'seed-g4', user: 'Nico', text: 'Servidor de Minecraft aberto pra galera', at: now - 1200000 },
        ]);
    }

    function genGroupCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let c = 'GC-';
        for (let i = 0; i < 6; i++) c += chars[Math.floor(Math.random() * chars.length)];
        return c;
    }

    // Amigos mútuos: eu sigo + me segue (só contas reais)
    function mutualFriends() {
        const s = getSession();
        if (!s) return [];
        const follows = getFollows().filter((k) => k.indexOf('u:') === 0).map((k) => k.slice(2));
        const followerSet = new Set();
        getFollowerList().forEach((f) => {
            if (f.key.indexOf('u:') === 0) followerSet.add(f.key.slice(2));
        });
        return follows.filter((u) => followerSet.has(u) && u !== s.username).map((username) => {
            const usr = getUsers().find((x) => x.username === username);
            return usr ? { username, name: usr.name.split(' ')[0], avatar: avatarOf(username) } : null;
        }).filter(Boolean);
    }

    function myGroups() {
        const s = getSession();
        if (!s) return [];
        return getGroups().filter((g) => g.members.includes(s.username));
    }

    /* --- Global --- */
    function renderGlobal() {
        const box = $('#globalMessages');
        if (!box) return;
        const me = getSession();
        const myName = me ? me.username : '';
        const msgs = getGlobalMsgs();
        box.innerHTML = msgs.map((m) => {
            if (m.sys) return `<div class="conv-sys">${esc(m.text)}</div>`;
            const mine = m.user === myName;
            return `<div class="conv-msg ${mine ? 'me' : 'them'}"><div class="conv-head"><img src="${esc(msgAvatarOf(m.user))}" alt="" loading="lazy"><span class="conv-who">$${esc(m.user)}</span></div><div class="bubble ${mine ? 'me' : 'them'}">${esc(m.text)}<span class="bubble-time">${fmtTime(m.at)}</span></div></div>`;
        }).join('');
        box.scrollTop = box.scrollHeight;
        if (!globalOnline) globalOnline = 120 + Math.floor(Math.random() * 60);
        globalOnline = Math.max(90, globalOnline + Math.floor(Math.random() * 7) - 3);
        $('#globalMeta').textContent = `${globalOnline} gamers online`;
    }

    function sendGlobal(e) {
        e.preventDefault();
        const input = $('#globalInput');
        const text = input.value.trim().slice(0, 500);
        if (!text) return;
        const me = getSession();
        const all = getGlobalMsgs();
        all.push({ user: me ? me.username : 'Você', text, at: Date.now() });
        saveGlobalMsgs(all);
        input.value = '';
        renderGlobal();
    }

    function startGlobalBots() {
        stopGlobalBots();
        seedGlobal();
        renderGlobal();
        globalTimer = setInterval(() => {
            if ($('#tab-chat').hidden) return;
            if (Math.random() < 0.4) return;
            const all = getGlobalMsgs();
            all.push({
                user: CHAT_BOT_NAMES[Math.floor(Math.random() * CHAT_BOT_NAMES.length)],
                text: CHAT_BOT_TEXTS[Math.floor(Math.random() * CHAT_BOT_TEXTS.length)],
                at: Date.now(),
            });
            saveGlobalMsgs(all);
            const paneHidden = $('#chatGlobalPane').hidden;
            renderGlobal();
            $('#chatGlobalPane').hidden = paneHidden;
        }, 22000);
    }

    function stopGlobalBots() {
        if (globalTimer) {
            clearInterval(globalTimer);
            globalTimer = null;
        }
    }

    /* --- Grupos --- */
    function renderChatHome() {
        renderGlobal();
        renderGroups();
    }

    function renderGroups() {
        const grid = $('#groupsGrid');
        if (!grid) return;
        const groups = myGroups();
        const me = getSession();
        if (!groups.length) {
            grid.innerHTML = '<p class="groups-empty">Você ainda não tem grupos.<br>Crie um com seus amigos mútuos ou entre com um código.</p>';
            return;
        }
        grid.innerHTML = groups.map((g) => {
            const last = g.messages.length ? g.messages[g.messages.length - 1] : null;
            const preview = !last ? 'Grupo criado. Diga oi!' : (last.sys ? last.text : `${last.user}: ${last.text}`);
            return `<button type="button" class="group-card" data-group="${g.id}">
                <h4>${esc(g.name)}</h4>
                <span class="group-meta">${g.members.length} membro${g.members.length === 1 ? '' : 's'} • ${esc(g.code)}</span>
                <span class="group-last">${esc(preview)}</span>
            </button>`;
        }).join('');
        grid.querySelectorAll('[data-group]').forEach((b) => {
            b.addEventListener('click', () => openGroup(b.dataset.group));
        });
    }

    function openGroup(id) {
        const g = getGroups().find((x) => x.id === id);
        if (!g) return;
        const me = getSession();
        if (!me || !g.members.includes(me.username)) {
            showToast('Você não está neste grupo.', 'error');
            return;
        }
        activeGroupId = id;
        $('#groupsList').hidden = true;
        $('#groupView').hidden = false;
        $('#groupTitle').textContent = g.name;
        $('#groupMeta').textContent = `${g.members.length} membros`;
        $('#groupCode').textContent = g.code;
        const mine = me.username === g.owner;
        $('#regenCodeBtn').hidden = !mine;
        $('#groupDelete').hidden = !mine;
        $('#groupMembers').innerHTML = g.members.map((u) => `
            <span class="member-chip${u === g.owner ? ' owner' : ''}"><img src="${esc(avatarOf(u))}" alt="">${esc(u)}${u === g.owner ? ' ★' : ''}</span>`).join('');
        renderGroupMessages();
    }

    function renderGroupMessages() {
        const box = $('#groupMessages');
        if (!box || !activeGroupId) return;
        const g = getGroups().find((x) => x.id === activeGroupId);
        if (!g) return;
        const me = getSession();
        const myName = me ? me.username : '';
        box.innerHTML = g.messages.map((m) => {
            if (m.sys) return `<div class="conv-sys">${esc(m.text)}</div>`;
            const mine = m.user === myName;
            return `<div class="conv-msg ${mine ? 'me' : 'them'}"><div class="conv-head"><img src="${esc(msgAvatarOf(m.user))}" alt="" loading="lazy"><span class="conv-who">$${esc(m.user)}</span></div><div class="bubble ${mine ? 'me' : 'them'}">${esc(m.text)}<span class="bubble-time">${fmtTime(m.at)}</span></div></div>`;
        }).join('');
        box.scrollTop = box.scrollHeight;
    }

    function sendGroupMessage(e) {
        e.preventDefault();
        if (!activeGroupId) return;
        const input = $('#groupInput');
        const text = input.value.trim().slice(0, 500);
        if (!text) return;
        const me = getSession();
        const groups = getGroups();
        const g = groups.find((x) => x.id === activeGroupId);
        if (!g) return;
        g.messages.push({ user: me.username, text, at: Date.now() });
        saveGroups(groups);
        input.value = '';
        renderGroupMessages();
    }

    function leaveGroupView() {
        activeGroupId = null;
        $('#groupView').hidden = true;
        $('#groupsList').hidden = false;
        renderGroups();
    }

    function initChat() {
        if (!$('#globalMessages')) return;
        seedGlobal();

        $$('#chatSegs .pill').forEach((b) => {
            b.addEventListener('click', () => {
                $$('#chatSegs .pill').forEach((x) => x.classList.remove('active'));
                b.classList.add('active');
                const groups = b.dataset.cseg === 'groups';
                $('#chatGlobalPane').hidden = groups;
                $('#chatGroupsPane').hidden = !groups;
                if (groups) {
                    leaveGroupView();
                } else {
                    renderGlobal();
                }
            });
        });

        $('#globalForm').addEventListener('submit', sendGlobal);
        $('#groupForm').addEventListener('submit', sendGroupMessage);
        $('#groupBack').addEventListener('click', leaveGroupView);

        $('#newGroupBtn').addEventListener('click', () => {
            const mutuals = mutualFriends();
            const box = $('#mutualList');
            if (!mutuals.length) {
                box.innerHTML = '<p class="my-grid-empty">Sem amigos mútuos ainda.<br>Siga alguém e peça para seguir de volta.</p>';
            } else {
                box.innerHTML = mutuals.map((m) => `
                    <label class="mutual-row"><input type="checkbox" value="${esc(m.username)}">
                        <img src="${esc(m.avatar)}" alt="">
                        <div><strong>${esc(m.name)}</strong><span>$${esc(m.username)}</span></div>
                    </label>`).join('');
            }
            $('#groupName').value = '';
            openModal($('#groupModal'));
        });

        $('#groupFormCreate').addEventListener('submit', (e) => {
            e.preventDefault();
            const nameInput = $('#groupName');
            const name = nameInput.value.trim();
            const nameGroup = nameInput.closest('.form-group');
            if (name.length < 3) {
                nameGroup.classList.add('error');
                nameGroup.querySelector('.error-message').textContent = 'Nome com 3+ letras.';
                return;
            }
            nameGroup.classList.remove('error');
            nameGroup.querySelector('.error-message').textContent = '';
            const checked = $$('#mutualList input:checked').map((c) => c.value);
            $('#mutualError').textContent = '';
            const me = getSession();
            const groups = getGroups();
            const g = {
                id: 'g' + Date.now().toString(36),
                name,
                owner: me.username,
                members: [me.username, ...checked],
                code: genGroupCode(),
                messages: [{ sys: true, text: `${me.username} criou o grupo`, at: Date.now() }],
            };
            groups.unshift(g);
            saveGroups(groups);
            closeModal($('#groupModal'));
            renderGroups();
            openGroup(g.id);
            showToast(`Grupo "${name}" criado! Compartilhe o código ${g.code}.`, 'success');
        });

        $('#joinCodeBtn').addEventListener('click', () => {
            const input = $('#joinCodeInput');
            const code = input.value.trim().toUpperCase();
            if (!code) return;
            const g = getGroups().find((x) => x.code === code);
            if (!g) {
                showToast('Código não encontrado.', 'error');
                return;
            }
            const me = getSession();
            const groups = getGroups();
            const target = groups.find((x) => x.id === g.id);
            if (!target.members.includes(me.username)) {
                target.messages.push({ sys: true, text: `${me.username} entrou com o código`, at: Date.now() });
                target.members.push(me.username);
                saveGroups(groups);
                showToast(`Bem-vindo ao grupo "${target.name}"!`, 'success');
            }
            input.value = '';
            openGroup(target.id);
        });

        $('#copyCodeBtn').addEventListener('click', () => {
            const code = $('#groupCode').textContent;
            const done = () => showToast('Código copiado!', 'success');
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(code).then(done).catch(done);
            } else {
                done();
            }
        });

        $('#regenCodeBtn').addEventListener('click', () => {
            if (!activeGroupId) return;
            const groups = getGroups();
            const g = groups.find((x) => x.id === activeGroupId);
            if (!g) return;
            const me = getSession();
            if (g.owner !== me.username) return;
            g.code = genGroupCode();
            g.messages.push({ sys: true, text: 'Novo código de convite gerado', at: Date.now() });
            saveGroups(groups);
            $('#groupCode').textContent = g.code;
            renderGroupMessages();
            showToast(`Novo código: ${g.code}`, 'success');
        });

        $('#groupLeave').addEventListener('click', () => {
            if (!activeGroupId) return;
            const me = getSession();
            let groups = getGroups();
            const g = groups.find((x) => x.id === activeGroupId);
            if (!g) return;
            g.members = g.members.filter((u) => u !== me.username);
            if (!g.members.length) {
                groups = groups.filter((x) => x.id !== g.id);
                saveGroups(groups);
                showToast('Grupo excluído (vazio).', 'info');
            } else {
                if (g.owner === me.username) {
                    g.owner = g.members[0];
                    g.messages.push({ sys: true, text: `${g.owner} agora é o dono`, at: Date.now() });
                }
                g.messages.push({ sys: true, text: `${me.username} saiu do grupo`, at: Date.now() });
                saveGroups(groups);
                showToast('Você saiu do grupo.', 'info');
            }
            leaveGroupView();
        });

        $('#groupDelete').addEventListener('click', () => {
            if (!activeGroupId) return;
            const groups = getGroups().filter((x) => x.id !== activeGroupId);
            saveGroups(groups);
            showToast('Grupo excluído.', 'info');
            leaveGroupView();
        });

        renderChatHome();
    }

    /* ============================================
       36. Supabase — nuvem (mídia)
       ============================================ */
    let supa = null;
    let supaTried = false;

    function supaClient() {
        if (supaTried) return supa;
        supaTried = true;
        console.log('[GC] supaClient: window.supabase =', !!window.supabase, 'GC_SUPABASE_URL =', !!window.GC_SUPABASE_URL, 'GC_SUPABASE_KEY =', !!window.GC_SUPABASE_KEY);
        try {
            if (window.supabase && window.GC_SUPABASE_URL && window.GC_SUPABASE_KEY && window.GC_SUPABASE_URL.indexOf('http') === 0) {
                supa = window.supabase.createClient(window.GC_SUPABASE_URL, window.GC_SUPABASE_KEY);
            }
        } catch (e) { supa = null; }
        console.log('[GC] supaClient created =', !!supa);
        return supa;
    }

    // Sobe o arquivo para o Storage; se offline/sem bucket, devolve dataURL local
    async function uploadMedia(file, folder) {
        const client = supaClient();
        if (client && file) {
            try {
                const base = ((file.name || 'file').replace(/[^a-zA-Z0-9.\-_]/g, '_').slice(-40)) || 'file';
                const ext = base.includes('.') ? base.split('.').pop().toLowerCase().slice(0, 5) : 'bin';
                const key = `${folder}/${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
                const { error } = await client.storage.from('media').upload(key, file, {
                    contentType: file.type || 'application/octet-stream',
                    upsert: false,
                });
                if (!error) {
                    const { data } = client.storage.from('media').getPublicUrl(key);
                    if (data && data.publicUrl) {
                        console.info('[GC] mídia na nuvem:', data.publicUrl);
                        return { url: data.publicUrl };
                    }
                }
            } catch (e) { /* cai para o modo local */ }
        }
        console.warn('[GC] Storage indisponível, salvando mídia local.');
        return { dataUrl: await readFileAsDataURL(file) };
    }

    /* ============================================
       37. Supabase — usuários (cadastro/login)
       ============================================ */
    async function hashPassword(pw) {
        const salted = 'gamerconnections::' + pw;
        try {
            if (window.crypto && crypto.subtle) {
                const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(salted));
                return 'sha256$' + Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
            }
        } catch (e) { /* cai para o fallback */ }
        let h1 = 0xdeadbeef;
        let h2 = 0x41c6ce57;
        for (let i = 0; i < salted.length; i++) {
            const ch = salted.charCodeAt(i);
            h1 = Math.imul(h1 ^ ch, 2654435761);
            h2 = Math.imul(h2 ^ ch, 1597334677);
        }
        h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
        h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
        return 'cyrb$' + (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
    }

    function toLocalUser(row) {
        if (!row) return null;
        return {
            name: row.name,
            username: row.username,
            email: row.email,
            birthdate: row.birthdate || '',
            passwordHash: row.password_hash || null,
            gender: row.gender || '',
            lookingFor: row.looking_for || 'both',
            intents: row.intents || [],
            avatar: row.avatar || 'assets/avatars/avatar1.svg?v=2',
            photo: row.photo || '',
            gifAvatar: row.gif_avatar || '',
            banner: row.banner || null,
            theme: (typeof row.theme === 'number') ? row.theme : 0,
            bgImg: row.bg_img || '',
            nameColor: row.name_color || '',
            nameFont: row.name_font || '',
            badgeColor: row.badge_color || '',
            bio: row.bio || '',
            hobbies: row.hobbies || [],
            games: row.games || [],
            createdAt: row.created_at || new Date().toISOString(),
            cloud: true,
        };
    }

    async function cloudGetUser(id) {
        const client = supaClient();
        console.log('[GC] cloudGetUser called, client =', !!client);
        if (!client || !id) return null;
        try {
            const safe = String(id).replace(/[,()]/g, '').replace(/([%_\\])/g, '\\$1');
            const { data, error } = await client
                .from('profiles')
                .select('*')
                .or(`username.ilike.${safe},email.eq.${safe.toLowerCase()}`)
                .limit(1)
                .maybeSingle();
            if (error || !data) return null;
            return data;
        } catch (e) { return null; }
    }

    async function cloudCreateUser(u) {
        const client = supaClient();
        console.log('[GC] cloudCreateUser called, client =', !!client);
        if (!client) return { ok: false, offline: true };
        try {
            const { error } = await client.from('profiles').insert({
                username: u.username,
                name: u.name,
                email: u.email,
                birthdate: u.birthdate || null,
                avatar: u.avatar || null,
                password_hash: u.passwordHash,
                gender: u.gender || null,
                looking_for: u.lookingFor || null,
                intents: u.intents || [],
            });
            if (error) return { ok: false, error };
            return { ok: true };
        } catch (e) { return { ok: false, error: e }; }
    }

    /* Diagnóstico: rode GC_diag() no console (F12) */
    async function diagCloud() {
        const out = {
            config: !!(window.GC_SUPABASE_URL && window.GC_SUPABASE_KEY),
            sdk: !!window.supabase,
            client: !!supaClient(),
            table: 'não testada',
        };
        const c = supaClient();
        if (c) {
            try {
                const { error } = await c.from('profiles').select('username', { count: 'exact', head: true });
                out.table = error ? ('ERRO ' + (error.code || '?') + ' ' + (error.message || '')) : 'OK';
            } catch (e) { out.table = 'EXCEÇÃO ' + (e.message || e); }
            try {
                const { error: serr } = await c.storage.from('media').list('', { limit: 1 });
                out.storage = serr ? ('ERRO ' + (serr.message || '')) : 'OK';
            } catch (e) { out.storage = 'EXCEÇÃO ' + (e.message || e); }
        }
        console.info('[GC] diagnóstico nuvem:', out);
        return out;
    }
    window.GC_diag = diagCloud;

    /* ============================================
       38. Social — bloqueio
       ============================================ */
    function getBlocked() {
        const s = getSession();
        return s ? store.get('gc_blocked_' + s.username, []) : [];
    }
    function saveBlocked(b) {
        const s = getSession();
        if (s) store.set('gc_blocked_' + s.username, b);
    }
    function toggleBlock(entry) {
        let arr = getBlocked();
        const has = arr.some((x) => x.key === entry.key);
        arr = has ? arr.filter((x) => x.key !== entry.key) : [...arr, { key: entry.key, name: entry.name }];
        saveBlocked(arr);
        return !has;
    }
    function blockedSet() {
        const set = new Set();
        getBlocked().forEach((b) => {
            set.add(b.key);
            if (b.name) set.add(b.name);
        });
        return set;
    }
    function getHiddenPosts() {
        const s = getSession();
        return s ? store.get('gc_hidden_' + s.username, []) : [];
    }
    function renderBlockedList() {
        const box = $('#blockedList');
        if (!box) return;
        const arr = getBlocked();
        box.innerHTML = arr.length ? '<p class="blocked-title">Contas bloqueadas</p>' + arr.map((b) => `
            <div class="follow-row"><span class="comment-ava">${esc((b.name || '?').charAt(0).toUpperCase())}</span>
            <div><strong>${esc(b.name || b.key)}</strong><span>bloqueado</span></div>
            <button type="button" class="follow-btn" data-unblock="${esc(b.key)}">Desbloquear</button></div>`).join('') : '';
        box.querySelectorAll('[data-unblock]').forEach((btn) => {
            btn.addEventListener('click', () => {
                saveBlocked(getBlocked().filter((x) => x.key !== btn.dataset.unblock));
                renderBlockedList();
                renderFeed();
                renderDeck();
                showToast('Usuário desbloqueado.', 'success');
            });
        });
    }

    /* ============================================
       39. Social — hashtags (#entrega)
       ============================================ */
    let feedTag = null;
    function fmtCaption(text) {
        return esc(text).replace(/#([\p{L}\p{N}_]+)/gu, '<button type="button" class="hashtag" data-tag="$1">#$1</button>');
    }
    function postHasTag(p, tag) {
        try {
            const safe = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            return new RegExp('#' + safe + '(?![\\p{L}\\p{N}_])', 'iu').test(p.caption || '');
        } catch (e) { return false; }
    }
    function setTagFilter(tag) {
        feedTag = tag;
        const bar = $('#tagBar');
        if (bar) {
            bar.hidden = false;
            $('#tagName').textContent = '#' + tag;
        }
        renderFeed();
    }
    function clearTagFilter() {
        feedTag = null;
        const bar = $('#tagBar');
        if (bar) bar.hidden = true;
        renderFeed();
    }

    /* ============================================
       40. Social — comentários
       ============================================ */
    function getComments() { return store.get('gc_comments_v1', {}); }
    function saveComments(c) { store.set('gc_comments_v1', c); }
    function seedComments() {
        const all = getComments();
        if (!all.sp1) {
            all.sp1 = [{ id: 'seed-sp1-1', user: 'Bia', text: 'Que mira é essa?! GG demais', at: Date.now() - 50 * 60000 }];
            all.sp4 = [
                { id: 'seed-sp4-1', user: 'Mia', text: '3 semanas?? Eu não teria essa paciência', at: Date.now() - 300 * 60000 },
                { id: 'seed-sp4-2', user: 'Nico', text: 'Valeu! Passa o IP pra visitar', at: Date.now() - 200 * 60000 },
            ];
            saveComments(all);
        }
    }
    function commentCount(id) {
        const a = getComments()[id];
        return a ? a.length : 0;
    }
    let activeCommentsPost = null;
    function commenterAvatar(name) {
        if (!name) return null;
        const p = PROFILES.find((x) => x.name === name);
        if (p) return p.avatar;
        const u = getUsers().find((x) => x.username === name);
        if (u) return avatarOf(name);
        return null;
    }
    function avatarOrInitial(name) {
        const src = commenterAvatar(name);
        if (src) return `<img class="comment-img" src="${esc(src)}" alt="" loading="lazy">`;
        return `<span class="comment-ava">${esc(String(name || '?').charAt(0).toUpperCase())}</span>`;
    }
    function openComments(postId) {
        activeCommentsPost = postId;
        renderComments();
        const input = $('#commentInput');
        if (input) input.value = '';
        openModal($('#commentsModal'));
    }
    function renderComments() {
        const box = $('#commentsList');
        if (!box || !activeCommentsPost) return;
        const arr = getComments()[activeCommentsPost] || [];
        const t = $('#commentsTitle');
        if (t) t.textContent = 'Comentários' + (arr.length ? ` (${arr.length})` : '');
        box.innerHTML = arr.length ? arr.map((c) => `
            <div class="comment-row">
                ${avatarOrInitial(c.user)}
                <div class="comment-body"><strong>${esc(c.user)}</strong><p>${esc(c.text)}</p><span>${fmtAgo(c.at)}</span></div>
            </div>`).join('') : '<p class="my-grid-empty">Seja o primeiro a comentar.</p>';
        box.scrollTop = box.scrollHeight;
    }
    function initComments() {
        const form = $('#commentForm');
        if (!form) return;
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const input = $('#commentInput');
            const text = input.value.trim().slice(0, 200);
            if (!text || !activeCommentsPost) return;
            const me = currentUser();
            const all = getComments();
            const arr = all[activeCommentsPost] || [];
            arr.push({ user: me ? me.username : '?', text, at: Date.now() });
            all[activeCommentsPost] = arr;
            saveComments(all);
            input.value = '';
            renderComments();
            renderFeed();
        });
    }

    /* ============================================
       41. Social — busca de usuários (sugestões ao vivo)
       ============================================ */
    const cloudUserCache = {};
    async function cloudSearchUsers(q, s, have) {
        const client = supaClient();
        if (!client || q.length < 2) return [];
        try {
            const safe = q.replace(/[,()'\"%_\\]/g, '');
            if (!safe) return [];
            const { data, error } = await client.from('profiles').select('username,name,avatar').or(`username.ilike.%${safe}%,name.ilike.%${safe}%`).limit(6);
            if (error || !data) return [];
            const out = [];
            data.forEach((r) => {
                if (!r || !r.username) return;
                const key = String(r.username).toLowerCase();
                if (s && key === s.username.toLowerCase()) return;
                if (have.has(key)) return;
                have.add(key);
                cloudUserCache[key] = { username: r.username, name: r.name || r.username, avatar: r.avatar || 'assets/avatars/avatar1.svg?v=2' };
                out.push(cloudUserCache[key]);
            });
            return out;
        } catch (e) { return []; }
    }
    function initSearch() {
        const input = $('#userSearch');
        const box = $('#searchResults');
        if (!input || !box) return;
        const hide = () => {
            box.hidden = true;
            box.innerHTML = '';
        };
        input.addEventListener('input', () => {
            const raw = input.value.trim();
            const userOnly = raw.charAt(0) === '$';
            const q = (userOnly ? raw.slice(1) : raw).toLowerCase();
            if (!q) {
                hide();
                return;
            }
            const s = getSession();
            const seeds = PROFILES.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 4);
            const users = getUsers().filter((u) => {
                if (s && u.username === s.username) return false;
                return u.username.toLowerCase().includes(q) || u.name.toLowerCase().includes(q);
            }).slice(0, 4);
            let posts = [];
            if (!userOnly) {
                posts = feedItems().filter((p) => {
                    const cap = (p.caption || '').toLowerCase();
                    const gm = (p.game || '').toLowerCase();
                    return cap.includes(q) || gm.includes(q);
                }).slice(0, 4);
            }
            if (!seeds.length && !users.length && !posts.length) {
                box.innerHTML = `<p class="search-none">Nada encontrado para "${esc(raw)}".</p>`;
            } else {
                let html = '';
                if (seeds.length || users.length) {
                    html += '<p class="search-sec">Pessoas</p>';
                    html += seeds.map((p) => `<button type="button" class="search-row" data-sseed="${p.id}"><img src="${p.avatar}" alt=""><div><strong>${esc(p.name)}</strong><span>${esc(p.rank)}</span></div><span class="search-go">Ver</span></button>`).join('');
                    html += users.map((u) => `<button type="button" class="search-row" data-suser="${esc(u.username)}"><img src="${esc(avatarOf(u.username))}" alt=""><div><strong>${esc(u.name.split(' ')[0])}</strong><span>$${esc(u.username)}</span></div><span class="search-go">Ver</span></button>`).join('');
                }
                if (posts.length) {
                    html += '<p class="search-sec">Publicações</p>';
                    html += posts.map((p) => {
                        const a = resolveAuthor(p);
                        const thumb = p.type === 'video'
                            ? '<span class="search-thumb video">▶</span>'
                            : `<img class="search-thumb" src="${p.src}" alt="" loading="lazy">`;
                        const cap = (p.caption || '').trim();
                        return `<button type="button" class="search-row" data-spost="${p.id}">${thumb}<div><strong>${esc(cap ? cap.slice(0, 42) + (cap.length > 42 ? '…' : '') : p.game)}</strong><span>${esc(a.name)} • ${esc(p.game)}</span></div><span class="search-go">Abrir</span></button>`;
                    }).join('');
                }
                box.innerHTML = html;
            }
            box.hidden = false;
            box.querySelectorAll('[data-sseed]').forEach((b) => b.addEventListener('click', () => {
                hide();
                input.value = '';
                openPerson(b.dataset.sseed);
            }));
            box.querySelectorAll('[data-suser]').forEach((b) => b.addEventListener('click', () => {
                hide();
                input.value = '';
                openUserCard(b.dataset.suser);
            }));
            box.querySelectorAll('[data-spost]').forEach((b) => b.addEventListener('click', () => {
                const id = b.dataset.spost;
                hide();
                input.value = '';
                openLight(id);
            }));
            box.querySelectorAll('img.search-thumb').forEach((img) => {
                img.addEventListener('error', () => {
                    const t = document.createElement('span');
                    t.className = 'search-thumb video';
                    t.textContent = '▶';
                    img.replaceWith(t);
                }, { once: true });
            });
        });
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-wrap')) hide();
        });
    }

    /* ============================================
       42. Social — denúncias
       ============================================ */
    let reportTarget = null;
    function openReport(kind, id) {
        reportTarget = { kind, id };
        const f = $('#reportForm');
        if (f) f.reset();
        openModal($('#reportModal'));
    }
    function initReport() {
        const form = $('#reportForm');
        if (!form) return;
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            if (!reportTarget) return;
            const checked = form.querySelector('input[name="reason"]:checked');
            const reason = (checked && checked.value) || 'Outro';
            const details = $('#reportDetails').value.trim().slice(0, 200);
            const s = getSession();
            const all = store.get('gc_reports_v1', []);
            all.push({ ...reportTarget, reason, details, by: s ? s.username : '?', at: Date.now() });
            store.set('gc_reports_v1', all);
            if (reportTarget.kind === 'post' && s) {
                const hk = 'gc_hidden_' + s.username;
                const arr = store.get(hk, []);
                if (!arr.includes(reportTarget.id)) arr.push(reportTarget.id);
                store.set(hk, arr);
            }
            closeModal($('#reportModal'));
            reportTarget = null;
            renderFeed();
            showToast('Denúncia enviada. Nossa moderação vai analisar.', 'success');
        });
    }

    /* ============================================
       43. Social — amizade (adicionar + mensagem)
       ============================================ */
    function sendRequest(to) {
        const me = getSession();
        if (!me || to === me.username) return false;
        const arr = store.get('gc_requests_' + to, []);
        if (arr.some((r) => r.from === me.username)) return false;
        arr.push({ from: me.username, at: Date.now() });
        store.set('gc_requests_' + to, arr);
        syncRequests(to, arr);
        showToast('Solicitação de amizade enviada!', 'success');
        return true;
    }
    function getMyRequests() {
        const me = getSession();
        if (!me) return [];
        return store.get('gc_requests_' + me.username, []);
    }
    function removeRequest(from) {
        const me = getSession();
        if (!me) return;
        const arr = getMyRequests().filter((r) => r.from !== from);
        store.set('gc_requests_' + me.username, arr);
        syncRequests(me.username, arr);
    }
    async function syncRequests(user, arr) {
        const client = supaClient();
        if (!client || !Array.isArray(arr)) return;
        try {
            await client.from('friend_requests').delete().eq('to_username', user);
            if (arr.length) await client.from('friend_requests').insert(arr.map((r) => ({ to_username: user, from_username: r.from })));
        } catch (e) { /* ignore */ }
    }

    /* ============================================
       44. Social — mural do perfil
       ============================================ */
    let pmWallUser = null;
    function getWall(u) {
        return store.get('gc_wall_' + u, []);
    }
    function pushWall(u, from, text) {
        const arr = getWall(u);
        arr.push({ user: from, text, at: Date.now() });
        store.set('gc_wall_' + u, arr.slice(-50));
    }
    function wallRow(c, canDel) {
        return `<div class="comment-row">${avatarOrInitial(c.user)}<div class="comment-body"><strong>${esc(c.user)}</strong><p>${esc(c.text)}</p><span>${fmtAgo(c.at)}</span></div>${canDel ? `<button type="button" class="wall-del" data-walldel="${c.at}">excluir</button>` : ''}</div>`;
    }
    function renderPmWall() {
        const box = $('#pmWall');
        if (!box || !pmWallUser) return;
        const arr = getWall(pmWallUser);
        box.innerHTML = arr.length ? arr.slice(-5).reverse().map((c) => wallRow(c, false)).join('') : '<p class="my-grid-empty">Nenhum recado ainda. Seja o primeiro!</p>';
    }
    function renderMyWall() {
        const box = $('#myWall');
        if (!box) return;
        const me = getSession();
        if (!me) return;
        const arr = getWall(me.username);
        const wc = $('#wallCount');
        if (wc) wc.textContent = arr.length ? `(${arr.length})` : '';
        box.innerHTML = arr.length ? arr.slice().reverse().map((c) => wallRow(c, true)).join('') : '<p class="my-grid-empty">Nenhum recado no seu mural ainda.</p>';
        box.querySelectorAll('[data-walldel]').forEach((b) => {
            b.addEventListener('click', () => {
                const filtered = getWall(me.username).filter((x) => x.at !== parseInt(b.dataset.walldel, 10));
                store.set('gc_wall_' + me.username, filtered);
                renderMyWall();
            });
        });
    }

    /* Troca de username com migração total de dados */
    async function renameUser(oldU, newU) {
        const users = getUsers();
        const idx = users.findIndex((x) => x.username === oldU);
        if (idx === -1) return false;
        users[idx].username = newU;
        saveUsers(users);
        setSession(newU);
        // Migra chaves do store (localStorage wrapper)
        const move = ['posts', 'follows', 'followers', 'medals', 'medal_dates', 'dogtags', 'equip', 'profile', 'hl', 'wall', 'hidden', 'postlikes', 'superlike', 'app', 'requests', 'beta', 'blocked', 'founder', 'badgecolor'];
        move.forEach((suf) => {
            const k = 'gc_' + suf + '_' + oldU;
            const v = store.get(k, null);
            if (v !== null) {
                store.set('gc_' + suf + '_' + newU, v);
                store.remove(k);
            }
        });
        // Atualiza referências cruzadas no store
        const allKeys = Object.keys(localStorage);
        allKeys.forEach((k) => {
            try {
                if (k.indexOf('gc_follows_') === 0) {
                    const arr = store.get(k, []);
                    store.set(k, arr.map((x) => (x === 'u:' + oldU ? 'u:' + newU : x)));
                } else if (k.indexOf('gc_blocked_') === 0) {
                    const arr = store.get(k, []);
                    arr.forEach((o) => {
                        if (o.key === 'u:' + oldU) { o.key = 'u:' + newU; o.name = newU; }
                    });
                    store.set(k, arr);
                } else if (k === 'gc_comments_v1' || k === 'gc_global_v1') {
                    const val = store.get(k, null);
                    let changed = false;
                    const fix = (m) => { if (m && m.user === oldU) { m.user = newU; changed = true; } };
                    if (Array.isArray(val)) val.forEach(fix);
                    else if (val) Object.keys(val).forEach((kk) => ((val[kk] || []).forEach(fix)));
                    if (changed) store.set(k, val);
                } else if (k === 'gc_groups_v1') {
                    const arr = store.get(k, []);
                    arr.forEach((g) => {
                        g.members = (g.members || []).map((m) => (m === oldU ? newU : m));
                        if (g.owner === oldU) g.owner = newU;
                        (g.messages || []).forEach((m) => { if (m.user === oldU) m.user = newU; });
                    });
                    store.set(k, arr);
                } else if (k.indexOf('gc_requests_') === 0) {
                    const arr = store.get(k, []);
                    arr.forEach((r) => { if (r.from === oldU) r.from = newU; });
                    store.set(k, arr);
                } else if (k.indexOf('gc_app_') === 0 && k !== 'gc_app_' + newU) {
                    const st = store.get(k, null);
                    if (st && st.matches) {
                        st.matches.forEach((m) => { if (m.id === 'u:' + oldU) m.id = 'u:' + newU; });
                        store.set(k, st);
                    }
                } else if (k === 'gc_reports_v1') {
                    const arr = store.get(k, []);
                    arr.forEach((r) => { if (r.by === oldU) r.by = newU; });
                    store.set(k, arr);
                }
            } catch (e) { /* ignora chave problemática */ }
        });
        // Sync Supabase
        const client = supaClient();
        if (client) {
            try {
                await client.from('profiles').update({ username: newU }).eq('username', oldU);
                // Atualiza FKs em outras tabelas (best effort)
                await Promise.allSettled([
                    client.from('posts').update({ author_username: newU }).eq('author_username', oldU),
                    client.from('comments').update({ username: newU }).eq('username', oldU),
                    client.from('follows').update({ follower: newU }).eq('follower', oldU),
                    client.from('follows').update({ following: newU }).eq('following', 'u:' + oldU),
                    client.from('blocked').update({ username: newU }).eq('username', oldU),
                    client.from('blocked').update({ blocked_key: 'u:' + newU }).eq('blocked_key', 'u:' + oldU),
                    client.from('chat_messages').update({ username: newU }).eq('username', oldU),
                    client.from('groups').update({ owner: newU }).eq('owner', oldU),
                    client.from('groups').update({ members: newU }).contains('members', [oldU]), // aproximação
                    client.from('friend_requests').update({ from_username: newU }).eq('from_username', oldU),
                    client.from('friend_requests').update({ to_username: newU }).eq('to_username', oldU),
                    client.from('wall').update({ profile_username: newU }).eq('profile_username', oldU),
                    client.from('wall').update({ from_username: newU }).eq('from_username', oldU),
                    client.from('dogtags_owned').update({ username: newU }).eq('username', oldU),
                    client.from('highlights').update({ username: newU }).eq('username', oldU),
                    client.from('medals_equipped').update({ username: newU }).eq('username', oldU),
                    client.from('medal_dates').update({ username: newU }).eq('username', oldU),
                    client.from('subscriptions').update({ username: newU }).eq('username', oldU),
                    client.from('app_state').update({ username: newU }).eq('username', oldU),
                    client.from('matches').update({ owner_username: newU }).eq('owner_username', oldU),
                ]);
            } catch (e) { /* segue local */ }
        }
        return true;
    }

    /* ============================================
       45. Admin — medalhas, tags e usuários (OWNER)
       ============================================ */
    function getCustomMedals() {
        return store.get('gc_custom_medals', []);
    }
    function saveCustomMedals(a) {
        store.set('gc_custom_medals', a);
    }
    function evalCustomRule(m) {
        if (m.rule === 'posts') return myPosts().length >= (m.n || 1);
        if (m.rule === 'followers') return getFollowerList().length >= (m.n || 1);
        if (m.rule === 'matches') {
            const st = getAppState();
            return st ? st.matches.length >= (m.n || 1) : false;
        }
        if (m.rule === 'vip') return isVipUser();
        if (m.rule === 'elite') return isEliteUser();
        return true;
    }
    function ruleLabel(m) {
        if (m.rule === 'posts') return `Publicar ${m.n} post${m.n === 1 ? '' : 's'}`;
        if (m.rule === 'followers') return `Ter ${m.n} seguidor${m.n === 1 ? '' : 'es'}`;
        if (m.rule === 'matches') return `Fazer ${m.n} match${m.n === 1 ? '' : 'es'}`;
        if (m.rule === 'vip') return 'Ser VIP';
        if (m.rule === 'elite') return 'Ser ELITE';
        return 'Disponível para todos';
    }
    function getBlockedTags() {
        return store.get('gc_blocked_tags', []);
    }
    function trendingTags() {
        const counts = {};
        try {
            const all = [...getAllUserPosts()];
            SEED_POSTS.forEach((p) => all.push(p));
            all.forEach((p) => {
                const re = /#([\p{L}\p{N}_]+)/gu;
                let m;
                while ((m = re.exec(p.caption || ''))) {
                    const t = m[1].toLowerCase();
                    counts[t] = (counts[t] || 0) + 1;
                }
            });
        } catch (e) { /* ignore */ }
        return Object.keys(counts).map((t) => ({ tag: t, n: counts[t] })).sort((a, b) => b.n - a.n).slice(0, 12);
    }
    function renderAdmin() {
        if (!$('#tab-admin') || $('#tab-admin').hidden) return;
        renderAdminMedals();
        renderAdminTags();
        renderAdminUsers();
    }
    function renderAdminMedals() {
        const box = $('#adminMedalList');
        if (!box) return;
        const customs = getCustomMedals();
        box.innerHTML = customs.length ? customs.map((m) => `
            <div class="follow-row"><img src="${esc(m.icon)}" alt=""><div><strong>${esc(m.name)}</strong><span>${esc(ruleLabel(m))}</span></div><button type="button" class="link-btn" data-delmedal="${m.id}">excluir</button></div>`).join('')
            : '<p class="my-grid-empty">Nenhuma medalha criada.</p>';
        box.querySelectorAll('[data-delmedal]').forEach((b) => {
            b.addEventListener('click', () => {
                saveCustomMedals(getCustomMedals().filter((m) => m.id !== b.dataset.delmedal));
                renderAdminMedals();
                renderMedals();
                showToast('Medalha excluída.', 'info');
            });
        });
        const form = $('#adminMedalForm');
        form.onsubmit = (e) => {
            e.preventDefault();
            const name = $('#medalName').value.trim().slice(0, 20);
            if (!name) {
                showToast('Dê um nome à medalha.', 'error');
                return;
            }
            const arr = getCustomMedals();
            arr.push({ id: 'c' + Date.now().toString(36), name, icon: $('#medalIcon').value, rule: $('#medalRule').value, n: parseInt($('#medalN').value, 10) || 1 });
            saveCustomMedals(arr);
            $('#medalName').value = '';
            renderAdminMedals();
            showToast('Medalha criada!', 'success');
        };
    }
    function renderAdminTags() {
        const box = $('#adminTags');
        if (!box) return;
        const blocked = getBlockedTags();
        const tags = trendingTags();
        box.innerHTML = tags.length ? tags.map((t) => `
            <div class="follow-row"><span class="comment-ava">#</span><div><strong>#${esc(t.tag)}</strong><span>${t.n} post${t.n === 1 ? '' : 's'}</span></div><button type="button" class="follow-btn" data-tagblock="${esc(t.tag)}">${blocked.includes(t.tag) ? 'Liberar' : 'Bloquear'}</button></div>`).join('')
            : '<p class="my-grid-empty">Nenhuma hashtag usada ainda.</p>';
        box.querySelectorAll('[data-tagblock]').forEach((b) => {
            b.addEventListener('click', () => {
                let arr = getBlockedTags();
                const t = b.dataset.tagblock;
                arr = arr.includes(t) ? arr.filter((x) => x !== t) : [...arr, t];
                store.set('gc_blocked_tags', arr);
                renderAdminTags();
                renderFeed();
            });
        });
    }
    function renderAdminUsers() {
        const box = $('#adminUsers');
        if (!box) return;
        const users = getUsers();
        const cnt = $('#adminUserCount');
        if (cnt) cnt.textContent = `(${users.length})`;
        const me = getSession();
        const allPosts = store.get('gc_posts_all', []);
        box.innerHTML = users.length ? users.map((u) => {
            const posts = allPosts.filter((p) => p.authorUsername === u.username).length;
            const isMe = me && me.username === u.username;
            return `<div class="follow-row"><img src="${esc(avatarOf(u.username))}" alt=""><div><strong>${esc(u.name.split(' ')[0])}${u.banned ? '<span class="ban-badge">BANIDO</span>' : ''}</strong><span>$${esc(u.username)} • ${esc(u.email)} • ${posts} posts</span></div><span class="admin-plan">Plano: <span data-adminplan="${esc(u.username)}">…</span></span>${isMe ? '' : `<button type="button" class="follow-btn" data-ban="${esc(u.username)}">${u.banned ? 'Desbanir' : 'Banir'}</button><button type="button" class="link-btn" data-deluser="${esc(u.username)}">Excluir</button>`}</div>`;
        }).join('') : '<p class="my-grid-empty">Nenhum usuário.</p>';
        box.querySelectorAll('[data-ban]').forEach((b) => {
            b.addEventListener('click', () => {
                const users2 = getUsers();
                const t = users2.find((x) => x.username === b.dataset.ban);
                if (t) {
                    t.banned = !t.banned;
                    saveUsers(users2);
                    renderAdminUsers();
                    showToast(t.banned ? 'Usuário banido.' : 'Usuário desbanido.', t.banned ? 'error' : 'success');
                }
            });
        });
        box.querySelectorAll('[data-deluser]').forEach((b) => {
            b.addEventListener('click', () => {
                const un = b.dataset.deluser;
                saveUsers(getUsers().filter((x) => x.username !== un));
                // Remove chaves do store do usuário
                const move = ['posts', 'follows', 'followers', 'medals', 'medal_dates', 'dogtags', 'equip', 'profile', 'hl', 'wall', 'hidden', 'postlikes', 'superlike', 'app', 'requests', 'beta', 'blocked', 'founder', 'badgecolor', 'plan'];
                move.forEach((suf) => {
                    store.remove('gc_' + suf + '_' + un);
                });
                renderAdminUsers();
                showToast('Usuário excluído deste navegador.', 'info');
            });
        });
        fillAdminPlans();
    }

    /* Assinaturas na nuvem (vale entre aparelhos) */
    async function cloudSavePlan(plan, label) {
        const s = getSession();
        if (!s) return;
        const client = supaClient();
        if (!client) return;
        try {
            await client.from('subscriptions').upsert({ username: s.username, plan, label: label || String(plan).toUpperCase(), updated_at: new Date().toISOString() }, { onConflict: 'username' });
        } catch (e) { /* segue local */ }
    }
    async function cloudLoadPlan() {
        const s = getSession();
        if (!s) return;
        const client = supaClient();
        if (!client) return;
        try {
            const { data, error } = await client.from('subscriptions').select('*').eq('username', s.username).limit(1).maybeSingle();
            if (error || !data) return;
            const cur = store.get('gc_vip_v1', null);
            if (!cur || cur.plan !== data.plan) {
                store.set('gc_vip_v1', { plan: data.plan, label: data.label || String(data.plan).toUpperCase(), since: data.updated_at || new Date().toISOString() });
                renderVipBadge();
                if ($('#pfName')) {
                    renderProfile();
                    renderInsta();
                }
                if ($('#sideName')) initSideUser();
            }
        } catch (e) { /* segue local */ }
    }
    function fillAdminPlans() {
        const box = $('#adminUsers');
        if (!box) return;
        const client = supaClient();
        const paint = (map) => {
            box.querySelectorAll('[data-adminplan]').forEach((slot) => {
                const un = slot.dataset.adminplan;
                const plan = (map && map[un]) || 'free';
                slot.innerHTML = `<select data-plansel="${esc(un)}">
                    <option value="free"${plan === 'free' ? ' selected' : ''}>Free</option>
                    <option value="vip"${plan === 'vip' ? ' selected' : ''}>VIP</option>
                    <option value="elite"${plan === 'elite' ? ' selected' : ''}>ELITE</option>
                    <option value="ceo"${plan === 'ceo' ? ' selected' : ''}>CEO</option>
                </select>`;
            });
        };
        paint(null);
        if (!client) return;
        client.from('subscriptions').select('username,plan').then(({ data }) => {
            const map = {};
            (data || []).forEach((r) => { map[r.username] = r.plan; });
            paint(map);
        }).catch(() => { /* mantém local */ });
        box.onchange = async (e) => {
            const sel = e.target.closest('[data-plansel]');
            if (!sel) return;
            const un = sel.dataset.plansel;
            const plan = sel.value;
            if (!client) {
                showToast('Sem conexão com a nuvem.', 'error');
                fillAdminPlans();
                return;
            }
            try {
                if (plan === 'free') {
                    await client.from('subscriptions').delete().eq('username', un);
                } else {
                    await client.from('subscriptions').upsert({ username: un, plan, label: plan.toUpperCase(), updated_at: new Date().toISOString() }, { onConflict: 'username' });
                }
                showToast(`Plano de ${un} atualizado!`, 'success');
            } catch (ex) {
                showToast('Falha ao salvar. Tente de novo.', 'error');
                fillAdminPlans();
            }
        };
    }

    /* Avatar + $nome em todas as mensagens */
    function msgAvatarOf(name) {
        const s = getSession();
        if (name && s && name === s.username) return myAvatar();
        const av = commenterAvatar(name);
        return av || 'assets/avatars/avatar1.svg?v=2';
    }
    function convMsgHtml(m) {
        if (m.sys) return `<div class="conv-sys">${esc(m.text)}</div>`;
        const s = getSession();
        const myName = s ? s.username : '';
        const mine = m.user === myName;
        return `<div class="conv-msg ${mine ? 'me' : 'them'}"><div class="conv-head"><img src="${esc(msgAvatarOf(m.user))}" alt="" loading="lazy"><span class="conv-who">$${esc(m.user)}</span></div><div class="bubble ${mine ? 'me' : 'them'}">${esc(m.text)}<span class="bubble-time">${fmtTime(m.at)}</span></div></div>`;
    }
    function dmMsgHtml(msg, matchId) {
        const s = getSession();
        const isMe = msg.from === 'me';
        const p = (!isMe && typeof getMatchProfile === 'function') ? getMatchProfile(matchId) : null;
        const name = isMe ? (s ? s.username : 'Você') : ((p && p.name) || '?');
        const av = isMe ? msgAvatarOf(s ? s.username : '') : ((p && p.avatar) || 'assets/avatars/avatar1.svg?v=2');
        return `<div class="conv-msg ${isMe ? 'me' : 'them'}"><div class="conv-head"><img src="${esc(av)}" alt="" loading="lazy"><span class="conv-who">$${esc(name)}</span></div><div class="bubble ${isMe ? 'me' : 'them'}">${esc(msg.text)}<span class="bubble-time">${fmtTime(msg.at)}</span></div></div>`;
    }

    /* Posts na nuvem (feed global entre aparelhos) */
    let cloudPostsCache = [];
    let cloudPostsAt = 0;
    async function refreshCloudPosts(force) {
        const now = Date.now();
        if (!force && now - cloudPostsAt < 45000) return;
        cloudPostsAt = now;
        const client = supaClient();
        if (!client) return;
        try {
            const { data, error } = await client.from('posts').select('*').order('created_at', { ascending: false }).limit(60);
            if (error || !data) return;
            cloudPostsCache = data.map((r) => ({
                id: r.id,
                authorUsername: r.author_username,
                type: r.type || 'photo',
                src: r.src,
                caption: r.caption || '',
                game: r.game || 'Geral',
                at: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
                likes: 0,
                cloud: true,
            }));
            const unknown = [...new Set(cloudPostsCache.map((p) => p.authorUsername).filter((u) => u && !getUsers().some((x) => x.username === u) && !cloudUserCache[String(u).toLowerCase()]))];
            if (unknown.length) {
                try {
                    const { data: profs } = await client.from('profiles').select('username,name,avatar').in('username', unknown.slice(0, 20));
                    (profs || []).forEach((r) => {
                        cloudUserCache[String(r.username).toLowerCase()] = { username: r.username, name: r.name || r.username, avatar: r.avatar || 'assets/avatars/avatar1.svg?v=2' };
                    });
                } catch (e) { /* sem avatares */ }
            }
            CloudCache.set('gc_posts_all', cloudPostsCache.map((p) => ({ ...p })));
            if ($('#feedList') && !$('#tab-feed').hidden) renderFeed();
        } catch (e) { /* offline */ }
    }
    function cloudSavePost(p) {
        const s = getSession();
        const client = supaClient();
        if (!client || !s) return Promise.resolve(false);
        return client.from('posts').insert({
            id: p.id,
            author_username: s.username,
            type: p.type,
            src: p.src,
            caption: p.caption || '',
            game: p.game || 'Geral',
        }).then(({ error }) => {
            if (!error) refreshCloudPosts(true);
            return !error;
        }).catch(() => false);
    }
    function cloudDeletePost(id) {
        const client = supaClient();
        if (!client || !id) return;
        cloudPostsCache = cloudPostsCache.filter((p) => p.id !== id);
        try {
            client.from('posts').delete().eq('id', id).then(() => {}).catch(() => {});
        } catch (e) { /* ignore */ }
    }

    /* ============================================
       38. Nuvem total — cache, sincronização e boot
       (A sessão fica no navegador: obrigatório em todo site.
       Todo o resto vive na nuvem; o aparelho é só cache.)
       ============================================ */
    const CloudCache = new Map();
    let cloudOnline = false;

    async function syncOwned(table, idCol, ownerCol, ownerVal, rows, mapRow) {
        const client = supaClient();
        if (!client || !Array.isArray(rows)) return;
        try {
            const { data } = await client.from(table).select(idCol).eq(ownerCol, ownerVal);
            const cloudIds = new Set((data || []).map((r) => r[idCol]));
            const ups = rows.map(mapRow).filter((r) => r && r[idCol]);
            if (ups.length) await client.from(table).upsert(ups, { onConflict: idCol });
            const localIds = new Set(ups.map((r) => r[idCol]));
            const del = [...cloudIds].filter((id) => !localIds.has(id));
            if (del.length) await client.from(table).delete().in(idCol, del);
        } catch (e) { /* ignore */ }
    }
    function mapPostRow(p) {
        if (!p || !p.id) return null;
        return { id: p.id, author_username: p.authorUsername || '?', type: p.type || 'photo', src: p.src || '', caption: p.caption || '', game: p.game || 'Geral' };
    }
    async function syncComments(val) {
        const client = supaClient();
        if (!client || !val || typeof val !== 'object') return;
        try {
            const ups = [];
            Object.keys(val).forEach((pid) => {
                (val[pid] || []).forEach((c) => {
                    if (!c.id) c.id = 'c' + pid.replace(/[^a-zA-Z0-9]/g, '') + '_' + Date.now().toString(36) + Math.floor(Math.random() * 1e4);
                    ups.push({ id: c.id, post_id: pid, username: c.user, text: c.text, created_at: c.at ? new Date(c.at).toISOString() : new Date().toISOString() });
                });
            });
            if (ups.length) await client.from('comments').upsert(ups, { onConflict: 'id' });
        } catch (e) { /* ignore */ }
    }
    async function syncAppState(user, st) {
        const client = supaClient();
        if (!client || !st) return;
        try {
            await client.from('app_state').upsert({
                username: user,
                seen: st.seen || [],
                likes_date: (st.likes && st.likes.date) || '',
                likes_count: (st.likes && st.likes.count) || 0,
                super_date: (st.super && st.super.date) || '',
                super_count: (st.super && st.super.count) || 0,
            }, { onConflict: 'username' });
            await client.from('matches').delete().eq('owner_username', user);
            const rows = (st.matches || []).map((m) => ({
                owner_username: user,
                match_id: m.id,
                unread: m.unread || 0,
                messages: m.messages || [],
            }));
            if (rows.length) await client.from('matches').insert(rows);
        } catch (e) { /* ignore */ }
    }
    async function syncChatScope(scope, scopeId, arr) {
        const client = supaClient();
        if (!client || !Array.isArray(arr)) return;
        try {
            const ups = arr.map((m) => {
                if (!m.id) m.id = 'm' + Date.now().toString(36) + Math.floor(Math.random() * 1e6);
                return {
                    id: m.id,
                    scope,
                    scope_id: scopeId,
                    username: m.sys ? '' : (m.user || '?'),
                    text: m.sys ? (m.text || m.sys) : (m.text || ''),
                };
            });
            if (ups.length) await client.from('chat_messages').upsert(ups, { onConflict: 'id' });
        } catch (e) { /* ignore */ }
    }
    async function syncGroups(val) {
        const client = supaClient();
        if (!client || !Array.isArray(val)) return;
        try {
            if (val.length) {
                await client.from('groups').upsert(val.map((g) => ({
                    id: g.id, name: g.name, owner: g.owner,
                    members: g.members || [], code: g.code,
                })), { onConflict: 'id' });
                for (const g of val) {
                    const msgs = (g.messages || []).map((m) => {
                        if (!m.id) m.id = 'gm' + String(g.id).replace(/[^a-zA-Z0-9]/g, '') + '_' + Date.now().toString(36) + Math.floor(Math.random() * 1e4);
                        return {
                            id: m.id, scope: 'group', scope_id: g.id,
                            username: m.sys ? '' : (m.user || '?'),
                            text: m.sys ? (m.text || '') : (m.text || ''),
                        };
                    });
                    if (msgs.length) await client.from('chat_messages').upsert(msgs, { onConflict: 'id' });
                }
            }
            const known = syncGroups._last || null;
            if (known) {
                const gone = [...known].filter((id) => !val.some((g) => g.id === id));
                for (const id of gone) {
                    await client.from('groups').delete().eq('id', id);
                    await client.from('chat_messages').delete().eq('scope', 'group').eq('scope_id', id);
                }
            }
            syncGroups._last = new Set(val.map((g) => g.id));
        } catch (e) { /* ignore */ }
    }
    async function syncRooms(val) {
        const client = supaClient();
        if (!client || !Array.isArray(val)) return;
        try {
            if (val.length) {
                await client.from('rooms').upsert(val.map((r) => ({
                    id: r.id, name: r.name, game: r.game || '', password: r.password || '', owner: r.owner,
                })), { onConflict: 'id' });
            }
            const known = syncRooms._last || null;
            if (known) {
                const gone = [...known].filter((id) => !val.some((r) => r.id === id));
                for (const id of gone) {
                    await client.from('rooms').delete().eq('id', id);
                    await client.from('chat_messages').delete().eq('scope', 'room').eq('scope_id', id);
                }
            }
            syncRooms._last = new Set(val.map((r) => r.id));
        } catch (e) { /* ignore */ }
    }
    async function syncRoomMsgs(val) {
        const client = supaClient();
        if (!client || !val || typeof val !== 'object') return;
        try {
            for (const roomId of Object.keys(val)) {
                const arr = val[roomId] || [];
                const ups = arr.map((m) => {
                    if (!m.id) m.id = 'rm' + String(roomId).replace(/[^a-zA-Z0-9]/g, '') + '_' + Date.now().toString(36) + Math.floor(Math.random() * 1e4);
                    return {
                        id: m.id, scope: 'room', scope_id: roomId,
                        username: m.sys ? '' : (m.user || '?'),
                        text: m.sys ? (m.text || '') : (m.text || ''),
                    };
                });
                if (ups.length) await client.from('chat_messages').upsert(ups, { onConflict: 'id' });
            }
        } catch (e) { /* ignore */ }
    }
    async function syncRequests(user, arr) {
        const client = supaClient();
        if (!client || !Array.isArray(arr)) return;
        try {
            await client.from('friend_requests').delete().eq('to_username', user);
            if (arr.length) await client.from('friend_requests').insert(arr.map((r) => ({ to_username: user, from_username: r.from })));
        } catch (e) { /* ignore */ }
    }
    async function syncWall(user, arr) {
        const client = supaClient();
        if (!client || !Array.isArray(arr)) return;
        try {
            await client.from('wall').delete().eq('profile_username', user);
            if (arr.length) await client.from('wall').insert(arr.map((c) => ({
                id: 'w' + Date.now().toString(36) + Math.floor(Math.random() * 1e6) + '_' + Math.floor(Math.random() * 1e4),
                profile_username: user, from_username: c.user, text: c.text,
            })));
        } catch (e) { /* ignore */ }
    }
    async function syncProfile(user, pf) {
        const client = supaClient();
        if (!client || !pf) return;
        try {
            await client.from('profiles').update({
                bio: pf.bio || null, hobbies: pf.hobbies || [], games: pf.games || [],
                photo: pf.photo || null, gif_avatar: pf.gifAvatar || null,
                banner: pf.banner || null, theme: (typeof pf.theme === 'number') ? pf.theme : null,
                bg_img: pf.bgImg || null, name_color: pf.nameColor || null, name_font: pf.nameFont || null,
            }).eq('username', user);
        } catch (e) { /* ignore */ }
    }
    async function syncDogtags(user, arr) {
        const client = supaClient();
        if (!client || !Array.isArray(arr)) return;
        try {
            await client.from('dogtags_owned').delete().eq('username', user);
            if (arr.length) await client.from('dogtags_owned').insert(arr.map((o) => ({ username: user, dogtag_id: o.id, text: o.text || '' })));
        } catch (e) { /* ignore */ }
    }
    async function syncEquipped(user, id) {
        const client = supaClient();
        if (!client) return;
        try {
            await client.from('profiles').update({ equipped_dogtag: id || null }).eq('username', user);
        } catch (e) { /* ignore */ }
    }
    async function syncHighlights(user, arr) {
        const client = supaClient();
        if (!client || !Array.isArray(arr)) return;
        try {
            await client.from('highlights').delete().eq('username', user);
            if (arr.length) await client.from('highlights').insert(arr.map((h, i) => ({
                id: h.id || ('h' + Date.now().toString(36) + i), username: user, label: h.label, img_url: h.img, position: i,
            })));
        } catch (e) { /* ignore */ }
    }
    async function syncMedals(user, arr) {
        const client = supaClient();
        if (!client || !Array.isArray(arr)) return;
        try {
            const { data } = await client.from('medals_equipped').select('medal_id').eq('username', user);
            const have = new Set((data || []).map((r) => r.medal_id));
            const fresh = arr.filter((id) => !have.has(id));
            if (fresh.length) await client.from('medals_equipped').insert(fresh.map((id) => ({ username: user, medal_id: id })));
            const gone = [...have].filter((id) => !arr.includes(id));
            if (gone.length) await client.from('medals_equipped').delete().eq('username', user).in('medal_id', gone);
        } catch (e) { /* ignore */ }
    }
    async function syncOrders(val) {
        const client = supaClient();
        if (!client || !Array.isArray(val)) return;
        try {
            if (val.length) await client.from('orders').upsert(val.map((o) => ({
                code: o.code, username: o.username || '?', items: o.items || [], total: o.total || 0,
            })), { onConflict: 'code' });
        } catch (e) { /* ignore */ }
    }
    async function syncBeta(user, val) {
        const client = supaClient();
        if (!client) return;
        try {
            await client.from('profiles').update({ has_beta: val }).eq('username', user);
        } catch (e) { /* ignore */ }
    }
    async function syncFounder(user, val) {
        const client = supaClient();
        if (!client) return;
        try {
            await client.from('profiles').update({ has_founder: val }).eq('username', user);
        } catch (e) { /* ignore */ }
    }
    async function syncMedalDates(user, dates) {
        const client = supaClient();
        if (!client || !dates || typeof dates !== 'object') return;
        try {
            const rows = Object.entries(dates).map(([medal_id, unlocked_at]) => ({
                username: user, medal_id, unlocked_at: new Date(unlocked_at).toISOString(),
            }));
            if (rows.length) {
                await client.from('medal_dates').upsert(rows, { onConflict: 'username,medal_id' });
            }
        } catch (e) { /* ignore */ }
    }
    async function syncBadgeColor(user, color) {
        const client = supaClient();
        if (!client) return;
        try {
            await client.from('profiles').update({ badge_color: color || null }).eq('username', user);
        } catch (e) { /* ignore */ }
    }
    function cloudSave(key, val) {
        if (!cloudOnline) return;
        try {
            const client = supaClient();
            if (!client) return;
            if (key === 'gc_users_v1') return void syncUsers(val);
            if (key === 'gc_vip_v1') return void syncVip(val);
            let m = key.match(/^gc_follows_(.+)$/);
            if (m) return void syncFollows(m[1], val);
            m = key.match(/^gc_postlikes_(.+)$/);
            if (m) return void syncLikes(m[1], val);
            m = key.match(/^gc_blocked_(.+)$/);
            if (m) return void syncBlocked(m[1], val);
            m = key.match(/^gc_hidden_(.+)$/);
            if (m) return void syncHidden(m[1], val);
            if (key === 'gc_custom_medals') return void syncCustomMedals(val);
            if (key === 'gc_blocked_tags') return void syncBlockedTags(val);
            let mm = key.match(/^gc_app_(.+)$/);
            if (mm) return void syncAppState(mm[1], val);
            if (key === 'gc_global_v1') return void syncChatScope('global', '', val);
            if (key === 'gc_groups_v1') return void syncGroups(val);
            if (key === 'gc_rooms_v1') return void syncRooms(val);
            if (key === 'gc_roommsg_v1') return void syncRoomMsgs(val);
            mm = key.match(/^gc_requests_(.+)$/);
            if (mm) return void syncRequests(mm[1], val);
            mm = key.match(/^gc_wall_(.+)$/);
            if (mm) return void syncWall(mm[1], val);
            mm = key.match(/^gc_profile_(.+)$/);
            if (mm) return void syncProfile(mm[1], val);
            mm = key.match(/^gc_dogtags_(.+)$/);
            if (mm) return void syncDogtags(mm[1], val);
            mm = key.match(/^gc_equip_(.+)$/);
            if (mm) return void syncEquipped(mm[1], val);
            mm = key.match(/^gc_hl_(.+)$/);
            if (mm) return void syncHighlights(mm[1], val);
            mm = key.match(/^gc_medals_(.+)$/);
            if (mm) return void syncMedals(mm[1], val);
            if (key === 'gc_orders_v1') return void syncOrders(val);
            mm = key.match(/^gc_badgecolor_(.+)$/);
            if (mm) return void syncBadgeColor(mm[1], val);
            mm = key.match(/^gc_beta_(.+)$/);
            if (mm) return void syncBeta(mm[1], val);
            mm = key.match(/^gc_founder_(.+)$/);
            if (mm) return void syncFounder(mm[1], val);
            mm = key.match(/^gc_medal_dates_(.+)$/);
            if (mm) return void syncMedalDates(mm[1], val);
            mm = key.match(/^gc_app_(.+)$/);
            if (mm) return void syncAppState(mm[1], val);
            if (key === 'gc_global_v1') return void syncChatScope('global', '', val);
            if (key === 'gc_groups_v1') return void syncGroups(val);
            if (key === 'gc_rooms_v1') return void syncRooms(val);
            if (key === 'gc_roommsg_v1') return void syncRoomMsgs(val);
            if (key === 'gc_posts_all') {
                const s = getSession();
                if (s) return void syncOwned('posts', 'id', 'author_username', s.username, (val || []).filter((p) => p.authorUsername === s.username), mapPostRow);
            }
            if (key === 'gc_comments_v1') return void syncComments(val);
        } catch (e) { /* offline segue local */ }
    }

    async function syncUsers(val) {
        const client = supaClient();
        if (!client || !Array.isArray(val)) return;
        try {
            await Promise.allSettled(val.slice(0, 300).map((u) => {
                const row = {
                    username: u.username, name: u.name, email: u.email,
                    birthdate: u.birthdate || null, avatar: u.avatar || null,
                    gender: u.gender || null, looking_for: u.lookingFor || null,
                    intents: u.intents || [], banned: !!u.banned,
                };
                if (u.passwordHash) row.password_hash = u.passwordHash;
                return client.from('profiles').upsert(row, { onConflict: 'username' });
            }));
        } catch (e) { /* ignore */ }
    }

    async function syncVip(val) {
        const s = getSession();
        const client = supaClient();
        if (!client || !s || !val) return;
        try {
            await client.from('subscriptions').upsert({ username: s.username, plan: val.plan, label: val.label || String(val.plan).toUpperCase(), updated_at: new Date().toISOString() }, { onConflict: 'username' });
        } catch (e) { /* ignore */ }
    }

    async function syncFollows(user, arr) {
        const client = supaClient();
        if (!client || !Array.isArray(arr)) return;
        try {
            await client.from('follows').delete().eq('follower', user);
            if (arr.length) await client.from('follows').insert(arr.map((f) => ({ follower: user, following: f })));
        } catch (e) { /* ignore */ }
    }

    async function syncLikes(user, arr) {
        const client = supaClient();
        if (!client || !Array.isArray(arr)) return;
        try {
            await client.from('post_likes').delete().eq('username', user);
            if (arr.length) await client.from('post_likes').insert(arr.map((p) => ({ post_id: p, username: user })));
        } catch (e) { /* ignore */ }
    }

    async function syncBlocked(user, arr) {
        const client = supaClient();
        if (!client || !Array.isArray(arr)) return;
        try {
            await client.from('blocked').delete().eq('username', user);
            if (arr.length) await client.from('blocked').insert(arr.map((b) => ({ username: user, blocked_key: b.key, blocked_name: b.name || '' })));
        } catch (e) { /* ignore */ }
    }

    async function syncHidden(user, arr) {
        const client = supaClient();
        if (!client || !Array.isArray(arr)) return;
        try {
            await client.from('hidden_posts').delete().eq('username', user);
            if (arr.length) await client.from('hidden_posts').insert(arr.map((p) => ({ username: user, post_id: p })));
        } catch (e) { /* ignore */ }
    }

    async function syncCustomMedals(val) {
        const client = supaClient();
        if (!client || !Array.isArray(val)) return;
        try {
            await client.from('custom_medals').delete().neq('id', '__none__');
            if (val.length) await client.from('custom_medals').insert(val.map((m) => ({ id: m.id, name: m.name, icon: m.icon, rule: m.rule, n: m.n || 1 })));
        } catch (e) { /* ignore */ }
    }

    async function syncBlockedTags(val) {
        const client = supaClient();
        if (!client || !Array.isArray(val)) return;
        try {
            await client.from('blocked_tags').delete().neq('tag', '__none__');
            if (val.length) await client.from('blocked_tags').insert(val.map((t) => ({ tag: t })));
        } catch (e) { /* ignore */ }
    }

    async function refreshFollowers() {
        const s = getSession();
        if (!s) return;
        try {
            const client = supaClient();
            if (!client) return;
            const { data } = await client.from('follows').select('follower').eq('following', 'u:' + s.username);
            if (data) {
                CloudCache.set('gc_followers_of_' + s.username, data.map((r) => r.follower));
                const el = $('#stFollowers');
                if (el && !$('#tab-profile').hidden) el.textContent = getFollowerList().length;
            }
        } catch (e) { /* ignore */ }
    }

    async function cloudBoot() {
        try {
            const client = supaClient();
            if (!client) {
                cloudOnline = false;
                return;
            }
            await Promise.race([client.from('profiles').select('username', { count: 'exact', head: true }), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 7000))]);
            cloudOnline = true;
        } catch (e) {
            cloudOnline = false;
            return;
        }
        try {
            const client = supaClient();
            const { data: users } = await client.from('profiles').select('*').limit(1000);
            if (users) CloudCache.set('gc_users_v1', users.map(toLocalUser));
            // Inicializa timestamp de sync de usuários
            store.set('gc_last_user_sync', Date.now());
            const { data: cmed } = await client.from('custom_medals').select('*');
            if (cmed) CloudCache.set('gc_custom_medals', cmed.map((r) => ({ id: r.id, name: r.name, icon: r.icon, rule: r.rule, n: r.n })));
            const { data: btags } = await client.from('blocked_tags').select('tag');
            if (btags) CloudCache.set('gc_blocked_tags', btags.map((r) => r.tag));
            // Global follows for follower counts
            const { data: allFol } = await client.from('follows').select('follower,following');
            if (allFol) CloudCache.set('gc_follows_all', allFol);
            const s = getSession();
            if (s) {
                const u = s.username;
                const { data: sub } = await client.from('subscriptions').select('*').eq('username', u).limit(1).maybeSingle();
                if (sub) {
                    CloudCache.set('gc_vip_v1', { plan: sub.plan, label: sub.label || String(sub.plan).toUpperCase(), since: sub.updated_at });
                    CloudCache.set('gc_plan_' + u, sub.plan);
                }
                const { data: fol } = await client.from('follows').select('following').eq('follower', u);
                if (fol) CloudCache.set('gc_follows_' + u, fol.map((r) => r.following));
                const { data: lik } = await client.from('post_likes').select('post_id').eq('username', u);
                if (lik) CloudCache.set('gc_postlikes_' + u, lik.map((r) => r.post_id));
                const { data: blk } = await client.from('blocked').select('blocked_key,blocked_name').eq('username', u);
                if (blk) CloudCache.set('gc_blocked_' + u, blk.map((r) => ({ key: r.blocked_key, name: r.blocked_name })));
                const { data: hid } = await client.from('hidden_posts').select('post_id').eq('username', u);
                if (hid) CloudCache.set('gc_hidden_' + u, hid.map((r) => r.post_id));
                const { data: folme } = await client.from('follows').select('follower').eq('following', 'u:' + u);
                if (folme) CloudCache.set('gc_followers_of_' + u, folme.map((r) => r.follower));
                const { data: allSubs } = await client.from('subscriptions').select('username,plan,label');
                if (allSubs) CloudCache.set('gc_subs_all', allSubs);
                const { data: allPosts } = await client.from('posts').select('*').order('created_at', { ascending: false }).limit(200);
                if (allPosts) {
                    CloudCache.set('gc_posts_all', allPosts.map((r) => ({
                        id: r.id, authorUsername: r.author_username, type: r.type || 'photo', src: r.src,
                        caption: r.caption || '', game: r.game || 'Geral',
                        at: r.created_at ? new Date(r.created_at).getTime() : Date.now(), likes: 0,
                    })));
                }
                const { data: allComments } = await client.from('comments').select('*').order('created_at', { ascending: true }).limit(800);
                if (allComments) {
                    const grouped = {};
                    allComments.forEach((r) => {
                        (grouped[r.post_id] = grouped[r.post_id] || []).push({ id: r.id, user: r.username, text: r.text, at: r.created_at ? new Date(r.created_at).getTime() : Date.now() });
                    });
                    CloudCache.set('gc_comments_v1', grouped);
                }
                const { data: appRow } = await client.from('app_state').select('*').eq('username', u).limit(1).maybeSingle();
                const { data: myMatches } = await client.from('matches').select('*').eq('owner_username', u);
                if (appRow || (myMatches && myMatches.length)) {
                    CloudCache.set('gc_app_' + u, {
                        seen: appRow ? (appRow.seen || []) : [],
                        likes: { date: appRow ? (appRow.likes_date || '') : '', count: appRow ? (appRow.likes_count || 0) : 0 },
                        super: { date: appRow ? (appRow.super_date || '') : '', count: appRow ? (appRow.super_count || 0) : 0 },
                        matches: (myMatches || []).map((m) => ({ id: m.match_id, unread: m.unread || 0, messages: m.messages || [] })),
                    });
                }
                const { data: gmsgs } = await client.from('chat_messages').select('*').eq('scope', 'global').order('created_at', { ascending: true }).limit(120);
                if (gmsgs) {
                    CloudCache.set('gc_global_v1', gmsgs.map((m) => (m.username === '' ? { id: m.id, sys: true, text: m.text, at: m.created_at ? new Date(m.created_at).getTime() : Date.now() } : { id: m.id, user: m.username, text: m.text, at: m.created_at ? new Date(m.created_at).getTime() : Date.now() })));
                }
                const { data: grows } = await client.from('groups').select('*').limit(200);
                if (grows) {
                    const mine = grows.filter((g) => (g.members || []).includes(u));
                    const grid = mine.map((g) => ({ id: g.id, name: g.name, owner: g.owner, members: g.members || [], code: g.code, messages: [] }));
                    if (mine.length) {
                        const { data: gm } = await client.from('chat_messages').select('*').eq('scope', 'group').in('scope_id', mine.map((g) => g.id)).order('created_at', { ascending: true }).limit(500);
                        const byGroup = {};
                        (gm || []).forEach((m) => {
                            const msg = m.username === '' ? { id: m.id, sys: true, text: m.text, at: m.created_at ? new Date(m.created_at).getTime() : Date.now() } : { id: m.id, user: m.username, text: m.text, at: m.created_at ? new Date(m.created_at).getTime() : Date.now() };
                            (byGroup[m.scope_id] = byGroup[m.scope_id] || []).push(msg);
                        });
                        grid.forEach((g) => { g.messages = byGroup[g.id] || []; });
                    }
                    CloudCache.set('gc_groups_v1', grid);
                    syncGroups._last = new Set(grid.map((g) => g.id));
                }
                const { data: rrows } = await client.from('rooms').select('*').eq('owner', u);
                if (rrows && rrows.length) {
                    const localRooms = store.get('gc_rooms_v1', []);
                    const merged = rrows.map((r) => ({ id: r.id, name: r.name, game: r.game || '', password: r.password || '', owner: r.owner, messages: [] }));
                    localRooms.forEach((r) => {
                        if (!merged.some((x) => x.id === r.id)) merged.push(r);
                    });
                    const { data: rm } = await client.from('chat_messages').select('*').eq('scope', 'room').in('scope_id', merged.map((r) => r.id)).order('created_at', { ascending: true }).limit(500);
                    const byRoom = {};
                    (rm || []).forEach((m) => {
                        const msg = m.username === '' ? { id: m.id, sys: true, text: m.text, at: m.created_at ? new Date(m.created_at).getTime() : Date.now() } : { id: m.id, user: m.username, text: m.text, at: m.created_at ? new Date(m.created_at).getTime() : Date.now() };
                        (byRoom[m.scope_id] = byRoom[m.scope_id] || []).push(msg);
                    });
                    merged.forEach((r) => { r.messages = byRoom[r.id] || r.messages || []; });
                    CloudCache.set('gc_rooms_v1', merged);
                    syncRooms._last = new Set(merged.map((r) => r.id));
                }
                const { data: reqs } = await client.from('friend_requests').select('*').eq('to_username', u);
                if (reqs) {
                    CloudCache.set('gc_requests_' + u, reqs.map((r) => ({ from: r.from_username, at: r.created_at ? new Date(r.created_at).getTime() : Date.now() })));
                }
                // badgeColor do usuário atual (já vem no users, mas garante no store)
                const me = users.find((x) => x.username === u);
                if (me && me.badgeColor) {
                    store.set('gc_badgecolor_' + u, me.badgeColor);
                }
                // beta / founder / medal_dates
                if (me) {
                    if (me.has_beta) store.set('gc_beta_' + u, true);
                    if (me.has_founder) store.set('gc_founder_' + u, true);
                }
                const { data: mDates } = await client.from('medal_dates').select('medal_id,unlocked_at').eq('username', u);
                if (mDates && mDates.length) {
                    const dates = {};
                    mDates.forEach((r) => { dates[r.medal_id] = r.unlocked_at; });
                    store.set('gc_medal_dates_' + u, dates);
                }
            }
        } catch (e) { /* mantém o que hidratou */ }
    }

    /* ============================================
       Inicialização
       ============================================ */
    document.addEventListener('DOMContentLoaded', () => {
        initAuth();
        initPasswordToggles();
        initPasswordStrength();
        initLoginForm();
        initRegisterForm();
        initAvatarSelector();
        initDiscordLogin();
        initScrollAnimations();
        initSpotlight();
        initHeaderScroll();
        initModals();
        initCardMasks();
        initBillingToggle();
        initPlanCheckout();
        initFaq();
        initShop();
        initDogtagShop();
        renderVipBadge();
        initCode();
        initApp();
        cloudBoot().catch(() => {}).finally(() => {
        // Polling automático para novos usuários (a cada 30s)
        if (!window._gcPollInterval) {
            window._gcPollInterval = setInterval(async () => {
                if (!cloudOnline) return;
                try {
                    const client = supaClient();
                    if (!client) return;
                    const s = getSession();
                    if (!s) return;
                    // Busca usuários mais recentes que o último sync
                    const lastSync = store.get('gc_last_user_sync', 0);
                    const { data: newUsers } = await client
                        .from('profiles')
                        .select('*')
                        .gt('created_at', new Date(lastSync).toISOString())
                        .limit(50);
                    if (newUsers && newUsers.length) {
                        const localUsers = getUsers();
                        let changed = false;
                        newUsers.forEach((u) => {
                            if (!localUsers.some((x) => x.username === u.username)) {
                                localUsers.push(toLocalUser(u));
                                changed = true;
                            }
                        });
                        if (changed) {
                            saveUsers(localUsers);
                            CloudCache.set('gc_users_v1', localUsers.map(toLocalUser));
                            store.set('gc_last_user_sync', Date.now());
                            // Re-render se estiver na aba Descobrir
                            if ($('#deck') && !$('#tab-discover').hidden) {
                                renderDeck();
                                renderLikesBar();
                            }
                        }
                    }
                } catch (e) { /* silencioso */ }
            }, 30000);
        }
    });
            try {
                renderVipBadge();
                if ($('#sideName')) initSideUser();
                if ($('#feedList') && !$('#tab-feed').hidden) renderFeed();
                if ($('#deck') && !$('#tab-discover').hidden) {
                    renderDeck();
                    renderLikesBar();
                }
                if ($('#matchList') && !$('#tab-matches').hidden) renderMatchList();
                if ($('#pfName') && !$('#tab-profile').hidden) {
                    renderProfile();
                    renderInsta();
                }
                if ($('#clipsStageGlobal') && !$('#tab-clips').hidden) renderGlobalClips();
                if ($('#generalRooms') && !$('#tab-rooms').hidden && typeof renderRooms === 'function') renderRooms();
                if ($('#tab-chat') && !$('#tab-chat').hidden) {
                    renderChatHome();
                    startGlobalBots();
                }
            } catch (e) { /* primeira pintura já valeu */ }
        });
    });
})();
