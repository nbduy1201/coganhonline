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

// --- Khởi tạo Cơ sở dữ liệu Postgres ---
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } // Bắt buộc cho Render
});

pool.connect((err, client, release) => {
    if (err) return console.error('Lỗi kết nối Postgres', err.stack);
    console.log("Đã kết nối với kho lưu trữ sổ bộ (Postgres).");
    
    // Tạo bảng nếu chưa có
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
        if (!err) {
            // Chèn Admin mặc định
            client.query(`INSERT INTO users (username, password, role, status) VALUES ('admin', 'admin@123', 'admin', 'approved') ON CONFLICT (username) DO NOTHING`);
        }
        release();
    });
});

const activeRooms = {}; 

io.on('connection', (socket) => {
    console.log('Kỳ thủ kết nối:', socket.id);

    socket.on('register', (data) => {
        const { username, password } = data;
        db.get(`SELECT id FROM users WHERE username = ?`, [username], (err, row) => {
            if (row) return socket.emit('register_response', { success: false, message: 'Danh xưng này đã có kẻ sử dụng!' });

            db.get(`SELECT COUNT(*) as cnt FROM users WHERE role = 'user' AND status = 'approved'`, (err, countRow) => {
                if (countRow && countRow.cnt >= chiTieuKhoaCu) {
                    return socket.emit('register_response', { success: false, message: `Khoa cử năm nay đã mãn hạn (${chiTieuKhoaCu} người).` });
                }
                db.run(`INSERT INTO users (username, password, status) VALUES (?, ?, 'pending')`, [username, password], function(err) {
                    if (err) socket.emit('register_response', { success: false, message: 'Hệ thống trục trặc, không thể ghi danh!' });
                    else {
                        socket.emit('register_response', { success: true, message: 'Ghi danh thành công! Đang chờ bộ lễ phê duyệt.' });
                        io.emit('admin_refresh_data'); 
                    }
                });
            });
        });
    });

    socket.on('login', (data) => {
        const { username, password } = data;
        db.get(`SELECT * FROM users WHERE username = ? AND password = ?`, [username, password], (err, row) => {
            if (err || !row) return socket.emit('login_response', { success: false, message: 'Danh xưng hoặc khẩu quyết sai lệch!' });
            if (row.status === 'pending') return socket.emit('login_response', { success: false, message: 'Hồ sơ đang chờ phê duyệt, chưa thể nhập môn!' });

            socket.username = row.username; socket.role = row.role;
            socket.emit('login_response', { 
                success: true, username: row.username, role: row.role, chapter: row.chapter,
                lesson: row.lesson, rewards: JSON.parse(row.rewards), skills: JSON.parse(row.skills),
                sikhi: row.sikhi || 0, mission: row.mission || 0
            });
        });
    });

    socket.on('save_progress', (data) => {
        if (!socket.username) return; 
        const { chapter, lesson, rewards, skills, sikhi, mission } = data;
        let query = `UPDATE users SET chapter = ?, lesson = ?, sikhi = ?, mission = ?`; 
        let params = [chapter, lesson, sikhi, mission];
        if (rewards) { query += `, rewards = ?`; params.push(JSON.stringify(rewards)); }
        if (skills) { query += `, skills = ?`; params.push(JSON.stringify(skills)); }
        query += ` WHERE username = ?`; params.push(socket.username);
        db.run(query, params);
    });

    socket.on('change_password', (data) => {
        if (!socket.username) return;
        db.get(`SELECT password FROM users WHERE username = ?`, [socket.username], (err, row) => {
            if (err || !row) return socket.emit('change_password_response', { success: false, message: 'Hệ thống trục trặc!' });
            if (row.password !== data.oldPassword) return socket.emit('change_password_response', { success: false, message: 'Khẩu quyết cũ sai lệch!' });
            db.run(`UPDATE users SET password = ? WHERE username = ?`, [data.newPassword, socket.username], (err) => {
                if (err) socket.emit('change_password_response', { success: false, message: 'Không thể đổi khẩu quyết!' });
                else socket.emit('change_password_response', { success: true, message: 'Đổi khẩu quyết thành công!' });
            });
        });
    });

    // Quyền lực tổng quản
    socket.on('admin_fetch_users', () => {
        if (socket.role !== 'admin') return;
        db.all(`SELECT id, username, chapter, lesson, role, status FROM users`, [], (err, rows) => { 
            if (!err) socket.emit('admin_users_list', { users: rows, limit: chiTieuKhoaCu }); 
        });
    });
    socket.on('admin_set_limit', (newLimit) => {
        if (socket.role === 'admin') { chiTieuKhoaCu = parseInt(newLimit); socket.emit('admin_action_success', `Đã ban chiếu định mức là ${chiTieuKhoaCu} sĩ tử.`); io.emit('admin_refresh_data'); }
    });
    socket.on('admin_approve_user', (username) => { if (socket.role === 'admin') db.run(`UPDATE users SET status = 'approved' WHERE username = ?`, [username], (err) => { if (!err) io.emit('admin_refresh_data'); }); });
    socket.on('admin_reject_user', (username) => { if (socket.role === 'admin' && username !== 'admin') db.run(`DELETE FROM users WHERE username = ?`, [username], (err) => { if (!err) io.emit('admin_refresh_data'); }); });
    socket.on('admin_delete_user', (data) => { if (socket.role === 'admin' && data.username !== 'admin') db.run(`DELETE FROM users WHERE username = ?`, [data.username], (err) => { if (!err) io.emit('admin_refresh_data'); }); });
    socket.on('admin_toggle_role', (data) => {
        if (socket.role === 'admin' && data.username !== 'admin') { const newRole = data.currentRole === 'admin' ? 'user' : 'admin'; db.run(`UPDATE users SET role = ? WHERE username = ?`, [newRole, data.username], (err) => { if (!err) io.emit('admin_refresh_data'); }); }
    });
    socket.on('admin_force_password', (data) => { if (socket.role === 'admin') db.run(`UPDATE users SET password = ? WHERE username = ?`, [data.newPassword, data.username], (err) => { if (!err) socket.emit('admin_action_success', `Khẩu quyết của [${data.username}] đã đổi.`); }); });

    // Đình lược quần hùng
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