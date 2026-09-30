const $ = (s) => document.querySelector(s);
let token = localStorage.getItem('token');
let user = JSON.parse(localStorage.getItem('user') || 'null');
let authMode = 'login';
let tab = 'books';

const COLORS = ['#0f766e', '#2563eb', '#7c3aed', '#db2777', '#d97706', '#059669', '#dc2626'];
const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const colorFor = (str) => COLORS[[...str].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length];

function toast(msg, isErr) {
  const t = $('#toast');
  t.textContent = msg;
  t.className = 'show' + (isErr ? ' err' : '');
  setTimeout(() => (t.className = ''), 2500);
}

async function api(url, method = 'GET', body) {
  const res = await fetch('/api' + url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token && { Authorization: 'Bearer ' + token }) },
    body: body && JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Something went wrong');
  return data;
}

function logout() { localStorage.clear(); token = user = null; tab = 'books'; render(); }

function render() {
  $('#navRight').innerHTML = user
    ? `<span>Hi, ${esc(user.name)} (${user.role === 'admin' ? 'librarian' : 'student'})</span><button class="btn ghost" onclick="logout()">Logout</button>`
    : '';
  if (!user) return renderAuth();
  renderDashboard();
}

/* ---------- AUTH ---------- */
function renderAuth() {
  const reg = authMode === 'register';
  $('#app').innerHTML = `
  <div class="card auth">
    <h2>${reg ? 'Join the library' : 'Welcome back 📖'}</h2>
    <p class="sub">Browse, borrow and track your books in one place.</p>
    <div class="tabs">
      <button class="${!reg ? 'active' : ''}" onclick="authMode='login';renderAuth()">Login</button>
      <button class="${reg ? 'active' : ''}" onclick="authMode='register';renderAuth()">Register</button>
    </div>
    <form onsubmit="submitAuth(event)">
      ${reg ? `<label>Full Name</label><input id="name" required />` : ''}
      <label>Email</label><input id="email" type="email" required />
      <label>Password</label><input id="password" type="password" required />
      ${reg ? `<label>Librarian Code (only for admin)</label><input id="adminCode" placeholder="Leave empty if student" />` : ''}
      <button class="btn full">${reg ? 'Sign Up' : 'Login'}</button>
    </form>
  </div>`;
}

async function submitAuth(e) {
  e.preventDefault();
  const v = (id) => ($('#' + id) ? $('#' + id).value.trim() : undefined);
  try {
    const body = { email: v('email'), password: $('#password').value };
    if (authMode === 'register') Object.assign(body, { name: v('name'), adminCode: v('adminCode') });
    const data = await api('/auth/' + authMode, 'POST', body);
    token = data.token; user = data.user;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    toast('Welcome, ' + user.name + '!');
    render();
  } catch (err) { toast(err.message, true); }
}

/* ---------- DASHBOARD SHELL ---------- */
function renderDashboard() {
  const admin = user.role === 'admin';
  $('#app').innerHTML = `
    <div id="stats"></div>
    <div class="mainTabs">
      <button class="${tab === 'books' ? 'active' : ''}" onclick="tab='books';renderDashboard()">📚 ${admin ? 'Manage Books' : 'Browse Books'}</button>
      <button class="${tab === 'issues' ? 'active' : ''}" onclick="tab='issues';renderDashboard()">📖 ${admin ? 'Issued Records' : 'My Books'}</button>
    </div>
    <div id="view"></div>`;
  if (admin) loadStats();
  tab === 'books' ? renderBooksView() : renderIssuesView();
}

async function loadStats() {
  const s = await api('/issues/stats');
  $('#stats').innerHTML = `<div class="stats">` +
    [['Book Titles', s.books, 's1'], ['Copies Available', s.availableCopies, 's2'], ['Currently Issued', s.issued, 's3'], ['Overdue', s.overdue, 's4'], ['Members', s.members, 's5']]
      .map(([n, v, c]) => `<div class="stat ${c}"><h3>${v}</h3><p>${n}</p></div>`).join('') + `</div>`;
}

/* ---------- BOOKS VIEW ---------- */
async function renderBooksView() {
  const admin = user.role === 'admin';
  const cats = await api('/books/categories');
  const list = `
    <div class="card">
      <div class="toolbar">
        <input id="q" placeholder="🔍 Search by title, author or ISBN" oninput="loadBooks()" />
        <select id="cat" onchange="loadBooks()"><option value="">All Categories</option>${cats.map((c) => `<option>${esc(c)}</option>`).join('')}</select>
      </div>
      <div id="books" class="books"></div>
    </div>`;
  $('#view').innerHTML = admin
    ? `<div class="layout">
        <div class="card">
          <h3>➕ Add New Book</h3>
          <form onsubmit="addBook(event)">
            <label>Title</label><input id="bt" required />
            <label>Author</label><input id="ba" required />
            <div class="grid2">
              <div><label>Category</label><input id="bc" placeholder="Science" /></div>
              <div><label>Copies</label><input id="bn" type="number" min="1" value="1" required /></div>
            </div>
            <label>ISBN (optional)</label><input id="bi" />
            <button class="btn full">Add Book</button>
          </form>
        </div>${list}</div>`
    : list;
  loadBooks();
}

async function loadBooks() {
  const q = new URLSearchParams({ q: $('#q').value, category: $('#cat').value }).toString();
  const books = await api('/books?' + q);
  const admin = user.role === 'admin';
  $('#books').innerHTML = books.length ? books.map((b) => `
    <div class="book">
      <div class="cover" style="background:${colorFor(b.title)}">📕</div>
      <h4>${esc(b.title)}</h4>
      <small>by ${esc(b.author)}</small>
      <span class="tag">${esc(b.category)}</span>
      <span class="avail ${b.available ? 'ok' : 'no'}">${b.available} of ${b.copies} available</span>
      ${admin
        ? `<button class="btn sm danger" onclick="deleteBook('${b._id}')">Delete</button>`
        : `<button class="btn sm" ${b.available ? '' : 'disabled'} onclick="borrow('${b._id}')">${b.available ? 'Borrow (14 days)' : 'Not available'}</button>`}
    </div>`).join('') : '<div class="empty" style="grid-column:1/-1">No books found.</div>';
}

async function addBook(e) {
  e.preventDefault();
  try {
    await api('/books', 'POST', { title: $('#bt').value, author: $('#ba').value, category: $('#bc').value, copies: $('#bn').value, isbn: $('#bi').value });
    toast('Book added ✅');
    renderDashboard();
  } catch (err) { toast(err.message, true); }
}

async function deleteBook(id) {
  if (!confirm('Delete this book?')) return;
  try { await api('/books/' + id, 'DELETE'); toast('Deleted'); renderDashboard(); }
  catch (err) { toast(err.message, true); }
}

async function borrow(id) {
  try { await api('/issues/' + id, 'POST'); toast('Book issued! Return within 14 days 📖'); loadBooks(); }
  catch (err) { toast(err.message, true); }
}

/* ---------- ISSUES VIEW ---------- */
async function renderIssuesView() {
  const admin = user.role === 'admin';
  $('#view').innerHTML = `<div class="card"><h3>${admin ? 'All Issue Records' : 'My Borrowed Books'}</h3><div id="list" style="margin-top:16px"></div></div>`;
  const list = await api(admin ? '/issues' : '/issues/mine');
  $('#list').innerHTML = list.length ? list.map((i) => {
    const overdue = i.status === 'Issued' && new Date(i.dueDate) < new Date();
    const state = overdue ? 'Overdue' : i.status;
    return `
    <div class="item">
      <div>
        <h4>${esc(i.book ? i.book.title : 'Deleted book')}</h4>
        <div class="meta">${admin && i.student ? 'Student: ' + esc(i.student.name) + ' • ' : ''}Issued ${fmt(i.issueDate)} • Due ${fmt(i.dueDate)}
          ${i.returnDate ? ' • Returned ' + fmt(i.returnDate) : ''}</div>
        ${i.fine > 0 ? `<div class="meta fine">Fine: ₹${i.fine}</div>` : ''}
      </div>
      <div style="display:flex;gap:10px;align-items:center">
        <span class="badge ${state}">${state}</span>
        ${i.status === 'Issued' ? `<button class="btn sm orange" onclick="returnBook('${i._id}')">Return</button>` : ''}
      </div>
    </div>`;
  }).join('') : '<div class="empty">No records yet.</div>';
}

async function returnBook(id) {
  try {
    const r = await api('/issues/' + id + '/return', 'PATCH');
    toast(r.fine > 0 ? `Returned. Fine: ₹${r.fine}` : 'Returned on time ✅');
    renderDashboard();
  } catch (err) { toast(err.message, true); }
}

render();
