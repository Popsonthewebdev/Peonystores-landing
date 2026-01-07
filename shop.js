<script type="module">
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-storage.js";

const storage = getStorage(app);

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getFirestore, collection, getDocs, doc, setDoc, query, where, getDoc } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyC5Ez5hbMCbLmybJwcpqaNPR7fTwhvT_B8",
    authDomain: "peonystores-e0710.firebaseapp.com",
    projectId: "peonystores-e0710",
    storageBucket: "peonystores-e0710.firebasestorage.app",
    messagingSenderId: "207066428162",
    appId: "1:207066428162:web:a7299f8410a1f58d25481b"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const productsCol = collection(db, "products");
const ordersCol = collection(db, "orders");

// ---------- COLOR NAME HELPERS ----------
function hexToRgb(hex) {
  hex = hex.replace("#", "");
  if (hex.length === 3) hex = hex.split("").map(c => c+c).join("");
  const num = parseInt(hex,16);
  return {r:(num>>16)&255, g:(num>>8)&255, b:num&255};
}
function getColorName(hex){
  const COLORS = {Red:[255,0,0],Green:[0,128,0],Blue:[0,0,255],Yellow:[255,255,0],Purple:[128,0,128],Pink:[255,192,203],Orange:[255,165,0],Brown:[165,42,42],Black:[0,0,0],White:[255,255,255],Grey:[128,128,128],Cyan:[0,255,255]};
  const {r,g,b}=hexToRgb(hex);
  let closest="Unknown", minDist=Infinity;
  for(let name in COLORS){
    const [cr,cg,cb]=COLORS[name];
    const dist=Math.sqrt((r-cr)**2+(g-cg)**2+(b-cb)**2);
    if(dist<minDist){minDist=dist;closest=name;}
  }
  return closest;
}

// ---------- PRODUCTS ----------
let products=[], cart=[];
const customerName=document.getElementById("customerName");
const customerPhone=document.getElementById("customerPhone");
const customerAddress=document.getElementById("customerAddress");
const customerEmail=document.getElementById("customerEmail");
const receiptUrl=document.getElementById("receiptUrl");

async function loadProducts(){
  const snapshot = await getDocs(productsCol);
  products = snapshot.docs.map(doc=>({id:doc.id,...doc.data()}));
  renderProducts();
}

// ---------- RENDER PRODUCTS ----------
function renderProducts(){
  const search=searchInput.value.toLowerCase();
  const cat=categoryFilter.value;
  const productsBox=document.getElementById("products");
  productsBox.innerHTML="";

  products.forEach(p=>{
    if(search && !p.name.toLowerCase().includes(search)) return;
    if(cat && p.category !== cat) return;

    // Color
    let colorHTML="";
    if(p.colors && p.colors.length>0){
      colorHTML='<div class="color-options">';
      p.colors.forEach(c=>{
        colorHTML+=`<span class="color-swatch" data-product="${p.id}" data-color="${c}" style="background:${c}" title="${c}"></span>`;
      });
      colorHTML+="</div>";
    }

    // Size
    let sizeHTML="";
    if(p.sizes && p.sizes.length>0){
      sizeHTML=`<div style="margin:5px 0">
        <label style="font-size:13px;font-weight:600">Size:</label>
        <select class="size-select" data-product="${p.id}">
          ${p.sizes.map(s=>`<option value="${s}">${s}</option>`).join("")}
        </select>
      </div>`;
    }

    productsBox.innerHTML+=`<div class="product-card">
      <img src="${p.image}">
      <h3>${p.name}</h3>
      <p style="font-size:12px;color:#555">${p.description||""}</p>
      <p>₦${p.price}</p>
      ${sizeHTML}
      ${colorHTML}
      <div class="qty-container">
        <label>Qty:</label>
        <button class="qty-btn" onclick="changeQty('${p.id}',-1)">−</button>
        <input type="number" id="qty-${p.id}" class="qty" min="1" value="1" data-id="${p.id}">
        <button class="qty-btn" onclick="changeQty('${p.id}',1)">+</button>
      </div>
      <button class="btn" onclick="addToCart('${p.id}')">Add to Cart</button>
    </div>`;
  });
  updateCartTotal();
}

// ---------- QTY ----------
function changeQty(id,delta){
  const input=document.getElementById(`qty-${id}`);
  let val=parseInt(input.value)||1;
  val+=delta;
  if(val<1) val=1;
  input.value=val;
  updateCartTotal();
}

// ---------- ADD TO CART ----------
function addToCart(id){
  const product=products.find(p=>p.id===id);
  const qty=parseInt(document.getElementById(`qty-${id}`).value);
  if(qty<1){alert("Invalid quantity");return;}

  const selectedSwatch=document.querySelector(`.color-swatch.selected[data-product='${id}']`);
  const selectedColor=selectedSwatch ? selectedSwatch.dataset.color : null;
  const sizeSelect=document.querySelector(`.size-select[data-product='${id}']`);
  const selectedSize=sizeSelect ? sizeSelect.value : null;

  const existing=cart.find(i=>i.id===product.id && i.color===selectedColor && i.size===selectedSize);
  if(existing){existing.quantity+=qty;} 
  else {
    cart.push({id:product.id,name:product.name,price:product.price,quantity:qty,color:selectedColor,size:selectedSize,image:product.image});
  }

  document.querySelectorAll(`.color-swatch[data-product='${id}']`).forEach(s=>s.classList.remove('selected'));
  const notif=document.getElementById("cartNotification");
  notif.style.display="block";
  setTimeout(()=>{notif.style.display="none"},1500);
  updateCartTotal();
}

// ---------- CART ----------
function updateCartTotal(){
  let total=cart.reduce((a,b)=>a+b.price*b.quantity,0);
  document.getElementById("cartTotal").textContent=total;
}

checkoutBtn.onclick=renderCart;
function renderCart(){
  if(cart.length===0){alert("Cart empty"); return;}
  const div=document.getElementById("cartItems");
  div.innerHTML="";
  cart.forEach((i,index)=>{
    div.innerHTML+=`<div class="cart-row">
      <div><b>${i.name}</b>
        ${i.size ? `<br><span style="font-size:12px">Size: ${i.size}</span>` : ""}
        ${i.color ? `<br><span style="font-size:12px">Color: ${getColorName(i.color)}</span>` : ""}
      </div>
      <div class="cart-controls">
        <button onclick="changeCartItemQty(${index},-1)">−</button>
        ${i.quantity}
        <button onclick="changeCartItemQty(${index},1)">+</button>
        <button onclick="removeItem(${index})" style="color:red">✕</button>
      </div>
    </div>`;
  });
  updateCartTotal();
  cartModal.style.display="flex";
}

function changeCartItemQty(index,delta){
  cart[index].quantity+=delta;
  if(cart[index].quantity<1) cart[index].quantity=1;
  renderCart();
}
function removeItem(index){cart.splice(index,1); renderCart();}
function closeModal(){cartModal.style.display="none";}

// ---------- CONFIRM ORDER ----------

async function confirmOrder() {
  if(!customerName.value || !customerPhone.value){ alert("Fill required fields"); return; }

  let receiptLink = receiptUrl.value.trim(); // start with user-pasted URL
  const file = receiptFile.files[0];         // uploaded file

  if(file){ // if customer uploaded a file
    const storageRef = ref(storage, `receipts/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    receiptLink = await getDownloadURL(storageRef);
  }

  const orderId = Date.now().toString();
  const orderData = {
    id: orderId,
    customer: customerName.value.trim(),
    phone: customerPhone.value.trim(),
    email: customerEmail.value.trim(),
    address: customerAddress.value.trim(),
    items: cart.map(i=>({
      id:i.id, name:i.name, price:i.price, quantity:i.quantity, color:i.color, size:i.size
    })),
    total: cart.reduce((a,b)=>a+b.price*b.quantity,0),
    status: receiptLink ? "AWAITING CONFIRMATION" : "PENDING",
    receipt_url: receiptLink || null,
    date: new Date().toLocaleString()
  };

  await setDoc(doc(ordersCol, orderId), orderData);

  cart=[];
  closeModal();
  renderProducts();
  alert(`Order placed! Your Order ID: ${orderId}\nPickup at shop after payment confirmation.`);
}

async function confirmOrder(){
  if(!customerName.value||!customerPhone.value){alert("Fill required fields");return;}
  const orderId=Date.now().toString();
  const orderData={
    id:orderId,
    customer:customerName.value.trim(),
    phone:customerPhone.value.trim(),
    email:customerEmail.value.trim(),
    address:customerAddress.value.trim(),
    items:cart.map(i=>({id:i.id,name:i.name,price:i.price,quantity:i.quantity,color:i.color,size:i.size})),
    total:cart.reduce((a,b)=>a+b.price*b.quantity,0),
    status: receiptUrl.value ? "AWAITING CONFIRMATION" : "PENDING",
    receipt_url: receiptUrl.value.trim(),
    date:new Date().toLocaleString()
  };
  // Save to Firestore
  await setDoc(doc(ordersCol, orderId), orderData);

  cart=[];
  closeModal();
  renderProducts();
  alert(`Order placed! Your Order ID: ${orderId}\nCheck order history for shipment status to Pickup at indepence hall University of Ibadan or call 08140523912 for home delivery.`);
}

// ---------- ORDER HISTORY ----------
myOrdersBtn.onclick=()=>{ordersModal.style.display="flex";}
function closeOrders(){ordersModal.style.display="none"; ordersList.innerHTML=""; lookupPhone.value=""; lookupPhone.blur();}
lookupPhone.oninput=async ()=>{
  const phone=lookupPhone.value.trim();
  ordersList.innerHTML="";
  if(!phone) return;
  const q = query(ordersCol, where("phone","==",phone));
  const snapshot = await getDocs(q);
  if(snapshot.empty){ordersList.innerHTML="<p>No orders found</p>"; return;}
  snapshot.forEach(o=>{
    const data=o.data();
    const items=data.items.map(i=>`${i.name}${i.size?` (${i.size})`:''}${i.color?` - ${getColorName(i.color)}`:''} x${i.quantity}`).join(" | ");
    ordersList.innerHTML+=`<p><b>Order ID:</b> ${data.id}<br>
      <b>Date:</b> ${data.date}<br>
      <b>Total:</b> ₦${data.total}<br>
      <b>Status:</b> ${data.status}<br>
      <b>Items:</b> ${items}</p><hr>`;
  });
}

// Color selection
document.addEventListener('click', e=>{
  if(e.target.classList.contains('color-swatch')){
    const pid=e.target.dataset.product;
    document.querySelectorAll(`.color-swatch[data-product='${pid}']`).forEach(s=>s.classList.remove('selected'));
    e.target.classList.add('selected');
  }
});

searchInput.oninput=renderProducts;
categoryFilter.onchange=renderProducts;

// ---------- INIT ----------
loadProducts();

</script>
