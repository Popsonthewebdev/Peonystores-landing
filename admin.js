<script type="module">
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getFirestore, collection, getDocs, getDoc, addDoc, updateDoc, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyC5Ez5hbMCbLmybJwcpqaNPR7fTwhvT_B8",
  authDomain: "peonystores-e0710.firebaseapp.com",
  projectId: "peonystores-e0710",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

onAuthStateChanged(auth, user => {
  if (!user) window.location.href = "admin-auth.html";
});

// Compress image function
function compressImage(file, maxWidth = 800, quality = 0.7) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const scale = Math.min(maxWidth / img.width, 1);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// CATEGORY & SUBCATEGORY
const subcategories = {
  "Hair Care":["Hair Extensions","Hair Products","Hair Styling Materials","Hair Maintenance Materials"],
  "Facial & Body Care":["Facial Masks","Facial & Body Care Products","Facial & Body Care Materials"],
  "Body Scents":["Perfumes","Body Mists","Body Sprays","Perfume Oil","Atomizer","Air Fresheners"],
  "Wears":["Unisex","Male","Female"],
  "Food Corner":["Edibles","Drinks","Bake It Yourself"],
  "Others":["Miscellaneous"]
};

const categorySelect = document.getElementById("categorySelect");
const subcategorySelect = document.getElementById("subcategorySelect");
categorySelect.addEventListener("change", ()=>{
  const cat = categorySelect.value;
  subcategorySelect.innerHTML = '<option value="">Select Subcategory</option>';
  subcategories[cat]?.forEach(sub=>{
    const opt = document.createElement("option");
    opt.value = sub; opt.textContent = sub;
    subcategorySelect.appendChild(opt);
  });
});

// PRODUCT MANAGEMENT
const addForm = document.getElementById("addProductForm");
addForm.addEventListener("submit", e=>{
  e.preventDefault();
  const fileInput = document.getElementById("imageFileInput");
  const urlInput = document.getElementById("imageURLInput").value.trim();
  const editingIndex = document.getElementById("editingIndex").value;

  async function finalizeSave(imageData){
    const productData = {
      name: productName.value,
      description: descriptionInput.value.trim(),
      category: categorySelect.value,
      subcategory: subcategorySelect.value,
      colors: colorsInput.value.split(",").map(c=>c.trim()).filter(Boolean),
      sizes: sizesInput.value.split(",").map(s=>s.trim()).filter(Boolean),
      price: Number(priceInput.value),
      stock: Number(stockInput.value),
      image: imageData || ""
    };

    if(editingIndex){
      await updateDoc(doc(db,"products",editingIndex), productData);
    } else {
      await addDoc(collection(db,"products"), productData);
    }

    addForm.reset();
    editingIndex.value="";
    renderProductsTable();
  }

  if(fileInput.files && fileInput.files[0]){
    compressImage(fileInput.files[0]).then(finalizeSave);
  } else {
    finalizeSave(urlInput);
  }
});

// RENDER PRODUCTS
async function renderProductsTable(){
  const tbody = document.querySelector("#productsTable tbody");
  tbody.innerHTML = "";
  const snap = await getDocs(collection(db,"products"));
  snap.forEach(docSnap=>{
    const p = docSnap.data();
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${p.name}</td>
      <td>${p.category}</td>
      <td>${p.subcategory}</td>
      <td>${(p.colors||[]).join(", ")}</td>
      <td>${(p.sizes||[]).join(", ") || "-"}</td>
      <td>₦${p.price}</td>
      <td>${p.stock}</td>
      <td>
        <button onclick="editProduct('${docSnap.id}')">Edit</button>
        <button onclick="deleteProduct('${docSnap.id}')">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

async function editProduct(id){
  const snap = await getDoc(doc(db,"products",id));
  const p = snap.data();

  productName.value = p.name;
  descriptionInput.value = p.description || "";
  categorySelect.value = p.category;

  subcategorySelect.innerHTML = '<option value="">Select Subcategory</option>';
  subcategories[p.category]?.forEach(sub=>{
    const opt = document.createElement("option");
    opt.value = sub; opt.textContent = sub;
    subcategorySelect.appendChild(opt);
  });

  subcategorySelect.value = p.subcategory;
  colorsInput.value = (p.colors||[]).join(", ");
  sizesInput.value = (p.sizes||[]).join(", ");
  priceInput.value = p.price;
  stockInput.value = p.stock;
  imageURLInput.value = p.image || "";

  editingIndex.value = id;
  formTitle.textContent = "Edit Product";
  submitBtn.textContent = "Save Changes";
}

async function deleteProduct(id){
  if(confirm("Delete product?")){
    await deleteDoc(doc(db,"products",id));
    renderProductsTable();
  }
}

// ORDERS RENDER
async function renderOrders(){
  const tbody = document.querySelector("#ordersTable tbody");
  tbody.innerHTML="";
  const snap = await getDocs(collection(db,"orders"));
  snap.forEach(docSnap=>{
    const o = docSnap.data();
    const items = o.items.map(i => {
      let label = i.name;
      if(i.color && i.size) label += ` (${i.color}, ${i.size})`;
      else if(i.color) label += ` (${i.color})`;
      else if(i.size) label += ` (${i.size})`;
      return `${i.quantity}× ${label}`;
    }).join(" | ");

    const orderDate = o.date && o.date.seconds ? new Date(o.date.seconds*1000).toISOString().split("T")[0] : o.date;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${docSnap.id}</td>
      <td>${o.customer}</td>
      <td>${o.phone}</td>
      <td>${o.address||""}</td>
      <td>${items}</td>
      <td>₦${o.total}</td>
      <td>
        <select onchange="updateOrderStatus('${docSnap.id}',this.value)">
          <option ${o.status==="PENDING"?"selected":""}>PENDING</option>
          <option ${o.status==="AWAITING CONFIRMATION"?"selected":""}>AWAITING CONFIRMATION</option>
          <option ${o.status==="PACKED"?"selected":""}>PACKED</option>
          <option ${o.status==="DISPATCHED"?"selected":""}>DISPATCHED</option>
          <option ${o.status==="COMPLETED"?"selected":""}>COMPLETED</option>
        </select>
      </td>
      <td>
        ${o.receipt_image ? `<img src="${o.receipt_image}" width="80">` : o.receipt_url ? `<a href="${o.receipt_url}" target="_blank">View</a>` : ""}
      </td>
      <td>${orderDate}</td>
    `;
    tbody.appendChild(tr);
  });
}

async function updateOrderStatus(id,status){
  await updateDoc(doc(db,"orders",id),{status});
}

// CSV DOWNLOAD
async function downloadCSV(){
  const snap = await getDocs(collection(db,"orders"));
  const orders = snap.docs.map(d => ({id:d.id, ...d.data()}));
  const fromDate = document.getElementById("csvFromDate").value;
  const toDate = document.getElementById("csvToDate").value;

  let csv = "Order ID,Customer,Phone,Address,Items,Total,Status,Date\n";
  orders.forEach(o => {
    const orderDate = o.date && o.date.seconds ? new Date(o.date.seconds*1000).toISOString().split("T")[0] : o.date;
    if(fromDate && orderDate < fromDate) return;
    if(toDate && orderDate > toDate) return;

    const items = o.items.map(i => {
      let label = i.name;
      if(i.color && i.size) label += ` (${i.color}, ${i.size})`;
      else if(i.color) label += ` (${i.color})`;
      else if(i.size) label += ` (${i.size})`;
      return `${i.quantity}× ${label}`;
    }).join(" | ");

    csv += `"${o.id}","${o.customer}","${o.phone}","${o.address||""}","${items}","${o.total}","${o.status}","${orderDate}"\n`;
  });

  const blob = new Blob([csv],{type:"text/csv"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `PeonyOrders_${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// EXCEL-STYLE FILTERS
const activeFilters = {};

function setupExcelFilters(){
  const headers = document.querySelectorAll("#ordersTable thead th");
  headers.forEach(th=>{
    const col = th.dataset.column;
    if(!col) return;

    const btn = document.createElement("button");
    btn.textContent = "▼";
    btn.style.marginLeft="6px";
    btn.style.padding="2px 5px";
    btn.style.cursor="pointer";
    btn.style.background="#fff";
    btn.style.border="1px solid #ccc";
    btn.style.borderRadius="4px";
    btn.style.color="#333";

    btn.onclick = e=>{
      e.stopPropagation();
      showFilterDropdown(col,th);
    };
    th.appendChild(btn);
  });
}

function showFilterDropdown(column,th){
  let existing = document.querySelector(".filter-dropdown");
  if(existing) existing.remove();

  const dropdown = document.createElement("div");
  dropdown.className = "filter-dropdown";
  const rect = th.getBoundingClientRect();
  dropdown.style.top = rect.bottom + window.scrollY + "px";
  dropdown.style.left = rect.left + window.scrollX + "px";
  dropdown.style.minWidth = rect.width + "px";

  const tbody = document.querySelector("#ordersTable tbody");
  const rows = Array.from(tbody.querySelectorAll("tr")).filter(r=>r.style.display!=="none");
  let values = new Set();
  rows.forEach(row=>{
    let text="";
    switch(column){
      case "id": text=row.cells[0].textContent; break;
      case "customer": text=row.cells[1].textContent; break;
      case "phone": text=row.cells[2].textContent; break;
      case "address": text=row.cells[3].textContent; break;
      case "items": text=row.cells[4].textContent; break;
      case "total": text=row.cells[5].textContent; break;
      case "status": text=row.cells[6].querySelector("select")?.value || ""; break;
      case "receipt_url": text=row.cells[7].textContent; break;
      case "date": text=row.cells[8].textContent; break;
    }
    if(text) values.add(text);
  });

  values = Array.from(values).sort();
  const searchInput = document.createElement("input");
  searchInput.type="text";
  searchInput.placeholder="Search...";
  searchInput.style.width="95%";
  searchInput.style.marginBottom="5px";
  searchInput.style.padding="2px 5px";
  dropdown.appendChild(searchInput);

  const allOption = document.createElement("div");
  allOption.textContent="All";
  allOption.style.cursor="pointer";
  allOption.style.padding="2px 5px";
  allOption.onclick = ()=>{activeFilters[column]=null; filterExcel(); dropdown.remove();};
  dropdown.appendChild(allOption);

  const optionsDiv = document.createElement("div");
  values.forEach(val=>{
    const div = document.createElement("div");
    div.textContent=val;
    div.style.cursor="pointer";
    div.style.padding="2px 5px";
    div.onclick = ()=>{activeFilters[column]=val; filterExcel(); dropdown.remove();};
    optionsDiv.appendChild(div);
  });
  dropdown.appendChild(optionsDiv);

searchInput.addEventListener("input", ()=>{
    const query = searchInput.value.toLowerCase();
    Array.from(optionsDiv.children).forEach(div=>{
      div.style.display = div.textContent.toLowerCase().includes(query) ? "" : "none";
    });
  });

  document.body.appendChild(dropdown);

  document.addEventListener("click", function clickOutside(event){
    if(!dropdown.contains(event.target)){
      dropdown.remove();
      document.removeEventListener("click", clickOutside);
    }
  });
}

function filterExcel(){
  const tbody = document.querySelector("#ordersTable tbody");
  const rows = Array.from(tbody.querySelectorAll("tr"));
  rows.forEach(row=>{
    let show = true;
    for(const col in activeFilters){
      const filterVal = activeFilters[col];
      if(filterVal){
        let cellText = "";
        switch(col){
          case "id": cellText=row.cells[0].textContent; break;
          case "customer": cellText=row.cells[1].textContent; break;
          case "phone": cellText=row.cells[2].textContent; break;
          case "address": cellText=row.cells[3].textContent; break;
          case "items": cellText=row.cells[4].textContent; break;
          case "total": cellText=row.cells[5].textContent; break;
          case "status": cellText=row.cells[6].querySelector("select")?.value || ""; break;
          case "receipt_url": cellText=row.cells[7].textContent; break;
          case "date": cellText=row.cells[8].textContent; break;
        }
        if(cellText !== filterVal) show = false;
      }
    }
    row.style.display = show ? "" : "none";
  });

  // Highlight filtered headers
  const headers = document.querySelectorAll("#ordersTable thead th");
  headers.forEach(th=>{
    const col = th.dataset.column;
    if(!col) return;
    const btn = th.querySelector("button");
    if(!btn) return;
    if(activeFilters[col]){
      btn.style.background="#7f00ff"; 
      btn.style.color="#fff";
    } else {
      btn.style.background="#fff"; 
      btn.style.color="#333";
    }
  });
}

function resetAllFilters(){
  for(const col in activeFilters) activeFilters[col]=null;
  filterExcel();
}
// --- INITIAL RENDER ---
// Load products and orders when page opens
renderProductsTable();
renderOrders();

// Set up the Excel-style filters
setupExcelFilters();

// Optional: refresh orders and filters every 4 seconds
setInterval(() => {
  renderOrders();
  filterExcel();
}, 4000);

// --- LOGOUT BUTTON ---
const logoutBtn = document.getElementById("logoutBtn");
logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "admin-auth.html";
});
</script>
