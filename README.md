# 📚 LibraNest - Library Management System

A full stack web app where students browse and borrow books and the librarian manages the catalogue and issue records.

## Tech Stack
- **Frontend:** HTML, CSS, JavaScript
- **Backend:** Node.js + Express.js
- **Database:** MongoDB (Mongoose)
- **API:** REST API with JWT authentication
- **Version Control:** Git & GitHub

## Features
- Student / Librarian registration & login (JWT + bcrypt)
- Students: search books by title/author/ISBN, filter by category, borrow (max 3 at a time, 14-day loan), return, see fines
- Librarian: dashboard stats, add/delete books, view all issue records, process returns
- Automatic fine calculation: Rs 5 per day after the due date
- Available copies update automatically on borrow and return

## REST API
| Method | Endpoint | Access |
|---|---|---|
| POST | /api/auth/register | Public |
| POST | /api/auth/login | Public |
| GET | /api/books?q=&category= | Logged in |
| GET | /api/books/categories | Logged in |
| POST | /api/books | Librarian |
| DELETE | /api/books/:id | Librarian |
| POST | /api/issues/:bookId | Student (borrow) |
| GET | /api/issues/mine | Student |
| GET | /api/issues | Librarian |
| GET | /api/issues/stats | Librarian |
| PATCH | /api/issues/:id/return | Owner / Librarian |

## Run Locally
```bash
npm install
npm run dev
```
Open http://localhost:5001

Copy `.env.example` to `.env` and set your `MONGO_URI` (local MongoDB or Atlas).
To register as librarian, enter the `ADMIN_CODE` from `.env` (default `LIBRARIAN123`).


Output Screenshot

Login page
<img width="1912" height="972" alt="image" src="https://github.com/user-attachments/assets/7642a3d3-9a1f-4102-ae79-2cd801136512" />

Main 
<img width="1917" height="967" alt="image" src="https://github.com/user-attachments/assets/6c49a6ab-96ff-40c0-bb22-1efad0d4063f" />


