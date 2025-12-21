
# 📡 Network Inventory Management System

A full-stack **Network Inventory Management System for a Telecom Company** with role-based access, network topology visualization, task management, and an AI-powered assistant.

---

## 🚀 Features Overview

* Role-Based Access Control (Admin, Planner, Technician, Support, Customer)
* Network Asset Inventory Management
* Customer Onboarding & Lifecycle Tracking
* Field Technician Task Management
* Network Topology Visualization (FDH → Splitter → Customer)
* AI Assistant for troubleshooting & operations
* Modern Dashboard & Analytics

---

## 🏗️ System Architecture

```
Frontend (React + MUI)
        |
        |  REST API (Axios)
        |
Backend (FastAPI)
        |
        |-- SQLAlchemy ORM
        |-- SQLite (dev)
        |-- LangGraph + Gemini AI
```

---

## 🧑‍💼 User Roles & Responsibilities

| Role           | Responsibilities                   |
| -------------- | ---------------------------------- |
| **Admin**      | Full access, dashboards, analytics |
| **Planner**    | Network hierarchy, onboarding      |
| **Technician** | Deployment tasks, field assets     |
| **Support**    | Customer issues, troubleshooting   |
| **Customer**   | View plan & connection status      |

---

## 🧰 Technology Stack

### Backend

* **FastAPI (Python)**
* **SQLAlchemy ORM**
* **SQLite** (Development DB)
* **JWT Authentication**
* **LangGraph** (AI workflows)
* **Google Gemini (gemini-2.5-flash)**
* **LangChain**

### Frontend

* **React (TypeScript)**
* **Material UI**
* **React Router v6**
* **Axios**
* **React Flow** (Topology)
* **Recharts** (Analytics)
* **Dagre / ELK.js** (Graph layout)

---

## 📂 Project Structure

### Backend (`backend/app/`)

```
app/
│── main.py              # App entry point
│── models.py            # Database models
│── routers/
│   ├── auth.py          # Authentication
│   ├── ai.py            # AI assistant
│   ├── assets.py        # Asset CRUD
│   ├── topology.py      # Network visualization
│   ├── tasks.py         # Technician tasks
│   └── onboarding.py    # Customer onboarding
```

### Frontend (`frontend/src/`)

```
src/
│── App.tsx              # Routing & layouts
│── pages/
│   ├── AdminDashboard.tsx
│   ├── PlannerDashboard.tsx
│   ├── TechnicianDashboard.tsx
│   └── SupportDashboard.tsx
│── components/          # Reusable UI
│── context/AuthContext  # Auth state
```

---

## 🤖 AI Assistant Integration

### How It Works

* Endpoint: `/api/ai/chat`
* Maintains conversation using `thread_id`
* Injects **User Role & User ID** into system prompt
* Executes actions via tool bindings

### Capabilities

* 🔧 Troubleshoot installations
* 📦 Suggest available assets
* 🔍 Fetch device by serial number
* 🔄 Update task/asset status
* 🗂️ Access FDH / Splitter hierarchy

---

## ⚙️ Installation & Setup

### 🔹 Backend Setup

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Runs on: **[http://localhost:8000](http://localhost:8000)**

---

### 🔹 Frontend Setup

```bash
cd frontend
npm install
npm start
```

Runs on: **[http://localhost:3000](http://localhost:3000)**

> ⚠️ Webpack warnings can be ignored in development.

---

## 📑 API Documentation

Once backend is running, open:

```
http://localhost:8000/docs
```

* Interactive Swagger UI
* Test endpoints directly

---

## 🔄 Typical Workflow (Easy Explanation)

1. **Admin** creates users & views analytics
2. **Planner** designs network topology (FDH → Splitter)
3. **Customer** is onboarded to a splitter port
4. **Technician** receives installation task
5. **AI Assistant** helps with troubleshooting
6. **Support** resolves customer issues

---

## 📌 Future Enhancements

* PostgreSQL for production
* Real-time alerts (WebSockets)
* Mobile app for technicians
* GIS-based map integration
* Fine-grained AI permissions

---

## 🧑‍💻 Author

**Pragadeesh**
College Project – Telecom Network Management System

---

