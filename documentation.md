# Network Inventory Management System - Project Documentation

## 1. Project Overview
The **Network Inventory Management System** is a comprehensive solution designed to manage telecommunications network assets, customer profiles, and deployment tasks. It features a modern web-based interface for administrators, planners, and technicians, powered by a robust backend API and integrated AI capabilities for intelligent assistance.

## 2. System Architecture

The project follows a decoupled client-server architecture:

-   **Backend**: Built with **FastAPI** (Python), providing a high-performance RESTful API. It uses **SQLAlchemy** for ORM-based database interactions with **SQLite**.
-   **Frontend**: Built with **React** (Node.js), utilizing **Material UI** for a responsive design and **React Flow** for network topology visualization.
-   **AI Integration**: Embedded AI tools assist with asset selection, troubleshooting, and natural language queries about the network state.

### Technology Stack

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Backend Framework** | FastAPI | High-performance, easy-to-use Python web framework. |
| **Database** | SQLite | Lightweight, serverless database (development/testing). |
| **ORM** | SQLAlchemy | Python SQL toolkit and Object Relational Mapper. |
| **Frontend Library** | React | JavaScript library for building user interfaces. |
| **UI Framework** | Material UI (MUI) | React component library for faster and easier web development. |
| **Visualization** | React Flow, Recharts | Libraries for building node-based graphs and charts. |
| **HTTP Client** | Axios | Promise-based HTTP client for the browser and node.js. |

## 3. Backend Documentation

### 3.1. Directory Structure
-   `app/main.py`: Application entry point, CORS configuration, and router inclusion.
-   `app/models.py`: SQLAlchemy database models defining the schema.
-   `app/schemas.py`: Pydantic models for request/response validation.
-   `app/database.py`: Database connection and session management.
-   `app/routers/`: Modular API endpoints (Auth, Assets, Customers, etc.).
-   `app/ai_tools.py`: Functions exposed to the AI assistant for interacting with the database.

### 3.2. Key Data Models (`models.py`)

-   **User**: System users with roles (ADMIN, PLANNER, TECHNICIAN, SUPPORT, CUSTOMER).
-   **CustomerProfile**: Extended profile for customers, linking to assigned splitters and ports.
-   **Asset**: Network devices (ONT, ROUTER, FDH, SPLITTER) with status tracking (AVAILABLE, ASSIGNED, FAULTY, etc.).
-   **Splitter & FDH**: Network hierarchy elements. FDHs contain Splitters, which connect to Customers.
-   **DeploymentTask**: Work orders for technicians to install or repair services.
-   **AssetHistory**: Audit trail for all changes made to assets.

### 3.3. AI Capabilities (`ai_tools.py`)

The system includes an AI assistant capable of performing specific actions:
1.  **`suggest_available_assets`**: Recommends available ONTs or Routers for assignment.
2.  **`get_customer_hierarchy`**: Traces the network path (Customer -> Splitter -> FDH) for a given user.
3.  **`troubleshoot_install_issue`**: Provides step-by-step troubleshooting guides for common issues (e.g., "red light", "slow speed").
4.  **`list_devices`**: Advanced search for devices by status or type, including calculated "IN_USE" status.
5.  **`get_splitter_details`**: Visualizes port usage on a specific splitter.
6.  **`update_asset_status`**: Allows the AI (and authorized users) to update asset status safely.

### 3.4. API Routers
-   `/api/auth`: Login and token management.
-   `/api/assets`: CRUD operations for network assets.
-   `/api/hierarchy`: Management of FDHs and Splitters.
-   `/api/onboard`: Workflows for adding new customers.
-   `/api/tasks`: Task management for technicians.
-   `/api/topology`: Data for network graph visualization.
-   `/api/ai`: Endpoint for AI chat interactions.

## 4. Frontend Documentation

### 4.1. Directory Structure
-   `src/components/`: Reusable UI components.
-   `src/pages/`: Main application views (Dashboard, Inventory, Topology, etc.).
-   `src/services/`: API service modules using Axios.
-   `src/context/`: Global state management (e.g., AuthContext).

### 4.2. Key Features
-   **Admin Dashboard**: Overview of network health, recent tasks, and asset statistics.
-   **Network Topology**: Interactive graph showing relationships between FDHs, Splitters, and Customers.
-   **Asset Inventory**: Searchable and filterable list of all network assets.
-   **Technician Portal**: View for technicians to see and update their assigned tasks.
-   **AI Chat Interface**: Chat window to interact with the system using natural language.

## 5. Setup & Installation Guide

### Prerequisites
-   **Python 3.8+**
-   **Node.js 14+** & **npm**

### 5.1. Backend Setup
1.  Navigate to the backend directory:
    ```bash
    cd backend
    ```
2.  Create a virtual environment:
    ```bash
    python -m venv venv
    ```
3.  Activate the virtual environment:
    -   Windows: `venv\Scripts\activate`
    -   Mac/Linux: `source venv/bin/activate`
4.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```
5.  Run the server:
    ```bash
    fastapi dev app/main.py
    ```
    The API will be available at `http://localhost:8000`.

### 5.2. Frontend Setup
1.  Navigate to the frontend directory:
    ```bash
    cd frontend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Start the development server:
    ```bash
    npm start
    ```
    The application will run at `http://localhost:3000`.

## 6. User Roles & Workflows

-   **Admin**: Full access to all modules. Can manage users, view all assets, and oversee operations.
-   **Planner**: Focuses on network expansion, managing FDHs and Splitters, and assigning resources.
-   **Technician**: Receives deployment tasks, updates task status, and troubleshoots on-site issues.
-   **Customer**: (Future scope) View plan details and request support.

---
*Generated by Antigravity AI Assistant*
