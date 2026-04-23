// ==========================================
// TỰ ĐỘNG BỔ SUNG CSS CHO GAME 
// ==========================================
const dynamicStyle = document.createElement('style');
dynamicStyle.innerHTML = `
    .last-move-highlight { box-shadow: 0 0 0 3px rgba(255, 235, 59, 0.8), 0 0 15px rgba(255, 235, 59, 1) !important; border: 2px solid #fff !important; z-index: 10 !important; }
    .blink-text { animation: blinker 1.5s linear infinite; }
    @keyframes blinker { 50% { opacity: 0; } }
    #board { transition: transform 0.8s ease-in-out; position: relative; }
    .board-flipped { transform: rotateX(30deg) rotateZ(180deg) !important; }
    .board-flipped .piece, .board-flipped .obstacle, .board-flipped .node { transform: translate(-50%, -50%) rotateZ(-180deg) !important; }
    
    #lines-svg { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 1; pointer-events: none; }
    .node { z-index: 5; }
    .piece, .obstacle { z-index: 10; }

    .skill-bar-bottom { position: absolute; bottom: 20px; left: 20px; display: flex; flex-direction: column; align-items: center; gap: 8px; background: rgba(40, 20, 10, 0.95); padding: 10px; border-radius: 8px; border: 2px solid #c98e54; box-shadow: 0 4px 10px rgba(0,0,0,0.8); z-index: 100;}
    .sikhi-box { color: #ffda75; font-family: 'Sriracha', cursive; font-size: 1.1rem; text-shadow: 1px 1px 2px #000; background: rgba(0,0,0,0.5); padding: 4px 10px; border-radius: 5px; border: 1px solid #c98e54; width: 100%; text-align: center; box-sizing: border-box; }
    .skills-row { display: flex; gap: 8px; }
    .skill-btn { width: 45px; height: 45px; border-radius: 5px; font-size: 1.5rem; background: linear-gradient(to bottom, #dfc29e, #c98e54); border: 2px solid #8b3a3a; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; display: flex; justify-content: center; align-items: center; padding: 0; }
    .skill-btn:hover { transform: scale(1.1); }
    .skill-btn.locked { filter: grayscale(100%) opacity(0.3); cursor: not-allowed; border-color: #555; }
    .skill-btn.locked:hover { transform: none; }
    .skill-btn.ready { box-shadow: 0 0 10px #ffda75, inset 0 0 5px #ffda75; border-color: #ffda75; animation: pulse 2s infinite; }
    @keyframes pulse { 0% { box-shadow: 0 0 5px #ffda75; } 50% { box-shadow: 0 0 15px #ffda75; } 100% { box-shadow: 0 0 5px #ffda75; } }
    .using-skill-cursor { cursor: crosshair !important; }

    .missions-grid { display: grid; grid-template-columns: repeat(9, 1fr); gap: 10px; margin-top: 10px; }
    .mission-btn { padding: 10px; border-radius: 5px; font-family: 'Sriracha', cursive; font-size: 1.1rem; cursor: pointer; background: linear-gradient(to bottom, #dfc29e, #c98e54); border: 2px solid #8b3a3a; color: #4a2f18; transition: transform 0.2s; }
    .mission-btn:hover { transform: scale(1.1); }
    .mission-btn.locked-mission { filter: grayscale(100%); opacity: 0.5; cursor: not-allowed; }
    .mission-btn.locked-mission:hover { transform: none; }
`;
document.head.appendChild(dynamicStyle);

// ==========================================
// KHAI BÁO TOÀN BỘ BIẾN HỆ THỐNG
// ==========================================
const socket = io();
let currentUser = null; 
let currentUserRole = 'user'; 
let myRewards = []; 
let mySkills = []; 
let mySiKhi = 0; 
let myMissionProgress = 0;

const BOARD_SIZE = 5; 
let gameState = []; 
let currentPlayer = 1; 
let selectedPiece = null; 
let lastMoveData = null; 

let currentChapterIndex = 0; 
let currentLessonIndex = 0; 
let isExamMode = false; 
let showHint = true; 
let moveCount = 0; 
let isPaused = false; 
let hideTextTimeout = null; 
let aiTimeout = null; 
const MAX_MOVES = 40; 
let isFreePlay = false; 
let freePlayLevel = 'easy'; 
let timerInterval = null; 
let timeLeft = 0; 
let maxTime = 0;

let historyStates = []; 
let activeSkill = 0; 
let lastPlayerLost = 0;
let isPvPMode = false; 
let currentLenhBai = ""; 
let myPvPPlayerNum = 0; 
let opponentName = "";
let isGiangHoMode = false; 
let currentMissionIndex = 0; 
let isStoryMode = false;

// DOM Elements
const boardEl = document.getElementById('board'); 
const linesSvg = document.getElementById('lines-svg'); 
const statusEl = document.getElementById('turn-indicator'); 
const instTitle = document.getElementById('inst-title'); 
const instText = document.getElementById('inst-text'); 
const feedbackText = document.getElementById('feedback-text'); 
const nextBtn = document.getElementById('next-btn'); 
const prevBtn = document.getElementById('prev-btn'); 
const chapterTitle = document.getElementById('chapter-title'); 
const gameScreen = document.getElementById('game-screen'); 
const gameScene = document.getElementById('game-scene'); 
const instructionBox = document.getElementById('instruction-box'); 
const countRedEl = document.getElementById('count-red'); 
const countWhiteEl = document.getElementById('count-white'); 
const timerContainer = document.getElementById('timer-container'); 
const timerBar = document.getElementById('timer-bar'); 
const weatherEffect = document.getElementById('weather-effect'); 
const bgMusic = document.getElementById('bg-music'); 
const muteBtn = document.getElementById('mute-btn');

// ==========================================
// XÁC THỰC & HỒ SƠ TÀI KHOẢN (Đã bọc Window.)
// ==========================================
window.openAuth = function() { document.getElementById('auth-screen').classList.remove('hidden'); };
window.closeAuth = function() { document.getElementById('auth-screen').classList.add('hidden'); };
window.attemptLogin = function() { const u = document.getElementById('username').value; const p = document.getElementById('password').value; if(u && p) socket.emit('login', { username: u, password: p }); else alert("Vui lòng điền đủ danh xưng và khẩu quyết!"); };
window.attemptRegister = function() { const u = document.getElementById('username').value; const p = document.getElementById('password').value; if(u && p) socket.emit('register', { username: u, password: p }); else alert("Vui lòng điền đủ danh xưng và khẩu quyết!"); };

socket.on('register_response', (data) => { document.getElementById('auth-msg').innerText = data.message; document.getElementById('auth-msg').style.color = data.success ? "green" : "red"; });

socket.on('login_response', (data) => {
    if(data.success) {
        currentUser = data.username; currentUserRole = data.role; 
        currentChapterIndex = data.chapter || 0; currentLessonIndex = data.lesson || 0;
        myRewards = data.rewards || []; mySkills = data.skills || []; mySiKhi = data.sikhi || 0; myMissionProgress = data.mission || 0;
        
        window.closeAuth();
        let chaoHoi = currentUserRole === 'admin' ? `Kính chào tổng quản, ${currentUser}` : `Kính chào kỳ thủ, ${currentUser}`;
        document.getElementById('player-welcome').innerText = chaoHoi;
        
        // LOGIC CHUYỂN ĐỔI NÚT TRẠNG NGUYÊN
        if(currentChapterIndex >= 4) {
            document.getElementById('main-start-btn').style.display = "none";
            document.getElementById('mission-board-btn').style.display = "block";
            document.getElementById('trang-nguyen-status').classList.remove('hidden');
        } else {
            document.getElementById('main-start-btn').style.display = "block";
            document.getElementById('mission-board-btn').style.display = "none";
            document.getElementById('trang-nguyen-status').classList.add('hidden');
            if(currentChapterIndex > 0 || currentLessonIndex > 0) {
                document.getElementById('main-start-btn').innerHTML = '<span class="seal">Tiếp</span> Tiếp tục khoa cử';
            } else {
                document.getElementById('main-start-btn').innerHTML = '<span class="seal">Tân</span> Khởi hành khoa cử';
            }
        }

        document.getElementById('login-btn').style.display = "none"; document.getElementById('profile-btn').style.display = "block"; document.getElementById('logout-btn').style.display = "block";
        if (currentUserRole === 'admin') document.getElementById('admin-panel-btn').style.display = "block"; else document.getElementById('admin-panel-btn').style.display = "none";
    } else { document.getElementById('auth-msg').innerText = data.message; document.getElementById('auth-msg').style.color = "red"; }
});

window.logout = function() {
    currentUser = null; currentUserRole = 'user'; currentChapterIndex = 0; currentLessonIndex = 0; myRewards = []; mySkills = []; mySiKhi = 0; myMissionProgress = 0;
    document.getElementById('player-welcome').innerText = "Kính chào, khách vãng lai"; 
    
    document.getElementById('main-start-btn').style.display = "block";
    document.getElementById('main-start-btn').innerHTML = '<span class="seal">Tân</span> Khởi hành khoa cử';
    document.getElementById('mission-board-btn').style.display = "none";
    document.getElementById('trang-nguyen-status').classList.add('hidden');

    document.getElementById('login-btn').style.display = "block"; document.getElementById('profile-btn').style.display = "none"; document.getElementById('admin-panel-btn').style.display = "none"; document.getElementById('logout-btn').style.display = "none"; 
    document.getElementById('username').value = ''; document.getElementById('password').value = ''; document.getElementById('auth-msg').innerText = "Hãy xưng danh trước khi vào sới"; document.getElementById('auth-msg').style.color = "#4a2f18";
};

window.saveProgress = function(chapter, lesson) { if (currentUser) socket.emit('save_progress', { chapter, lesson, rewards: myRewards, skills: mySkills, sikhi: mySiKhi, mission: myMissionProgress }); };
window.unlockReward = function(rewardName) { if (!myRewards.includes(rewardName)) { myRewards.push(rewardName); window.saveProgress(currentChapterIndex, currentLessonIndex); } };
window.unlockSkill = function(skillName) { if (!mySkills.includes(skillName)) { mySkills.push(skillName); window.saveProgress(currentChapterIndex, currentLessonIndex); updateSkillUI(); } };

const REWARD_ICONS = { "Bộ cờ ngọc bích": "🟢", "Áo giao lĩnh": "👘", "Bộ cờ khảm xà cừ": "🐚", "Mũ cánh chuồn": "🎓", "Áo bào đỏ": "🧧" };
window.openProfile = function() {
    if (!currentUser) return alert("Vui lòng xưng danh trước!");
    document.getElementById('prof-username').innerText = currentUser;
    let danhHieu = currentUserRole === 'admin' ? "Khâm sai tổng quản" : "Thư sinh";
    if (currentUserRole !== 'admin') { if (currentChapterIndex === 1) danhHieu = "Tú tài"; if (currentChapterIndex === 2) danhHieu = "Cử nhân"; if (currentChapterIndex >= 3) danhHieu = "Trạng nguyên"; }
    document.getElementById('prof-title').innerText = danhHieu; document.getElementById('prof-chapter').innerText = currentChapterIndex >= 4 ? "Đã xuất các" : currentChapterIndex + 1;
    document.getElementById('prof-lesson').innerText = currentChapterIndex >= 4 ? "Hành tẩu" : currentLessonIndex + 1;
    
    const gridEl = document.getElementById('prof-rewards-grid'); gridEl.innerHTML = ''; 
    for (let i = 0; i < 5; i++) {
        let slot = document.createElement('div');
        if (myRewards && i < myRewards.length) { let rwName = myRewards[i]; slot.className = 'inventory-slot'; slot.innerText = REWARD_ICONS[rwName] || "🎁"; slot.title = rwName; 
        } else { slot.className = 'inventory-slot empty'; } gridEl.appendChild(slot);
    }
    document.getElementById('pwd-msg').innerText = ""; document.getElementById('old-pwd').value = ""; document.getElementById('new-pwd').value = ""; document.getElementById('profile-screen').classList.remove('hidden');
};
window.closeProfile = function() { document.getElementById('profile-screen').classList.add('hidden'); };
window.attemptChangePassword = function() { const oldP = document.getElementById('old-pwd').value; const newP = document.getElementById('new-pwd').value; if (!oldP || !newP) return alert("Vui lòng nhập đủ khẩu quyết cũ và mới!"); socket.emit('change_password', { oldPassword: oldP, newPassword: newP }); };
socket.on('change_password_response', (data) => { const msgEl = document.getElementById('pwd-msg'); msgEl.innerText = data.message; msgEl.style.color = data.success ? "green" : "red"; if (data.success) { document.getElementById('old-pwd').value = ""; document.getElementById('new-pwd').value = ""; } });

// ==========================================
// NHA MÔN QUẢN SỰ (ADMIN PANEL)
// ==========================================
window.openAdminPanel = function() { if (currentUserRole !== 'admin') return; document.getElementById('admin-screen').classList.remove('hidden'); socket.emit('admin_fetch_users'); };
window.closeAdminPanel = function() { document.getElementById('admin-screen').classList.add('hidden'); };
socket.on('admin_refresh_data', () => { if (currentUserRole === 'admin' && !document.getElementById('admin-screen').classList.contains('hidden')) { socket.emit('admin_fetch_users'); } });
socket.on('admin_users_list', (data) => {
    const { users, limit } = data; document.getElementById('admin-current-limit').innerText = limit;
    const pendingBody = document.getElementById('admin-pending-body'); const officialBody = document.getElementById('admin-table-body');
    pendingBody.innerHTML = ''; officialBody.innerHTML = ''; let hasPending = false;
    users.forEach(u => {
        if (u.status === 'pending') { hasPending = true; pendingBody.innerHTML += `<tr><td style="padding: 8px;"><strong>${u.username}</strong></td><td style="padding: 8px;"><button class="admin-action-btn" style="background:#1a5e20;" onclick="adminApprove('${u.username}')">Chuẩn y</button> <button class="admin-action-btn danger" onclick="adminReject('${u.username}')">Bác bỏ</button></td></tr>`; } 
        else {
            let chucVu = u.role === 'admin' ? '<strong style="color:#b30000;">Tổng quản</strong>' : 'Kỳ thủ'; let phongTuocTxt = u.role === 'admin' ? 'Giáng chức' : 'Phong tước'; let btnDisabled = u.username === 'admin' ? 'disabled style="opacity: 0.5;"' : ''; 
            officialBody.innerHTML += `<tr><td style="padding: 8px;"><strong>${u.username}</strong></td><td style="padding: 8px;">Chương ${u.chapter + 1}</td><td style="padding: 8px;">${chucVu}</td><td style="padding: 8px;"><button class="admin-action-btn" ${btnDisabled} onclick="adminChangePwd('${u.username}')">Ban KQ</button> <button class="admin-action-btn" ${btnDisabled} onclick="adminToggleRole('${u.username}', '${u.role}')">${phongTuocTxt}</button> <button class="admin-action-btn danger" ${btnDisabled} onclick="adminDelete('${u.username}')">Trục xuất</button></td></tr>`;
        }
    });
    if (!hasPending) pendingBody.innerHTML = `<tr><td colspan="2" style="padding: 10px; color: #888;">Không có hồ sơ nào chờ duyệt.</td></tr>`;
});
window.adminUpdateLimit = function() { const val = document.getElementById('admin-limit-input').value; if (val && parseInt(val) > 0) socket.emit('admin_set_limit', val); };
window.adminApprove = function(username) { socket.emit('admin_approve_user', username); };
window.adminReject = function(username) { if (confirm(`Thiêu rụi hồ sơ của [${username}]?`)) socket.emit('admin_reject_user', username); };
window.adminDelete = function(username) { if (confirm(`Trục xuất [${username}] khỏi cõi này?`)) socket.emit('admin_delete_user', { username }); };
window.adminToggleRole = function(username, currentRole) { let hoi = currentRole === 'admin' ? `Giáng chức [${username}]?` : `Phong tổng quản cho [${username}]?`; if (confirm(hoi)) socket.emit('admin_toggle_role', { username, currentRole }); };
window.adminChangePwd = function(username) { let newPwd = prompt(`Ban khẩu quyết mới cho [${username}]:`, "123456"); if (newPwd && newPwd.trim() !== "") socket.emit('admin_force_password', { username, newPassword: newPwd }); };
socket.on('admin_action_success', (msg) => { alert(msg); });

// ==========================================
// PVP (ĐÌNH LƯỢC QUẦN HÙNG)
// ==========================================
window.openPvPMenu = function() { if (!currentUser) { document.getElementById('auth-msg').innerText = "Cần xưng danh để khai sới đấu mạng!"; document.getElementById('auth-msg').style.color = "#8b3a3a"; window.openAuth(); return; } document.getElementById('pvp-screen').classList.remove('hidden'); document.getElementById('pvp-menu-state').classList.remove('hidden'); document.getElementById('pvp-waiting-state').classList.add('hidden'); };
window.closePvPMenu = function() { document.getElementById('pvp-screen').classList.add('hidden'); };
window.lapSoi = function() { socket.emit('lap_soi'); };
window.nhapSoi = function() { const lenhBai = document.getElementById('lenh-bai-input').value.trim(); if (!lenhBai) return alert("Hảo hán chưa nhập lệnh bài!"); socket.emit('nhap_soi', lenhBai); };

socket.on('soi_created', (lenhBai) => { currentLenhBai = lenhBai; myPvPPlayerNum = 1; document.getElementById('pvp-menu-state').classList.add('hidden'); document.getElementById('pvp-waiting-state').classList.remove('hidden'); document.getElementById('lenh-bai-display').innerText = lenhBai; });
socket.on('soi_error', (msg) => { alert(msg); });

socket.on('soi_ready', (data) => {
    window.closePvPMenu(); document.getElementById('start-screen').classList.add('hidden');
    isPvPMode = true; isFreePlay = false; isExamMode = false; isGiangHoMode = false; isStoryMode = false; currentLenhBai = data.lenhBai; 
    document.getElementById('leave-btn').innerHTML = '&#10094; Rời sới';
    const boardElement = document.getElementById('board');
    if (myPvPPlayerNum === 1) { opponentName = data.p2_name; boardElement.classList.remove('board-flipped'); } 
    else { myPvPPlayerNum = 2; opponentName = data.p1_name; boardElement.classList.add('board-flipped'); }
    setTimeout(() => {
        document.getElementById('game-screen').classList.remove('hidden'); gameScreen.className = 'screen free-play-mode'; weatherEffect.style.display = "none"; document.getElementById('skill-bar-container').classList.add('hidden');
        gameState = [ [2, 2, 2, 2, 2], [2, 0, 0, 0, 2], [2, 0, 0, 0, 1], [1, 0, 0, 0, 1], [1, 1, 1, 1, 1] ];
        currentPlayer = 1; moveCount = 0; isPaused = false; selectedPiece = null; showHint = false; lastMoveData = null; historyStates = []; activeSkill = 0;
        chapterTitle.innerText = `Sới cờ: ${currentLenhBai}`; instTitle.innerText = "Trọng tài:";
        instText.innerText = myPvPPlayerNum === 1 ? `Ngươi cầm Hỏa kỳ. Kẻ địch là [${opponentName}]. Ngươi đi trước!` : `Ngươi cầm Bạch kỳ. Kẻ địch là [${opponentName}]. Chờ Hỏa kỳ đi trước!`;
        if (prevBtn) prevBtn.classList.add('hidden'); nextBtn.classList.add('hidden'); instructionBox.classList.remove('collapsed'); stopTimer(); drawLines(); renderNodes(); renderPieces(); updateStatusText(); updatePieceCount();
    }, 600);
});
socket.on('nhan_nuoc_di', (data) => { executeMove(data.r1, data.c1, data.r2, data.c2, true); });
socket.on('doi_thu_dao_tau', () => { if (isPvPMode) { isPaused = true; showFeedback(`Tên [${opponentName}] đã bỏ chạy! Ngươi thắng trận!`, true); nextBtn.innerText = "Rời sới"; } });

// ==========================================
// CỐT TRUYỆN VÀ 27 ẢI GIANG HỒ
// ==========================================
window.openMissionsFromVictory = function() { document.getElementById('victory-screen').classList.add('hidden'); window.openMissions(); };
window.openMissions = function() {
    document.getElementById('missions-screen').classList.remove('hidden');
    const grid = document.getElementById('missions-grid'); grid.innerHTML = '';
    for(let i = 0; i < 27; i++) {
        let btn = document.createElement('button');
        if (i <= myMissionProgress) {
            btn.className = 'mission-btn'; btn.innerText = `${i+1}`;
            btn.onclick = () => { window.closeMissions(); window.loadMission(i); };
        } else { btn.className = 'mission-btn locked-mission'; btn.innerText = `🔒`; }
        grid.appendChild(btn);
    }
};
window.closeMissions = function() { 
    document.getElementById('missions-screen').classList.add('hidden'); 
    document.getElementById('start-screen').classList.remove('hidden');
};

const chapters = [
    [
        { title: "Bài 1: Nhận diện sa bàn", master: "Thầy đồ:", text: "Bàn cờ có 25 giao điểm. Mỗi bên nắm 8 quân cờ.", board: [ [2, 2, 2, 2, 2], [2, 0, 0, 0, 2], [2, 0, 0, 0, 1], [1, 0, 0, 0, 1], [1, 1, 1, 1, 1] ], interaction: false },
        { title: "Bài 2: Bước đi đầu tiên", master: "Thầy đồ:", text: "Di chuyển quân Đỏ lên trên 1 bước.", board: [ [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 1, 0, 0], [0, 0, 0, 0, 0] ], interaction: true, hint: { sr: 3, sc: 2, er: 2, ec: 2 }, onMove: (gained, r, c) => { if (r === 2 && c === 2) showFeedback("Rất tốt!", true); else showFeedback("Sai rồi!", false); } },
        { title: "Bài 3: Tuyệt kỹ gánh", master: "Thầy đồ:", text: "Đưa quân Đỏ vào chính giữa 2 quân Trắng để 'Gánh'!", board: [ [0, 0, 0, 0, 0], [0, 2, 0, 2, 0], [0, 0, 1, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0] ], interaction: true, hint: { sr: 2, sc: 2, er: 1, ec: 2 }, onMove: (gained, r, c) => { if (gained > 0) showFeedback("Tuyệt đỉnh!", true); else showFeedback("Chưa được.", false); } },
        { title: "Bài 4: Nhãn quan chiến thuật", master: "Thầy đồ:", text: "Lấp ngay vào điểm trống để chặn địch gánh!", board: [ [0, 0, 0, 0, 0], [0, 0, 2, 0, 0], [0, 1, 0, 1, 0], [0, 0, 1, 0, 0], [0, 0, 0, 0, 0] ], interaction: true, hint: { sr: 3, sc: 2, er: 2, ec: 2 }, onMove: (gained, r, c) => { if (r === 2 && c === 2) showFeedback("Nhãn quan nhạy bén!", true); else { gameState[2][2] = 2; gameState[1][2] = 0; gameState[2][1] = 2; gameState[2][3] = 2; renderPieces(); showFeedback("Trễ rồi! Quân địch đã lao xuống gánh.", false); } } },
        { title: "Khảo hạch khai tâm", master: "Tí sún & Tèo nọng:", text: "Đánh bại 2 tên đồng môn. Tối đa 40 nước đi.", board: [ [2, 2, 2, 2, 2], [2, 0, 0, 0, 2], [2, 0, 0, 0, 1], [1, 0, 0, 0, 1], [1, 1, 1, 1, 1] ], interaction: true, isExam: true, botLevel: "easy" }
    ],
    [
        { title: "Bài 5: Bức tường thép", master: "Quan huyện:", text: "Khi địch bị bao vây không còn đường lui sẽ bị 'Chẹt'.", board: [ [0, 0, 1, 0, 0], [0, 1, 2, 1, 0], [0, 0, 0, 1, 0], [0, 0, 1, 0, 0], [0, 0, 0, 0, 0] ], interaction: true, hint: { sr: 3, sc: 2, er: 2, ec: 2 }, onMove: (gained, r, c) => { clearExplanationHighlights(); if (r === 2 && c === 2) { showFeedback("Khá khen! Chúng bị 'Chẹt'.", true); } else showFeedback("Vẫn còn lỗ hổng!", false); } },
        { title: "Bài 6: Khổ nhục kế", master: "Quan huyện:", text: "Cố tình lùi quân Đỏ ở tâm (3,2) về sau 1 bước để dụ địch lao vào!", board: [ [0, 0, 0, 0, 0], [0, 0, 2, 0, 0], [0, 1, 2, 0, 0], [0, 1, 1, 1, 0], [0, 0, 0, 0, 0] ], interaction: true, hint: { sr: 3, sc: 2, er: 4, ec: 2 }, onMove: (gained, r, c) => { clearExplanationHighlights(); if (r === 4 && c === 2) { gameState[2][2] = 0; gameState[3][2] = 2; gameState[3][1] = 2; gameState[3][3] = 2; renderPieces(); showFeedback("Địch sập bẫy! Kế tiếp chỉ cần đẩy quân Đỏ mai phục sang ngang để gánh ngược lại!", true); highlightForExplanation([{r:3, c:1}, {r:3, c:2}, {r:3, c:3}], 'explain-trap'); highlightForExplanation([{r:2, c:1}], 'explain-highlight'); } else showFeedback("Chưa đúng.", false); } },
        { title: "Bài 7: Giải thế cờ tàn", master: "Quan huyện:", text: "Đẩy ngang quân Đỏ mai phục vào giữa để gánh ngược lại 2 quân Trắng!", board: [ [0, 0, 0, 0, 0], [0, 0, 2, 0, 0], [0, 1, 0, 0, 0], [0, 2, 2, 2, 0], [0, 0, 1, 0, 0] ], interaction: true, hint: { sr: 2, sc: 1, er: 2, ec: 2 }, onMove: (gained, r, c) => { clearExplanationHighlights(); if (r === 2 && c === 2 && gained >= 2) { showFeedback("Tuyệt mĩ! Đã gánh ngược thành công.", true); highlightForExplanation([{r:2, c:2}], 'explain-highlight'); highlightForExplanation([{r:1, c:2}, {r:3, c:2}], 'explain-trap'); } else showFeedback("Sai lầm!", false); } },
        { title: "Bài 8: Đội hình cự mã", master: "Quan huyện:", text: "Lùi quân Đỏ đang lạc lõng thẳng xuống sát đồng đội để tạo khối phòng thủ!", board: [ [0, 0, 0, 0, 0], [0, 0, 1, 0, 0], [0, 2, 0, 0, 0], [0, 0, 1, 1, 0], [0, 0, 1, 1, 0] ], interaction: true, hint: { sr: 1, sc: 2, er: 2, ec: 2 }, onMove: (gained, r, c) => { clearExplanationHighlights(); if (r === 2 && c === 2) { showFeedback("Cụm Đỏ đã liên kết vững chắc.", true); highlightForExplanation([{r:2, c:2}, {r:3, c:2}, {r:3, c:3}, {r:4, c:2}, {r:4, c:3}], 'explain-highlight'); } else showFeedback("Vẫn còn sơ hở!", false); } },
        { title: "Kỳ thi hương", master: "Giám khảo:", text: "Hạ gục 3 sĩ tử xuất sắc nhất châu.", board: [ [2, 2, 2, 2, 2], [2, 0, 0, 0, 2], [2, 0, 0, 0, 1], [1, 0, 0, 0, 1], [1, 1, 1, 1, 1] ], interaction: true, isExam: true, botLevel: "medium" }
    ],
    [
        { title: "Bài 9: Gánh liên hoàn", master: "Chủ khảo:", text: "Đưa quân Đỏ vào tâm (2,2) để gánh cùng lúc 4 quân Trắng!", board: [ [0, 0, 0, 0, 0], [0, 2, 0, 2, 0], [0, 0, 0, 1, 0], [0, 2, 0, 2, 0], [0, 0, 0, 0, 0] ], interaction: true, hint: { sr: 2, sc: 3, er: 2, ec: 2 }, onMove: (gained, r, c) => { if (r === 2 && c === 2 && gained === 4) showFeedback("Sức mạnh kinh hồn!", true); else showFeedback("Sai nước rồi!", false); } },
        { title: "Bài 10: Tương kế tựu kế", master: "Chủ khảo:", text: "Đừng sập bẫy mở! Hãy dùng quân Đỏ góc trái 'Chẹt' tên mai phục (0,2) lại!", board: [ [0, 0, 2, 1, 0], [0, 1, 1, 1, 0], [0, 2, 0, 2, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0] ], interaction: true, hint: { sr: 0, sc: 0, er: 0, ec: 1 }, onMove: (gained, r, c) => { clearExplanationHighlights(); if (r === 0 && c === 1 && gained >= 1) { showFeedback("Kế trong kế! Đối thủ đã tự đào mồ chôn mình.", true); } else { if(r === 2 && c === 2) { gameState[1][2] = 0; gameState[0][2] = 0; gameState[1][2] = 2; gameState[1][1] = 2; gameState[1][3] = 2; renderPieces(); showFeedback("Sập bẫy rồi! Tên mai phục đã gánh ngược lại.", false); } else showFeedback("Chưa chẹt được địch.", false); } } },
        { title: "Bài 11: Kiểm soát trung nguyên", master: "Chủ khảo:", text: "Di chuyển quân Đỏ chiếm lĩnh điểm tứ tượng (1,1) đang trống!", board: [ [0, 0, 0, 0, 0], [0, 0, 0, 1, 0], [0, 0, 1, 0, 0], [0, 1, 0, 1, 0], [0, 1, 0, 0, 0] ], interaction: true, hint: { sr: 2, sc: 2, er: 1, ec: 1 }, onMove: (gained, r, c) => { if (r === 1 && c === 1) showFeedback("Kẻ nắm giữ tứ tượng dễ dàng công thủ toàn diện.", true); else showFeedback("Sai điểm then chốt.", false); } },
        { title: "Bài 12: Đấu trí tốc độ", master: "Chủ khảo:", text: "Chỉ có 10 giây để tìm ra nước gánh giải vây!", board: [ [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 2, 0, 2, 0], [0, 0, 1, 0, 0], [0, 0, 0, 0, 0] ], interaction: true, hint: { sr: 3, sc: 2, er: 2, ec: 2 }, timeLimit: 10, onMove: (gained, r, c) => { if (r === 2 && c === 2 && gained >= 2) showFeedback("Thần tốc cản phá!", true); else showFeedback("Sai lầm!", false); } },
        { title: "Kỳ thi hội", master: "Chủ khảo:", text: "Chỉ có 15 giây suy nghĩ mỗi nước đi.", board: [ [2, 2, 2, 2, 2], [2, 0, 0, 0, 2], [2, 0, 0, 0, 1], [1, 0, 0, 0, 1], [1, 1, 1, 1, 1] ], interaction: true, isExam: true, botLevel: "easy", timeLimit: 15, isRainy: true }
    ],
    [
        { title: "Bài 13: Xoay chuyển càn khôn", master: "Hoàng đế:", text: "Tận dụng khe hở duy nhất để lật ngược thế cờ!", board: [ [0, 2, 2, 2, 0], [2, 2, 0, 2, 2], [0, 2, 0, 2, 0], [0, 1, 1, 2, 0], [0, 0, 1, 1, 0] ], interaction: true, hint: { sr: 3, sc: 2, er: 2, ec: 2 }, onMove: (gained, r, c) => { if (r === 2 && c === 2 && gained >= 4) showFeedback("Hay lắm! Một nhát gươm đâm thủng vạn quân địch.", true); else showFeedback("Nước cờ vô dụng, tử trận!", false); } },
        { title: "Bài 14: Mượn địa hình", master: "Hoàng đế:", text: "Mượn thế địa hình (đá nứt) để 'Chẹt' kín đường lui của địch!", board: [ [0, 0, 0, 0, 0], [0, 0, 2, 1, 0], [0, 0, 0, 0, 0], [0, 0, 1, 0, 0], [0, 0, 0, 0, 0] ], blocked: [{r: 0, c: 2}, {r: 1, c: 1}], interaction: true, hint: { sr: 3, sc: 2, er: 2, ec: 2 }, onMove: (gained, r, c) => { if (r === 2 && c === 2 && gained >= 1) showFeedback("Tuyệt vời! Lợi dụng chướng ngại vật để làm tường chặn địch.", true); else showFeedback("Chưa chẹt được!", false); } },
        { title: "Bài 15: Tâm tĩnh như nước", master: "Hoàng đế:", text: "Mù hoàn toàn hướng dẫn. Tìm ra điểm gánh 2 quân Trắng!", board: [ [0, 0, 0, 0, 0], [0, 0, 2, 0, 0], [0, 0, 0, 1, 0], [0, 0, 2, 0, 0], [0, 0, 0, 0, 0] ], blindMode: true, interaction: true, onMove: (gained, r, c) => { if (r === 2 && c === 2 && gained >= 2) showFeedback("Tâm tựa minh cảnh, vô chiêu thắng hữu chiêu!", true); else showFeedback("Tâm còn động, cờ còn loạn. Thử lại!", false); } },
        { title: "Bán kết", master: "Tể tướng:", text: "Vượt qua lão phu để diện kiến thánh thượng.", board: [ [2, 2, 2, 2, 2], [2, 0, 0, 0, 2], [2, 0, 0, 0, 1], [1, 0, 0, 0, 1], [1, 1, 1, 1, 1] ], blocked: [{r:2, c:1}, {r:2, c:3}], interaction: true, isExam: true, botLevel: "very_hard" },
        { title: "Chung kết", master: "Hoàng đế:", text: "Trẫm đọc trước vạn bước cờ! Chiếu tướng đi!", board: [ [2, 2, 2, 2, 2], [2, 0, 0, 0, 2], [2, 0, 0, 0, 1], [1, 0, 0, 0, 1], [1, 1, 1, 1, 1] ], interaction: true, isExam: true, botLevel: "emperor" }
    ]
];

const storyTexts = [
    "Vừa nhậm chức tuần phủ, ngươi nghe báo có tên ác bá cậy quyền chiếm đoạt ruộng đất. Hãy trừng trị hắn!",
    "Một vụ án oan sai chưa có lời giải. Tri phủ hạt này cản trở điều tra, hắn đang giấu giếm điều gì?",
    "Phát hiện sổ sách thu thuế bị làm giả. Bọn nha lại tham ô định tẩu thoát, mau chặn chúng lại!",
    "Thổ hào địa phương cấu kết quan lại, lập sới bạc lừa dân. Đập tan sới bạc này!",
    "Hàng cứu trợ thiên tai bị tuồn ra chợ đen. Lần theo dấu vết, ngươi đụng độ tay sai của thương nhân gian xảo.",
    "Hồng môn yến! Bọn tham quan giả vờ mời ngươi dự tiệc nhưng đã mai phục sẵn đao phủ.",
    "Thích khách lọt vào nha môn ban đêm định ám sát ngươi bị diệt khẩu. Truy đuổi kẻ đứng sau!",
    "Bằng chứng tham nhũng được giấu trong mật thất. Phá giải cơ quan để đoạt lấy sổ sách.",
    "Chân tướng phơi bày! Tổng đốc vùng này chính là kẻ chủ mưu. Hắn điên cuồng vây bắt ngươi, liều chết mở đường đi!",
    "Biên cương vỡ lở, giặc ngoại bang tràn vào. Ngươi lĩnh ấn tiên phong, chặn đánh toán trinh sát của giặc.",
    "Sơn tặc mượn cớ loạn lạc nổi lên cướp bóc. Đột kích sơn trại, giải cứu con tin.",
    "Quân giặc chiếm được trạm gác đèo. Mượn sương mù, đem quân đánh úp đoạt lại đèo.",
    "Lương thảo của ta bị phục kích. Lập thế cự mã, bảo vệ lương thảo đến cùng!",
    "Phát hiện gian tế trà trộn trong quân. Hắn định phá hầm vũ khí, mau bắt sống!",
    "Quân địch đông gấp bội vây hãm tòa thành hoang. Ngươi chỉ có tàn quân, tử thủ chờ viện binh.",
    "Tiên phong địch dũng mãnh, thách thức trước trận. Dùng mưu kế dụ địch vào ổ mai phục.",
    "Đêm khuya tập kích doanh trại giặc, đốt lương thảo để làm giảm sĩ khí chúng.",
    "Tuyệt cốc! Ta bị vây khốn trên đỉnh núi. Tình thế ngàn cân treo sợi tóc, chỉ còn cách tử chiến mở đường máu!",
    "Kinh thành biến loạn! Nhận được mật thư, lão tể tướng đã khởi binh làm phản.",
    "Cửa ô bị phản quân phong tỏa. Ngươi dùng lính tinh nhuệ giả trang để lọt qua cổng thành.",
    "Trên đường vào cung, đụng độ toán ám vệ của tể tướng. Chúng ra tay tàn độc, không để lại người sống.",
    "Cứu trung thần! Thượng thư bộ binh bị giam lỏng tại phủ, giải vây để mượn binh phù.",
    "Đường hầm bí mật vào hoàng cung bị phát hiện. Chặn đứng hắc y nhân phá hầm.",
    "Quảng trường Thái Hòa! Quân phản loạn đông như kiến, ta phải từng bước dọn sạch để tiến vào.",
    "Tướng quân phản thần trấn giữ điện Càn Thanh. Hắn thề chết bảo vệ chủ tử, hạ gục hắn!",
    "Bên trong điện, lão tể tướng uy hiếp hoàng đế. Tuyệt cảnh ta ít địch nhiều, không còn đường lui.",
    "Quyết chiến cuối cùng! Lão tể tướng tung toàn bộ ám vệ xuất trận. Phá vỡ vòng vây, trảm phản tặc, hộ quốc cứu giá!"
];

const giangHoMissions = [];
for (let i = 0; i < 27; i++) {
    let chapName = i < 9 ? "Thượng lược (Quan trường)" : (i < 18 ? "Trung lược (Biên ải)" : "Hạ lược (Cứu giá)");
    let aiLvl = i < 5 ? "easy" : (i < 12 ? "medium" : (i < 20 ? "hard" : (i < 25 ? "very_hard" : "emperor")));
    let b = [ [2,2,2,2,2], [2,0,0,0,2], [0,0,0,0,0], [1,0,0,0,1], [1,1,1,1,1] ]; let blocked = [];
    if (i < 9) {
        b[2][0] = 2; b[2][4] = 1; // 8v8
        if (i >= 3) { b[3][0] = 0; b[1][0] = 2; } // 7v9
        if (i >= 6) { blocked.push({r:2, c:2}); } 
    } else if (i < 18) {
        b = [ [2,2,2,2,2], [2,2,0,2,2], [0,0,0,0,0], [0,1,0,1,0], [1,1,1,0,0] ]; // 5v10
        if (i >= 12) { blocked.push({r:2, c:1}, {r:2, c:3}); }
        if (i >= 15) { blocked.push({r:3, c:0}, {r:3, c:4}); }
    } else {
        b = [ [2,2,2,2,2], [2,2,2,2,2], [2,0,0,0,2], [0,0,1,0,0], [0,1,0,1,0] ]; // 3v12
        if (i >= 21) { blocked.push({r:2, c:2}, {r:3, c:2}); }
        if (i >= 24) { blocked.push({r:4, c:0}, {r:4, c:4}); }
    }
    giangHoMissions.push({
        title: `Ải ${i+1} - ${chapName}`, master: "Mật thư:",
        story: storyTexts[i], board: b, blocked: blocked, botLevel: aiLvl, isExam: true
    });
}

function getCurrentLessonData() {
    if (isFreePlay || isPvPMode || isGiangHoMode || currentChapterIndex >= chapters.length) return null;
    return chapters[currentChapterIndex][currentLessonIndex];
}

// ==========================================
// CÁC HÀM UI & KỸ NĂNG (SKILLS)
// ==========================================
function highlightForExplanation(coordsArr, type = 'explain-highlight') { coordsArr.forEach(c => { let visual_r = (isPvPMode && myPvPPlayerNum === 2) ? 4 - c.r : c.r; let visual_c = (isPvPMode && myPvPPlayerNum === 2) ? 4 - c.c : c.c; let pEl = document.querySelector(`.piece[data-vr="${visual_r}"][data-vc="${visual_c}"]`); if(pEl) pEl.classList.add(type); }); }
function clearExplanationHighlights() { document.querySelectorAll('.explain-highlight, .explain-trap').forEach(el => el.classList.remove('explain-highlight', 'explain-trap')); }

function updateSkillUI() {
    let sikhiDisplay = document.getElementById('sikhi-display');
    if(sikhiDisplay) sikhiDisplay.innerText = mySiKhi;
    const skillsConfig = [ { id: 1, name: "Thiên lý nhãn", cost: 5 }, { id: 2, name: "Hồi tố", cost: 8 }, { id: 3, name: "Ám khí", cost: 15 }, { id: 4, name: "Độn thổ", cost: 20 } ];
    skillsConfig.forEach(sk => {
        let btn = document.getElementById(`skill-btn-${sk.id}`);
        if (!btn) return;
        if (mySkills.includes(sk.name)) {
            if (mySiKhi >= sk.cost) { btn.classList.remove('locked'); btn.classList.add('ready'); } 
            else { btn.classList.add('locked'); btn.classList.remove('ready'); }
        } else { btn.classList.add('locked'); btn.classList.remove('ready'); }
    });
}

function showSkillMsg(text, isSuccess) {
    feedbackText.innerText = text; feedbackText.style.color = isSuccess ? "#1a5e20" : "#b30000";
    instructionBox.classList.remove('collapsed');
}

window.useSkill = function(skillId) {
    if(isPaused || isPvPMode || isStoryMode) return; 
    let cost = 0; let skillName = "";
    if(skillId === 1) { cost = 5; skillName = "Thiên lý nhãn"; }
    if(skillId === 2) { cost = 8; skillName = "Hồi tố"; }
    if(skillId === 3) { cost = 15; skillName = "Ám khí"; }
    if(skillId === 4) { cost = 20; skillName = "Độn thổ"; }

    if(!mySkills.includes(skillName)) return showSkillMsg("Chưa lĩnh ngộ tuyệt kỹ này!", false);
    if(mySiKhi < cost) return showSkillMsg(`Không đủ sĩ khí! Cần ${cost} điểm.`, false);
    if(currentPlayer !== 1) return showSkillMsg("Chỉ được xuất chiêu trong lượt của mình!", false);

    if(skillId === 1) {
        mySiKhi -= cost; let bestMove = getBestPlayerMove();
        if(bestMove) { highlightForExplanation([{r:bestMove.r1, c:bestMove.c1}, {r:bestMove.r2, c:bestMove.c2}], 'explain-highlight'); showSkillMsg("Thiên lý nhãn: Đã điểm huyệt nước đi vi diệu!", true); }
    } else if(skillId === 2) {
        if(historyStates.length < 2) return showSkillMsg("Không thể lùi thêm thời không!", false);
        mySiKhi -= cost; historyStates.pop(); gameState = JSON.parse(historyStates.pop()); moveCount = Math.max(0, moveCount - 1);
        renderPieces(); updatePieceCount(); showSkillMsg("Hồi tố: Đã xoay chuyển thời không!", true);
    } else if(skillId === 3) {
        activeSkill = 3; gameScene.classList.add('using-skill-cursor'); showSkillMsg("Ám khí: Chọn 1 quân địch để tiễu trừ!", true);
    } else if(skillId === 4) {
        activeSkill = 4; selectedPiece = null; gameScene.classList.add('using-skill-cursor'); showSkillMsg("Độn thổ: Chọn quân ta rồi bấm vào ô trống bất kỳ!", true);
    }
    updateSkillUI(); window.saveProgress(currentChapterIndex, currentLessonIndex);
};

// ==========================================
// ĐIỀU HƯỚNG & QUẢN LÝ THỜI GIAN
// ==========================================
function startTimer(seconds) {
    clearInterval(timerInterval); maxTime = seconds; timeLeft = seconds; timerContainer.classList.remove('hidden');
    timerBar.style.transition = "none"; timerBar.style.width = "100%"; timerBar.classList.remove('warning');
    setTimeout(() => {
        timerBar.style.transition = "width 0.1s linear, background-color 0.5s";
        timerInterval = setInterval(() => {
            if (!isPaused && !isStoryMode) {
                timeLeft -= 0.1; let percentage = (timeLeft / maxTime) * 100; timerBar.style.width = percentage + "%";
                if (timeLeft <= 5) timerBar.classList.add('warning');
                if (timeLeft <= 0) { clearInterval(timerInterval); timerBar.style.width = "0%"; handleTimeout(); }
            }
        }, 100);
    }, 50);
}
function stopTimer() { clearInterval(timerInterval); timerContainer.classList.add('hidden'); timerBar.style.transition = "none"; }
function handleTimeout() { currentPlayer = 2; showFeedback("Hết giờ! Bạn đã bị loại.", false); }

window.toggleSettings = function() { const menu = document.getElementById('settings-menu'); if (menu) menu.classList.toggle('hide-menu'); };
window.toggleAiMenu = function() { const aiMenu = document.getElementById('ai-menu'); if (aiMenu) aiMenu.classList.toggle('hidden-sub'); };
window.toggleMusic = function() {
    const volumeSlider = document.getElementById('volume-slider'); const volumeIcon = document.getElementById('volume-icon');
    if (!bgMusic) return;
    if (bgMusic.paused || bgMusic.volume === 0) {
        bgMusic.play().catch(() => {}); isMusicPlaying = true;
        if (muteBtn) { muteBtn.innerHTML = "&#127925; Tắt nhạc"; muteBtn.classList.remove('muted'); }
        if (volumeSlider && volumeSlider.value == 0) volumeSlider.value = 1; bgMusic.volume = volumeSlider ? volumeSlider.value : 1;
        if (volumeIcon) volumeIcon.innerHTML = bgMusic.volume < 0.5 ? "&#128265;" : "&#128266;";
    } else { bgMusic.pause(); isMusicPlaying = false; if (muteBtn) { muteBtn.innerHTML = "&#128263; Bật nhạc"; muteBtn.classList.add('muted'); } }
};
window.changeVolume = function() {
    const volumeSlider = document.getElementById('volume-slider'); const volumeIcon = document.getElementById('volume-icon');
    if (!bgMusic) return; bgMusic.volume = volumeSlider.value;
    if (bgMusic.volume === 0) { volumeIcon.innerHTML = "&#128263;"; if (muteBtn) { muteBtn.innerHTML = "&#128263; Bật nhạc"; muteBtn.classList.add('muted'); } } 
    else { volumeIcon.innerHTML = bgMusic.volume < 0.5 ? "&#128265;" : "&#128266;"; if (muteBtn) { muteBtn.innerHTML = "&#127925; Tắt nhạc"; muteBtn.classList.remove('muted'); } if (bgMusic.paused) { bgMusic.play().catch(() => {}); isMusicPlaying = true; } }
};

window.togglePause = function() {
    isPaused = !isPaused; const pauseBtn = document.getElementById('pause-btn');
    if (isPaused) {
        if(pauseBtn) { pauseBtn.innerHTML = "&#9658; Tiếp tục"; pauseBtn.style.background = "linear-gradient(to bottom, #8b3a3a, #5c1e1e)"; }
        instructionBox.classList.remove('collapsed'); instTitle.innerText = "Hệ thống:"; instText.innerText = "Sới cờ đang tạm dừng."; feedbackText.innerText = "";
    } else {
        if(pauseBtn) { pauseBtn.innerHTML = "&#10074;&#10074; Tạm dừng"; pauseBtn.style.background = ""; }
        let masterName = "Trọng tài:";
        if (!isFreePlay && !isPvPMode) {
            if (isGiangHoMode) masterName = giangHoMissions[currentMissionIndex].master;
            else { const lData = getCurrentLessonData(); if (lData) masterName = lData.master; }
        }
        instTitle.innerText = masterName; instText.innerText = "Sới cờ tiếp tục!"; if(isExamMode && !isStoryMode) triggerAutoHideText();
    }
};

window.restartLesson = function() {
    isPaused = false; document.getElementById('pause-btn').innerHTML = "&#10074;&#10074; Tạm dừng"; document.getElementById('pause-btn').style.background = "";
    clearTimeout(hideTextTimeout); clearTimeout(aiTimeout); clearExplanationHighlights(); stopTimer();
    instructionBox.classList.remove('collapsed'); document.getElementById('settings-menu').classList.add('hide-menu'); 
    lastMoveData = null; activeSkill = 0; gameScene.classList.remove('using-skill-cursor');
    
    if (isPvPMode) { alert("Không thể thử lại trong lúc đấu mạng! Hãy rời sới."); return; }
    if (isFreePlay) window.startFreePlay(freePlayLevel); 
    else if (isGiangHoMode) window.loadMission(currentMissionIndex);
    else window.loadLesson(currentChapterIndex, currentLessonIndex);
};

window.goHome = function() {
    isPaused = true; isFreePlay = false; isPvPMode = false; lastMoveData = null; myPvPPlayerNum = 0; activeSkill = 0; gameScene.classList.remove('using-skill-cursor');
    clearTimeout(hideTextTimeout); clearTimeout(aiTimeout); clearExplanationHighlights(); stopTimer();
    if(bgMusic) { bgMusic.pause(); bgMusic.currentTime = 0; isMusicPlaying = false; }
    if(muteBtn) { muteBtn.innerHTML = "&#128263; Bật nhạc"; muteBtn.classList.add('muted'); }
    
    socket.emit('roi_soi'); document.getElementById('board').classList.remove('board-flipped'); 
    document.getElementById('settings-menu').classList.add('hide-menu'); document.getElementById('game-screen').classList.add('hidden');
    
    if (isGiangHoMode) {
        isGiangHoMode = false; window.openMissions();
    } else {
        setTimeout(() => { document.getElementById('start-screen').classList.remove('hidden'); }, 600);
    }
};

// ==========================================
// KHỞI TẠO BÀN CỜ VÀ LUỒNG GAME
// ==========================================
window.startGame = function() {
    if (!currentUser) { document.getElementById('auth-msg').innerText = "Cần xưng danh để lưu lại quá trình khoa cử!"; document.getElementById('auth-msg').style.color = "#8b3a3a"; window.openAuth(); return; }
    if (currentChapterIndex >= chapters.length) { window.openMissions(); return; } 
    
    document.getElementById('start-screen').classList.add('hidden');
    if(bgMusic) { bgMusic.play().then(() => { isMusicPlaying = true; muteBtn.innerHTML = "&#127925; Tắt nhạc"; muteBtn.classList.remove('muted'); }).catch(() => {}); }
    setTimeout(() => { document.getElementById('game-screen').classList.remove('hidden'); drawLines(); renderNodes(); window.loadLesson(currentChapterIndex, currentLessonIndex); }, 600);
};

window.startFreePlay = function(level) {
    isFreePlay = true; isPvPMode = false; isGiangHoMode = false; isStoryMode = false; freePlayLevel = level; myPvPPlayerNum = 0;
    isExamMode = true; isPaused = false; moveCount = 0; currentPlayer = 1; selectedPiece = null; showHint = false; lastMoveData = null; activeSkill = 0; historyStates = [];
    document.getElementById('board').classList.remove('board-flipped'); document.getElementById('leave-btn').innerHTML = '&#10094; Rời sới';
    document.getElementById('ai-menu').classList.add('hidden-sub'); document.getElementById('start-screen').classList.add('hidden');
    if(bgMusic && bgMusic.paused) { bgMusic.play().then(() => { isMusicPlaying = true; muteBtn.innerHTML = "&#127925; Tắt nhạc"; muteBtn.classList.remove('muted'); }).catch(() => {}); }
    
    setTimeout(() => {
        document.getElementById('game-screen').classList.remove('hidden'); gameScreen.className = 'screen free-play-mode'; 
        weatherEffect.style.display = "none"; gameScene.classList.add('exam-mode'); instructionBox.classList.add('exam-mode');
        document.getElementById('skill-bar-container').classList.remove('hidden');
        gameState = [ [2, 2, 2, 2, 2], [2, 0, 0, 0, 2], [2, 0, 0, 0, 1], [1, 0, 0, 0, 1], [1, 1, 1, 1, 1] ];
        let levelName = level === 'easy' ? "Nhập môn" : (level === 'medium' ? "Tinh anh" : "Cao thủ");
        chapterTitle.innerText = "Tỉ thí mộc nhân: " + levelName; instTitle.innerText = "Trọng tài:"; instText.innerText = "Sới cờ tự do bắt đầu!"; feedbackText.innerText = "";
        if (prevBtn) prevBtn.classList.add('hidden'); nextBtn.classList.add('hidden'); instructionBox.classList.remove('collapsed'); stopTimer(); 
        drawLines(); renderNodes(); renderPieces(); updateStatusText(); updatePieceCount(); triggerAutoHideText(); updateSkillUI();
    }, 600);
};

window.loadLesson = function(chapterIdx, lessonIdx) {
    // TỰ ĐỘNG CHỮA BỆNH KẸT DỮ LIỆU (AUTO-HEAL)
    // Nếu số bài học vượt quá số bài thực tế của chương, tự động nhảy sang chương tiếp theo
    if (chapterIdx < chapters.length && lessonIdx >= chapters[chapterIdx].length) {
        currentChapterIndex++;
        currentLessonIndex = 0;
        chapterIdx = currentChapterIndex;
        lessonIdx = currentLessonIndex;
        window.saveProgress(currentChapterIndex, currentLessonIndex);
    }

    // Nếu đã hoàn thành toàn bộ cốt truyện, mở thẳng 27 ải
    if (chapterIdx >= chapters.length) { 
        window.goHome(); 
        setTimeout(() => { window.openMissions(); }, 600);
        return; 
    }

    isFreePlay = false; isPvPMode = false; isGiangHoMode = false; isStoryMode = false; lastMoveData = null; myPvPPlayerNum = 0; activeSkill = 0; historyStates = [];
    document.getElementById('board').classList.remove('board-flipped'); document.getElementById('leave-btn').innerHTML = '&#10094; Rời sới';
    clearTimeout(aiTimeout); clearTimeout(hideTextTimeout); stopTimer();
    
    const lesson = chapters[chapterIdx][lessonIdx];
    
    let chapTitle = "";
    if (chapterIdx === 0) chapTitle = "Chương 1: Lớp vỡ lòng"; else if (chapterIdx === 1) chapTitle = "Chương 2: Thi hương"; else if (chapterIdx === 2) chapTitle = "Chương 3: Thi hội"; else chapTitle = "Chương 4: Thi đình";
    
    chapterTitle.innerText = chapTitle; instTitle.innerText = lesson.master; instText.innerText = lesson.text; feedbackText.innerText = ""; 
    clearExplanationHighlights();
    
    if (chapterIdx === 2 && lessonIdx === 1) lesson.board[0][0] = 1; 
    gameState = lesson.board.map(row => [...row]);
    if (lesson.blocked) lesson.blocked.forEach(b => gameState[b.r][b.c] = -1);

    currentPlayer = 1; selectedPiece = null; isExamMode = lesson.isExam || false; showHint = !lesson.blindMode; moveCount = 0; isPaused = false;
    instructionBox.classList.remove('collapsed'); gameScreen.className = `screen chapter-${chapterIdx + 1}`; 
    if (lesson.isRainy) weatherEffect.style.display = "block"; else weatherEffect.style.display = "none";
    if (lesson.blindMode) gameScene.classList.add('blind-mode'); else gameScene.classList.remove('blind-mode');

    if (isExamMode) { gameScene.classList.add('exam-mode'); instructionBox.classList.add('exam-mode'); document.getElementById('skill-bar-container').classList.remove('hidden'); triggerAutoHideText(); } 
    else { gameScene.classList.remove('exam-mode'); instructionBox.classList.remove('exam-mode'); document.getElementById('skill-bar-container').classList.add('hidden'); }

    drawLines(); renderNodes(); renderPieces(); updateStatusText(); updatePieceCount(); updateSkillUI();
    
    if (prevBtn) { prevBtn.style.display = ""; if ((chapterIdx === 0 && lessonIdx === 0) || isExamMode) prevBtn.classList.add('hidden'); else prevBtn.classList.remove('hidden'); }
    if (nextBtn && nextBtn.parentElement) nextBtn.parentElement.style.justifyContent = isExamMode ? "center" : "flex-start";
    if (!lesson.interaction) { nextBtn.innerText = "Đã hiểu, tiếp tục"; nextBtn.classList.remove('hidden'); } else { nextBtn.classList.add('hidden'); }
    if (lesson.timeLimit) startTimer(lesson.timeLimit);
};

window.loadMission = function(missionIdx) {
    isFreePlay = false; isPvPMode = false; isGiangHoMode = true; currentMissionIndex = missionIdx;
    lastMoveData = null; myPvPPlayerNum = 0; activeSkill = 0; historyStates = [];
    document.getElementById('board').classList.remove('board-flipped'); document.getElementById('leave-btn').innerHTML = '&#10094; Rời ải';
    clearTimeout(aiTimeout); clearTimeout(hideTextTimeout); stopTimer();
    const mission = giangHoMissions[missionIdx];
    
    document.getElementById('start-screen').classList.add('hidden'); document.getElementById('game-screen').classList.remove('hidden');
    chapterTitle.innerText = mission.title; instTitle.innerText = "Mật thư:"; instText.innerText = mission.story; feedbackText.innerText = ""; clearExplanationHighlights();
    
    gameState = mission.board.map(row => [...row]);
    if (mission.blocked) mission.blocked.forEach(b => gameState[b.r][b.c] = -1);

    currentPlayer = 1; selectedPiece = null; isExamMode = true; showHint = false; moveCount = 0; isPaused = false; isStoryMode = true; 
    instructionBox.classList.remove('collapsed'); gameScreen.className = `screen free-play-mode`; weatherEffect.style.display = "none"; gameScene.classList.add('exam-mode'); instructionBox.classList.add('exam-mode'); document.getElementById('skill-bar-container').classList.remove('hidden');

    drawLines(); renderNodes(); renderPieces(); updateStatusText(); updatePieceCount(); updateSkillUI();
    
    if (prevBtn) prevBtn.classList.add('hidden'); 
    nextBtn.classList.remove('hidden'); nextBtn.innerText = "Tiến vào sa bàn";
    
    nextBtn.onclick = function() {
        isStoryMode = false; instructionBox.classList.add('collapsed'); nextBtn.classList.add('hidden');
        instTitle.innerText = "Hệ thống:"; instText.innerText = "Hãy cẩn trọng!";
        if (mission.timeLimit) startTimer(mission.timeLimit);
        nextBtn.onclick = window.nextLesson; 
    };
};

function triggerAutoHideText() { clearTimeout(hideTextTimeout); hideTextTimeout = setTimeout(() => { if (!isPaused && !isStoryMode && nextBtn.classList.contains('hidden')) { instructionBox.classList.add('collapsed'); } }, 4000); }
window.prevLesson = function() { clearTimeout(hideTextTimeout); clearTimeout(aiTimeout); clearExplanationHighlights(); stopTimer(); isPaused = false; if (currentLessonIndex > 0) { currentLessonIndex--; } else if (currentChapterIndex > 0) { currentChapterIndex--; currentLessonIndex = chapters[currentChapterIndex].length - 1; } window.saveProgress(currentChapterIndex, currentLessonIndex); window.loadLesson(currentChapterIndex, currentLessonIndex); };
function showVictoryScreen() { document.getElementById('game-screen').classList.add('hidden'); document.getElementById('victory-screen').classList.remove('hidden'); document.getElementById('winner-name').innerText = currentUser; }

window.nextLesson = function() {
    if (nextBtn.innerText === "Thử lại") { window.restartLesson(); return; }
    if ((isFreePlay || isPvPMode) && nextBtn.innerText === "Rời sới") { window.goHome(); return; }
    if (isGiangHoMode && nextBtn.innerText === "Rời ải") { window.goHome(); return; }
    
    if (isGiangHoMode) {
        myMissionProgress = Math.max(myMissionProgress, currentMissionIndex + 1); mySiKhi += 3; window.saveProgress(currentChapterIndex, currentLessonIndex);
        if(currentMissionIndex >= 26) { alert("Tuyệt thế kỳ thủ! Bạn đã dẹp yên 27 ải giang hồ, lưu danh sử sách!"); window.goHome(); } 
        else { window.loadMission(currentMissionIndex + 1); }
        return;
    }

    mySiKhi += 3; updateSkillUI(); currentLessonIndex++; clearExplanationHighlights(); stopTimer();

    if (currentLessonIndex < chapters[currentChapterIndex].length) {
        window.saveProgress(currentChapterIndex, currentLessonIndex); window.loadLesson(currentChapterIndex, currentLessonIndex);
    } else {
        instructionBox.classList.remove('collapsed');
        if (prevBtn) prevBtn.classList.add('hidden'); if (nextBtn.parentElement) nextBtn.parentElement.style.justifyContent = "center";
        
        if (currentChapterIndex === 0) {
            window.unlockSkill("Thiên lý nhãn");
            instTitle.innerText = "Thầy đồ:"; instText.innerText = "Mở khóa tuyệt kỹ [Thiên lý nhãn]! Có thể thấy trước nước đi vi diệu."; feedbackText.innerText = "";
            nextBtn.innerText = "Lên kinh ứng thí"; nextBtn.classList.remove('hidden');
            nextBtn.onclick = function() { currentChapterIndex = 1; currentLessonIndex = 0; window.saveProgress(1, 0); nextBtn.onclick = window.nextLesson; window.loadLesson(1, 0); };
        } else if (currentChapterIndex === 1) {
            window.unlockSkill("Hồi tố"); window.unlockReward("Bộ cờ ngọc bích"); window.unlockReward("Áo giao lĩnh");
            instTitle.innerText = "Quan huyện:"; instText.innerText = "Đỗ tú tài! Nhận tuyệt kỹ [Hồi tố], xin lùi lại 1 nước cờ."; feedbackText.innerText = "";
            nextBtn.innerText = "Lên Thăng Long"; nextBtn.classList.remove('hidden');
            nextBtn.onclick = function() { currentChapterIndex = 2; currentLessonIndex = 0; window.saveProgress(2, 0); nextBtn.onclick = window.nextLesson; window.loadLesson(2, 0); };
        } else if (currentChapterIndex === 2) {
            window.unlockSkill("Ám khí"); window.unlockReward("Bộ cờ khảm xà cừ");
            instTitle.innerText = "Quan chủ khảo:"; instText.innerText = "Đỗ cử nhân! Nhận tuyệt kỹ [Ám khí], phi tiêu đoạt mạng quân địch."; feedbackText.innerText = "";
            nextBtn.innerText = "Vào điện Thái Hòa"; nextBtn.classList.remove('hidden');
            nextBtn.onclick = function() { currentChapterIndex = 3; currentLessonIndex = 0; window.saveProgress(3, 0); nextBtn.onclick = window.nextLesson; window.loadLesson(3, 0); };
        } else if (currentChapterIndex === 3) {
            window.unlockSkill("Độn thổ"); window.unlockReward("Mũ cánh chuồn"); window.unlockReward("Áo bào đỏ"); 
            currentChapterIndex = 4; window.saveProgress(4, 0); showVictoryScreen();
        }
    }
};

function showFeedback(text, isSuccess) {
    stopTimer(); clearTimeout(hideTextTimeout); instructionBox.classList.remove('collapsed'); 
    feedbackText.innerText = text; feedbackText.style.color = isSuccess ? "#1a5e20" : "#b30000"; 
    
    if (isFreePlay || isPvPMode) nextBtn.innerText = isSuccess ? "Rời sới" : "Thử lại";
    else if (isGiangHoMode) nextBtn.innerText = isSuccess ? "Ải tiếp theo" : "Thử lại";
    else nextBtn.innerText = isSuccess ? "Tiếp tục" : "Thử lại"; 
    
    if((isPvPMode || isGiangHoMode) && !isSuccess) { nextBtn.innerText = isGiangHoMode ? "Rời ải" : "Rời sới"; }
    nextBtn.classList.remove('hidden');
}

function updatePieceCount() {
    let red = 0, white = 0;
    for(let r=0; r<BOARD_SIZE; r++) { for(let c=0; c<BOARD_SIZE; c++) { if(gameState[r][c] === 1) red++; if(gameState[r][c] === 2) white++; } }
    countRedEl.innerText = red; countWhiteEl.innerText = white; return {red, white};
}

// ==========================================
// VẼ BÀN CỜ VÀ TỌA ĐỘ
// ==========================================
function getVisualCoords(r, c) { if (isPvPMode && myPvPPlayerNum === 2) { return { vr: 4 - r, vc: 4 - c }; } return { vr: r, vc: c }; }

function drawLines() {
    const svg = document.getElementById('lines-svg');
    if (!svg) return;
    while (svg.firstChild) { svg.removeChild(svg.firstChild); }
    const createLine = (x1, y1, x2, y2) => {
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", x1); line.setAttribute("y1", y1); line.setAttribute("x2", x2); line.setAttribute("y2", y2);
        line.setAttribute("stroke", "rgba(74, 47, 24, 0.8)"); line.setAttribute("stroke-width", "4");
        svg.appendChild(line);
    };
    for (let i = 0; i < BOARD_SIZE; i++) {
        let pos = i * 25 + '%'; createLine("0%", pos, "100%", pos); createLine(pos, "0%", pos, "100%");
    }
    createLine("0%", "0%", "100%", "100%"); createLine("0%", "100%", "100%", "0%"); createLine("50%", "0%", "100%", "50%");
    createLine("100%", "50%", "50%", "100%"); createLine("50%", "100%", "0%", "50%"); createLine("0%", "50%", "50%", "0%");
}

function renderNodes() {
    document.querySelectorAll('.node').forEach(n => n.remove()); 
    const currentLesson = getCurrentLessonData();
    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            let node = document.createElement('div'); node.className = 'node';
            if (showHint && currentLesson && currentLesson.hint && currentLesson.hint.er === r && currentLesson.hint.ec === c) node.classList.add('tutorial-target');
            let vCoords = getVisualCoords(r, c);
            node.style.left = `${vCoords.vc * 25}%`; node.style.top = `${vCoords.vr * 25}%`; node.dataset.r = r; node.dataset.c = c;
            node.addEventListener('click', () => handleNodeClick(r, c)); boardEl.appendChild(node);
        }
    }
}

function renderPieces() {
    document.querySelectorAll('.piece, .obstacle').forEach(p => p.remove());
    const currentLesson = getCurrentLessonData();
    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            let vCoords = getVisualCoords(r, c);
            if (gameState[r][c] === -1) { let obs = document.createElement('div'); obs.className = `obstacle`; obs.style.left = `${vCoords.vc * 25}%`; obs.style.top = `${vCoords.vr * 25}%`; boardEl.appendChild(obs); }
            else if (gameState[r][c] !== 0) {
                let piece = document.createElement('div'); piece.className = `piece ${gameState[r][c] === 1 ? 'p1' : 'p2'}`;
                if (lastMoveData && lastMoveData.r === r && lastMoveData.c === c) piece.classList.add('last-move-highlight');
                if (showHint && currentLesson && currentLesson.hint && currentLesson.hint.sr === r && currentLesson.hint.sc === c) piece.classList.add('tutorial-source');
                piece.style.left = `${vCoords.vc * 25}%`; piece.style.top = `${vCoords.vr * 25}%`; piece.dataset.vr = vCoords.vr; piece.dataset.vc = vCoords.vc; 
                piece.dataset.r = r; piece.dataset.c = c;
                piece.addEventListener('click', (e) => { e.stopPropagation(); handlePieceClick(r, c); }); boardEl.appendChild(piece);
            }
        }
    }
}

// ==========================================
// ĐIỀU KHIỂN & ĐÁNH CỜ
// ==========================================
function handlePieceClick(r, c) {
    if (isPaused || isStoryMode) return; 
    
    if (activeSkill === 3) {
        if (gameState[r][c] === 2) {
            gameState[r][c] = 0; activeSkill = 0; mySiKhi -= 15;
            gameScene.classList.remove('using-skill-cursor'); updateSkillUI(); window.saveProgress(currentChapterIndex, currentLessonIndex);
            showSkillMsg("Ám khí đã đoạt mạng 1 tên địch!", true); 
            renderPieces(); let countsAfter = updatePieceCount();
            
            if (isExamMode) {
                if (countsAfter.white === 0) { showFeedback(`Tuyệt đỉnh! Càn quét tàn quân địch.`, true); return; }
                currentPlayer = 2; updateStatusText();
                if (!hasValidMoves(2)) { showFeedback("Thắng lợi! Địch đã hết đường đi.", true); return; }
                
                instructionBox.classList.remove('collapsed'); feedbackText.style.color = "#8b3a3a"; feedbackText.innerText = "Đối thủ đang suy nghĩ...";
                clearTimeout(aiTimeout); 
                let aiLvl = isFreePlay ? freePlayLevel : (isGiangHoMode ? giangHoMissions[currentMissionIndex].botLevel : (getCurrentLessonData() ? getCurrentLessonData().botLevel : "easy"));
                aiTimeout = setTimeout(() => { executeAIMove(aiLvl); }, 1000);
            }
        } else { showSkillMsg("Chỉ được phóng tiêu vào quân địch!", false); }
        return;
    }

    if (isPvPMode) { if (currentPlayer !== myPvPPlayerNum) { feedbackText.innerText = "Chưa tới lượt của ngươi!"; return; } } 
    else { if (currentPlayer !== 1) return; }

    const currentLesson = getCurrentLessonData();
    if (!isFreePlay && !isPvPMode && !isGiangHoMode && currentLesson) { if (!currentLesson.interaction || (!nextBtn.classList.contains('hidden') && nextBtn.innerText !== "Thử lại")) return; } 
    else { if (!nextBtn.classList.contains('hidden') && nextBtn.innerText !== "Thử lại") return; }

    if (gameState[r][c] !== currentPlayer) return; 
    selectedPiece = { r, c }; updateVisualSelection(); showValidMoves(r, c);
}

function handleNodeClick(r, c) {
    if (isPaused || !selectedPiece || isStoryMode) return;
    
    if (activeSkill === 4) {
        if (gameState[r][c] === 0) {
            gameState[r][c] = 1; gameState[selectedPiece.r][selectedPiece.c] = 0;
            activeSkill = 0; selectedPiece = null; mySiKhi -= 20;
            gameScene.classList.remove('using-skill-cursor'); updateSkillUI(); window.saveProgress(currentChapterIndex, currentLessonIndex);
            showSkillMsg("Thần hành độn thổ thành công!", true); renderPieces(); updatePieceCount();
            
            if (isExamMode) {
                currentPlayer = 2; updateStatusText();
                if (!hasValidMoves(2)) { showFeedback("Thắng lợi! Địch đã hết đường đi.", true); return; }
                instructionBox.classList.remove('collapsed'); feedbackText.style.color = "#8b3a3a"; feedbackText.innerText = "Đối thủ đang suy nghĩ...";
                clearTimeout(aiTimeout); 
                let aiLvl = isFreePlay ? freePlayLevel : (isGiangHoMode ? giangHoMissions[currentMissionIndex].botLevel : (getCurrentLessonData() ? getCurrentLessonData().botLevel : "easy"));
                aiTimeout = setTimeout(() => { executeAIMove(aiLvl); }, 1000);
            }
        } else { showSkillMsg("Chỉ được độn thổ vào ô trống!", false); }
        return;
    }

    if (isPvPMode && currentPlayer !== myPvPPlayerNum) return; 
    if (!isPvPMode && currentPlayer !== 1) return;

    if (isValidMove(selectedPiece.r, selectedPiece.c, r, c)) { executeMove(selectedPiece.r, selectedPiece.c, r, c, false); }
}

function updateVisualSelection() {
    document.querySelectorAll('.piece').forEach(p => p.classList.remove('selected'));
    if (selectedPiece) { let vCoords = getVisualCoords(selectedPiece.r, selectedPiece.c); let pEl = document.querySelector(`.piece[data-vr="${vCoords.vr}"][data-vc="${vCoords.vc}"]`); if (pEl) pEl.classList.add('selected'); }
}

function showValidMoves(r, c) {
    document.querySelectorAll('.node').forEach(n => n.classList.remove('valid-move'));
    const currentLesson = getCurrentLessonData();
    if (currentLesson && currentLesson.blindMode) return; if (isFreePlay || isPvPMode || isGiangHoMode) return; 
    const directions = getValidDirections(r, c);
    directions.forEach(dir => {
        let nr = r + dir.dr, nc = c + dir.dc;
        if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && gameState[nr][nc] === 0) { let nEl = document.querySelector(`.node[data-r="${nr}"][data-c="${nc}"]`); if (nEl) nEl.classList.add('valid-move'); }
    });
}

function getValidDirections(r, c) { let dirs = [{dr: -1, dc: 0}, {dr: 1, dc: 0}, {dr: 0, dc: -1}, {dr: 0, dc: 1}]; if ((r + c) % 2 === 0) dirs.push({dr: -1, dc: -1}, {dr: -1, dc: 1}, {dr: 1, dc: -1}, {dr: 1, dc: 1}); return dirs; }
function isValidMove(r1, c1, r2, c2) { if (gameState[r2][c2] !== 0) return false; const dirs = getValidDirections(r1, c1); for (let d of dirs) if (r1 + d.dr === r2 && c1 + d.dc === c2) return true; return false; }
function hasValidMoves(player, stateMap = gameState) { for (let r = 0; r < BOARD_SIZE; r++) { for (let c = 0; c < BOARD_SIZE; c++) { if (stateMap[r][c] === player) { const dirs = getValidDirections(r, c); for (let d of dirs) { let nr = r + d.dr, nc = c + d.dc; if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && stateMap[nr][nc] === 0) return true; } } } } return false; }

function executeMove(r1, c1, r2, c2, fromNetwork = false) {
    stopTimer(); 
    if (isPvPMode && !fromNetwork) socket.emit('danh_co', { lenhBai: currentLenhBai, r1: r1, c1: c1, r2: r2, c2: c2 });

    let countsBefore = updatePieceCount();
    if (currentPlayer === 1 && !fromNetwork) historyStates.push(JSON.stringify(gameState));

    gameState[r2][c2] = currentPlayer; gameState[r1][c1] = 0;
    lastMoveData = { r: r2, c: c2, player: currentPlayer };
    document.querySelectorAll('.node').forEach(n => n.classList.remove('valid-move')); selectedPiece = null; showHint = false; clearExplanationHighlights();

    let gainedGanh = performGanh(r2, c2, currentPlayer, gameState); let gainedChet = performChet(currentPlayer, gameState); 
    let totalGained = gainedGanh + gainedChet;
    renderPieces(); renderNodes(); let countsAfter = updatePieceCount(); 
    const currentLesson = getCurrentLessonData();

    if (currentPlayer === 1 && !fromNetwork && isExamMode && !isPvPMode) {
        if (totalGained === 1 || totalGained === 2) mySiKhi += 1;
        else if (totalGained === 3) mySiKhi += 2;
        else if (totalGained >= 4) mySiKhi += 3;
        if (lastPlayerLost > 0 && totalGained >= 2) { mySiKhi += 5; showSkillMsg("Thế cờ mở! Sĩ khí tăng vọt!", true); }
        lastPlayerLost = 0; updateSkillUI();
    } else if (currentPlayer === 2 && isExamMode && !isPvPMode) {
        let lostRed = countsBefore.red - countsAfter.red;
        if (lostRed > 0) lastPlayerLost = lostRed;
    }

    if (!isFreePlay && !isPvPMode && !isGiangHoMode && currentChapterIndex === 2 && currentLessonIndex === 1 && gameState[0][0] === 1) gameState[0][0] = 0;
    if (!isFreePlay && !isPvPMode && !isGiangHoMode && currentLesson && currentLesson.onMove) { currentLesson.onMove((gainedGanh + gainedChet), r2, c2); return; }

    if (isPvPMode) {
        let isMyWin = false; let isMyLoss = false; currentPlayer = currentPlayer === 1 ? 2 : 1; updateStatusText();
        if (countsAfter.white === 0 || !hasValidMoves(2)) { if (myPvPPlayerNum === 1) isMyWin = true; else isMyLoss = true; } 
        else if (countsAfter.red === 0 || !hasValidMoves(1)) { if (myPvPPlayerNum === 2) isMyWin = true; else isMyLoss = true; }
        if (isMyWin) { showFeedback("Thắng lợi! Đối thủ đã dập đầu xưng thần!", true); } 
        else if (isMyLoss) { showFeedback("Bại trận! Đành ngậm ngùi rút lui.", false); } 
        else {
            if (currentPlayer === myPvPPlayerNum) { feedbackText.style.color = "#1a5e20"; feedbackText.innerText = "Đến lượt ngươi. Suy tính cho kỹ!"; } 
            else { feedbackText.style.color = "#8b3a3a"; feedbackText.innerText = `Chờ [${opponentName}] hạ quân...`; }
        }
        return; 
    }

    if (isExamMode) {
        if (currentPlayer === 1) { 
            moveCount++; 
            if (countsAfter.white === 0) { showFeedback(`Tuyệt đỉnh! Càn quét tàn quân địch trong ${moveCount} nước.`, true); return; }
            if (!isFreePlay && !isGiangHoMode && moveCount >= MAX_MOVES) { showFeedback(`Quá thời gian! Đã đi ${MAX_MOVES} nước mà chưa hạ được địch.`, false); return; }

            currentPlayer = 2; updateStatusText();
            if (!hasValidMoves(2)) { showFeedback("Thắng lợi! Địch đã hết đường đi.", true); return; }

            instructionBox.classList.add('collapsed'); feedbackText.style.color = "#8b3a3a"; feedbackText.innerText = "Đối thủ đang suy nghĩ...";
            clearTimeout(aiTimeout);
            aiTimeout = setTimeout(function tryAiMove() {
                if (!isPaused && !isStoryMode) { 
                    let aiLvl = isFreePlay ? freePlayLevel : (isGiangHoMode ? giangHoMissions[currentMissionIndex].botLevel : currentLesson.botLevel);
                    executeAIMove(aiLvl || "easy"); 
                } else aiTimeout = setTimeout(tryAiMove, 1000); 
            }, 1000); 
        } else { 
            currentPlayer = 1; updateStatusText();
            let moveCountTxt = isFreePlay || isGiangHoMode ? `Đã đi ${moveCount} nước` : `Đã đi ${moveCount}/${MAX_MOVES} nước`;
            feedbackText.style.color = "#1a5e20"; feedbackText.innerText = `Đến lượt cậu! (${moveCountTxt})`;
            
            if(!isFreePlay && !isGiangHoMode && currentLesson && !currentLesson.blindMode) { highlightForExplanation([{r: r2, c: c2}], 'explain-trap'); setTimeout(() => clearExplanationHighlights(), 1500); }
            if (countsAfter.red === 0) { showFeedback("Thất bại! Đã bị ăn sạch quân.", false); return; }
            if (!hasValidMoves(1)) { showFeedback("Thất bại! Đã hết đường lui.", false); return; }
            
            let tLimit = isGiangHoMode ? giangHoMissions[currentMissionIndex].timeLimit : (!isFreePlay && currentLesson ? currentLesson.timeLimit : 0);
            if (tLimit) startTimer(tLimit); 
        }
    }
}

// ==========================================
// LUẬT GÁNH CHẸT VÀ AI
// ==========================================
function performGanh(r, c, player, stateMap) {
    const enemy = player === 1 ? 2 : 1; let gainedCount = 0; const lines = [ [{dr: -1, dc: 0}, {dr: 1, dc: 0}], [{dr: 0, dc: -1}, {dr: 0, dc: 1}], [{dr: -1, dc: -1}, {dr: 1, dc: 1}], [{dr: -1, dc: 1}, {dr: 1, dc: -1}] ]; let canCheckDiagonal = (r + c) % 2 === 0;
    lines.forEach((line, index) => {
        if (index >= 2 && !canCheckDiagonal) return;
        let rA = r + line[0].dr, cA = c + line[0].dc; let rB = r + line[1].dr, cB = c + line[1].dc;
        if (rA >= 0 && rA < BOARD_SIZE && cA >= 0 && cA < BOARD_SIZE && rB >= 0 && rB < BOARD_SIZE && cB >= 0 && cB < BOARD_SIZE) {
            if (stateMap[rA][cA] === enemy && stateMap[rB][cB] === enemy) { stateMap[rA][cA] = player; stateMap[rB][cB] = player; gainedCount += 2; }
        }
    }); return gainedCount;
}

function performChet(player, stateMap) {
    const enemy = player === 1 ? 2 : 1; let capturedCount = 0; let visited = Array.from({length: BOARD_SIZE}, () => Array(BOARD_SIZE).fill(false));
    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            if (stateMap[r][c] === enemy && !visited[r][c]) {
                let component = []; let queue = [{r, c}]; let hasLiberty = false; visited[r][c] = true;
                while(queue.length > 0) {
                    let curr = queue.shift(); component.push(curr); let dirs = getValidDirections(curr.r, curr.c);
                    for (let d of dirs) {
                        let nr = curr.r + d.dr, nc = curr.c + d.dc;
                        if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE) {
                            if (stateMap[nr][nc] === 0) { hasLiberty = true; } 
                            else if (stateMap[nr][nc] === enemy && !visited[nr][nc]) { visited[nr][nc] = true; queue.push({r: nr, c: nc}); }
                        }
                    }
                }
                if (!hasLiberty) { component.forEach(p => { stateMap[p.r][p.c] = player; capturedCount++; }); }
            }
        }
    } return capturedCount;
}

function updateStatusText() {
    if (isPvPMode) {
        if (currentPlayer === 1) { statusEl.innerText = myPvPPlayerNum === 1 ? "Lượt: Hỏa kỳ (Ngươi)" : "Lượt: Hỏa kỳ (Đối thủ)"; statusEl.style.color = "#8b3a3a"; statusEl.style.borderColor = "#8b3a3a"; } 
        else { statusEl.innerText = myPvPPlayerNum === 2 ? "Lượt: Bạch kỳ (Ngươi)" : "Lượt: Bạch kỳ (Đối thủ)"; statusEl.style.color = "#4a2f18"; statusEl.style.borderColor = "#4a2f18"; }
    } else {
        statusEl.innerText = currentPlayer === 1 ? "Lượt: Hỏa kỳ (Ngươi)" : "Lượt: Bạch kỳ (Mộc nhân)"; statusEl.style.color = currentPlayer === 1 ? "#8b3a3a" : "#4a2f18"; statusEl.style.borderColor = currentPlayer === 1 ? "#8b3a3a" : "#4a2f18";
    }
}

function getAllValidMovesForState(player, stateMap) { let moves = []; for (let r = 0; r < BOARD_SIZE; r++) { for (let c = 0; c < BOARD_SIZE; c++) { if (stateMap[r][c] === player) { const dirs = getValidDirections(r, c); dirs.forEach(d => { let nr = r + d.dr, nc = c + d.dc; if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && stateMap[nr][nc] === 0) { moves.push({ r1: r, c1: c, r2: nr, c2: nc }); } }); } } } return moves; }

function getBestPlayerMove() {
    let moves = getAllValidMovesForState(1, gameState); if(moves.length === 0) return null;
    let maxGained = -1; let bestMoves = [];
    for(let m of moves) {
        let tempState = gameState.map(row => [...row]); tempState[m.r2][m.c2] = 1; tempState[m.r1][m.c1] = 0;
        let g = performGanh(m.r2, m.c2, 1, tempState) + performChet(1, tempState);
        if(g > maxGained) { maxGained = g; bestMoves = [m]; } else if(g === maxGained) { bestMoves.push(m); }
    }
    return bestMoves[Math.floor(Math.random() * bestMoves.length)];
}

function evaluateState(stateMap) { let score = 0; for(let r=0; r<5; r++){ for(let c=0; c<5; c++){ if(stateMap[r][c] === 2) { score += 100; if(r===2 && c===2) score += 15; else if((r===1&&c===1)||(r===1&&c===3)||(r===3&&c===1)||(r===3&&c===3)) score += 5; } else if(stateMap[r][c] === 1) { score -= 100; if(r===2 && c===2) score -= 15; else if((r===1&&c===1)||(r===1&&c===3)||(r===3&&c===1)||(r===3&&c===3)) score -= 5; } } } return score; }
function minimax(stateMap, depth, alpha, beta, isMaximizingPlayer) {
    if (depth === 0) return evaluateState(stateMap);
    if (isMaximizingPlayer) {
        let maxEval = -Infinity; let moves = getAllValidMovesForState(2, stateMap); if (moves.length === 0) return -9999; 
        for (let m of moves) { let nextState = stateMap.map(row => [...row]); nextState[m.r2][m.c2] = 2; nextState[m.r1][m.c1] = 0; performGanh(m.r2, m.c2, 2, nextState); performChet(2, nextState); let ev = minimax(nextState, depth - 1, alpha, beta, false); maxEval = Math.max(maxEval, ev); alpha = Math.max(alpha, ev); if (beta <= alpha) break; } return maxEval;
    } else {
        let minEval = Infinity; let moves = getAllValidMovesForState(1, stateMap); if (moves.length === 0) return 9999; 
        for (let m of moves) { let nextState = stateMap.map(row => [...row]); nextState[m.r2][m.c2] = 1; nextState[m.r1][m.c1] = 0; performGanh(m.r2, m.c2, 1, nextState); performChet(1, nextState); let ev = minimax(nextState, depth - 1, alpha, beta, true); minEval = Math.min(minEval, ev); beta = Math.min(beta, ev); if (beta <= alpha) break; } return minEval;
    }
}
function executeAIMove(level) {
    let moves = getAllValidMovesForState(2, gameState); if (moves.length === 0) return; 
    let bestMove = null; 
    if (level === "emperor") {
        let bestScore = -Infinity; let emperorMoves = [];
        for (let m of moves) { let tempState = gameState.map(row => [...row]); tempState[m.r2][m.c2] = 2; tempState[m.r1][m.c1] = 0; performGanh(m.r2, m.c2, 2, tempState); performChet(2, tempState); let score = minimax(tempState, 2, -Infinity, Infinity, false); if (score > bestScore) { bestScore = score; emperorMoves = [m]; } else if (score === bestScore) { emperorMoves.push(m); } }
        bestMove = emperorMoves[Math.floor(Math.random() * emperorMoves.length)];
    } else {
        let isRandom = false; if (level === "easy") isRandom = Math.random() < 0.95; else if (level === "medium") isRandom = Math.random() < 0.4; else if (level === "very_hard" || level === "hard") isRandom = false; 
        if (isRandom) { bestMove = moves[Math.floor(Math.random() * moves.length)]; } else {
            let bestMovesArr = []; let maxScore = -Infinity;
            moves.forEach(m => { let tempState = gameState.map(row => [...row]); tempState[m.r2][m.c2] = 2; tempState[m.r1][m.c1] = 0; let gained = performGanh(m.r2, m.c2, 2, tempState) + performChet(2, tempState); let score = gained * 10;
                if (level === "hard" || level === "very_hard") { let playerMoves = getAllValidMovesForState(1, tempState); let maxPlayerCounter = 0; playerMoves.forEach(pM => { let pTemp = tempState.map(row => [...row]); pTemp[pM.r2][pM.c2] = 1; pTemp[pM.r1][pM.c1] = 0; let pGained = performGanh(pM.r2, pM.c2, 1, pTemp) + performChet(1, pTemp); if (pGained > maxPlayerCounter) maxPlayerCounter = pGained; }); score -= (maxPlayerCounter * 12); if ((m.r2===2 && m.c2===2) || (m.r2===1 && m.c2===1) || (m.r2===1 && m.c2===3) || (m.r2===3 && m.c2===1) || (m.r2===3 && m.c2===3)) score += 2; }
                if (score > maxScore) { maxScore = score; bestMovesArr = [m]; } else if (score === maxScore) { bestMovesArr.push(m); }
            });
            bestMove = bestMovesArr[Math.floor(Math.random() * bestMovesArr.length)];
        }
    }
    executeMove(bestMove.r1, bestMove.c1, bestMove.r2, bestMove.c2);
}