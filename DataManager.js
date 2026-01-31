// DataManager.js - ระบบจัดการ Save/Load ข้อมูลนักเรียน
// วิธีใช้: วางไฟล์นี้ไว้โฟลเดอร์เดียวกับเกม และเพิ่ม <script src="DataManager.js"></script> ในทุกไฟล์เกม

const DataManager = {
    // ==================================================================================
    // ส่วนตั้งค่า (ต้องแก้ไขส่วนนี้เมื่อคุณสร้าง Firebase Project แล้ว)
    // ==================================================================================
    // วิธีเอาค่ามาใส่: 
    // 1. ไปที่ https://console.firebase.google.com/
    // 2. สร้างโปรเจกต์ใหม่ -> เลือกเว็บ (ไอคอน </>)
    // 3. ก๊อปปี้ค่า firebaseConfig มาแทนที่ตรงนี้
    firebaseConfig: {
  apiKey: "AIzaSyArj9IcqM5fwuWJrp6S_ZjbSlYNKNMm3zY",
  authDomain: "web-coding-academy.firebaseapp.com",
  projectId: "web-coding-academy",
  storageBucket: "web-coding-academy.firebasestorage.app",
  messagingSenderId: "208486100164",
  appId: "1:208486100164:web:8cb2a0518df50eae81ad91",
  measurementId: "G-91EG4QTRG7"
},
    // ==================================================================================

    db: null,
    currentUser: null,
    isOnline: false,

    // เริ่มต้นระบบ
    async init() {
        if (typeof firebase === 'undefined') {
            console.warn("ไม่พบ Firebase SDK - ระบบจะใช้การบันทึกลงเครื่อง (Offline Mode) แทน");
            this.loadFromLocal();
            return;
        }

        try {
            if (!firebase.apps.length) {
                firebase.initializeApp(this.firebaseConfig);
            }
            this.db = firebase.firestore();
            this.isOnline = true;
            console.log("เชื่อมต่อฐานข้อมูลสำเร็จ");
            
            // ตรวจสอบว่ามีการล็อกอินค้างไว้ไหม
            const storedUser = sessionStorage.getItem('coding_student_id');
            if (storedUser) {
                await this.login(storedUser);
            }
        } catch (e) {
            console.error("การเชื่อมต่อฐานข้อมูลผิดพลาด:", e);
            console.warn("เปลี่ยนไปใช้ Offline Mode");
            this.loadFromLocal();
        }
    },

    // ฟังก์ชันล็อกอิน (ใช้รหัสนักเรียนเป็น ID เลย)
    async login(studentId) {
        if (!studentId) return false;
        
        try {
            if (this.isOnline) {
                const docRef = this.db.collection("students").doc(studentId);
                const doc = await docRef.get();

                if (doc.exists) {
                    this.currentUser = doc.data();
                    this.currentUser.id = studentId;
                } else {
                    // ถ้าเป็นนักเรียนใหม่ ให้สร้างข้อมูลเริ่มต้น
                    this.currentUser = {
                        id: studentId,
                        iconLevel: 0,   // เกมที่ 1
                        blockLevel: 0,  // เกมที่ 2
                        textLevel: 0,   // เกมที่ 3
                        lastLogin: new Date().toISOString()
                    };
                    await docRef.set(this.currentUser);
                }
            } else {
                // Offline Mode: ใช้ LocalStorage
                this.currentUser = { id: studentId, ...this.getLocalProgress() };
            }

            sessionStorage.setItem('coding_student_id', studentId);
            return true;
        } catch (e) {
            console.error("Login Error:", e);
            alert("เกิดข้อผิดพลาดในการเข้าสู่ระบบ: " + e.message);
            return false;
        }
    },

    // บันทึกความคืบหน้า
    async saveProgress(gameType, levelIndex) {
        if (!this.currentUser) return;

        // อัปเดตข้อมูลในหน่วยความจำ
        if (gameType === 'icon' && levelIndex > this.currentUser.iconLevel) this.currentUser.iconLevel = levelIndex;
        if (gameType === 'block' && levelIndex > this.currentUser.blockLevel) this.currentUser.blockLevel = levelIndex;
        if (gameType === 'text' && levelIndex > this.currentUser.textLevel) this.currentUser.textLevel = levelIndex;

        // บันทึกลง Cloud หรือ Local
        if (this.isOnline) {
            try {
                await this.db.collection("students").doc(this.currentUser.id).update({
                    iconLevel: this.currentUser.iconLevel,
                    blockLevel: this.currentUser.blockLevel,
                    textLevel: this.currentUser.textLevel,
                    lastLogin: new Date().toISOString()
                });
                console.log("บันทึกข้อมูลเรียบร้อย");
            } catch (e) {
                console.error("Save Error:", e);
            }
        } else {
            this.saveToLocal();
        }
    },

    // ดึงเลเวลปัจจุบันของเกมนั้นๆ
    getLevel(gameType) {
        if (!this.currentUser) return 0;
        if (gameType === 'icon') return this.currentUser.iconLevel || 0;
        if (gameType === 'block') return this.currentUser.blockLevel || 0;
        if (gameType === 'text') return this.currentUser.textLevel || 0;
        return 0;
    },

    // --- Helpers สำหรับ Offline Mode ---
    loadFromLocal() {
        // โหลดข้อมูลจำลองจากเครื่อง
        this.isOnline = false;
    },
    getLocalProgress() {
        const saved = localStorage.getItem('coding_progress');
        return saved ? JSON.parse(saved) : { iconLevel: 0, blockLevel: 0, textLevel: 0 };
    },
    saveToLocal() {
        const data = {
            iconLevel: this.currentUser.iconLevel,
            blockLevel: this.currentUser.blockLevel,
            textLevel: this.currentUser.textLevel
        };
        localStorage.setItem('coding_progress', JSON.stringify(data));
    },
    
    logout() {
        sessionStorage.removeItem('coding_student_id');
        this.currentUser = null;
        window.location.href = 'index.html';
    }
};

// เริ่มทำงานทันทีเมื่อโหลดไฟล์
DataManager.init();