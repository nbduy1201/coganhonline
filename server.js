const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

let chiTieuKhoaCu = 50; 

// --- KHỞI TẠO CƠ SỞ DỮ LIỆU POSTGRESQL ---
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } // Render yêu cầu SSL
});

pool.connect((err, client, release) => {
    if (err) return console.error('Lỗi kết nối Postgres:', err.stack);
    console.log("Đã kết nối với kho lưu trữ Bảng Vàng (PostgreSQL).");
    
    client.query(`
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username TEXT UNIQUE,
            password TEXT,
            chapter INTEGER DEFAULT 0,
            lesson INTEGER DEFAULT 0,
            rewards TEXT DEFAULT '[]',
            skills TEXT DEFAULT '[]',
            role TEXT DEFAULT 'user',
            status TEXT DEFAULT 'approved',
            sikhi INTEGER DEFAULT 0,
            mission INTEGER DEFAULT 0
        )
    `, (err) => {
        if (err) console.error("Lỗi tạo bảng:", err);
        else {
            client.query(`INSERT INTO users (username, password, role, status) VALUES ('admin', 'admin@123', 'admin', 'approved') ON CONFLICT (username) DO NOTHING`);
        }
        release();
    });
});

const activeRooms = {}; 

io.on('connection', (socket) => {
    console.log('Một kỳ thủ vừa bước vào cổng thành:', socket.id);

    // ==========================================
    // GHI DANH & ĐĂNG NHẬP
    // ==========================================
    socket.on('register', async (data) => {
        const { username, password } = data;
        try {
            const userRes = await pool.query(`SELECT id FROM users WHERE username = $1`, [username]);
            if (userRes.rows.length > 0) return socket.emit('register_response', { success: false, message: 'Danh xưng này đã có kẻ sử dụng!' });

            const countRes = await pool.query(`SELECT COUNT(*) as cnt FROM users WHERE role = 'user' AND status = 'approved'`);
            if (parseInt(countRes.rows[0].cnt) >= chiTieuKhoaCu) {
                return socket.emit('register_response', { success: false, message: `Khoa cử năm nay đã mãn hạn (${chiTieuKhoaCu} người).` });
            }

            await pool.query(`INSERT INTO users (username, password, status) VALUES ($1, $2, 'pending')`, [username, password]);
            socket.emit('register_response', { success: true, message: 'Ghi danh thành công! Đang chờ bộ lễ phê duyệt.' });
            io.emit('admin_refresh_data'); 
        } catch (err) {
            console.error(err);
            socket.emit('register_response', { success: false, message: 'Hệ thống trục trặc, không thể ghi danh!' });
        }
    });

    socket.on('login', async (data) => {
        const { username, password } = data;
        try {
            const res = await pool.query(`SELECT * FROM users WHERE username = $1 AND password = $2`, [username, password]);
            const row = res.rows[0];
            
            if (!row) return socket.emit('login_response', { success: false, message: 'Danh xưng hoặc khẩu quyết sai lệch!' });
            if (row.status === 'pending') return socket.emit('login_response', { success: false, message: 'Hồ sơ đang chờ phê duyệt, chưa thể nhập môn!' });

            socket.username = row.username; socket.role = row.role;
            socket.emit('login_response', { 
                success: true, username: row.username, role: row.role, chapter: row.chapter,
                lesson: row.lesson, rewards: JSON.parse(row.rewards || '[]'), skills: JSON.parse(row.skills || '[]'),
                sikhi: row.sikhi || 0, mission: row.mission || 0
            });
        } catch (err) {
            console.error(err);
            socket.emit('login_response', { success: false, message: 'Lỗi máy chủ khi đăng nhập!' });
        }
    });

    socket.on('save_progress', async (data) => {
        if (!socket.username) return; 
        const { chapter, lesson, rewards, skills, sikhi, mission } = data;
        try {
            await pool.query(
                `UPDATE users SET chapter = $1, lesson = $2, sikhi = $3, mission = $4, rewards = $5, skills = $6 WHERE username = $7`,
                [chapter, lesson, sikhi, mission, JSON.stringify(rewards || []), JSON.stringify(skills || []), socket.username]
            );
        } catch (err) { console.error("Lỗi lưu tiến trình:", err); }
    });

    socket.on('change_password', async (data) => {
        if (!socket.username) return;
        try {
            const res = await pool.query(`SELECT password FROM users WHERE username = $1`, [socket.username]);
            const row = res.rows[0];
            if (!row) return socket.emit('change_password_response', { success: false, message: 'Hệ thống trục trặc!' });
            if (row.password !== data.oldPassword) return socket.emit('change_password_response', { success: false, message: 'Khẩu quyết cũ sai lệch!' });
            
            await pool.query(`UPDATE users SET password = $1 WHERE username = $2`, [data.newPassword, socket.username]);
            socket.emit('change_password_response', { success: true, message: 'Đổi khẩu quyết thành công!' });
        } catch (err) {
            console.error(err);
            socket.emit('change_password_response', { success: false, message: 'Không thể đổi khẩu quyết!' });
        }
    });

    // ==========================================
    // QUYỀN LỰC TỔNG QUẢN (ADMIN)
    // ==========================================
    socket.on('admin_fetch_users', async () => {
        if (socket.role !== 'admin') return;
        try {
            const res = await pool.query(`SELECT id, username, chapter, lesson, role, status FROM users`);
            socket.emit('admin_users_list', { users: res.rows, limit: chiTieuKhoaCu }); 
        } catch (err) { console.error(err); }
    });
    
    socket.on('admin_set_limit', (newLimit) => {
        if (socket.role === 'admin') { chiTieuKhoaCu = parseInt(newLimit); socket.emit('admin_action_success', `Đã ban chiếu định mức là ${chiTieuKhoaCu} sĩ tử.`); io.emit('admin_refresh_data'); }
    });

    socket.on('admin_approve_user', async (username) => { 
        if (socket.role === 'admin') {
            await pool.query(`UPDATE users SET status = 'approved' WHERE username = $1`, [username]);
            io.emit('admin_refresh_data');
        }
    });

    socket.on('admin_reject_user', async (username) => { 
        if (socket.role === 'admin' && username !== 'admin') {
            await pool.query(`DELETE FROM users WHERE username = $1`, [username]);
            io.emit('admin_refresh_data');
        }
    });

    socket.on('admin_delete_user', async (data) => { 
        if (socket.role === 'admin' && data.username !== 'admin') {
            await pool.query(`DELETE FROM users WHERE username = $1`, [data.username]);
            io.emit('admin_refresh_data');
        }
    });

    socket.on('admin_toggle_role', async (data) => {
        if (socket.role === 'admin' && data.username !== 'admin') { 
            const newRole = data.currentRole === 'admin' ? 'user' : 'admin'; 
            await pool.query(`UPDATE users SET role = $1 WHERE username = $2`, [newRole, data.username]);
            io.emit('admin_refresh_data');
        }
    });

    socket.on('admin_force_password', async (data) => { 
        if (socket.role === 'admin') {
            await pool.query(`UPDATE users SET password = $1 WHERE username = $2`, [data.newPassword, data.username]);
            socket.emit('admin_action_success', `Khẩu quyết của [${data.username}] đã đổi.`);
        }
    });

    // ==========================================
    // ĐÌNH LƯỢC QUẦN HÙNG (PVP)
    // ==========================================
    socket.on('lap_soi', () => {
        const lenhBai = Math.floor(1000 + Math.random() * 9000).toString();
        activeRooms[lenhBai] = { player1: socket.id, p1_name: socket.username, player2: null, p2_name: null };
        socket.join(lenhBai); socket.emit('soi_created', lenhBai);
    });
    socket.on('nhap_soi', (lenhBai) => {
        lenhBai = lenhBai.toUpperCase(); const room = activeRooms[lenhBai];
        if (room) {
            if (!room.player2) { room.player2 = socket.id; room.p2_name = socket.username; socket.join(lenhBai); io.to(lenhBai).emit('soi_ready', { lenhBai: lenhBai, p1_name: room.p1_name, p2_name: room.p2_name }); } 
            else { socket.emit('soi_error', 'Sới cờ này đã có đủ người tỉ thí!'); }
        } else { socket.emit('soi_error', 'Lệnh bài không tồn tại hoặc sới đã giải tán!'); }
    });
    socket.on('danh_co', (data) => { socket.to(data.lenhBai).emit('nhan_nuoc_di', data); });
    socket.on('roi_soi', () => {
        for (const [lenhBai, room] of Object.entries(activeRooms)) {
            if (room.player1 === socket.id || room.player2 === socket.id) { io.to(lenhBai).emit('doi_thu_dao_tau'); delete activeRooms[lenhBai]; break; }
        }
    });
    socket.on('disconnect', () => {
        for (const [lenhBai, room] of Object.entries(activeRooms)) {
            if (room.player1 === socket.id || room.player2 === socket.id) { io.to(lenhBai).emit('doi_thu_dao_tau'); delete activeRooms[lenhBai]; break; }
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => { console.log(`Cổng thành Thăng Long đã mở tại PORT: ${PORT}`); });