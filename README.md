# BZBookIt - Backend

This is the backend server for the BZBookIt application. It handles business logic, database interactions, and provides a RESTful API for the frontend.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [API Endpoints](#api-endpoints)
- [Available Scripts](#available-scripts)

## Prerequisites

Before you begin, ensure you have the following installed:

- [Node.js](https://nodejs.org/en/) (v18.x or higher recommended)
- [npm](https://www.npmjs.com/) (usually comes with Node.js)
- [MongoDB](https://www.mongodb.com/try/download/community) (or a MongoDB Atlas account)

## Installation

1.  **Clone the repository:**
    ```sh
    git clone <your-repository-url>
    cd BZBOOKITBACK
    ```

2.  **Install dependencies:**
    ```sh
    npm install
    ```

## Configuration

This project uses environment variables for configuration.

1.  Create a `.env` file in the root of the project by copying the example file:
    ```sh
    cp .env.example .env
    ```

2.  Open the `.env` file and add your configuration values:
    ```
    PORT=5000
    MONGO_URI=your_mongodb_connection_string
    JWT_SECRET=your_jwt_secret_key
    ```

## Running the Application

To start the server in development mode with hot-reloading (using nodemon):

```sh
npm run dev
```

To start the server in production mode:

```sh
npm start
```

The server will be running on `http://localhost:5000` (or the port you specified in your `.env` file).

## API Endpoints

Here are the main API routes available:

- `POST /api/auth/register` - Register a new user.
- `POST /api/auth/login` - Log in a user and get a JWT token.
- `GET /api/books` - Get a list of all books.
- `GET /api/books/:id` - Get details for a single book.

*(Add more endpoints as you create them)*

## Available Scripts

- `start`: Runs the app in production.
- `dev`: Runs the app in development mode using `nodemon`.
- `test`: Runs the test suite.