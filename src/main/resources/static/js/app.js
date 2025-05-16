document.addEventListener('DOMContentLoaded', () => {
    // Tab switching
    const tabBtns = document.querySelectorAll('.tab-btn');
    const forms = document.querySelectorAll('.form');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            
            // Update active tab button
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Show corresponding form
            forms.forEach(form => {
                form.classList.remove('active');
                if (form.id === `${tab}-form`) {
                    form.classList.add('active');
                }
            });
        });
    });

    // Form submissions
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const verificationForm = document.getElementById('verification-form');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = loginForm.querySelector('input[type="email"]').value;
        const password = loginForm.querySelector('input[type="password"]').value;

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('token', data.token);
                showChatInterface();
            } else {
                alert('登录失败，请检查您的账号密码。');
            }
        } catch (error) {
            console.error('登录错误:', error);
            alert('登录过程中发生错误。');
        }
    });

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = registerForm.querySelector('input[type="email"]').value;
        const nickname = registerForm.querySelector('input[type="text"]').value;
        const password = registerForm.querySelectorAll('input[type="password"]')[0].value;
        const confirmPassword = registerForm.querySelectorAll('input[type="password"]')[1].value;

        if (password !== confirmPassword) {
            alert('两次输入的密码不一致！');
            return;
        }

        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, nickname, password })
            });

            if (response.ok) {
                // Show verification form
                forms.forEach(form => form.classList.remove('active'));
                verificationForm.classList.add('active');
            } else {
                alert('注册失败，请重试。');
            }
        } catch (error) {
            console.error('注册错误:', error);
            alert('注册过程中发生错误。');
        }
    });

    verificationForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const code = verificationForm.querySelector('input[type="text"]').value;
        const email = registerForm.querySelector('input[type="email"]').value;

        try {
            const response = await fetch('/api/verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, code })
            });

            if (response.ok) {
                alert('验证成功！请登录。');
                // Switch to login form
                tabBtns[0].click();
            } else {
                alert('验证失败，请检查验证码后重试。');
            }
        } catch (error) {
            console.error('验证错误:', error);
            alert('验证过程中发生错误。');
        }
    });

    // Chat interface
    const messageInput = document.querySelector('.message-input input');
    const sendBtn = document.querySelector('.send-btn');
    const messagesContainer = document.querySelector('.messages');
    const contactsList = document.querySelector('.contacts-list');
    let currentChat = null;

    // Load contacts
    async function loadContacts() {
        try {
            const response = await fetch('/api/contacts', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const contacts = await response.json();
                displayContacts(contacts);
            }
        } catch (error) {
            console.error('加载联系人错误:', error);
        }
    }

    function displayContacts(contacts) {
        contactsList.innerHTML = '';
        contacts.forEach(contact => {
            const contactElement = document.createElement('div');
            contactElement.className = 'contact-item';
            contactElement.innerHTML = `
                <img src="images/default-avatar.png" alt="${contact.nickname}" class="avatar">
                <span>${contact.nickname}</span>
            `;
            contactElement.addEventListener('click', () => startChat(contact));
            contactsList.appendChild(contactElement);
        });
    }

    function startChat(contact) {
        currentChat = contact;
        document.querySelector('.contact-name').textContent = contact.nickname;
        loadMessages(contact.id);
    }

    async function loadMessages(contactId) {
        try {
            const response = await fetch(`/api/messages/${contactId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const messages = await response.json();
                displayMessages(messages);
            }
        } catch (error) {
            console.error('加载消息错误:', error);
        }
    }

    function displayMessages(messages) {
        messagesContainer.innerHTML = '';
        messages.forEach(message => {
            const messageElement = document.createElement('div');
            messageElement.className = `message ${message.senderId === currentChat.id ? 'received' : 'sent'}`;
            messageElement.innerHTML = `
                <div class="message-content">${message.content}</div>
            `;
            messagesContainer.appendChild(messageElement);
        });
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    async function sendMessage() {
        if (!currentChat || !messageInput.value.trim()) return;

        try {
            const response = await fetch('/api/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    receiverId: currentChat.id,
                    content: messageInput.value.trim()
                })
            });

            if (response.ok) {
                messageInput.value = '';
                loadMessages(currentChat.id);
            }
        } catch (error) {
            console.error('发送消息错误:', error);
        }
    }

    sendBtn.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    function showChatInterface() {
        document.getElementById('auth-container').classList.add('hidden');
        document.getElementById('chat-container').classList.remove('hidden');
        loadContacts();
    }

    // Check if user is already logged in
    if (localStorage.getItem('token')) {
        showChatInterface();
    }

    // 忘记密码相关
    const forgotPasswordLink = document.getElementById('forgot-password-link');
    const forgotPasswordForm = document.getElementById('forgot-password-form');
    const resetPasswordForm = document.getElementById('reset-password-form');
    const backToLoginLink = document.querySelector('.back-to-login');

    forgotPasswordLink.addEventListener('click', (e) => {
        e.preventDefault();
        forms.forEach(form => form.classList.remove('active'));
        forgotPasswordForm.classList.add('active');
    });

    backToLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        forms.forEach(form => form.classList.remove('active'));
        loginForm.classList.add('active');
    });

    forgotPasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = forgotPasswordForm.querySelector('input[type="email"]').value;

        // 检查邮箱是否已注册
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const user = users.find(u => u.email === email);
        
        if (!user) {
            alert('该邮箱未注册！');
            return;
        }

        // 生成6位随机验证码
        const code = String.format("%06d", Math.floor(Math.random() * 1000000));
        
        // 保存验证码到localStorage
        const resetCodes = JSON.parse(localStorage.getItem('resetCodes') || '[]');
        resetCodes.push({
            email,
            code,
            expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5分钟后过期
        });
        localStorage.setItem('resetCodes', JSON.stringify(resetCodes));

        // 模拟发送邮件
        alert(`重置密码验证码已发送到您的邮箱：${code}`);
        
        forms.forEach(form => form.classList.remove('active'));
        resetPasswordForm.classList.add('active');
    });

    resetPasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newPassword = resetPasswordForm.querySelectorAll('input[type="password"]')[0].value;
        const confirmPassword = resetPasswordForm.querySelectorAll('input[type="password"]')[1].value;
        const code = resetPasswordForm.querySelector('input[type="text"]').value;
        const email = forgotPasswordForm.querySelector('input[type="email"]').value;

        if (newPassword !== confirmPassword) {
            alert('两次输入的密码不一致！');
            return;
        }

        // 验证验证码
        const resetCodes = JSON.parse(localStorage.getItem('resetCodes') || '[]');
        const validCode = resetCodes.find(rc => 
            rc.email === email && 
            rc.code === code && 
            new Date(rc.expiresAt) > new Date()
        );

        if (!validCode) {
            alert('验证码无效或已过期！');
            return;
        }

        // 更新密码
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const userIndex = users.findIndex(u => u.email === email);
        if (userIndex !== -1) {
            users[userIndex].password = newPassword;
            localStorage.setItem('users', JSON.stringify(users));

            // 删除已使用的验证码
            const updatedResetCodes = resetCodes.filter(rc => rc.email !== email);
            localStorage.setItem('resetCodes', JSON.stringify(updatedResetCodes));

            alert('密码重置成功，请使用新密码登录。');
            forms.forEach(form => form.classList.remove('active'));
            loginForm.classList.add('active');
        } else {
            alert('用户不存在！');
        }
    });

    // 修改密码相关
    const changePasswordBtn = document.querySelector('.change-password-btn');
    const changePasswordModal = document.getElementById('change-password-modal');
    const changePasswordForm = document.getElementById('change-password-form');
    const cancelBtn = document.querySelector('.cancel-btn');
    const logoutBtn = document.querySelector('.logout-btn');

    changePasswordBtn.addEventListener('click', () => {
        changePasswordModal.classList.remove('hidden');
    });

    cancelBtn.addEventListener('click', () => {
        changePasswordModal.classList.add('hidden');
    });

    changePasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const currentPassword = changePasswordForm.querySelectorAll('input[type="password"]')[0].value;
        const newPassword = changePasswordForm.querySelectorAll('input[type="password"]')[1].value;
        const confirmPassword = changePasswordForm.querySelectorAll('input[type="password"]')[2].value;

        if (newPassword !== confirmPassword) {
            alert('两次输入的新密码不一致！');
            return;
        }

        // 获取当前用户信息
        const token = localStorage.getItem('token');
        if (!token) {
            alert('请先登录！');
            return;
        }

        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const currentUser = users.find(u => u.token === token);

        if (!currentUser) {
            alert('用户信息不存在！');
            return;
        }

        if (currentUser.password !== currentPassword) {
            alert('当前密码错误！');
            return;
        }

        // 更新密码
        currentUser.password = newPassword;
        localStorage.setItem('users', JSON.stringify(users));

        alert('密码修改成功！');
        changePasswordModal.classList.add('hidden');
    });

    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('token');
        window.location.reload();
    });
}); 