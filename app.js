import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, where, orderBy, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyDp7adyLWmzQodT24d_8jmJNq-XDaQ5wqP0",
  authDomain: "what-is-your-request.firebaseapp.com",
  projectId: "what-is-your-request",
  storageBucket: "what-is-your-request.firebasestorage.app",
  messagingSenderId: "978839400000",
  appId: "1:978839400000:web:396cda78aecb88ad2d39a5",
  measurementId: "G-DKCQ03MVLV"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

/* --- Helpers --- */
const qs = (sel, el = document) => el.querySelector(sel);
const qsa = (sel, el = document) => Array.from(el.querySelectorAll(sel));
const showView = id => {
  qsa('.view').forEach(v => v.classList.remove('active'));
  qs(`#${id}`).classList.add('active');
  window.scrollTo({top:0,behavior:'smooth'});
};
const genOrderId = () => {
  const n = Math.floor(Math.random() * 9000) + 1000;
  return `KNZ-${n}`;
};
const formatDate = (ts) => {
  try{
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleString('ar-EG');
  }catch(e){ return '' }
};

/* --- Elements --- */
const btnNew = qs('#btn-new');
const btnMy = qs('#btn-myorders');
const btnAdmin = qs('#btn-admin');
const startOrder = qs('#start-order');

// admin password (email string) required to open admin view
const ADMIN_PASSWORD = 'nabeelabdalslam@gmail.com';

const orderForm = qs('#order-form');
const nameInput = qs('#name');
const phoneInput = qs('#phone');
const categoryInput = qs('#category');
const detailsInput = qs('#details');
const imageInput = qs('#image');
const transactionInput = qs('#transaction');
const priceRadios = qsa('input[name="knowPrice"]');
const priceLabel = qs('#price-label');
const bankInfo = qs('#bank-info');
const noPriceNote = qs('#no-price-note');
const cancelOrder = qs('#cancel-order');

const notificationCard = qs('#notification-card');
const toHomeBtn = qs('#to-home');

const lookupPhone = qs('#lookup-phone');
const lookupBtn = qs('#lookup-btn');
const lookupClear = qs('#lookup-clear');
const myordersList = qs('#myorders-list');

const adminList = qs('#admin-list');
const refreshOrders = qs('#refresh-orders');

/* --- Navigation --- */
btnNew.addEventListener('click', ()=> showView('view-order'));
startOrder.addEventListener('click', ()=> showView('view-order'));
btnMy.addEventListener('click', ()=> showView('view-myorders'));
btnAdmin.addEventListener('click', ()=> {
  const pass = prompt('أدخل كلمة المرور للوصول للوحة التحكم:');
  if(pass === ADMIN_PASSWORD){
    loadAdminView();
  } else {
    alert('كلمة مرور غير صحيحة');
  }
});
qs('#btn-new').addEventListener('click', ()=> showView('view-order'));
cancelOrder.addEventListener('click', ()=> showView('view-home'));
toHomeBtn.addEventListener('click', ()=> showView('view-home'));

/* price toggle */
priceRadios.forEach(r => r.addEventListener('change', e => {
  if(e.target.value === 'yes'){
    priceLabel.classList.remove('hidden');
    transactionInput.disabled = false;
    noPriceNote.classList.add('hidden');
    bankInfo.classList.remove('hidden'); // show bank account when user knows price
  } else {
    transactionInput.value = '';
    transactionInput.disabled = true;
    priceLabel.classList.add('hidden');
    noPriceNote.classList.remove('hidden');
    bankInfo.classList.add('hidden');
  }
}));

/* --- Submit Order --- */
orderForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = nameInput.value.trim();
  const phone = phoneInput.value.trim();
  const category = categoryInput.value;
  const details = detailsInput.value.trim();
  const knowsPrice = qs('input[name="knowPrice"]:checked').value === 'yes';
  const transaction = transactionInput.value.trim();
  if(!name || !phone || !category){
    alert('الرجاء ملء الحقول المطلوبة');
    return;
  }

  // build order object
  const orderId = genOrderId();
  const orderObject = {
    name,
    phone,
    category,
    details,
    price: knowsPrice ? transaction : '',
    status: "قيد الانتظار",
    transaction: transaction || '',
    orderId,
    timestamp: new Date()
  };

  // show confirmation modal (simple confirm) with bank info and all details
  let confirmMsg = `تفاصيل الطلب:\nالاسم: ${name}\nالهاتف: ${phone}\nالفئة: ${category}\nالطلب: ${details || '—'}\nرمز الطلب: ${orderId}\nالحالة: ${orderObject.status}`;
  if(knowsPrice){
    confirmMsg += `\nرقم العملية/الحساب: ${transaction || '—'}\nتحويل لبنك الخرطوم 4054558 باسم مجاهد عبدالسلام`;
  } else {
    confirmMsg += `\nسيتم التواصل لتأكيد السعر`;
  }
  const proceed = confirm(confirmMsg + '\n\nهل تؤكد إرسال الطلب؟');
  if(!proceed) return;

  // handle image upload if any
  const file = imageInput.files[0];
  try {
    if(file){
      const path = `orders/${orderId}/${Date.now()}_${file.name}`;
      const sRef = storageRef(storage, path);
      const snap = await uploadBytes(sRef, file);
      const url = await getDownloadURL(sRef);
      orderObject.imageUrl = url;
    }

    // save to firestore
    await addDoc(collection(db, "orders"), orderObject);

    // open WhatsApp with a prefilled message to the village number
    const waNumber = '249909414981'; // Sudan number in international format without plus
    const waText = encodeURIComponent(
      `طلب جديد من قرية الكنز\nالاسم: ${name}\nالهاتف: ${phone}\nالفئة: ${category}\nالطلب: ${details || '—'}\nرمز الطلب: ${orderId}\n${knowsPrice ? `رقم العملية/حساب: ${transaction}` : 'لم يعرف السعر بعد'}`
    );
    const waUrl = `https://wa.me/${waNumber}?text=${waText}`;
    window.open(waUrl, '_blank');

    // show notification card
    renderNotification(orderObject);
    orderForm.reset();
    // reset UI state
    priceRadios[0].checked = true;
    priceLabel.classList.remove('hidden');
    noPriceNote.classList.add('hidden');
    if (typeof bankInfo !== 'undefined') bankInfo.classList.add('hidden');

    showView('view-notification');
  } catch (err) {
    console.error(err);
    alert('حدث خطأ أثناء إرسال الطلب. حاول مرة أخرى.');
  }
});

/* --- Notification render --- */
function renderNotification(order){
  notificationCard.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center">
      <div>
        <h3 style="margin:0 0 6px 0">الإشعار البنكي — طلب وارد</h3>
        <div style="color:var(--muted)"><strong>رمز الطلب:</strong> <span class="tag">${order.orderId}</span></div>
      </div>
    </div>
    <hr style="border:none;height:1px;background:rgba(255,255,255,0.04);margin:10px 0" />
    <p><strong>الاسم:</strong> ${order.name}</p>
    <p><strong>الهاتف:</strong> ${order.phone}</p>
    <p><strong>الفئة:</strong> ${order.category}</p>
    <p><strong>الطلب:</strong> ${order.details || '—'}</p>
    <p class="order-meta"><strong>الحالة:</strong> ${order.status}</p>
    ${order.transaction ? `<p class="order-meta"><strong>رقم العملية:</strong> ${order.transaction}</p>` : ''}
    <p class="order-meta"><strong>التاريخ:</strong> ${formatDate(order.timestamp)}</p>
    ${order.price || order.transaction ? `<p style="margin-top:8px;color:var(--muted)">تحويل لبنك الخرطوم 4054558 باسم مجاهد عبدالسلام</p>` : ''}
  `;
  notificationCard.className = 'card notification success glow';
}

/* --- My Orders --- */
lookupBtn.addEventListener('click', async () => {
  const phone = lookupPhone.value.trim();
  if(!phone){ alert('ادخل رقم الهاتف'); return; }
  myordersList.innerHTML = '<div class="card">جارٍ جلب الطلبات...</div>';
  try {
    const q = query(collection(db, "orders"), where("phone", "==", phone), orderBy("timestamp", "desc"));
    const snap = await getDocs(q);
    renderOrdersList(snap.docs.map(d => ({ id: d.id, ...d.data() })), myordersList);
  } catch (err){
    console.error(err);
    myordersList.innerHTML = '<div class="card">حدث خطأ أثناء جلب الطلبات.</div>';
  }
});
lookupClear.addEventListener('click', ()=> {
  lookupPhone.value = '';
  myordersList.innerHTML = '';
});

/* render helper for list */
function renderOrdersList(list, container){
  if(!list.length){
    container.innerHTML = '<div class="card">لا توجد طلبات لهذا الرقم.</div>';
    return;
  }
  container.innerHTML = '';
  list.forEach(order => {
    const el = document.createElement('div');
    el.className = 'order-card';
    el.innerHTML = `
      <div class="order-main">
        <div><strong>${order.name}</strong> — <span class="tag">${order.orderId}</span></div>
        <div class="order-meta"><strong>الهاتف:</strong> ${order.phone} — <strong>الحالة:</strong> ${order.status}</div>
        <div class="order-meta">${order.category} • ${order.details || ''}</div>
        <div class="order-meta"><small>${formatDate(order.timestamp)}</small></div>
      </div>
      <div>
        ${order.imageUrl ? `<a href="${order.imageUrl}" target="_blank" class="btn">عرض صورة</a>` : ''}
      </div>
    `;
    container.appendChild(el);
  });
}

/* --- Admin view --- */
async function loadAdminView(){
  showView('view-admin');
  adminList.innerHTML = '<div class="card">جارٍ جلب جميع الطلبات...</div>';
  await refreshAdmin();
}

refreshOrders.addEventListener('click', refreshAdmin);

async function refreshAdmin(){
  try {
    const q = query(collection(db, "orders"), orderBy("timestamp", "desc"));
    const snap = await getDocs(q);
    const docs = snap.docs.map(d => ({ id: d.id, refId: d.id, ...d.data() }));
    renderAdminList(docs);
  } catch (err) {
    console.error(err);
    adminList.innerHTML = '<div class="card">تعذر جلب الطلبات</div>';
  }
}

function renderAdminList(orders){
  adminList.innerHTML = '';
  if(!orders.length){
    adminList.innerHTML = '<div class="card">لا توجد طلبات حتى الآن.</div>';
    return;
  }
  orders.forEach(order => {
    const card = document.createElement('div');
    card.className = 'card';
    card.style.marginBottom = '10px';
    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px">
        <div>
          <div><strong>${order.name}</strong> — <span class="tag">${order.orderId}</span></div>
          <div class="order-meta">${order.category} • ${order.details || ''}</div>
          <div class="order-meta"><strong>هاتف:</strong> ${order.phone} — <small>${formatDate(order.timestamp)}</small></div>
        </div>
        <div class="admin-controls">
          ${order.imageUrl ? `<a href="${order.imageUrl}" target="_blank" class="btn">صورة</a>` : ''}
        </div>
      </div>
      <div style="margin-top:10px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <label style="flex:1;min-width:160px">الحالة
          <select data-id="${order.refId}" class="admin-status">
            <option ${order.status==='قيد الانتظار'?'selected':''}>قيد الانتظار</option>
            <option ${order.status==='قيد التجهيز'?'selected':''}>قيد التجهيز</option>
            <option ${order.status==='تم التوصيل'?'selected':''}>تم التوصيل</option>
            <option ${order.status==='ملغى'?'selected':''}>ملغى</option>
          </select>
        </label>
        <label style="min-width:160px">السعر / رقم العملية
          <input type="text" data-id="${order.refId}" class="admin-price" value="${order.transaction || order.price || ''}" />
        </label>
        <button class="btn admin-save" data-id="${order.refId}">حفظ</button>
      </div>
    `;
    adminList.appendChild(card);
  });

  // attach handlers
  qsa('.admin-save', adminList).forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.currentTarget.dataset.id;
      const sel = adminList.querySelector(`select[data-id="${id}"]`);
      const input = adminList.querySelector(`input[data-id="${id}"]`);
      const newStatus = sel.value;
      const newPrice = input.value.trim();
      try {
        await updateDoc(doc(db, "orders", id), {
          status: newStatus,
          transaction: newPrice,
          // keep timestamp unchanged
        });
        alert('تم حفظ التعديل');
        await refreshAdmin();
      } catch (err) {
        console.error(err);
        alert('فشل حفظ التعديل');
      }
    });
  });
}

/* --- Init to home --- */
showView('view-home');