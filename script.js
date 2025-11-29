// ตั้งค่า Logging
setLogLevel('Debug');

// Global Variables
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

let app, db, auth, userId = null;
let isAuthReady = false;

// Elements (ดึง Element จาก DOM)
const recordForm = document.getElementById('recordForm');
const recordsList = document.getElementById('recordsList');
const loadingMessage = document.getElementById('loadingMessage');
const noRecordsMessage = document.getElementById('noRecordsMessage');
const userIdDisplay = document.getElementById('user-id-display');
const messageBox = document.getElementById('messageBox');
const saveButton = document.getElementById('saveButton');

// Firestore Collection Path (Public data for sharing)
const COLLECTION_PATH = `artifacts/${appId}/public/data/patient_records`;

/**
 * แปลงวันที่เป็นรูปแบบ Thai locale
 * @param {Date} dateObj - วัตถุ Date
 * @returns {string} วันที่ในรูปแบบ 1 ม.ค. 2567
 */
function formatDate(dateObj) {
    if (!dateObj) return 'N/A';
    try {
        // ปรับเป็นปี พ.ศ.
        return dateObj.toLocaleDateString('th-TH', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (e) {
        console.error("Error formatting date:", e);
        return dateObj.toDateString();
    }
}


/**
 * เริ่มต้นการทำงานของ Firebase และการยืนยันตัวตน
 */
async function initializeAppAndAuth() {
    if (Object.keys(firebaseConfig).length === 0 || !firebaseConfig.projectId) {
        console.error("Firebase configuration is missing or incomplete.");
        userIdDisplay.textContent = "Error: Firebase config ไม่สมบูรณ์";
        loadingMessage.textContent = "ไม่สามารถโหลดข้อมูลได้เนื่องจากการตั้งค่า Firebase ไม่สมบูรณ์";
        return;
    }

    try {
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);

        // 1. ตรวจสอบสถานะการยืนยันตัวตน
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                userId = user.uid;
                userIdDisplay.textContent = `User ID: ${userId}`;
                isAuthReady = true;
                console.log("Authentication successful. User ID:", userId);
                loadRecords();
            } else {
                // 2. หากยังไม่ได้รับโทเคน ให้ลงชื่อเข้าใช้แบบไม่ระบุตัวตน
                try {
                    if (initialAuthToken) {
                        await signInWithCustomToken(auth, initialAuthToken);
                    } else {
                        await signInAnonymously(auth);
                    }
                } catch (error) {
                    console.error("Error signing in anonymously:", error);
                    userIdDisplay.textContent = "Error: ไม่สามารถลงชื่อเข้าใช้";
                    isAuthReady = true;
                }
            }
        });
    } catch (error) {
        console.error("Firebase initialization failed:", error);
        userIdDisplay.textContent = "Error: การเริ่มต้น Firebase ล้มเหลว";
        loadingMessage.textContent = "ไม่สามารถโหลดข้อมูลได้เนื่องจาก Firebase ล้มเหลว";
    }
}

/**
 * บันทึกข้อมูลเคสลงใน Firestore
 * @param {Event} e - event การ submit form
 */
async function saveRecord(e) {
    e.preventDefault();

    if (!isAuthReady || !userId) {
        showMessage("กำลังตรวจสอบสิทธิ์ กรุณารอสักครู่...", "bg-yellow-100 text-yellow-700");
        return;
    }

    saveButton.disabled = true;
    saveButton.textContent = "กำลังบันทึก...";
    showMessage("", "hidden");

    const formData = new FormData(recordForm);
    const data = {
        hn: formData.get('hn').trim(),
        fullName: formData.get('fullName').trim(),
        caseType: formData.get('caseType'),
        cc: formData.get('cc').trim(),
        pe: formData.get('pe').trim(),
        dx: formData.get('dx').trim(),
        plan: formData.get('plan').trim(),
        date: formData.get('recordDate'),
        userId: userId, 
        timestamp: serverTimestamp() 
    };

    try {
        await addDoc(collection(db, COLLECTION_PATH), data);
        recordForm.reset();
        document.getElementById('recordDate').valueAsDate = new Date(); 
        showMessage("บันทึกเคสสำเร็จ! ข้อมูลถูกอัปเดตเรียลไทม์แล้ว", "bg-green-100 text-green-700");
    } catch (error) {
        console.error("Error adding document: ", error);
        showMessage(`เกิดข้อผิดพลาดในการบันทึก: ${error.message}`, "bg-red-100 text-red-700");
    } finally {
        saveButton.disabled = false;
        saveButton.textContent = "บันทึกเคส";
    }
}

/**
 * แสดงข้อความสถานะ
 * @param {string} message - ข้อความที่ต้องการแสดง
 * @param {string} className - Tailwind CSS classes สำหรับสี/พื้นหลัง
 */
function showMessage(message, className) {
    messageBox.textContent = message;
    messageBox.className = "mt-3 text-center text-sm font-medium p-2 rounded";
    
    if (className === 'hidden') {
        messageBox.classList.add('hidden');
        return;
    }

    messageBox.classList.add(...className.split(' '));
    messageBox.classList.remove('hidden');
}

/**
 * สร้าง UI สำหรับรายการเคส
 * @param {Object} record - ข้อมูลเคส
 * @param {string} id - Document ID
 * @returns {string} HTML string
 */
function createRecordCard(record, id) {
    const isIPD = record.caseType === 'IPD';
    const badgeColor = isIPD ? 'bg-red-500' : 'bg-emerald-500';
    const cardClass = isIPD ? 'ipd' : 'opd';
    const dateText = record.timestamp ? formatDate(record.timestamp.toDate()) : 'N/A';
    const recordDate = record.date || 'ไม่ระบุ';

    // เนื้อหา card (HTML string)
    return `...`; // โค้ดส่วนนี้ยาวมาก จึงย่อไว้ในโค้ดจริง
}

/**
 * ลบเอกสารออกจาก Firestore
 * @param {string} id - Document ID ที่จะลบ
 */
async function deleteRecord(id) {
    if (!isAuthReady || !userId) {
        showMessage("การตรวจสอบสิทธิ์ยังไม่เสร็จสิ้น", "bg-red-100 text-red-700");
        return;
    }

    if (window.confirm("คุณแน่ใจหรือไม่ว่าต้องการลบเคสนี้? (ไม่สามารถกู้คืนได้)")) {
        try {
            await deleteDoc(doc(db, COLLECTION_PATH, id));
            showMessage("ลบเคสสำเร็จ!", "bg-green-100 text-green-700");
        } catch (error) {
            console.error("Error deleting document: ", id, error);
            showMessage(`เกิดข้อผิดพลาดในการลบ: ${error.message}`, "bg-red-100 text-red-700");
        }
    }
}

/**
 * โหลดข้อมูลเคสแบบ Real-time ด้วย onSnapshot
 */
function loadRecords() {
    if (!isAuthReady || !userId || !db) return;

    // คิวรี: เรียงลำดับตามวันที่บันทึก (timestamp) ล่าสุดขึ้นก่อน
    const q = query(collection(db, COLLECTION_PATH), orderBy("timestamp", "desc"));

    // เริ่มการฟังข้อมูลแบบ Real-time
    onSnapshot(q, (snapshot) => {
        loadingMessage.classList.add('hidden');
        
        if (snapshot.empty) {
            recordsList.innerHTML = '';
            noRecordsMessage.classList.remove('hidden');
            return;
        }

        noRecordsMessage.classList.add('hidden');
        let htmlContent = '';
        snapshot.forEach((doc) => {
            const record = doc.data();
            htmlContent += createRecordCard(record, doc.id);
        });
        
        recordsList.innerHTML = htmlContent;
    }, (error) => {
        console.error("Error listening to collection:", error);
        loadingMessage.textContent = `เกิดข้อผิดพลาดในการโหลด: ${error.message}`;
    });
}

// Event Listeners (กำหนด Event ให้กับปุ่มและฟอร์ม)
recordForm.addEventListener('submit', saveRecord);

// Delegation สำหรับปุ่มลบ
recordsList.addEventListener('click', (e) => {
    if (e.target.classList.contains('delete-btn')) {
        const docId = e.target.getAttribute('data-id');
        if (docId) {
            deleteRecord(docId);
        }
    }
});

// กำหนดวันที่เริ่มต้นให้เป็นวันนี้
document.addEventListener('DOMContentLoaded', () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    document.getElementById('recordDate').value = `${yyyy}-${mm}-${dd}`;
});

// Start the application (เริ่มการทำงาน)
initializeAppAndAuth();