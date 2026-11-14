# Museum Database Web Application

## Overview
The Museum of Fine Arts web application is a web-based system developed by Team 11 to manage and organize museum information. The application provides a centralized database for storing information about museum artworks, artists, galleries, exhibitions, employees, visitors, memberships, tickets, museum stores, museum parking, and other museum operations.

The system supports four types of users: administrators, visitors, curators, and clerks. Each user role has access to different features and functionality based on its responsibilities.

## Features

### Administrator Features
- Accesses the administrative dashboard.
- Manages artists and artworks.
- Adds, updates, and deletes exhibitions.
- Manages galleries and museum employees.
- Manages museum stores and items.
- Manages tickets and visitor information.
- Manages memberships and other museum records.

### Visitor Features
- Browses available artworks and artists.
- Views museum exhibitions and galleries.
- Accesses visitor-related information.
- Purchases tickets and memberships.
- Reserves parking.
- Views personal purchase history.

### Curator Features
- Accesses the curator view.
- Views and manages artists and artworks.
- Manages exhibitions and their associated artworks.

### Clerk Features
- Accesses the clerk view.
- Views store inventory.
- Handles store-related operations.
- Records item sales.

### Database Features
- MySQL relational database for storing museum information.
- Relationships between museum entities.
- Database triggers to enforce semantic constraints.
- SQL queries and reports for retrieving and analyzing museum data.

## Technologies Used
- Frontend: React, Vite, JavaScript, CSS
- Backend: Node.js, Express.js
- Database: MySQL
- Database Connection: mysql2
- Authentication: JSON Web Tokens (JWT) and HTTP cookies

## Requirements
- Node.js
- npm
- MySQL database access and valid connection settings

## Installation and Running the Application

1. **Install Backend Dependencies**  
   Open a terminal in the main project directory and run:
   ```bash
   cd server
   npm install
   ```
2. **Install Frontend Dependencies**
    Open a second terminal in the main project directory and run:
    ```bash
    cd client
    npm install
    ```
3. **Start the Backend**
    In the first terminal, run:
    ```bash
    cd server
    npm run dev
    ```
4. **Start the Frontend**
    In the second terminal, run:
    ```bash
    cd client
    npm run dev
    ```
Once both the backend and frontend are running, open the local URL displayed in the frontend terminal, usually http://localhost:5173.

## Live Application
The Museum of Fine Arts web application can be accessed here: https://art-museum-coral.vercel.app/